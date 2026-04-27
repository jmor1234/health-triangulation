# Backend Harness — Current State

The orchestration + retrieval layer for Health Triangulation. The methodology layer (system prompt, calibration schemas, report-analysis flow) is **not yet built** — what's here is the harness that those layers will sit on top of.

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

**Placeholder (deliberate):**
- `systemPrompt.ts` — minimal instructions to verify end-to-end. The methodology prompt (faithful extraction, context-aware reading, calibrated honest verdicts) replaces this once the frontend exists.

**Not built yet:**
- Frontend (chat shell, message rendering, sources drawer, reasoning blocks, calibration UI)
- Report-analysis flow (provider epistemic profile + three-layer schema)
- User-belief in-chat interview behavior
- Calibration tier as structured output / visible commitment

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Agent harness | Vercel AI SDK v6 (`streamText`, `generateObject`, tool system, `createUIMessageStream`) |
| Primary model | Claude Opus 4.7 — `effort: 'high'`, `thinking: { type: 'adaptive' }`, `display: 'summarized'` |
| Depth extraction | Gemini 3 Flash (`gemini-3-flash-preview`) — single-document structured output |
| Search | Exa (`exa-js`) — semantic search with highlights @ 1250 chars; read tool @ 10K chars |
| Validation | Zod (tool input schemas, structured outputs) |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  Primary Agent (Opus 4.7)                    │
│        Adaptive thinking · effort: high · display: summarized │
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
├── systemPrompt.ts                       Placeholder system prompt (stable/dynamic split)
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

## Adaptations From the Foundational Agent Reference

The reference at `docs/other-project.md` is the lineage. Adaptations made for this project:

| Change | Reason |
|---|---|
| Sonnet 4.6 → **Opus 4.7** | Methodology demands stronger calibration discipline + verdict-under-pressure |
| Effort `medium` → **`high`** | Multi-fidelity discipline + calibrated commitments warrant deliberation |
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
- End-to-end runtime not yet exercised — two minor unknowns until first invocation:
  - `display: 'summarized'` placement at `providerOptions.anthropic` top level
  - Tool-level cache breakpoint via `providerOptions.anthropic.cacheControl` on the last tool

Both will surface immediately at first request if wrong; both are local fixes.

---

## What's Next

In approximate order:

1. **Frontend chat shell** — needs design thought (per user direction). Will port from the reference's ai-elements (conversation, message, response, reasoning, tool-status, sources) with `useChat` updated to `DefaultChatTransport`.
2. **First end-to-end smoke test** — verify caching, thinking display, tool calls, telemetry log shape.
3. **System prompt rewrite** — the methodology layer. Intent + role + way of being. Compact, not a rules list. Calibration tier mechanism decided here (schema-as-contract vs. prompt-as-guideline).
4. **Report-analysis flow** — file upload → provider epistemic profile → three-layer structured analysis (findings / interpretations / recommendations). Likely a `generateObject` sub-call with a health-report-aware schema, invoked when a file part is attached.
5. **Calibration UI** — visible tier badges, source attribution per perspective, layer markers on report analysis. Transparency surfaces that make the methodology auditable.
6. **Compaction event surfacing** — render distinctly when `providerMetadata.anthropic.type === 'compaction'` so the user knows when context was summarized.

The harness is the foundation. **The methodology is the product** — which is why the system prompt + schemas + UI surfaces are where the next real work lives.
