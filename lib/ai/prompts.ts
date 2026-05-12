import type { JDRequirements, MatchAssessment } from './pipeline-types'
import type { ResumeBlocks } from '../blocks/block-types'
import type { BankBlocks } from '../blocks/bank-types'

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

export const STAGE2_SYSTEM = `You are an expert resume reviewer for a candidate using the Jake's Resume LaTeX template. You will be given structured job requirements, the candidate's current resume as JSON content blocks, and a CONTENT BANK of additional experiences, projects, and skills the candidate has done but is not currently showing.

Assess how well the resume matches the requirements, treating the bank as additional context (things the candidate could surface but currently isn't).

Return a JSON object with exactly this shape:
{
  "matchScore": number,
  "strengths": string[],
  "gaps": [
    { "description": string, "severity": "high" | "medium" | "low", "suggestedAction": string }
  ],
  "editorialBrief": string[]
}

Rules:
- matchScore: integer 0-100 representing overall fit (consider both on-resume and bank content)
- strengths: 3-5 specific things the resume does well for this role
- gaps: specific mismatches, each with a concrete suggestedAction. If a gap can be closed by surfacing a bank item, say so explicitly.
- severity "high": required skill/experience clearly missing from both resume and bank
- severity "medium": present but undersold or partially matching, OR present in bank but not on the resume
- severity "low": nice-to-have missing or minor framing issue
- editorialBrief: 3-5 plain-English bullets describing the most impactful edits, e.g. "Pull the Kubernetes bullet from your bank into the Acme experience". Be specific and action-oriented.
- Return ONLY the JSON object, no markdown, no explanation`

export function stage2UserPrompt(
  requirements: JDRequirements,
  blocks: ResumeBlocks,
  bank: BankBlocks,
): string {
  return `Job requirements:
${JSON.stringify(requirements, null, 2)}

Resume (content blocks):
${JSON.stringify(blocks, null, 2)}

Content bank (additional experiences/projects/skills available to surface):
${JSON.stringify(bank, null, 2)}`
}

// ---------------------------------------------------------------------------
// Stage 3 — Generate structured edit operations
// ---------------------------------------------------------------------------

export function stage3System(blocks: ResumeBlocks, bank: BankBlocks): string {
  const resumeIds = collectResumeIds(blocks)
  const bankIds = collectBankIds(bank)

  return `You are an expert resume editor working on a Jake's Resume LaTeX template. You will be given a job assessment, the resume as JSON content blocks, and a content bank. You MUST NOT output LaTeX. You output JSON edit operations only; deterministic code on our side renders the result back to LaTeX.

# Style — Jake's Resume conventions

- One bullet ≈ one line. Dense, single-page. Trim adjectives.
- Every bullet starts with a strong past-tense action verb (Built, Shipped, Led, Drove, Owned, Reduced, Designed, Migrated, …). No "Responsible for".
- Quantify whenever the source content supports it (users, latency, revenue, % delta, team size). Do NOT invent numbers.
- Skills section is organized by existing category labels (Languages, Frameworks, Tools, …). Do not introduce new categories.

# Inline bold marker

Bullets are plain strings with ONE markup convention: \`\\b{...}\` wraps a span that will be rendered bold. EVERY edited bullet and EVERY new bullet MUST contain 1–2 \`\\b{...}\` spans wrapping the most JD-relevant keywords (specific technologies, scale numbers, scopes). Examples:

  "Built \\b{real-time analytics} dashboard in \\b{React}, serving 200+ daily users"
  "Reduced p99 latency from 800ms to \\b{120ms} via composite indexing"

Rules for \`\\b{...}\`:
- Braces must balance. No nesting (\`\\b{\\b{...}}\` is rejected).
- Do not bold whole sentences — only keywords.
- No other backslash commands are allowed inside bullet text. Only \\b is permitted.

# Operations

Return a JSON object with exactly this shape:
{
  "operations": [ { "type": "...", ...op fields..., "rationale": string } ]
}

## Allowed op types

1. \`replace_bullet\`     — { type, targetId, text, rationale }
   Replace an existing on-resume bullet's text.
2. \`insert_bullet\`      — { type, afterId, text, rationale }
   Insert a brand-new bullet. \`afterId\` may be a bullet ID (insert after it) or an entry ID (append to end of that entry).
3. \`delete_bullet\`      — { type, targetId, rationale }
   Remove an existing on-resume bullet (e.g. a low-signal bullet that's crowding out more relevant content).
4. \`edit_skills\`        — { type, categoryLabel, items: string[], rationale }
   Replace the full item list of an existing skills category. Use to reorder or trim, not to introduce new items the candidate doesn't have.
5. \`add_bullet_from_bank\` — { type, bankId, afterId, rationale }
   Surface a bullet that exists in the BANK but isn't on the resume yet.
6. \`add_entry_from_bank\`  — { type, bankId, position?: number, rationale }
   Add a full experience or project from the bank to the resume.
7. \`add_skill_from_bank\`  — { type, categoryLabel, bankItems: string[], rationale }
   Append items from the bank's matching category into the resume's skills.
8. \`add_project_from_bank\` — { type, bankKey, position?: number, rationale }
   Add a project from the project bank by key. Renders as \\addproject{<bankKey>}. Use this for project entries from the BANK PROJECTS list below.
9. \`remove_banked_project\` — { type, targetId, rationale }
   Remove a \\addproject{} reference currently on the resume. targetId must be a banked project ID (starts with "proj-bank-").

## Hard rules

1. \`targetId\` and \`afterId\` MUST come from RESUME IDs below.
2. \`bankId\` and items in \`bankItems\` MUST come from BANK IDs / BANK SKILLS below; \`bankKey\` for \`add_project_from_bank\` MUST come from BANK PROJECTS.
3. Never mix namespaces: a bank ID cannot be a target (except for \`remove_banked_project\` whose targetId is a "proj-bank-..." ID currently on the resume).
4. READ-ONLY BULLETS: any bullet appearing in the resume JSON with \`"readOnly": true\` MUST NOT be a \`targetId\` for \`replace_bullet\` or \`delete_bullet\`. It contains hand-formatted LaTeX (links, icons, colors) that we can't safely rewrite. You may still insert new bullets into the same entry.
5. TRUTHFULNESS: only rephrase, quantify, or surface things that already exist in the resume or the bank. Do NOT invent technologies, numbers, employers, or accomplishments.
6. Maximum 8 operations total. Pick the highest-leverage edits.
7. Return ONLY the JSON object, no markdown, no commentary.

# RESUME IDs (valid for targetId / afterId)

${resumeIds}

# BANK IDs (valid for bankId)

${bankIds}

# BANK skills (valid categoryLabel + bankItems for add_skill_from_bank)

${formatBankSkills(bank)}`
}

