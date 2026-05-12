import type {
  ResumeAST, SectionNode, SectionType,
  SubheadingNode, ItemNode, SkillsNode, EntryNode,
  ProjectHeadingNode, BankedProjectNode,
} from './ast-types'

// ---------------------------------------------------------------------------
// Bracket-balanced argument extractor
// Reads one {…} argument starting at `pos`, returns [content, endPos].
// endPos points to the character AFTER the closing '}'.
// ---------------------------------------------------------------------------
function extractArg(src: string, pos: number): [string, number] {
  if (src[pos] !== '{') throw new Error(`Expected '{' at ${pos}, got '${src[pos]}'`)
  let depth = 0
  let i = pos
  while (i < src.length) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') {
      depth--
      if (depth === 0) return [src.slice(pos + 1, i), i + 1]
    }
    i++
  }
  throw new Error(`Unmatched '{' starting at ${pos}`)
}

// ---------------------------------------------------------------------------
// Extract up to N balanced {…} arguments starting at `pos`,
// skipping whitespace and newlines between args.
// ---------------------------------------------------------------------------
function extractArgs(src: string, pos: number, n: number): [string[], number] {
  const args: string[] = []
  let cur = pos
  for (let i = 0; i < n; i++) {
    // Skip whitespace / newlines between arguments
    while (cur < src.length && /[\s]/.test(src[cur])) cur++
    const [arg, next] = extractArg(src, cur)
    args.push(arg)
    cur = next
  }
  return [args, cur]
}

// ---------------------------------------------------------------------------
// Section type from title
// ---------------------------------------------------------------------------
const SECTION_TYPE_MAP: Record<string, SectionType> = {
  experience: 'experience',
  education: 'education',
  projects: 'projects',
  'technical skills': 'skills',
  skills: 'skills',
}

/**
 * Strip wrapper commands like \textcolor{c}{Title} or \textbf{Title} so
 * \section{\textcolor{darkblue}{Education}} normalizes to "Education".
 * Applied repeatedly until no wrappers remain.
 */
function normalizeSectionTitle(raw: string): string {
  let out = raw.trim()
  let changed = true
  while (changed) {
    changed = false
    // \textcolor{x}{Inner} or \textbf{Inner} or \emph{Inner}
    const m = out.match(/^\\(?:textcolor|textbf|emph|underline)\s*(?:\{[^}]*\}\s*)?\{(.*)\}\s*$/)
    if (m) {
      out = m[1].trim()
      changed = true
    }
  }
  return out
}

function sectionType(title: string): SectionType {
  return SECTION_TYPE_MAP[normalizeSectionTitle(title).toLowerCase()] ?? 'experience'
}

// ---------------------------------------------------------------------------
// Section prefix for stable IDs
// ---------------------------------------------------------------------------
const SECTION_PREFIX: Record<SectionType, string> = {
  experience: 'exp',
  education: 'edu',
  projects: 'proj',
  skills: 'skills',
}

// ---------------------------------------------------------------------------
// Parse \resumeItem{text} at position `pos`.
// Returns null if the text at pos doesn't start with \resumeItem.
// ---------------------------------------------------------------------------
function parseItem(src: string, pos: number, id: string): ItemNode | null {
  if (!src.startsWith('\\resumeItem', pos)) return null
  const afterMacro = pos + '\\resumeItem'.length
  // skip optional whitespace before {
  let cur = afterMacro
  while (cur < src.length && src[cur] === ' ') cur++
  try {
    const [args, end] = extractArgs(src, cur, 1)
    return { kind: 'item', id, text: args[0].trim(), startIndex: pos, endIndex: end }
  } catch {
    return null
  }
}

/** True if `pos` is on a line whose first non-whitespace char is `%`. */
function isCommentedAt(src: string, pos: number): boolean {
  let i = pos
  // walk back to start of line
  while (i > 0 && src[i - 1] !== '\n') i--
  // skip whitespace
  while (i < pos && /\s/.test(src[i])) i++
  return src[i] === '%'
}

