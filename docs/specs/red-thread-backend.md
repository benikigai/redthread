# Spec: Red Thread — Backend Services (Terminal 2)
**Date:** 2026-05-16
**Status:** Approved (realigned with T1 scaffold)
**Approved option:** A — JSON-default route with SSE opt-in via `Accept` header
**Complexity:** Moderate overall (1 Complex task, 2 Moderate, 6 Simple)

## Context

Hospitality 2030 hackathon at Rosewood Sand Hill. Submissions 5 PM PT today. Two-terminal build of "Red Thread" — the agentic guest operating system for luxury hospitality.

**Working agreement (declared by T1 in `README.md`):**
- T2 (this scope) owns `src/app/api/**` and `data/**`
- T1 owns `src/components/**` and `src/app/page.tsx`
- Both can edit `src/lib/anthropic.ts`
- `src/lib/types.ts` is the contract — additive changes welcome, renames/removals need a sync

**Already done by T1 (NOT in our task list):**
- Next.js 16 + Tailwind v4 + TypeScript scaffold under `src/`
- `bun` as package manager (`bun install`, `bun dev`)
- `src/lib/types.ts` — full type contract: `Guest`, `PriorStay`, `Property`, `AmenityOption`, `Experience`, `RoomState`, `Placemaker`, `Dossier`, `ToolCallTrace`
- `src/lib/anthropic.ts` — SDK singleton + `MODELS` const (`agent: claude-opus-4-7`, `discretion: claude-haiku-4-5`)
- `src/app/api/agent/route.ts` — stub endpoint returning a static `Dossier` (the shape we must produce)
- Initial seed data: `data/guests/lin-chen.json`, `data/properties/{sand-hill,hong-kong,crillon}.json` — each tagged with `_t2_notes` indicating what T2 should expand
- `src/app/page.tsx` and four zone components (already rendering against stub)
- `README.md` with full project description, stack, repo map, working agreement, brand language

**Terminal 2 backend scope (this spec):**
- Replace agent stub with the real Claude tool-use loop (Opus 4.7 research + Haiku 4.5 Discretion Layer)
- Expand seed data per the `_t2_notes` left by T1
- Tool layer: Claude native `web_search` + `flight_lookup` + `crm_cross_property`
- ElevenLabs voice route (`/api/voice`, Alice default)
- Static `/.well-known/agent.json`
- Pre-cached fixtures + `DEMO_MODE` fallback for wifi failure during demo

## Decisions

**Response contract (the breakthrough decision):** `/api/agent` keeps T1's JSON-by-default contract (their stub returns JSON; their UI fetches JSON). SSE is added as an **opt-in via `Accept: text/event-stream`**. This preserves T1's existing fetch code untouched while unlocking the "live tool-call cards animating in" judging spectacle when T1 is ready to wire it up.

**Models:** `MODELS.agent` (Opus 4.7) for the research/synthesis loop; `MODELS.discretion` (Haiku 4.5) for the filtering pass. Both pulled from `src/lib/anthropic.ts` to keep the source of truth single.

**Caps:** `max_tokens = 4096` per call; `max_turns = 8` in the tool-use loop. Bounds worst-case token spend.

**Research tools:** Claude native `web_search` only. Exa and Tavily listed in `.env.example` are explicitly skipped — Claude's `web_search` covers identity, press, public signals, and local context. Saves keys + bundle.

**Flight tool:** Env-aware. Real AviationStack API if `AVIATIONSTACK_API_KEY` set; deterministic mock otherwise.

**Privacy Openness Score:** T1 already defined this as a `number 0–100` field on `Guest` (not a separate calculator object). We honor that. The agent loop reads `guest.privacyOpennessScore` directly and gates Discretion Layer strictness on banded thresholds (0–30 minimal, 31–69 standard, 70–100 full). **No separate `computePOS()` Claude call** — simpler, deterministic, T1-compatible.

**Suppressed log:** T1's `Dossier.suppressed: { signal, reason }[]` replaces the more elaborate `RedactionLog`. Same purpose, simpler shape.

**`agent.json`:** Per T1's README repo map, lives at `public/.well-known/agent.json` as a static file (Next.js serves it automatically) — not as an App Router route. Simpler, no runtime cost.

