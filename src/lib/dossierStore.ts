// Red Thread — dossier + live-progress store.
//
// Holds the in-progress agent run (phase, streaming tool calls) plus the
// final Dossier when the run completes. Zone components subscribe so they
// can animate as events arrive — "show the work."

import { create } from "zustand";

import type { Dossier, PropertyId, ToolCallTrace } from "@/lib/types";

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
    }),
}));
