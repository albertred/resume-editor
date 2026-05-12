'use client'

import { useEffect, useRef } from 'react'
import { colors } from '@/lib/ui/theme'
import type { BlockValidationResult, BlockEditOperation } from '@/lib/blocks/block-edit-types'

interface AnnotationPopoverProps {
  result: BlockValidationResult
  /** Pixel position relative to the editor wrapper */
  top: number
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onClose: () => void
}

const TYPE_BADGE: Record<BlockEditOperation['type'], { bg: string; text: string; label: string }> = {
  replace_bullet:       { bg: '#fff8ee', text: '#9a6028', label: 'Replace' },
  insert_bullet:        { bg: '#eefff4', text: '#2e7d4f', label: 'Insert'  },
  delete_bullet:        { bg: '#fff0f0', text: '#c0392b', label: 'Delete'  },
  edit_skills:          { bg: '#eef4ff', text: '#2b5fa3', label: 'Skills'  },
  add_bullet_from_bank: { bg: '#eefff4', text: '#2e7d4f', label: 'Add (bank)' },
  add_entry_from_bank:  { bg: '#eefff4', text: '#2e7d4f', label: 'Add entry' },
  add_skill_from_bank:  { bg: '#eef4ff', text: '#2b5fa3', label: 'Add skills' },
  add_project_from_bank: { bg: '#eefff4', text: '#2e7d4f', label: 'Add project' },
  remove_banked_project: { bg: '#fff0f0', text: '#c0392b', label: 'Remove project' },
}

function previewText(op: BlockEditOperation): string | null {
  switch (op.type) {
    case 'replace_bullet':
    case 'insert_bullet':
      return op.text
    case 'edit_skills':
      return `${op.categoryLabel}: ${op.items.join(', ')}`
    case 'add_skill_from_bank':
      return `${op.categoryLabel}: ${op.bankItems.join(', ')}`
    case 'add_bullet_from_bank':
      return `↑ from ${op.bankId}`
    case 'add_entry_from_bank':
      return `↑ from ${op.bankId}`
    case 'add_project_from_bank':
      return `↑ \\addproject{${op.bankKey}}`
    case 'remove_banked_project':
      return `× ${op.targetId}`
    case 'delete_bullet':
      return null
  }
}

export default function AnnotationPopover({
  result,
  top,
  onAccept,
  onReject,
  onClose,
}: AnnotationPopoverProps) {
  const { op, valid, error } = result
  const badge = TYPE_BADGE[op.type]
  const preview = previewText(op)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: Math.max(4, top - 4),
        right: 8,
        width: 280,
        zIndex: 50,
        backgroundColor: colors.panelBg,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(44,26,14,0.13)',
        overflow: 'hidden',
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.headerBg }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: badge.bg, color: badge.text }}
          >
            {badge.label}
          </span>
          {!valid && (
            <span className="text-xs" style={{ color: '#c0392b' }}>Invalid</span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{ color: colors.mutedText, lineHeight: 1, fontSize: 16, padding: '0 2px' }}
          title="Close"
        >
          ×
        </button>
      </div>

      <div className="px-3 py-2.5 flex flex-col gap-2">
        <p className="text-xs leading-relaxed" style={{ color: colors.bodyText }}>
          {op.rationale}
        </p>

        {preview && (
          <pre
            className="text-xs rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap"
            style={{
              backgroundColor: colors.headerBg,
              border: `1px solid ${colors.border}`,
              color: colors.labelText,
              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
              fontSize: 10,
              maxHeight: 120,
              overflowY: 'auto',
            }}
          >
            {preview}
          </pre>
        )}

        {!valid && error && (
          <p className="text-xs" style={{ color: '#c0392b' }}>{error}</p>
        )}

        <div className="flex items-center gap-2 pt-0.5">
          <button
            onClick={() => { onAccept(op.id); onClose() }}
            disabled={!valid}
            className="text-xs font-medium rounded px-3 py-1 disabled:cursor-not-allowed"
            style={{
              backgroundColor: valid ? colors.accent : colors.border,
              color: valid ? '#fff' : colors.mutedText,
              opacity: valid ? 1 : 0.6,
            }}
          >
            Accept
          </button>
          <button
            onClick={() => { onReject(op.id); onClose() }}
            className="text-xs font-medium rounded px-3 py-1"
            style={{
              backgroundColor: colors.headerBg,
              color: colors.labelText,
              border: `1px solid ${colors.border}`,
            }}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}
