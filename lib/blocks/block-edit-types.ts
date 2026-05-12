// ---------------------------------------------------------------------------
// Edit operations the LLM is allowed to emit. The LLM never produces LaTeX —
// only references to block IDs (in `ResumeBlocks` or `BankBlocks`) plus
// content fields shaped like our blocks.
// ---------------------------------------------------------------------------

// --- On-resume content edits ---

export interface ReplaceBulletOp {
  id: string
  type: 'replace_bullet'
  /** ID of an existing on-resume bullet, e.g. "exp-0-item-2" */
  targetId: string
  /** New bullet text. May contain inline \b{...} markers. */
  text: string
  rationale: string
}

export interface InsertBulletOp {
  id: string
  type: 'insert_bullet'
  /** Either an on-resume bullet ID (insert after it) or an entry ID (append to end). */
  afterId: string
  text: string
  rationale: string
}

export interface DeleteBulletOp {
  id: string
  type: 'delete_bullet'
  /** On-resume bullet ID. */
  targetId: string
  rationale: string
}

export interface EditSkillsOp {
  id: string
  type: 'edit_skills'
  /** Category to upsert by label (matched case-insensitively). */
  categoryLabel: string
  /** Full replacement item list for that category. */
  items: string[]
  rationale: string
}

// --- Bank-sourced additions ---

export interface AddBulletFromBankOp {
  id: string
  type: 'add_bullet_from_bank'
  /** Bullet ID inside the bank, e.g. "bank-exp-0-item-2" */
  bankId: string
  /** Either an on-resume bullet ID (insert after it) or an entry ID (append to end). */
  afterId: string
  rationale: string
}

export interface AddEntryFromBankOp {
  id: string
  type: 'add_entry_from_bank'
  /** Entry ID inside the bank, e.g. "bank-exp-0" or "bank-proj-1" */
  bankId: string
  /** Insertion index within the destination section; omit to append. */
  position?: number
  rationale: string
}

export interface AddSkillFromBankOp {
  id: string
  type: 'add_skill_from_bank'
  /** Existing category on the resume. */
  categoryLabel: string
  /** Items pulled from the bank's matching category. */
  bankItems: string[]
  rationale: string
}

/** Insert an \addproject{Key} line referencing a project from projects.tex. */
export interface AddProjectFromBankOp {
  id: string
  type: 'add_project_from_bank'
  /** Project key, must exist in the bank as id "proj-bank-<bankKey>". */
  bankKey: string
  /** Insertion index within the projects section; omit to append. */
  position?: number
  rationale: string
}

/** Remove an \addproject{Key} line currently on the resume. */
export interface RemoveBankedProjectOp {
  id: string
  type: 'remove_banked_project'
  /** ID of the banked project on the resume, e.g. "proj-bank-<Key>" */
  targetId: string
  rationale: string
}

export type BlockEditOperation =
  | ReplaceBulletOp
  | InsertBulletOp
  | DeleteBulletOp
  | EditSkillsOp
  | AddBulletFromBankOp
  | AddEntryFromBankOp
  | AddSkillFromBankOp
  | AddProjectFromBankOp
  | RemoveBankedProjectOp

export type BlockEditOperationType = BlockEditOperation['type']

// ---------------------------------------------------------------------------
// Raw shape (before we assign client-side `id`s)
// ---------------------------------------------------------------------------
export type RawBlockOperation = Omit<BlockEditOperation, 'id'>

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------
export interface BlockValidationResult {
  op: BlockEditOperation
  valid: boolean
  error?: string
}