// ---------------------------------------------------------------------------
// Common item-list parser shared by \resumeSubheading and \resumeProjectHeading
// ---------------------------------------------------------------------------
function parseItemsBetween(
  src: string,
  afterArgs: number,
  id: string,
  sectionEnd: number,
): { items: ItemNode[]; blockEnd: number } {
  const itemListStart = src.indexOf('\\resumeItemListStart', afterArgs)
  const itemListEnd = src.indexOf('\\resumeItemListEnd', afterArgs)

  // Where does this entry's block end?
  let blockEnd: number
  if (itemListEnd !== -1 && itemListEnd < sectionEnd) {
    blockEnd = itemListEnd + '\\resumeItemListEnd'.length
  } else {
    const nextEntry = nextEntryStart(src, afterArgs, sectionEnd)
    blockEnd = nextEntry !== -1 ? nextEntry : sectionEnd
  }

  const items: ItemNode[] = []
  if (itemListStart !== -1 && itemListStart < sectionEnd && itemListEnd !== -1) {
    let cur = itemListStart + '\\resumeItemListStart'.length
    let itemIdx = 0
    while (cur < itemListEnd) {
      while (cur < itemListEnd && /\s/.test(src[cur])) cur++
      if (cur >= itemListEnd) break
      // Skip commented \resumeItem lines (lines starting with %)
      // by detecting % at start of a logical line
      if (src[cur] === '%') {
        const nextNl = src.indexOf('\n', cur)
        cur = nextNl === -1 ? itemListEnd : nextNl + 1
        continue
      }
      const itemId = `${id}-item-${itemIdx}`
      const node = parseItem(src, cur, itemId)
      if (node) {
        items.push(node)
        cur = node.endIndex
        itemIdx++
      } else {
        const next = src.indexOf('\\resumeItem', cur + 1)
        if (next === -1 || next >= itemListEnd) break
        cur = next
      }
    }
  }
  return { items, blockEnd }
}

/** Find the start of the next entry macro after `from`, within `sectionEnd`. */
function nextEntryStart(src: string, from: number, sectionEnd: number): number {
  const candidates = [
    src.indexOf('\\resumeSubheading', from),
    src.indexOf('\\resumeSubheadingSecond', from),
    src.indexOf('\\resumeProjectHeading', from),
    src.indexOf('\\addproject', from),
  ].filter((i) => i !== -1 && i < sectionEnd)
  return candidates.length ? Math.min(...candidates) : -1
}

// ---------------------------------------------------------------------------
// \resumeSubheading{}{}{}{} (4-arg)
// ---------------------------------------------------------------------------
function parseSubheading(
  src: string,
  pos: number,
  id: string,
  sectionEnd: number,
): SubheadingNode | null {
  // Distinguish from \resumeSubheadingSecond — make sure the next char after
  // "\resumeSubheading" is not a letter (otherwise it's a different macro).
  if (!src.startsWith('\\resumeSubheading', pos)) return null
  const after = pos + '\\resumeSubheading'.length
  if (/[A-Za-z]/.test(src[after] ?? '')) return null
  try {
    const [args, afterArgs] = extractArgs(src, after, 4)
    const { items, blockEnd } = parseItemsBetween(src, afterArgs, id, sectionEnd)
    return {
      kind: 'subheading', id, variant: 'standard',
      args, items, startIndex: pos, endIndex: blockEnd,
    }
  } catch { return null }
}

// ---------------------------------------------------------------------------
// \resumeSubheadingSecond{}{}{}{}{}{} (6-arg, used for Education)
// ---------------------------------------------------------------------------
function parseSubheadingSecond(
  src: string,
  pos: number,
  id: string,
  sectionEnd: number,
): SubheadingNode | null {
  if (!src.startsWith('\\resumeSubheadingSecond', pos)) return null
  const after = pos + '\\resumeSubheadingSecond'.length
  try {
    const [args, afterArgs] = extractArgs(src, after, 6)
    const { items, blockEnd } = parseItemsBetween(src, afterArgs, id, sectionEnd)
    return {
      kind: 'subheading', id, variant: 'second',
      args, items, startIndex: pos, endIndex: blockEnd,
    }
  } catch { return null }
}

