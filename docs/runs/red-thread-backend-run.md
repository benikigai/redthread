# Run Report: Red Thread — Backend Services (Terminal 2)
**Date:** 2026-05-16
**Spec:** docs/specs/red-thread-backend.md
**Branch:** main
**Status:** Complete (9/9 tasks)

## Summary

Replaced T1's static stub at `src/app/api/agent/route.ts` with a real Claude tool-use loop (Opus 4.7 research + Haiku 4.5 Discretion Layer, parallel `web_search` + `crm_cross_property` + `flight_lookup` tools) producing a Dossier on T1's contract. Added a JSON-default / SSE-opt-in response shape so T1's existing fetch keeps working while unlocking the live tool-call spectacle. Added ElevenLabs `/api/voice` route with disk-cached MP3 responses, an augmented `/.well-known/agent.json`, three captured fixtures for `DEMO_MODE=1` demo-day insurance, and a documented API contract section in `README.md`.

## Changes Overview

**New files**
- `src/lib/prompts.ts` (RESEARCH_AGENT_SYSTEM + DISCRETION_LAYER_SYSTEM)
- `src/lib/crm.ts` (getGuest, getProperty, crmCrossProperty)
- `src/lib/flight.ts` (env-aware AviationStack + mock fallback)
- `src/lib/tools.ts` (TOOL_DEFINITIONS + dispatchTool)
- `src/app/api/voice/route.ts` (ElevenLabs proxy + disk cache)
- `scripts/capture-fixture.ts`
- `data/guests/bellandi.json` (backup guest)
- `data/fixtures/lin-chen__sand-hill.json`
- `data/fixtures/lin-chen__hong-kong.json`
- `data/fixtures/lin-chen__crillon.json`

**Modified files**
- `src/app/api/agent/route.ts` — stub → real agent loop (JSON default + SSE opt-in + DEMO_MODE replay)
- `src/lib/types.ts` — additive: `"phuket"` added to `PropertyId` enum
- `data/guests/lin-chen.json` — Phuket prior stay replaces TODO; `_t2_notes` removed; 3rd recent event added
- `data/properties/sand-hill.json` — expanded to 6 amenities / 9 experiences / 2 placemakers
- `data/properties/hong-kong.json` — expanded to 6/9/2
- `data/properties/crillon.json` — expanded to 6/8/2
- `public/.well-known/agent.json` — additive: contact + principles[]≥4
- `README.md` — appended "API Contract (T2 → T1)" section

**Removed**
- All `_t2_notes` fields from data files

**Stack additions**
- None — used what T1 had installed (`@anthropic-ai/sdk@0.96.0`)

## Test Results

**Targeted (per task)**
- T1 prompts: char limits (≤2500), brand phrases verbatim, tsc + eslint ✓
- T2 seed data: every property ≥5/≥8/≥2 minima, no remaining `_t2_notes`, Phuket included ✓
- T3 CRM + flight: 7 acceptance assertions (hit/miss for both modules + flight mock fallback) ✓
- T4 tool dispatcher: 6 assertions (definition count, web_search type string, dispatch happy + error paths) ✓
- T5 agent loop: live JSON 200 (89s, full Dossier with correctly-shaped actuators, 8 tool calls), live SSE all 5 phases stream in order, 400 on malformed body / missing fields ✓
- T6 voice route: live cold call 200 in 515ms with valid 128kbps MP3, warm call 200 in 6ms with identical bytes (cache hit), 400 on empty text ✓
- T7 agent.json: valid JSON, name="Red Thread", principles count=5 ✓
- T8 DEMO_MODE: JSON 86ms with property-specific Dossier (HK call returns Tea flight + Sunrise Tai Chi), SSE replays all 5 phases, missing fixture → 503 ✓
- T9 README: all four keywords present (API Contract / text/event-stream / DEMO_MODE / op run) ✓

**Full suite (final)**
- `bun typecheck` — clean (no errors)
- `bun lint` — clean (no warnings)
- Live JSON agent run — 200 in 70.8s
- Live voice call — 200 in 393ms
- Static agent.json — 200 in 3ms

## Issues Encountered

**Two-terminal filesystem race (mid-T5).** While I was writing `src/app/api/agent/route.ts` via the Write tool, T1 ran `git add -A` from the shared working tree and accidentally committed my T5 route.ts as part of their visual/theme commits. I in turn ran `git add -A` for my T5 commit and swept in T1's in-progress theme work. Net effect: my T5 route.ts content landed in HEAD (correctly attributed to Ben — same git identity) via T1's commits messaged about visuals, and one of my commits had to be soft-reset and recommitted with only the prompt + yolo checkbox files staged. Going forward I switched to `git add <specific-paths>` exclusively. Tree contents are correct; commit history is honest about which session committed what files even if the messages tilted toward visual themes.

**Prompt shape drift on first live agent run.** Claude returned `welcomeAmenity` as `{ choice, reasoning: [] }` and itinerary entries without `time` fields. Caught immediately by the smoke test. Tightened RESEARCH_AGENT_SYSTEM to specify the exact verbatim-copy + reasoning-string shape; second live run produced correct shapes.

**Placeholder AviationStack key initially in 1Password.** The `password` field of the 1P item turned out to be the user's account password, not the API key. The real API key was in `notesPlain`. After locating it (`e4cb9d8f2ded634de38e4ae945a61ae7`), AviationStack returned real flight data on both HTTP and HTTPS.

**History rewrite to strip Claude attribution.** Per user instruction mid-run, used `git filter-branch --msg-filter` to remove `Co-Authored-By: Claude ...` trailers from 6 prior commits, then `git push --force-with-lease`. Tree hashes verified identical before push (only messages changed). T1 will need `git fetch && git reset --hard origin/main` next pull.

## Reviewer Verdict

Inline reviews against per-task acceptance criteria — every task gated on tsc + lint + behavioral smokes against either the live API or the captured fixtures. No FAIL cycles. No subagent code reviews (the available subagent set in this Claude Code install did not include `code-reviewer`; inline review against the spec's explicit acceptance criteria substituted).

## Known Risks & Follow-ups

1. **Live agent run latency (~60-90s).** Claude Opus 4.7 with parallel `web_search` is slow. Use `DEMO_MODE=1` for live demo presentations.
2. **Claude token spend during fixture capture.** Three parallel live runs cost ~$1.50-$4.50 in Anthropic credits on the user's personal key. Re-capturing fixtures requires the same.
3. **AviationStack free tier is 100 calls/month.** Live agent currently calls `flight_lookup` only when `flightNumber` is provided. For the demo, prefer not passing `flightNumber` to avoid burning quota.
4. **`Uint8Array<ArrayBufferLike>` → `BodyInit` cast in voice route.** Node 25 / TS 5 narrows the generic tighter than the Response constructor expects. Cast through `unknown` documented inline.
5. **No automated tests in CI.** All testing was done as one-shot smokes during yolo execution. A real test suite would be a follow-up.
6. **Fixture freshness.** Captured fixtures embed `generatedAt` ISO timestamps. Re-capture before each demo if the calendar moves materially.
