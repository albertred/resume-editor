// ---------------------------------------------------------------------------
// Types for the three-stage AI pipeline
// ---------------------------------------------------------------------------

// --- Stage 1: JD Requirements ---

export interface JDRequirements {
  requiredSkills: string[]
  preferredSkills: string[]
  roleLevel: string          // e.g. "Senior", "Mid-level", "Entry-level"
  keyResponsibilities: string[]
  companyContext: string     // brief summary of company/team context if present
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

// --- Stage 3 request payload (sent from client) ---

/** Compact representation of the AST sent to Stage 3 so the LLM knows valid IDs */
export interface ASTSummaryEntry {
  id: string
  preview: string   // first 80 chars of the node's text content
}

export interface ASTSummarySection {
  title: string
  entries: ASTSummaryEntry[]
}

export interface ASTSummary {
  sections: ASTSummarySection[]
}

// --- API request/response shapes ---

export interface AnalyzeRequest {
  jobDescription: string
  latexSource: string
}

export interface AnalyzeResponse {
  jdRequirements: JDRequirements
  matchAssessment: MatchAssessment
}

export interface GenerateEditsRequest {
  jdRequirements: JDRequirements
  matchAssessment: MatchAssessment
  latexSource: string
  astSummary: ASTSummary
}

export interface GenerateEditsResponse {
  operations: RawOperation[]
}

// Raw operation shape returned by the LLM before we assign client-side IDs
export interface RawOperation {
  type: 'replace' | 'insert' | 'delete'
  targetId?: string    // replace, delete
  afterId?: string     // insert
  newContent?: string  // replace, insert
  rationale: string
}
