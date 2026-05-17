"use client";

// Red Thread — Movement IV: the live thread.
//
// Six lifecycle phases across the bottom band: pre-arrival, arrive, check-in,
// stay, checkout, post-stay. Each phase has 1-N beats sourced from the
// dossier store — so the same red thread that drives zones 1/2/3 above
// continues straight through the stay below.

import { ZoneShell } from "./ZoneShell";
import {
  useDossier,
  type ArrivalStep,
  type ArrivalSummary,
  type InStayEvent,
} from "@/lib/dossierStore";
import type { Dossier } from "@/lib/types";

interface Beat {
  t: string;
  note: string;
}

interface Phase {
  id: "pre" | "arrive" | "checkin" | "stay" | "checkout" | "post";
  label: string;
  beats: Beat[];
}

// ─── Beat sources ────────────────────────────────────────────────────────

function preBeats(steps: ArrivalStep[]): Beat[] {
  if (steps.length === 0) {
    return [{ t: "—", note: "Awaiting reservation submission" }];
  }
  return steps
    .filter((s) => s.status === "complete")
    .map((s) => ({ t: stepTime(s.id), note: stepNote(s) }));
}

function arriveBeats(summary: ArrivalSummary | null): Beat[] {
  if (!summary?.etaLocal) {
    return [{ t: "—", note: "ETA pending" }];
  }
  const out: Beat[] = [];
  if (summary.landingLocal && summary.flight?.number) {
    out.push({
      t: summary.landingLocal,
      note: `${summary.flight.number} lands · ${summary.flight.status}`,
    });
  }
  out.push({
    t: summary.etaLocal,
    note: "Porte cochère — butler greets by name",
  });
  return out;
}

function checkInBeats(dossier: Dossier | null): Beat[] {
  if (!dossier) {
    return [{ t: "—", note: "Held until brief completes" }];
  }
  const room = dossier.actuators.roomState;
  const amenity = dossier.actuators.welcomeAmenity;
  return [
    {
      t: "+05m",
      note: `Room set · ${room.climateC}°C · ${room.bedding ?? "default bedding"}`,
    },
    {
      t: "+08m",
      note: `${amenity.name} — pre-positioned`,
    },
  ];
}

function stayBeats(dossier: Dossier | null, inStay: InStayEvent[]): Beat[] {
  // Live signals (user clicks in InStayEventInjector) come first — they are
  // the demo's interactive proof and must always be visible. Itinerary fills
  // any remaining slots. Cap at 6 so the column doesn't dwarf its neighbors.
  const MAX = 6;
  const fromEvents: Beat[] = inStay
    .slice()
    .reverse()
    .map((e) => ({
      t: formatClock(e.at),
      note: e.detail ? `${e.label} · ${e.detail}` : e.label,
    }));
  const remaining = Math.max(0, MAX - fromEvents.length);
  const fromItinerary: Beat[] =
    dossier?.actuators.itinerary.slice(0, remaining).map((it) => ({
      t: it.time ?? it.timeOfDay,
      note: `${it.title}${it.vendorOrPlace ? ` · ${it.vendorOrPlace.split("·")[0].trim()}` : ""}`,
    })) ?? [];
  const combined = [...fromEvents, ...fromItinerary];
  if (combined.length === 0) {
    return [{ t: "—", note: "Itinerary will populate here" }];
  }
  return combined.slice(0, MAX);
}

function checkoutBeats(reservation: ReturnType<typeof useDossier.getState>["arrivalReservation"]): Beat[] {
  if (!reservation) {
    return [{ t: "—", note: "Pending booking" }];
  }
  const dayOut = new Date(`${reservation.checkOut}T00:00:00Z`);
  const checkoutLabel = dayOut.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return [
    { t: checkoutLabel, note: "11:00 — late checkout offered" },
    { t: "—", note: "Transport pre-confirmed if requested" },
  ];
}