**Secrets:** `ANTHROPIC_API_KEY` from `op://Clawdbot/Anthropic API Key/credential` (1Password). `ELEVENLABS_API_KEY` from shell secrets. Local dev: `op run -- bun dev` (or paste keys into `.env.local`).

**Demo insurance:** `DEMO_MODE=1` short-circuits `/api/agent` and replays pre-captured fixture data — JSON dossier in JSON mode, fixture SSE events with realistic delays in SSE mode. Three fixtures: Lin Chen × {Sand Hill, Hong Kong, Crillon}.

**Next.js 16 note:** `AGENTS.md` warns "this is NOT the Next.js you know — read `node_modules/next/dist/docs/` before writing code." Implementers must consult that for any route handler quirks (especially around streaming responses and `runtime`/`dynamic` exports).

## Tasks

**Dependency DAG:** {T1, T2} → T3 → T4 → T5 → {T6, T7, T8}

(T1 in this list is now task #1 of the *revised* plan — the original scaffold task is dropped because T1-the-terminal already did it.)

### Task 1: System prompts module
- **Objective:** Define the three system prompts the agent loop and Discretion Layer use, in one place.
- **Complexity:** Simple
- **Dependencies:** None
- **Files to change:** `src/lib/prompts.ts`
- **Acceptance criteria:**
  - Exports `RESEARCH_AGENT_SYSTEM` — instructs Claude to verify identity → research in parallel → synthesize `Dossier` JSON wrapped in `<dossier>...</dossier>`. Cites "A Sense of Place," "Relationship Hospitality," "Affluential Explorer" verbatim. Refuses speculation about wealth, romance, family, health, minors, non-public sources.
  - Exports `DISCRETION_LAYER_SYSTEM` — instructs Haiku to filter a dossier given the guest's POS (0–100), with explicit banding: 0–30 strip everything personal except dietary/room prefs; 31–69 keep professional accomplishments only; 70–100 pass through but redact anything surveillance-feeling. Logs every removal into `Dossier.suppressed[]`. Outputs filtered dossier wrapped in `<filtered>...</filtered>`.
  - Both prompts ≤ 2,500 characters each (Haiku and Opus both handle longer, but tight prompts beat verbose ones for tool-use loops).
- **Test plan:**
  - Unit: `tsc --noEmit` passes
  - Smoke: import both, assert each is a non-empty string with the brand phrases
- **Rollback plan:** Delete file.
- **Blast radius:** Just T5 (agent loop) reads them.
- **Research needed:** No

### Task 2: Expand seed data per T1's `_t2_notes`
- **Objective:** Bring data depth to the level the agent needs to produce believable bespoke dossiers across all three properties.
- **Complexity:** Moderate
- **Dependencies:** None
- **Files to change:** `data/guests/lin-chen.json`, `data/guests/bellandi.json` (new), `data/properties/sand-hill.json`, `data/properties/hong-kong.json`, `data/properties/crillon.json`
- **Acceptance criteria:**
  - `lin-chen.json`: replace the placeholder "TODO" Crillon stay with a real Phuket stay (per shared product spec — Mar 2025, beachfront villa, declined alcohol, 6 AM beach walks, requested vegetarian Thai cooking class). Keep `_t2_notes` removed.
  - `bellandi.json`: new backup guest — Aldo Bellandi, Italian wine importer, 52, single prior stay at Crillon, allergic to nothing, no preference flags. Simpler so a demo dry-run has a fallback profile.
  - Each property file: ≥5 `amenityOptions`, ≥8 `signatureExperiences`, ≥2 `placemakers`, all preserving `senseOfPlace` voice. Content references from shared product spec (Wing Wah mooncakes / Asaya / Chaat at HK; Pierre Hermé / Musée d'Orsay / L'Écrin at Crillon; etc.)
  - `_t2_notes` fields removed from all files (signal: T2 has confirmed). `id` and existing fields preserved.
- **Test plan:**
  - Unit: each JSON parses; entry counts meet minima above.
  - Type smoke: scratch script imports each and assigns to typed variables — `tsc --noEmit` passes.
- **Rollback plan:** `git checkout HEAD~ -- data/`
- **Blast radius:** Authentic-feeling demo depends on this depth.
- **Research needed:** No

### Task 3: Mock CRM + flight tool
- **Objective:** Provide the two non-Claude-native tool handlers the agent calls during research.
- **Complexity:** Simple
- **Dependencies:** None (T1 types contract already exists)
- **Files to change:** `src/lib/crm.ts`, `src/lib/flight.ts`
- **Acceptance criteria:**
  - `crm.ts`: exports `getGuest(guestId): Guest` and `getProperty(propertyId): Property`, reading from the JSON files. Throws on unknown id. `crmCrossProperty(guestId): PriorStay[]` is a convenience wrapper returning `getGuest(id).priorStays`.
  - `flight.ts`: exports `flightLookup(flightNumber): Promise<{ status, eta, delayMinutes, origin, destination }>`. If `process.env.AVIATIONSTACK_API_KEY` set → hit AviationStack `/v1/flights?flight_iata=...` and map. Else → return a deterministic mock matched to the input string (e.g. `"UA857"` → `"on-time"`, `"CX870"` → 12 min delay).
  - Both modules import types from `@/lib/types`.
- **Test plan:**
  - Unit: `getGuest('lin-chen')` returns object with name "Lin Chen"; `getGuest('nope')` throws.
  - Unit: `flightLookup('UA857')` without env var → `{ status: 'on-time' }` (or similar deterministic mock).
- **Rollback plan:** Delete both files. Agent loop falls back to stub handlers (or throws cleanly).
- **Blast radius:** Wrong data here → wrong dossier inputs.
- **Research needed:** No

### Task 4: Tool dispatcher + Claude tool declarations
- **Objective:** Bridge between Claude's `tool_use` blocks and our handler functions.
- **Complexity:** Moderate
- **Dependencies:** T3
- **Files to change:** `src/lib/tools.ts`
- **Acceptance criteria:**
  - Exports `TOOL_DEFINITIONS: Anthropic.Messages.Tool[]` containing the Claude native `web_search` server tool plus `flight_lookup` and `crm_cross_property` as custom tools (JSON schema input).
  - Exports `dispatchTool(name, input): Promise<unknown>` — switch case mapping each tool name to its handler. Stringifies result for `tool_result.content`.
  - Unknown tool name throws structured error (caught upstream as SSE/JSON error).
  - Records every call into a `ToolCallTrace` for inclusion in `Dossier.toolCalls[]`.
- **Test plan:**
  - Unit: `dispatchTool('crm_cross_property', { guestId: 'lin-chen' })` returns an array of `PriorStay`.
  - Unit: `dispatchTool('unknown', {})` throws with informative message.
- **Rollback plan:** Delete file.
- **Blast radius:** Sole consumer is T5.
- **Research needed:** Verify exact tool type for Claude `web_search` server tool against the installed `@anthropic-ai/sdk@0.96.0` at build time.

### Task 5: Real agent loop (replace stub) — JSON default, SSE opt-in
- **Objective:** The centerpiece. Replace T1's static stub at `src/app/api/agent/route.ts` with a real Claude tool-use loop that produces a `Dossier` and optionally streams progress.
- **Complexity:** Complex
- **Dependencies:** T1, T2, T3, T4
- **Files to change:** `src/app/api/agent/route.ts`
- **Acceptance criteria:**
  - `POST /api/agent` accepts `{ guestId, propertyId, flightNumber? }`
  - `export const runtime = 'nodejs'`; `export const dynamic = 'force-dynamic'` (verify these conventions against Next 16 docs in `node_modules/next/dist/docs/` — per `AGENTS.md`)
  - **Default response:** `application/json` — full `Dossier` (matches T1's stub contract verbatim, including `toolCalls[]` populated)
  - **Opt-in streaming:** if request has `Accept: text/event-stream`, return SSE — events per phase: `{ phase: "verify" | "research" | "synthesize" | "discretion" | "done" | "error", payload, ts }`, with per-tool-call events nested inside `research`
  - Loop: Anthropic.messages.stream with `MODELS.agent` (Opus 4.7), `TOOL_DEFINITIONS`, `max_tokens: 4096`, system: `RESEARCH_AGENT_SYSTEM`. Iterates on `tool_use` blocks until `stop_reason === 'end_turn'`. Max 8 iterations.
  - Parses `<dossier>...</dossier>` from final assistant message into a `Dossier` candidate.
  - Second pass: Anthropic.messages.create with `MODELS.discretion` (Haiku 4.5), system: `DISCRETION_LAYER_SYSTEM`, input: candidate dossier + `guest.privacyOpennessScore`. Parses `<filtered>...</filtered>` into final `Dossier`. Captures removed items into `Dossier.suppressed[]`.
  - Errors: JSON mode → 500 with `{ error: message }`; SSE mode → `{ phase: 'error', payload: { message } }` then close stream.
  - If `process.env.DEMO_MODE === '1'`, bypass Claude entirely: read fixture from `data/fixtures/<guestId>__<propertyId>.json` and return JSON (or replay SSE events with `delayMs` per event).
- **Test plan:**
  - Smoke (JSON): `curl -fsS -X POST http://localhost:3000/api/agent -H 'Content-Type: application/json' -d '{"guestId":"lin-chen","propertyId":"sand-hill"}' | jq -e '.actuators.welcomeAmenity.name' ` returns non-null.
  - Smoke (SSE): `curl -fsS -N -X POST http://localhost:3000/api/agent -H 'Accept: text/event-stream' -H 'Content-Type: application/json' -d '{"guestId":"lin-chen","propertyId":"sand-hill"}' | head -c 4000 | grep -q 'discretion'`
  - Smoke (DEMO_MODE): `DEMO_MODE=1` + JSON request returns within 200ms with a valid Dossier; SSE request streams fixture events.
  - Integration: full live run → resulting Dossier validates against `Dossier` type; `toolCalls[]` has ≥4 entries.
  - Failure: malformed body → 400 with helpful error.
- **Rollback plan:** Revert this file to T1's stub. Demo continues to function on static data.
- **Blast radius:** The whole demo. Most critical task.
- **Research needed:** Yes — confirm Next 16 route handler streaming patterns by reading `node_modules/next/dist/docs/`. Confirm `web_search` tool type string against the installed `@anthropic-ai/sdk` version.

### Task 6: ElevenLabs voice route
- **Objective:** Power the "Brief me" button with a streamed MP3 of a spoken dossier brief.
- **Complexity:** Simple
- **Dependencies:** T1 (no — actually no dependencies beyond `.env.local`)
- **Files to change:** `src/app/api/voice/route.ts`
- **Acceptance criteria:**
  - `POST /api/voice` accepts `{ text: string, voiceId?: string }` — default `voiceId = Xb7hH8MSUJpSbSDYk0k2` (Alice; or `ELEVENLABS_VOICE_ID` env override).
  - Proxies to ElevenLabs `/v1/text-to-speech/{voiceId}/stream` with model `eleven_turbo_v2_5`, settings `stability=0.55 similarity_boost=0.75 style=0.2 use_speaker_boost=true`.
  - Returns `audio/mpeg` body, `Cache-Control: public, max-age=3600`.
  - Hash of `text + voiceId` → caches mp3 bytes at `/tmp/voice-cache/<hash>.mp3` for cheap repeat plays.
  - Missing/invalid `ELEVENLABS_API_KEY` → 503 with JSON `{ error: '...' }`.
- **Test plan:**
  - Smoke: `curl -X POST localhost:3000/api/voice -H 'Content-Type: application/json' -d '{"text":"Briefed."}' --output brief.mp3` → `file brief.mp3` reports MPEG ADTS.
  - Smoke: second identical request returns within 50 ms (cache hit).
- **Rollback plan:** Delete file. UI greys out Brief Me.
- **Blast radius:** Voice feature only.
- **Research needed:** No — already validated via direct API smoke test.

### Task 7: agent.json static file
- **Objective:** Publish the 2030 agent-to-agent handoff manifest. Greycroft moment.
- **Complexity:** Simple
- **Dependencies:** None
- **Files to change:** `public/.well-known/agent.json` (new file)
- **Acceptance criteria:**
  - Valid JSON document per shared product spec: `name`, `version`, `description`, `publisher`, `contact`, `schemas.guestPreferenceManifest`, `endpoints.submit`, `endpoints.verify`, `principles[]` (≥4 principles).
  - Reachable at `http://localhost:3000/.well-known/agent.json` (Next.js serves `public/` automatically).
- **Test plan:**
  - Smoke: `curl -fsS localhost:3000/.well-known/agent.json | jq -e '.name == "Red Thread"'`
  - Smoke: `jq -e '.principles | length >= 4'`
- **Rollback plan:** Delete file.
- **Blast radius:** None.
- **Research needed:** No

### Task 8: Pre-cached fixtures + DEMO_MODE wiring
- **Objective:** Insurance against wifi failure during the live demo.
- **Complexity:** Simple
- **Dependencies:** T5 (need a working live mode to capture from)
- **Files to change:** `data/fixtures/lin-chen__sand-hill.json`, `data/fixtures/lin-chen__hong-kong.json`, `data/fixtures/lin-chen__crillon.json`, plus `scripts/capture-fixture.ts`
- **Acceptance criteria:**
  - Each fixture is a captured `Dossier` JSON + (optionally) an array of SSE events with `delayMs`. Captured via the script from a live run.
  - `src/app/api/agent/route.ts` (T5) reads these when `DEMO_MODE=1` and returns JSON or streams SSE accordingly.
  - Capture script run thrice: `bun scripts/capture-fixture.ts lin-chen sand-hill` etc.
- **Test plan:**
  - Smoke: `DEMO_MODE=1 curl -fsS -X POST localhost:3000/api/agent -d '{"guestId":"lin-chen","propertyId":"hong-kong"}' -H 'Content-Type: application/json' | jq -e '.actuators.welcomeAmenity.name'` returns a HK-shaped amenity (e.g. mooncake).
- **Rollback plan:** Delete fixtures dir; T5 emits 503 if DEMO_MODE set without fixtures.
- **Blast radius:** Insurance only.
- **Research needed:** No

### Task 9: README delta — backend contract section
- **Objective:** Document the API contract T1 needs to wire against — without rewriting T1's README.
- **Complexity:** Simple
- **Dependencies:** T5, T6, T7
- **Files to change:** `README.md` (append new section)
- **Acceptance criteria:**
  - New section "API Contract (T2 → T1)" documents:
    - `POST /api/agent` request shape, JSON response shape (link to `Dossier` in `src/lib/types.ts`), and `Accept: text/event-stream` opt-in with the SSE event types
    - `POST /api/voice` request/response
    - `GET /.well-known/agent.json` shape
    - `DEMO_MODE=1` behavior
    - Local dev: `op run -- bun dev` for secrets pulled from 1Password
  - Existing README content above untouched.
- **Test plan:**
  - Smoke: `grep -q 'API Contract' README.md && grep -q 'text/event-stream' README.md && grep -q 'DEMO_MODE' README.md`
- **Rollback plan:** Revert the appended section.
- **Blast radius:** Docs only.
- **Research needed:** No

## Risks

1. **Claude API token budget overrun.** Mitigations: `max_tokens = 4096`, `max_turns = 8`, Haiku 4.5 (cheap) for Discretion, `DEMO_MODE` skips API entirely for the rehearsals.
2. **Wifi failure during live demo.** Mitigation: `DEMO_MODE=1` replays captured fixture data (JSON or SSE).
3. **Next.js 16 breaking changes from training-data Next 13–15 patterns.** Mitigation: implementer reads `node_modules/next/dist/docs/` for route handler conventions before writing T5; `AGENTS.md` flag is honored.
4. **T1's UI currently fetches JSON and may not be ready for SSE.** Mitigation: JSON contract preserved as default — SSE is purely additive. T1 can flip when ready.
5. **AviationStack key not provisioned.** Mitigation: env-aware mock returns deterministic plausible data.
6. **Type contract drift after additive changes.** Mitigation: T2 only *adds* fields to `Dossier` / `Guest`. Any renames or removals require explicit sync with T1 per the working agreement.

## Research Notes

N/A in this spec round. T1's scaffold is itself the de-risking artifact — types, anthropic singleton, working stub all already exist. The only build-time research needed is: confirm Next 16 route handler patterns from `node_modules/next/dist/docs/` and confirm the exact Claude `web_search` server tool type string from the installed `@anthropic-ai/sdk`.
