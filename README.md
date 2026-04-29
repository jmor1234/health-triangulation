# Health Triangulation

> Extract what a public health figure actually says on a topic — and triangulate it honestly against the best evidence.

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

## What Makes It Different

A general research agent answers *"what does the evidence say about X?"* — and dozens of tools do that.

This app does something only it does:

- **Figure-driven, not query-driven.** The canonical input is a *figure-on-topic*, not a generic research question.
- **Two-pass retrieval discipline.** A figure's primary sources tell you what they *claim*. They are not — and cannot be — evidence about whether the claim is true. Triangulation requires a *second, independent retrieval act* on the underlying research, separate from anything the figure wrote, cited, or framed.
- **Calibrated honest verdict that holds under pressure.** Six-tier honesty scale. The verdict doesn't soften when the user pushes back, doesn't harden to seem authoritative, doesn't abandon "the evidence is mixed" because someone wants a cleaner answer.
- **Reasoning engine, not a database.** Training data is reasoning capacity — for interpreting and integrating what's retrieved. It is *not* a source of evidence. Every citation, study, quote, and specific empirical claim comes only from the agent's tools, never from memory.
- **Same calibration for every subject.** Mainstream cardiologist, alternative practitioner, longevity clinic, public figure, the user's own belief — same standard. *The discipline does not change because the subject is in the room.*

---

## The Methodology

The application's behavior is encoded in a ~870-word system prompt that lives at `app/api/chat/systemPrompt.ts`. It is intent-bearing, not prescriptive — it gives the agent identity and discipline, not a rules list.

Three load-bearing primitives operate on every input:

| Primitive | What it means |
|---|---|
| **Faithful full-context extraction** | Reconstruct the input as the complete picture in its own logic. Reasoning chains, not isolated claims. Connections to adjacent positions. Evolution over time when relevant. |
| **Context-aware reading** | Every input lives inside a paradigm and incentive structure. See who produced it, what comparison it's embedded in, what timescale and endpoints, what's commercially or paradigmatically distorting it. |
| **Calibrated honest verdict** | Land where the evidence actually points. Right destination, wrong route is a real verdict shape. Verdicts hold under chat pressure. |

Plus several disciplines:

- **First-principles biological reasoning** is the standard against which findings and frameworks are tested — not the consensus of any school, mainstream or alternative.
- **Reading evidence at face value isn't enough.** The comparison a study makes determines what question it can answer. Acute and chronic are different phenomena. Surrogate markers can diverge from functional outcomes. Compound names often subsume heterogeneous molecules with different effects.
- **Honest "I don't know."** When evidence is thin, when a figure hasn't said much, when sources contradict — say so. Methodology integrity is the product; sycophancy would destroy it.

For the full conceptual intent, see [`docs/conceptual-intent-overview.md`](docs/conceptual-intent-overview.md).

---

## Architecture

### Agentic Setup

A single primary agent — **Claude Opus 4.7** with adaptive thinking, summarized reasoning display, and effort `medium` — orchestrates everything in a single context window. No agent graph, no separate scoping pre-step. The methodology emerges from the system prompt + tools + reasoning, not from architectural complexity.

**Why this shape:**
- **Single context, atomic loop.** One stream, one cache, one accumulating history. Simpler to debug; faster to iterate on the methodology.
- **Adaptive thinking with summarized display.** The agent decides whether to think between tool calls; reasoning summaries stream to the UI so the user can see *how* the agent reasons, not just what it concludes (transparency = trust).
- **`effort: 'medium'`** — calibrated for chat speed while still giving the model space for multi-step research.

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

Three tools, not more — minimum viable for the methodology:

| Tool | What it does | Latency | Notes |
|---|---|---|---|
| `search` | Exa semantic search → 3 results with highlighted excerpts (~1250 chars/url) | ~1–3s | Parallel calls for different search angles |
| `read` | Exa `getContents` with highlights focused by a custom query (~10K chars from a single URL) | ~100–300ms | Default "go deeper" step; keeps the agent in direct contact with the source |
| `depth` | Phase 1: Exa `getContents` (full text). Phase 2: Gemini 3 Flash → structured findings (`insight + evidence` pairs) via `generateObject` | ~3–7s | Full text only enters the system here, in isolation |

