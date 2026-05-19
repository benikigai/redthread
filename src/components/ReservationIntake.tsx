"use client";

// Red Thread — Reservation Intake.
//
// Two inputs at the top of the empty dashboard: Guest Name + Reservation
// Number. On submit, opens the SSE stream to /api/arrival-chain, which runs
// the six-step "show the work" live research (CRM, flight via AviationStack,
// luggage prediction, customs estimate, transit estimate, ETA composition)
// with real Claude reasoning tokens streaming into each step card.
//
// After the arrival chain completes, the dashboard's existing /api/agent
// path is kicked off to populate the full dossier (brief, actuators).

import { useEffect, useRef, useState } from "react";

import { streamAgent } from "@/components/DemoLoader";
import { useDemoLock } from "@/components/DemoLock";
import { useDossier, type ArrivalStep, type ArrivalSummary } from "@/lib/dossierStore";
import type { PropertyId } from "@/lib/types";

interface Reservation {
  guestId: string;
  guestName: string;
  reservationNumber: string;
  propertyId: PropertyId;
  flightNumber: string;
  checkIn: string;
  checkOut: string;
  /** Guest's Hold-the-Thread setting (0-100 POS). Gates which web research
   *  steps run in /api/arrival-chain. */
  previewPos?: number;
}

type PresetId = "ben" | "lin-chen";

interface Preset extends Reservation {
  departureDate: string;
  email: string;
  privacyOpennessScore: number;  // mirrored from data/guests/<id>.json
}

// Two demo guests — each preset reads its own data/guests/*.json (the "right
// database") when the chain runs. User can edit any field after selecting.
// The privacyOpennessScore mirrors data/guests/<id>.json so the bottom-of-
// dashboard "Hold the Thread" dial reads the right saved value per guest.
const PRESETS: Record<PresetId, Preset> = {
  ben: {
    guestId: "ben",
    guestName: "Benjamin Shyong",
    email: "ben@openclaw.dev",
    reservationNumber: "A123",
    propertyId: "hong-kong",
    flightNumber: "CX872",
    departureDate: "2026-05-28",
    checkIn: "2026-05-29",
    checkOut: "2026-05-31",
    privacyOpennessScore: 55,
  },
  "lin-chen": {
    guestId: "lin-chen",
    guestName: "Ms. Lin Chen",
    email: "lchen@latticecapital.hk",
    reservationNumber: "B456",
    propertyId: "hong-kong",
    flightNumber: "CX700",
    departureDate: "2026-05-30",
    checkIn: "2026-05-31",
    checkOut: "2026-06-03",
    privacyOpennessScore: 62,
  },
};

