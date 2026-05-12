import { parseResume } from '../latex/parser'
import { astToBlocks } from './from-ast'
import type { BankBlocks } from './bank-types'
import type { ExperienceEntryBlock, ProjectEntryBlock, BulletBlock } from './block-types'

// ---------------------------------------------------------------------------
// Importer for commented-out alternates.
//
// Michelle keeps backup experiences/projects in her resume as `% \resumeSubheading{…}`
// blocks. This module finds those blocks, un-comments them, parses them into
// real entries, maps them to the bank's namespace, and produces a "stripped"
// version of the source with the commented blocks removed.
//
// Usage:
//   const { bank, strippedSource } = importFromComments(latexSource, existingBank)
//   editorStore.setLatexSource(strippedSource)
//   editorStore.setBank(bank)
// ---------------------------------------------------------------------------

export interface ImportResult {
  /** The merged bank (existing entries preserved, new ones appended). */
  bank: BankBlocks
  /** Source with the commented blocks removed. */
  strippedSource: string
  /** How many entries were imported, by kind. */
  imported: { experience: number; projects: number }
}

const ENTRY_MACROS = [
  '\\resumeSubheading',
  '\\resumeSubheadingSecond',
  '\\resumeProjectHeading',
]

/**
 * Walk the source line-by-line collecting contiguous runs of `%`-prefixed
 * lines. For each run that contains one of the entry macros, un-comment and
 * try to parse. Lines inside a run that originally started with `%` are
 * stripped; the run is removed from the output source on success.
 */
export function importFromComments(
  source: string,
  existingBank: BankBlocks,
): ImportResult {
  const lines = source.split('\n')
  const importedExperience: ExperienceEntryBlock[] = []
  const importedProjects: ProjectEntryBlock[] = []
  const linesToDrop = new Set<number>()

  let i = 0
  while (i < lines.length) {
    if (!isCommentLine(lines[i])) { i++; continue }
    // Collect a contiguous run of commented lines
    let j = i
    while (j < lines.length && isCommentLine(lines[j])) j++
    const run = lines.slice(i, j)

    // Does this run contain any entry macro?
    if (run.some((l) => ENTRY_MACROS.some((m) => l.includes(m)))) {
      const uncommented = run.map(stripLeadingComment).join('\n')
      const result = parseSnippet(uncommented)
      for (const e of result.experience) {
        importedExperience.push(reIdExperience(e, existingBank.experience.length + importedExperience.length))
      }
      for (const p of result.projects) {
        importedProjects.push(reIdProject(p, existingBank.projects.length + importedProjects.length))
      }
      if (result.experience.length + result.projects.length > 0) {
        for (let k = i; k < j; k++) linesToDrop.add(k)
      }
    }
    i = j
  }

  const strippedSource = lines.filter((_, idx) => !linesToDrop.has(idx)).join('\n')
  return {
    bank: {
      experience: [...existingBank.experience, ...importedExperience],
      projects: [...existingBank.projects, ...importedProjects],
      skills: existingBank.skills,
    },
    strippedSource,
    imported: {
      experience: importedExperience.length,
      projects: importedProjects.length,
    },
  }
}

function isCommentLine(line: string): boolean {
  return /^\s*%/.test(line)
}

function stripLeadingComment(line: string): string {
  return line.replace(/^(\s*)%\s?/, '$1')
}

/**
 * Parse an un-commented snippet by wrapping it in just enough document
 * scaffolding to satisfy parseResume, then extracting its entries.
 */
function parseSnippet(snippet: string): { experience: ExperienceEntryBlock[]; projects: ProjectEntryBlock[] } {
  const wrapped = wrapAsDocument(snippet)
  const ast = parseResume(wrapped)
  if (ast.parseError) return { experience: [], projects: [] }
  const blocks = astToBlocks(ast)
  return { experience: blocks.experience, projects: blocks.projects }
}

function wrapAsDocument(snippet: string): string {
  // Try to figure out whether the snippet looks like experience or projects
  // based on which macros it uses. Experience uses \resumeSubheading, projects
  // use \resumeProjectHeading. Wrap with both sections to catch both cases —
  // parseResume will yield entries under whichever section matches.
  const hasProject = snippet.includes('\\resumeProjectHeading')
  const sectionTitle = hasProject ? 'Projects' : 'Experience'
  return `\\begin{document}
\\section{${sectionTitle}}
\\resumeSubHeadingListStart
${snippet}
\\resumeSubHeadingListEnd
\\end{document}`
}

function reIdExperience(e: ExperienceEntryBlock, idx: number): ExperienceEntryBlock {
  const id = `bank-exp-${idx}`
  return { ...e, id, bullets: e.bullets.map((b, k) => reIdBullet(b, `${id}-item-${k}`)) }
}

function reIdProject(p: ProjectEntryBlock, idx: number): ProjectEntryBlock {
  const id = `bank-proj-${idx}`
  return { ...p, id, bullets: p.bullets.map((b, k) => reIdBullet(b, `${id}-item-${k}`)) }
}

function reIdBullet(b: BulletBlock, id: string): BulletBlock {
  return { ...b, id }
}

// ---------------------------------------------------------------------------
// Quick predicate: does this source contain any commented entry blocks?
// Used to decide whether to surface the "Extract alternates" UI affordance.
// ---------------------------------------------------------------------------
export function sourceHasCommentedAlternates(source: string): boolean {
  const lines = source.split('\n')
  let inRun = false
  for (const line of lines) {
    if (isCommentLine(line)) {
      inRun = true
      if (ENTRY_MACROS.some((m) => line.includes(m))) return true
    } else {
      inRun = false
    }
  }
  void inRun
  return false
}
