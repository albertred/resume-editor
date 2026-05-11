# Architecture & Technical Implementation

## AI-Assisted LaTeX Resume Editor

---

## 1. System Overview

The system is a browser-based, AI-assisted resume editing tool for LaTeX resumes. It provides a side-by-side interface where users load a LaTeX resume on the left and paste a job description on the right. An automated AI pipeline analyzes the job description against the resume and produces structured, reviewable edit suggestions — rendered as inline diffs with accept/reject controls.

The critical architectural constraint: **the AI never directly mutates LaTeX source**. Instead, it emits structured edit operations that a deterministic engine applies to the document. This separation keeps LaTeX output safe and predictable.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                     │
│                                                             │
│  ┌──────────────────────┐   ┌────────────────────────────┐  │
│  │   Resume Panel       │   │   Job Description Panel    │  │
│  │  ┌────────────────┐  │   │  ┌──────────────────────┐  │  │
│  │  │ LaTeX Editor   │  │   │  │ JD Input             │  │  │
│  │  └────────────────┘  │   │  └──────────────────────┘  │  │
│  │  ┌────────────────┐  │   │  ┌──────────────────────┐  │  │
│  │  │ PDF Preview    │  │   │  │ Analysis Dashboard   │  │  │
│  │  └────────────────┘  │   │  └──────────────────────┘  │  │
│  │  ┌────────────────┐  │   │  ┌──────────────────────┐  │  │
│  │  │ Diff Overlay   │  │   │  │ Chat Interface       │  │  │
│  │  └────────────────┘  │   │  └──────────────────────┘  │  │
│  └──────────────────────┘   └────────────────────────────┘  │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Edit Operation Engine (Client)            │  │
│  │  Parse AST ─► Apply Ops ─► Validate ─► Render Diff    │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │  API calls
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       Backend / API Layer                    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Analysis     │  │ Edit         │  │ Chat              │  │
│  │ Pipeline     │  │ Generation   │  │ Endpoint          │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
│         └─────────────────┴───────────────────┘             │
│                           │                                 │
│                    ┌──────▼───────┐                          │
│                    │  LLM Client  │                          │
│                    │  (OpenAI /   │                          │
│                    │  Anthropic)  │                          │
│                    └──────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Core Components

### 3.1 Resume Panel (Left Side)

**LaTeX Editor** — A code editor (e.g. CodeMirror or Monaco) with LaTeX syntax highlighting. The editor holds the canonical source of truth for the resume. Users can edit directly, and accepted AI suggestions are committed here.

**PDF Preview** — A live-rendered PDF preview compiled from the LaTeX source. Compilation can happen client-side via a WASM-based TeX engine (e.g. SwiftLaTeX, texlive.js) or server-side via a containerized `pdflatex`/`xelatex` process. The preview updates on save or on a debounced timer.

**Diff Overlay** — When the AI produces edit suggestions, the editor renders inline diffs: deletions shown as strikethrough, insertions as highlighted additions. Each diff region has accept/reject buttons. Accepting a diff commits the change to the LaTeX source; rejecting discards it.

### 3.2 Job Description Panel (Right Side)

**JD Input** — A text area where the user pastes a job description. Submitting the JD triggers the automated analysis pipeline.

**Analysis Dashboard** — Displays the structured output of the analysis pipeline: extracted key requirements (skills, experience, qualifications), a strengths/weaknesses assessment of the resume against those requirements, and a summary score or match indicator.

**Chat Interface** — A conversational interface for follow-up interaction. The user can ask the AI to refine suggestions, explain its reasoning, focus on a specific section, or regenerate edits with different priorities. The chat maintains context from the analysis and current resume state.

### 3.3 Edit Operation Engine

This is the most architecturally significant component. It sits between the AI's output and the LaTeX source, enforcing a strict contract.

**Why it exists:** LLMs are unreliable LaTeX authors. They hallucinate packages, break nesting, mangle escaping, and produce subtly invalid markup. By constraining the AI to emit *operations* rather than raw LaTeX, the system can validate and apply changes deterministically.

