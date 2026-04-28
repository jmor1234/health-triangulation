# Frontend Shell — Current State

The chat surface for Health Triangulation. Sits on top of the backend harness documented in `backend-harness.md`. The methodology-specific UI (calibration tier badges, layered report markers, per-perspective source attribution) is **not yet built** — mount points are flagged below.

---

## Status

**Built:**
- App Router shell — `/` redirects to `/chat` → latest thread (or fresh thread)
- Per-thread route `/chat/[threadId]` with remount-on-switch via `key={threadId}`
- Streaming chat via `useChat` + memo'd `DefaultChatTransport` (50ms throttle)
- Thread persistence via Dexie (`health-triangulation-threads`) with status-edge save (writes only on `streaming → ready`)
- Sidebar with thread CRUD: list, rename inline, delete, "+ New conversation," cookie-persisted collapse
- AI Elements primitives: `Conversation` (StickToBottom), `Message`, `Response` (Streamdown), `Reasoning`, `ToolStatus`, `Sources`, `PromptInput`, `Loader`, message copy/edit
- Edit-resubmit on user messages (truncates and re-streams from that turn)
- "Show previous" toggle keyed to last user message id (default view: last user→assistant pair only)
- Sources drawer auto-populated from inline citations in the latest assistant message
- Reasoning collapsible: auto-opens during streaming, auto-closes 1s after the last reasoning part settles (multi-step safe)
- Tool status indicator floats above composer during in-flight tool calls
- Dark mode via `next-themes` with system default; mode toggle in sidebar header
- Restrained accent system (single brand color, five surfaces only)

