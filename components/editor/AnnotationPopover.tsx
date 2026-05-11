'use client'

import { useEffect, useRef } from 'react'
import { colors } from '@/lib/ui/theme'
import type { ValidationResult } from '@/lib/engine/edit-operation-types'

interface AnnotationPopoverProps {
  result: ValidationResult
  /** Pixel position relative to the editor wrapper */
  top: number
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onClose: () => void
}

const TYPE_COLORS = {
  replace: { bg: '#fff8ee', text: '#9a6028', label: 'Replace' },
  insert:  { bg: '#eefff4', text: '#2e7d4f', label: 'Insert'  },
  delete:  { bg: '#fff0f0', text: '#c0392b', label: 'Delete'  },
}

export default function AnnotationPopover({
  result,
  top,
  onAccept,
  onReject,
  onClose,
}: AnnotationPopoverProps) {
  const { op, valid, error } = result
  const badge = TYPE_COLORS[op.type]
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  // Close on Escape
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
      {/* Header */}
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

      {/* Body */}
      <div className="px-3 py-2.5 flex flex-col gap-2">
        {/* Rationale */}
        <p className="text-xs leading-relaxed" style={{ color: colors.bodyText }}>
          {op.rationale}
        </p>

        {/* New content preview */}
        {'newContent' in op && op.newContent && (
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
            {op.newContent}
          </pre>
        )}

        {/* Validation error */}
        {!valid && error && (
          <p className="text-xs" style={{ color: '#c0392b' }}>{error}</p>
        )}

        {/* Actions */}
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