export function ReservationIntake() {
  const arrivalSteps = useDossier((s) => s.arrivalSteps);
  const arrivalRunning = useDossier((s) => s.arrivalRunning);
  const arrivalSummary = useDossier((s) => s.arrivalSummary);
  const arrivalReservation = useDossier((s) => s.arrivalReservation);

  const [presetId, setPresetId] = useState<PresetId>("ben");
  const initial = PRESETS[presetId];
  const [guestName, setGuestName] = useState(initial.guestName);
  const [email, setEmail] = useState(initial.email);
  const [reservationNumber, setReservationNumber] = useState(initial.reservationNumber);
  const [flightNumber, setFlightNumber] = useState(initial.flightNumber);
  const [departureDate, setDepartureDate] = useState(initial.departureDate);
  const [checkIn, setCheckIn] = useState(initial.checkIn);
  const [checkOut, setCheckOut] = useState(initial.checkOut);
  const [propertyId, setPropertyId] = useState<PropertyId>(initial.propertyId);
  // Hold the Thread is guest-set only — the duplicate inline slider was
  // removed in favor of the read-only DashboardDial below this form, which
  // reads from store.activeGuestPos. The guest changes it on /profile.
  const aborter = useRef<AbortController | null>(null);
  const { requireUnlock } = useDemoLock();

  const selectPreset = (id: PresetId) => {
    setPresetId(id);
    const p = PRESETS[id];
    setGuestName(p.guestName);
    setEmail(p.email);
    setReservationNumber(p.reservationNumber);
    setFlightNumber(p.flightNumber);
    setDepartureDate(p.departureDate);
    setCheckIn(p.checkIn);
    setCheckOut(p.checkOut);
    setPropertyId(p.propertyId);
    // Update the store immediately so the read-only DashboardDial below
    // reflects this guest's saved POS, AND so /profile renders the right
    // person when staff click "View as guest →".
    useDossier.getState().setActiveGuestPos(p.privacyOpennessScore);
    useDossier.getState().setActiveGuestId(id);
  };

  useEffect(() => () => aborter.current?.abort(), []);

  const submit = async () => {
    // Gate the expensive live agent run behind the demo password modal.
    // If unlocked, runBriefing fires immediately; if locked, the modal
    // queues it and runs on successful unlock.
    requireUnlock(runBriefing);
  };

  const runBriefing = async () => {
    // Honor the user's inline edits but anchor guestId from the selected
    // preset — that's what reads from data/guests/<id>.json (the "right
    // database") server-side.
    const holdPosLocal = useDossier.getState().activeGuestPos;
    const reservation: Reservation & { departureDate: string } = {
      guestId: presetId,
      guestName,
      reservationNumber,
      flightNumber,
      departureDate,
      checkIn,
      checkOut,
      propertyId,
      previewPos: holdPosLocal,
    };
    const store = useDossier.getState();
    store.clear();
    store.setActiveProperty(reservation.propertyId);
    // Hold-the-Thread value comes from the store — set by selectPreset above,
    // and updatable by the guest on /profile. Concierge cannot change it.
    const holdPos = useDossier.getState().activeGuestPos;
    store.startArrival({
      guestName: reservation.guestName,
      reservationNumber: reservation.reservationNumber,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      propertyId: reservation.propertyId,
    });

    const ac = new AbortController();
    aborter.current = ac;

    try {
      await streamArrivalChain(reservation, ac.signal);
      // After arrival chain — kick the FULL LIVE agent flow so the brief +
      // actuators populate from real Claude. live=true bypasses DEMO_MODE.
      // previewPos = the guest's just-set Hold-the-Thread value (0–100) so
      // the Discretion Layer band-reduces zones 1/2/3 accordingly.
      useDossier.getState().startRun("manual");
      await streamAgent(
        {
          guestId: reservation.guestId,
          propertyId: reservation.propertyId,
          flightNumber: reservation.flightNumber,
          guestEmail: email,
          previewPos: holdPos,
          live: true,
        },
        ac.signal,
      );
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : String(err);
      useDossier.getState().setError(msg);
      useDossier.getState().setArrivalRunning(false);
    }
  };

  const reset = () => {
    aborter.current?.abort();
    useDossier.getState().clear();
  };

  const completed = !!arrivalSummary && !arrivalRunning;
  const submitted = arrivalRunning || completed || arrivalSteps.length > 0;

  return (
    <section className="mt-8 border hairline bg-paper-soft px-5 py-5">
      {!submitted ? (
        <IntakeForm
          presetId={presetId}
          selectPreset={selectPreset}
          guestName={guestName}
          setGuestName={setGuestName}
          email={email}
          setEmail={setEmail}
          reservationNumber={reservationNumber}
          setReservationNumber={setReservationNumber}
          flightNumber={flightNumber}
          setFlightNumber={setFlightNumber}
          departureDate={departureDate}
          setDepartureDate={setDepartureDate}
          checkIn={checkIn}
          checkOut={checkOut}
          property={propertyId}
          onSubmit={submit}
        />
      ) : (
        <ReservationSummary
          reservation={arrivalReservation}
          completed={completed}
          onReset={reset}
        />
      )}
      {submitted && <ArrivalChain steps={arrivalSteps} summary={arrivalSummary} />}
    </section>
  );
}

