import type { ResumeBlocks } from './block-types'
import { buildBlockMap } from './block-types'
import type { BankBlocks } from './bank-types'
import { buildBankMap } from './bank-types'
import type {
  BlockEditOperation,
  BlockValidationResult,
} from './block-edit-types'

export function validateBlockOps(
  ops: BlockEditOperation[],
  blocks: ResumeBlocks,
  bank: BankBlocks,
): BlockValidationResult[] {
  const blockMap = buildBlockMap(blocks)
  const bankMap = buildBankMap(bank)

  return ops.map((op): BlockValidationResult => {
    if (!op || typeof op !== 'object' || !('type' in op)) {
      return { op: op as BlockEditOperation, valid: false, error: 'op is malformed' }
    }
    switch (op.type) {
      case 'replace_bullet': {
        const node = blockMap.get(op.targetId)
        if (!node) return fail(op, `targetId "${op.targetId}" not found on resume`)
        if (node.kind !== 'bullet') return fail(op, `targetId "${op.targetId}" is not a bullet`)
        if (op.targetId.startsWith('bank-')) return fail(op, 'replace_bullet cannot target bank IDs')
        if (node.readOnly) return fail(op, 'targetId points to a read-only bullet (contains inline LaTeX)')
        return checkBulletText(op, op.text)
      }

      case 'insert_bullet': {
        const node = blockMap.get(op.afterId)
        if (!node) return fail(op, `afterId "${op.afterId}" not found on resume`)
        if (node.kind === 'skills') return fail(op, 'Cannot insert a bullet into the skills section')
        if (op.afterId.startsWith('bank-')) return fail(op, 'afterId cannot reference a bank ID')
        return checkBulletText(op, op.text)
      }

      case 'delete_bullet': {
        const node = blockMap.get(op.targetId)
        if (!node) return fail(op, `targetId "${op.targetId}" not found on resume`)
        if (node.kind !== 'bullet') return fail(op, `targetId "${op.targetId}" is not a bullet`)
        if (node.readOnly) return fail(op, 'targetId points to a read-only bullet')
        return ok(op)
      }

      case 'edit_skills': {
        if (!blocks.skills) return fail(op, 'Resume has no skills section')
        if (!op.categoryLabel?.trim()) return fail(op, 'categoryLabel is empty')
        if (!Array.isArray(op.items)) return fail(op, 'items must be an array')
        if (op.items.some((s) => !s.trim())) return fail(op, 'items contains empty strings')
        return ok(op)
      }

      case 'add_bullet_from_bank': {
        const bankNode = bankMap.get(op.bankId)
        if (!bankNode) return fail(op, `bankId "${op.bankId}" not found in bank`)
        if (bankNode.kind !== 'bullet') return fail(op, `bankId "${op.bankId}" is not a bullet`)
        const anchor = blockMap.get(op.afterId)
        if (!anchor) return fail(op, `afterId "${op.afterId}" not found on resume`)
        if (anchor.kind === 'skills') return fail(op, 'Cannot insert a bullet into the skills section')
        return ok(op)
      }

      case 'add_entry_from_bank': {
        const bankNode = bankMap.get(op.bankId)
        if (!bankNode) return fail(op, `bankId "${op.bankId}" not found in bank`)
        if (bankNode.kind === 'bullet') return fail(op, `bankId "${op.bankId}" is a bullet, not an entry`)
        return ok(op)
      }

      case 'add_skill_from_bank': {
        if (!blocks.skills) return fail(op, 'Resume has no skills section')
        if (!Array.isArray(op.bankItems) || op.bankItems.length === 0)
          return fail(op, 'bankItems must be a non-empty array')
        const bankCategory = bank.skills.find(
          (c) => c.label.toLowerCase() === op.categoryLabel.toLowerCase(),
        )
        if (!bankCategory) return fail(op, `categoryLabel "${op.categoryLabel}" not in bank skills`)
        const bankItemSet = new Set(bankCategory.items.map((i) => i.toLowerCase()))
        const stray = op.bankItems.find((i) => !bankItemSet.has(i.toLowerCase()))
        if (stray) return fail(op, `bank item "${stray}" not present in bank category "${op.categoryLabel}"`)
        return ok(op)
      }
      case 'add_project_from_bank': {
        const bankId = `proj-bank-${op.bankKey}`
        const bankProject = bank.projects.find((p) => p.bankKey === op.bankKey || p.id === bankId)
        if (!bankProject) return fail(op, `bankKey "${op.bankKey}" not found in project bank`)
        // Don't duplicate: warn if already on the resume
        const already = blocks.projects.find((p) => p.bankKey === op.bankKey)
        if (already) return fail(op, `project "${op.bankKey}" is already on the resume`)
        return ok(op)
      }

      case 'remove_banked_project': {
        const node = blockMap.get(op.targetId)
        if (!node) return fail(op, `targetId "${op.targetId}" not found on resume`)
        if (!op.targetId.startsWith('proj-bank-')) {
          return fail(op, 'remove_banked_project only targets \\addproject{} references')
        }
        return ok(op)
      }

      default:
        return { op, valid: false, error: `unknown op type "${(op as { type?: string }).type ?? '?'}"` }
    }
  })
}

