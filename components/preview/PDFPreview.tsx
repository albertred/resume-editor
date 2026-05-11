'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditorStore } from '@/lib/store/editor-store'
import { colors } from '@/lib/ui/theme'

type Status = 'idle' | 'compiling' | 'ready' | 'error'

export default function PDFPreview() {
  const latexSource = useEditorStore((s) => s.latexSource)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const prevUrlRef = useRef<string | null>(null)

  const compile = useCallback(async (source: string) => {
    setStatus('compiling')
    setErrorMsg('')
    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latex: source }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      // Revoke previous blob URL to avoid memory leak
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
      prevUrlRef.current = url

      setPdfUrl(url)
      setStatus('ready')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }, [])

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
    }
  }, [])

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: colors.panelBg }}>
      {/* Toolbar */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4"
        style={{ height: 36, backgroundColor: colors.headerBg, borderBottom: `1px solid ${colors.border}` }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: colors.labelText }}>
          Preview
        </span>
        <button
          onClick={() => compile(latexSource)}
          disabled={status === 'compiling' || !latexSource}
          className="flex items-center gap-1.5 px-3 rounded text-xs font-medium transition-opacity"
          style={{
            height: 24,
            backgroundColor: colors.accent,
            color: '#fff',
            opacity: status === 'compiling' || !latexSource ? 0.45 : 1,
            cursor: status === 'compiling' ? 'wait' : 'pointer',
          }}
        >
          {status === 'compiling' ? (
            <>
              <Spinner /> Compiling…
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M2 5.5h7M6 2.5l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Compile
            </>
          )}
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 relative">
        {status === 'idle' && (
          <Placeholder>Click Compile to render a preview.</Placeholder>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 overflow-auto p-4">
            <div
              className="rounded-lg p-4 text-xs font-mono leading-relaxed"
              style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}
            >
              <div className="font-semibold mb-1" style={{ fontFamily: 'sans-serif' }}>Compilation error</div>
              {errorMsg}
            </div>
          </div>
        )}
        {status === 'compiling' && (
          <Placeholder>
            <Spinner size={18} />
            <span className="mt-2" style={{ color: colors.mutedText, fontSize: 13 }}>Compiling…</span>
          </Placeholder>
        )}
        {status === 'ready' && pdfUrl && (
          <iframe
            src={pdfUrl}
            className="absolute inset-0 w-full h-full"
            style={{ border: 'none' }}
            title="PDF Preview"
          />
        )}
      </div>
    </div>
  )
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1" style={{ color: colors.mutedText, fontSize: 12 }}>
      {children}
    </div>
  )
}

function Spinner({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 11 11" fill="none"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="16" strokeDashoffset="6" strokeLinecap="round"/>
    </svg>
  )
}
