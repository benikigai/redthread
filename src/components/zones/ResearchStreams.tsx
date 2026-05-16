"use client";

import { ZoneShell } from "./ZoneShell";
import { useDossier } from "@/lib/dossierStore";
import type { ToolCallTrace } from "@/lib/types";

const STATIC_STREAMS: ToolCallTrace[] = [
  { tool: "flight_lookup", status: "complete", result: "UA857 SFO arr 15:42 — 18 min early" },
  { tool: "prior_stays", status: "complete", result: "Hong Kong ×2 · Phuket ×1 — flags: down-free, 19°C" },
  { tool: "social_signal", status: "complete", result: "Founder; recent post — Stanford GSB visit" },
  { tool: "placemaker_local", status: "streaming", result: "Querying Sand Hill Placemaker network…" },
  { tool: "calendar_overlay", status: "queued", result: "Awaiting consent: agent-to-agent handoff" },
];

export function ResearchStreams() {
  const dossier = useDossier((s) => s.dossier);
  const liveToolCalls = useDossier((s) => s.liveToolCalls);
  const phase = useDossier((s) => s.phase);

  // Prefer streaming-live state while the run is in flight; fall back to the
  // dossier's final toolCalls once complete; static demo otherwise.
  const running = phase !== "idle" && phase !== "error";
  const streams: ToolCallTrace[] =
    liveToolCalls.length > 0
      ? liveToolCalls
      : dossier
        ? dossier.toolCalls
        : STATIC_STREAMS;

  return (
    <ZoneShell
      label="Zone I"
      title="Research streams"
      hint={
        running
          ? `${phaseLabel(phase)} — gated by Privacy Openness Score.`
          : "Parallel tool calls, gated by Privacy Openness Score."
      }
    >
      <ul className="space-y-3">
        {streams.map((s, i) => (
          <li
            key={`${s.tool}-${i}`}
            className="border hairline bg-paper-soft px-4 py-3"
            style={{
              opacity: s.status === "queued" ? 0.55 : 1,
              transition: "opacity 200ms",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="caps text-ink-mute">{s.tool}</span>
              <StatusBadge status={s.status} />
            </div>
            <div className="mt-2 text-sm text-ink-mute leading-snug">
              {s.result ?? (s.args ? JSON.stringify(s.args).slice(0, 80) : "—")}
            </div>
          </li>
        ))}
      </ul>
    </ZoneShell>
  );
}

function phaseLabel(p: string) {
  switch (p) {
    case "verify":
      return "Verifying identity";
    case "research":
      return "Researching";
    case "synthesize":
      return "Synthesizing dossier";
    case "discretion":
      return "Discretion pass";
    case "done":
      return "Complete";
    default:
      return p;
  }
}

function StatusBadge({ status }: { status: ToolCallTrace["status"] }) {
  if (status === "streaming") {
    return (
      <span className="caps text-thread flex items-center gap-1.5">
        <span className="relative inline-flex w-1.5 h-1.5">
          <span className="absolute inset-0 rounded-full bg-thread animate-ping opacity-70" />
          <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-thread" />
        </span>
        streaming
      </span>
    );
  }
  if (status === "complete") return <span className="caps text-thread-deep">complete</span>;
  if (status === "failed") return <span className="caps text-thread">failed</span>;
  return <span className="caps text-ink-faint">queued</span>;
}