Reasoning between tool calls is handled natively by Opus 4.7's adaptive thinking. No dedicated think tool. No agent loops or graphs.

### Three-Tier Anthropic Prompt Caching

Three cache breakpoints within Anthropic's 4-breakpoint limit:

1. **System stable** — methodology system prompt (changes rarely)
2. **Tools** — breakpoint on the last tool in the registry; Anthropic caches the entire tools section above it
3. **History** — `prepareStep` strips prior non-system breakpoints each step and places a fresh one on the last message, advancing the cache boundary as the conversation grows

System dynamic (current date) is intentionally **uncached** so it doesn't poison the stable cache. Typical hit rates: 96–99%, 57–72% cost reduction on Anthropic API calls.

### Context Management

Three Anthropic-managed edit tiers (`providerOptions.anthropic.contextManagement.edits`):

- `clear_thinking_20251015` — `keep: 'all'` (preserves thinking blocks; protects cache stability)
- `clear_tool_uses_20250919` — trigger at 100K input tokens; keep 15 most recent tool uses; clear at least 15K
- `compact_20260112` — full compaction at 150K input tokens (safety net)

Caching and context management coexist: caching handles cost (96–99% hit below 100K), tool-use clearing handles space, compaction is the safety net.

### Frontend Chat Shell

The chat surface (Next.js 16 App Router + React 19) provides:

- **Methodology-shaped onboarding.** Empty state heading + subtitle + mode-grouped starter prompts (`Extract` / `Compare` / `Triangulate`) + figure chips for 12 popular health figures. Click a chip → composer prefills with `"What does {figure} actually say about "`.
- **Real-time tool transparency.** Each tool call renders inline as a card in the assistant message stream — spinner + actual query during retrieval, check + result domains/excerpt count when complete. The user sees the agent's research process happen, not just hears about it.
- **Streaming markdown** with editorial-cite link styling (italic + thicker underline so citations read as deliberate references).
- **Reasoning collapsible** — auto-opens during streaming, auto-closes 1s after the last reasoning part settles.
- **Sources drawer** — auto-populated from inline citations, deduped via canonical URL.
- **Edit-resubmit** on user messages — truncate and re-stream from any prior turn.
- **Thread persistence** via Dexie / IndexedDB (`health-triangulation-threads`), with sidebar CRUD.
- **Dark mode** via `next-themes` (system default).
- **Restrained accent system** — neutrals + a single brand color used at exactly five surfaces.

For the full frontend documentation, see [`docs/frontend-shell.md`](docs/frontend-shell.md).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Agent harness | Vercel AI SDK v6 (`streamText`, `generateObject`, tool system, `createUIMessageStream`) |
| Primary model | Claude Opus 4.7 — adaptive thinking, summarized display, effort medium |
| Sub-agent | Gemini 3 Flash (`gemini-3-flash-preview`) — single-document structured output |
| Search | Exa (`exa-js`) — semantic search with highlights |
| Validation | Zod (tool input schemas, structured outputs) |
| Streaming markdown | Streamdown (`mode="streaming"` while live) |
| Persistence | Dexie / IndexedDB |
| Theming | `next-themes` (`attribute="class"`, system default) |
| Auto-scroll | `use-stick-to-bottom` |
| Component baseline | ShadCN (`radix-nova` style on neutral palette) + Tailwind v4 |
| Icons | `lucide-react` |

---

## Project Structure

