import { useState, useCallback } from 'react'
import { useEditorStore } from '@/lib/store/editor-store'
import type { ASTSummary, AnalyzeResponse, GenerateEditsResponse } from '@/lib/ai/pipeline-types'
import type { EditOperation } from '@/lib/engine/edit-operation-types'
import { validateOps } from '@/lib/engine/validator'
import { parseResume } from '@/lib/latex/parser'
import type { ResumeAST } from '@/lib/latex/ast-types'

export type PipelineStage = 'idle' | 'analyzing' | 'generating' | 'validating' | 'done' | 'error'

function buildASTSummary(ast: ResumeAST): ASTSummary {
  return {
    sections: ast.sections.map((section) => ({
      title: section.title,
      entries: section.entries.flatMap((entry) => {
        if (entry.kind === 'subheading') {
          const heading: { id: string; preview: string } = {
            id: entry.id,
            preview: entry.args[0].slice(0, 80),
          }
          const items = entry.items.map((item) => ({
            id: item.id,
            preview: item.text.slice(0, 80),
          }))
          return [heading, ...items]
        }
        // skills node
        return [{ id: entry.id, preview: entry.raw.slice(0, 80) }]
      }),
    })),
  }
}

export function usePipeline() {
  const [stage, setStage] = useState<PipelineStage>('idle')
  const [error, setError] = useState<string | null>(null)

  const { latexSource, jobDescription, ast: storedAst, setPendingOps, setPipelineStatus, setEditorialBrief } = useEditorStore()

  const run = useCallback(async () => {
    setError(null)
    setStage('analyzing')
    setPipelineStatus('running')

    try {
      // Stage 1+2: analyze JD vs resume
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription, latexSource }),
      })
      if (!analyzeRes.ok) {
        const body = await analyzeRes.json().catch(() => ({}))
        throw new Error(body.error ?? `Analyze failed (${analyzeRes.status})`)
      }
      const { jdRequirements, matchAssessment }: AnalyzeResponse = await analyzeRes.json()
      if (matchAssessment.editorialBrief?.length) {
        setEditorialBrief(matchAssessment.editorialBrief)
      }

      // Build AST summary for stage 3
      setStage('generating')
      const ast = storedAst ?? parseResume(latexSource)
      const astSummary = buildASTSummary(ast)

      // Stage 3: generate edit operations
      const generateRes = await fetch('/api/generate-edits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdRequirements, matchAssessment, latexSource, astSummary }),
      })
      if (!generateRes.ok) {
        const body = await generateRes.json().catch(() => ({}))
        throw new Error(body.error ?? `Generate edits failed (${generateRes.status})`)
      }
      const { operations: rawOps }: GenerateEditsResponse = await generateRes.json()

      // Assign stable client-side IDs and validate
      setStage('validating')
      const ops: EditOperation[] = rawOps.map((raw, i) => ({
        id: `op-${Date.now()}-${i}`,
        ...raw,
      } as EditOperation))

      const currentAst = storedAst ?? parseResume(latexSource)
      const results = validateOps(ops, currentAst)

      setPendingOps(results)
      setPipelineStatus('done')
      setStage('done')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      setStage('error')
      setPipelineStatus('error')
    }
  }, [latexSource, jobDescription, storedAst, setPendingOps, setPipelineStatus, setEditorialBrief])

  return { run, stage, error }
}
