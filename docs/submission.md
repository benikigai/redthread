# Red Thread — Submission Package

> Paste-ready copy for the Devpost / hackathon submission form.
> Each section is self-contained. Match each to the form field of the same name.

---

## Tagline (≤ 200 chars)

> The agentic operating system for luxury hospitality. A Sense of Place, threaded through every guest — gated by a Discretion Layer she controls.

---

## Inspiration

Rosewood's brand promise — trademarked since 1979 — is **A Sense of Place**. Every property is meant to feel rooted in *where it is*: oak woodland at Sand Hill, Victoria Harbour at Hong Kong, an 18th-century palace at the Crillon. Sonia Cheng's framing for what the staff do inside those properties is **Relationship Hospitality** — service that remembers you across stays.

But the operating system underneath is cookie-cutter. The same welcome amenity template. The same itinerary scaffolding. The same room defaults regardless of who's walking in or what they loved last time. The *promise* is bespoke. The *implementation* is generic.

We came to Hospitality 2030 to close that gap.

---

## What it does

Red Thread is an agentic operating system for luxury hospitality. Given a guest, a property, and a flight number, it produces a live **Dossier** — a structured commitment to what the property will do for this specific guest on this specific stay.

The Dossier is built in four zones, mirrored in the UI:

1. **Research streams** — parallel tool calls (flight tracking, CRM cross-property history, public-signal web search, placemaker lookup, calendar). The agent runs them concurrently; each completes into a card.
2. **The brief** — front-desk view: one-line bio, conversation hooks the concierge can drop naturally, handle-with-care notes, and a "Brief me" button that streams a 20-second voice summary via ElevenLabs.
3. **Actuators** — the *commitments*. Room state preset (temperature, lighting, scent, bedding), welcome amenity (locally sourced, with story), pre-loaded itinerary (signature experiences from this property's placemaker network). Each carries reasoning and a citation back to the source signal.
4. **Live thread** — the timeline view. Pre-arrival → on-property → post-stay, with the same guest's signals threaded through.

The demo move is the **property switcher.** One guest — Ms. Lin Chen — across three Rosewood properties:

- **Sand Hill (Menlo Park):** Frog Hollow Bartlett pears, Windy Hill morning hike, The Sea pescatarian tasting, room at 19°C with cedar scent.
- **Hong Kong (Victoria Dockside):** Hand-painted Kee Wah mooncake, Tai Chi on the Asaya rooftop, Yat Lok roast goose, sandalwood scent matching her last stay.
- **Hôtel de Crillon (Paris):** Pierre Hermé macarons, Musée d'Orsay pre-opening, Les Ambassadeurs pescatarian tasting, rose absolute scent.

Same guest, same history, same agent loop — radically different bespoke arrival. That's **A Sense of Place** made operational instead of aspirational.

The guest controls the depth of all this through one slider — **Hold the Thread** — on her own profile screen at `/profile`. Ten positions, three bands: *Loosely held* (dietary + room only), *Held* (professional accomplishments), *Fully held* (with calendar adjacency and cross-property continuity). The dial is in the guest's hand; the concierge dashboard *mirrors* the current setting read-only with a preview affordance for training. The floor of what we refuse to surface — health, romance, family, non-public sources — never moves with the dial. **The guest trades anticipation depth, not safety.**

Underneath everything: the **Discretion Layer.** A second model (Claude Haiku 4.5) runs after the research pass with one job: honor the dial and remove what crosses the line. Lin Chen has Hold the Thread set to *Held* (POS 62) → professional accomplishments and stay preferences kept; family, wealth, romance, health, and any surveillance-feeling content stripped. Every removal is logged into `Dossier.suppressed[]` — the guest reads her own log; the property reads its own audit trail; same data, two compliance stories.

And as a 2030 forward bet, we publish `/.well-known/agent.json` — a static manifest describing how a guest's personal agent can hand off preferences to the property's agent, so the next generation of guests don't have to fill out forms.

---

## How we built it

**Stack:**
- **Next.js 16** + App Router + TypeScript + Tailwind v4
- **Anthropic SDK** — `claude-opus-4-7` for the research/synthesis agent loop, `claude-haiku-4-5` for the Discretion Layer
- **ElevenLabs** (Alice voice, `eleven_turbo_v2_5`) for the front-desk voice brief
- **AviationStack** for flight data (with deterministic mock fallback)
- Marketing site on **Cloudflare Pages** at [redthread.boutique](https://redthread.boutique); demo app on **Vercel** at [app.redthread.boutique](https://app.redthread.boutique)
- **`bun`** as package manager and runtime

**Architecture:**

We built in two parallel terminals under a written working agreement:

- **T1 (frontend)** owns `src/components/**` and `src/app/page.tsx` — the four-zone dashboard, property switcher, voice playback, Sense-of-Place editorial styling (Cormorant Garamond + Inter, rosewood palette).
- **T2 (backend)** owns `src/app/api/**` and `data/**` — the agent loop, tool dispatcher, Discretion Layer, CRM, flight lookup, voice route, `agent.json`.
- **`src/lib/types.ts`** is the seam — additive changes welcome on either side; renames require sync.
- A **T3 process node** wrote the submission package, demo runbook, and judge talking points in `docs/`.

The contract is structural: `Dossier` is the shape both sides agree on. T2 produces it; T1 renders it. JSON by default; SSE opt-in via `Accept: text/event-stream` for the streaming "tool calls animating in" judging spectacle.

**Tool layer:**

The agent has three tools:
- `web_search` — Claude's native server tool, for public signals about the guest
- `crm_cross_property` — our handler, reads prior stays from JSON
- `flight_lookup` — env-aware, hits AviationStack if keyed, deterministic mock otherwise

Every tool call is captured into a `ToolCallTrace` and surfaced in the UI as a "research stream" card with status (`queued` → `streaming` → `complete`).

**Discretion Layer:**

Separation-of-concerns is the design move. The research model (Opus 4.7) is asked to be helpful and thorough. The filter model (Haiku 4.5) is asked to be boring and skeptical — its system prompt explicitly refuses speculation about wealth, romance, family, health, minors, or non-public sources. POS bands the strictness:

- **0–30:** strip everything personal except dietary and room preferences
- **31–69:** keep professional accomplishments only
- **70–100:** pass through, but redact anything that reads as surveillance

Every removal lands in `Dossier.suppressed[]` as `{ signal, reason }`. The property has a full audit trail of what the system chose not to say.

**Demo insurance:**

`DEMO_MODE=1` short-circuits the agent loop and replays pre-captured fixture dossiers — JSON in JSON mode, SSE events with realistic per-event delays in streaming mode. Three fixtures cover Lin Chen × {Sand Hill, Hong Kong, Crillon}. The demo runs without a network if we have to.

---

## Challenges we ran into

**1. Next.js 16 is not the Next.js anyone has trained on.**
Route handler conventions, streaming patterns, and `runtime`/`dynamic` exports all shifted. We added a top-level `AGENTS.md` flag — *"This is NOT the Next.js you know — read `node_modules/next/dist/docs/` before writing code"* — so every contributor (human and agent) checks the actual installed docs before guessing.

**2. Two terminals editing one repo without stepping on each other.**
Solved with a written working agreement codified in `README.md`: T1 owns components + page, T2 owns api + data, `src/lib/types.ts` is the contract (additive-only on hot paths). The Dossier shape was the unit of negotiation — once it stabilised, both sides could move independently.

**3. The right place to put the Privacy Openness Score.**
First instinct was a separate `computePOS()` Claude call. We dropped it. POS is a guest-overridable number on the Guest record, full stop. The Discretion Layer reads it directly and bands strictness. Simpler, deterministic, and the guest's preference — not the model's inference — drives discretion.

**4. JSON vs. SSE for the agent endpoint.**
T1 had already shipped a stub returning JSON; their fetch code expected JSON. We needed SSE for the "tool calls animating in" spectacle. The compromise: JSON by default, SSE as opt-in via `Accept: text/event-stream`. T1's existing code keeps working; T1 flips to SSE when ready. Zero conflict.

**5. Wifi at a venue you've never demoed at.**
We assumed it would fail. `DEMO_MODE=1` + pre-captured fixtures + a backup video on phone. Three fallback layers.

---

## Accomplishments we're proud of

- **The property switcher works.** Same guest, three radically different bespoke arrivals — generated live. The anti-cookie-cutter promise is on screen.
- **Hold the Thread — the dial in the guest's hand.** A single slider on the guest's profile decides the depth of every dossier. Drag it on stage and the dossier visibly breathes; the Discretion Layer enforces the setting, the audit log records every removal, the floor of refused content never moves. The slider IS the proof of the privacy posture.
- **The Discretion Layer is a first-class data field, not a hand-wave.** `Dossier.suppressed[]` ships with every dossier. Auditability is the product, not the disclaimer.
- **Two-terminal parallel build under a written contract.** No merge conflicts, no rework. Working agreement in `README.md`; type contract in `src/lib/types.ts`; commit log proves both sides shipped continuously.
- **Forward-compatible agent-to-agent manifest.** `/.well-known/agent.json` is a real artifact at a real URL, not a slide.
- **Brand fidelity.** Every term we use — *A Sense of Place*, *Relationship Hospitality*, *Affluential Explorer*, *Discovery*, *Hold the Thread* — is Rosewood's own language or a faithful extension of it. The microcopy reads *"Threading the dossier…"* instead of *"Loading…"*

---

## What we learned

**The defensible product in luxury AI is what it refuses to say, not what it says.** Every team in this room can wire up a chatbot. The Discretion Layer — a model whose only job is to remove things, with an audit log of every removal — is the part that makes a Rosewood-class brand willing to ship.

**Sense of Place is a data structure, not a vibe.** Once `senseOfPlace`, `placemakers`, `amenityOptions`, and `signatureExperiences` are typed JSON, the agent can reason against them deterministically. Each new property is a single file.

**The dossier is the unit of negotiation between teams.** Type-first development with one shared contract collapsed coordination overhead. Two terminals, zero rebases.

**Separation-of-models beats one-model-with-a-careful-prompt.** Opus 4.7 is asked to be helpful; Haiku 4.5 is asked to be skeptical. They argue, the user wins. Cheaper too — Haiku is 10× less per token on the filter pass.

---

## What's next for Red Thread

- **Concierge mirror in the dashboard.** The dial is shipped on the guest side at `/profile`; the concierge variant (read-only mirror with preview affordance) is built and ready to drop into Zone II of the dashboard — *"Hold the Thread · 6 (Ms. Chen's preference · preview)."*
- **In-stay signal capture.** Today the thread is "cast" (pre-arrival) and "continues" (post-stay). Movement II — held on-property — is wired in the UI but needs a real ingest layer: housekeeping notes, F&B orders, spa bookings.
- **Property-portable rollout.** The architecture is already property-agnostic; the path is one JSON file per property + one auth scope per property manager.
- **Agent-to-agent handoff, end-to-end.** `/.well-known/agent.json` is the manifest. Next is the actual negotiation flow with a reference guest-side agent — including the guest agent declaring its principal's Hold the Thread setting up front, so the property can pre-honor it before any data is exchanged.
- **EU AI Act + GDPR conformance evidence pack.** The audit trail is already in `Dossier.suppressed[]`; the guest-controlled dial is the consent surface. Wrap them in a compliance-grade report and the regulatory story writes itself.
- **Multi-property guests as a graph.** Lin Chen at Hong Kong, then Sand Hill, then Crillon — the thread is a graph, not a list. Surface that explicitly: "she'll see Lock Cha's protégé at the Crillon because she loved Lock Cha in Hong Kong."

---

## Built with

`next.js` · `typescript` · `tailwindcss` · `bun` · `anthropic` · `claude-opus-4-7` · `claude-haiku-4-5` · `elevenlabs` · `aviationstack` · `vercel` · `cloudflare-pages`

---

## Try it yourself

- **Marketing:** [redthread.boutique](https://redthread.boutique)
- **Live dossier:** [app.redthread.boutique](https://app.redthread.boutique)
- **Ms. Chen's profile (the dial):** [app.redthread.boutique/profile](https://app.redthread.boutique/profile)
- **GitHub:** [link to be added]
- **Agent manifest:** [app.redthread.boutique/.well-known/agent.json](https://app.redthread.boutique/.well-known/agent.json)

Switch between Sand Hill, Hong Kong, and the Crillon — watch the same Ms. Chen get three completely different bespoke arrivals. Then open her profile and drag *Hold the Thread* from 6 → 2 → 9; watch the dossier breathe in real time.

---

## Team

[Fill in: names, roles, contact, headshots if Devpost asks]
