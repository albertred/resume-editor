import type {
  ResumeAST,
  SectionNode,
  SubheadingNode,
  SkillsNode,
} from '../latex/ast-types'
import type {
  ResumeBlocks,
  BulletBlock,
  ExperienceEntryBlock,
  EducationEntryBlock,
  ProjectEntryBlock,
  SkillsBlock,
  SkillsCategory,
} from './block-types'

// ---------------------------------------------------------------------------
// AST → blocks
// ---------------------------------------------------------------------------

export function astToBlocks(ast: ResumeAST): ResumeBlocks {
  return {
    header: parseHeader(ast.header),
    experience: getSection(ast, 'experience').flatMap(toExperienceEntry),
    education: getSection(ast, 'education').flatMap(toEducationEntry),
    projects: getSection(ast, 'projects').flatMap(toProjectEntry),
    skills: toSkills(getSection(ast, 'skills')),
  }
}

function getSection(ast: ResumeAST, type: SectionNode['type']): SectionNode['entries'] {
  const section = ast.sections.find((s) => s.type === type)
  return section?.entries ?? []
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function parseHeader(header: string): { name: string; contact: string } {
  if (!header) return { name: '', contact: '' }
  // Pull name from \textbf{\Huge \scshape NAME}
  const nameMatch = header.match(/\\textbf\{[^}]*?\\scshape\s+([^}]+)\}/)
  const name = nameMatch ? nameMatch[1].trim() : ''
  // Take everything after the name's \\ as contact, strip LaTeX
  const contactRaw = header.replace(/.*?\\\\/, '').replace(/\\end\{center\}/, '')
  const contact = contactRaw
    .replace(/\\vspace\{[^}]*\}/g, '')
    .replace(/\\small/g, '')
    .replace(/\\href\{[^}]*\}\{([^}]*)\}/g, '$1')
    .replace(/\$\|\$/g, '|')
    .replace(/\s+/g, ' ')
    .trim()
  return { name, contact }
}

// ---------------------------------------------------------------------------
// Experience / Education / Projects entries
// ---------------------------------------------------------------------------

function toExperienceEntry(entry: SubheadingNode | SkillsNode): ExperienceEntryBlock[] {
  if (entry.kind !== 'subheading') return []
  const [role, dates, company, location] = entry.args
  return [{
    kind: 'experience-entry',
    id: entry.id,
    role: role.trim(),
    dates: dates.trim(),
    company: company.trim(),
    location: location.trim(),
    bullets: entry.items.map((item) => bulletFromItem(item.id, item.text)),
  }]
}

function toEducationEntry(entry: SubheadingNode | SkillsNode): EducationEntryBlock[] {
  if (entry.kind !== 'subheading') return []
  // Education in the bundled template uses: {school}{location}{degree}{dates}
  const [school, location, degree, dates] = entry.args
  return [{
    kind: 'education-entry',
    id: entry.id,
    school: school.trim(),
    location: location.trim(),
    degree: degree.trim(),
    dates: dates.trim(),
    bullets: entry.items.map((item) => bulletFromItem(item.id, item.text)),
  }]
}

function toProjectEntry(entry: SubheadingNode | SkillsNode): ProjectEntryBlock[] {
  if (entry.kind !== 'subheading') return []
  // Projects: {name}{link}{description}{stack}
  const [name, link, description, stack] = entry.args
  return [{
    kind: 'project-entry',
    id: entry.id,
    name: name.trim(),
    link: link.trim(),
    description: description.trim(),
    stack: stack.trim(),
    bullets: entry.items.map((item) => bulletFromItem(item.id, item.text)),
  }]
}

function bulletFromItem(id: string, rawText: string): BulletBlock {
  return { kind: 'bullet', id, text: latexToBulletText(rawText) }
}

// ---------------------------------------------------------------------------
// Bullet text conversion: LaTeX → block-text
//   \textbf{X}  →  \b{X}
//   \%, \&, \$, \#, \_  →  %, &, $, #, _      (un-escape so the LLM sees plain text)
// Anything else is left as-is (we'll catch stray commands in the validator).
// ---------------------------------------------------------------------------

export function latexToBulletText(latex: string): string {
  let out = ''
  let i = 0
  while (i < latex.length) {
    if (latex.startsWith('\\textbf{', i)) {
      const close = findMatchingBrace(latex, i + '\\textbf{'.length - 1)
      if (close === -1) { out += latex[i]; i++; continue }
      const inner = latex.slice(i + '\\textbf{'.length, close)
      out += '\\b{' + latexToBulletText(inner) + '}'
      i = close + 1
      continue
    }
    // Un-escape special chars
    if (latex[i] === '\\' && i + 1 < latex.length && '&%$#_{}'.includes(latex[i + 1])) {
      out += latex[i + 1]
      i += 2
      continue
    }
    out += latex[i]
    i++
  }
  return out.trim()
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
// Skills
// ---------------------------------------------------------------------------

function toSkills(entries: (SubheadingNode | SkillsNode)[]): SkillsBlock | null {
  const skillsEntry = entries.find((e): e is SkillsNode => e.kind === 'skills')
  if (!skillsEntry) return null
  return {
    kind: 'skills',
    id: 'skills-0',
    categories: parseSkillCategories(skillsEntry.raw),
  }
}

/**
 * Parse skills lines that look like:
 *   \textbf{Languages}{: Python, JavaScript, TypeScript}
 * Returns one category per line.
 */
export function parseSkillCategories(raw: string): SkillsCategory[] {
  const categories: SkillsCategory[] = []
  const re = /\\textbf\{([^}]+)\}\{:\s*([^}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    const label = m[1].trim()
    const items = m[2]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    categories.push({ label, items })
  }
  return categories
}
