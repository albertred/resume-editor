# MVP Implementation Plan: AI-Assisted LaTeX Resume Editor

**Deferred from MVP:** PDF preview, chat interface, multiple templates, auth/persistence, reorder operations, undo/redo.

---

## Project Structure

```
resume-editor/
├── app/
│   ├── page.tsx                        # Main editor page
│   └── api/
│       ├── analyze/route.ts            # Stage 1+2: JD extraction + match assessment
│       └── generate-edits/route.ts     # Stage 3: generate edit operations
├── components/
│   ├── editor/
│   │   ├── LaTeXEditor.tsx             # CodeMirror 6 wrapper
│   │   └── EditOperationList.tsx       # Pending ops with accept/reject
│   ├── jd/
│   │   └── JobDescriptionPanel.tsx
│   └── layout/
│       └── SplitPane.tsx
├── lib/
│   ├── latex/
│   │   ├── ast-types.ts
│   │   ├── parser.ts                   # Template-aware parser (highest risk)
│   │   └── serializer.ts
│   ├── engine/
│   │   ├── edit-operation-types.ts
│   │   ├── validator.ts
│   │   └── applicator.ts
│   ├── ai/
│   │   ├── prompts.ts
│   │   └── pipeline-types.ts
│   └── store/
│       └── editor-store.ts             # Zustand store
├── hooks/
│   ├── usePipeline.ts
│   └── useEditOperations.ts
└── templates/
    └── resume-template.tex             # Single supported template
```

---

## Phase 1 — Static UI Shell

Bootstrap Next.js + Tailwind + CodeMirror 6 + Zustand. Render the split-pane layout with the LaTeX editor pre-loaded from the bundled template. The "Analyze" button exists but does nothing yet.

### Tasks

1. Initialize Next.js 14 (App Router) with TypeScript and Tailwind CSS
2. Install dependencies: `codemirror`, `@codemirror/lang-latex`, `zustand`, `@anthropic-ai/sdk`
3. Create `SplitPane.tsx` — two-column flex layout, 50/50 split
4. Create `LaTeXEditor.tsx` — CodeMirror 6 wrapper with `value`/`onChange` props
5. Create `JobDescriptionPanel.tsx` — textarea + disabled "Analyze & Suggest Edits" button
6. Seed `editor-store.ts` with initial state shape (no logic yet):
   ```ts
   latexSource: string
   jobDescription: string
   pipelineStatus: 'idle' | 'running' | 'done' | 'error'
   pendingOps: EditOperation[]
   ```
7. Add `templates/resume-template.tex` — a Jake's Resume-style template with consistent `\resumeSubheading`, `\resumeItem` macros; load it into the store on mount

**Exit criteria:** App loads, LaTeX visible in editor, JD textarea visible, button renders but does nothing.

---

## Phase 2 — LaTeX Parser + Edit Operation Engine

This is the highest-risk phase. Build and validate the engine before any AI is involved.

### Tasks

**2.1 Define `ast-types.ts`**

```ts
interface ResumeAST {
  preamble: string
  header: HeaderNode
  sections: SectionNode[]
  parseError?: string
}

interface SectionNode {
  title: string
  type: 'experience' | 'education' | 'skills' | 'projects'
  entries: EntryNode[]
}

interface EntryNode {
  id: string           // stable positional ID, e.g. "exp-0", "edu-1"
  raw: string          // original LaTeX substring
  startIndex: number   // byte offset in source string
  endIndex: number
}
```

**2.2 Write `parser.ts`**
- Regex + bracket-counting; hardcoded to the template's macro names
- Parse sections by `\section{...}` boundaries
- Split entries on `\resumeSubheading` / `\resumeItem` macros
- Assign stable IDs by position: `exp-0`, `exp-1`, `edu-0`, etc.
- Return `{ parseError }` on failure rather than throwing
- Write unit tests against the bundled template — critical since all ops reference these IDs

**2.3 Define `edit-operation-types.ts`**

MVP supports three operation types (no `reorder`):

```ts
type EditOperation =
  | { id: string; type: 'replace'; targetId: string; newContent: string; rationale: string }
  | { id: string; type: 'insert'; afterId: string; newContent: string; rationale: string }
  | { id: string; type: 'delete'; targetId: string; rationale: string }
```

**2.4 Write `validator.ts`**
- Input: `EditOperation[]` + `ResumeAST`
- Output: `ValidationResult[]` with `{ op, valid: boolean, error?: string }`
- Checks: `targetId` exists in AST, `newContent` non-empty for replace/insert
- Invalid ops surface as errors in the UI rather than being silently dropped

**2.5 Write `applicator.ts`**
- Input: `latexSource: string`, `ResumeAST`, single `EditOperation`
- Output: new `latexSource: string`
- Strategy: splice on `startIndex`/`endIndex` from `EntryNode` for replace/delete; splice after `endIndex` of `afterId` for insert
- Re-parse after each op to get a fresh AST (simpler than in-place mutation for MVP)

**2.6 Wire into Zustand store**
- Add `acceptOp(opId)` — calls applicator, updates `latexSource`, removes op from `pendingOps`
- Add `rejectOp(opId)` — removes op from `pendingOps` without applying

**Exit criteria:** Hard-coded test op (e.g. replace `exp-0`) runs through validator → applicator → editor updates. Engine works before AI is involved.

---

## Phase 3 — AI Pipeline Backend

With the engine working and operation types defined, write prompts grounded in the real schema.

### Tasks

**3.1 Design prompts in `prompts.ts`**

