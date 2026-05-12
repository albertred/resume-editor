'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import SplitPane from '@/components/layout/SplitPane'
import LaTeXEditor, { type AnnotationMark, type AnnotationMarkKind } from '@/components/editor/LaTeXEditor'
import AnnotationPopover from '@/components/editor/AnnotationPopover'
import EditOperationList from '@/components/editor/EditOperationList'
import BankPanel from '@/components/bank/BankPanel'
import JobDescriptionPanel from '@/components/jd/JobDescriptionPanel'
import PDFPreview from '@/components/preview/PDFPreview'
import { useEditorStore, initialResumeSource } from '@/lib/store/editor-store'
import { colors } from '@/lib/ui/theme'
import { parseResume } from '@/lib/latex/parser'
import { buildNodeMap } from '@/lib/latex/ast-types'
import type { BlockEditOperation } from '@/lib/blocks/block-edit-types'

export default function Home() {
  const setLatexSource = useEditorStore((s) => s.setLatexSource)
  const latexSource = useEditorStore((s) => s.latexSource)
  const savedResumes = useEditorStore((s) => s.savedResumes)
  const saveResume = useEditorStore((s) => s.saveResume)
  const deleteResume = useEditorStore((s) => s.deleteResume)
  const loadResume = useEditorStore((s) => s.loadResume)
  const pendingOps = useEditorStore((s) => s.pendingOps)
  const acceptOp = useEditorStore((s) => s.acceptOp)
  const rejectOp = useEditorStore((s) => s.rejectOp)
  const activeAnnotationId = useEditorStore((s) => s.activeAnnotationId)
  const setActiveAnnotationId = useEditorStore((s) => s.setActiveAnnotationId)
  const ast = useEditorStore((s) => s.ast)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [externalValue, setExternalValue] = useState<string | null>(null)
  const [saveName, setSaveName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [popoverY, setPopoverY] = useState(0)
  const [bankOpen, setBankOpen] = useState(false)

  // Seed the store on first mount — from localStorage autosave if present,
  // else the bundled default resume.
  useEffect(() => {
    const initial = initialResumeSource()
    setLatexSource(initial)
    setExternalValue(initial)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Push externally-changed latexSource into editor (e.g. accepted AI ops)
  const prevLatexRef = useRef('')
  useEffect(() => {
    if (latexSource !== prevLatexRef.current) {
      prevLatexRef.current = latexSource
      setExternalValue(latexSource)
      // Close popover if its op no longer exists
      setActiveAnnotationId(null)
    }
  }, [latexSource, setActiveAnnotationId])

  function pushSource(text: string) {
    prevLatexRef.current = text
    setLatexSource(text)
    setExternalValue(text)
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result
      if (typeof text === 'string') pushSource(text)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleDownload() {
    const blob = new Blob([latexSource], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'resume.tex'
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetToDefault = useEditorStore((s) => s.resetToDefault)
  function handleReset() {
    if (!confirm('Discard your local edits and restore the bundled default resume?')) return
    resetToDefault()
    // Force editor to re-mount with the reset value
    setExternalValue(null)
    setTimeout(() => setExternalValue(useEditorStore.getState().latexSource), 0)
    prevLatexRef.current = useEditorStore.getState().latexSource
  }

  function handleSelectResume(id: string) {
    const source = loadResume(id)
    if (source) pushSource(source)
  }

  function handleSave() {
    const name = saveName.trim()
    if (!name) return
    saveResume(name)
    setSaveName('')
    setShowSaveInput(false)
  }

  // Build annotation marks from pendingOps + AST. Block ops reference block IDs
  // which mirror AST node IDs (except for skills ops, where we anchor to the
  // skills section's startIndex).
  const annotations = useMemo((): AnnotationMark[] => {
    const currentAst = ast ?? (latexSource ? parseResume(latexSource) : null)
    if (!currentAst || pendingOps.length === 0) return []
    const nodeMap = buildNodeMap(currentAst)

    function anchorIdAndKind(op: BlockEditOperation): { anchorId: string; kind: AnnotationMarkKind } | null {
      switch (op.type) {
        case 'replace_bullet':        return { anchorId: op.targetId, kind: 'replace' }
        case 'delete_bullet':         return { anchorId: op.targetId, kind: 'delete' }
        case 'insert_bullet':         return { anchorId: op.afterId,  kind: 'insert' }
        case 'add_bullet_from_bank':  return { anchorId: op.afterId,  kind: 'insert' }
        case 'add_entry_from_bank':   return null
        case 'add_project_from_bank': return null
        case 'remove_banked_project': return { anchorId: op.targetId, kind: 'delete' }
        case 'edit_skills':           return { anchorId: 'skills-0',  kind: 'skills' }
        case 'add_skill_from_bank':   return { anchorId: 'skills-0',  kind: 'skills' }
      }
    }

    return pendingOps.flatMap((result) => {
      if (!result?.op) return []
      const anchor = anchorIdAndKind(result.op)
      if (!anchor) return []
      const node = nodeMap.get(anchor.anchorId)
      if (!node) return []
      const line = latexSource.slice(0, node.startIndex).split('\n').length
      return [{ opId: result.op.id, line, type: anchor.kind }]
    })
  }, [pendingOps, ast, latexSource])

  // Find the active result for the popover
  const activeResult = activeAnnotationId
    ? pendingOps.find((r) => r.op.id === activeAnnotationId) ?? null
    : null

  const editorWrapperRef = useRef<HTMLDivElement>(null)

  const editorPanel = (
    <div className="flex flex-col h-full" style={{ backgroundColor: colors.panelBg }}>
      {/* Toolbar row */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-3"
        style={{ height: 36, borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.headerBg }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.labelText, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
          Resume
        </span>

        {/* Library dropdown */}
        <select
          onChange={(e) => handleSelectResume(e.target.value)}
          value=""
          className="text-xs rounded px-1.5"
          style={{
            height: 24,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.panelBg,
            color: colors.bodyText,
            maxWidth: 140,
            flex: 1,
            minWidth: 0,
          }}
        >
          <option value="" disabled>Load saved…</option>
          {savedResumes.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        {/* Save button / inline input */}
        {showSaveInput ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            <input
              autoFocus
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSaveInput(false) }}
              placeholder="Resume name…"
              className="text-xs rounded px-2"
              style={{ height: 24, border: `1px solid ${colors.accent}`, backgroundColor: colors.panelBg, color: colors.bodyText, width: 120, outline: 'none' }}
            />
            <ToolbarButton onClick={handleSave} title="Confirm save">✓</ToolbarButton>
            <ToolbarButton onClick={() => setShowSaveInput(false)} title="Cancel">✕</ToolbarButton>
          </div>
        ) : (
          <ToolbarButton onClick={() => setShowSaveInput(true)} title="Save current resume">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="2" y="2" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M4.5 2v3h4V2" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              <rect x="3.5" y="7.5" width="6" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
            Save
          </ToolbarButton>
        )}

        {/* Delete */}
        {savedResumes.length > 0 && (
          <select
            onChange={(e) => { if (e.target.value) { deleteResume(e.target.value); e.target.value = '' } }}
            value=""
            className="text-xs rounded px-1.5 flex-shrink-0"
            style={{ height: 24, border: `1px solid ${colors.border}`, backgroundColor: colors.panelBg, color: colors.mutedText }}
          >
            <option value="" disabled>Delete…</option>
            {savedResumes.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        )}

        <div className="flex-1" />

        {/* Upload / Download */}
        <input ref={fileInputRef} type="file" accept=".tex,.txt" className="hidden" onChange={handleUpload} />
        <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Upload .tex file">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 8.5V2.5M6.5 2.5L4 5M6.5 2.5L9 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 10.5h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Upload
        </ToolbarButton>
        <ToolbarButton onClick={handleDownload} title="Download as .tex">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 4.5v6M6.5 10.5L4 8M6.5 10.5L9 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 2.5h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Download
        </ToolbarButton>
        <ToolbarButton onClick={handleReset} title="Discard edits, restore default resume">
          Reset
        </ToolbarButton>
        <ToolbarButton onClick={() => setBankOpen(true)} title="Open content bank">
          Bank
        </ToolbarButton>
      </div>

      {/* Editor + popover container */}
      <div ref={editorWrapperRef} className="flex-1 min-h-0 relative">
        <LaTeXEditor
          initialValue=""
          externalValue={externalValue}
          onChange={(v) => { prevLatexRef.current = v; setLatexSource(v) }}
          annotations={annotations}
          activeAnnotationId={activeAnnotationId}
          onAnnotationClick={(id, y) => {
            if (id === activeAnnotationId) { setActiveAnnotationId(null); return }
            setPopoverY(y)
            setActiveAnnotationId(id)
          }}
        />
        {activeResult && (
          <AnnotationPopover
            result={activeResult}
            top={popoverY}
            onAccept={(id) => { acceptOp(id); setActiveAnnotationId(null) }}
            onReject={(id) => { rejectOp(id); setActiveAnnotationId(null) }}
            onClose={() => setActiveAnnotationId(null)}
          />
        )}
      </div>
      <EditOperationList />
    </div>
  )

  const rightPanel = (
    <div className="flex flex-col h-full">
      <SplitPane direction="vertical" initialSplit={50} minSize={80} left={<JobDescriptionPanel />} right={<PDFPreview />} />
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <Header />
      <SplitPane direction="horizontal" initialSplit={50} minSize={300} left={editorPanel} right={rightPanel} />
      <BankPanel open={bankOpen} onClose={() => setBankOpen(false)} />
    </div>
  )
}

function ToolbarButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center gap-1 px-2 rounded text-xs"
      style={{ height: 26, color: colors.labelText, backgroundColor: 'transparent' }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.border)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {children}
    </button>
  )
}

function Header() {
  return (
    <header
      className="flex-shrink-0 flex items-center justify-between px-5"
      style={{
        height: 48,
        backgroundColor: colors.headerBg,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center"
          style={{ backgroundColor: colors.accent }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M2 9L5.5 2L9 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3.2 6.8h4.6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="text-sm font-semibold" style={{ color: colors.bodyText, letterSpacing: '-0.01em' }}>
          Resume Editor
        </span>
      </div>
      <span className="text-xs" style={{ color: colors.mutedText }}>
        AI-assisted · LaTeX
      </span>
    </header>
  )
}
