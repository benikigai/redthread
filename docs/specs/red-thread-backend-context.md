# Context: Red Thread — Backend Services (Terminal 2)
**Last updated:** 2026-05-16
**Phase:** Spec approved
**Approved option:** A — Single SSE Route on `/api/thread`
**Tasks:** 11 (Simple: 7, Moderate: 3, Complex: 1)
**Key risks:**
- Claude token budget overrun → max_tokens=4096 + max_turns=8 + Sonnet 4.6 for filter passes
- Wifi failure during live demo → `DEMO_MODE=1` replays fixture SSE events with realistic timing
- Type contract drift between Terminal 1 and Terminal 2 → both import from `lib/types.ts` (T2)
**Critic verdict:** APPROVE — no critical flaws. Concerns addressed inline (Vercel Node runtime, demo-mode fallback, token caps, type contract, env-aware flight tool).
**Research:** N/A — gated out (no existing codebase; shared product spec is exhaustive)
**Stack:** Next.js 14 App Router + TypeScript + Tailwind + Vercel; `@anthropic-ai/sdk`; ElevenLabs REST direct
**Models:** `claude-opus-4-7` (research), `claude-sonnet-4-6` (Discretion Layer, POS calculator)
**Secrets:** `op://Clawdbot/Anthropic API Key/credential`; `ELEVENLABS_API_KEY` in shell secrets; AviationStack key TBD (mock fallback)
**Coordination:** Terminal 2 scaffolds `main` (T1 of this spec), Terminal 1 pulls and owns `components/` + pages. Contract = `lib/types.ts`.
