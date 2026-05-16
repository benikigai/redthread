# Spec: Red Thread — Backend Services (Terminal 2)
**Date:** 2026-05-16
**Status:** Approved
**Approved option:** A — Single SSE Route
**Complexity:** Moderate overall (1 Complex task, 3 Moderate, 7 Simple)

## Context

Hospitality 2030 hackathon at Rosewood Sand Hill, submissions due 5 PM PT today. Two-terminal build of "Red Thread" — the agentic guest operating system for luxury hospitality.

**Terminal 2 (this spec) owns the backend slice:**
- Streaming agent loop on `/api/thread` (Claude Opus 4.7 research + Claude Sonnet 4.6 Discretion Layer)
- Privacy Openness Score (POS) gating
- Tool layer: Claude native `web_search`, mock CRM, env-aware flight lookup
- Seed data: Ms. Mei-Ling Chen + Aldo Bellandi; Sand Hill + Hong Kong + Crillon
- ElevenLabs voice route (Alice/`Xb7hH8MSUJpSbSDYk0k2` default)
- `/.well-known/agent.json` static handoff endpoint
- Pre-cached fixtures + `DEMO_MODE` fallback for demo-day wifi failure

**Out of scope (Terminal 1 owns):** all of `app/page.tsx`, `app/layout.tsx`, every file in `components/`, Tailwind theme, fonts, all UI rendering.

The contract between the two terminals is `lib/types.ts` (Task 2) — Terminal 2 emits, Terminal 1 renders.

## Decisions

**Architecture:** Option A (single SSE route on `POST /api/thread` returning `text/event-stream`). One endpoint, one connection, mirrors the shared product spec. Vercel Node runtime (not Edge) for SDK compatibility.

**Models:** Claude Opus 4.7 (`claude-opus-4-7`) for research; Claude Sonnet 4.6 (`claude-sonnet-4-6`) for Discretion Layer + POS. Cost optimization — Discretion and POS are filtering passes that don't need Opus reasoning depth.

**Caps:** `max_tokens = 4096` per call, `max_turns = 8` in tool-use loop. Bounds worst-case token spend.

**Research tools:** Claude native `web_search` only. Exa dropped — keyword search via Claude covers identity, press, public signals, and local context. One less key, one less failure mode.

**Flight tool:** Env-aware. Real AviationStack API if `AVIATIONSTACK_API_KEY` set; deterministic mock otherwise. AviationStack signup is a non-blocking side todo.

**Secrets:** `ANTHROPIC_API_KEY` from `op://Clawdbot/Anthropic API Key/credential` (1Password). `ELEVENLABS_API_KEY` already in shell secrets. Local dev runs via `op run --` wrapper.

**Demo insurance:** `DEMO_MODE=1` env short-circuits the agent route and replays pre-captured fixture SSE events with realistic per-event delays. Three fixtures captured: Chen×SandHill, Chen×HongKong, Chen×Crillon.

**Branch strategy:** Terminal 2 scaffolds `main` (decided after Q&A), pushes initial commit, Terminal 1 pulls and owns `components/` and pages.

## Tasks

**Dependency DAG:** T1 → {T2, T3} → {T4, T5} → T6 → T7 → {T8, T9, T10} → T11

### Task 1: Scaffold Next.js app + Anthropic SDK
- **Objective:** Create the shared monorepo skeleton both terminals will build on.
- **Complexity:** Simple
- **Dependencies:** None
- **Files to change:** `package.json`, `tsconfig.json`, `tailwind.config.ts`, `app/layout.tsx`, `app/page.tsx` (placeholder), `app/globals.css`, `.env.example`, `.gitignore`, `next.config.ts`
- **Acceptance criteria:**
  - `pnpm dev` (or `npm run dev`) boots on `localhost:3000` with a blank page
  - `@anthropic-ai/sdk` installed
  - `.env.example` lists `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `AVIATIONSTACK_API_KEY` (commented optional)
  - Tailwind extends the Rosewood palette from the shared product spec
  - `app/page.tsx` is a minimal placeholder ("Red Thread loading…") for Terminal 1 to replace
- **Test plan:**
  - Smoke: `curl http://localhost:3000` returns HTTP 200 with the placeholder string
  - Unit: N/A
- **Rollback plan:** `git revert HEAD`. Repo returns to empty README state.
- **Blast radius:** Defines the project root — Terminal 1 must rebase on this. Communicated by pushing to `main`.
- **Research needed:** No