export function stage3UserPrompt(
  requirements: JDRequirements,
  assessment: MatchAssessment,
  blocks: ResumeBlocks,
  bank: BankBlocks,
): string {
  return `Job requirements:
${JSON.stringify(requirements, null, 2)}

Match assessment:
${JSON.stringify(assessment, null, 2)}

Resume (content blocks):
${JSON.stringify(blocks, null, 2)}

Content bank:
${JSON.stringify(bank, null, 2)}`
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function collectResumeIds(blocks: ResumeBlocks): string {
  const lines: string[] = []
  const pushEntry = (
    label: string,
    entry: { id: string; bullets: { id: string; text: string; readOnly?: boolean }[] },
    summary: string,
  ) => {
    lines.push(`  ${entry.id}  (${label}) — ${summary}`)
    for (const b of entry.bullets) {
      const tag = b.readOnly ? '  [READ-ONLY]' : ''
      lines.push(`    ${b.id}${tag}: ${truncate(stripBoldMarkers(b.text), 80)}`)
    }
  }
  blocks.experience.forEach((e) =>
    pushEntry('experience', e, `${e.role} @ ${e.company}, ${e.dates}`),
  )
  blocks.education.forEach((e) =>
    pushEntry('education', e, `${e.degree} — ${e.school}`),
  )
  for (const p of blocks.projects) {
    if (p.source === 'banked') {
      lines.push(`  ${p.id}  (project, banked → ${p.bankKey}) — ${p.name}`)
    } else {
      pushEntry('project', p, `${p.name} (${p.stack})`)
    }
  }
  if (blocks.skills) lines.push(`  skills-0  (skills) — categories: ${blocks.skills.categories.map((c) => c.label).join(', ')}`)
  return lines.join('\n')
}

function collectBankIds(bank: BankBlocks): string {
  const lines: string[] = []
  for (const e of bank.experience) {
    lines.push(`  ${e.id}  (experience) — ${e.role} @ ${e.company}, ${e.dates}`)
    for (const b of e.bullets) {
      const tag = b.readOnly ? '  [READ-ONLY]' : ''
      lines.push(`    ${b.id}${tag}: ${truncate(stripBoldMarkers(b.text), 80)}`)
    }
  }
  for (const p of bank.projects) {
    const keyTag = p.bankKey ? ` key=${p.bankKey}` : ''
    lines.push(`  ${p.id}  (project${keyTag}) — ${p.name} (${p.stack})`)
    for (const b of p.bullets) {
      const tag = b.readOnly ? '  [READ-ONLY]' : ''
      lines.push(`    ${b.id}${tag}: ${truncate(stripBoldMarkers(b.text), 80)}`)
    }
  }
  return lines.join('\n') || '  (bank is empty)'
}

function formatBankSkills(bank: BankBlocks): string {
  if (bank.skills.length === 0) return '  (no bank skills)'
  return bank.skills.map((c) => `  ${c.label}: ${c.items.join(', ')}`).join('\n')
}

function stripBoldMarkers(text: string): string {
  return text.replace(/\\b\{([^}]*)\}/g, '$1')
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…'
}