---

## 4. Edit Operation Model

### 4.1 Operation Schema

The AI produces a JSON array of edit operations. Each operation targets a specific location in the resume and describes a semantic change.

```json
{
  "operations": [
    {
      "id": "op_001",
      "type": "replace",
      "target": {
        "section": "experience",
        "entry": 0,
        "field": "bullets",
        "index": 2
      },
      "original": "Managed a team of engineers",
      "replacement": "Led a cross-functional team of 8 engineers delivering microservices migration",
      "rationale": "Quantifies team size and specifies the technical initiative to match JD emphasis on microservices."
    },
    {
      "type": "insert",
      "target": {
        "section": "skills",
        "field": "items"
      },
      "value": "Kubernetes",
      "rationale": "JD lists Kubernetes as a required skill; not currently present in resume."
    },
    {
      "type": "delete",
      "target": {
        "section": "experience",
        "entry": 2,
        "field": "bullets",
        "index": 0
      },
      "original": "Organized company picnic and team-building events",
      "rationale": "Not relevant to the target role; removing to make room for more relevant content."
    },
    {
      "type": "reorder",
      "target": {
        "section": "skills",
        "field": "items"
      },
      "order": ["Kubernetes", "Docker", "AWS", "Python", "Go", "SQL"],
      "rationale": "Reordered to lead with infrastructure skills matching JD priority."
    }
  ]
}
```

### 4.2 Supported Operation Types

| Operation | Description | Fields |
|-----------|-------------|--------|
| `replace` | Swap existing text content for new content | `target`, `original`, `replacement`, `rationale` |
| `insert`  | Add new content at a position | `target`, `value`, `position?`, `rationale` |
| `delete`  | Remove existing content | `target`, `original`, `rationale` |
| `reorder` | Change the ordering of list items | `target`, `order`, `rationale` |

### 4.3 Target Resolution

The `target` object uses a semantic path rather than character offsets or line numbers. This makes operations robust against minor formatting changes and allows the engine to resolve targets against a parsed AST of the LaTeX document rather than doing fragile string matching.

The resolution chain: `section` → `entry` (positional index within section) → `field` (e.g. `title`, `company`, `bullets`, `items`) → `index` (position within a list field).

---

## 5. LaTeX Processing Pipeline

### 5.1 Parsing

The system needs a lightweight LaTeX parser — not a full TeX engine, but enough to identify the resume's structural elements. The parser produces an AST representing sections, entries, and fields.

```
LaTeX Source
    │
    ▼
┌──────────────────┐
│  Tokenizer        │  (regex-based, handles \commands, {groups}, % comments)
└────────┬─────────┘
         ▼
┌──────────────────┐
│  Section Parser   │  (identifies \section, \subsection, custom resume commands)
└────────┬─────────┘
         ▼
┌──────────────────┐
│  Entry Parser     │  (extracts structured entries: job titles, dates, bullets)
└────────┬─────────┘
         ▼
   Resume AST
```