### Task 2: Types contract + system prompts
- **Objective:** Lock the contract between backend SSE output and frontend rendering before either side codes against it.
- **Complexity:** Moderate
- **Dependencies:** T1
- **Files to change:** `lib/types.ts`, `lib/prompts.ts`
- **Acceptance criteria:**
  - `lib/types.ts` contains every type from the shared product spec verbatim: `Property`, `Placemaker`, `Experience`, `AmenityOption`, `RoomState`, `PriorStay`, `GuestProfile`, `POSBand`, `PrivacyOpennessScore`, `ActuatorOutputs`, `Citation`, `RedactionLog`, `Dossier`, `UpcomingArrival`, `FlightStatus`
  - Plus SSE event types: `SSEEvent = { phase, type, payload, ts }` with phases `verify | research | synthesize | discretion | done | error`
  - `lib/prompts.ts` exports `RESEARCH_AGENT_SYSTEM`, `DISCRETION_LAYER_SYSTEM`, `POS_CALCULATOR_SYSTEM` as const strings from the shared product spec
  - `tsc --noEmit` passes
- **Test plan:**
  - Unit: `tsc --noEmit` passes
  - Smoke: import each type in a scratch file, ensure no `any` leakage
- **Rollback plan:** Delete the two files. No callers yet.
- **Blast radius:** Terminal 1 will import from `@/lib/types`. Schema break here breaks UI.
- **Research needed:** No

### Task 3: Seed data — guests + properties
- **Objective:** Provide rich enough mock data that the agent produces a believable bespoke dossier for the demo.
- **Complexity:** Moderate
- **Dependencies:** T1
- **Files to change:** `data/guests.json`, `data/properties.json`
- **Acceptance criteria:**
  - `guests.json` contains Ms. Mei-Ling Chen with 3 prior stays (HK ×2, Phuket ×1) per shared product spec, plus Aldo Bellandi as backup
  - `properties.json` contains Sand Hill, Hong Kong, Crillon — each with: tagline, senseOfPlace, ≥2 placemakers, ≥8 signatureExperiences, ≥6 amenityOptions, roomDefaults, timezone, airportCode, language
  - All entries validate against types in `lib/types.ts` (write a scratch validation script that imports both)
- **Test plan:**
  - Unit: `node -e "JSON.parse(fs.readFileSync('data/guests.json'))"` succeeds for both files
  - Smoke: load both, count entries, assert ≥ minimums above
- **Rollback plan:** Delete the two files.
- **Blast radius:** Demo authenticity depends entirely on this richness. Shallow data = shallow dossier = lost judging points.
- **Research needed:** No

### Task 4: Mock CRM + flight tool
- **Objective:** Provide the two non-Claude-native tool handlers the agent calls.
- **Complexity:** Simple
- **Dependencies:** T2, T3
- **Files to change:** `lib/crm.ts`, `lib/flight.ts`
- **Acceptance criteria:**
  - `crm.ts`: `crmCrossProperty(guestId: string): PriorStay[]` reads `data/guests.json` and returns the matched guest's `priorStays`. Throws on unknown id.
  - `flight.ts`: `flightLookup(flightNumber: string): Promise<FlightStatus>`. If `process.env.AVIATIONSTACK_API_KEY` set, hits real API; else returns deterministic mock with realistic `delayMinutes` for `CX 870`.
  - Both exports typed strictly from `lib/types.ts`
- **Test plan:**
  - Unit: `crmCrossProperty('chen-mei-ling')` returns 3 stays; unknown id throws
  - Unit: `flightLookup('CX870')` with no env var returns mock; mock has plausible shape
  - Integration: with real key, hits API once and returns shape conformant to `FlightStatus`
- **Rollback plan:** Delete the two files; T6 falls back to stub handlers.
- **Blast radius:** Wrong data here = wrong dossier inputs. Tool dispatcher (T6) is sole consumer.
- **Research needed:** No

### Task 5: Privacy Openness Score calculator
- **Objective:** Compute POS for a guest before research, so research depth is gated.
- **Complexity:** Simple
- **Dependencies:** T2
- **Files to change:** `lib/pos.ts`
- **Acceptance criteria:**
  - `computePOS(guestName: string, hints?: string): Promise<PrivacyOpennessScore>`
  - Single Claude call to Sonnet 4.6 (cheap) using `POS_CALCULATOR_SYSTEM`, JSON output mode
  - In-module Map cache by guest name so repeated demo runs don't re-spend tokens
  - Clamps score 0–10, derives band per shared product spec thresholds (0-3 minimal, 4-6 standard, 7-10 full)
