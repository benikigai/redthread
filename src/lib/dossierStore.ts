// Red Thread — dossier + live-progress store.
//
// Holds the in-progress agent run (phase, streaming tool calls) plus the
// final Dossier when the run completes. Zone components subscribe so they
// can animate as events arrive — "show the work."

import { create } from "zustand";

import type { Dossier, PropertyId, ToolCallTrace } from "@/lib/types";

// ─── Arrival-chain step slice ────────────────────────────────────────────
export interface ArrivalStep {
  id: string;
  label: string;
  status: "pending" | "thinking" | "complete" | "error";
  reasoning: string;          // streaming Claude text as it arrives
  value?: string;             // final output value
  summary?: string;           // one-line summary on completion
  data?: Record<string, unknown>;
}

// ─── In-stay event slice — live signals from the hotel during the guest's stay
export type InStayCategory =
  | "room-service"
  | "spa"
  | "front-desk"
  | "late-checkout"
  | "amenity"
  | "custom";

export interface InStayEvent {
  id: string;
  category: InStayCategory;
  label: string;
  detail?: string;
  at: number;
}

export interface ArrivalSummary {
  landingLocal?: string;
  etaLocal?: string;
  customsMinutes?: number;
  luggageMinutes?: number;
  transitMinutes?: number;
  flight?: { number: string; status: string; origin: string; destination: string };
}

export type RunPhase =
  | "idle"
  | "verify"
  | "research"
  | "synthesize"
  | "discretion"
  | "done"
  | "error";

interface DossierStore {
  dossier: Dossier | null;
  loading: boolean;
  phase: RunPhase;
  /** Tool-call traces accumulated as SSE events arrive. UI uses this to
   *  animate research streams without waiting for the final dossier. */
  liveToolCalls: ToolCallTrace[];
  error: string | null;
  source: "intake" | "manual" | null;

  /** Currently selected property — single source of truth shared by Header,
   *  DemoLoader, DemoTrigger, and any future re-run trigger. */
  activeProperty: PropertyId;
  setActiveProperty: (id: PropertyId) => void;

  /** Saved Privacy Openness Score for the currently selected guest. The
   *  bottom-of-dashboard "Hold the Thread" dial reads from here so it
   *  reflects whoever the user just selected (Ben=55, Lin Chen=62). The
   *  guest sets this on /profile; the dashboard mirrors it read-only. */
  activeGuestPos: number;
  setActiveGuestPos: (pos: number) => void;

  /** Which guest preset is active. /profile reads this to know which guest
   *  to render. ReservationIntake's selectPreset writes it. */
  activeGuestId: "ben" | "lin-chen";
  setActiveGuestId: (id: "ben" | "lin-chen") => void;

  /** Merge voice-intake overrides into the existing dossier (additive
   *  enrichment, not replacement). Used after the guest finishes the
   *  /intake conversation — we update actuators.roomState, append a
   *  voice-confirmed conversation hook, and push a `voice_intake` tool
   *  call so it surfaces in Zone I. If no dossier is loaded yet, no-op
   *  (DemoLoader handles the fresh-run path). */
  mergeIntake: (overrides: {
    roomTempC?: number;
    bedding?: "down" | "down-free" | "memory";
    morningRitual?: string;
    dietary?: string;
    privacyPosture?: "minimal" | "standard" | "full";
  }) => void;

  /** Merge an agent-to-agent handoff payload into the existing dossier
   *  (additive enrichment). Used after AgentHandoffPanel resolves. */
  mergeHandoff: (payload: {
    sourceAgent?: string;
    preferences?: Record<string, unknown>;
    note?: string;
  }) => void;

  /** Live arrival-research chain. Each step streams reasoning tokens; UI
   *  surfaces the typing reasoning + final value. LiveThread (Zone IV) also
   *  reads from this to render the pre-arrival timeline beats live. */
  arrivalSteps: ArrivalStep[];
  arrivalRunning: boolean;
  arrivalSummary: ArrivalSummary | null;
  arrivalReservation: { guestName: string; reservationNumber: string; checkIn: string; checkOut: string; propertyId: PropertyId } | null;
  startArrival: (reservation: NonNullable<DossierStore["arrivalReservation"]>) => void;
  pushArrivalStepStart: (id: string, label: string) => void;
  pushArrivalStepDelta: (id: string, delta: string) => void;
  pushArrivalStepComplete: (id: string, payload: { value?: string; summary?: string; data?: Record<string, unknown> }) => void;
  setArrivalSummary: (s: ArrivalSummary) => void;
  setArrivalRunning: (r: boolean) => void;

