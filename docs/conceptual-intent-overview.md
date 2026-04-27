# Health Triangulation App — Concept

A first-principles, intent-based outline. Technical implementation deferred.

---

## What This Is

A per-query application that takes the rigorous epistemic methodology used to verify Ray Peat's health claims — full-context primary-source extraction paired with calibrated honest assessment under research-context awareness — and **generalizes it as a conversational tool for any health-related perspective**.

The user can ask:

- *What does this person actually say about this topic?*
- *What do these people each say, and where do they really disagree?*
- *What does my own current thinking look like under examination?*
- *What does this health report I just got actually mean — at every layer?*
- *And — across any of these — what does the best current evidence honestly support?*

The output is not authority. It is **rigorous triangulation, transparently shown, calibrated to what the evidence honestly supports**.

---

## Why This Matters

The current options for someone trying to understand a health topic are all systematically biased:

- **Mainstream care** delivers paradigm-bound interpretations and recommendations, often without showing the paradigm or its constraints.
- **Alternative voices** operate under their own paradigms and commercial incentives, often presenting equally confident verdicts from a different ideological stance.
- **Doing your own research** is a full-time job, and most people lack the methodology training to read evidence with full context awareness.
- **Asking AI today** reproduces training-data consensus with no transparency about whose perspective is being represented or what is being filtered out.

The gap is **rigorous triangulation that is both transparent and honestly calibrated** — neither mainstream-defending nor contrarian, neither flattering nor confrontational. Something that gives a curious person the picture they would build for themselves if they had the time, training, and discipline.

---

## The First-Principles Core

Three load-bearing primitives. Every variation of every mode is the same deep operation applied to different inputs and combinations. Compromise any one of these primitives and the whole thing collapses no matter how polished the rest is.

### 1. Faithful Full-Context Extraction

Whatever the input — a public figure's stated position, a user's own belief, a health report's recommendation — reconstruct it as the *complete picture in its own logic*. Reasoning chains, not isolated claims. Connections to adjacent beliefs. Evolution over time when relevant.

This is scale-invariant: the principle that produced trustworthy Peat extractions applies identically to a 20-second user-interview answer or a 3-page lab recommendation.

Without faithful extraction, every downstream step is comparing strawmen. No careful evaluation salvages it.

### 2. Context-Aware Reading

Every input lives inside a paradigm and incentive structure that shapes what it includes and excludes. Mainstream studies, alternative practitioner claims, health reports, the user's own beliefs, the agent's own training-data instincts — all of them. The agent must see:

- Who produced the input
- What comparison it's embedded in
- What timescale it covers
- What endpoints it measures
- What disciplinary fragmentation surrounds it
- What's commercially or paradigmatically distorting it

Without context-aware reading, paradigm bias is smuggled in as truth from any direction — mainstream, alternative, commercial, or the agent's defaults.

### 3. Calibrated Honest Verdict That Holds Under Pressure

Six-tier or equivalent honesty: **confirmed / confirmed with nuance / partially supported / overstated / speculative / not supported**. The verdict must hold under chat dynamics, user pushback, and the pull toward agreeable consensus.

Without calibrated honesty, output collapses into either advocacy ("you're right") or dismissal ("they're wrong"), and the most important pattern — *right destination, wrong route* — becomes invisible.

---

## Who It Serves

The full spectrum of health-engaged users:

- The **casually curious** person who follows a few influencers and wants reality-checks before changing anything
- The person with a **specific concern** trying to evaluate what providers, influencers, and their own instincts each say
- The **serious optimizer** who already reads deeply and wants a sharper triangulation tool
- The **skeptic** who's been burned by mainstream care and wants honest navigation through alternatives without falling into contrarian traps

The methodology's calibrated honesty is what serves all of them. It doesn't flatter the skeptic by attacking mainstream consensus. It doesn't reassure the curious by deferring to authority. It doesn't impress the optimizer with confident-sounding training-data restatements. It shows them what the picture actually looks like when held to a rigorous standard.

---

## Scope

**Anything health or biology related, directly or indirectly. No artificial limits.** Biomedical, nutrition, supplements, exercise, sleep, mental health, longevity, alternative practices, biohacking, environmental factors, pharmaceuticals — all in scope.

The methodology is what handles contested or fringe topics, not topical avoidance. The same calibrated honest assessment applies whether the question is about beta-blockers, fasting protocols, or peptides. Refusing to engage with a topic on ideological grounds would itself be a paradigm bias.

