"use client";

// Red Thread — demo trigger.
//
// A pair of CTAs that live on the dashboard so the demo can run end-to-end
// from a single URL (app.redthread.boutique). One button kicks the agent
// stream directly so judges see "the work" stream in tool-by-tool; the
// other opens the voice intake.
//
// Both use the shared zustand store so the existing zone components animate
// in place — no navigation, no page reload.

import Link from "next/link";
import { useEffect, useState } from "react";

import { AgentHandoffPanel } from "@/components/AgentHandoffPanel";
import { streamAgent } from "@/components/DemoLoader";
import { useDossier, type RunPhase } from "@/lib/dossierStore";

const DEFAULT_GUEST = "ben";

export function DemoTrigger() {
  const phase = useDossier((s) => s.phase);
  const dossier = useDossier((s) => s.dossier);
  const liveToolCalls = useDossier((s) => s.liveToolCalls);
  const error = useDossier((s) => s.error);
  const [aborter, setAborter] = useState<AbortController | null>(null);
  const [showHandoff, setShowHandoff] = useState(false);

  useEffect(() => () => aborter?.abort(), [aborter]);

  const running = phase !== "idle" && phase !== "done" && phase !== "error";
  const completed = phase === "done" && !!dossier;

  const runDemo = async () => {
    const store = useDossier.getState();
    const propertyId = store.activeProperty; // capture before clear() to be safe
    store.clear();
    store.setActiveProperty(propertyId);
    store.startRun("manual");
    const ac = new AbortController();
    setAborter(ac);
    try {
      await streamAgent({ guestId: DEFAULT_GUEST, propertyId }, ac.signal);
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : String(err);
      useDossier.getState().setError(msg);
    } finally {
      setAborter(null);
    }
  };

  const reset = () => {
    aborter?.abort();
    useDossier.getState().clear();
    setShowHandoff(false);
  };

  const startHandoff = () => {
    useDossier.getState().clear();
    setShowHandoff(true);
  };

  return (
    <div className="mt-8 border hairline bg-paper-soft px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="caps text-thread-deep">Live demo</div>
          <div className="text-sm text-ink-mute mt-1">
            {running
              ? phaseHeadline(phase, liveToolCalls.length)
              : completed
                ? "Dossier rendered. Reset to run again, or take the voice intake."
                : error
                  ? `Error: ${error}`
                  : "Run the agent on Mr. Shyong — Rosewood Hong Kong. Or step through the voice intake first."}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {completed || error ? (
            <button
              type="button"
              onClick={reset}
              className="caps text-ink hover:text-thread-deep border hairline px-4 py-2 transition-colors"
            >
              Reset
            </button>
          ) : null}
          <Link
            href="/intake"
            className="caps text-ink hover:text-thread-deep border hairline px-4 py-2 transition-colors"
          >
            Voice intake →
          </Link>
          <button
            type="button"
            disabled={running || showHandoff}
            onClick={startHandoff}
            className="caps text-ink hover:text-thread-deep border hairline px-4 py-2 transition-colors disabled:opacity-50"
          >
            Agent handoff
          </button>
          <button
            type="button"
            disabled={running}
            onClick={runDemo}
            className="caps bg-rose-deep text-on-dark px-5 py-2 disabled:opacity-50 hover:bg-rose-darker transition-colors"
          >
            {running ? "Threading…" : completed ? "Run again" : "Run agent"}
          </button>
        </div>
      </div>
      {showHandoff && (
        <AgentHandoffPanel onClose={() => setShowHandoff(false)} />
      )}
    </div>
  );
}

function phaseHeadline(phase: RunPhase, toolCount: number): string {
  switch (phase) {
    case "verify":
      return "Verifying identity…";
    case "research":
      return toolCount > 0
        ? `Researching — ${toolCount} tool call${toolCount === 1 ? "" : "s"} so far.`
        : "Researching…";
    case "synthesize":
      return "Synthesizing the dossier…";
    case "discretion":
      return "Discretion pass — filtering by Privacy Openness Score.";
    case "done":
      return "Dossier rendered.";
    default:
      return "Working…";
  }
}
