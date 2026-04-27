# Foundational Agent — Project Overview

A research-capable AI agent that searches the web, retrieves and synthesizes information, and delivers concise, well-cited responses.

## The Core Design Principle

An agent's intelligence comes from two things: **retrieved information** and **reasoning capacity**. Both share the same finite resource — the context window. Every token of retrieved data competes with reasoning quality.

The architecture resolves this tension by keeping the primary agent in direct control:
- **Semantic highlights** solve it at the content level (Exa returns the most relevant excerpts, not full pages)
- **Direct search** solves it at the pipeline level (no sub-agent overhead, single synthesis pass by the primary agent)
- **The read tool** solves it at the refinement level (get more focused excerpts from a known URL, keeping Sonnet in direct contact with source material)
- **The depth tool** solves it at the comprehension level (full document extraction when excerpts aren't enough)

The primary agent writes semantic queries, receives highlights directly, and synthesizes — no intermediary. Full page text only enters the system through the depth tool's extraction pipeline.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  Primary Agent (Sonnet 4.6)                   │
│        Writes queries, synthesizes from highlights            │
│        Adaptive thinking (interleaved reasoning)              │
├──────────────────┬──────────────────┬────────────────────────┤
│     Search       │      Read        │        Depth           │
│     Tool         │      Tool        │        Tool            │
│  (Exa search)    │  (Exa highlights)│     (extraction)       │
└──────────────────┴──────────────────┴────────────────────────┘
```

| Tool | What It Does | Latency |
|------|-------------|---------|
| **Search** | Exa semantic search — returns results with highlighted excerpts directly to the primary agent | ~1-3s |
| **Read** | Focused highlights from a specific URL (10K chars) — default "go deeper" step, keeps Sonnet in direct contact with source | ~100-300ms |
| **Depth** | Retrieves full content from a URL → extracts targeted findings with evidence | ~3-7s |

Reasoning between tool calls is handled natively by Claude's adaptive thinking with interleaved thinking — no dedicated think tool needed.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Agent | Vercel AI SDK (`streamText`, `generateObject`, tool system) |
| Primary Model | Claude Sonnet 4.6 (orchestration, search queries, synthesis + adaptive thinking, medium effort) |
| Depth Extraction | Gemini 3 Flash (single-document extraction) |
| Search | Exa API (semantic search with highlights, 3 results/query, 1250 chars/URL; read tool: 10K chars/URL) |
| Frontend | React 19 + Tailwind v4 + ShadCN/ui + Streamdown + next-themes + `useChat` from `@ai-sdk/react` |
| Voice | OpenAI Whisper API (direct REST, no SDK dependency) |
| PDF Export | Puppeteer + unified (remark-parse → remark-gfm → remark-rehype → rehype-stringify) |
| Validation | Zod (tool input schemas, structured outputs) |

## Request Lifecycle

```
User sends message
  → POST /api/chat
  → Three-tier prompt caching applied (tools, system prompt, history)
  → streamText(Sonnet 4.6) with adaptive thinking (medium effort)

  Sonnet reasons about what to search
  → Writes semantic queries, makes tool calls (parallel via AI SDK)

  Search tool (per call):
    → Exa semantic search (3 results with highlights)
    → Returns results directly to Sonnet

  Sonnet evaluates highlights
    → Sufficient? → Final response with inline citations
    → Need more from a source? → Read tool with focused query
    → Need comprehensive extraction? → Depth tool on specific URLs
    → Need different angle? → Additional search calls

  → Streamed response to frontend via UI message stream
  → Frontend renders markdown with Streamdown (citations as clickable links)
  → Tool status indicators show during tool execution
  → Sources drawer populated from parsed citation URLs
```

## Infrastructure

- **Three-tier prompt caching** — Tool schemas, stable system prompt, conversation history. 5-minute TTL. `prepareStep` advances the history cache breakpoint on every step during multi-step tool loops, ensuring intermediate tool results are incrementally cached. 96-99% cache hit rates, 57-72% cost reduction on Anthropic API calls. Cache performance and cost metrics logged per request.
- **Context management** — Server-side Anthropic context editing via `contextManagement.edits`. Three tiers: (1) thinking blocks preserved (`keep: "all"`) to protect cache stability, (2) old tool results cleared at 100K tokens (keep 15 most recent, `clearAtLeast: 15K`), (3) full compaction at 150K tokens. Tool clearing drops context ~40K in one shot with one-turn cache miss and immediate recovery. Caching and context management coexist — caching handles cost (96-99% hit rates below 100K), tool clearing handles space, compaction is the safety net.
- **Retry + timeout** — Per-phase configurable (extraction). Exponential backoff with jitter. Error classification (retryable vs non-retryable). Respects Retry-After headers.
- **Rate limiting** — Promise-chained dispatch at 10 QPS (33% cushion below Exa's 15 QPS limit). Controls dispatch timing, not execution — requests run concurrently once dispatched.

## Project Structure

```
foundational-agent/
├── app/
│   ├── page.tsx                    # Chat orchestrator (useChat, visibility, tool status, sources, theme toggle)
│   ├── layout.tsx                  # Root layout (Geist fonts, metadata, viewport, ThemeProvider)
│   ├── globals.css                 # Tailwind + ShadCN + Streamdown typography + animations
│   ├── components/                 # Page-specific components
│   │   ├── message-renderer.tsx    # Part dispatcher (text, reasoning, file, tool)
│   │   ├── chat-composer.tsx       # Hero composer (voice, attachments, submit)
│   │   ├── voice-button.tsx        # MediaRecorder → /api/transcribe → text injection
│   │   └── attachment-button.tsx   # File dialog trigger (uses AttachmentsContext)
│   └── api/
│       ├── chat/                   # Backend (see docs/backend_directory_structure.md)
│       │   ├── route.ts            # Streaming endpoint
│       │   ├── systemPrompt.ts     # Agent instructions (cached/dynamic split)
│       │   ├── lib/                # Infrastructure (caching, retry, config)
│       │   └── tools/              # search, read, depth
│       ├── transcribe/
│       │   └── route.ts            # Voice transcription (OpenAI Whisper API)
│       └── export-pdf/
│           ├── route.ts            # PDF generation endpoint
│           └── lib/                # markdownToHtml, generatePdf, pdfStyles
├── components/
│   ├── ai-elements/                # Reusable chat UI components
│   │   ├── conversation.tsx        # Auto-scroll (use-stick-to-bottom)
│   │   ├── message.tsx             # Message + MessageContent (CVA variants)
│   │   ├── response.tsx            # Streamdown markdown rendering
│   │   ├── reasoning.tsx           # Collapsible thinking block
│   │   ├── tool-status.tsx         # Animated tool status indicator
│   │   ├── sources.tsx             # Collapsible sources drawer
│   │   ├── prompt-input.tsx        # Compound input with attachments
│   │   ├── message-copy.tsx        # Copy button
│   │   ├── message-pdf-button.tsx  # PDF export button (POST → blob download)
│   │   └── loader.tsx              # Spinner primitive
│   ├── theme-provider.tsx            # next-themes wrapper (system/light/dark, localStorage)
│   └── ui/                         # ShadCN primitives (button, collapsible, dropdown-menu, textarea, mode-toggle)
├── hooks/use-mobile.ts             # Mobile detection (useSyncExternalStore)
├── lib/
│   ├── utils.ts                    # cn() + canonicalizeUrlForDedupe()
│   └── message-utils.ts            # extractMessageText() + extractCitationUrls()
├── docs/                           # Architecture + reference implementations
└── .env.local                      # API keys (ANTHROPIC, GOOGLE, EXA, OPENAI)
```

## Key Constraints

1. Highlights enter the primary agent's context directly — query quality is the single biggest lever on result quality
2. Full page text only enters the system through the depth tool's extraction pipeline
3. No `any` type — strict TypeScript throughout
4. Exa queries are semantic (natural language descriptions), not keywords
5. Prompts are concise — the models are intelligent, don't micromanage
6. Minimize latency — the primary agent calls Exa directly, no sub-agent overhead

## Current Status

**Backend:** Search tool (direct Exa), read tool (focused highlights), depth tool (retrieval + extraction), three-tier caching, retry/timeout, rate limiting — fully implemented.

**Frontend:** Polished chat UI with markdown rendering (Streamdown), asymmetric message styling, collapsible reasoning blocks, animated tool status indicators, auto-scroll, hero composer with voice input + file attachments, sources drawer, message copy, PDF export, dark mode toggle (system/light/dark), message visibility filtering.

**Deferred:** Research progress streaming (requires backend data part emission), token economics tracking, trace logging, domain knowledge pluggability, conversation management.

---

# Backend Directory Structure

```
app/api/chat/
├── route.ts                              # POST endpoint — streaming, caching, tool registration
├── systemPrompt.ts                       # Primary agent system prompt (stable/dynamic cache split)
│
├── lib/
│   ├── cacheManager.ts                   # Three-tier Anthropic prompt caching (tools, system, history)
│   ├── llmRetry.ts                       # Timeout + exponential backoff retry wrapper for LLM calls
│   └── retryConfig.ts                    # Per-phase timeout/retry/backoff configuration (extraction only)
│
└── tools/
    ├── researchTool/
    │   ├── researchTool.ts               # Direct Exa semantic search — returns highlights to primary agent
    │   │
    │   └── exaSearch/
    │       ├── exaClient.ts              # Exa SDK wrapper — searchExa() + getHighlights() + getContents()
    │       ├── rateLimiter.ts            # Promise-chained dispatch limiter (10 QPS, 33% cushion)
    │       └── types.ts                  # ExaSearchResult, ExaSearchResponse, SearchOptions
    │
    ├── readTool/
    │   └── readTool.ts                   # Focused highlights from a specific URL via custom query
    │
    └── depthTool/
        ├── depthTool.ts                  # Retrieve full content → extract structured findings
        ├── types.ts                      # Finding, ExtractionOutput, DepthToolOutput
        │
        └── extraction/
            ├── agent.ts                  # Gemini 3 Flash → structured findings via generateObject
            ├── prompt.ts                 # getExtractionPrompt() — instructions + document formatting
            └── schema.ts                 # Zod schema: findings[] (insight, evidence) + summary
```

## Data Flow

```
route.ts
  → streamText(Sonnet 4.6, tools, adaptive thinking, medium effort)
  → Tool calls execute via AI SDK:

  searchTool (search) (~1-3s)
    → Exa semantic search (3 results, highlights at 1250 chars/URL)
    → Returns results with highlights directly to Sonnet

  readTool (read) (~100-300ms)
    → Exa getContents with highlights (10000 chars, focused query)
    → Returns excerpts directly to Sonnet — default "go deeper" step

  depthTool (depth) (~3-7s)
    Phase 1: getContents (exaClient)   → full text from Exa Contents
    Phase 2: extraction/agent.ts       → structured findings with evidence

  Reasoning between tool calls handled natively by adaptive thinking (interleaved thinking)
```

## Key Infrastructure

| File | Purpose |
|------|---------|
| `cacheManager.ts` | Three-tier prompt caching: tool schemas, system prompt (stable/dynamic split), conversation history. 5-min TTL. `applyHistoryCacheBreakpoint()` strips stale breakpoints and advances the history cache boundary — called via `prepareStep` on every step for incremental multi-step caching. 96-99% cache hit rates, 57-72% cost reduction. Context management configured in `route.ts` via `providerOptions.anthropic.contextManagement`: thinking preserved (`keep: "all"`) for cache stability, tool results cleared at 100K (keep 15, `clearAtLeast: 15K`), compaction at 150K. |
| `llmRetry.ts` | `withRetry(fn, phase)` — AbortSignal timeout, exponential backoff with jitter, error classification (retryable vs non-retryable), Retry-After header respect. |
| `retryConfig.ts` | Extraction phase: 25s timeout, 2 attempts. Env-overridable. |
| `rateLimiter.ts` | Promise-chained dispatch at 10 QPS (configurable via `EXA_RATE_LIMIT_QPS`). Controls dispatch timing, not execution — requests run concurrently once dispatched. |

## Model Allocation

| Role | Model | Where |
|------|-------|-------|
| Primary Agent | Sonnet 4.6 | `route.ts` — orchestration, search queries, judgment, user-facing synthesis |
| Depth Extraction | Gemini 3 Flash | `extraction/agent.ts` — fast single-document extraction |

---

# Frontend Directory Structure

```
app/
├── layout.tsx                      # Root layout — Geist fonts, metadata, viewport, ThemeProvider
├── page.tsx                        # Chat orchestrator — useChat, message visibility, tool status, sources, theme toggle
├── globals.css                     # Tailwind v4 + ShadCN theme + Streamdown typography + animations
├── favicon.ico
├── components/
│   ├── message-renderer.tsx        # Part dispatcher: text→Response, reasoning→Reasoning, file→Image
│   ├── chat-composer.tsx           # Hero composer (voice, attachments, submit morphing)
│   ├── voice-button.tsx            # MediaRecorder → /api/transcribe → textarea text injection
│   └── attachment-button.tsx       # File dialog trigger (uses AttachmentsContext)
└── api/
    ├── transcribe/
    │   └── route.ts                # Voice transcription (OpenAI Whisper API, direct REST)
    └── export-pdf/
        ├── route.ts                # PDF generation endpoint (markdown → HTML → PDF)
        └── lib/
            ├── markdownToHtml.ts   # unified pipeline (remark-parse → remark-gfm → remark-rehype → rehype-stringify)
            ├── generatePdf.ts      # Puppeteer headless Chrome → A4 PDF with try/finally cleanup
            └── pdfStyles.ts        # Print-optimized CSS (system fonts, code blocks, tables)

components/
├── ai-elements/
│   ├── loader.tsx                  # Vercel-style SVG spinner (opacity-graded spokes)
│   ├── conversation.tsx            # StickToBottom auto-scroll wrapper + scroll-to-bottom button
│   ├── message.tsx                 # Message + MessageContent (CVA variants: user bubbles, assistant flat)
│   ├── message-copy.tsx            # Copy button (extracts text parts, excludes reasoning)
│   ├── message-pdf-button.tsx      # PDF export button (POST markdown → blob download → <a> click)
│   ├── response.tsx                # Streamdown memo wrapper for streaming markdown rendering
│   ├── reasoning.tsx               # Collapsible thinking block (auto-open/close, duration tracking)
│   ├── tool-status.tsx             # Transient status indicator (gradient bg, slide-in animation)
│   ├── sources.tsx                 # Collapsible sources drawer (favicon, dedup, cap at 8)
│   └── prompt-input.tsx            # Compound input (AttachmentsContext, auto-resize, paste/drag-drop, submit morphing)
├── theme-provider.tsx              # next-themes wrapper (system/light/dark, localStorage persistence)
└── ui/                             # ShadCN primitives
    ├── button.tsx
    ├── collapsible.tsx
    ├── dropdown-menu.tsx
    ├── mode-toggle.tsx             # Dark mode toggle (Light/Dark/System dropdown, Sun/Moon icons)
    └── textarea.tsx

hooks/
└── use-mobile.ts                   # useSyncExternalStore-based mobile detection (768px breakpoint)

lib/
├── utils.ts                        # cn() + canonicalizeUrlForDedupe()
└── message-utils.ts                # extractMessageText() + extractCitationUrls()
```

## Architecture

### `page.tsx` — Chat Orchestrator

Client component using `useChat` from `@ai-sdk/react` (AI SDK v6).

**Key patterns:**
- `sendMessage({ text, files? })` — sends user input + optional attachments to `/api/chat`
- `status` — `'submitted' | 'streaming' | 'ready' | 'error'`
- `experimental_throttle: 50` — batches UI updates for streaming performance
- Tool detection via `isToolUIPart()` and `getToolName()` from AI SDK (handles both `tool-${name}` and `dynamic-tool` types)
- Message visibility: only latest user→assistant pair shown by default, "Show previous" toggle
- Sources: citation URLs parsed from last assistant message text via regex
- Error: dismissible banner, tagged to specific error message
- Message actions: copy + PDF export on assistant messages (hover-reveal)

### Message Rendering

`message-renderer.tsx` dispatches on `message.parts`:
- `text` → `<Response>` (Streamdown markdown) for assistant, plain text for user
- `reasoning` → `<Reasoning>` (collapsible, auto-open during streaming, auto-close 1s after)
- `file` → `<Image>` (Next.js Image, unoptimized for data URLs)
- Tool parts → `null` (not rendered inline; tool status shown separately below messages)

### Styling Approach

- **Asymmetric messages**: User messages are contained bubbles (`bg-primary rounded-2xl`). Assistant messages are flat/document-style (`bg-transparent`).
- **CVA variants**: `is-user`/`is-assistant` CSS classes on outer div, `group-[.is-user]`/`group-[.is-assistant]` selectors on content.
- **Hover-reveal actions**: Copy + PDF buttons — `opacity-0 group-hover:opacity-100` on desktop, always visible on mobile.
- **Streamdown typography**: Styled via `[data-streamdown="..."]` CSS selectors in `globals.css`.

### Composer

Hero variant: mobile `fixed bottom-0 left-0 right-0` with safe-area padding, desktop `sticky bottom-0` constrained to `--container-max-w: 840px`.

Two rows: auto-resize textarea on top, toolbar (attachment + voice buttons on left, submit/stop button on right) on bottom.

Submit button morphs by status: Send icon → Spinner → Stop (square).

Supports: Enter to submit, Shift+Enter for newline, IME-aware, image paste from clipboard, drag-drop file upload.

### Voice Input

`voice-button.tsx` — Self-contained MediaRecorder component with 3-state lifecycle:
1. **Idle** — Gray mic icon. Click to start recording.
2. **Recording** — Red pulsing mic-off icon. Click to stop. MediaRecorder captures audio with codec detection (webm/opus preferred, mp4 fallback).
3. **Transcribing** — Spinner. Audio blob POSTed to `/api/transcribe`. Text injected into textarea via `onTranscription` callback.

Browser capability check via `useSyncExternalStore` (SSR returns `false`, client checks `MediaRecorder.isTypeSupported`). Button hidden on unsupported browsers without hydration mismatch.

`/api/transcribe` — Direct OpenAI Whisper REST API call. No `@ai-sdk/openai` dependency. Graceful 500 if `OPENAI_API_KEY` not configured.

### PDF Export

`message-pdf-button.tsx` — POSTs `extractMessageText(message)` to `/api/export-pdf`. Creates blob URL → triggers `<a>` click download → revokes URL. Loading spinner during generation.

`/api/export-pdf` pipeline:
1. `markdownToHtml.ts` — unified pipeline (remark-parse → remark-gfm → remark-rehype → rehype-stringify) wraps output in full HTML document with print CSS
2. `generatePdf.ts` — Puppeteer launches headless Chrome, renders HTML, generates A4 PDF with margins. `try/finally` ensures browser cleanup on error.
3. `pdfStyles.ts` — Print-optimized CSS (system font stack, heading hierarchy, code blocks, tables, blockquotes)
4. Filename extracted from first H1 in markdown via `extractH1ForFilename()`

Requires `serverExternalPackages: ["puppeteer"]` in `next.config.ts` to prevent Next.js from bundling Chromium.

### Dark Mode

Implemented via `next-themes` (ShadCN standard pattern):
- `ThemeProvider` wraps app in `layout.tsx` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`
- `suppressHydrationWarning` on `<html>` prevents flash
- `ModeToggle` dropdown in top-right corner (`fixed top-3 right-3 z-40`) with three options: Light, Dark, System
- Theme persisted in localStorage, defaults to system preference

### Key Packages

| Package | Purpose |
|---------|---------|
| `streamdown` | Streaming markdown rendering with `data-streamdown` attribute selectors |
| `use-stick-to-bottom` | Auto-scroll with smooth behavior, scroll-to-bottom button |
| `nanoid` | ID generation for attachment thumbnails |
| `class-variance-authority` | Message styling variants |
| `puppeteer` | Headless Chrome for PDF generation |
| `unified` + `remark-*` + `rehype-*` | Markdown → HTML pipeline for PDF export |
| `next-themes` | Dark mode (system/light/dark) with localStorage persistence |

### Deferred

- Research progress streaming (requires backend data part emission)
- Conversation management (threads, history, sidebar)

---

// app/api/chat/systemPrompt.ts


const SYSTEM_PROMPT_BASE = `You are a thoughtful, curious agent. You think carefully, engage genuinely, and have powerful tools to search the web, extract from sources, and ground your thinking in real data. These tools don't just provide information — they enhance your ability to reason from first principles by giving you real-world signal to think through. Your own knowledge guides the conversation — retrieval sharpens it.

## How You Think

Reason from the deepest structural layer — the substrate everything else depends on — and build upward. Follow causal chains to their root, not the level where symptoms are visible. The deepest insights live in the connections between domains, not within any single silo.

Depth over speed, always. Think longer and deeper for a higher quality response rather than shortcutting to an answer. First principles is often just clarity and simplicity.

Let your curiosity and intuition explore — follow threads, notice connections, go down unexpected pathways. Then validate structurally. Curiosity balanced with rigorous thinking is where the real work happens.

Land where the reasoning actually points. Don't hedge reflexively or manufacture counterpoints for the appearance of balance. If a caveat doesn't change the conclusion, it's noise. Real intellectual humility is updating when wrong — not refusing to commit so you never have to.

When reasoning leads somewhere non-consensus, go there — not for contrarianism, but because that's where the structure points. Before invoking a counterargument, ask: did you actually reason your way to this, or are you pattern-matching to the dominant frame's self-justification?

## Tools

Think first. Understand what's actually being asked — not everything needs a search, but you dont just use the search tool to find information, you use it to think better and clearly as well.

The search tool returns results directly into your context — there is no intermediary. Query clarity is everything; the search understands meaning, so precise, descriptive queries are rewarded far more than keywords. Fewer high-quality queries outperform many unfocused ones. Parallel calls for independent angles, sequential when findings inform next steps.

When a source warrants more detail, use the read tool — it's fast and keeps you in direct contact with the source. Reserve the depth tool for dense, lengthy documents where key information is likely buried.

Stop at sufficient signal. Don't search past diminishing returns.

## Response

Concise and clear. Depth of thought, economy of words — these are not in tension.

Inline citations [Title](URL) on every sourced claim — critical for trust and verifiability. Lead with the answer. Ask clarifying questions only when critically valuable.`;

export function buildSystemPrompt(formattedDate: string): { stable: string; dynamic: string } {
  return {
    stable: SYSTEM_PROMPT_BASE,
    dynamic: `Current date: ${formattedDate}`,
  };
}

---

// app/api/chat/route.ts

import { anthropic } from '@ai-sdk/anthropic';
import {
  streamText,
  type UIMessage,
  convertToModelMessages,
  stepCountIs,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai';
import { searchTool } from './tools/researchTool/researchTool';
import { readTool } from './tools/readTool/readTool';
import { depthTool } from './tools/depthTool/depthTool';
import { CacheManager } from './lib/cacheManager';

export const maxDuration = 300;

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export async function POST(req: Request) {
  const requestStart = Date.now();
  const { messages }: { messages: UIMessage[] } = await req.json();

  const userMessage = messages.filter((m) => m.role === 'user').pop();
  const lastText = userMessage?.parts?.find((p) => p.type === 'text');
  const preview = lastText && 'text' in lastText ? lastText.text.substring(0, 80) : '?';
  console.log(`\n[Route] ══ Request Start ══`);
  console.log(`[Route] Messages: ${messages.length} (latest: "${preview}...")`);

  const cache = new CacheManager();

  const formattedDate = dateFormatter.format(new Date());

  // Start async conversion early, await late (async-api-routes pattern)
  const modelMessagesPromise = convertToModelMessages(messages);

  // Three-tier caching (sync work overlaps with message conversion)
  const systemMessages = cache.buildCachedSystemMessages(formattedDate);
  const cachedTools = cache.prepareCachedTools({
    search: searchTool,
    read: readTool,
    depth: depthTool,
  });

  const modelMessages = await modelMessagesPromise;
  const initialMessages = [...systemMessages, ...modelMessages];

  console.log(`[Route] System messages: ${systemMessages.length}, Model messages: ${modelMessages.length}`);
  console.log(`[Route] Streaming with Sonnet 4.6 (thinking: adaptive, effort: medium, max steps: 50)`);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        model: anthropic('claude-sonnet-4-6'),
        messages: initialMessages,
        tools: cachedTools,
        stopWhen: stepCountIs(50),
        prepareStep: ({ messages }) => ({
          messages: cache.applyHistoryCacheBreakpoint(messages),
        }),
        providerOptions: {
          anthropic: {
            thinking: { type: 'adaptive' },
            effort: 'medium',
            contextManagement: {
              edits: [
                {
                  type: 'clear_thinking_20251015',
                  keep: 'all',
                },
                {
                  type: 'clear_tool_uses_20250919',
                  trigger: { type: 'input_tokens', value: 100_000 },
                  keep: { type: 'tool_uses', value: 15 },
                  clearAtLeast: { type: 'input_tokens', value: 15_000 },
                },
                {
                  type: 'compact_20260112',
                  trigger: { type: 'input_tokens', value: 150_000 },
                },
              ],
            },
          },
        },
        onFinish: ({ usage, steps, totalUsage }) => {
          const toolCounts: Record<string, number> = {};
          let totalToolTokens = 0;
          for (const step of steps) {
            if (step.toolCalls) {
              for (const tc of step.toolCalls) {
                toolCounts[tc.toolName] = (toolCounts[tc.toolName] || 0) + 1;
              }
            }
            if (step.toolResults) {
              for (const tr of step.toolResults) {
                try { totalToolTokens += Math.round(JSON.stringify(tr).length / 4); } catch { /* */ }
              }
            }
          }
          const toolSummary = Object.entries(toolCounts)
            .map(([name, count]) => `${count} ${name}`)
            .join(' + ');
          console.log(`\n[Route] ══ Complete ══`);
          console.log(`[Route] ${toolSummary || 'no tools'} · ~${totalToolTokens} tok to agent · ${steps.length} steps`);
          console.log(`[Route] Tokens — in: ${totalUsage.inputTokens} · out: ${totalUsage.outputTokens} · context: ${usage.inputTokens} · ${((Date.now() - requestStart) / 1000).toFixed(1)}s`);

          // Cache performance
          const d = totalUsage.inputTokenDetails;
          const cacheRead = d.cacheReadTokens ?? 0;
          const cacheWrite = d.cacheWriteTokens ?? 0;
          const noCache = d.noCacheTokens ?? 0;
          const totalInput = totalUsage.inputTokens ?? 0;
          const totalOutput = totalUsage.outputTokens ?? 0;
          const hitRate = totalInput > 0 ? ((cacheRead / totalInput) * 100).toFixed(1) : '0.0';

          // Sonnet 4.6 pricing (per token)
          const PRICE_INPUT  = 3    / 1_000_000;
          const PRICE_WRITE  = 3.75 / 1_000_000;
          const PRICE_READ   = 0.30 / 1_000_000;
          const PRICE_OUTPUT = 15   / 1_000_000;

          const costRead    = cacheRead * PRICE_READ;
          const costWrite   = cacheWrite * PRICE_WRITE;
          const costNoCache = noCache * PRICE_INPUT;
          const costOutput  = totalOutput * PRICE_OUTPUT;
          const costTotal   = costRead + costWrite + costNoCache + costOutput;
          const costBaseline = totalInput * PRICE_INPUT + totalOutput * PRICE_OUTPUT;
          const savings = costBaseline - costTotal;

          console.log(`[Route] Cache — read: ${cacheRead} · write: ${cacheWrite} · uncached: ${noCache} · hit: ${hitRate}%`);
          console.log(`[Route] Cost  — in: $${(costRead + costWrite + costNoCache).toFixed(4)} · out: $${costOutput.toFixed(4)} · total: $${costTotal.toFixed(4)} · saved: $${savings.toFixed(4)}`);

          // Context management events
          for (const step of steps) {
            const meta = step.providerMetadata?.anthropic as Record<string, unknown> | undefined;
            const cm = meta?.contextManagement as { appliedEdits?: Array<{ type: string; clearedInputTokens?: number; clearedToolUses?: number; clearedThinkingTurns?: number }> } | undefined;
            if (cm?.appliedEdits?.length) {
              for (const edit of cm.appliedEdits) {
                if (edit.type === 'compact_20260112') {
                  console.log(`[Route] ⚠ Compaction triggered — conversation was summarized`);
                } else if (edit.type === 'clear_tool_uses_20250919') {
                  console.log(`[Route] Context edit — cleared ${edit.clearedToolUses} tool uses (${edit.clearedInputTokens} tokens)`);
                } else if (edit.type === 'clear_thinking_20251015') {
                  console.log(`[Route] Context edit — cleared ${edit.clearedThinkingTurns} thinking turns (${edit.clearedInputTokens} tokens)`);
                }
              }
            }
          }
        },
        onError: ({ error }) => {
          console.error(`[Route] Stream error:`, error);
        },
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}

---

// app/api/chat/tools/researchTool/researchTool.ts

import { tool } from 'ai';
import { z } from 'zod';
import { searchExa } from './exaSearch/exaClient';

export const searchTool = tool({
  description:
    'Semantic web search — finds pages by meaning, not keywords. Returns results with highlighted excerpts. Make parallel calls for different search angles.',
  inputSchema: z.object({
    query: z.string().describe(
      'Describe the ideal document to find. Rich, descriptive queries outperform keywords.',
    ),
    includeText: z.string().optional().describe(
      'Term that MUST appear in results. Only for critical proper nouns or jargon. Max 5 words.',
    ),
    excludeText: z.string().optional().describe(
      'Term that MUST NOT appear in results. For filtering noise. Max 5 words.',
    ),
    category: z.enum(['research paper', 'news', 'tweet', 'personal site', 'financial report']).optional().describe(
      'Focus results on a specific content type.',
    ),
  }),
  execute: async ({ query, includeText, excludeText, category }) => {
    const start = Date.now();

    const response = await searchExa(query, {
      ...(includeText ? { includeText } : {}),
      ...(excludeText ? { excludeText } : {}),
      ...(category ? { category } : {}),
    });

    const results = response.results.map((r) => ({
      url: r.url,
      title: r.title,
      highlights: r.highlights,
      publishedDate: r.publishedDate,
      author: r.author,
    }));

    const resultTokens = Math.round(JSON.stringify(results).length / 4);
    const filters = [category, includeText && `+${includeText}`, excludeText && `-${excludeText}`].filter(Boolean).join(' ');
    console.log(`[Search] "${query.substring(0, 80)}"${filters ? ` [${filters}]` : ''} → ${results.length} results · ${Date.now() - start}ms · ~${resultTokens} tok`);
    results.forEach((r, i) => {
      let domain = '';
      try { domain = new URL(r.url).hostname.replace(/^www\./, ''); } catch { /* */ }
      console.log(`  ${i + 1}. ${domain} — ${r.title}`);
    });

    return results;
  },
});

---

// app/api/chat/tools/researchTool/exaSearch/exaClient.ts


import Exa from 'exa-js';
import { exaRateLimiter } from './rateLimiter';
import type { ExaSearchResponse, ExaSearchResult, SearchOptions } from './types';

const exa = new Exa(process.env.EXA_API_KEY);

export async function searchExa(
  query: string,
  options?: SearchOptions,
): Promise<ExaSearchResponse> {
  return exaRateLimiter.schedule(async () => {
    const response = await exa.search(query, {
      type: 'auto' as const,
      numResults: 3,
      contents: {
        highlights: {
          maxCharacters: 1250,
        },
      },
      ...(options?.includeText ? { includeText: [options.includeText] } : {}),
      ...(options?.excludeText ? { excludeText: [options.excludeText] } : {}),
      ...(options?.category ? { category: options.category } : {}),
    });

    const results: ExaSearchResult[] = response.results.map((r) => ({
      url: r.url,
      title: r.title ?? '',
      publishedDate: r.publishedDate ?? null,
      author: r.author ?? null,
      highlights: (r as Record<string, unknown>).highlights as string[] ?? [],
    }));

    const costObj = (response as Record<string, unknown>).costDollars as Record<string, unknown> | undefined;
    const cost = typeof costObj?.total === 'number' ? costObj.total : 0;

    return { results, costDollars: cost };
  });
}

export async function getContents(
  url: string,
  maxCharacters: number = 400_000,
): Promise<string> {
  return exaRateLimiter.schedule(async () => {
    const response = await exa.getContents([url], {
      text: { maxCharacters },
    });

    const result = response.results[0];
    const text = (result as Record<string, unknown>)?.text as string | undefined;
    if (!text) {
      throw new Error(`No content retrieved from ${url}`);
    }

    return text;
  });
}

export async function getHighlights(
  url: string,
  query: string,
  maxCharacters: number = 10_000,
): Promise<{ url: string; title: string; highlights: string[] }> {
  return exaRateLimiter.schedule(async () => {
    const response = await exa.getContents([url], {
      highlights: { maxCharacters, query } as Record<string, unknown>,
    });

    const result = response.results[0];
    const highlights = (result as Record<string, unknown>).highlights as string[] ?? [];

    return {
      url: result.url,
      title: result.title ?? '',
      highlights,
    };
  });
}

---


/**
 * Promise-chained dispatch rate limiter.
 *
 * Controls when requests START (dispatch rate), but lets them EXECUTE concurrently.
 * Each call chains onto a pending dispatch promise, ensuring minimum interval between dispatches.
 *
 * No timers, no explicit queue — just promise chaining.
 */
export class RateLimiter {
  private lastDispatchTime = 0;
  private pendingDispatch: Promise<void> = Promise.resolve();
  private readonly intervalMs: number;

  constructor(requestsPerSecond: number) {
    this.intervalMs = 1000 / requestsPerSecond;
  }

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    const dispatch = this.pendingDispatch.then(async () => {
      const now = Date.now();
      const elapsed = now - this.lastDispatchTime;
      const waitMs = Math.max(0, this.intervalMs - elapsed);

      if (waitMs > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
      }

      this.lastDispatchTime = Date.now();
    });

    // .catch prevents a broken dispatch from poisoning the entire chain
    this.pendingDispatch = dispatch.catch(() => {});

    await dispatch;
    return fn();
  }
}

function getConfiguredQps(): number {
  const envVal = process.env.EXA_RATE_LIMIT_QPS;
  if (envVal) {
    const parsed = parseFloat(envVal);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return 10; // 33% cushion below Exa's 15 QPS limit
}

export const exaRateLimiter = new RateLimiter(getConfiguredQps());


---


export interface ExaSearchResult {
  url: string;
  title: string;
  publishedDate: string | null;
  author: string | null;
  highlights: string[];
}

export interface ExaSearchResponse {
  results: ExaSearchResult[];
  costDollars: number;
}

export type SearchCategory = 'research paper' | 'news' | 'tweet' | 'personal site' | 'financial report';

export interface SearchOptions {
  includeText?: string;
  excludeText?: string;
  category?: SearchCategory;
}

---

// app/api/chat/tools/readTool/readTool.ts

import { tool } from 'ai';
import { z } from 'zod';
import { getHighlights } from '../researchTool/exaSearch/exaClient';

export const readTool = tool({
  description:
    'Get focused excerpts from a specific URL. Returns highlights selected by your query.',
  inputSchema: z.object({
    url: z.string().url().describe('The URL to read more from.'),
    query: z.string().describe('What to focus on. Excerpts are selected by relevance to this query.'),
  }),
  execute: async ({ url, query }) => {
    const start = Date.now();
    let domain = '';
    try { domain = new URL(url).hostname.replace(/^www\./, ''); } catch { /* */ }

    const result = await getHighlights(url, query);

    const totalChars = result.highlights.reduce((sum, h) => sum + h.length, 0);
    const resultTokens = Math.round(JSON.stringify(result).length / 4);
    console.log(`[Read]   ${domain} → "${query.substring(0, 60)}" · ${totalChars} chars · ${Date.now() - start}ms · ~${resultTokens} tok`);

    return result;
  },
});


---

// app/api/chat/tools/depthTool/types.ts

export interface Finding {
  insight: string;
  evidence: string;
}

export interface ExtractionOutput {
  findings: Finding[];
  summary: string;
}

export interface DepthToolOutput extends ExtractionOutput {
  url: string;
}


---

// app/api/chat/tools/depthTool/depthTool.ts

import { tool } from 'ai';
import { z } from 'zod';
import { getContents } from '../researchTool/exaSearch/exaClient';
import { extractFromDocument } from './extraction/agent';
import type { DepthToolOutput } from './types';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export const depthTool = tool({
  description:
    'Extract targeted information from a URL\'s full content. Returns structured findings with evidence.',
  inputSchema: z.object({
    url: z.string().url().describe('The URL to extract information from.'),
    objective: z.string().describe('What specific information to look for in this source.'),
  }),
  execute: async ({ url, objective }): Promise<DepthToolOutput> => {
    const start = Date.now();
    const currentDate = dateFormatter.format(new Date());
    let domain = '';
    try { domain = new URL(url).hostname.replace(/^www\./, ''); } catch { /* */ }

    const fullText = await getContents(url);
    const extraction = await extractFromDocument(fullText, objective, currentDate);

    const output = { ...extraction, url };
    const resultTokens = Math.round(JSON.stringify(output).length / 4);
    console.log(`[Depth]  ${domain} → "${objective.substring(0, 60)}" · ${extraction.findings.length} findings · ${Date.now() - start}ms · ~${resultTokens} tok`);

    return output;
  },
});


---


// app/api/chat/tools/depthTool/extraction/agent.ts

import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { extractionSchema } from './schema';
import { getExtractionPrompt } from './prompt';
import { withRetry } from '../../../lib/llmRetry';
import type { ExtractionOutput } from '../types';

export async function extractFromDocument(
  fullText: string,
  objective: string,
  currentDate: string,
): Promise<ExtractionOutput> {
  return withRetry(
    async (signal) => {
      const { object } = await generateObject({
        model: google('gemini-3-flash-preview'),
        schema: extractionSchema,
        prompt: getExtractionPrompt(fullText, objective, currentDate),
        abortSignal: signal,
      });

      return object;
    },
    'extraction',
  );
}


---


// app/api/chat/tools/depthTool/extraction/prompt.ts

/**
 * Generates the complete prompt for depth extraction.
 *
 * Takes a document's full text and an extraction objective,
 * returns a prompt that guides targeted information extraction
 * for the primary agent.
 */
export const getExtractionPrompt = (
  fullText: string,
  objective: string,
  currentDate: string,
): string => {
  return `You are an extraction agent. A primary reasoning agent identified this source during web research as worth investigating further. Your job is to extract the most relevant information and return structured findings that the primary agent can use — the full text won't be available to it, only your findings.

Guidelines:
- Prefer direct quotes as evidence — they're the most trustworthy and traceable form.
- Ground every finding in the actual text. No fabrication.
- Focus on the highest-value findings for the objective. Not every paragraph is worth extracting — quality over exhaustiveness.
- Be concise — return only what matters.

---

Current date: ${currentDate}

Extraction objective: "${objective}"

Document content:
${fullText}`;
};


---


// app/api/chat/tools/depthTool/extraction/schema.ts

import { z } from 'zod';

export const extractionSchema = z.object({
  findings: z.array(z.object({
    insight: z.string().describe('Key finding relevant to the objective.'),
    evidence: z.string().describe('Direct quote or specific detail from the source.'),
  })).describe('Targeted findings from the source.'),
  summary: z.string().describe('Brief overall assessment of what this source contributes.'),
});