---

## What It Does — The Modes

Every mode is a different combination of inputs running through the same three primitives.

### Solo Extraction

> *"What does X actually say about Y?"*

The agent extracts the figure's complete reasoning chain on the topic from primary sources, including evolution of view if relevant, and presents it faithfully. No commentary on whether they're right unless the user asks.

### Comparison

> *"What do X and Y each say about Z?"*

Faithful extraction for each, then a clear rendering of where they actually agree, where they actually disagree, and where they're talking past each other — different definitions, different timescales, different evidence base.

### Triangulation Against Evidence

> *"...and what does the best current evidence honestly support?"*

The agent applies the same calibrated honest verdict it would in any verification pass — neither mainstream-defending nor contrarian — including the *right destination, wrong route* pattern when it applies, and "the evidence is genuinely mixed here" when it is.

### User as Perspective

The user's own current thinking can be one of the perspectives in the analysis. Acquired through brief, well-chosen interview questions — never overbearing, never patronizing. The user's position gets the same calibrated honest treatment as any figure's. Sometimes confirmed. Sometimes *right destination, wrong route*. Sometimes overstated or unsupported.

**The discipline does not change because the subject is in the room.**

### Health Report Analysis

Upload a report — mainstream lab, functional medicine workup, longevity panel, anything — and the agent evaluates it across **three distinct layers**, each with different reliability profiles and different distortion patterns:

| Layer | What it is | Where the distortion lives |
|---|---|---|
| **Findings** | The empirical measurements (TSH 3.2, fasting glucose 95, etc.) | Usually most reliable, but the *choice of what to test* already encodes assumptions |
| **Interpretations** | The bridge from data to meaning ("normal," "high," "low") | Most distortion. Reference ranges and "normal" judgments are paradigm-encoded |
| **Recommendations** | The action layer (start a statin, take this supplement, follow this protocol) | Commercial and paradigm interests bite hardest. Stakes are highest |

The provider's epistemic profile is identified first — mainstream lab + GP, functional practitioner, longevity clinic, online testing company — each carries different distortion patterns to look for.

### Composition

**Modes combine freely within a query.** "Here's my report + here's what I currently think + what would Peat say + what does best evidence support" produces a four-way triangulation across data, the user's interpretation, a thinker they trust, and the rigorous evidence read. Nothing currently gives a curious person this kind of integrated view.

---

## How It Works — The Operating Cycle

### 1. Scoping

Before any research begins, the agent confirms what's actually being asked: who, what topic, comparison or solo, current view or evolution, evidence triangulation included or not. The Peat methodology's phase gates compressed to chat speed: **clarity before action**. Premature work against an unclear question produces an answer to the wrong question.

### 2. Acquisition

Method varies by input type. The same epistemic care that governs evidence evaluation also governs source selection — whose representation is reliable, what medium captures the considered position, when is a clip representative vs. cherry-picked.

- **Public figure:** web search with discretion. Weight long-form considered content over fragments. Weight original utterances over characterizations of them. Weight primary sources over secondary write-ups. Factor in medium and recency.
- **User:** brief, high-leverage interview questions designed to surface reasoning chains and implicit assumptions. Default to light. Offer to go deeper if the user wants.
- **Report:** parse the document directly. Identify the provider's epistemic profile before evaluating layers.

### 3. Extraction & Analysis

The three primitives operate on whatever was acquired. Full reasoning chains. Phase 2 lens applied. Calibrated verdicts where verdicts are warranted. Honest "the evidence is mixed" or "X hasn't said much about this" where they're warranted instead.

### 4. Output

Free-form analytical prose with clean markdown formatting and inline citations, integrated into chat, dynamic and contextual. Transparency is non-negotiable: **sources visible, methodology traceable, calibration explicit, uncertainty acknowledged where it exists**. The user reads the agent's reasoning, not the agent's authority.

### 5. Interactive Follow-Up

The user can probe, push back, ask "but what about X." The agent maintains the calibrated honest stance under follow-up pressure:

- Does **not** soften verdicts to match user preference
- Does **not** harden them to seem authoritative
- Does **not** abandon "the evidence is genuinely mixed" because the user wants a cleaner answer

Discipline holds across the conversation, not just in the first response.

---

## What's Invariant vs. What Varies

### Invariant — load-bearing, cannot compromise

