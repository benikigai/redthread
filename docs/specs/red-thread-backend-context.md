# Context: Red Thread — Backend Services (Terminal 2)
**Last updated:** 2026-05-16 (post-realignment)
**Phase:** Spec approved & realigned
**Approved option:** JSON-default `/api/agent` with SSE opt-in via `Accept: text/event-stream`
**Tasks:** 9 (Simple: 6, Moderate: 2, Complex: 1)

**T1 (terminal 1) already shipped:** Next 16 + Tailwind 4 + bun scaffold under `src/`, `src/lib/types.ts` (contract), `src/lib/anthropic.ts` (SDK singleton + MODELS const with Opus 4.7 + Haiku 4.5), `src/app/api/agent/route.ts` stub, four zone components, initial seed data with `_t2_notes` flags for what T2 should expand, README.md with the working agreement.

**Working agreement (verbatim from T1's README):**
- T2 owns `src/app/api/**` and `data/**`
- T1 owns `src/components/**` and `src/app/page.tsx`
- Both can edit `src/lib/anthropic.ts`
- `src/lib/types.ts` is the contract — additive ok, renames/removals require sync

**Key contract details (decided by T1, honored by T2):**
- `Guest.privacyOpennessScore` is a `number 0–100` field (not a separate computed object). No `computePOS()` Claude call needed — agent reads it directly and bands it.
- `Dossier.suppressed: { signal, reason }[]` replaces the more elaborate `RedactionLog`.
- `Dossier.toolCalls: ToolCallTrace[]` is embedded — UI can render the live stream from a single returned dossier even without SSE.
- Discretion model is `claude-haiku-4-5` (not Sonnet 4.6 as originally specced).

**Key risks:**
- Claude token budget overrun → max_tokens=4096, max_turns=8, Haiku for filter pass, DEMO_MODE bypass
- Wifi failure during live demo → `DEMO_MODE=1` replays fixture JSON or SSE
- Next.js 16 breaking changes from training-data conventions → implementer must consult `node_modules/next/dist/docs/` per `AGENTS.md`
- Type contract drift → T2 additive-only; renames need explicit sync with T1

**Critic verdict:** APPROVE (inline pass, subagent skipped for time)

**Research:** N/A — T1's scaffold is itself the de-risking artifact

**Secrets:**
- `ANTHROPIC_API_KEY` → `op://Clawdbot/Anthropic API Key/credential`
- `ELEVENLABS_API_KEY` → shell secrets (already exported)
- `AVIATIONSTACK_API_KEY` → optional, mock fallback designed in

**Local dev command:** `op run -- bun dev`
