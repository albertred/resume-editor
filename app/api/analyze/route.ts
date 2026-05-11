import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { AnalyzeRequest, AnalyzeResponse, JDRequirements, MatchAssessment } from '@/lib/ai/pipeline-types'
import { STAGE1_SYSTEM, stage1UserPrompt, STAGE2_SYSTEM, stage2UserPrompt } from '@/lib/ai/prompts'

const client = new OpenAI()
const MODEL = 'gpt-4o'

function parseJSON<T>(text: string, label: string): T {
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Failed to parse ${label} response as JSON: ${text.slice(0, 200)}`)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json() as AnalyzeRequest

  if (!body.jobDescription?.trim() || !body.latexSource?.trim()) {
    return NextResponse.json({ error: 'Missing jobDescription or latexSource' }, { status: 400 })
  }

  try {
    // --- Stage 1: Extract JD requirements ---
    const stage1 = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: STAGE1_SYSTEM },
        { role: 'user', content: stage1UserPrompt(body.jobDescription) },
      ],
    })

    const stage1Text = stage1.choices[0]?.message.content ?? ''
    const jdRequirements = parseJSON<JDRequirements>(stage1Text, 'Stage 1')

    // --- Stage 2: Assess match ---
    const stage2 = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: STAGE2_SYSTEM },
        { role: 'user', content: stage2UserPrompt(jdRequirements, body.latexSource) },
      ],
    })

    const stage2Text = stage2.choices[0]?.message.content ?? ''
    const matchAssessment = parseJSON<MatchAssessment>(stage2Text, 'Stage 2')

    const response: AnalyzeResponse = { jdRequirements, matchAssessment }
    return NextResponse.json(response)
  } catch (err) {
    const message = err instanceof OpenAI.APIError
      ? `OpenAI API error ${err.status}: ${err.message}`
      : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