// ---------------------------------------------------------------------------
// \resumeProjectHeading{heading}{dates}
// ---------------------------------------------------------------------------
function parseProjectHeading(
  src: string,
  pos: number,
  id: string,
  sectionEnd: number,
): ProjectHeadingNode | null {
  if (!src.startsWith('\\resumeProjectHeading', pos)) return null
  const after = pos + '\\resumeProjectHeading'.length
  try {
    const [args, afterArgs] = extractArgs(src, after, 2)
    const { items, blockEnd } = parseItemsBetween(src, afterArgs, id, sectionEnd)
    return {
      kind: 'project-heading', id,
      heading: args[0], dates: args[1],
      items, startIndex: pos, endIndex: blockEnd,
    }
  } catch { return null }
}

// ---------------------------------------------------------------------------
// \addproject{Key}  — banked project reference
// ---------------------------------------------------------------------------
function parseAddProject(src: string, pos: number): BankedProjectNode | null {
  if (!src.startsWith('\\addproject', pos)) return null
  const after = pos + '\\addproject'.length
  try {
    const [args, afterArgs] = extractArgs(src, after, 1)
    return {
      kind: 'banked-project',
      id: `proj-bank-${args[0].trim()}`,
      bankKey: args[0].trim(),
      startIndex: pos,
      endIndex: afterArgs,
    }
  } catch { return null }
}