  /** In-stay events streamed from hotel systems (POS, spa booking, front-desk
   *  calls, late-checkout requests). LiveThread renders these as beats on the
   *  red thread between arrival and post-stay. For the hackathon demo a small
   *  injector panel lets staff click presets — a real product would pipe these
   *  in from the property PMS / POS / spa booking systems via webhook. */
  inStayEvents: InStayEvent[];
  pushInStayEvent: (event: Omit<InStayEvent, "id" | "at">) => void;
  clearInStayEvents: () => void;

  startRun: (source: "intake" | "manual") => void;
  setPhase: (phase: RunPhase) => void;
  pushToolStart: (tool: string, args?: unknown) => void;
  pushToolComplete: (tool: string, summary: string) => void;
  pushToolError: (tool: string, message: string) => void;
  setDossier: (d: Dossier) => void;
  setError: (e: string) => void;
  clear: () => void;
}

export const useDossier = create<DossierStore>((set) => ({
  dossier: null,
  loading: false,
  phase: "idle",
  liveToolCalls: [],
  error: null,
  source: null,

  activeProperty: "hong-kong",
  setActiveProperty: (activeProperty) => set({ activeProperty }),

  activeGuestPos: 55,  // ben.json default; ReservationIntake updates on preset change
  setActiveGuestPos: (activeGuestPos) => set({ activeGuestPos }),

  activeGuestId: "ben",
  setActiveGuestId: (activeGuestId) => set({ activeGuestId }),

  arrivalSteps: [],
  arrivalRunning: false,
  arrivalSummary: null,
  arrivalReservation: null,
  startArrival: (reservation) =>
    set({ arrivalReservation: reservation, arrivalSteps: [], arrivalSummary: null, arrivalRunning: true }),
  pushArrivalStepStart: (id, label) =>
    set((state) => {
      if (state.arrivalSteps.some((s) => s.id === id)) return state;
      return {
        arrivalSteps: [
          ...state.arrivalSteps,
          { id, label, status: "thinking", reasoning: "" },
        ],
      };
    }),
  pushArrivalStepDelta: (id, delta) =>
    set((state) => ({
      arrivalSteps: state.arrivalSteps.map((s) =>
        s.id === id ? { ...s, reasoning: s.reasoning + delta } : s,
      ),
    })),
  pushArrivalStepComplete: (id, { value, summary, data }) =>
    set((state) => ({
      arrivalSteps: state.arrivalSteps.map((s) =>
        s.id === id ? { ...s, status: "complete", value, summary, data } : s,
      ),
    })),
  setArrivalSummary: (arrivalSummary) => set({ arrivalSummary, arrivalRunning: false }),
  setArrivalRunning: (arrivalRunning) => set({ arrivalRunning }),

  inStayEvents: [],
  pushInStayEvent: (event) =>
    set((state) => ({
      inStayEvents: [
        ...state.inStayEvents,
        {
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          at: Date.now(),
          ...event,
        },
      ],
    })),
  clearInStayEvents: () => set({ inStayEvents: [] }),

  startRun: (source) =>
    set({
      source,
      loading: true,
      phase: "verify",
      liveToolCalls: [],
      error: null,
      dossier: null,
    }),

  setPhase: (phase) => set({ phase }),

  pushToolStart: (tool, args) =>
    set((state) => ({
      liveToolCalls: [
        ...state.liveToolCalls,
        {
          tool,
          status: "streaming",
          args,
          startedAt: new Date().toISOString(),
        },
      ],
    })),

  pushToolComplete: (tool, summary) =>
    set((state) => {
      // Mark the most recent matching streaming entry as complete.
      const idx = [...state.liveToolCalls].reverse().findIndex(
        (tc) => tc.tool === tool && tc.status === "streaming",
      );
      if (idx === -1) {
        return {
          liveToolCalls: [
            ...state.liveToolCalls,
            {
              tool,
              status: "complete",
              result: summary,
              startedAt: new Date().toISOString(),
              finishedAt: new Date().toISOString(),
            },
          ],
        };
      }
      const realIdx = state.liveToolCalls.length - 1 - idx;
      const next = state.liveToolCalls.slice();
      next[realIdx] = {
        ...next[realIdx],
        status: "complete",
        result: summary,
        finishedAt: new Date().toISOString(),
      };
      return { liveToolCalls: next };
    }),

  pushToolError: (tool, message) =>
    set((state) => {
      const idx = [...state.liveToolCalls].reverse().findIndex(
        (tc) => tc.tool === tool && tc.status === "streaming",
      );
      const real = idx === -1 ? -1 : state.liveToolCalls.length - 1 - idx;
      if (real === -1) return state;
      const next = state.liveToolCalls.slice();
      next[real] = {
        ...next[real],
        status: "failed",
        result: message,
        finishedAt: new Date().toISOString(),
      };
      return { liveToolCalls: next };
    }),

  setDossier: (dossier) =>
    set({ dossier, loading: false, phase: "done", error: null }),

  mergeIntake: (overrides) =>
    set((state) => {
      if (!state.dossier) return state;
      const summaryParts: string[] = [];
      if (overrides.roomTempC !== undefined) summaryParts.push(`${overrides.roomTempC}°C`);
      if (overrides.bedding) summaryParts.push(overrides.bedding);
      if (overrides.morningRitual)
        summaryParts.push(`morning: ${overrides.morningRitual.slice(0, 36)}`);
      if (overrides.dietary) summaryParts.push(overrides.dietary);
      if (overrides.privacyPosture) summaryParts.push(`POS: ${overrides.privacyPosture}`);
      const summary =
        summaryParts.length > 0
          ? `${summaryParts.length} preferences captured · ${summaryParts.join(" · ")}`
          : "voice intake completed (no overrides)";

      const room = state.dossier.actuators.roomState;
      const newHooks: string[] = [];
      if (overrides.morningRitual)
        newHooks.push(`Morning rhythm — confirmed by voice: ${overrides.morningRitual}`);
      if (overrides.dietary)
        newHooks.push(`Dietary — confirmed by voice: ${overrides.dietary}`);

      return {
        dossier: {
          ...state.dossier,
          conversationHooks: [...state.dossier.conversationHooks, ...newHooks],
          actuators: {
            ...state.dossier.actuators,
            roomState: {
              ...room,
              climateC: overrides.roomTempC ?? room.climateC,
              bedding: overrides.bedding ?? room.bedding,
              reasoning: [
                ...(room.reasoning ?? []),
                `Confirmed by voice intake at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
              ],
            },
          },
        },
        liveToolCalls: [
          ...state.liveToolCalls,
          {
            tool: "voice_intake",
            status: "complete",
            args: overrides,
            result: summary,
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
          },
        ],
      };
    }),

  mergeHandoff: (payload) =>
    set((state) => {
      if (!state.dossier) return state;
      const sourceAgent = payload.sourceAgent ?? "guest agent";
      const summary = payload.note ?? `preferences received from ${sourceAgent}`;
      const newHook = `Received from ${sourceAgent} via A2A handoff — preferences logged with provenance.`;
      return {
        dossier: {
          ...state.dossier,
          conversationHooks: [...state.dossier.conversationHooks, newHook],
        },
        liveToolCalls: [
          ...state.liveToolCalls,
          {
            tool: "agent_handoff",
            status: "complete",
            args: payload as unknown,
            result: summary,
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
          },
        ],
      };
    }),

  setError: (error) => set({ error, loading: false, phase: "error" }),

  clear: () =>
    set({
      dossier: null,
      loading: false,
      phase: "idle",
      liveToolCalls: [],
      error: null,
      source: null,
      arrivalSteps: [],
      arrivalRunning: false,
      arrivalSummary: null,
      arrivalReservation: null,
      inStayEvents: [],
    }),
}));
