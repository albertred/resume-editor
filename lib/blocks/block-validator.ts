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
// ---------------------------------------------------------------------------

function checkBulletText(op: BlockEditOperation, text: string): BlockValidationResult {
  if (!text || !text.trim()) return fail(op, 'text must not be empty')

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