function ok(op: BlockEditOperation): BlockValidationResult {
  return { op, valid: true }
}

function fail(op: BlockEditOperation, error: string): BlockValidationResult {
  return { op, valid: false, error }
}

// ---------------------------------------------------------------------------
// Bullet text validation: enforce the \b{...} convention and reject any
// other backslash commands the LLM might smuggle in.
//
// We try to AUTO-REPAIR common LLM mistakes first (stray `{…}` braces around
// emphasized phrases, `\textbf{…}` instead of `\b{…}`, stray `\cmd{…}`) and
// only reject if the text is still invalid after repair. The op's text field
// is mutated in place when repairs succeed, so accepting the op applies the
// cleaned-up version.
// ---------------------------------------------------------------------------

function checkBulletText(
  op: BlockEditOperation & { text: string },
  text: string,
): BlockValidationResult {
  if (!text || !text.trim()) return fail(op, 'text must not be empty')

  const repaired = repairBulletText(text)
  if (repaired !== text) {
    // Mutate the op so downstream rendering uses the cleaned text.
    op.text = repaired
    text = repaired
  }

  // Walk the string, allowing only \b{...} as a backslash command. Validate
  // that braces balance and \b is never nested inside another \b.
  let i = 0
  let inBold = 0
  let braceDepth = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch === '\\') {
      // The only legal command is \b followed by '{'
      if (text.startsWith('\\b{', i)) {
        if (inBold > 0) return fail(op, 'nested \\b{...} is not allowed')
        // Walk into the bold span
        i += 3
        inBold++
        braceDepth++
        continue
      }
      // Allow escaped braces \{ \} though they're unusual in our content
      if (text[i + 1] === '{' || text[i + 1] === '}') {
        i += 2
        continue
      }
      return fail(op, `bullet text may only use \\b{...}; found "\\${text[i + 1] ?? ''}"`)
    }
    if (ch === '{') {
      // Unattached open brace — not allowed
      if (inBold === 0) return fail(op, 'stray "{" in bullet text')
      braceDepth++
    } else if (ch === '}') {
      if (braceDepth === 0) return fail(op, 'stray "}" in bullet text')
      braceDepth--
      if (inBold > 0 && braceDepth === 0) {
        inBold--
      }
    }
    i++
  }

  if (inBold > 0 || braceDepth > 0) return fail(op, 'unbalanced \\b{...} marker')

  // Empty \b{} is not useful
  if (/\\b\{\s*\}/.test(text)) return fail(op, 'empty \\b{} is not allowed')

  return ok(op)
}

/**
 * Best-effort cleanup of LLM-emitted bullet text. Idempotent. Returns the
 * (possibly unchanged) repaired string.
 *
 * Repairs, in order:
 *   1. `\textbf{X}`           → `\b{X}`              (LLM forgot our convention)
 *   2. `\cmd{X}`              → `X`                  (any other backslash command, content kept)
 *   3. Stray `{X}` braces     → `X`                  (LLM added LaTeX-style emphasis braces)
 *   4. Stray unescaped `&%$#_~^` → escaped form `\&` etc. for display safety
 *
 * `\b{X}` spans are preserved as-is.
 */
