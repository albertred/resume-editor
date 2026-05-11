import { create } from 'zustand'
import type { EditOperation, ValidationResult } from '../engine/edit-operation-types'
import type { ResumeAST } from '../latex/ast-types'
import { parseResume } from '../latex/parser'
import { applyOp } from '../engine/applicator'

export type { EditOperation }

export interface SavedResume {
  id: string
  name: string
  source: string
  savedAt: number
}

const STORAGE_KEY = 'resume-editor:library'

function loadLibrary(): SavedResume[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function persistLibrary(resumes: SavedResume[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes))
}

interface EditorState {
  latexSource: string
  jobDescription: string
  pipelineStatus: 'idle' | 'running' | 'done' | 'error'
  pendingOps: ValidationResult[]
  ast: ResumeAST | null
  /** ID of the op whose annotation popover is currently open */
  activeAnnotationId: string | null
  /** Plain-English editorial brief from Stage 2 */
  editorialBrief: string[]

  savedResumes: SavedResume[]
  saveResume: (name: string) => SavedResume
  deleteResume: (id: string) => void
  loadResume: (id: string) => string | null

  setLatexSource: (source: string) => void
  setJobDescription: (jd: string) => void
  setPipelineStatus: (status: EditorState['pipelineStatus']) => void
  setPendingOps: (results: ValidationResult[]) => void
  setActiveAnnotationId: (id: string | null) => void
  setEditorialBrief: (brief: string[]) => void
  acceptOp: (opId: string) => void
  rejectOp: (opId: string) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  latexSource: '',
  jobDescription: '',
  pipelineStatus: 'idle',
  pendingOps: [],
  ast: null,
  activeAnnotationId: null,
  editorialBrief: [],
  savedResumes: loadLibrary(),

  setLatexSource: (source) => {
    if (get().latexSource === source) return
    const ast = parseResume(source)
    set({ latexSource: source, ast })
  },

  setJobDescription: (jd) => {
    if (get().jobDescription !== jd) set({ jobDescription: jd })
  },

  setPipelineStatus: (status) => {
    if (get().pipelineStatus !== status) set({ pipelineStatus: status })
  },

  setPendingOps: (results) => set({ pendingOps: results }),
  setActiveAnnotationId: (id) => set({ activeAnnotationId: id }),
  setEditorialBrief: (brief) => set({ editorialBrief: brief }),

  saveResume: (name) => {
    const entry: SavedResume = {
      id: `resume-${Date.now()}`,
      name,
      source: get().latexSource,
      savedAt: Date.now(),
    }
    const updated = [entry, ...get().savedResumes.filter((r) => r.name !== name)]
    persistLibrary(updated)
    set({ savedResumes: updated })
    return entry
  },

  deleteResume: (id) => {
    const updated = get().savedResumes.filter((r) => r.id !== id)
    persistLibrary(updated)
    set({ savedResumes: updated })
  },

  loadResume: (id) => {
    const resume = get().savedResumes.find((r) => r.id === id)
    return resume?.source ?? null
  },

  acceptOp: (opId) => {
    const { pendingOps, latexSource, ast } = get()
    const result = pendingOps.find((r) => r.op.id === opId)
    if (!result || !result.valid) return

    const currentAst = ast ?? parseResume(latexSource)
    const { newSource, newAst, error } = applyOp(latexSource, currentAst, result.op)

    if (error) {
      console.error('[applicator] applyOp error:', error)
      return
    }

    set({
      latexSource: newSource,
      ast: newAst,
      pendingOps: pendingOps.filter((r) => r.op.id !== opId),
    })
  },

  rejectOp: (opId) => {
    set((state) => ({
      pendingOps: state.pendingOps.filter((r) => r.op.id !== opId),
    }))
  },
}))
