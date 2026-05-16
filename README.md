# Red Thread

> An agentic operating system for luxury hospitality.
> A Sense of Place, threaded through every guest.

Built for **Hospitality 2030 · Rosewood Sand Hill Hackathon** (2026-05-16).

## Architecture — four zones on one dashboard

1. **Research streams** — parallel tool calls (flight, prior stays, social, placemaker, calendar), gated by the Privacy Openness Score.
2. **The brief** — desk view: one-line bio, conversation hooks, handle-with-care, Discretion Layer log, "Brief me" voice ritual (ElevenLabs).
3. **Actuators** — what the system *commits to*: room state preset, welcome amenity, pre-loaded itinerary. Each with action + reasoning + citation.
4. **Live thread** — pre-arrival → on-property → post-stay timeline with the same guest, surfacing in-stay signals.

Property switcher (Sand Hill / Hong Kong / Crillon) re-runs the agent → the same Ms. Chen gets radically different actuators. That's the anti-cookie-cutter Rosewood demo move.

## Stack

- **Next.js 16 · App Router · TypeScript · Tailwind v4**
- **Anthropic SDK** (`claude-opus-4-7` for the agent loop, `claude-haiku-4-5` for the Discretion Layer)
- **ElevenLabs** for the "Brief me" voice ritual
- Deployed: **Vercel** (demo app) · **Cloudflare Pages** (marketing at [redthread.boutique](https://redthread.boutique))

## Quickstart

```bash
bun install
cp .env.example .env.local   # then drop ANTHROPIC_API_KEY + ELEVENLABS_API_KEY
bun dev
```

Open <http://localhost:3000>.

## Repo map

```
src/
  app/
    layout.tsx              # Cormorant Garamond + Inter, dark rose red theme
    page.tsx                # 4-zone dashboard
    globals.css             # theme tokens (--paper, --thread, --ink…)
    api/agent/route.ts      # T2 — agent loop (currently returns static Dossier stub)
  components/
    Header.tsx              # wordmark + property switcher
    zones/
      ZoneShell.tsx         # editorial card frame
      ResearchStreams.tsx   # Zone I
      TheBrief.tsx          # Zone II
      Actuators.tsx         # Zone III
      LiveThread.tsx        # Zone IV
  lib/
    types.ts                # shared T1/T2 contracts — Guest, Property, Dossier
    anthropic.ts            # SDK singleton + model picks
data/
  guests/lin-chen.json      # demo guest — Ms. Chen
  properties/               # sand-hill / hong-kong / crillon
public/
  .well-known/agent.json    # agent-to-agent handoff endpoint (2030 forward bet)
```

## Working agreement (T1 frontend / T2 backend)

- `src/lib/types.ts` is the contract. Either side may *add* fields; renames or removals need a sync.
- T2 owns `src/app/api/**` and `data/**`. T1 owns `src/components/**` and `src/app/page.tsx`.
- Both can edit `src/lib/anthropic.ts`.

## Brand language (use verbatim in copy)

- **A Sense of Place** — Rosewood's compass, trademarked 1979.
- **Relationship Hospitality** — Sonia Cheng's framing; the dossier operationalises it.
- **Affluential Explorers** — Rosewood's target guest. Use the term.
- **Discovery** — the 2025 rebrand keyword. Microcopy: "Threading the dossier…" not "Loading…"
- **No cookie-cutter** — the property switcher is the demo of this principle.

## API Contract (T2 → T1)

Backend surfaces and their shapes — what T1's UI fetches.

### `POST /api/agent`

Run the agentic research + discretion pipeline and return a `Dossier`. See `src/lib/types.ts` for the full shape.

**Request body**
```json
{
  "guestId": "lin-chen",
  "propertyId": "sand-hill",
  "flightNumber": "UA857"
}
```

**Response — JSON (default)**

`Content-Type: application/json`. One `Dossier` object — same shape as T1's original stub, including `actuators` (roomState, welcomeAmenity, itinerary), `suppressed[]` (Discretion Layer log), and `toolCalls[]` (one entry per `crm_cross_property`/`flight_lookup`/`web_search` block observed during the loop).

**Response — SSE (opt-in)**

If the request includes `Accept: text/event-stream`, the body is `text/event-stream` with one JSON-encoded event per `data:` line:

```ts
type SSEEvent = {
  phase: "verify" | "research" | "synthesize" | "discretion" | "done" | "error";
  type: string;        // e.g. "start", "tool_use_start", "tool_use_complete", "dossier"
  payload?: unknown;   // shape varies by type — final "done" event carries the full Dossier
  ts: string;          // ISO timestamp
};
```

Phases stream in order: `verify` → `research` (with nested `tool_use_start` / `tool_use_complete` / `tool_use_error` per tool call) → `synthesize` → `discretion` → `done`. Errors emit `phase: "error"` then close the stream.

### `POST /api/voice`

ElevenLabs TTS proxy for the "Brief me" ritual.

**Request body**
```json
{ "text": "Ms. Chen lands at three. The suite is set.", "voiceId": "Xb7hH8MSUJpSbSDYk0k2" }
```

`voiceId` is optional. Default: `process.env.ELEVENLABS_VOICE_ID` or Alice (`Xb7hH8MSUJpSbSDYk0k2`, calm British female, the Rosewood concierge register).

**Response** `audio/mpeg` stream. Identical `(voiceId, text)` requests are cached on disk at `/tmp/voice-cache/<sha256>.mp3` — repeat plays return in ~5ms.

### `GET /.well-known/agent.json`

Static handoff manifest for the 2030 agent-to-agent protocol layer. Includes `principles[]`, `schemas`, `endpoints`, and the privacy policies.

### `DEMO_MODE=1`

When the dev server is started with `DEMO_MODE=1`, `/api/agent` short-circuits the Claude calls and replays from `data/fixtures/<guestId>__<propertyId>.json`. JSON requests return the saved Dossier; SSE requests stream synthetic events reconstructed from `Dossier.toolCalls[]` with realistic per-event delays. Missing fixture → 503.

This is the demo-day insurance: if Wi-Fi at Rosewood Sand Hill fails mid-pitch, flip the env var and the demo continues.

Three fixtures are captured: `lin-chen × { sand-hill, hong-kong, crillon }`. Regenerate with:
```bash
bun scripts/capture-fixture.ts lin-chen sand-hill UA857
```

### Local dev with secrets from 1Password

The repo ships a `.env.example`; copy to `.env.local` and fill in real keys. If you use the 1Password CLI, you can pull keys at runtime instead:

```bash
op run -- bun dev
```

Required env: `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`. Optional: `AVIATIONSTACK_API_KEY` (mock fallback runs without it), `ELEVENLABS_VOICE_ID` (overrides Alice default), `DEMO_MODE` (set to `1` for fixture replay).
