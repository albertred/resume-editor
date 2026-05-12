'use client'

import { useRef, useState } from 'react'
import { useEditorStore } from '@/lib/store/editor-store'
import { sourceHasCommentedAlternates } from '@/lib/blocks/import-from-comments'
import { applyBlockOp } from '@/lib/blocks/block-applicator'
import { blocksToLatex } from '@/lib/blocks/to-latex'
import { parseResume } from '@/lib/latex/parser'
import { astToBlocks } from '@/lib/blocks/from-ast'
import { colors } from '@/lib/ui/theme'

interface BankPanelProps {
  open: boolean
  onClose: () => void
}

export default function BankPanel({ open, onClose }: BankPanelProps) {
  const bank = useEditorStore((s) => s.bank)
  const blocks = useEditorStore((s) => s.blocks)
  const latexSource = useEditorStore((s) => s.latexSource)
  const ast = useEditorStore((s) => s.ast)
  const importAlternates = useEditorStore((s) => s.importAlternates)
  const importProjectsTexSource = useEditorStore((s) => s.importProjectsTexSource)
  const setLatexSource = useEditorStore((s) => s.setLatexSource)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)

  const hasAlternates = sourceHasCommentedAlternates(latexSource)

  function handleExtractAlternates() {
    const { experience, projects } = importAlternates()
    setStatus(`Imported ${experience} experience + ${projects} projects from comments.`)
  }

  function handlePickProjectsTex() { fileInputRef.current?.click() }

  function handleProjectsTexFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result
      if (typeof text !== 'string') return
      const n = importProjectsTexSource(text)
      setStatus(`Imported ${n} project${n === 1 ? '' : 's'} from projects.tex.`)
    }
    reader.readAsText(f)
    e.target.value = ''
  }

  function applyOpAndPush(opBuilder: () => Parameters<typeof applyBlockOp>[2]) {
    if (!blocks || !ast) return
    const op = opBuilder()
    const { newBlocks, error } = applyBlockOp(blocks, bank, op)
    if (error) { setStatus(`Failed: ${error}`); return }
    const newSource = blocksToLatex(newBlocks, latexSource, ast)
    setLatexSource(newSource)
    setStatus('Added to resume.')
  }

  function handleAddExperience(bankId: string) {
    applyOpAndPush(() => ({
      id: `bank-${Date.now()}`,
      type: 'add_entry_from_bank',
      bankId,
      rationale: 'User added from bank',
    }))
  }

  function handleAddProject(bankKey: string) {
    applyOpAndPush(() => ({
      id: `bank-${Date.now()}`,
      type: 'add_project_from_bank',
      bankKey,
      rationale: 'User added from bank',
    }))
  }

  function handleRemoveProject(targetId: string) {
    applyOpAndPush(() => ({
      id: `bank-${Date.now()}`,
      type: 'remove_banked_project',
      targetId,
      rationale: 'User removed from resume',
    }))
  }

  if (!open) return null

  const onResumeBankedProjectIds = new Set(
    (blocks?.projects ?? []).filter((p) => p.source === 'banked').map((p) => p.bankKey ?? p.id),
  )

  return (
    <div
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, zIndex: 100,
        backgroundColor: colors.panelBg, borderLeft: `1px solid ${colors.border}`,
        boxShadow: '-4px 0 16px rgba(44,26,14,0.13)', display: 'flex', flexDirection: 'column',
      }}
    >
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.headerBg }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: colors.labelText, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Content bank
        </span>
        <button onClick={onClose} style={{ color: colors.mutedText, fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3" style={{ color: colors.bodyText, fontSize: 12 }}>
        {/* Importers */}
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={handleExtractAlternates}
            disabled={!hasAlternates}
            className="text-xs font-medium rounded px-3 py-1.5 text-left"
            style={{
              backgroundColor: hasAlternates ? colors.accent : colors.border,
              color: hasAlternates ? '#fff' : colors.mutedText,
              opacity: hasAlternates ? 1 : 0.6,
            }}
          >
            {hasAlternates ? 'Extract commented alternates → bank' : 'No commented alternates detected'}
          </button>
          <input ref={fileInputRef} type="file" accept=".tex,.txt" className="hidden" onChange={handleProjectsTexFile} />
          <button
            onClick={handlePickProjectsTex}
            className="text-xs font-medium rounded px-3 py-1.5 text-left"
            style={{ backgroundColor: colors.headerBg, color: colors.labelText, border: `1px solid ${colors.border}` }}
          >
            Import projects.tex…
          </button>
          {status && <div style={{ fontSize: 11, color: colors.mutedText, paddingTop: 4 }}>{status}</div>}
        </div>

        {/* Experience */}
        <Section title="Experience">
          {bank.experience.length === 0 && <Empty />}
          {bank.experience.map((e) => (
            <Row
              key={e.id}
              title={e.role || '(no role)'}
              subtitle={`${e.company}${e.dates ? ' · ' + e.dates : ''}`}
              action="Add to resume"
              onAction={() => handleAddExperience(e.id)}
            />
          ))}
        </Section>

        {/* Projects */}
        <Section title="Projects">
          {bank.projects.length === 0 && <Empty />}
          {bank.projects.map((p) => {
            const onResume = p.bankKey ? onResumeBankedProjectIds.has(p.bankKey) : false
            return (
              <Row
                key={p.id}
                title={p.name || '(no name)'}
                subtitle={p.stack}
                action={onResume ? 'Remove' : (p.bankKey ? 'Add' : 'Add as inline')}
                onAction={() => {
                  if (onResume && p.bankKey) handleRemoveProject(`proj-bank-${p.bankKey}`)
                  else if (p.bankKey) handleAddProject(p.bankKey)
                  else handleAddExperience(p.id)   // fall back: treat as add_entry_from_bank for non-keyed
                }}
                muted={onResume}
              />
            )
          })}
        </Section>

        {/* Skills */}
        <Section title="Skills (bank pool)">
          {bank.skills.length === 0 && <Empty />}
          {bank.skills.map((c) => (
            <div key={c.label} style={{ padding: '6px 0', borderBottom: `1px solid ${colors.border}` }}>
              <div style={{ fontWeight: 600, color: colors.labelText }}>{c.label}</div>
              <div style={{ color: colors.mutedText, fontSize: 11 }}>{c.items.join(', ')}</div>
            </div>
          ))}
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: colors.labelText, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Row({
  title, subtitle, action, onAction, muted = false,
}: {
  title: string; subtitle?: string; action: string; onAction: () => void; muted?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 0', borderBottom: `1px solid ${colors.border}`, opacity: muted ? 0.6 : 1,
      }}
    >
      <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
        <div style={{ fontWeight: 600, color: colors.labelText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {subtitle && <div style={{ color: colors.mutedText, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>}
      </div>
      <button
        onClick={onAction}
        className="text-xs font-medium rounded px-2 py-0.5 flex-shrink-0"
        style={{ backgroundColor: colors.accent, color: '#fff' }}
      >
        {action}
      </button>
    </div>
  )
}

function Empty() {
  return <div style={{ color: colors.mutedText, fontStyle: 'italic', padding: '6px 0' }}>Empty.</div>
}
