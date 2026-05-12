import type { ResumeBlocks } from '../blocks/block-types'
import type { BankBlocks } from '../blocks/bank-types'
import type { RawBlockOperation } from '../blocks/block-edit-types'

// ---------------------------------------------------------------------------
// Types for the three-stage AI pipeline (block-based)
// ---------------------------------------------------------------------------

// --- Stage 1: JD Requirements ---

export interface JDRequirements {
  requiredSkills: string[]
  preferredSkills: string[]
  roleLevel: string          // e.g. "Senior", "Mid-level", "Entry-level"
  keyResponsibilities: string[]
  companyContext: string
}

// --- Stage 2: Match Assessment ---

export type GapSeverity = 'high' | 'medium' | 'low'

export interface Gap {
  description: string
  severity: GapSeverity
  suggestedAction: string
}

export interface MatchAssessment {
  matchScore: number        // 0–100
  strengths: string[]
  gaps: Gap[]
  /** 3–5 plain-English bullets describing the most impactful edits the AI will make */
  editorialBrief: string[]
}

// --- API request/response shapes ---

export interface AnalyzeRequest {
  jobDescription: string
  blocks: ResumeBlocks
  bank: BankBlocks
}

export interface AnalyzeResponse {
  jdRequirements: JDRequirements
  matchAssessment: MatchAssessment
}

export interface GenerateEditsRequest {
  jdRequirements: JDRequirements
  matchAssessment: MatchAssessment
  blocks: ResumeBlocks
  bank: BankBlocks
}

export interface GenerateEditsResponse {
  operations: RawBlockOperation[]
}
