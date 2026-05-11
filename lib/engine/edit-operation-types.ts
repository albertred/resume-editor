// ---------------------------------------------------------------------------
// Edit operation schema — the only way the AI is allowed to mutate the resume.
// Operations target nodes by their stable AST IDs (e.g. "exp-0", "exp-0-item-2").
// ---------------------------------------------------------------------------

export type EditOperationType = 'replace' | 'insert' | 'delete'

export interface ReplaceOp {
  id: string
  type: 'replace'
  /** ID of the SubheadingNode or ItemNode to replace */
  targetId: string
  /** New LaTeX content that replaces the targeted node's raw text */
  newContent: string
  rationale: string
}

export interface InsertOp {
  id: string
  type: 'insert'
  /** Insert a new \resumeItem after this node ID.
   *  Use a subheading ID (e.g. "exp-0") to insert after the last item of that subheading.
   *  Use an item ID (e.g. "exp-0-item-1") to insert immediately after that item. */
  afterId: string
  /** Full \resumeItem{...} LaTeX for the new bullet */
  newContent: string
  rationale: string
}

export interface DeleteOp {
  id: string
  type: 'delete'
  /** ID of the SubheadingNode or ItemNode to remove */
  targetId: string
  rationale: string
}

export type EditOperation = ReplaceOp | InsertOp | DeleteOp

// ---------------------------------------------------------------------------
// Validation result — produced by validator.ts
// ---------------------------------------------------------------------------
export interface ValidationResult {
  op: EditOperation
  valid: boolean
  error?: string
}