- **Test plan:**
  - Unit: cache hit on second call (verify no second network call via spy)
  - Integration: call with "Mei-Ling Chen" — assert score is a number, band is one of three values, signals object has all 5 keys
- **Rollback plan:** Delete file. T7 can hardcode `band='standard'` as fallback.
- **Blast radius:** Wrong POS → wrong discretion filtering. Mitigated by spec's deterministic banding rules.
- **Research needed:** No

### Task 6: Tool dispatcher + Claude tool declarations
- **Objective:** Bridge between Claude's tool_use blocks and our handler functions.
- **Complexity:** Moderate
- **Dependencies:** T4, T5
- **Files to change:** `lib/tools.ts`
- **Acceptance criteria:**
  - Exports `TOOL_DEFINITIONS: Anthropic.Tool[]` array: `web_search` (Claude native server tool), `flight_lookup`, `crm_cross_property`
  - Exports `dispatchTool(name, input): Promise<unknown>` switch
  - Each handler returns serialisable JSON; dispatcher stringifies for `tool_result.content`
  - Unknown tool name throws with structured error (caught and reported as SSE error event by T7)
- **Test plan:**
  - Unit: `dispatchTool('crm_cross_property', { guestId: 'chen-mei-ling' })` returns array
  - Unit: `dispatchTool('unknown', {})` throws with informative message
- **Rollback plan:** Delete file.
- **Blast radius:** Sole consumer is T7's agent loop.
- **Research needed:** No — verify the current Claude `web_search` tool type string against the SDK at build time.

### Task 7: Main agent loop with SSE streaming
- **Objective:** The centerpiece — orchestrates POS → research → synthesize → discretion → done, streaming events to the UI.
- **Complexity:** Complex
- **Dependencies:** T6
- **Files to change:** `app/api/thread/route.ts`
- **Acceptance criteria:**
  - `POST /api/thread` accepts `{ guestId, propertyId, flightNumber? }`
  - Returns `text/event-stream` with `Cache-Control: no-cache`, `Connection: keep-alive`
  - `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`
  - Phases emit SSE events in order: `verify` (POS computed) → `research` (multiple tool-call begin/end events) → `synthesize` (final dossier) → `discretion` (second Claude pass result + redaction log) → `done`
  - Uses `Anthropic.messages.stream` with tools, loops on `tool_use` blocks until `stop_reason === 'end_turn'`, max 8 iterations
  - Discretion Layer is a separate Claude Sonnet 4.6 call with `DISCRETION_LAYER_SYSTEM`
  - Caps: `max_tokens = 4096`, model `claude-opus-4-7` for research, `claude-sonnet-4-6` for discretion
  - Errors emit `{ phase: 'error', payload: { message } }` and close the stream gracefully
  - If `process.env.DEMO_MODE === '1'`, bypass Claude entirely and replay events from `data/fixtures/<guestId>-<propertyId>.json` with realistic delays
- **Test plan:**
  - Smoke: `curl -N -X POST http://localhost:3000/api/thread -d '{"guestId":"chen-mei-ling","propertyId":"sand-hill"}' -H "Content-Type: application/json"` — observe SSE events stream in correct phase order, terminate with `done`
  - Integration: full run with real Claude key — final dossier parses against `Dossier` type
  - Smoke (demo mode): `DEMO_MODE=1` run returns fixture-based events within 5s total
  - Failure: malformed body → 400, surfaces in `error` phase
- **Rollback plan:** Route returns 503 with helpful message; UI falls back to `DEMO_MODE` fixtures.
- **Blast radius:** Whole demo. This is *the* critical path.
- **Research needed:** No — shared product spec is exhaustive.

