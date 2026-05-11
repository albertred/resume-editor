'use client'

import { useEditorStore } from '@/lib/store/editor-store'
import { colors } from '@/lib/ui/theme'

export default function EditOperationList() {
  const pendingOps = useEditorStore((s) => s.pendingOps)
  const rejectOp = useEditorStore((s) => s.rejectOp)
  const acceptOp = useEditorStore((s) => s.acceptOp)

  const validOps = pendingOps.filter((r) => r.valid)

  return (
    <div
      className="flex-shrink-0 flex items-center justify-between px-4 gap-3"
      style={{
        height: 34,
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.headerBg,
        color: colors.mutedText,
        fontSize: 12,
      }}
    >
      {pendingOps.length === 0 ? (
        <span style={{ color: colors.mutedText }}>
          No suggestions — paste a job description to get started
        </span>
      ) : (
        <>
          <span style={{ color: colors.labelText }}>
            <span style={{ fontWeight: 600, color: colors.accent }}>{validOps.length}</span>
            {' '}suggestion{validOps.length !== 1 ? 's' : ''} — click the colored dots in the gutter to review
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => validOps.forEach((r) => acceptOp(r.op.id))}
              className="text-xs font-medium rounded px-2 py-0.5"
              style={{ backgroundColor: colors.accent, color: '#fff' }}
            >
              Accept all
            </button>
            <button
              onClick={() => pendingOps.forEach((r) => rejectOp(r.op.id))}
              className="text-xs rounded px-2 py-0.5"
              style={{ border: `1px solid ${colors.border}`, color: colors.labelText }}
            >
              Dismiss all
            </button>
          </div>
        </>
      )}
    </div>
  )
}