function IntakeForm({
  presetId,
  selectPreset,
  guestName,
  setGuestName,
  email,
  setEmail,
  reservationNumber,
  setReservationNumber,
  flightNumber,
  setFlightNumber,
  departureDate,
  setDepartureDate,
  checkIn,
  checkOut,
  property,
  onSubmit,
}: {
  presetId: PresetId;
  selectPreset: (id: PresetId) => void;
  guestName: string;
  setGuestName: (s: string) => void;
  email: string;
  setEmail: (s: string) => void;
  reservationNumber: string;
  setReservationNumber: (s: string) => void;
  flightNumber: string;
  setFlightNumber: (s: string) => void;
  departureDate: string;
  setDepartureDate: (s: string) => void;
  checkIn: string;
  checkOut: string;
  property: PropertyId;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="caps text-ink-faint mr-2">Guest</span>
        {(Object.keys(PRESETS) as PresetId[]).map((id) => {
          const active = presetId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectPreset(id)}
              className={[
                "text-[11px] tracking-[0.22em] uppercase font-medium border hairline transition-colors px-3 py-1.5",
                active
                  ? "bg-rose-deep text-paper border-rose-deep hover:bg-rose-darker"
                  : "bg-paper text-ink-mute hover:text-ink",
              ].join(" ")}
            >
              {PRESETS[id].guestName}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-3">
          <label className="caps text-ink-faint block mb-1.5">Guest name</label>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full border hairline bg-paper px-3 py-2 font-display text-lg text-ink focus:outline-none focus:ring-1 focus:ring-thread-deep"
          />
        </div>
        <div className="col-span-12 md:col-span-3">
          <label className="caps text-ink-faint block mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border hairline bg-paper px-3 py-2 font-mono text-base text-ink focus:outline-none focus:ring-1 focus:ring-thread-deep"
          />
        </div>
        <div className="col-span-6 md:col-span-2">
          <label className="caps text-ink-faint block mb-1.5">Reservation #</label>
          <input
            type="text"
            value={reservationNumber}
            onChange={(e) => setReservationNumber(e.target.value)}
            className="w-full border hairline bg-paper px-3 py-2 font-mono text-lg text-ink focus:outline-none focus:ring-1 focus:ring-thread-deep"
          />
        </div>
        <div className="col-span-6 md:col-span-2">
          <label className="caps text-ink-faint block mb-1.5">Flight #</label>
          <input
            type="text"
            value={flightNumber}
            onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
            placeholder="CX879"
            className="w-full border hairline bg-paper px-3 py-2 font-mono text-lg text-ink focus:outline-none focus:ring-1 focus:ring-thread-deep"
          />
        </div>
        <div className="col-span-12 md:col-span-2">
          <label className="caps text-ink-faint block mb-1.5">Departure date</label>
          <input
            type="date"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
            className="w-full border hairline bg-paper px-3 py-2 font-mono text-lg text-ink focus:outline-none focus:ring-1 focus:ring-thread-deep"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="text-sm text-ink-mute">
          <div className="caps text-ink-faint mb-1">Stay</div>
          <div>
            <span className="font-display">Rosewood {prettyProperty(property)}</span>{" "}
            <span className="text-ink-faint text-xs">· {prettyDate(checkIn)} → {prettyDate(checkOut)} · 2 nights</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          className="text-[11px] tracking-[0.22em] uppercase font-medium bg-rose-deep text-paper px-6 py-2.5 hover:bg-rose-darker transition-colors"
        >
          Begin briefing
        </button>
      </div>
    </div>
  );
}

function ReservationSummary({
  reservation,
  completed,
  onReset,
}: {
  reservation: ReturnType<typeof useDossier.getState>["arrivalReservation"];
  completed: boolean;
  onReset: () => void;
}) {
  if (!reservation) return null;
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="caps text-thread-deep mb-1">Reservation {reservation.reservationNumber}</div>
        <div className="font-display text-2xl text-ink">{reservation.guestName}</div>
        <div className="text-sm text-ink-mute mt-1">
          Rosewood {prettyProperty(reservation.propertyId)} · {prettyDate(reservation.checkIn)} → {prettyDate(reservation.checkOut)}
        </div>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="caps text-ink-faint hover:text-thread-deep border hairline px-3 py-1.5 transition-colors text-[10px]"
      >
        {completed ? "Start over" : "Cancel"}
      </button>
    </div>
  );
}

function ArrivalChain({ steps, summary }: { steps: ArrivalStep[]; summary: ArrivalSummary | null }) {
  if (steps.length === 0 && !summary) {
    return (
      <div className="mt-5 caps text-ink-faint">Opening the research chain…</div>
    );
  }
  return (
    <div className="mt-6">
      <div className="caps text-ink-faint mb-3">Live research · the work</div>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <StepCard key={step.id} step={step} index={i + 1} />
        ))}
      </ol>
      {summary?.etaLocal && (
        <div className="mt-4 border hairline bg-paper px-4 py-3">
          <div className="caps text-thread-deep mb-1">Arrival ETA · porte cochère</div>
          <div className="font-display text-3xl text-ink">{summary.etaLocal}</div>
          <div className="text-xs text-ink-faint mt-1">
            {summary.flight ? `${summary.flight.number} ` : ""}
            land{summary.landingLocal ? ` ${summary.landingLocal}` : "ing"}
            {typeof summary.customsMinutes === "number" ? ` · +${summary.customsMinutes} customs` : ""}
            {summary.luggageMinutes ? ` · +${summary.luggageMinutes} bags` : ""}
            {typeof summary.transitMinutes === "number" ? ` · +${summary.transitMinutes} transit` : ""}
          </div>
        </div>
      )}
    </div>
  );
}