### Task 8: ElevenLabs voice route
- **Objective:** Power the "BRIEF ME" button with a streamed MP3 of the spoken brief.
- **Complexity:** Simple
- **Dependencies:** T7 (so we have a real dossier to brief from in integration tests)
- **Files to change:** `app/api/voice/route.ts`
- **Acceptance criteria:**
  - `POST /api/voice` accepts `{ text: string, voiceId?: string }` (default `Xb7hH8MSUJpSbSDYk0k2` Alice)
  - Proxies to `https://api.elevenlabs.io/v1/text-to-speech/{voiceId}/stream` with model `eleven_turbo_v2_5` and settings from shared product spec
  - Streams `audio/mpeg` response back to client with `Cache-Control: public, max-age=3600` (cache identical briefs)
  - Hashes `text + voiceId` and stores in a `/tmp/voice-cache` mp3 for cheap memo (cuts demo re-render cost to zero)
  - Missing/invalid `ELEVENLABS_API_KEY` → 503 with JSON error
- **Test plan:**
  - Smoke: `curl -X POST localhost:3000/api/voice -H "Content-Type: application/json" -d '{"text":"Briefed."}' --output brief.mp3 && file brief.mp3` → "MPEG ADTS..."
  - Smoke: identical request again returns same bytes from cache, <50ms response
- **Rollback plan:** Delete file. UI shows greyed-out BRIEF ME button.
- **Blast radius:** Just the voice feature.
- **Research needed:** No — already validated via direct API smoke test.

### Task 9: agent.json handoff endpoint
- **Objective:** The 2030 platform-protocol signal for Greycroft judges.
- **Complexity:** Simple
- **Dependencies:** T1
- **Files to change:** `app/.well-known/agent.json/route.ts`
- **Acceptance criteria:**
  - `GET /.well-known/agent.json` returns the JSON document from the shared product spec
  - `Content-Type: application/json`
  - Validates against itself (well-formed JSON, no missing fields)
- **Test plan:**
  - Smoke: `curl localhost:3000/.well-known/agent.json | jq .name` returns `"Red Thread"`
- **Rollback plan:** Delete file.
- **Blast radius:** None.
- **Research needed:** No.

### Task 10: Pre-cached fixtures + DEMO_MODE
- **Objective:** Insurance against wifi failure during the live demo.
- **Complexity:** Simple
- **Dependencies:** T7 (need real runs to capture fixtures from)
- **Files to change:** `data/fixtures/chen-mei-ling__sand-hill.json`, `data/fixtures/chen-mei-ling__hong-kong.json`, `data/fixtures/chen-mei-ling__crillon-paris.json`, plus `scripts/capture-fixture.ts`
- **Acceptance criteria:**
  - Each fixture is a captured array of SSE events from a real T7 run, in chronological order with `delayMs` per event
  - `app/api/thread/route.ts` (T7) reads + replays these when `DEMO_MODE=1`
  - Capture script writes fresh fixtures from a single curl + parse run
- **Test plan:**
  - Smoke: `DEMO_MODE=1 curl -N ...` produces same shape of events as live run
  - Compare event counts and final dossier shape against live-mode run
- **Rollback plan:** Delete fixtures dir.
- **Blast radius:** Insurance only.
- **Research needed:** No.

### Task 11: README + run instructions
- **Objective:** Onboard Terminal 1 and future-us.
- **Complexity:** Simple
- **Dependencies:** T7, T8, T9
- **Files to change:** `README.md`
- **Acceptance criteria:**
  - Documents stack, env vars, `op run --` wrapper command for local dev, `DEMO_MODE` toggle, deploy command
  - Lists the SSE event shape so Terminal 1 has a contract reference
- **Test plan:** N/A
- **Rollback plan:** N/A
- **Blast radius:** None.
- **Research needed:** No.

## Risks

1. **Claude API token budget overrun.** Mitigations: `max_tokens = 4096` cap, `max_turns = 8` cap, Sonnet 4.6 for the Discretion + POS passes (cheaper than Opus), DEMO_MODE skips API entirely for repeat demos.
2. **Wifi failure during the live demo.** Mitigation: `DEMO_MODE=1` replays captured SSE fixtures with realistic per-event timing — judges cannot distinguish from a live run.
3. **Type contract drift between Terminal 1 and Terminal 2.** Mitigation: both terminals import from `lib/types.ts` (locked first in T2, single source of truth). SSE event schema is part of that file.
4. **AviationStack key not provisioned in time.** Mitigation: env-aware mock fallback already designed — the mock returns deterministic plausible data and the demo never blocks on it.
5. **Vercel SSE quirks on Edge runtime.** Mitigation: explicit `export const runtime = 'nodejs'` on the agent route.

## Research Notes

N/A — research gated out. Shared product spec (pasted into approval conversation) is the authoritative source.
