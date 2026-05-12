import { parseResume } from '../latex/parser'
import { astToBlocks } from './from-ast'
import type { BankBlocks } from './bank-types'
import type { ProjectEntryBlock, BulletBlock } from './block-types'

// ---------------------------------------------------------------------------
// projects.tex importer
//
// `projects.tex` is a file of \newcommand{\ProjectKey}{...} definitions, each
// wrapping a \resumeProjectHeading{}{} block and its bullets. The user's
// active resume references these via \addproject{Key}.
//
// This importer parses each \newcommand and turns it into a bank project,
// keyed by the project key (so \addproject{Key} → bank-proj-bank-<Key>).
// ---------------------------------------------------------------------------

export interface ProjectsTexImportResult {
  bank: BankBlocks
  imported: number
}

export function importProjectsTex(
  projectsTexSource: string,
  existingBank: BankBlocks,
): ProjectsTexImportResult {
  const defs = extractProjectDefinitions(projectsTexSource)
  const added: ProjectEntryBlock[] = []
  for (const { key, body } of defs) {
    const project = projectFromDefinition(key, body)
    if (project) added.push(project)
  }

  // De-dupe by id (so re-import is idempotent)
  const existingIds = new Set(existingBank.projects.map((p) => p.id))
  const newProjects = added.filter((p) => !existingIds.has(p.id))

  return {
    bank: {
      experience: existingBank.experience,
      projects: [...existingBank.projects, ...newProjects],
      skills: existingBank.skills,
    },
    imported: newProjects.length,
  }
}

// ---------------------------------------------------------------------------
// Find each \newcommand{\Project<Key>}{ … balanced body … }
// ---------------------------------------------------------------------------
function extractProjectDefinitions(src: string): Array<{ key: string; body: string }> {
  const defs: Array<{ key: string; body: string }> = []
  const re = /\\newcommand\{\\Project([A-Za-z0-9]+)\}\s*\{/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    const key = m[1]
    const bodyStart = re.lastIndex - 1   // position of the opening '{' for the body
    const bodyEnd = findMatchingBrace(src, bodyStart)
    if (bodyEnd === -1) continue
    const body = src.slice(bodyStart + 1, bodyEnd)
    defs.push({ key, body })
    re.lastIndex = bodyEnd + 1
  }
  return defs
}

function findMatchingBrace(s: string, openPos: number): number {
  if (s[openPos] !== '{') return -1
  let depth = 0
  for (let i = openPos; i < s.length; i++) {
    if (s[i] === '{') depth++
    else if (s[i] === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

// ---------------------------------------------------------------------------
// Parse one \newcommand body as a project entry. We wrap it in a minimal
// document and reuse the main parser → astToBlocks pipeline.
// ---------------------------------------------------------------------------
function projectFromDefinition(key: string, body: string): ProjectEntryBlock | null {
  const wrapped = `\\begin{document}
\\section{Projects}
\\resumeSubHeadingListStart
${body}
\\resumeSubHeadingListEnd
\\end{document}`
  const ast = parseResume(wrapped)
  if (ast.parseError) return null
  const blocks = astToBlocks(ast)
  const project = blocks.projects[0]
  if (!project) return null
  const id = `proj-bank-${key}`
  return {
    ...project,
    id,
    source: 'inline',
    bankKey: key,
    bullets: project.bullets.map((b, i) => reIdBullet(b, `${id}-item-${i}`)),
  }
}

function reIdBullet(b: BulletBlock, id: string): BulletBlock {
  return { ...b, id }
}