function postBeats(dossier: Dossier | null): Beat[] {
  if (!dossier) {
    return [{ t: "—", note: "Thread continues here" }];
  }
  return [
    { t: "+14d", note: "Butler note — anniversary of stay, single line" },
    { t: "+60d", note: "Relevant local moment surfaces via Placemaker" },
  ];
}

function stepTime(stepId: string): string {
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

function stepNote(step: ArrivalStep): string {
  return step.value ? `${step.label}: ${step.value}` : step.label;
}

function formatClock(epoch: number): string {
  const d = new Date(epoch);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// ─── Component ───────────────────────────────────────────────────────────

export function LiveThread() {
  const arrivalSteps = useDossier((s) => s.arrivalSteps);
  const arrivalSummary = useDossier((s) => s.arrivalSummary);
  const arrivalRunning = useDossier((s) => s.arrivalRunning);
  const dossier = useDossier((s) => s.dossier);
  const inStayEvents = useDossier((s) => s.inStayEvents);
  const reservation = useDossier((s) => s.arrivalReservation);

  const phases: Phase[] = [
    { id: "pre", label: "Pre-Arrival", beats: preBeats(arrivalSteps) },
    { id: "arrive", label: "Arrive", beats: arriveBeats(arrivalSummary) },
    { id: "checkin", label: "Check-in", beats: checkInBeats(dossier) },
    { id: "stay", label: "Stay", beats: stayBeats(dossier, inStayEvents) },
    { id: "checkout", label: "Checkout", beats: checkoutBeats(reservation) },
    { id: "post", label: "Post-Stay", beats: postBeats(dossier) },
  ];

  const hasAnyData =
    arrivalSteps.length > 0 ||
    !!dossier ||
    inStayEvents.length > 0 ||
    arrivalRunning;

  return (
    <ZoneShell
      tone="dark"
      label="Movement IV"
      title="The live thread"
      hint={
        hasAnyData
          ? "One thread, six phases — pre-arrival to post-stay."
          : "Awaiting reservation submission. The thread runs the full lifecycle."
      }
    >
      <div className="relative">
        {/* Red thread running through the row of phase columns */}
        <div
          className="absolute left-0 right-0 top-[28px] h-px"
          style={{
            background:
              "linear-gradient(to right, transparent 0%, #C8102E 6%, #C8102E 94%, transparent 100%)",
            opacity: 0.85,
            boxShadow: "0 0 18px rgba(200,16,46,0.55)",
          }}
          aria-hidden="true"
        />
        <div className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 z-10">
          {phases.map((phase) => (
            <PhaseColumn key={phase.id} phase={phase} />
          ))}
        </div>
      </div>
    </ZoneShell>
  );
}

function PhaseColumn({ phase }: { phase: Phase }) {
  return (
    <div className="flex flex-col">
      {/* Phase header — sits ON the red thread (top: 28px line) */}
      <div className="relative h-[56px] flex flex-col justify-end items-start">
        <span className="text-[0.78rem] tracking-[0.22em] uppercase font-semibold text-paper leading-none mb-2">
          {phase.label}
        </span>
        {/* Anchor dot on the thread */}
        <span
          className="absolute -top-[5px] left-0 w-[10px] h-[10px] rounded-full border border-on-dark/40"
          style={{
            background: "#C8102E",
            boxShadow: "0 0 12px rgba(200,16,46,0.7)",
            top: "23px",
          }}
          aria-hidden="true"
        />
      </div>
      {/* Beats column */}
      <ol className="space-y-2">
        {phase.beats.map((b, i) => (
          <li
            key={`${phase.id}-${i}`}
            className="bg-rose-darker border border-white/15 px-3 py-2.5"
          >
            <div className="text-[0.68rem] tracking-[0.22em] uppercase font-semibold text-brass">
              {b.t}
            </div>
            <p className="mt-1.5 text-[13.5px] text-paper leading-snug font-normal">
              {b.note}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