**Not built yet:**
- Calibration tier badges on assistant messages
- Layered report-analysis rendering (findings / interpretations / recommendations)
- Per-perspective source attribution (grouped sources)
- Compaction event surfacing in-stream
- User-belief structured interview UI
- File upload UI for health reports (the primitive `PromptInputAttachments` row is wired for drag-drop/paste; no toolbar trigger yet)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Chat client | `@ai-sdk/react` `useChat` + `DefaultChatTransport` |
| Streaming markdown | `streamdown` (memo'd `Response` wrapper) |
| Persistence | Dexie / IndexedDB |
| Theming | `next-themes` (`attribute="class"`, system default) |
| Auto-scroll | `use-stick-to-bottom` |
| Component baseline | ShadCN `radix-nova` style on `neutral` baseColor + Tailwind v4 |
| Sidebar | ShadCN `Sidebar` (cookie-persisted open state) |
| Icons | `lucide-react` |

---

## Visual Direction

**Neutrals + one accent.** Vercel/Linear/Notion register: clean, modern, restrained.

### Accent token

| | Light (`:root`) | Dark (`.dark`) |
|---|---|---|
| `--accent-brand` | `oklch(0.62 0.11 235)` | `oklch(0.72 0.13 235)` |
| `--accent-brand-foreground` | `oklch(0.985 0 0)` | `oklch(0.145 0 0)` |
| `--accent-brand-muted` | `oklch(0.62 0.11 235 / 0.10)` | `oklch(0.72 0.13 235 / 0.18)` |

Hue 235 = desaturated cool blue. Chroma bumps in dark mode to compensate for absorption on dark backgrounds. Two CSS lines to swap. Aliased under Tailwind v4's `@theme inline { --color-accent-brand: var(--accent-brand) }` so `bg-accent-brand` / `text-accent-brand` utilities work.

### The five accent surfaces

1. **Composer submit** when ready and content present — `bg-accent-brand text-accent-brand-foreground`
2. **Tool status pill** — `bg-accent-brand-muted text-accent-brand` with pulsing dot
3. **Active sidebar thread title** — `data-[active=true]:text-accent-brand` (bg stays neutral `--sidebar-accent`)
4. **Composer + submit focus rings** — `focus-visible:ring-accent-brand/40`
5. **Reasoning duration dot** — `bg-accent-brand` while streaming, `bg-muted-foreground` when settled

Everything else (sources drawer, hover-reveal action buttons, citations, error banner, sidebar inactive items) stays neutral.

### Other deliberate choices

- **User message bubble:** `bg-secondary` (subtle neutral), not `bg-primary` — primary is near-black/near-white in this neutral palette and would land too heavy.
- **Streamdown link color:** `text-primary`, not branded. Citations are ubiquitous; brand color would drown out the actual accent surfaces.
- **Body background:** solid `bg-background`. No gradient.
- **Typography:** Geist + Geist_Mono only.

---

## Architecture

```
app/
├── layout.tsx                  ThemeProvider + TooltipProvider, Geist fonts, themeColor viewport
├── globals.css                 Theme tokens, accent-brand aliases, Streamdown typography, layout offsets
├── page.tsx                    Server redirect → /chat
├── chat/
│   ├── layout.tsx              SidebarProvider (cookie-driven defaultOpen) + AppSidebar + SidebarInset
│   ├── page.tsx                Client: navigate to latest thread or create fresh
│   └── [threadId]/
│       ├── page.tsx            Server: <ChatPage key={threadId} threadId={threadId} />
│       └── chat-page.tsx       Client: usePersistedChat → ChatView
└── components/
    ├── chat-composer.tsx       Mobile-fixed / desktop-sticky composer, accent submit, attachments row
    └── message-renderer.tsx    Dispatches on part.type (text → Response, reasoning → Reasoning, file → Image, tool → null)

components/
├── theme-provider.tsx          next-themes wrapper
├── mode-toggle.tsx             Sun/Moon dropdown (Light / Dark / System)
├── app-sidebar.tsx             Thread list, CRUD, active accent, mode toggle
├── chat-view.tsx               Visibility toggle, edit-resubmit, sources extraction, tool-status, error banner
└── ai-elements/
    ├── conversation.tsx        StickToBottom wrapper + scroll button
    ├── message.tsx             User bubble (bg-secondary), assistant document-style
    ├── response.tsx            Memo'd Streamdown (mode="streaming" while live)
    ├── reasoning.tsx           Auto-open/close, duration dot, last-part-keyed timer
    ├── tool-status.tsx         Accent pill, pulsing dot
    ├── sources.tsx             Collapsible drawer, favicon-prefixed list, dedupe-cap-8
    ├── prompt-input.tsx        Compound: PromptInput / Textarea / Toolbar / Submit / Attachments
    ├── loader.tsx              Vercel-style spoke spinner
    ├── message-copy.tsx        Hover-reveal copy button
    ├── message-edit-button.tsx Hover-reveal edit button
    └── message-inline-editor.tsx Inline textarea for edit-resubmit

hooks/
├── use-mobile.ts               useSyncExternalStore breakpoint observer (React 19 lint-clean)
├── use-thread-persistence.ts   Status-edge save (only on streaming → ready)
└── use-persisted-chat.ts       useChat wrapper: useMemo'd transport, throttle, cleanup-on-unmount stop

lib/
├── thread-store.ts             Dexie schema + CRUD + title/preview derivation
├── message-utils.ts            extractMessageText, extractCitationUrls
└── utils.ts                    cn + canonicalizeUrlForDedupe
```

---

## Key Behaviors

### Thread switching without state leak
`<ChatPage key={threadId} />` in `app/chat/[threadId]/page.tsx`. The `key` is load-bearing: it forces remount when the thread id changes, so `useChat` reinitializes with the new thread's persisted messages. Without it, messages from thread A would bleed into thread B.

### Transport identity stability
`new DefaultChatTransport({ api: '/api/chat' })` is wrapped in `useMemo(..., [])`. Inline construction would re-fire `useChat`'s internal effects on every render → torn streams or duplicate messages. `experimental_throttle: 50` lives on `useChat` itself, not on the transport.

### Status-edge persistence
`use-thread-persistence` writes only on the `streaming → ready` transition. Avoids per-token IndexedDB writes during streaming and avoids the empty-then-saved race on first message.

### Reasoning auto-close in multi-step loops
The auto-close timer is keyed on the timestamp of the **last reasoning part**, not on `status`. Multi-step status flicker (`streaming → ready → streaming` between tool calls) would otherwise prematurely close the collapsible.

### Sources extraction
`extractCitationUrls` regex-matches markdown links in the latest assistant message text, dedupes via `canonicalizeUrlForDedupe` (lowercase host, strip `www.`, drop trailing `/`, strip `utm_*`), preserves first-seen order. Drawer renders only when the message is settled (`!isStreaming`).

### Message visibility default
Last user→assistant pair only. "Show previous" toggle is keyed to the **last user message id**, so when a new turn arrives the toggle resets. Lets long threads stay readable without dropping history.

### Empty state lives outside `<Conversation>`
`<StickToBottom.Content>` doesn't honor `flex-1` from inside, so the centered empty state is hoisted into ChatView's outer flex container. (Lesson learned during implementation.)

### Edit-resubmit
User messages get a hover-reveal edit button, gated on `status === 'ready'` and no file parts in that message. Save calls `sendMessage({ text, messageId })` which truncates that turn and re-streams from there.

---

## Theme + Layout Tokens

`app/globals.css` adds layout offsets that the composer + container respect:

```css
:root {
  --container-max-w: 840px;
  --composer-offset: 7rem;
  --composer-offset-mobile: 9rem;
}
```

Plus Streamdown typography selectors (`[data-streamdown="..."]`) that style paragraph / heading-1..3 / lists / link / inline-code / code-block / blockquote / table / horizontal-rule using theme tokens, not hardcoded oklch. Streamdown is pinned (its `data-streamdown` attribute selectors are the typography contract — caret-major drift would silently break styling).

---

## Risks Encoded in the Implementation

These are the bugs the code is actively defending against. Worth knowing before refactoring:

- **R1 — Transport identity:** must stay `useMemo`'d (see `use-persisted-chat.ts`)
- **R2 — `experimental_throttle` placement:** on `useChat`, not on transport
- **R3 — `key={threadId}`:** load-bearing on `<ChatPage>`; do not remove
- **R4 — `next-themes` hydration:** `suppressHydrationWarning` on `<html>` is required (FOUC + console warning otherwise)
- **R5 — Sidebar cookie:** read server-side in `app/chat/layout.tsx`. Reading client-side causes wrong-sized first paint that re-flows on hydration.
- **R6 — Streamdown version drift:** `data-streamdown="..."` selectors are the typography contract; eyeball after upgrade
- **R7 — Tailwind v4 token aliasing:** new tokens need BOTH `:root`/`.dark` declarations AND `@theme inline { --color-... }` aliases for `bg-*` / `text-*` utilities
- **R8 — Reasoning auto-close timer:** keyed on last reasoning part timestamp, not global `status`
- **R9 — `display: 'summarized'` reasoning visibility:** route already sets it; `message-renderer` must dispatch `reasoning` parts to `<Reasoning>`
- **R10 — Tool result rendering:** `message-renderer` returns `null` for tool parts; otherwise raw JSON renders inline
- **R11 — IndexedDB private-mode:** Dexie writes can fail; persistence is wrapped to fail soft
- **R12 — Edit + mid-stream:** edit save guarded on `status === 'ready'`

---

## Mount Points for Methodology UI

These are the seams already shaped to receive the methodology surfaces. Not implementations — locations.

| Surface | Where it mounts | Data shape |
|---|---|---|
| **Calibration tier badges** | `chat-view.tsx`, between `<MessageRenderer>` and `<Sources>` on assistant branch | Custom UI message part, e.g. `data-calibration: { tier, notes }` written by route via `writer.write({ type: 'data-calibration', value: ... })`. Tier color uses a separate token family (`--tier-confirmed`, `--tier-overstated`, etc.) — **NOT** `--accent-brand` — so verdicts read as their own semantic surface. |
| **Layered report-analysis** | New `components/ai-elements/report-layers.tsx`, mounted via a `data-report` part type | Backend signals layer markers (findings / interpretations / recommendations); not text-heuristic. |
| **Per-perspective source attribution** | Extend `SourceList` with optional `groups: { label, sources }[]` prop | Backend tags each citation with `perspective`. Existing flat list stays as default. |
| **Compaction event notice** | New `components/ai-elements/context-edit-notice.tsx`, inline between message blocks in `chat-view.tsx` | Route emits `data-context-edit` part inside `onFinish`'s applied-edits loop. Single-line neutral notice. |
| **User-belief interview** | New `components/ai-elements/interview-form.tsx`, dispatched in `message-renderer.tsx` via `data-interview` part type | Structured question set surfaced by the system prompt / schema. |

---

## Verification Status

- `npx tsc --noEmit` — clean
- `npm run lint` — clean
- `npm run dev` — serves `/chat/<id>` cleanly; mode toggle works without hydration warning; sidebar collapse persists across reload
- End-to-end smoke (sent test queries via the live shell): submit accent, streaming markdown, tool status pill, reasoning collapsible, sources drawer, copy button, edit-resubmit, thread switching, dark mode mid-stream — all green
- IndexedDB inspected: `health-triangulation-threads` populated with title/preview derivation working

---

## What's Next

Frontend-side, in approximate order — all gated on the methodology layer landing first:

1. **Calibration tier UI** — once the system prompt + schema decide the tier mechanism, render badges at the mount point above with the separate token family
2. **Report upload + layered rendering** — file part wiring is partially in place via `PromptInputAttachments`; needs a toolbar trigger and the `report-layers.tsx` component
3. **Per-perspective source grouping** — minimal SourceList extension once the backend tags citations
4. **Compaction notice** — one-line component mounted on `data-context-edit` parts
5. **User-belief interview component** — structured form surfaced via custom part type when the system prompt initiates an interview turn

The shell is the foundation. The methodology is what gives it meaning.
