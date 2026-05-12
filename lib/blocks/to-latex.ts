import type { ResumeAST, SectionNode } from '../latex/ast-types'
import type {
  ResumeBlocks,
  ExperienceEntryBlock,
  EducationEntryBlock,
  ProjectEntryBlock,
  SkillsBlock,
  BulletBlock,
} from './block-types'

// ---------------------------------------------------------------------------
// Blocks → LaTeX
//
// We don't rebuild the whole document; we splice each section's body in place
// using the original AST's section ranges. That preserves preamble, header,
// inter-section comments, and ordering.
// ---------------------------------------------------------------------------

export function blocksToLatex(
  blocks: ResumeBlocks,
  originalSource: string,
  ast: ResumeAST,
): string {
  // Splice sections from the end so earlier indices stay valid.
  const ordered = [...ast.sections].sort((a, b) => b.startIndex - a.startIndex)
  let source = originalSource

  for (const section of ordered) {
    const headerEnd = findSectionBodyStart(source, section)
    const bodyEnd = findSectionBodyEnd(source, section)
    const sectionHeader = source.slice(section.startIndex, headerEnd)
    const newBody = renderSectionBody(section.type, blocks)
    source = source.slice(0, section.startIndex) + sectionHeader + newBody + source.slice(bodyEnd)
  }

  return source
}

/** Find the index right after the `\section{Title}` line so we keep that header verbatim. */
function findSectionBodyStart(source: string, section: SectionNode): number {
  const sectionMacro = source.indexOf('\\section{', section.startIndex)
  if (sectionMacro === -1) return section.startIndex
  // Skip past the closing brace of \section{...}
  let i = sectionMacro + '\\section{'.length
  let depth = 1
  while (i < source.length && depth > 0) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') depth--
    i++
  }
  // Include the trailing newline after \section{...}
  if (source[i] === '\n') i++
  return i
}

/**
 * The parser's section.endIndex extends to the next `\section{}` (or
 * `\end{document}`), which means it greedily eats any inter-section comments
 * or blank lines that visually "belong" to the next section. To preserve
 * those, we trim back to the last meaningful macro of THIS section and stop
 * there — leaving everything after untouched.
 */
function findSectionBodyEnd(source: string, section: SectionNode): number {
  const endMarkers =
    section.type === 'skills'
      ? ['\\end{itemize}']
      : ['\\resumeSubHeadingListEnd']
  let bestEnd = -1
  for (const marker of endMarkers) {
    // Find the LAST occurrence of the marker within this section's range
    let idx = section.startIndex
    while (true) {
      const next = source.indexOf(marker, idx)
      if (next === -1 || next >= section.endIndex) break
      bestEnd = next + marker.length
      idx = next + marker.length
    }
  }
  if (bestEnd === -1) return section.endIndex
  // Include a single trailing newline if present (the closing macro's own line)
  if (source[bestEnd] === '\n') bestEnd++
  return bestEnd
}

// ---------------------------------------------------------------------------
// Per-section rendering
// ---------------------------------------------------------------------------

function renderSectionBody(type: SectionNode['type'], blocks: ResumeBlocks): string {
  switch (type) {
    case 'experience':
      return renderEntryList(blocks.experience.map(renderExperienceEntry))
    case 'education':
      return renderEntryList(blocks.education.map(renderEducationEntry))
    case 'projects':
      return renderEntryList(blocks.projects.map(renderProjectEntry))
    case 'skills':
      return renderSkills(blocks.skills)
  }
}

function renderEntryList(renderedEntries: string[]): string {
  if (renderedEntries.length === 0) {
    return '  \\resumeSubHeadingListStart\n  \\resumeSubHeadingListEnd\n'
  }
  return (
    '  \\resumeSubHeadingListStart\n\n' +
    renderedEntries.join('\n') +
    '  \\resumeSubHeadingListEnd\n'
  )
}

function renderExperienceEntry(e: ExperienceEntryBlock): string {
  return (
    `    \\resumeSubheading\n` +
    `      {${escapeLatex(e.role)}}{${escapeLatex(e.dates)}}\n` +
    `      {${escapeLatex(e.company)}}{${escapeLatex(e.location)}}\n` +
    renderBullets(e.bullets) +
    `\n`
  )
}

