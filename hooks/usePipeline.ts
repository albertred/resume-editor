import { useState, useCallback } from 'react'
import { useEditorStore } from '@/lib/store/editor-store'
import type { AnalyzeResponse, GenerateEditsResponse } from '@/lib/ai/pipeline-types'
import type { BlockEditOperation, RawBlockOperation } from '@/lib/blocks/block-edit-types'
import { validateBlockOps } from '@/lib/blocks/block-validator'
import { parseResume } from '@/lib/latex/parser'
import { astToBlocks } from '@/lib/blocks/from-ast'

export type PipelineStage = 'idle' | 'analyzing' | 'generating' | 'validating' | 'done' | 'error'

export function usePipeline() {
  const [stage, setStage] = useState<PipelineStage>('idle')
  const [error, setError] = useState<string | null>(null)

  const {
    latexSource,
    jobDescription,
    blocks: storedBlocks,
    bank,
    setPendingOps,
    setPipelineStatus,
    setEditorialBrief,
  } = useEditorStore()

  const run = useCallback(async () => {
    setError(null)
    setStage('analyzing')
    setPipelineStatus('running')

    try {
      // Compute blocks (use stored or re-derive from source)
      const blocks = storedBlocks ?? astToBlocks(parseResume(latexSource))

      // Stage 1+2: analyze JD vs blocks
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription, blocks, bank }),
      })
      if (!analyzeRes.ok) {
        const body = await analyzeRes.json().catch(() => ({}))
        throw new Error(body.error ?? `Analyze failed (${analyzeRes.status})`)
      }
      const { jdRequirements, matchAssessment }: AnalyzeResponse = await analyzeRes.json()
      if (matchAssessment.editorialBrief?.length) {
        setEditorialBrief(matchAssessment.editorialBrief)
      }

      // Stage 3: generate edit operations
      setStage('generating')
      const generateRes = await fetch('/api/generate-edits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdRequirements, matchAssessment, blocks, bank }),
      })
      if (!generateRes.ok) {
        const body = await generateRes.json().catch(() => ({}))
        throw new Error(body.error ?? `Generate edits failed (${generateRes.status})`)
      }
      const { operations: rawOps }: GenerateEditsResponse = await generateRes.json()

      // Assign stable client-side IDs and validate
      setStage('validating')
      const ops: BlockEditOperation[] = rawOps.map(
        (raw: RawBlockOperation, i: number) =>
          ({ id: `op-${Date.now()}-${i}`, ...raw } as BlockEditOperation),
      )
      const results = validateBlockOps(ops, blocks, bank)

      setPendingOps(results)
      setPipelineStatus('done')
      setStage('done')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      setStage('error')
      setPipelineStatus('error')
    }
  }, [latexSource, jobDescription, storedBlocks, bank, setPendingOps, setPipelineStatus, setEditorialBrief])

  return { run, stage, error }
}
