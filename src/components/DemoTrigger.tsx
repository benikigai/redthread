"use client";

// Red Thread — demo trigger.
//
// Status banner + two entry CTAs that live on the dashboard so the demo can
// run end-to-end from a single URL (app.redthread.boutique):
//   · Voice intake → narrated guest-side flow at /intake
//   · Agent handoff → A2A protocol demo (Threadkeeper ↔ Atlas)
// Both end up calling /api/agent, so a third "Run agent" button would be
// redundant. The status banner reflects whichever stream is in flight, and
// a Reset button appears when the dossier is rendered or errored.

import Link from "next/link";
import { useState } from "react";

import { AgentHandoffPanel } from "@/components/AgentHandoffPanel";
import { useDossier, type RunPhase } from "@/lib/dossierStore";

export function DemoTrigger() {
  const phase = useDossier((s) => s.phase);
  const dossier = useDossier((s) => s.dossier);
  const liveToolCalls = useDossier((s) => s.liveToolCalls);
  const error = useDossier((s) => s.error);
  const [showHandoff, setShowHandoff] = useState(false);

  const running = phase !== "idle" && phase !== "done" && phase !== "error";
  const completed = phase === "done" && !!dossier;

  const reset = () => {
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
                ? "Dossier rendered. Reset to begin again."
                : error
                  ? `Error: ${error}`
                  : "Begin Mr. Shyong's pre-arrival — by voice intake or by agent-to-agent handoff."}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {(completed || error) && (
            <button
              type="button"
              onClick={reset}
              className="text-[11px] tracking-[0.22em] uppercase font-medium text-ink hover:text-thread-deep border hairline px-4 py-2 transition-colors"
            >
              Reset
            </button>
          )}
          <Link
            href="/intake"
            className={
              "text-[11px] tracking-[0.22em] uppercase font-medium text-paper bg-rose-deep hover:bg-rose-darker px-5 py-2 transition-colors inline-flex items-center gap-2 " +
              (running ? "pointer-events-none opacity-50" : "")
            }
            aria-disabled={running}
          >
            Voice intake <span aria-hidden="true">→</span>
          </Link>
          <button
            type="button"
            disabled={running || showHandoff}
            onClick={startHandoff}
            className="text-[11px] tracking-[0.22em] uppercase font-medium text-paper bg-rose-deep hover:bg-rose-darker px-5 py-2 transition-colors disabled:opacity-50"
          >
            Agent handoff
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
