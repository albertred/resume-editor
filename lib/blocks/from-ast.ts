import type {
  ResumeAST,
  SectionNode,
  SubheadingNode,
  SkillsNode,
  ItemNode,
  ProjectHeadingNode,
  BankedProjectNode,
  EntryNode,
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
    experience: collect(ast, 'experience').flatMap(toExperienceEntry),
    education: collect(ast, 'education').flatMap(toEducationEntry),
    projects: collect(ast, 'projects').flatMap(toProjectEntry),
    skills: toSkills(collect(ast, 'skills')),
  }
}

function collect(ast: ResumeAST, type: SectionNode['type']): EntryNode[] {
  const section = ast.sections.find((s) => s.type === type)
  return section?.entries ?? []
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function parseHeader(header: string): { name: string; contact: string } {
  if (!header) return { name: '', contact: '' }
  const nameMatch = header.match(/\\textbf\{[^}]*?\\scshape\s+([^}]+)\}/) ??
    header.match(/\\scshape\s+([A-Z][A-Z\s.]+?)\}/)
  const name = nameMatch ? nameMatch[1].trim() : ''
  const contactRaw = header.replace(/.*?\\\\/, '').replace(/\\end\{center\}/, '')
  const contact = contactRaw
    .replace(/\\vspace\{[^}]*\}/g, '')
    .replace(/\\small/g, '')
    .replace(/\\href\{[^}]*\}\{([^}]*)\}/g, '$1')
    .replace(/\\textcolor\{[^}]*\}\{([^}]*)\}/g, '$1')
    .replace(/\\underline\{([^}]*)\}/g, '$1')
    .replace(/\$\|\$/g, '|')
    .replace(/\s+/g, ' ')
    .trim()
  return { name, contact }
}

// ---------------------------------------------------------------------------
// Experience / Education / Projects entries
// ---------------------------------------------------------------------------

function toExperienceEntry(entry: EntryNode): ExperienceEntryBlock[] {
  if (entry.kind !== 'subheading') return []
  // Experience uses 4-arg \resumeSubheading: {role}{dates}{company}{location}
  const [role, dates, company, location] = entry.args
  return [{
    kind: 'experience-entry',
    id: entry.id,
    role: (role ?? '').trim(),
    dates: (dates ?? '').trim(),
    company: (company ?? '').trim(),
    location: (location ?? '').trim(),
    bullets: entry.items.map(bulletFromItem),
  }]
}

function toEducationEntry(entry: EntryNode): EducationEntryBlock[] {
  if (entry.kind !== 'subheading') return []
  if (entry.variant === 'second') {
    // 6-arg: {school}{location}{degreeLine}{dates}{extrasLabel}{extras}
    const [school, location, degree, dates, extrasLabel, extras] = entry.args
    const block: EducationEntryBlock = {
      kind: 'education-entry',
      id: entry.id,
      variant: 'second',
      school: (school ?? '').trim(),
      location: (location ?? '').trim(),
      degree: (degree ?? '').trim(),
      dates: (dates ?? '').trim(),
      extras: { label: (extrasLabel ?? '').trim(), items: (extras ?? '').trim() },
      bullets: entry.items.map(bulletFromItem),
    }
    if (containsRichLatex(block.degree) || containsRichLatex(block.extras?.items ?? '')) {
      block.readOnly = true
    }
    return [block]
  }
  // standard 4-arg: {school}{location}{degree}{dates}
  const [school, location, degree, dates] = entry.args
  return [{
    kind: 'education-entry',
    id: entry.id,
    variant: 'standard',
    school: (school ?? '').trim(),
    location: (location ?? '').trim(),
    degree: (degree ?? '').trim(),
    dates: (dates ?? '').trim(),
    bullets: entry.items.map(bulletFromItem),
  }]
}

