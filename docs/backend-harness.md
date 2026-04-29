# Backend Harness — Current State

The orchestration + retrieval layer for Health Triangulation. The methodology system prompt is now in place and load-bearing; remaining methodology features (calibration schemas, report-analysis flow, user-belief interview) are still pending. The frontend chat shell that consumes this harness is documented separately in `frontend-shell.md`.

---

## Status

**Built:**
- Streaming chat endpoint at `/api/chat` running Claude Opus 4.7 with adaptive thinking
- Three-tier Anthropic prompt caching (system / tools / history)
- Three retrieval tools: `search`, `read`, `depth` — Exa-backed, highlights-first
- Gemini 3 Flash sub-agent for structured depth extraction
- Promise-chained Exa rate limiter (10 QPS)
- Per-phase retry with timeout, exponential backoff, jitter, `Retry-After` respect
- Anthropic context-management edits (clear thinking, clear tool uses, compact)
- Per-request telemetry: tool counts, token usage, cache hit rate, cost vs. baseline, context-edit events
- **Methodology system prompt** — figure-driven triangulation discipline encoded across nine sections; ~870 words; intent-bearing rather than prescriptive (see "Methodology System Prompt" below)

**Not built yet:**
- Report-analysis flow (provider epistemic profile + three-layer schema)
- User-belief in-chat interview behavior
- Calibration tier as structured output / visible commitment / UI badges
- Compaction event surfacing in the UI (when `compact_20260112` fires)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Agent harness | Vercel AI SDK v6 (`streamText`, `generateObject`, tool system, `createUIMessageStream`) |
| Primary model | Claude Opus 4.7 — `effort: 'medium'`, `thinking: { type: 'adaptive' }`, `display: 'summarized'` |
| Depth extraction | Gemini 3 Flash (`gemini-3-flash-preview`) — single-document structured output |
| Search | Exa (`exa-js`) — semantic search with highlights @ 1250 chars; read tool @ 10K chars |
| Validation | Zod (tool input schemas, structured outputs) |

---

## Architecture

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

| Tool | What It Does | Latency |
|---|---|---|
| **search** | Exa semantic search → 3 results with highlighted excerpts directly to the primary agent | ~1–3s |
| **read** | Focused highlights from a specific URL via custom query — default "go deeper" step | ~100–300ms |
| **depth** | Full content retrieval → Gemini Flash structured findings (insight + evidence) | ~3–7s |

Reasoning between tool calls is handled natively by Opus 4.7's adaptive thinking. No dedicated think tool.

---

## Request Lifecycle

```
POST /api/chat
  → CacheManager builds three-tier cache structure
      (system stable+dynamic split, tool breakpoint, history breakpoint)
  → convertToModelMessages(messages)
  → streamText(Opus 4.7) with adaptive thinking, tools, contextManagement
  
  Opus reasons about what to search
    → Writes semantic queries, makes tool calls (parallel via AI SDK)
    
    search → Exa semantic search (3 results, highlights @ 1250 chars)
    read   → Exa getContents with highlights (10K chars, focused query)
    depth  → Phase 1: Exa getContents (full text)
             Phase 2: Gemini 3 Flash → structured findings via generateObject
    
    Opus evaluates returned excerpts
      → Sufficient signal? → Final response with inline citations
      → Need more from a source? → read with focused query
      → Need comprehensive extraction? → depth on specific URL
      → Need different angle? → additional search calls
  
  → prepareStep advances history cache breakpoint each step
  → Streamed via createUIMessageStream + writer.merge(result.toUIMessageStream())
  → onFinish logs: tool counts, tokens, cache hit rate, cost, context-edit events
```

---

## Project Structure

```
app/api/chat/
├── route.ts                              POST endpoint — Opus 4.7, streaming, caching, tools
├── systemPrompt.ts                       Methodology system prompt (stable/dynamic split)
│
├── lib/
│   ├── cacheManager.ts                   Three-tier Anthropic prompt caching
│   ├── llmRetry.ts                       Timeout + exponential backoff retry wrapper
│   └── retryConfig.ts                    Per-phase config, env-overridable
│
└── tools/
    ├── researchTool/
    │   ├── researchTool.ts               search tool — semantic search, returns highlights
    │   └── exaSearch/
    │       ├── exaClient.ts              searchExa, getContents, getHighlights
    │       ├── rateLimiter.ts            Promise-chained dispatch limiter (10 QPS)
    │       └── types.ts                  ExaSearchResult, SearchOptions, SearchCategory
    │
    ├── readTool/
    │   └── readTool.ts                   read tool — focused highlights from a URL
    │
    └── depthTool/
        ├── depthTool.ts                  depth tool — full content + structured extraction
        ├── types.ts                      Finding, ExtractionOutput, DepthToolOutput
        │
        └── extraction/
            ├── agent.ts                  Gemini 3 Flash extraction via generateObject
            ├── prompt.ts                 getExtractionPrompt() — instructions + document
            └── schema.ts                 Zod: findings[] (insight + evidence) + summary
```

