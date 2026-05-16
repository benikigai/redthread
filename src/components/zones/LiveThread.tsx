"use client";

import { ZoneShell } from "./ZoneShell";
import {
  useDossier,
  type ArrivalStep,
  type ArrivalSummary,
  type InStayEvent,
} from "@/lib/dossierStore";

const STATIC_BEATS = [
  { t: "−02:14", phase: "pre", note: "Thread cast — dossier complete, room set, amenity sourced" },
  { t: "00:00", phase: "arrive", note: "Arrival — butler greets by name, no front-desk pause" },
  { t: "+04:20", phase: "on", note: "Spa visit logged — tomorrow’s table moved to quieter alcove" },
  { t: "+18:10", phase: "on", note: "Itinerary nudge held: morning hike — guest stayed in" },
  { t: "+72:00", phase: "post", note: "Thread continues — Hong Kong butler notified for next stay" },
  { t: "+120d", phase: "post", note: "Bangkok exhibit surfaces — HK butler reaches out, not marketing" },
];

interface Beat {
  t: string;
  phase: string;
  note: string;
}

function arrivalBeats(steps: ArrivalStep[], summary: ArrivalSummary | null): Beat[] {
  const beats: Beat[] = [];
  for (const s of steps) {
    if (s.status === "complete" && s.value) {
      const t = beatTimeFor(s.id);
      beats.push({ t, phase: s.id === "eta" ? "arrive" : "pre", note: `${s.label}: ${s.value}` });
    }
  }
  if (summary?.etaLocal) {
    if (!beats.some((b) => b.note.includes(summary.etaLocal!))) {
      beats.push({ t: "ETA", phase: "arrive", note: `Porte cochère ${summary.etaLocal}` });
    }
  }
  return beats;
}

function beatTimeFor(stepId: string): string {
  switch (stepId) {
    case "crm":
      return "−24h";
    case "flight":
      return "−02:00";
    case "luggage":
      return "−01:40";
    case "customs":
      return "−00:45";
    case "transit":
      return "−00:30";
    case "eta":
      return "ETA";
    default:
      return "—";
  }
}

function inStayBeats(events: InStayEvent[]): Beat[] {
  return events.map((e) => ({
    t: formatClock(e.at),
    phase: "on",
    note: e.detail ? `${e.label} · ${e.detail}` : e.label,
  }));
}

function formatClock(epoch: number): string {
  const d = new Date(epoch);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function LiveThread() {
  const arrivalSteps = useDossier((s) => s.arrivalSteps);
  const arrivalSummary = useDossier((s) => s.arrivalSummary);
  const arrivalRunning = useDossier((s) => s.arrivalRunning);
  const inStayEvents = useDossier((s) => s.inStayEvents);

  const arrival = arrivalBeats(arrivalSteps, arrivalSummary);
  const inStay = inStayBeats(inStayEvents);
  const hasLive = arrivalRunning || arrival.length > 0 || inStay.length > 0;

  // When live data exists, merge: arrival → in-stay → post-stay placeholders.
  // When nothing is live, fall back to the static narrative.
  let beats: Beat[];
  if (hasLive) {
    beats = padToSix([...arrival, ...inStay]);
  } else {
    beats = STATIC_BEATS;
  }

  const titleSuffix = inStay.length > 0 ? "· in-stay" : arrival.length > 0 || arrivalRunning ? "· arrival" : "";
  const hint = hasLive
    ? inStay.length > 0
      ? "Live signals — arrival, room service, spa, front desk, late checkout."
      : "Live arrival tracking — flight, customs, transit, ETA."
    : "One continuous narrative — pre-arrival to next stay.";

  return (
    <ZoneShell
      tone="dark"
      label="Movement IV"
      title={`The live thread ${titleSuffix}`.trim()}
      hint={hint}
    >
      <div className="relative pt-2 pb-4">
        <div
          className="absolute left-0 right-0 top-1/2 h-px"
          style={{
            background:
              "linear-gradient(to right, transparent 0%, #C8102E 8%, #C8102E 92%, transparent 100%)",
            opacity: 0.9,
            boxShadow: "0 0 18px rgba(200,16,46,0.55)",
          }}
          aria-hidden="true"
        />
        <ol className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 z-10">
          {beats.map((b, i) => (
            <li
              key={`${b.t}-${i}`}
              className="relative bg-rose-darker border border-white/15 p-3"
            >
              <span
                className="absolute -top-[5px] left-4 w-[10px] h-[10px] rounded-full border border-on-dark/40"
                style={{ background: "#C8102E", boxShadow: "0 0 12px rgba(200,16,46,0.7)" }}
                aria-hidden="true"
              />
              <div className="caps text-brass">{b.t}</div>
              <div className="caps text-on-dark/55 mt-1 text-[0.6rem]">{b.phase}</div>
              <p className="mt-2 text-[13px] text-on-dark leading-snug font-normal">{b.note}</p>
            </li>
          ))}
        </ol>
      </div>
    </ZoneShell>
  );
}

function padToSix(live: Beat[]): Beat[] {
  if (live.length >= 6) return live.slice(-6);
  const padded = [...live];
  while (padded.length < 6) {
    padded.push({
      t: "—",
      phase: "post",
      note: padded.length === 4 ? "On-property thread continues" : "Post-stay thread held",
    });
  }
  return padded;
}
