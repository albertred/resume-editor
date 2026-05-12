// ---------------------------------------------------------------------------
// Resume content as a JSON block model. The LLM only ever sees/emits these
// shapes — never LaTeX. A deterministic renderer (to-latex.ts) maps blocks
// back to Jake's-template macros.
//
// Bullet text is a single string with one inline markup convention:
//   \b{...}  →  rendered as \textbf{...}
// No other LaTeX commands are allowed inside bullet text.
// ---------------------------------------------------------------------------

export interface BulletBlock {
  kind: 'bullet'
  /** Stable ID inherited from the AST, e.g. "exp-0-item-2" */
  id: string
  /**
   * Display text. For editable bullets this is the plain-text form with
   * inline \b{...} bold markers. For read-only bullets this is a plain-text
   * approximation suitable for display; the renderer emits `raw` instead.
   */
  text: string
  /**
   * True if this bullet contains inline LaTeX commands we can't safely round-
   * trip through the block model (e.g. \href, \textcolor, \faLink, \emph).
   * The LLM may NOT target this bullet with replace_bullet or delete_bullet.
   */
  readOnly?: boolean
  /** Original LaTeX (verbatim). Present iff readOnly; used by the renderer. */
  raw?: string
}

export interface ExperienceEntryBlock {
  kind: 'experience-entry'
  /** "exp-0", "exp-1", … */
  id: string
  role: string
  dates: string
  company: string
  location: string
  bullets: BulletBlock[]
}

export interface EducationEntryBlock {
  kind: 'education-entry'
  /** "edu-0", "edu-1", … */
  id: string
  /** 'standard' = 4-arg \resumeSubheading, 'second' = 6-arg \resumeSubheadingSecond */
  variant: 'standard' | 'second'
  school: string
  location: string
  /** For 'second' this holds the full degree line incl. cumulative average (raw, may contain LaTeX). */
  degree: string
  dates: string
  /** Present only on variant 'second': the 5th + 6th args (extras label + items, raw). */
  extras?: { label: string; items: string }
  /** True if any structural field above contains inline LaTeX — entry is read-only to the LLM. */
  readOnly?: boolean
  bullets: BulletBlock[]
}

export interface ProjectEntryBlock {
  kind: 'project-entry'
  /** "proj-0", "proj-1", … for inline; "proj-bank-<Key>" for \addproject. */
  id: string
  /** 'inline' = full \resumeProjectHeading{...} block; 'banked' = \addproject{Key} reference. */
  source: 'inline' | 'banked'
  /** For 'banked': the project key referenced from projects.tex. */
  bankKey?: string
  /**
   * Display name parsed best-effort from the heading. For LLM context only;
   * the renderer emits `headingRaw` verbatim for inline projects.
   */
  name: string
  /** Best-effort stack parsed from \emph{...}; display only. */
  stack: string
  /** Best-effort dates (2nd arg of \resumeProjectHeading). */
  dates: string
  /**
   * Raw first arg of \resumeProjectHeading (often contains \href, \emph, \faLink).
   * Always treated as read-only for the renderer to preserve formatting.
   */
  headingRaw: string
  bullets: BulletBlock[]
}

export interface SkillsCategory {
  label: string
  items: string[]
}

export interface SkillsBlock {
  kind: 'skills'
  id: 'skills-0'
  categories: SkillsCategory[]
}

export interface ResumeBlocks {
  /** Header is not LLM-editable in MVP; included only as context. */
  header: { name: string; contact: string }
  experience: ExperienceEntryBlock[]
  education: EducationEntryBlock[]
  projects: ProjectEntryBlock[]
  skills: SkillsBlock | null
}

export type AnyEntryBlock =
  | ExperienceEntryBlock
  | EducationEntryBlock
  | ProjectEntryBlock

/** Flat lookup over every addressable node (entries + bullets + skills). */
export function buildBlockMap(
  blocks: ResumeBlocks,
): Map<string, AnyEntryBlock | BulletBlock | SkillsBlock> {
  const map = new Map<string, AnyEntryBlock | BulletBlock | SkillsBlock>()
  const addEntry = (entry: AnyEntryBlock) => {
    map.set(entry.id, entry)
    for (const b of entry.bullets) map.set(b.id, b)
  }
  blocks.experience.forEach(addEntry)
  blocks.education.forEach(addEntry)
  blocks.projects.forEach(addEntry)
  if (blocks.skills) map.set(blocks.skills.id, blocks.skills)
  return map
}