---

## Key Infrastructure Details

### Caching (`lib/cacheManager.ts`)
Three breakpoints within Anthropic's 4-breakpoint limit:
1. **System stable** — methodology prompt (changes rarely)
2. **Tools** — breakpoint on the last tool in the registry; Anthropic caches the entire tools section above it
3. **History** — `prepareStep` strips prior non-system breakpoints each step and places a fresh one on the last message, advancing the cache boundary as the conversation grows

System dynamic (current date) is intentionally **uncached** so it doesn't poison the stable cache.

### Context management (`route.ts`)
`providerOptions.anthropic.contextManagement.edits` configured with three tiers:
- `clear_thinking_20251015` — `keep: 'all'` (preserves thinking blocks; protects cache stability)
- `clear_tool_uses_20250919` — trigger at 100K input tokens, keep 15 most recent, clear at least 15K
- `compact_20260112` — trigger at 150K input tokens (full compaction safety net)

### Retry (`lib/llmRetry.ts`)
- AbortSignal-based timeout per phase (extraction: 25s)
- Exponential backoff with ±25% jitter, capped at 10s
- Non-retryable on 400/401/403/404/422
- Respects `Retry-After` header when present
- Currently used by depth extraction; available for any phase that wants it

### Rate limiting (`tools/researchTool/exaSearch/rateLimiter.ts`)
Promise-chained dispatch — controls when requests *start*, not when they execute. 10 QPS default (33% cushion below Exa's 15 QPS limit). Override via `EXA_RATE_LIMIT_QPS`.

---

## Methodology System Prompt

Lives in `app/api/chat/systemPrompt.ts`. Stable/dynamic split: stable carries the methodology (cached); dynamic carries the current date (uncached, doesn't poison the system cache).

**Core framing:** the canonical input is a *figure-on-topic*. The agent extracts what a specific public health figure actually says on a topic in their full nuanced reasoning, then (when asked) compares to another figure and/or triangulates against the best evidence with first-principles biological reasoning.

**Structure (nine sections, ~870 words):**

| Section | What it encodes |
|---|---|
| Identity / scope | What the agent is and isn't (rigorous epistemic triangulator, not a clinician, anything health/biology in scope) |
| **Reasoning vs. Retrieval** | Hard rule: training data is reasoning capacity, not a source of evidence. Citations come only from tools. Fabricated citations destroy the methodology's foundation. |
| **How You Think** | Cognitive posture: substrate-level reasoning, cross-domain integration, depth over speed, first-principles biological reasoning as the test of truth (not consensus from any school) |
| **How You Operate** | Three primitives: Faithful full-context extraction · Context-aware reading · Calibrated honest verdict (with right-destination/wrong-route as a real verdict shape) |
| **Reading Evidence** | Eight-sentence discipline for evaluating research: comparison frame, acute vs. chronic, surrogate vs. functional endpoints, chemical conflation, mechanism vs. clinical, integration over isolated findings |
| **Discipline** | Behavior under chat dynamics: scope before searching, same-calibration for every subject, neither mainstream-defending nor contrarian, honest "I don't know" |
| **Acquisition** | Figure-on-topic as canonical input shape; user-thinking and report inputs as parallel extensions |
| **Triangulating Against Evidence** | Two-pass retrieval rule: a figure's primary sources tell you what they claim, not what the evidence shows. Independent retrieval pass on the topic itself, separate from the figure's framing. |
| Response | Free-form analytical prose with inline citations; lead with the answer; hand the decision back to the user |

**Deliberately NOT in the prompt** (to respect the agentic separation-of-concerns rule — *prompt = global intent, schema = contract*):

- Six-tier calibration vocabulary (`confirmed / partially supported / overstated / etc.`) — this is schema territory for the future calibration-badge surface; the prompt encodes the *discipline* of arriving honestly at a tier, not the tier names
- Tool usage instructions (when to call search vs. read vs. depth) — tool descriptions carry that
- Output formatting specifics — the chat surface and Streamdown handle that
- Per-mode operational steps (solo / comparison / triangulation / report) — emergent from primitives + input shape

**Provider options on the Anthropic call:**

```ts
providerOptions: {
  anthropic: {
    thinking: { type: 'adaptive', display: 'summarized' },
    effort: 'medium',
    contextManagement: { edits: [...] },
  },
}
```

`display: 'summarized'` lives **inside** the `thinking` object, not at the top level. (This was a real bug — when placed at the top level, Zod's strip mode silently drops it and Anthropic returns redacted thinking blocks with empty content.)

---

## Adaptations From the Foundational Agent Reference

The reference at `docs/other-project.md` is the lineage. Adaptations made for this project:

| Change | Reason |
|---|---|
| Sonnet 4.6 → **Opus 4.7** | Methodology demands stronger calibration discipline + verdict-under-pressure |
| Added **`display: 'summarized'`** | Reasoning text needs to surface to UI for transparency-as-audit (per concept doc) |
| Search categories pruned + extended | `tweet` removed by Exa; `pdf`, `people` added; `financial report` and `company` dropped as irrelevant |
| Added **`maxAgeHours`** to search | Replaces deprecated `livecrawl`; gives the agent freshness control for time-sensitive health queries |
| Pricing constants updated | Opus 4.7 ~5× Sonnet 4.6 — makes prompt caching load-bearing rather than nice-to-have |

---

## Design Decisions (Tied to Principles)

- **Three tools, not more.** `search` / `read` / `depth` are the minimal set per Principle 3. Report analysis, user-belief acquisition, and figure profiling will be **schema and prompt extensions**, not new tools.
- **Highlights-first retrieval** keeps full page text out of the primary agent's context (Principle 1). Per Exa's published numbers: 500 chars of highlights ≈ 8K chars of full page at 16× fewer tokens; 4K of highlights > 32K of full text.
- **Just-in-time over preloaded.** The primary agent never receives raw documents — only highlights inline, focused excerpts on demand (`read`), or structured findings extracted by a sub-agent (`depth`).
- **Sub-agent isolates extraction.** `depth` runs Gemini Flash in isolation; the primary agent receives a structured summary, never the full text. Same pattern Principle 1 calls out for parallelization without context explosion.
- **Single context, atomic loop.** No separate scoping pre-step; scoping behavior will be enforced via the system prompt (per Principle 6). One stream, one cache, one accumulating history.
- **Transparency = verification.** For an analytical agent, the user is the verifier. Tool-status, sources, reasoning blocks, and (forthcoming) visible calibration commitments are how the methodology becomes auditable (Principle 5 adapted).

---

## Environment Variables

`.env.local` (not committed):

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Opus 4.7 primary agent |
| `GOOGLE_GENERATIVE_AI_API_KEY` | yes | Gemini 3 Flash depth extraction |
| `EXA_API_KEY` | yes | Search / read / depth retrieval |
| `EXA_RATE_LIMIT_QPS` | no | Override Exa dispatch rate (default 10) |
| `EXTRACTION_TIMEOUT_MS` | no | Override Gemini extraction timeout (default 25000) |
| `EXTRACTION_MAX_ATTEMPTS` | no | Override extraction retry attempts (default 2) |

---

## Verification Status

- `npx tsc --noEmit` — clean
- `npm run lint` — clean (eslint config updated to honor `_`-prefix unused convention)
- End-to-end runtime exercised via the chat shell — tool calls fire, summarized thinking surfaces in the stream, three-tier cache hits as expected, telemetry log shape confirmed.

---

## What's Next

In approximate order:

1. **Calibration tier as structured commitment** — emit a `data-calibration` UI message part from the route carrying `{ tier, subject, justification }`. The system prompt already encodes the calibration *discipline*; this adds the *mechanical commitment* that makes verdicts auditable badges. The vocabulary (six-tier scale) lives in the schema, not the prompt.
2. **Per-perspective source tagging** — extend tool calls / route to tag retrieval with a `perspective` field so multi-figure triangulations can show which sources informed which figure's view. Frontend `SourceList` already has the optional `groups` extension flagged.
3. **Report-analysis flow** — file upload → provider epistemic profile → three-layer structured analysis (findings / interpretations / recommendations). Likely a `generateObject` sub-call with a health-report-aware schema, invoked when a file part is attached.
4. **Compaction event surfacing** — emit a `data-context-edit` part inside `onFinish`'s applied-edits loop so the UI can render a quiet inline notice when context was summarized.
5. **User-belief in-chat interview** — structured question shape surfaced when the system prompt initiates an interview turn. Schema + UI message part.

The harness is the foundation. The frontend chat shell is the surface (see `frontend-shell.md`). **The methodology is the product** — which now lives in `systemPrompt.ts` and is exercised end-to-end. The remaining work makes the methodology's verdicts mechanically auditable rather than only legible in prose.
