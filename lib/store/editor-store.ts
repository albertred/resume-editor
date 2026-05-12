import { create } from 'zustand'
import type { ResumeAST } from '../latex/ast-types'
import { parseResume } from '../latex/parser'
import type { ResumeBlocks } from '../blocks/block-types'
import { astToBlocks } from '../blocks/from-ast'
import { blocksToLatex } from '../blocks/to-latex'
import type { BankBlocks } from '../blocks/bank-types'
import { masterBank } from '../blocks/master-bank'
import { importFromComments } from '../blocks/import-from-comments'
import { importProjectsTex } from '../blocks/project-bank'
import { michelleResume } from '../templates/michelle-resume'
import type {
  BlockEditOperation,
  BlockValidationResult,
} from '../blocks/block-edit-types'
import { applyBlockOp } from '../blocks/block-applicator'

export type { BlockEditOperation }

const AUTOSAVE_KEY = 'resume-editor:autosave'
const BANK_KEY = 'resume-editor:bank'

function loadBank(): BankBlocks {
  if (typeof window === 'undefined') return masterBank
  try {
    const raw = localStorage.getItem(BANK_KEY)
    if (!raw) return masterBank
    return JSON.parse(raw) as BankBlocks
  } catch {
    return masterBank
  }
}

function persistBank(bank: BankBlocks) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(BANK_KEY, JSON.stringify(bank))
  } catch {
    // ignore
  }
}

function loadAutosave(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(AUTOSAVE_KEY)
  } catch {
    return null
  }
}

function persistAutosave(source: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(AUTOSAVE_KEY, source)
  } catch {
    // localStorage full / disabled — silently drop
  }
}

function clearAutosave() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(AUTOSAVE_KEY)
  } catch {
    // ignore
  }
}

/** The string the app boots with — autosaved working copy, else bundled default. */
export function initialResumeSource(): string {
  return loadAutosave() ?? michelleResume
}

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
  pendingOps: BlockValidationResult[]
  ast: ResumeAST | null
  blocks: ResumeBlocks | null
  bank: BankBlocks
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
  setPendingOps: (results: BlockValidationResult[]) => void
  setActiveAnnotationId: (id: string | null) => void
  setEditorialBrief: (brief: string[]) => void
  acceptOp: (opId: string) => void
  rejectOp: (opId: string) => void
  /** Discard local edits and restore the bundled default resume. */
  resetToDefault: () => void
  /** Replace the bank entirely (persists to localStorage). */
  setBank: (bank: BankBlocks) => void
  /**
   * Scan the current resume for commented-out alternate entries, move them
   * into the bank, and strip them from the source. Returns counts.
   */
  importAlternates: () => { experience: number; projects: number }
  /** Import a projects.tex file's contents into the bank. */
  importProjectsTexSource: (source: string) => number
}

// Debounced autosave so we don't hit localStorage on every keystroke.
let autosaveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleAutosave(source: string) {
  if (typeof window === 'undefined') return
  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => persistAutosave(source), 500)
}

export const useEditorStore = create<EditorState>((set, get) => ({
  latexSource: '',
  jobDescription: '',
  pipelineStatus: 'idle',
  pendingOps: [],
  ast: null,
  blocks: null,
  bank: loadBank(),
  activeAnnotationId: null,
  editorialBrief: [],
  savedResumes: loadLibrary(),

  setLatexSource: (source) => {
    if (get().latexSource === source) return
    const ast = parseResume(source)
    const blocks = ast.parseError ? null : astToBlocks(ast)
    set({ latexSource: source, ast, blocks })
    scheduleAutosave(source)
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
    const { pendingOps, latexSource, ast, blocks, bank } = get()
    const result = pendingOps.find((r) => r.op.id === opId)
    if (!result || !result.valid) return
    if (!ast || !blocks) return

    const { newBlocks, error } = applyBlockOp(blocks, bank, result.op)
    if (error) {
      console.error('[block-applicator] error:', error)
      return
    }

    const newSource = blocksToLatex(newBlocks, latexSource, ast)
    const newAst = parseResume(newSource)
    const reblocked = newAst.parseError ? newBlocks : astToBlocks(newAst)

    set({
      latexSource: newSource,
      ast: newAst,
      blocks: reblocked,
      pendingOps: pendingOps.filter((r) => r.op.id !== opId),
    })
  },

  rejectOp: (opId) => {
    set((state) => ({
      pendingOps: state.pendingOps.filter((r) => r.op.id !== opId),
    }))
  },

  resetToDefault: () => {
    clearAutosave()
    const ast = parseResume(michelleResume)
    const blocks = ast.parseError ? null : astToBlocks(ast)
    set({
      latexSource: michelleResume,
      ast,
      blocks,
      pendingOps: [],
      activeAnnotationId: null,
      editorialBrief: [],
    })
  },

  setBank: (bank) => {
    persistBank(bank)
    set({ bank })
  },

  importAlternates: () => {
    const { latexSource, bank } = get()
    const { bank: newBank, strippedSource, imported } = importFromComments(latexSource, bank)
    persistBank(newBank)
    const ast = parseResume(strippedSource)
    const blocks = ast.parseError ? null : astToBlocks(ast)
    set({ bank: newBank, latexSource: strippedSource, ast, blocks })
    scheduleAutosave(strippedSource)
    return imported
  },

  importProjectsTexSource: (source) => {
    const { bank } = get()
    const { bank: newBank, imported } = importProjectsTex(source, bank)
    persistBank(newBank)
    set({ bank: newBank })
    return imported
  },
}))