The parser is template-aware. For MVP, it supports a single known resume template (e.g. Jake's Resume or a custom template), with hardcoded knowledge of that template's command structure. Template support can be generalized later by defining template descriptors.

### 5.2 Operation Application

Once the AST is built and edit operations are received:

1. **Validate** — Each operation's `target` is resolved against the AST. If the target doesn't exist or the `original` text doesn't match, the operation is flagged as invalid and skipped (with a warning to the user).
2. **Apply** — Valid operations are applied to the AST. The engine modifies AST nodes, not raw text. This prevents operations from breaking LaTeX structure.
3. **Serialize** — The modified AST is serialized back to LaTeX source. The serializer preserves formatting, whitespace, and comments from the original source as much as possible.
4. **Diff** — The original and modified LaTeX sources are diffed (line-level or token-level) to produce the visual diff overlay for the editor.

### 5.3 LaTeX Safety Guarantees

The engine enforces several invariants: special characters in AI-generated text are escaped (`&`, `%`, `$`, `#`, `_`, `{`, `}`), nesting is preserved (every opened `{` is closed), commands from the original template are not modified or removed, and the output compiles without errors (verified by a trial compilation before presenting to the user).

---

## 6. AI Analysis Pipeline

When a user submits a job description, a multi-step pipeline runs automatically without requiring manual prompting.

### 6.1 Pipeline Stages

```
JD Text + Resume AST
        │
        ▼
┌─────────────────────┐
│ Stage 1: Extract     │  Parse the JD into structured requirements
│ Requirements         │  (skills, experience, qualifications, soft skills)
└────────┬────────────┘
         ▼
┌─────────────────────┐
│ Stage 2: Assess      │  Compare requirements against resume content
│ Match                │  (strengths, gaps, partial matches)
└────────┬────────────┘
         ▼
┌─────────────────────┐
│ Stage 3: Generate    │  Produce structured edit operations
│ Edits                │  (replace, insert, delete, reorder)
└────────┬────────────┘
         ▼
┌─────────────────────┐
│ Stage 4: Validate    │  Check operations against AST,
│ & Present            │  render diffs, show analysis
└─────────────────────┘
```

### 6.2 Prompt Design

Each stage uses a focused prompt with a specific output schema. This is more reliable than a single monolithic prompt because it reduces the cognitive load on the LLM per step, makes each step independently testable and cacheable, allows retry/fallback at the stage level, and produces cleaner structured output.

**Stage 1** receives the raw JD text and outputs a JSON object of categorized requirements. **Stage 2** receives the requirements and a serialized view of the resume AST and outputs a match assessment. **Stage 3** receives the assessment and the resume AST and outputs the edit operations array. **Stage 4** is deterministic (no LLM call) — it validates and applies the operations.

### 6.3 Truthfulness Constraint

The system prompt for edit generation includes a hard constraint: **do not fabricate experience, skills, or qualifications**. The AI may rephrase, reorder, emphasize, or de-emphasize existing content, but it must not invent claims. Inserts are limited to skills the user demonstrably has (inferred from existing resume content) or formatting/structural improvements. The rationale field in each operation must justify the change in terms of existing content.

---

## 7. Chat System

### 7.1 Context Window Management

The chat interface maintains a conversation that includes as context the current resume AST (serialized), the JD text, the analysis results, the current set of pending edit operations and their accept/reject status, and prior chat messages.

This context is assembled into the system/user messages on each turn. To manage token limits, the resume AST and JD can be summarized after the initial analysis, and older chat messages can be truncated.

### 7.2 Chat Actions

The chat is not just conversational — it can trigger structured actions. The LLM's response from the chat endpoint can include new edit operations (same schema as the pipeline), requests to regenerate analysis with different parameters, and explanations or reasoning about existing suggestions. The client parses the response, extracts any embedded operations, and routes them to the edit engine.

---

## 8. Technology Stack

### 8.1 Frontend

| Concern | Technology | Rationale |
|---------|-----------|-----------|
| Framework | React / Next.js | Component model fits panel-based layout |
| LaTeX Editor | CodeMirror 6 | Extensible, good LaTeX mode, diff gutter support |
| PDF Preview | pdf.js or WASM TeX engine | Client-side rendering avoids server round-trips |
| State Management | Zustand or Redux | Centralized state for resume AST, operations, chat |
| Diff Rendering | Custom CodeMirror extension | Inline decorations for accept/reject UI |
| Styling | Tailwind CSS | Rapid UI iteration |

### 8.2 Backend

| Concern | Technology | Rationale |
|---------|-----------|-----------|
| API Framework | Node.js (Express/Fastify) or Python (FastAPI) | Lightweight, async-friendly |
| LLM Client | OpenAI SDK / Anthropic SDK | Structured output support (JSON mode / tool use) |
| LaTeX Compilation | Dockerized texlive | Isolated, reproducible builds |
| Session/State | Redis or in-memory | Pipeline state, chat history |
| Auth (if needed) | JWT / OAuth | Stateless auth for API |

### 8.3 LaTeX Processing

| Concern | Approach |
|---------|----------|
| Parsing | Custom parser, template-aware, outputs AST |
| Serialization | AST → LaTeX, whitespace-preserving |
| Compilation | Server-side `pdflatex`/`xelatex` in Docker, or client-side WASM |
| Validation | Trial compile before presenting edits |

---

## 9. Data Flow: End-to-End

```
1. User loads LaTeX resume
   └─► Parser produces Resume AST
       └─► Editor displays source, Preview renders PDF

2. User pastes Job Description
   └─► API call: Stage 1 (extract requirements)
       └─► API call: Stage 2 (assess match)
           └─► API call: Stage 3 (generate edit operations)
               └─► Client: Stage 4 (validate operations against AST)
                   └─► Diff overlay rendered in editor
                       Analysis dashboard populated

3. User reviews diffs
   ├─► Accept: operation applied to AST → LaTeX updated → PDF re-rendered
   ├─► Reject: operation discarded
   └─► Chat: user requests changes → new operations generated → cycle repeats

4. User exports final LaTeX source
```

---

## 10. Key Design Decisions

**Structured operations over raw edits.** The single most important architectural decision. It trades flexibility (the AI can only make changes the operation schema supports) for reliability (every change is validated and reversible). This is the right trade for a tool where a broken LaTeX file is a catastrophic failure.

**Multi-stage pipeline over single prompt.** Breaking analysis into stages costs more in latency and API calls, but produces dramatically better structured output. Each stage can be independently tested, cached, and retried.

**Template-aware parsing over general LaTeX parsing.** General LaTeX parsing is an unsolved problem (TeX is Turing-complete). By scoping to known templates, the parser can be simple, fast, and correct. This limits the MVP to supported templates but avoids a class of intractable bugs.

**Client-side operation engine.** Operations are validated and applied in the browser. This keeps the feedback loop fast (no server round-trip for accept/reject) and allows offline operation after the initial analysis.

**Truthfulness as a hard constraint.** The system is designed to tailor, not fabricate. This is enforced at the prompt level and can be reinforced by a validation step that compares generated content against the original resume's semantic content.

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM produces invalid operation targets | Edit fails silently or applies to wrong location | Strict AST-based validation; fuzzy matching with confirmation |
| LaTeX output doesn't compile | User sees broken preview | Trial compilation before presenting edits; rollback on failure |
| AI fabricates experience | User submits dishonest resume | Truthfulness constraint in prompts; optional content-diff audit |
| Token limits exceeded | Truncated context degrades quality | Summarize resume/JD for chat turns; paginate long conversations |
| Latency of multi-stage pipeline | Poor UX on slow connections | Stream intermediate results; show stage progress indicators |
| Template parser breaks on edge cases | AST is wrong, operations misfire | Comprehensive test suite per template; graceful degradation to raw edit mode |

---

## 12. Future Considerations

These are out of scope for MVP but inform the architecture so it doesn't paint itself into a corner.

**Multi-template support.** The parser can be generalized by introducing template descriptor files that define command mappings and section structures. The operation schema and engine remain unchanged.

**Collaborative editing.** If multiple users or sessions edit the same resume, the operation model naturally supports operational transformation or CRDT-based merging.

**Version history.** Since every change is a discrete operation with a rationale, the system can maintain a full edit history with undo/redo at the operation level rather than the character level.

**Custom AI providers.** The LLM client layer is abstracted behind a simple interface (send prompt, receive structured response). Swapping providers or running local models requires no architectural changes.

**Resume scoring and tracking.** The match assessment data can be stored over time, enabling users to track how their resume improves across iterations and target roles.

Features I may want
- A way to store a master resume or master list of all job experiences, skills, projects, hackathons, etc. 
- A way to store version with job that i applied to 
- update transformation mechanism to json method
- return bullet points with optional bolding, nothing else
- autmoatic LLM call to save certain resume versions as "good" versions that can be used for future transformations (e.g. if i have a version of my resume that is good for SDE roles, i can mark it as such and then in the future ask the LLM to transform that version for a new SDE role, rather than starting from scratch or from a version tailored to PM roles)
