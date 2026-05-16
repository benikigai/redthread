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
    }),
}));
