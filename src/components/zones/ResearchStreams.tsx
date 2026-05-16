"use client";

import { ZoneShell } from "./ZoneShell";
import { useDossier } from "@/lib/dossierStore";
import type { ToolCallTrace } from "@/lib/types";

const STATIC_STREAMS = [
  { tool: "flight_lookup", status: "complete", line: "UA857 SFO arr 15:42 — 18 min early" },
  { tool: "prior_stays", status: "complete", line: "Hong Kong ×2 · Phuket ×1 — flags: down-free, 19°C" },
  { tool: "social_signal", status: "complete", line: "Founder; recent post — Stanford GSB visit" },
  { tool: "placemaker_local", status: "streaming", line: "Querying Sand Hill Placemaker network…" },
  { tool: "calendar_overlay", status: "queued", line: "Awaiting consent: agent-to-agent handoff" },
];

export function ResearchStreams() {
  const dossier = useDossier((s) => s.dossier);
  const streams = dossier ? toStreams(dossier.toolCalls) : STATIC_STREAMS;
  return (
    <ZoneShell label="Zone I" title="Research streams" hint="Parallel tool calls, gated by Privacy Openness Score.">
      <ul className="space-y-3">
        {streams.map((s, i) => (
          <li key={`${s.tool}-${i}`} className="border hairline bg-paper-soft px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="caps text-ink-mute">{s.tool}</span>
              <StatusBadge status={s.status} />
            </div>
            <div className="mt-2 text-sm text-ink-mute leading-snug">{s.line}</div>
          </li>
        ))}
      </ul>
    </ZoneShell>
  );
}

function toStreams(toolCalls: ToolCallTrace[]) {
  return toolCalls.map((tc) => ({
    tool: tc.tool,
    status: tc.status,
    line: tc.result ?? (tc.args ? JSON.stringify(tc.args).slice(0, 80) : "—"),
  }));
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "complete" ? "text-thread-deep" : status === "streaming" ? "text-thread" : "text-ink-faint";
  return <span className={`caps ${color}`}>{status}</span>;
}
