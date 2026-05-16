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
