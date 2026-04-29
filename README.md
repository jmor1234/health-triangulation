# Health Triangulation

> Extract what a public health figure actually says on a topic — and triangulate it honestly against the best evidence.

**Try it free:** [health-triangulation.vercel.app](https://health-triangulation.vercel.app/) — no setup required.

A conversational tool that takes a rigorous epistemic methodology — full-context primary-source extraction paired with calibrated honest assessment — and generalizes it across any public health figure, any topic, any combination.

The unit of work is **a perspective to triangulate**, not a research question. That's what makes it different from a general health research agent.

---

## Core Use Cases

Four canonical shapes, composable in any combination:

| Mode | Example query |
|---|---|
| **Solo extraction** | *"What does Peter Attia actually say about apoB and heart disease?"* |
| **Comparison** | *"Compare Andrew Huberman and Peter Attia on saturated fat."* |
| **Triangulation against evidence** | *"Where does Ray Peat get PUFA right, and where is he overstating?"* |
| **Multi-figure + evidence** | *"Compare Peter Attia, Paul Saladino, and the evidence on LDL."* |

In every mode, the agent extracts each figure's full nuanced reasoning from primary sources, then — when asked — compares against another figure and/or triangulates against the best current evidence with calibrated honesty: neither mainstream-defending nor contrarian, including *right destination, wrong route* nuance when it applies. The verdict holds under user pushback.

For the full conceptual intent and design philosophy, see [`docs/conceptual-intent-overview.md`](docs/conceptual-intent-overview.md).

---

## The Methodology

A ~870-word intent-bearing system prompt at `app/api/chat/systemPrompt.ts` encodes the agent's identity and discipline. Three load-bearing primitives operate on every input:

| Primitive | What it means |
|---|---|
| **Faithful full-context extraction** | Reconstruct the input as the complete picture in its own logic — reasoning chains, not isolated claims. |
| **Context-aware reading** | Every input lives inside a paradigm and incentive structure. See who produced it, the comparison frame, timescale, and what's distorting it. |
| **Calibrated honest verdict** | Land where the evidence points. *Right destination, wrong route* is a real verdict shape. Verdicts hold under user pushback. |

Plus three hard rules: **first-principles biological reasoning** is the standard (not consensus from any school); **reasoning vs. retrieval** — training data is for thinking, never for citing (every citation comes from tools); **two-pass retrieval** — a figure's primary sources tell you what they *claim*, not what the evidence shows, so triangulation runs an independent evidence pass on the topic itself.

---

## Architecture

### Agentic Setup

A single primary agent — **Claude Opus 4.7** with adaptive thinking, summarized reasoning display, effort `medium` — orchestrates everything in one context window. No agent graph, no scoping pre-step. The methodology emerges from system prompt + tools + reasoning, not from architectural complexity. Reasoning summaries stream to the UI so the user sees *how* the agent reasons, not just what it concludes.

```
┌──────────────────────────────────────────────────────────────┐
│                  Primary Agent (Opus 4.7)                    │
│      Adaptive thinking · effort: medium · display: summarized │
├──────────────────┬──────────────────┬────────────────────────┤
│     search       │      read        │        depth           │
│  Exa semantic    │  Exa highlights  │  Exa contents +        │
│  + highlights    │  from URL        │  Gemini Flash extract  │
│  (~1250 chars)   │  (~10K chars)    │  (structured findings) │
└──────────────────┴──────────────────┴────────────────────────┘
```

### Why Exa Specifically

Exa is the **load-bearing retrieval substrate** for this application, not a generic search engine swapped in for SEO results. Three properties of Exa make it the right primitive:

**1. Semantic search, not keyword.** Exa finds pages by *meaning*. Queries are written in natural language describing the ideal document, not as keyword strings. This aligns directly with the methodology's discipline: "extract what a figure actually says" requires retrieving primary source content by meaning ("Peter Attia explaining apoB as causal in atherosclerosis"), not by SEO-friendly keywords ("peter attia apob heart disease"). Keyword search returns popular hits; semantic search returns *the document the agent actually wants*.

**2. Highlights, not full pages.** Exa can return highlighted excerpts of each result — the most relevant passages, not the entire page. This is the single most consequential property for an agentic system. Per the agentic principles in [`docs/other-project.md`](docs/other-project.md):

> Context is finite. Transformer attention scales O(n²). As context grows, retrieval accuracy degrades. Every design decision flows from this constraint.

By default this app pulls only highlighted excerpts into the primary agent's context (1250 chars/result for `search`, 10K chars for `read`). Full page text only enters the system through the `depth` tool, where it's processed by an isolated sub-agent (Gemini Flash) that returns structured findings — the full text never reaches the primary agent.

Per Exa's published numbers, ~500 chars of highlights ≈ 8K chars of full page at 16× fewer tokens; 4K of highlights generally outperforms 32K of full text for downstream synthesis quality. Highlights are how this app stays in the high-signal-density regime.

**3. Categories + recency.** Exa supports filtering by content type (research paper, news, personal site, pdf, people) and recency (`maxAgeHours`). The agent uses these to weight long-form considered content over fragments, primary sources over secondary write-ups, and (for fast-moving topics) recent literature over training-data-stale assertions.

The end result: the agent writes precise semantic queries, gets back high-signal excerpts directly, and synthesizes — no intermediary, no full-page pollution, no SEO noise.

### The Three Tools

| Tool | What it does | Latency |
|---|---|---|
| `search` | Exa semantic search → 3 results with highlighted excerpts (~1250 chars/url) | ~1–3s |
| `read` | Exa highlights from a specific URL via custom focus query (~10K chars) | ~100–300ms |
| `depth` | Exa full content + Gemini 3 Flash structured extraction (`insight + evidence` findings) | ~3–7s |

Full page text only enters the system through `depth`, where Gemini Flash extracts findings in isolation — the primary agent sees structured output, never raw documents.

### Caching + Context Management

Three Anthropic cache breakpoints — **system stable** (methodology prompt), **tools** (registry), **history** (advanced each step via `prepareStep`). Dynamic system content (current date) stays uncached. Typical hit rates: 96–99%, ~57–72% cost reduction.

Three context-edit tiers via `providerOptions.anthropic.contextManagement.edits`: thinking blocks preserved (`keep: 'all'` for cache stability), tool uses cleared at 100K input tokens (keep 15 most recent), full compaction at 150K. Caching handles cost; tool-clearing handles space; compaction is the safety net.

### Frontend Chat Shell

Next.js 16 + React 19. Methodology-shaped onboarding (mode-grouped starter prompts + figure chips for 12 popular health figures), real-time tool-call cards inline in the assistant message stream (queries + result domains shown as they happen), streaming markdown with editorial-cite link styling, reasoning collapsibles, auto-populated sources drawer, edit-resubmit on any prior turn, thread persistence via Dexie, dark mode, restrained accent system. Full details in [`docs/frontend-shell.md`](docs/frontend-shell.md).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Agent harness | Vercel AI SDK v6 |
| Primary model | Claude Opus 4.7 (adaptive thinking, summarized display) |
| Sub-agent | Gemini 3 Flash |
| Search | Exa (`exa-js`) — semantic search with highlights |
| Persistence | Dexie / IndexedDB |
| UI | ShadCN + Tailwind v4 + Streamdown + `next-themes` + `lucide-react` |

---

## Project Structure

```
health-triangulation/
├── app/
│   ├── api/chat/        Backend — route.ts, systemPrompt.ts, lib/, tools/ (search, read, depth)
│   ├── chat/            Routed chat shell (per-thread)
│   ├── components/      Composer, message renderer
│   └── globals.css      Theme tokens, accent system, Streamdown typography
├── components/
│   ├── ai-elements/     Reusable chat UI (conversation, message, tool-call, sources, …)
│   ├── ui/              ShadCN primitives
│   ├── app-sidebar.tsx  Thread CRUD + mode toggle
│   └── chat-view.tsx    Empty state, visibility, edit-resubmit, sources extraction
├── hooks/               use-mobile, use-persisted-chat, use-thread-persistence
├── lib/                 thread-store, message-utils, utils
└── docs/                backend-harness, frontend-shell, conceptual-intent-overview, other-project
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+ (or whatever current LTS Next 16 supports)
- **npm** (the project uses `package-lock.json`)
- API keys for Anthropic, Google AI, and Exa (see below)

### API Keys

| Service | Where | Powers |
|---|---|---|
| **Anthropic** | [console.anthropic.com](https://console.anthropic.com) | Claude Opus 4.7 — primary agent |
| **Google AI** | [ai.google.dev](https://ai.google.dev) | Gemini 3 Flash — depth extraction |
| **Exa** | [dashboard.exa.ai](https://dashboard.exa.ai) | Semantic search, highlights, full content |

Anthropic and Exa require account credit. Three-tier prompt caching keeps Opus economically viable — typical sessions hit 96–99% cache, ~60% cost reduction vs. uncached.

### Clone and Install

```bash
git clone https://github.com/<your-org>/health-triangulation.git
cd health-triangulation
npm install
```

### Environment Variables

Create a `.env.local` file at the repo root (it is gitignored):

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...
EXA_API_KEY=...

# Optional — defaults shown
EXA_RATE_LIMIT_QPS=10              # Exa dispatch rate (cushion below 15 QPS limit)
EXTRACTION_TIMEOUT_MS=25000         # Gemini depth-extraction timeout
EXTRACTION_MAX_ATTEMPTS=2           # Depth-extraction retry attempts
```

### Run Locally

```bash
npm run dev
```

The app serves at [http://localhost:3000](http://localhost:3000) and redirects to `/chat`. First load creates a fresh thread; subsequent loads land on the most recent thread.

### Other Scripts

```bash
npm run build       # Production build
npm run start       # Start production server (after build)
npm run lint        # ESLint
npx tsc --noEmit    # Type check (strict mode, no emit)
```

---

## How It Works (in 30 seconds)

Ask: *"Compare Peter Attia and Paul Saladino on LDL — and what does the evidence support?"*

The agent runs **two distinct retrieval passes**: first acquiring each figure's actual position from primary sources (long-form considered content weighted over fragments), then *independently* retrieving the underlying research on LDL — RCTs, Mendelian randomization, mechanism studies — separate from anything either figure cited or framed. It triangulates each claim against that independent evidence with calibration (confirmed / partially supported / overstated / etc., including *right destination, wrong route* nuance), and renders the verdict as analytical prose with inline `[Title](URL)` citations.

You see it happen in real time — the actual queries the agent wrote, the domains coming back, the reasoning collapsibles — because transparency is the trust mechanism.

---

## Further Reading

- [`docs/conceptual-intent-overview.md`](docs/conceptual-intent-overview.md) — Product intent, design philosophy, what success looks like
- [`docs/backend-harness.md`](docs/backend-harness.md) — Backend technical state (agent, tools, caching, context management)
- [`docs/frontend-shell.md`](docs/frontend-shell.md) — Frontend technical state (chat shell, methodology surfaces, risks)
- [`docs/other-project.md`](docs/other-project.md) — Reference foundational agent + agentic systems engineering principles

---