- Faithful full-context extraction for every input
- Context-aware (Phase 2) reading applied to every input
- Calibrated honest verdict that holds under pressure
- Transparency: sources, methodology, calibration, and uncertainty visible
- Scoping clarity before extraction
- Honesty over comfort in user-facing output

### Variable — knobs, can be tuned freely

- Input types (figure, user, report, arbitrary text)
- Acquisition method per input type
- Number of inputs compared (one, two, many)
- Whether evidence is one of the inputs
- Output length and structural form
- Depth/speed tradeoff
- Persistent context vs. ephemeral
- Single-topic vs. multi-topic
- Composition of modes within a query

**If the invariants hold, every variation is sound. If any invariant degrades, no amount of feature design recovers it.**

---

## Operating Principles

### Transparency Is the Trust Mechanism
The user does not trust the agent because it sounds confident. The user trusts the agent because they can see what it consulted, how it weighed it, where it's certain and where it isn't. The methodology lives on the surface, not under the hood.

### Same Calibration for Every Subject
Whether the perspective being assessed is Ray Peat, a mainstream cardiologist, a functional practitioner, the user's own belief, or a longevity clinic's recommendation — the same six-tier honest scale applies. **No one gets graded easier because they're popular, fringe, charismatic, or in the room.**

### Neither Mainstream-Defending Nor Contrarian
Both have systematic distortions. Both produce confident-sounding wrong answers in different patterns. The agent's job is to see through both, not to side with either.

### Right Destination, Wrong Route Stays Visible
The dominant Peat finding was that someone could be right about *where* without being precisely right about *how*. That nuance is preserved at every level. Verdicts don't collapse into "right" or "wrong" when the actual picture is *right outcome, mechanism more upstream than claimed* or *directionally correct, overstated in absolute version*.

### Honest "I Don't Know"
When evidence is thin, when the figure hasn't said much, when sources contradict each other, when the question genuinely isn't settled — the agent says so. *"The evidence here is genuinely mixed"* and *"X hasn't said much specifically about this — here's the closest I found"* are real outputs, not failures.

### Informative, Not Prescriptive
On health topics where the user might act on the analysis (start or stop a medication, follow or reject a protocol), the agent lays out the picture honestly with calibrated uncertainty and **explicitly hands the decision back**. The user remains the decision-maker. The agent's job is to give them the rigorous picture they didn't get elsewhere.

---

## Boundaries

- **The agent is not a clinician.** It analyzes evidence, frameworks, and recommendations rigorously. It does not prescribe, diagnose, or override clinical judgment. It is an analytical mirror, not a treatment plan.
- **The agent does not flatter.** Users who want agreement with their existing beliefs may not get it. Methodology integrity is the product; sycophancy would destroy it.
- **The agent is not a fact-database with personality.** It does not pattern-match to training data when fresh research and primary-source extraction are needed. Each query gets the methodology applied case-by-case, not retrieved from internalized consensus.
- **The agent does not pre-filter topics by ideological comfort.** Anything health or biology related is in scope. The methodology is what handles contested topics, not topical avoidance.

---

## Why This Generalizes From the Peat Work

What the Peat verification project built was the three primitives operating at one specific scale: one figure, one framework, multi-month depth, vault accumulation. The discipline that produced trustworthy Peat extractions — primary sources, full reasoning chains, Phase 2 research context, calibrated honest assessment, no advocacy or dismissal, no delegation of integration — is the same discipline this app applies at chat speed across any health figure, any user, any report.

**Strip the scale, keep the primitives, drop the vault accumulation, and you have an application that does the same epistemic operation in any session, on any topic, for any perspective.**

The methodology was always more general than its first instantiation. This app is what the methodology looks like when it is released from its specific origin and made available wherever a curious person needs it.

---

## What Success Looks Like

The user finishes a session understanding their topic better than they did before — not because the agent told them what to think, but because the agent showed them what the picture actually looks like when held to a rigorous standard. They saw the sources. They saw the calibration. They saw where the evidence is solid and where it isn't. They saw where the figures they follow are right, where they're partially right, and where they're overreaching. They saw their own beliefs reflected honestly. And they walked away holding the decision themselves, with materially better grounds for making it.

If the app delivers that, it is doing something nobody else currently does at consumer scale.

If at any point the methodology degrades — if extraction becomes shallow, if Phase 2 gets skipped, if verdicts flatten to advocacy or sycophancy, if transparency disappears — the app reverts to one more confident-sounding chat tool and loses the only thing that made it worth building.

**The methodology is the product. Everything else is presentation.**
