// ---------------------------------------------------------------------------
// AST types for the Jake's Resume template
// ---------------------------------------------------------------------------
// The template structure is:
//   Document
//     preamble    — everything before \begin{document}
//     header      — \begin{center} name + contact block \end{center}
//     sections[]  — each \section{...} block
//       SubheadingNode[]  — \resumeSubheading{}{}{}{} entries (jobs, schools, projects)
//         ItemNode[]      — \resumeItem{...} bullets inside a subheading
//       OR
//       SkillsNode        — the raw skills block (different structure)
// ---------------------------------------------------------------------------

export type SectionType = 'experience' | 'education' | 'projects' | 'skills'

export interface ItemNode {
  kind: 'item'
  /** Stable ID: "<sectionPrefix>-<subheadingIdx>-item-<itemIdx>"  e.g. "exp-0-item-2" */
  id: string
  /** Text content inside \resumeItem{...} */
  text: string
  startIndex: number
  endIndex: number
}

export interface SubheadingNode {
  kind: 'subheading'
  /** Stable ID: "<sectionPrefix>-<idx>"  e.g. "exp-0", "edu-0", "proj-0" */
  id: string
  /**
   * 'standard' = \resumeSubheading{a}{b}{c}{d}  (4 args)
   * 'second'   = \resumeSubheadingSecond{a}{b}{c}{d}{e}{f}  (6 args)
   */
  variant: 'standard' | 'second'
  /** Raw arguments to the macro; length 4 for 'standard', 6 for 'second' */
  args: string[]
  items: ItemNode[]
  startIndex: number
  endIndex: number
}

/** \resumeProjectHeading{heading}{dates}  — used for inline project entries */
export interface ProjectHeadingNode {
  kind: 'project-heading'
  id: string                 // "proj-N"
  /** Raw first arg (often contains \href, \emph, \textbf, etc.) */
  heading: string
  /** Raw second arg (dates or empty) */
  dates: string
  items: ItemNode[]
  startIndex: number
  endIndex: number
}

/** \addproject{Key}  — references a project defined in projects.tex */
export interface BankedProjectNode {
  kind: 'banked-project'
  id: string                 // "proj-bank-<Key>"
  bankKey: string            // "<Key>"
  startIndex: number
  endIndex: number
}

export interface SkillsNode {
  kind: 'skills'
  id: string   // always "skills-0"
  /** Raw content of the skills block (everything inside the itemize environment) */
  raw: string
  startIndex: number
  endIndex: number
}

export type EntryNode = SubheadingNode | SkillsNode | ProjectHeadingNode | BankedProjectNode

export interface SectionNode {
  title: string
  type: SectionType
  entries: EntryNode[]
  startIndex: number
  endIndex: number
}

export interface ResumeAST {
  preamble: string
  header: string
  sections: SectionNode[]
  parseError?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Flatten all nodes (subheadings, projects, items, skills, banked) into a single lookup map */
export function buildNodeMap(
  ast: ResumeAST,
): Map<string, SubheadingNode | ProjectHeadingNode | BankedProjectNode | ItemNode | SkillsNode> {
  const map = new Map<
    string,
    SubheadingNode | ProjectHeadingNode | BankedProjectNode | ItemNode | SkillsNode
  >()
  for (const section of ast.sections) {
    for (const entry of section.entries) {
      map.set(entry.id, entry)
      if (entry.kind === 'subheading' || entry.kind === 'project-heading') {
        for (const item of entry.items) {
          map.set(item.id, item)
        }
      }
    }
  }
  return map
}
