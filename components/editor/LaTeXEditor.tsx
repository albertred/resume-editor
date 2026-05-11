'use client'

import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState, StateField, StateEffect, RangeSetBuilder } from '@codemirror/state'
import { Decoration, DecorationSet, GutterMarker, gutter } from '@codemirror/view'

export interface AnnotationMark {
  opId: string
  line: number       // 1-based line number
  type: 'replace' | 'insert' | 'delete'
}

interface LaTeXEditorProps {
  initialValue: string
  externalValue: string | null
  onChange: (value: string) => void
  annotations?: AnnotationMark[]
  activeAnnotationId?: string | null
  onAnnotationClick?: (opId: string, y: number) => void
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------
const editorTheme = EditorView.theme({
  '&': { backgroundColor: '#fdf9f4', color: '#2c1a0e', height: '100%' },
  '.cm-content': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, "Cascadia Code", monospace',
    fontSize: '12.5px',
    padding: '12px 0',
    caretColor: '#7c5038',
  },
  '.cm-gutters': {
    backgroundColor: '#f5ede0',
    color: '#c4a882',
    border: 'none',
    borderRight: '1px solid #e2d0bc',
    paddingRight: '8px',
    minWidth: '42px',
  },
  '.cm-lineNumbers .cm-gutterElement': { fontSize: '11.5px' },
  '.cm-activeLineGutter': { backgroundColor: '#eedfd0' },
  '.cm-activeLine': { backgroundColor: '#faf2e8' },
  '.cm-selectionBackground': { backgroundColor: '#e0cbb6 !important' },
  '.cm-cursor': { borderLeftColor: '#7c5038', borderLeftWidth: '2px' },
  '.cm-matchingBracket': { backgroundColor: '#dfc9b0', outline: 'none' },
  '.cm-annotation-replace': { backgroundColor: '#fff3d6' },
  '.cm-annotation-insert': { backgroundColor: '#e6f9ee' },
  '.cm-annotation-delete': { backgroundColor: '#fde8e8' },
  '.cm-annotation-active': { outline: '1.5px solid #7c5038', outlineOffset: '-1px' },
  '.cm-annotation-gutter': { width: '14px' },
})

// ---------------------------------------------------------------------------
// State effect + field — store marks + activeId inside CM state so the gutter
// is guaranteed to re-run `markers()` whenever they change.
// ---------------------------------------------------------------------------
interface AnnotationState {
  marks: AnnotationMark[]
  activeId: string | null
}

const setAnnotationsEffect = StateEffect.define<AnnotationState>()

const annotationStateField = StateField.define<AnnotationState>({
  create: () => ({ marks: [], activeId: null }),
  update(state, tr) {
    for (const e of tr.effects) {
      if (e.is(setAnnotationsEffect)) return e.value
    }
    return state
  },
})

// ---------------------------------------------------------------------------
// Line highlight decorations
// ---------------------------------------------------------------------------
const highlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes)
    for (const e of tr.effects) {
      if (e.is(setAnnotationsEffect)) {
        const builder = new RangeSetBuilder<Decoration>()
        const doc = tr.state.doc
        const sorted = [...e.value.marks].sort((a, b) => a.line - b.line)
        for (const mark of sorted) {
          if (mark.line < 1 || mark.line > doc.lines) continue
          const line = doc.line(mark.line)
          let cls = `cm-annotation-${mark.type}`
          if (mark.opId === e.value.activeId) cls += ' cm-annotation-active'
          builder.add(line.from, line.to, Decoration.mark({ class: cls }))
        }
        deco = builder.finish()
      }
    }
    return deco
  },
  provide: (f) => EditorView.decorations.from(f),
})

// ---------------------------------------------------------------------------
// Gutter marker DOM element (no event listener — click handled via domEventHandlers)
// ---------------------------------------------------------------------------
const GUTTER_COLORS: Record<string, string> = {
  replace: '#e8a030',
  insert:  '#2e9e5b',
  delete:  '#d94040',
}

class AnnotationGutterMarker extends GutterMarker {
  constructor(
    readonly opId: string,
    readonly type: string,
    readonly active: boolean,
  ) { super() }

