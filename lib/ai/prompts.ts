import type { JDRequirements, MatchAssessment, ASTSummary } from './pipeline-types'

// ---------------------------------------------------------------------------
// Stage 1 — Extract structured requirements from a job description
// ---------------------------------------------------------------------------

export const STAGE1_SYSTEM = `You are an expert technical recruiter. Extract structured requirements from the job description provided.

Return a JSON object with exactly this shape:
{
  "requiredSkills": string[],
  "preferredSkills": string[],
  "roleLevel": string,
  "keyResponsibilities": string[],
  "companyContext": string
}

Rules:
- requiredSkills: skills explicitly marked as required or clearly essential
- preferredSkills: skills marked as "nice to have", "preferred", or "bonus"
- roleLevel: one of "Entry-level", "Mid-level", "Senior", "Staff", "Principal", "Lead", or "Manager"
- keyResponsibilities: top 4-6 responsibilities, each a short phrase
- companyContext: one sentence about the company/team if mentioned, otherwise empty string
- Return ONLY the JSON object, no markdown, no explanation`

export function stage1UserPrompt(jobDescription: string): string {
  return `Job description:\n\n${jobDescription}`
}

// ---------------------------------------------------------------------------
// Stage 2 — Assess resume match against extracted requirements
// ---------------------------------------------------------------------------

export const STAGE2_SYSTEM = `You are an expert resume reviewer. You will be given structured job requirements and a LaTeX resume. Assess how well the resume matches the requirements.

Return a JSON object with exactly this shape:
{
  "matchScore": number,
  "strengths": string[],
  "gaps": [
    {
      "description": string,
      "severity": "high" | "medium" | "low",
      "suggestedAction": string
    }
  ],
  "editorialBrief": string[]
}

Rules:
- matchScore: integer 0-100 representing overall fit
- strengths: 3-5 specific things the resume does well for this role
- gaps: specific mismatches between resume and JD, each with a concrete suggestedAction
- severity "high": required skill/experience clearly missing
- severity "medium": present but undersold or partially matching
- severity "low": nice-to-have missing or minor framing issue
- editorialBrief: 3-5 plain-English bullets describing the most impactful edits you will make, e.g. "Emphasize your React/Next.js experience more prominently in the internship bullets". Be specific and action-oriented.
- Return ONLY the JSON object, no markdown, no explanation`

export function stage2UserPrompt(requirements: JDRequirements, latexSource: string): string {
  return `Job requirements:
${JSON.stringify(requirements, null, 2)}

Resume (LaTeX source):
${latexSource}`
}

// ---------------------------------------------------------------------------
// Stage 3 — Generate structured edit operations
// ---------------------------------------------------------------------------

export function stage3System(astSummary: ASTSummary): string {
  // Build the valid ID list to inject into the prompt
  const idList = astSummary.sections.flatMap((s) =>
    s.entries.map((e) => `  ${e.id}: "${e.preview}"`)
  ).join('\n')

  return `You are an expert resume editor. You will be given a job assessment and a LaTeX resume. Generate specific edit operations to better tailor the resume for the role.

VALID NODE IDs (you may ONLY use these as targetId or afterId):
${idList}

Return a JSON object with exactly this shape:
{
  "operations": [
    {
      "type": "replace" | "insert" | "delete",
      "targetId": string,   // for replace and delete — must be a valid ID from the list above
      "afterId": string,    // for insert only — must be a valid ID from the list above
      "newContent": string, // for replace and insert — valid LaTeX string
      "rationale": string   // one sentence explaining why
    }
  ]
}

STRICT RULES:
1. ONLY use IDs from the valid list above. Any other ID will be rejected.
2. For "replace" and "delete": include "targetId", omit "afterId"
3. For "insert": include "afterId" and "newContent" starting with \\resumeItem{...}, omit "targetId"
4. "newContent" for replace on an item node must be a full \\resumeItem{...} macro
5. "newContent" for replace on a subheading node must be a full \\resumeSubheading{}{}{}{} block
6. Maximum 8 operations total
7. TRUTHFULNESS: you may rephrase, reframe, quantify, or reorder existing content. You MUST NOT invent experience, skills, or qualifications not present in the resume. Every claim must be inferable from the existing resume content.
8. Return ONLY the JSON object, no markdown, no explanation`
}

export function stage3UserPrompt(
  requirements: JDRequirements,
  assessment: MatchAssessment,
  latexSource: string,
): string {
  return `Job requirements:
${JSON.stringify(requirements, null, 2)}

Match assessment:
${JSON.stringify(assessment, null, 2)}

Resume (LaTeX source):
${latexSource}`
}
