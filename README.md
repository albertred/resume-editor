# Resume Editor

An AI-assisted LaTeX resume editor. Paste a job description; get reviewable, structured edits applied to your resume — never blind LaTeX rewrites.

## What it does

Side-by-side workspace: LaTeX resume on the left, job description on the right. An AI pipeline analyzes the JD against the resume and emits **structured edit operations** (`replace`, `insert`, `delete`, `reorder`) targeted at semantic locations (e.g. `experience[0].bullets[2]`). A deterministic engine validates and applies them to the LaTeX AST, then renders inline diffs with per-edit accept/reject controls.

The AI never mutates LaTeX directly. This is the core constraint — see [spec.md](spec.md) for the rationale.

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS
- Zustand for state
- CodeMirror 6 for the LaTeX editor
- OpenAI SDK for the AI pipeline

## Getting started

```bash
npm install
export OPENAI_API_KEY=sk-...
npm run dev
```

Open http://localhost:3000.

## Layout

- [app/](app/) — routes and API endpoints ([analyze](app/api/analyze/), [generate-edits](app/api/generate-edits/), [compile](app/api/compile/))
- [components/](components/) — UI: [editor/](components/editor/), [preview/](components/preview/), [jd/](components/jd/), [pipeline/](components/pipeline/), [layout/](components/layout/)
- [lib/engine/](lib/engine/) — edit-operation engine: [edit-operation-types.ts](lib/engine/edit-operation-types.ts), [validator.ts](lib/engine/validator.ts), [applicator.ts](lib/engine/applicator.ts)
- [lib/ai/](lib/ai/) — [prompts.ts](lib/ai/prompts.ts), [pipeline-types.ts](lib/ai/pipeline-types.ts)
- [lib/latex/](lib/latex/) — LaTeX parsing/serialization
- [lib/store/](lib/store/) — Zustand stores
- [templates/resume-template.tex](templates/resume-template.tex) — starter template

## How an edit flows

1. User pastes a JD → `/api/analyze` extracts requirements and scores the resume.
2. `/api/generate-edits` returns a JSON array of edit operations with rationales.
3. Engine resolves each `target` against the parsed LaTeX AST, validates `original` text matches, and applies valid ops to the AST.
4. Modified AST is serialized back to LaTeX and diffed against the original.
5. User accepts or rejects each diff; accepted edits commit to the source.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm start` — run the built app

## Docs

- [spec.md](spec.md) — architecture and the edit-operation contract
- [implementation.md](implementation.md) — implementation notes
