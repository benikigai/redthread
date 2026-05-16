"use client";

import { ZoneShell } from "./ZoneShell";
import { useDossier } from "@/lib/dossierStore";
import type { ToolCallTrace } from "@/lib/types";

// Per-tool metadata so each Research Stream card shows the actual tech
// stack behind the call (e.g., AviationStack API for flight_lookup,
// Anthropic's web_search server tool for web search). Provenance + the
// args we sent + the result we got back — "show the work."
const TOOL_META: Record<string, { label: string; tech: string }> = {
  flight_lookup: {
    label: "Flight lookup",
    tech: "AviationStack API",
  },
  crm_cross_property: {
    label: "CRM · cross-property",
    tech: "Red Thread CRM (data/guests/*.json)",
  },
  prior_stays: {
    label: "Prior stays",
    tech: "Red Thread CRM",
  },
  web_search: {
    label: "Web search",
    tech: "Anthropic web_search server tool · Claude",
  },
  social_signal: {
    label: "Social signal",
    tech: "Public web · Exa",
  },
  placemaker_local: {
    label: "Placemaker · local",
    tech: "Rosewood Placemakers DB",
  },
  calendar_overlay: {
    label: "Calendar overlay",
    tech: "Guest agent handoff · /.well-known/agent.json",
  },
  discretion_filter: {
    label: "Discretion Layer",
    tech: "Claude Haiku 4.5 — second-pass principled redaction",
  },
  voice_intake: {
    label: "Voice intake",
    tech: "ElevenLabs Convai · 5-question pre-arrival briefing",
  },
  agent_handoff: {
    label: "Agent handoff",
    tech: "A2A protocol · /.well-known/agent.json",
  },
};

const STATIC_STREAMS: ToolCallTrace[] = [
  {
    tool: "flight_lookup",
    status: "complete",
    args: { flightNumber: "CX872" },
    result: "CX872 SFO → HKG · on time",
  },
  {
    tool: "crm_cross_property",
    status: "complete",
    args: { guestId: "ben" },
    result: "Hong Kong ×2 · Sand Hill ×1 — flags: down-free, 20°C, vegetarian",
  },
  {
    tool: "web_search",
    status: "complete",
    args: { query: "Benjamin Shyong OpenClaw Series A" },
    result: "Series A announcement (Mar 2026) · HK FinTech Week keynote (Oct 2025)",
  },
  {
    tool: "placemaker_local",
    status: "streaming",
    result: "Querying Hong Kong Placemaker network…",
  },
  {
    tool: "calendar_overlay",
    status: "queued",
    result: "Awaiting consent: agent-to-agent handoff",
  },
];

export function ResearchStreams() {
  const dossier = useDossier((s) => s.dossier);
  const liveToolCalls = useDossier((s) => s.liveToolCalls);
  const phase = useDossier((s) => s.phase);

  // Prefer streaming-live state while the run is in flight; fall back to the
  // dossier's final toolCalls once complete; empty otherwise (dashboard
  // is blank until the user submits the reservation form above).
  const running = phase !== "idle" && phase !== "error";
  const streams: ToolCallTrace[] =
    liveToolCalls.length > 0
      ? liveToolCalls
      : dossier
        ? dossier.toolCalls
        : [];
  if (streams.length === 0) {
    return (
      <ZoneShell
        label="Zone I"
        title="Research streams"
        hint="Parallel tool calls, gated by Privacy Openness Score."
      >
        <div className="py-10 text-center space-y-2">
          <div className="caps text-ink-faint">Awaiting briefing</div>
          <p className="font-display italic text-ink-mute text-sm leading-snug max-w-[34ch] mx-auto">
            Tool calls will stream here as the agent works — flight, CRM, web search, Discretion Layer.
          </p>
        </div>
      </ZoneShell>
    );
  }

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
        {streams.map((s, i) => {
          const meta = TOOL_META[s.tool] ?? { label: s.tool, tech: "internal" };
          const argSummary = formatArgs(s.args);
          return (
            <li
              key={`${s.tool}-${i}`}
              className="border hairline bg-paper-soft px-4 py-3"
              style={{
                opacity: s.status === "queued" ? 0.55 : 1,
                transition: "opacity 200ms",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] tracking-[0.22em] uppercase font-medium text-ink-mute">
                    {meta.label}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-brass">
                    <span className="inline-block w-1 h-1 rounded-full bg-brass" />
                    <span className="italic">{meta.tech}</span>
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </div>

              {argSummary && (
                <div className="mt-2 text-[11px] text-ink-faint font-mono leading-snug">
                  → {argSummary}
                </div>
              )}

              {s.result && (
                <div className="mt-1.5 text-sm text-ink leading-snug">
                  {s.result}
                </div>
              )}
            </li>
          );
        })}
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

function formatArgs(args: unknown): string | null {
  if (!args || typeof args !== "object") return null;
  const obj = args as Record<string, unknown>;
  const entries = Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .slice(0, 3);
  if (entries.length === 0) return null;
  return entries
    .map(([k, v]) => {
      if (typeof v === "string") {
        const trimmed = v.length > 48 ? `${v.slice(0, 45)}…` : v;
        return `${k}: ${trimmed}`;
      }
      return `${k}: ${JSON.stringify(v)}`;
    })
    .join(" · ");
}

function StatusBadge({ status }: { status: ToolCallTrace["status"] }) {
  if (status === "streaming") {
    return (
      <span className="text-[10px] tracking-[0.22em] uppercase font-medium text-thread flex items-center gap-1.5 shrink-0">
        <span className="relative inline-flex w-1.5 h-1.5">
          <span className="absolute inset-0 rounded-full bg-thread animate-ping opacity-70" />
          <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-thread" />
        </span>
        streaming
      </span>
    );
  }
  if (status === "complete")
    return (
      <span className="text-[10px] tracking-[0.22em] uppercase font-medium text-thread-deep shrink-0">
        complete
      </span>
    );
  if (status === "failed")
    return (
      <span className="text-[10px] tracking-[0.22em] uppercase font-medium text-thread shrink-0">
        failed
      </span>
    );
  return (
    <span className="text-[10px] tracking-[0.22em] uppercase font-medium text-ink-faint shrink-0">
      queued
    </span>
  );
}
