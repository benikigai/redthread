# Red Thread

> An agentic operating system for luxury hospitality.
> A Sense of Place, threaded through every guest.

Built for **Hospitality 2030 · Rosewood Sand Hill Hackathon** (2026-05-16).
Live demo: **[app.redthread.boutique](https://app.redthread.boutique)** · Agent endpoint: **[elias.redthread.boutique](https://elias.redthread.boutique)** · Schema: **[/.well-known/agent.json](https://app.redthread.boutique/.well-known/agent.json)**

---

## What it actually does

A live, single-URL dashboard at `app.redthread.boutique` where you can:

1. **Submit a reservation** — toggle between two pre-set guests (Benjamin Shyong / Ms. Lin Chen), edit any of five fields (name, email, reservation #, flight #, departure date), and Hold the Thread (the guest's 0–10 Privacy Openness Score) is mirrored from their profile.
2. **Watch the agent work** — Begin briefing runs a 9-step live chain: CRM cross-property → 3 web-research steps (LinkedIn / X / press, gated by Hold the Thread) → AviationStack flight lookup → Claude Haiku reasoning for luggage, customs, transit → ETA composition. Each card streams reasoning tokens, expands on click to show the exact input, result, tech provenance, and timing.
3. **See the brief render** — the full Claude Opus + Haiku Discretion pass produces a Dossier that lands in the three editorial zones: research streams, the brief, actuators (room state, welcome amenity, itinerary).
4. **Listen to the brief** — Brief Me button plays an ElevenLabs TTS read of the composed dossier through the AV.
5. **Run the A2A handoff** — Agent handoff button kicks a live two-machine conversation: **Threadkeeper** (Rosewood-side, on Vercel) talks to **elias** (Ben's personal AI, on a Mac Mini in his house, exposed via a Cloudflare tunnel). Real Claude on each side; structured manifest extracted; dashboard rerenders with the negotiated preferences.
6. **Switch properties** — flip Sand Hill ↔ Hong Kong in the header; same guest, completely different dossier (the no-cookie-cutter moment).
7. **Watch the live thread** — the bottom band runs the full lifecycle in six phases (Pre-arrival → Arrive → Check-in → Stay → Checkout → Post-stay) and pulls beats from the right source in the store: arrival chain → arrival summary → dossier actuators → in-stay events → reservation checkout → continuity beats.

There's also a separate **voice intake** flow at `/intake` — an ElevenLabs Convai widget runs a 5-question call with Alice (the live route) plus a bulletproof "Play demo" path that streams a scripted two-voice (Alice + Eric) conversation through ElevenLabs TTS.

---

## Architecture

```
                 ┌─────────────────────────────────────────────────────────┐
                 │  app.redthread.boutique  ·  Vercel (Next.js 16 nodejs)  │
                 │                                                         │
                 │   /                       Dashboard (6-input form +     │
                 │                            zones + LiveThread)          │
                 │   /intake                 ElevenLabs Convai voice +     │
                 │                            scripted demo path           │
                 │   /profile                Guest-side Hold-the-Thread    │
                 │                                                         │
                 │   POST /api/arrival-chain     SSE — 9-step live chain   │
                 │   POST /api/agent             SSE — Opus 4.7 tool-use   │
                 │                                + Haiku 4.5 Discretion   │
                 │   POST /api/agent-handoff-live SSE — Threadkeeper       │
                 │                                ↔ elias bridge           │
                 │   POST /api/agent-handoff     SSE — scripted fallback   │
                 │   POST /api/voice             ElevenLabs TTS proxy +    │
                 │                                /tmp disk cache          │
                 │   POST /api/voice/intake/complete  pulls conv from EL   │
                 │   POST /api/airport-eta       standalone airport ETA    │
                 │   GET  /.well-known/agent.json A2A protocol manifest    │
                 └────────────────────────┬────────────────────────────────┘
                                          │ HTTPS (CF tunnel)
                                          ▼
                 ┌─────────────────────────────────────────────────────────┐
                 │  elias.redthread.boutique  ·  Mac Mini (Bun HTTP)       │
                 │                                                         │
                 │   GET  /            identity card (who am I, who's      │
                 │                      my principal, which endpoint)      │
                 │   POST /respond     Claude Haiku 4.5 call with elias    │
                 │                      persona + Ben's prefs in system    │
                 │                      prompt; returns the next utterance │
                 │                                                         │
                 │   Process: /Users/elias/code/redthread-bridge           │
                 │   Tunnel:  named Cloudflare tunnel (permanent)          │
                 └─────────────────────────────────────────────────────────┘
```

### Three live agentic flows

**A. Reservation → live agent dossier** *(the centerpiece)*
1. User submits reservation form → `POST /api/arrival-chain` SSE
2. Server runs **9 sequential steps**, emitting `step_start` / `step_thinking` (token deltas) / `step_complete` per step:
   - `01 crm` — `getGuest(guestId)` from `data/guests/<id>.json`
   - `02 linkedin` — pre-baked replay of Claude Haiku + `web_search` (live tool burns 10–30s per query; we cache for demo reliability)
   - `03 twitter` — same
   - `04 press` — same
   - `05 flight` — live `AviationStack` call, time-of-day projected onto reservation check-in date
   - `06 luggage` — live `Claude Haiku 4.5` reasoning, `<value>` tag parsed
   - `07 customs` — live Haiku reasoning over nationality + airport + arrival hour
   - `08 transit` — live Haiku reasoning over route + day-of-week + congestion
   - `09 eta` — math composition: landing + customs + bags + transit
3. After the chain, client kicks `POST /api/agent { live: true }` — `Claude Opus 4.7` with tool-use (web_search, crm_cross_property, flight_lookup) produces a structured `Dossier`. A second `Claude Haiku 4.5` pass (Discretion Layer) filters it per the guest's saved Privacy Openness Score.
4. Final Dossier lands in zustand store → Zones II + III + LiveThread render.

**B. Live A2A — Threadkeeper ↔ elias**
1. Click Agent handoff → `POST /api/agent-handoff-live` SSE
2. Vercel runs a turn loop. Each turn:
   - **Threadkeeper turn**: `Claude Haiku 4.5` on Vercel, system prompt is Rosewood-side intake agent, returns the next utterance.
   - **elias turn**: `POST elias.redthread.boutique/respond { conversation }` → the Mac Mini bridge calls `Claude Haiku 4.5` with elias's persona + Ben's authoritative preferences in the system prompt, returns the next utterance.
3. After 4–6 turns, Threadkeeper emits `[HANDOFF_SEALED]` (or wall-clock cap). A final `Claude Haiku 4.5` extracts the structured manifest (assistant-prefill anchored to `<manifest>{` to force JSON shape).
4. Client receives the manifest, kicks `streamAgent({ overrides })` → dashboard re-populates with negotiated prefs applied.

**C. Voice intake (ElevenLabs Convai)**
1. `/intake` page hosts the ElevenLabs Convai React widget pointed at `agent_5001krs8b43gfjstkz92k6fx9e3n` (the Pre-Arrival Intake agent, Alice voice, structured data collection for 5 fields).
2. Conversation ends → client `POST /api/voice/intake/complete { conversationId }` → server pulls the conversation from ElevenLabs (`GET /v1/convai/conversations/{id}`), extracts `analysis.data_collection_results`, returns the normalized overrides.
3. Client stashes overrides in `sessionStorage["redthread:intake"]` → redirects to `/?fromIntake=1` → DemoLoader picks them up and kicks the agent run with them applied.

A second "Play demo" path on `/intake` sidesteps Convai entirely and plays a 12-line scripted conversation through `/api/voice` (Alice + Eric voices) for demo-day reliability.

---

## Hold the Thread — per-tick discretion

The 0–10 dial is not a 3-band coarse switch. It's an **11-step descending ladder**: each adjacent tick drops one specific signal from the dossier so the judge can drag from 6 → 5 → 4 and watch the brief and actuators shrink one line at a time. Every removal lands in `dossier.suppressed[]` with the reason, so the audit log shows exactly what the band cost.

| UI | POS | What gets removed at this tick |
|---|---|---|
| 10 | 100 | — full dossier, no reduction |
| 9 | 90 | A2A / cross-property continuity reasoning |
| 8 | 80 | Recent-press hook (LinkedIn / TechCrunch / fundraise / keynote) |
| 7 | 70 | Calendar-adjacency itinerary entry |
| 6 | 60 | Personal-history hook (family / anniversary / partner) |
| 5 | 50 | Remaining conversation hooks |
| 4 | 40 | Amenity sourcing reasoning (amenity itself kept) |
| 3 | 30 | Full itinerary (room + amenity kept) |
| 2 | 20 | Amenity downgraded to generic "Welcome tea service" |
| 1 | 10 | Room scent + lighting personalization |
| 0 | 0 | Vault — room defaults only (no temperature, no bedding logged) |

The ladder is implemented twice, in lockstep: `bandReduceFixture` in `src/app/api/agent/route.ts` for the fast fixture path that powers slider repaints, and the `DISCRETION_LAYER_SYSTEM` prompt in `src/lib/prompts.ts` for the live Claude Haiku 4.5 path. When the guest moves the dial on `/profile` and saves, `/api/agent` re-streams with the new `previewPos` → fixture path applies the ladder per-tick → zones 1/2/3 repaint without burning a Claude call. `body.live=true` forces the slow live path when you want to demo the real Haiku reasoning.

---

## ElevenLabs integration

- **API key**: `ELEVENLABS_API_KEY` (workspace-level)
- **Two Convai agents** (both public, no auth required):
  - `agent_5001krs8b43gfjstkz92k6fx9e3n` · *Red Thread — Pre-Arrival Intake* · Alice voice · `gemini-2.5-flash` brain · 5 data-collection fields (`room_temp_c`, `bedding`, `morning_ritual`, `dietary`, `privacy_posture`)
  - `agent_6701krs7smnqeg8ae4hyskjcq7g8` · *Brief Me* · Alice voice · `claude-opus-4-7` brain · reads dossiers TO staff
- **Voices** (premade, no cloning):
  - Threadkeeper / Concierge: **Alice** `Xb7hH8MSUJpSbSDYk0k2` (British female, calm)
  - elias / Guest demo voice: **Eric** `cjVigY5qzO86Huf0OWal` (American male, smooth)
  - George `JBFqnCBsd6RMkjVDRZzb` (British male) used for A2A panel
- **TTS**: `eleven_turbo_v2_5` model, settings `stability=0.55 similarity_boost=0.75 style=0.2 use_speaker_boost=true`
- **Caching**: `/tmp/voice-cache/<sha256>.mp3` keyed by `text + voiceId` — warm calls return in ~5ms

## Anthropic integration

- **API key**: `ANTHROPIC_API_KEY` (personal)
- **Models**:
  - **`claude-opus-4-7`** — main agent loop (`/api/agent`): research with web_search server tool + custom tool-use loop, up to 8 turns, max 4096 output tokens per turn
  - **`claude-haiku-4-5`** — Discretion Layer (`/api/agent`), arrival-chain reasoning (luggage / customs / transit), A2A turns (both Threadkeeper and elias), manifest extraction
- **Tool surface** (`src/lib/tools.ts`):
  - `web_search` — Anthropic server-side tool (type `web_search_20260209`)
  - `crm_cross_property` — custom; reads `data/guests/*.json` and `data/properties/*.json`
  - `flight_lookup` — custom; AviationStack with deterministic mock fallback
- **Prompt structure** (`src/lib/prompts.ts`):
  - `RESEARCH_AGENT_SYSTEM` — instructs Opus to verify identity, research in parallel (LinkedIn / X / company / email-domain), synthesize a Dossier wrapped in `<dossier>` tags
  - `DISCRETION_LAYER_SYSTEM` — instructs Haiku to filter the dossier along the **11-step Hold-the-Thread ladder** (see [Hold the Thread — per-tick discretion](#hold-the-thread--per-tick-discretion) above) and log every removal into `suppressed[]` with the tick that caused it
- **Streaming**: `messages.stream` for token-by-token reasoning (arrival chain web research, A2A turns); `messages.create` for the tool-use loop in the main agent

## Other integrations

- **AviationStack** — real flight status (`AVIATIONSTACK_API_KEY`), with deterministic mock fallback for `UA857` / `CX870` if the key is missing or invalid
- **Cloudflare Tunnel** — permanent named tunnel exposing the Mac Mini bridge at `elias.redthread.boutique`
- **Vercel** — Next.js hosting, `runtime = nodejs`, `maxDuration` 60–120s per route depending on workload

---

## Repo map

```
src/
  app/
    layout.tsx                     fonts (Cormorant Garamond, Inter, Noto Serif SC), root layout
    page.tsx                       dashboard: ReservationIntake + DashboardDial + DemoTrigger + 4 zones
    globals.css                    theme tokens (rose-red palette)
    intake/page.tsx                ElevenLabs Convai voice intake + scripted demo path
    profile/page.tsx               guest-side Hold-the-Thread slider
    api/
      agent/route.ts               Opus research + Haiku discretion loop (SSE)
      agent-handoff/route.ts       scripted A2A (SSE) — fallback
      agent-handoff-live/route.ts  real A2A — Threadkeeper ↔ elias bridge (SSE)
      arrival-chain/route.ts       9-step live arrival research (SSE)
      airport-eta/route.ts         standalone ETA estimator
      voice/route.ts               ElevenLabs TTS proxy + disk cache
      voice/intake/complete/route.ts pulls Convai conversation, normalizes overrides
  components/
    Header.tsx                     wordmark + property switcher (loads fixture per guest+property)
    DashboardDial.tsx              concierge mirror of guest's POS (read-only)
    DiscretionDial.tsx             guest-side POS slider used on /profile
    ReservationIntake.tsx          5-input form + 9-step arrival-chain panel
    DemoTrigger.tsx                Voice intake link + Agent handoff button
    DemoLoader.tsx                 SSE consumer for /api/agent + intake bootstrap
    AgentHandoffPanel.tsx          A2A transcript + audio queue (Alice + George)
    BriefMeButton.tsx              /api/voice playback with state machine
    zones/
      ZoneShell.tsx                editorial card frame (light/dark)
      ResearchStreams.tsx          Zone I — click-to-expand tool-call cards
      TheBrief.tsx                 Zone II — bio, hooks, handle-with-care
      Actuators.tsx                Zone III — room, amenity, itinerary
      LiveThread.tsx               Zone IV — 6-phase lifecycle on the red thread
  lib/
    types.ts                       Guest, Property, Dossier, ToolCallTrace
    anthropic.ts                   SDK singleton + MODELS const
    prompts.ts                     RESEARCH + DISCRETION system prompts
    tools.ts                       TOOL_DEFINITIONS + dispatchTool
    crm.ts                         getGuest / getProperty / crmCrossProperty
    flight.ts                      flightLookup (live AviationStack + mock fallback)
    pos.ts                         POS calculator (unused live; baked into Discretion)
    dossierStore.ts                zustand store: dossier, arrivalSteps, inStayEvents,
                                    activeProperty, activeGuestId, activeGuestPos
    arrivalChainFixtures.ts        pre-baked web_search fixtures per guest
data/
  guests/
    ben.json                       Benjamin Shyong — founder, vegetarian, POS 55
    lin-chen.json                  Ms. Lin Chen — fintech founder, pescatarian, POS 62
    bellandi.json                  backup guest (Aldo Bellandi)
  properties/
    sand-hill.json, hong-kong.json, crillon.json   — full content per property
  fixtures/
    ben__hong-kong.json, ben__sand-hill.json
    lin-chen__hong-kong.json, lin-chen__sand-hill.json, lin-chen__crillon.json
public/
  .well-known/agent.json           A2A protocol manifest
```

The elias bridge lives in a separate repo at `~/code/redthread-bridge/`:
```
redthread-bridge/
  server.ts                        Bun HTTP server on :4040 with GET / + POST /respond
  prefs.json                       Ben's authoritative preferences for elias's system prompt
```

---

## Environment

Required:
- `ANTHROPIC_API_KEY` — Opus + Haiku
- `ELEVENLABS_API_KEY` — TTS + Convai

Optional:
- `AVIATIONSTACK_API_KEY` — real flight data; mocks if missing
- `ELEVENLABS_VOICE_ID` — overrides Alice as the default TTS voice
- `NEXT_PUBLIC_ELEVENLABS_AGENT_INTAKE` — public agent id for /intake widget
- `NEXT_PUBLIC_ELEVENLABS_AGENT_BRIEF` — public agent id for Brief Me (currently unused; TTS path is server-side)
- `NEXT_PUBLIC_ELEVENLABS_VOICE_GUEST` — the second voice in the scripted /intake demo (Eric by default)
- `NEXT_PUBLIC_ELEVENLABS_VOICE_CONCIERGE` — the concierge voice (Alice by default)
- `ELIAS_BRIDGE_URL` — public URL of the elias bridge (set to `https://elias.redthread.boutique`)
- `DEMO_MODE` — `1` short-circuits `/api/agent` to fixture replay (used for property switcher)

For local dev with secrets pulled from 1Password:
```bash
op run -- bun dev
```

---

## Quickstart

```bash
bun install
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY + ELEVENLABS_API_KEY
bun dev
```

Open `http://localhost:3000`.

To run the elias bridge locally too:
```bash
cd ~/code/redthread-bridge
ANTHROPIC_API_KEY=$(grep ANTHROPIC ~/code/redthread/.env.local | cut -d= -f2-) bun server.ts
# in another terminal:
cloudflared tunnel run redthread-elias-bridge
```

---

## Brand language (use verbatim in copy)

- **A Sense of Place** — Rosewood's compass, trademarked 1979
- **Relationship Hospitality** — Sonia Cheng's framing; the dossier operationalises it
- **Affluential Explorers** — Rosewood's target guest
- **Discovery** — the 2025 rebrand keyword. Microcopy: "Threading the dossier…" not "Loading…"
- **Hold the Thread** — the guest-set Privacy Openness Score (0–10); concierge mirrors read-only
- **No cookie-cutter** — the property switcher is the demo of this principle

---

## What Red Thread is *not*

- Not a CRM (CRMs store what the hotel already knows; Red Thread is the substrate that adds context)
- Not a chatbot (chatbots wait for the guest to ask; Red Thread is always-on, agentic)
- Not a marketing tool (Discretion Layer's job is to make sure it never feels like one)
- Not Rosewood-exclusive in code (the brand-specific bits are in `data/` and the prompts; the framework is property-agnostic)
