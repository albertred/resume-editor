'use client'

import { useEditorStore } from '@/lib/store/editor-store'
import { PanelLabel, colors } from '@/lib/ui/theme'
import { usePipeline } from '@/hooks/usePipeline'
import PipelineStatusBar from '@/components/pipeline/PipelineStatusBar'

export default function JobDescriptionPanel() {
  const jobDescription = useEditorStore((s) => s.jobDescription)
  const setJobDescription = useEditorStore((s) => s.setJobDescription)
  const latexSource = useEditorStore((s) => s.latexSource)
  const pendingOps = useEditorStore((s) => s.pendingOps)

  const editorialBrief = useEditorStore((s) => s.editorialBrief)
  const { run, stage, error } = usePipeline()

  const isRunning = stage === 'analyzing' || stage === 'generating' || stage === 'validating'
  const canRun = !isRunning && jobDescription.trim().length > 0 && latexSource.trim().length > 0

  const validCount = pendingOps.filter((r) => r.valid).length
  const totalCount = pendingOps.length

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: colors.panelBg }}>
      <PanelLabel>Job Description</PanelLabel>

      <textarea
        className="flex-1 resize-none text-sm focus:outline-none leading-relaxed"
        style={{
          color: colors.bodyText,
          padding: '16px 20px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          lineHeight: '1.65',
        }}
        placeholder="Paste the job description here…"
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      />

      {/* Editorial brief — shown after pipeline runs */}
      {editorialBrief.length > 0 && (
        <div
          className="flex-shrink-0 px-4 py-3 flex flex-col gap-1.5"
          style={{ borderTop: `1px solid ${colors.border}`, backgroundColor: colors.headerBg }}
        >
          <p style={{ fontSize: 10, fontWeight: 600, color: colors.labelText, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
            Edit Strategy
          </p>
          {editorialBrief.map((line, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span style={{ color: colors.accent, fontSize: 10, marginTop: 2, flexShrink: 0 }}>▸</span>
              <p style={{ fontSize: 12, color: colors.bodyText, lineHeight: 1.5 }}>{line}</p>
            </div>
          ))}
        </div>
      )}

      <PipelineStatusBar
        stage={stage}
        error={error}
        validCount={validCount}
        totalCount={totalCount}
      />

      <div
        className="flex-shrink-0 px-4 py-3"
        style={{ borderTop: `1px solid ${colors.border}`, backgroundColor: colors.headerBg }}
      >
        <button
          onClick={run}
          disabled={!canRun}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium rounded-lg"
          style={{
            height: 36,
            backgroundColor: colors.accent,
            color: '#fff',
            opacity: canRun ? 1 : 0.45,
            letterSpacing: '-0.01em',
            cursor: canRun ? 'pointer' : 'not-allowed',
          }}
        >
          {isRunning ? (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
                <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {stage === 'analyzing' ? 'Analyzing\u2026' : stage === 'generating' ? 'Generating\u2026' : 'Validating\u2026'}
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 7l1.5 1.5L9.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Analyze &amp; Suggest Edits
            </>
          )}
        </button>
      </div>
    </div>
  )
}
