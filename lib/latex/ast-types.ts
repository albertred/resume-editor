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
  /** The four arguments to \resumeSubheading{arg1}{arg2}{arg3}{arg4} */
  args: [string, string, string, string]
  items: ItemNode[]
  /** Covers from \resumeSubheading through the closing \resumeItemListEnd (or next entry) */
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

export type EntryNode = SubheadingNode | SkillsNode

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

/** Flatten all nodes (subheadings, items, skills) into a single lookup map */
export function buildNodeMap(ast: ResumeAST): Map<string, SubheadingNode | ItemNode | SkillsNode> {
  const map = new Map<string, SubheadingNode | ItemNode | SkillsNode>()
  for (const section of ast.sections) {
    for (const entry of section.entries) {
      map.set(entry.id, entry)
      if (entry.kind === 'subheading') {
        for (const item of entry.items) {
          map.set(item.id, item)
        }
      }
    }
  }
  return map
}
