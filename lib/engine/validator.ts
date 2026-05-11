import type { ResumeAST } from '../latex/ast-types'
import { buildNodeMap } from '../latex/ast-types'
import type { EditOperation, ValidationResult } from './edit-operation-types'

export function validateOps(ops: EditOperation[], ast: ResumeAST): ValidationResult[] {
  const nodeMap = buildNodeMap(ast)

  return ops.map((op): ValidationResult => {
    switch (op.type) {
      case 'replace': {
        if (!nodeMap.has(op.targetId))
          return { op, valid: false, error: `Target "${op.targetId}" not found in resume` }
        if (!op.newContent.trim())
          return { op, valid: false, error: 'newContent must not be empty' }
        return { op, valid: true }
      }
      case 'insert': {
        if (!nodeMap.has(op.afterId))
          return { op, valid: false, error: `afterId "${op.afterId}" not found in resume` }
        // insert only makes sense after an item or subheading (not a skills block)
        const node = nodeMap.get(op.afterId)!
        if (node.kind === 'skills')
          return { op, valid: false, error: 'Cannot insert after a skills block' }
        if (!op.newContent.trim())
          return { op, valid: false, error: 'newContent must not be empty' }
        return { op, valid: true }
      }
      case 'delete': {
        if (!nodeMap.has(op.targetId))
          return { op, valid: false, error: `Target "${op.targetId}" not found in resume` }
        return { op, valid: true }
      }
    }
  })
}