```
health-triangulation/
├── app/
│   ├── api/chat/                       Backend orchestration + tools
│   │   ├── route.ts                    POST endpoint — Opus 4.7, streaming, caching
│   │   ├── systemPrompt.ts             Methodology system prompt (stable/dynamic)
│   │   ├── lib/                        Cache manager, retry, retry config
│   │   └── tools/
│   │       ├── researchTool/           search tool + Exa client + rate limiter
│   │       ├── readTool/               read tool — focused highlights from URL
│   │       └── depthTool/              depth tool — full content + Gemini extraction
│   ├── chat/                           Routed chat shell (per-thread)
│   ├── components/                     Page-specific components (composer, message renderer)
│   ├── globals.css                     Theme tokens, accent system, Streamdown typography
│   ├── layout.tsx                      Root layout (Geist, ThemeProvider, TooltipProvider)
│   └── page.tsx                        Server redirect → /chat
│
├── components/
│   ├── ai-elements/                    Reusable chat UI (conversation, message, tool-call, sources, etc.)
│   ├── ui/                             ShadCN primitives
│   ├── app-sidebar.tsx                 Thread CRUD + active accent + mode toggle
│   ├── chat-view.tsx                   Empty state + visibility + edit-resubmit + sources extraction
│   ├── mode-toggle.tsx                 Light / Dark / System
│   └── theme-provider.tsx              next-themes wrapper
│
├── hooks/
│   ├── use-mobile.ts                   Breakpoint observer
│   ├── use-persisted-chat.ts           useChat wrapper with memo'd transport
│   └── use-thread-persistence.ts       Status-edge save (only on streaming → ready)
│
├── lib/
│   ├── thread-store.ts                 Dexie schema + CRUD
│   ├── message-utils.ts                Citation extraction, message-text extraction
│   └── utils.ts                        cn, canonicalizeUrlForDedupe
│
└── docs/
    ├── backend-harness.md              Backend technical state
    ├── frontend-shell.md               Frontend technical state
    ├── conceptual-intent-overview.md   Product intent & design philosophy
    └── other-project.md                Reference foundational agent + agentic principles
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+ (or whatever current LTS Next 16 supports)
- **npm** (the project uses `package-lock.json`)
- API keys for Anthropic, Google AI, and Exa (see below)

### API Keys

You need three keys. Sign up and grab them:

| Service | Where | What it powers |
|---|---|---|
| **Anthropic** | [console.anthropic.com](https://console.anthropic.com) | Claude Opus 4.7 — the primary reasoning agent |
| **Google AI** | [ai.google.dev](https://ai.google.dev) | Gemini 3 Flash — the depth-extraction sub-agent |
| **Exa** | [dashboard.exa.ai](https://dashboard.exa.ai) | Semantic search, focused highlights, full content retrieval |

Anthropic and Exa both require account credit / a paid plan to actually serve requests in volume; the agent is calibrated for Opus, which is more expensive per token (the three-tier prompt caching is what makes this economically viable in chat — a typical session hits 96–99% cache and 57–72% cost reduction vs. uncached).

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

You ask: *"Compare Peter Attia and Paul Saladino on LDL — and what does the evidence support?"*

1. **Scoping.** The agent confirms what's being asked (already clear here).
2. **Acquisition pass 1 (perspectives).** It searches Exa for primary sources of what each figure has said on LDL — long-form considered content, not fragments. Highlighted excerpts (1250 chars/result) flow directly into the agent's context. If a particular source warrants going deeper, it uses `read` for focused excerpts (10K chars) or `depth` for full structured extraction via Gemini Flash.
3. **Acquisition pass 2 (independent evidence).** Separately from the figure-extraction sources, it does fresh searches for the underlying research on LDL — RCTs, Mendelian randomization, mechanism studies, mainstream and alternative reviews. Independent of how either figure framed or cited.
4. **Triangulation.** It reconstructs each figure's actual reasoning chain, identifies where they agree/disagree, then assesses each claim against the independent evidence with calibration — naming where each figure is confirmed, partially supported, overstated, or unsupported, including any *right destination, wrong route* nuance.
5. **Response.** Free-form analytical prose with inline `[Title](URL)` citations on every sourced claim. Sources drawer auto-populates. Verdict holds under pushback.

You see all of this happen in real time — the actual queries the agent wrote, the domains coming back, the reasoning collapsibles — because transparency is the trust mechanism.

---

## Further Reading

- [`docs/conceptual-intent-overview.md`](docs/conceptual-intent-overview.md) — Product intent, design philosophy, what success looks like
- [`docs/backend-harness.md`](docs/backend-harness.md) — Backend technical state (agent, tools, caching, context management)
- [`docs/frontend-shell.md`](docs/frontend-shell.md) — Frontend technical state (chat shell, methodology surfaces, risks)
- [`docs/other-project.md`](docs/other-project.md) — Reference foundational agent + agentic systems engineering principles

---

