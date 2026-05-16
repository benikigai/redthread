# Context: Red Thread — Backend Services (Terminal 2)
**Last updated:** 2026-05-16 (execution complete)
**Phase:** Execution complete
**Approved option:** JSON-default `/api/agent` with SSE opt-in via `Accept: text/event-stream`
**Tasks:** 9/9 complete (Simple: 6, Moderate: 2, Complex: 1)

**Final status:**
- All backend deliverables shipped and pushed to `origin/main`
- Live tests: `bun typecheck` clean, `bun lint` clean, JSON agent run 200 (70.8s), voice 200 (393ms), agent.json 200 (3ms)
- DEMO_MODE=1 verified: 86ms JSON replay, SSE replays 5 phases, missing fixture → 503
- Three fixtures captured for lin-chen × { sand-hill, hong-kong, crillon }
- README has documented API Contract section

**Key risks / follow-ups:**
- Live agent run ~60-90s — use DEMO_MODE for live demo presentations
- AviationStack free tier 100 calls/month — avoid passing flightNumber in demo runs unless required
- No automated test suite — only one-shot smokes during yolo
- Fixture timestamps may need recapture for a different demo day

**Two-terminal coordination notes:**
- T1's UI continues to work against the existing JSON Dossier contract — SSE was added purely additively
- `src/lib/types.ts` got one additive change: `"phuket"` added to `PropertyId` union (for prior-stay reference)
- Voice route default: Alice (`Xb7hH8MSUJpSbSDYk0k2`); UI can override via voiceId in request body or `ELEVENLABS_VOICE_ID` env
- Force-push of git history happened to strip Claude attribution; T1 needs `git fetch && git reset --hard origin/main` next pull
