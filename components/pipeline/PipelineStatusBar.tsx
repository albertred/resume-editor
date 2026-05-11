'use client'

import { colors } from '@/lib/ui/theme'
import type { PipelineStage } from '@/hooks/usePipeline'

interface Props {
  stage: PipelineStage
  error: string | null
  validCount: number
  totalCount: number
}

const STAGE_LABEL: Record<PipelineStage, string> = {
  idle: '',
  analyzing: 'Analyzing job description…',
  generating: 'Generating suggestions…',
  validating: 'Validating edits…',
  done: '',
  error: '',
}

export default function PipelineStatusBar({ stage, error, validCount, totalCount }: Props) {
  if (stage === 'idle') return null

  if (stage === 'error') {
    return (
      <div
        className="flex items-center gap-2 px-4 text-xs"
        style={{
          height: 32,
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: '#fff5f5',
          color: '#c0392b',
          flexShrink: 0,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M6 3.5v3M6 8h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        {error ?? 'Pipeline error'}
      </div>
    )
  }

  if (stage === 'done') {
    const invalid = totalCount - validCount
    return (
      <div
        className="flex items-center gap-2 px-4 text-xs"
        style={{
          height: 32,
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.headerBg,
          color: colors.mutedText,
          flexShrink: 0,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke={colors.accent} strokeWidth="1.3"/>
          <path d="M3.5 6l1.8 1.8L8.5 4" stroke={colors.accent} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ color: colors.bodyText }}>
          {validCount} suggestion{validCount !== 1 ? 's' : ''} ready
        </span>
        {invalid > 0 && <span style={{ color: colors.mutedText }}>· {invalid} skipped (invalid)</span>}
      </div>
    )
  }

  // Running states: analyzing / generating / validating
  return (
    <div
      className="flex items-center gap-2 px-4 text-xs"
      style={{
        height: 32,
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.headerBg,
        color: colors.mutedText,
        flexShrink: 0,
      }}
    >
      <SpinnerIcon />
      {STAGE_LABEL[stage]}
    </div>
  )
}

function SpinnerIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <circle cx="6" cy="6" r="4.5" stroke={colors.border} strokeWidth="1.5"/>
      <path d="M6 1.5A4.5 4.5 0 0 1 10.5 6" stroke={colors.accent} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
