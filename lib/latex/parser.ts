import type {
  ResumeAST, SectionNode, SectionType,
  SubheadingNode, ItemNode, SkillsNode, EntryNode,
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

function sectionType(title: string): SectionType {
  return SECTION_TYPE_MAP[title.toLowerCase().trim()] ?? 'experience'
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

// ---------------------------------------------------------------------------
// Parse \resumeSubheading{}{}{}{} block starting at `pos`.
// Includes all \resumeItem children up to the next \resumeSubheading,
// \resumeSubHeadingListEnd, or end of section.
// ---------------------------------------------------------------------------
function parseSubheading(
  src: string,
  pos: number,
  id: string,
  sectionEnd: number,
): SubheadingNode | null {
  if (!src.startsWith('\\resumeSubheading', pos)) return null
  const afterMacro = pos + '\\resumeSubheading'.length
  try {
    const [args, afterArgs] = extractArgs(src, afterMacro, 4)

    // Find \resumeItemListStart (optional — some entries have no bullets)
    const itemListStart = src.indexOf('\\resumeItemListStart', afterArgs)
    const itemListEnd = src.indexOf('\\resumeItemListEnd', afterArgs)

    // Find where this subheading block ends:
    // either at \resumeItemListEnd (inclusive) or at next \resumeSubheading / section end
    let blockEnd: number
    if (itemListEnd !== -1 && itemListEnd < sectionEnd) {
      blockEnd = itemListEnd + '\\resumeItemListEnd'.length
    } else {
      // no item list — block ends before next \resumeSubheading or section end
      const nextSub = src.indexOf('\\resumeSubheading', afterArgs)
      blockEnd = nextSub !== -1 && nextSub < sectionEnd ? nextSub : sectionEnd
    }

    // Parse items
    const items: ItemNode[] = []
    if (itemListStart !== -1 && itemListStart < sectionEnd && itemListEnd !== -1) {
      let cur = itemListStart + '\\resumeItemListStart'.length
      let itemIdx = 0
      while (cur < itemListEnd) {
        // Skip whitespace
        while (cur < itemListEnd && /\s/.test(src[cur])) cur++
        if (cur >= itemListEnd) break
        const itemId = `${id}-item-${itemIdx}`
        const node = parseItem(src, cur, itemId)
        if (node) {
          items.push(node)
          cur = node.endIndex
          itemIdx++
        } else {
          // Skip to next \resumeItem
          const next = src.indexOf('\\resumeItem', cur + 1)
          if (next === -1 || next >= itemListEnd) break
          cur = next
        }
      }
    }

    return {
      kind: 'subheading',
      id,
      args: args as [string, string, string, string],
      items,
      startIndex: pos,
      endIndex: blockEnd,
    }
  } catch {
    return null
  }
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

    // ---- Find all \section{} positions ----
    const sectionRegex = /\\section\{([^}]+)\}/g
    const sectionMatches: Array<{ title: string; index: number }> = []
    let m: RegExpExecArray | null
    while ((m = sectionRegex.exec(src)) !== null) {
      sectionMatches.push({ title: m[1], index: m.index })
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
        // Find all \resumeSubheading occurrences within this section
        let searchFrom = sectionStart
        let subIdx = 0
        while (searchFrom < sectionEnd) {
          const nextSub = src.indexOf('\\resumeSubheading', searchFrom)
          if (nextSub === -1 || nextSub >= sectionEnd) break

          const id = `${prefix}-${subIdx}`
          const node = parseSubheading(src, nextSub, id, sectionEnd)
          if (node) {
            entries.push(node)
            searchFrom = node.endIndex
            subIdx++
          } else {
            searchFrom = nextSub + 1
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
        console.log(`    [${entry.id}] "${entry.args[0]}" @ ${entry.startIndex}–${entry.endIndex}, items: ${entry.items.length}`)
        for (const item of entry.items) {
          console.log(`      [${item.id}] "${item.text.slice(0, 60)}…"`)
        }
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
      // Also verify items within subheadings
      if (entry.kind === 'subheading') {
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