// ---------------------------------------------------------------------------
// Parse the Skills section (uses raw \begin{itemize} not \resumeSubheading)
// ---------------------------------------------------------------------------
function parseSkillsSection(src: string, sectionStart: number, sectionEnd: number): SkillsNode {
  const raw = src.slice(sectionStart, sectionEnd).trim()
  return {
    kind: 'skills',
    id: 'skills-0',
    raw,
    startIndex: sectionStart,
    endIndex: sectionEnd,
  }
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------
export function parseResume(src: string): ResumeAST {
  try {
    // ---- Split preamble / body ----
    const docBegin = src.indexOf('\\begin{document}')
    if (docBegin === -1) return { preamble: src, header: '', sections: [], parseError: 'No \\begin{document} found' }
    const preamble = src.slice(0, docBegin + '\\begin{document}'.length)

    // ---- Extract header block (\begin{center}…\end{center}) ----
    const centerStart = src.indexOf('\\begin{center}', docBegin)
    const centerEnd = src.indexOf('\\end{center}', docBegin)
    const header = centerStart !== -1 && centerEnd !== -1
      ? src.slice(centerStart, centerEnd + '\\end{center}'.length)
      : ''

    // ---- Find all \section{} positions (bracket-balanced so titles can contain \textcolor{}) ----
    const sectionMatches: Array<{ title: string; index: number }> = []
    {
      let cur = docBegin
      while (true) {
        const next = src.indexOf('\\section{', cur)
        if (next === -1) break
        // Skip commented-out sections
        if (isCommentedAt(src, next)) { cur = next + 1; continue }
        try {
          const [titleArgs] = extractArgs(src, next + '\\section'.length, 1)
          sectionMatches.push({ title: titleArgs[0], index: next })
        } catch {
          // unbalanced — skip
        }
        cur = next + '\\section'.length + 1
      }
    }

    if (sectionMatches.length === 0) {
      return { preamble, header, sections: [], parseError: 'No \\section{} blocks found' }
    }

    // ---- Parse each section ----
    const sections: SectionNode[] = []

    for (let si = 0; si < sectionMatches.length; si++) {
      const { title, index: sectionStart } = sectionMatches[si]
      const sectionEnd = si + 1 < sectionMatches.length
        ? sectionMatches[si + 1].index
        : src.indexOf('\\end{document}') !== -1
          ? src.indexOf('\\end{document}')
          : src.length

      const type = sectionType(title)
      const prefix = SECTION_PREFIX[type]
      const entries: EntryNode[] = []

      if (type === 'skills') {
        entries.push(parseSkillsSection(src, sectionStart, sectionEnd))
      } else {
        // Walk forward, dispatching to the right entry parser for whichever
        // recognized macro we hit first.
        let searchFrom = sectionStart
        let subIdx = 0
        while (searchFrom < sectionEnd) {
          const next = nextEntryStart(src, searchFrom, sectionEnd)
          if (next === -1) break

          // Skip if this line is a comment
          if (isCommentedAt(src, next)) {
            const nl = src.indexOf('\n', next)
            searchFrom = nl === -1 ? sectionEnd : nl + 1
            continue
          }

          const id = `${prefix}-${subIdx}`
          let node: EntryNode | null = null
          if (src.startsWith('\\resumeSubheadingSecond', next)) {
            node = parseSubheadingSecond(src, next, id, sectionEnd)
          } else if (src.startsWith('\\resumeSubheading', next)) {
            node = parseSubheading(src, next, id, sectionEnd)
          } else if (src.startsWith('\\resumeProjectHeading', next)) {
            node = parseProjectHeading(src, next, id, sectionEnd)
          } else if (src.startsWith('\\addproject', next)) {
            const banked = parseAddProject(src, next)
            if (banked) node = banked
          }

          if (node) {
            entries.push(node)
            searchFrom = node.endIndex
            subIdx++
          } else {
            searchFrom = next + 1
          }
        }
      }

      sections.push({ title, type, entries, startIndex: sectionStart, endIndex: sectionEnd })
    }

    return { preamble, header, sections }
  } catch (err) {
    return { preamble: '', header: '', sections: [], parseError: String(err) }
  }
}

// ---------------------------------------------------------------------------
// selfTest — run in browser console to verify the parser against the template
// ---------------------------------------------------------------------------
export function selfTest(src: string): void {
  const ast = parseResume(src)
  if (ast.parseError) {
    console.error('[parser] parseError:', ast.parseError)
    return
  }
  console.group('[parser] selfTest')
  console.log(`sections: ${ast.sections.length}`)
  for (const section of ast.sections) {
    console.group(`  ${section.title} (${section.type}) — ${section.entries.length} entries`)
    for (const entry of section.entries) {
      if (entry.kind === 'subheading') {
        console.log(`    [${entry.id}] (${entry.variant}) "${entry.args[0]}" @ ${entry.startIndex}–${entry.endIndex}, items: ${entry.items.length}`)
        for (const item of entry.items) console.log(`      [${item.id}] "${item.text.slice(0, 60)}…"`)
      } else if (entry.kind === 'project-heading') {
        console.log(`    [${entry.id}] (project) "${entry.heading.slice(0, 60)}…", items: ${entry.items.length}`)
        for (const item of entry.items) console.log(`      [${item.id}] "${item.text.slice(0, 60)}…"`)
      } else if (entry.kind === 'banked-project') {
        console.log(`    [${entry.id}] (banked) key="${entry.bankKey}"`)
      } else if (entry.kind === 'skills') {
        console.log(`    [${entry.id}] skills block @ ${entry.startIndex}–${entry.endIndex}`)
      }
    }
    console.groupEnd()
  }
  // Verify round-trip: source reconstructed from indices matches originals
  let roundTripOk = true
  for (const section of ast.sections) {
    for (const entry of section.entries) {
      const slice = src.slice(entry.startIndex, entry.endIndex)
      if (entry.kind === 'subheading' && !slice.includes('\\resumeSubheading')) {
        console.error(`  [FAIL] ${entry.id} slice doesn't contain \\resumeSubheading`)
        roundTripOk = false
      }
      if (entry.kind === 'subheading' || entry.kind === 'project-heading') {
        for (const item of entry.items) {
          const itemSlice = src.slice(item.startIndex, item.endIndex)
          if (!itemSlice.includes('\\resumeItem')) {
            console.error(`  [FAIL] ${item.id} slice doesn't contain \\resumeItem`)
            roundTripOk = false
          }
        }
      }
    }
  }
  if (roundTripOk) console.log('  ✓ all index slices look correct')
  console.groupEnd()
}
