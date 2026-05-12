import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { GenerateEditsRequest, GenerateEditsResponse } from '@/lib/ai/pipeline-types'
import type { RawBlockOperation } from '@/lib/blocks/block-edit-types'
import { stage3System, stage3UserPrompt } from '@/lib/ai/prompts'

const client = new OpenAI()
const MODEL = 'gpt-4o'

export async function POST(req: NextRequest) {
  const body = await req.json() as GenerateEditsRequest

  if (!body.jdRequirements || !body.matchAssessment || !body.blocks || !body.bank) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const stage3 = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: stage3System(body.blocks, body.bank) },
        { role: 'user', content: stage3UserPrompt(body.jdRequirements, body.matchAssessment, body.blocks, body.bank) },
      ],
    })

    const text = stage3.choices[0]?.message.content ?? ''

    let parsed: { operations: RawBlockOperation[] }
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Error(`Stage 3 response was not valid JSON: ${text.slice(0, 300)}`)
    }

    if (!Array.isArray(parsed.operations)) {
      throw new Error('Stage 3 response missing "operations" array')
    }

    const response: GenerateEditsResponse = { operations: parsed.operations }
    return NextResponse.json(response)
  } catch (err) {
    const message = err instanceof OpenAI.APIError
      ? `OpenAI API error ${err.status}: ${err.message}`
      : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