function renderEducationEntry(e: EducationEntryBlock): string {
  if (e.variant === 'second') {
    return (
      `    \\resumeSubheadingSecond\n` +
      `      {${escapeLatex(e.school)}} {${escapeLatex(e.location)}}\n` +
      // degree often contains \textbar / \textbf — emit verbatim
      `      {${e.degree}}{${escapeLatex(e.dates)}}\n` +
      `      {${escapeLatex(e.extras?.label ?? '')}} { ${escapeLatex(e.extras?.items ?? '')}}\n` +
      renderBullets(e.bullets) +
      `\n`
    )
  }
  return (
    `    \\resumeSubheading\n` +
    `      {${escapeLatex(e.school)}}{${escapeLatex(e.location)}}\n` +
    `      {${escapeLatex(e.degree)}}{${escapeLatex(e.dates)}}\n` +
    renderBullets(e.bullets) +
    `\n`
  )
}

function renderProjectEntry(p: ProjectEntryBlock): string {
  if (p.source === 'banked') {
    return `    \\addproject{${p.bankKey ?? p.name}}\n`
  }
  // Inline project — emit headingRaw verbatim to preserve \href / \emph / \faLink
  return (
    `    \\resumeProjectHeading\n` +
    `          {${p.headingRaw}}{${escapeLatex(p.dates)}}\n` +
    renderBullets(p.bullets) +
    `\n`
  )
}

function renderBullets(bullets: BulletBlock[]): string {
  if (bullets.length === 0) return ''
  const items = bullets
    .map((b) => {
      // Read-only bullets: emit the original raw LaTeX verbatim
      if (b.readOnly && b.raw) {
        return `        \\resumeItem{${b.raw}}`
      }
      return `        \\resumeItem{${renderBulletText(b.text)}}`
    })
    .join('\n')
  return `      \\resumeItemListStart\n${items}\n      \\resumeItemListEnd\n`
}

function renderSkills(skills: SkillsBlock | null): string {
  if (!skills || skills.categories.length === 0) {
    return ' \\begin{itemize}[leftmargin=0.15in, label={}]\n    \\small{\\item{}}\n \\end{itemize}\n'
  }
  const lines = skills.categories
    .map(
      (c) =>
        `     \\textbf{${escapeLatex(c.label)}}{: ${c.items.map(escapeLatex).join(', ')}}`,
    )
    .join(' \\\\\n')
  return (
    ` \\begin{itemize}[leftmargin=0.15in, label={}]\n` +
    `    \\small{\\item{\n${lines}\n    }}\n` +
    ` \\end{itemize}\n`
  )
}

// ---------------------------------------------------------------------------
// Bullet text rendering — convert \b{...} markers to \textbf{...} and escape
// LaTeX special chars. Anything else is treated as plain text.
// ---------------------------------------------------------------------------

export function renderBulletText(text: string): string {
  let out = ''
  let i = 0
  while (i < text.length) {
    if (text.startsWith('\\b{', i)) {
      const close = findMatchingBrace(text, i + 2)
      if (close === -1) {
        // Unbalanced — validator should have caught this. Emit literally as escaped text.
        out += escapeLatex(text.slice(i))
        break
      }
      const inner = text.slice(i + 3, close)
      out += '\\textbf{' + renderBulletText(inner) + '}'
      i = close + 1
      continue
    }
    out += escapeLatexChar(text[i])
    i++
  }
  return out
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
// LaTeX escaping
// ---------------------------------------------------------------------------

const ESCAPE: Record<string, string> = {
  '&': '\\&',
  '%': '\\%',
  '$': '\\$',
  '#': '\\#',
  '_': '\\_',
  '{': '\\{',
  '}': '\\}',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
  '\\': '\\textbackslash{}',
}

export function escapeLatex(s: string): string {
  let out = ''
  for (const ch of s) out += escapeLatexChar(ch)
  return out
}

function escapeLatexChar(ch: string): string {
  return ESCAPE[ch] ?? ch
}