function StepCard({ step, index }: { step: ArrivalStep; index: number }) {
  return (
    <li className="border hairline bg-paper px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="caps text-ink-faint">{String(index).padStart(2, "0")}</span>
          <span className="caps text-ink">{step.label}</span>
        </div>
        <StatusBadge status={step.status} />
      </div>
      {step.reasoning && (
        <p className="mt-2 text-sm text-ink-mute leading-snug whitespace-pre-wrap">
          {step.reasoning}
          {step.status === "thinking" && (
            <span className="ml-0.5 inline-block w-1.5 h-3 align-middle bg-thread animate-pulse" aria-hidden="true" />
          )}
        </p>
      )}
      {step.value && (
        <div className="mt-2 text-sm text-ink">
          <span className="caps text-ink-faint mr-2">→</span>
          <span className="font-display text-base">{step.value}</span>
        </div>
      )}
    </li>
  );
}

function StatusBadge({ status }: { status: ArrivalStep["status"] }) {
  if (status === "thinking") {
    return (
      <span className="caps text-thread flex items-center gap-1.5">
        <span className="relative inline-flex w-1.5 h-1.5">
          <span className="absolute inset-0 rounded-full bg-thread animate-ping opacity-70" />
          <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-thread" />
        </span>
        thinking
      </span>
    );
  }
  if (status === "complete") return <span className="caps text-thread-deep">done</span>;
  if (status === "error") return <span className="caps text-thread">error</span>;
  return <span className="caps text-ink-faint">pending</span>;
}

function prettyProperty(p: PropertyId): string {
  return p === "sand-hill" ? "Sand Hill" : p === "hong-kong" ? "Hong Kong" : p === "crillon" ? "Crillon" : "Phuket";
}

function prettyDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// ─── SSE consumer for /api/arrival-chain ─────────────────────────────────

async function streamArrivalChain(reservation: Reservation, signal: AbortSignal) {
  const res = await fetch("/api/arrival-chain", {
    method: "POST",
    headers: { Accept: "text/event-stream", "Content-Type": "application/json" },
    body: JSON.stringify({
      guestId: reservation.guestId,
      propertyId: reservation.propertyId,
      flightNumber: reservation.flightNumber,
      checkIn: reservation.checkIn,
      previewPos: reservation.previewPos,
    }),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`/api/arrival-chain ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const line = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      try {
        const frame = JSON.parse(line.slice(6)) as {
          type: string;
          payload?: Record<string, unknown>;
        };
        handleFrame(frame);
      } catch {
        // skip malformed
      }
    }
  }
}

function handleFrame(frame: { type: string; payload?: Record<string, unknown> }) {
  const s = useDossier.getState();
  const p = frame.payload ?? {};
  switch (frame.type) {
    case "step_start":
      s.pushArrivalStepStart(p.id as string, p.label as string);
      break;
    case "step_thinking":
      s.pushArrivalStepDelta(p.id as string, (p.delta as string) ?? "");
      break;
    case "step_complete":
      s.pushArrivalStepComplete(p.id as string, {
        value: p.value as string | undefined,
        summary: p.summary as string | undefined,
        data: p.data as Record<string, unknown> | undefined,
      });
      // If this is the flight step, prime the arrival summary so LiveThread
      // can render the flight info before the chain completes.
      if (p.id === "flight" && p.data) {
        const data = p.data as { landingLocal?: string; flightNumber?: string; status?: string; origin?: string; destination?: string };
        s.setArrivalSummary({
          ...(s.arrivalSummary ?? {}),
          landingLocal: data.landingLocal,
          flight: {
            number: data.flightNumber ?? "",
            status: data.status ?? "",
            origin: data.origin ?? "",
            destination: data.destination ?? "",
          },
        });
      }
      break;
    case "chain_complete": {
      const cur = s.arrivalSummary ?? {};
      const b = (p.breakdown as { customsMinutes: number; luggageMinutes: number; transitMinutes: number }) ?? {
        customsMinutes: 0,
        luggageMinutes: 0,
        transitMinutes: 0,
      };
      s.setArrivalSummary({
        ...cur,
        etaLocal: p.etaLocal as string,
        customsMinutes: b.customsMinutes,
        luggageMinutes: b.luggageMinutes,
        transitMinutes: b.transitMinutes,
      });
      break;
    }
    case "error":
      s.setArrivalRunning(false);
      break;
  }
}
