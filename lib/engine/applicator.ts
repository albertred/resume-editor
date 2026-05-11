import { parseResume } from '../latex/parser'
import { buildNodeMap } from '../latex/ast-types'
import type { ResumeAST, SubheadingNode, ItemNode } from '../latex/ast-types'
import type { EditOperation } from './edit-operation-types'

export interface ApplyResult {
  newSource: string
  newAst: ResumeAST
  error?: string
}

// ---------------------------------------------------------------------------
// Apply a single validated operation to the LaTeX source string.
// Uses startIndex/endIndex offsets from the AST nodes — no regex on source.
// Re-parses after applying to return a fresh AST.
// ---------------------------------------------------------------------------
export function applyOp(source: string, ast: ResumeAST, op: EditOperation): ApplyResult {
  const nodeMap = buildNodeMap(ast)

  try {
    let newSource: string

    switch (op.type) {
      case 'replace': {
        const node = nodeMap.get(op.targetId)
        if (!node) return { newSource: source, newAst: ast, error: `Node "${op.targetId}" not found` }
        newSource = source.slice(0, node.startIndex) + op.newContent + source.slice(node.endIndex)
        break
      }

      case 'delete': {
        const node = nodeMap.get(op.targetId)
        if (!node) return { newSource: source, newAst: ast, error: `Node "${op.targetId}" not found` }
        // For items, also eat the leading newline so we don't leave a blank line
        const sliceStart = eatLeadingNewline(source, node.startIndex)
        newSource = source.slice(0, sliceStart) + source.slice(node.endIndex)
        break
      }

      case 'insert': {
        const anchorNode = nodeMap.get(op.afterId)
        if (!anchorNode) return { newSource: source, newAst: ast, error: `afterId "${op.afterId}" not found` }

        // Determine insertion point:
        // - After a subheading: insert before \resumeItemListEnd
        // - After an item: insert right after item.endIndex
        let insertAt: number
        if (anchorNode.kind === 'subheading') {
          const sub = anchorNode as SubheadingNode
          // Find \resumeItemListEnd within this subheading's range
          const listEndStr = '\\resumeItemListEnd'
          const listEnd = source.indexOf(listEndStr, sub.startIndex)
          if (listEnd !== -1 && listEnd < sub.endIndex) {
            insertAt = listEnd  // insert before \resumeItemListEnd
          } else {
            insertAt = sub.endIndex
          }
        } else {
          insertAt = (anchorNode as ItemNode).endIndex
        }

        const insertion = '\n        ' + op.newContent
        newSource = source.slice(0, insertAt) + insertion + source.slice(insertAt)
        break
      }
    }

    const newAst = parseResume(newSource)
    return { newSource, newAst }
  } catch (err) {
    return { newSource: source, newAst: ast, error: String(err) }
  }
}

// ---------------------------------------------------------------------------
// If the character just before `pos` is a newline (or whitespace+newline),
// return a position that excludes that leading whitespace, so deleted nodes
// don't leave orphan blank lines.
// ---------------------------------------------------------------------------
function eatLeadingNewline(source: string, pos: number): number {
  let i = pos - 1
  // eat spaces/tabs on the same line
  while (i >= 0 && (source[i] === ' ' || source[i] === '\t')) i--
  // eat one newline
  if (i >= 0 && source[i] === '\n') return i
  return pos
}
