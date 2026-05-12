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
  /** Plain text; may contain inline \b{...} bold markers */
  text: string
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
  school: string
  location: string
  degree: string
  dates: string
  bullets: BulletBlock[]
}

export interface ProjectEntryBlock {
  kind: 'project-entry'
  /** "proj-0", "proj-1", … */
  id: string
  name: string
  link: string
  description: string
  stack: string
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