  toDOM() {
    const el = document.createElement('div')
    el.dataset.opId = this.opId
    el.style.cssText = `
      width: 8px; height: 8px; border-radius: 50%;
      background: ${GUTTER_COLORS[this.type] ?? '#999'};
      margin: 5px auto 0; cursor: pointer;
      box-shadow: ${this.active ? `0 0 0 2px ${GUTTER_COLORS[this.type]}55` : 'none'};
    `
    el.title = `${this.type} suggestion — click to review`
    return el
  }

  eq(other: GutterMarker) {
    return other instanceof AnnotationGutterMarker &&
      other.opId === this.opId &&
      other.active === this.active
  }
}

// ---------------------------------------------------------------------------
// Build gutter extension — reads from annotationStateField so CM re-runs
// markers() when the field changes.
// ---------------------------------------------------------------------------
function makeAnnotationGutter() {
  return [
    annotationStateField,
    highlightField,
    gutter({
      class: 'cm-annotation-gutter',
      markers(view: EditorView) {
        const { marks, activeId } = view.state.field(annotationStateField)
        const builder = new RangeSetBuilder<GutterMarker>()
        const sorted = [...marks].sort((a, b) => a.line - b.line)
        for (const mark of sorted) {
          if (mark.line < 1 || mark.line > view.state.doc.lines) continue
          const line = view.state.doc.line(mark.line)
          builder.add(line.from, line.from, new AnnotationGutterMarker(mark.opId, mark.type, mark.opId === activeId))
        }
        return builder.finish()
      },
    }),
  ]
}

const wrapperStyle = { position: 'absolute' as const, inset: 0, overflow: 'hidden' }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function LaTeXEditor({
  initialValue,
  externalValue,
  onChange,
  annotations = [],
  activeAnnotationId = null,
  onAnnotationClick,
}: LaTeXEditorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onClickRef = useRef<((opId: string, y: number) => void) | undefined>(onAnnotationClick)
  useEffect(() => { onClickRef.current = onAnnotationClick }, [onAnnotationClick])

  // Create editor once
  useEffect(() => {
    if (!wrapperRef.current) return

    // Native mousedown listener to detect clicks on annotation gutter dots.
    // We do this outside CM's event system because CM swallows gutter mouse events
    // before domEventHandlers can reliably fire in all versions.
    const handleMouseDown = (e: MouseEvent) => {
      let el = e.target as HTMLElement | null
      while (el && !el.dataset.opId) el = el.parentElement
      if (!el?.dataset.opId) return
      e.preventDefault()
      e.stopPropagation()
      // Compute y offset relative to the wrapper div
      const wrapperRect = wrapperRef.current?.getBoundingClientRect()
      const y = wrapperRect ? e.clientY - wrapperRect.top : e.clientY
      onClickRef.current?.(el.dataset.opId, y)
    }
    wrapperRef.current.addEventListener('mousedown', handleMouseDown, true) // capture phase

    const view = new EditorView({
      state: EditorState.create({
        doc: initialValue,
        extensions: [
          basicSetup,
          editorTheme,
          ...makeAnnotationGutter(),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString())
          }),
          EditorView.lineWrapping,
        ],
      }),
      parent: wrapperRef.current,
    })

    viewRef.current = view
    const wrapper = wrapperRef.current
    return () => {
      wrapper?.removeEventListener('mousedown', handleMouseDown, true)
      view.destroy()
      viewRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync external value
  const lastExternalValue = useRef(initialValue)
  useEffect(() => {
    if (externalValue === null) return
    if (externalValue === lastExternalValue.current) return
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== externalValue) {
      lastExternalValue.current = externalValue
      view.dispatch({ changes: { from: 0, to: current.length, insert: externalValue } })
    }
  }, [externalValue])

  // Push annotation state into CM state field
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: setAnnotationsEffect.of({ marks: annotations, activeId: activeAnnotationId }) })
  }, [annotations, activeAnnotationId])

  return <div ref={wrapperRef} style={wrapperStyle} />
}