- **Stage 1** — input: raw JD text; output: `{ requiredSkills[], preferredSkills[], roleLevel, keyResponsibilities[] }`
- **Stage 2** — input: Stage 1 output + resume LaTeX; output: `{ matchScore, gaps: { description, severity, suggestedAction }[], strengths[] }`
- **Stage 3** — input: Stage 1+2 output + resume LaTeX + `ASTSummary`; output: `EditOperation[]`
  - System prompt must: include the full list of valid `targetId` values, cap ops at 10, enforce the truthfulness constraint (rephrase/reorder only — no fabrication)

**3.2 Create `/api/analyze/route.ts`** (Stages 1 + 2)
- POST `{ jobDescription: string, latexSource: string }`
- Runs Stage 1 then Stage 2 sequentially with the Anthropic SDK
- Returns `{ jdRequirements, matchAssessment }`
- Returns `{ error: string }` with status 500 on API failure

**3.3 Create `/api/generate-edits/route.ts`** (Stage 3)
- POST `{ jdRequirements, matchAssessment, latexSource, astSummary }`
- `astSummary` is a compact client-side serialization of the AST:
  ```ts
  { sections: { title: string, entries: { id: string, preview: string }[] }[] }
  ```
  where `preview` is the first 80 chars of each entry (gives LLM context for the IDs)
- Uses Anthropic tool use or JSON mode to enforce `EditOperation[]` output
- Returns `{ operations: EditOperation[] }`

**Exit criteria:** Both routes return valid JSON matching the operation schema via curl or a test button.

---

## Phase 4 — Wire Everything Together

Pure integration — requires all previous phases to be stable.

### Tasks

**4.1 Create `usePipeline.ts`**
- Sequences: call `/api/analyze` → call `/api/generate-edits` → parse AST from current `latexSource` → validate ops → dispatch valid ops to `pendingOps` in store
- Exposes `{ run, status, error }`
- Progresses `pipelineStatus`: `idle` → `analyzing` → `generating` → `validating` → `done` / `error`

**4.2 Create `PipelineStatusBar.tsx`**
- Thin bar above editor showing current stage
- States: hidden when idle, "Analyzing job description...", "Generating suggestions...", "Ready — N suggestions to review", error message

**4.3 Create `EditOperationList.tsx`** (MVP diff UI)
- Scrollable list of pending ops, each showing:
  - Operation type badge (Replace / Insert / Delete)
  - `rationale` string
  - Old vs. new content side-by-side
  - Accept / Reject buttons
- "Accept All" button at top with count ("3 of 7 remaining")
- Note: true CodeMirror inline decoration overlay is deferred; this list is the MVP diff UI

**4.4 Update `LaTeXEditor.tsx`**
- Use CodeMirror `Decoration` API to add a yellow left-border gutter mark on lines with pending ops (simpler than full text decoration)

**4.5 Update `JobDescriptionPanel.tsx`**
- Wire "Analyze & Suggest Edits" button to `usePipeline.run()`
- Disable while `pipelineStatus === 'running'`

**Exit criteria (smoke test):**
1. Paste a real software engineering job description
2. Click "Analyze & Suggest Edits"
3. Status bar progresses through stages
4. 5–10 edit operations appear in the list
5. Accept one replace op → editor content updates
6. Reject one op → it disappears from list
7. Accept all remaining → editor shows updated resume

---

## Dependency Order

```
Phase 1 (UI Shell)
    └── Phase 2 (Parser + Engine)
            ├── Phase 3 (AI Backend)      ← can start once operation types are defined (mid-Phase 2)
            └── Phase 4 (Integration)     ← requires Phase 2 engine + Phase 3 routes
```

The only parallelism opportunity: once `edit-operation-types.ts` is finalized in Phase 2, Phase 3 prompt engineering can begin in parallel with completing the applicator.

---

## Key Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| LLM emits invalid `targetId`s | Pass full `ASTSummary` with all valid IDs in Stage 3 prompt; validator catches invalid IDs and surfaces them as errors rather than crashing |
| Parser breaks on template edge cases | Parser is tested against the single controlled template; returns structured error so UI can show "Could not parse resume" gracefully |
| API latency feels broken | `PipelineStatusBar` shows granular per-stage progress; two separate routes make Stage 1+2 latency visible before Stage 3 begins |
| CodeMirror diff overlay complexity | Deferred; `EditOperationList` with old/new side-by-side is the MVP diff UI |

---

## Critical Files

- [lib/latex/parser.ts](lib/latex/parser.ts) — Highest risk; all edit operations depend on correct AST + stable IDs. Must be built and tested before AI integration.
- [lib/engine/applicator.ts](lib/engine/applicator.ts) — Core mutation logic; correctness here determines whether accepted edits produce valid LaTeX.
- [app/api/generate-edits/route.ts](app/api/generate-edits/route.ts) — Stage 3 prompt engineering, including how `ASTSummary` is injected, determines whether the LLM produces usable `targetId` references.
- [lib/store/editor-store.ts](lib/store/editor-store.ts) — Integration seam between all components; its shape and actions determine how UI, engine, and pipeline hook communicate.
- [hooks/usePipeline.ts](hooks/usePipeline.ts) — Orchestration layer; most Phase 4 integration bugs will surface here.

---

## Post-MVP Backlog

1. **PDF preview** — add `/api/compile` route running `pdflatex`/Tectonic in a container
2. **Chat interface** — `messages[]` in Zustand, chat panel component, `/api/chat` route with conversation history + current resume state
3. **Multiple templates** — generalize `parser.ts` with a `TemplateDefinition` config; add template selector UI
4. **Reorder operations** — requires section-level node movement in AST; significantly more complex applicator logic
5. **Persistence** — localStorage as a quick win; full DB (Supabase) for user accounts
6. **Streaming** — switch API routes to `ReadableStream`; update `usePipeline` to handle SSE
7. **Undo/redo** — CodeMirror has built-in editor history; Zustand op history is a separate concern