export function repairBulletText(input: string): string {
  let text = input.trim()

  // 1. Convert any \textbf{...} the LLM emitted into our \b{...} marker.
  text = replaceBracedCommand(text, /\\textbf\s*\{/g, (inner) => `\\b{${inner}}`)

  // 2. Strip any other backslash command of form \cmd{...}, keeping inner content.
  //    (Leave \b{...} alone; we just produced those.)
  text = stripUnknownCommands(text)

  // 3. Drop stray `{...}` braces that aren't part of \b{...}.
  text = dropStrayBraces(text)

  // 4. Escape stray LaTeX special chars that aren't already escaped and aren't
  //    inside a \b{...} span (we leave bold spans alone so the renderer can
  //    handle them — escaping happens at render time anyway).
  // We deliberately DON'T touch unescaped specials here; the renderer's
  // escapeLatex() does that on output. This pass is just about getting through
  // validation, not about LaTeX correctness.

  return text
}

/**
 * Walk `text` and run `transform(inner)` for every balanced `pattern{...}`
 * occurrence. `pattern` must match the command including the opening `{`.
 */
function replaceBracedCommand(
  text: string,
  pattern: RegExp,
  transform: (inner: string) => string,
): string {
  let out = ''
  let i = 0
  while (i < text.length) {
    pattern.lastIndex = i
    const m = pattern.exec(text)
    if (!m || m.index !== i) {
      out += text[i]
      i++
      continue
    }
    // m.index points to the command; m[0] ends with the opening '{'.
    const openBracePos = m.index + m[0].length - 1
    const close = findMatchingBrace(text, openBracePos)
    if (close === -1) {
      out += text[i]
      i++
      continue
    }
    const inner = text.slice(openBracePos + 1, close)
    out += transform(inner)
    i = close + 1
  }
  return out
}

/**
 * Strip any \cmd{...} that isn't \b{...}. Inner content kept. Nested commands
 * handled by recursing on the inner content.
 */
function stripUnknownCommands(text: string): string {
  return scanAndStrip(text)
}

function scanAndStrip(text: string): string {
  let out = ''
  let i = 0
  while (i < text.length) {
    if (text[i] === '\\') {
      // \b{...} — keep verbatim
      if (text.startsWith('\\b{', i)) {
        const close = findMatchingBrace(text, i + 2)
        if (close !== -1) {
          out += text.slice(i, close + 1)
          i = close + 1
          continue
        }
      }
      // Escaped specials \% \& \$ \# \_ \{ \} — keep as plain char
      if (i + 1 < text.length && '&%$#_{}'.includes(text[i + 1])) {
        out += text[i + 1]
        i += 2
        continue
      }
      // \cmd{...} or \cmd — strip the command, keep braced content if present
      const cmdMatch = /^\\([A-Za-z]+)\s*/.exec(text.slice(i))
      if (cmdMatch) {
        const afterCmd = i + cmdMatch[0].length
        if (text[afterCmd] === '{') {
          const close = findMatchingBrace(text, afterCmd)
          if (close !== -1) {
            // recurse so nested unknown commands inside also get stripped
            out += scanAndStrip(text.slice(afterCmd + 1, close))
            i = close + 1
            continue
          }
        }
        // \cmd with no braces — just drop the command
        i = afterCmd
        continue
      }
      // Bare backslash — drop it
      i++
      continue
    }
    out += text[i]
    i++
  }
  return out
}

/**
 * Remove unescaped `{...}` pairs that aren't part of a \b{...} marker.
 * Keeps inner content. Idempotent.
 */
function dropStrayBraces(text: string): string {
  let out = ''
  let i = 0
  while (i < text.length) {
    if (text.startsWith('\\b{', i)) {
      const close = findMatchingBrace(text, i + 2)
      if (close !== -1) {
        out += text.slice(i, close + 1)
        i = close + 1
        continue
      }
    }
    if (text[i] === '\\' && i + 1 < text.length && '{}'.includes(text[i + 1])) {
      // escaped brace — keep as-is so the renderer can decide
      out += text.slice(i, i + 2)
      i += 2
      continue
    }
    if (text[i] === '{') {
      const close = findMatchingBrace(text, i)
      if (close !== -1) {
        // recurse on inner so we strip nested stray braces too
        out += dropStrayBraces(text.slice(i + 1, close))
        i = close + 1
        continue
      }
      // unmatched — drop the brace
      i++
      continue
    }
    if (text[i] === '}') {
      // unmatched close — drop
      i++
      continue
    }
    out += text[i]
    i++
  }
  return out
}

function findMatchingBrace(s: string, openPos: number): number {
  if (s[openPos] !== '{') return -1
  let depth = 0
  for (let i = openPos; i < s.length; i++) {
    if (s[i] === '\\' && (s[i + 1] === '{' || s[i + 1] === '}')) {
      i++
      continue
    }
    if (s[i] === '{') depth++
    else if (s[i] === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}
