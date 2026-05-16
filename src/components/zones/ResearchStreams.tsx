import { ZoneShell } from "./ZoneShell";

const STREAMS = [
  { tool: "flight_lookup", status: "complete", line: "UA857 SFO arr 15:42 — 18 min early" },
  { tool: "prior_stays", status: "complete", line: "Hong Kong ×2 · Phuket ×1 — flags: down-free, 19°C" },
  { tool: "social_signal", status: "complete", line: "Founder; recent post — Stanford GSB visit" },
  { tool: "placemaker_local", status: "streaming", line: "Querying Sand Hill Placemaker network…" },
  { tool: "calendar_overlay", status: "queued", line: "Awaiting consent: agent-to-agent handoff" },
];

export function ResearchStreams() {
  return (
    <ZoneShell label="Zone I" title="Research streams" hint="Parallel tool calls, gated by Privacy Openness Score.">
      <ul className="space-y-3">
        {STREAMS.map((s) => (
          <li key={s.tool} className="border hairline bg-paper-soft px-4 py-3">
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

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "complete" ? "text-sage-deep" : status === "streaming" ? "text-thread" : "text-ink-faint";
  return <span className={`caps ${color}`}>{status}</span>;
}