function toProjectEntry(entry: EntryNode): ProjectEntryBlock[] {
  if (entry.kind === 'project-heading') {
    const heading = entry.heading ?? ''
    return [{
      kind: 'project-entry',
      id: entry.id,
      source: 'inline',
      name: extractProjectName(heading),
      stack: extractEmphContent(heading),
      dates: (entry.dates ?? '').trim(),
      headingRaw: heading,
      bullets: entry.items.map(bulletFromItem),
    }]
  }
  if (entry.kind === 'banked-project') {
    return [{
      kind: 'project-entry',
      id: entry.id,
      source: 'banked',
      bankKey: entry.bankKey,
      name: entry.bankKey,
      stack: '',
      dates: '',
      headingRaw: '',
      bullets: [],
    }]
  }
  // Legacy: \resumeSubheading inside Projects (4-arg) — preserve as inline.
  if (entry.kind === 'subheading') {
    const [name, link, description, stack] = entry.args
    return [{
      kind: 'project-entry',
      id: entry.id,
      source: 'inline',
      name: (name ?? '').trim(),
      stack: (stack ?? '').trim(),
      dates: (link ?? '').trim(),
      headingRaw: `\\textbf{${name ?? ''}} | \\emph{${stack ?? ''}}`,
      bullets: entry.items.map(bulletFromItem),
    }]
  }
  return []
}

/** Pull the first \textbf{...} content out of a heading as a display name. */
function extractProjectName(heading: string): string {
  const m = heading.match(/\\textbf\{([^}]+)\}/)
  if (m) return m[1].replace(/\\scriptsize\{[^}]*\}/g, '').trim()
  return heading.slice(0, 60).trim()
}

function extractEmphContent(heading: string): string {
  const m = heading.match(/\\emph\{([^}]+)\}/)
  return m ? m[1].trim() : ''
}

// ---------------------------------------------------------------------------
// Bullet ingestion
// ---------------------------------------------------------------------------

function bulletFromItem(item: ItemNode): BulletBlock {
  const raw = item.text
  if (containsRichLatex(raw)) {
    return {
      kind: 'bullet',
      id: item.id,
      text: latexToDisplayText(raw),
      readOnly: true,
      raw,
    }
  }
  return { kind: 'bullet', id: item.id, text: latexToBulletText(raw) }
}

/**
 * True if the LaTeX contains commands we can't safely round-trip through the
 * block model. \textbf is the one allowed command (round-trips as \b{...}).
 */
function containsRichLatex(text: string): boolean {
  // Strip \textbf{...} occurrences (they're fine) then look for any \word
  let stripped = text
  // remove \textbf{...} (non-nested approximation)
  let prev = ''
  while (prev !== stripped) {
    prev = stripped
    stripped = stripped.replace(/\\textbf\{[^{}]*\}/g, '')
  }
  // remove escaped \% \& \$ \# \_ \{ \}
  stripped = stripped.replace(/\\[&%$#_{}]/g, '')
  return /\\[A-Za-z]+/.test(stripped)
}

/** Render rich LaTeX to a plain display approximation (for the LLM's context). */
function latexToDisplayText(latex: string): string {
  return latex
    .replace(/\\href\{[^}]*\}\{([^}]*)\}/g, '$1')
    .replace(/\\textcolor\{[^}]*\}\{([^}]*)\}/g, '$1')
    .replace(/\\underline\{([^}]*)\}/g, '$1')
    .replace(/\\textbf\{([^}]*)\}/g, '$1')
    .replace(/\\textit\{([^}]*)\}/g, '$1')
    .replace(/\\emph\{([^}]*)\}/g, '$1')
    .replace(/\\scriptsize\{[^}]*\}/g, '')
    .replace(/\\faLink\\?/g, '')
    .replace(/\\[A-Za-z]+\{?/g, '')
    .replace(/\}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ---------------------------------------------------------------------------
// Bullet text conversion (editable bullets only): LaTeX → block-text
//   \textbf{X}  →  \b{X}
//   \%, \&, \$, \#, \_  →  %, &, $, #, _
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

function toSkills(entries: EntryNode[]): SkillsBlock | null {
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
 * Skips lines starting with `%` (commented-out categories).
 */
export function parseSkillCategories(raw: string): SkillsCategory[] {
  const categories: SkillsCategory[] = []
  // Match \textbf{label}{: items}, but only on non-commented lines
  const lines = raw.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('%')) continue
    const m = trimmed.match(/\\textbf\{([^}]+)\}\{:\s*([^}]*)\}/)
    if (!m) continue
    const label = m[1].trim()
    const items = m[2].split(',').map((s) => s.trim()).filter(Boolean)
    categories.push({ label, items })
  }
  return categories
}
