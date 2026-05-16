// Red Thread — dossier store.
//
// Holds the dossier returned by /api/agent on the current page. When empty,
// zone components fall back to their static editorial demo content. When
// populated (typically after /intake completes), zones render live data.

import { create } from "zustand";

import type { Dossier } from "@/lib/types";

interface DossierStore {
  dossier: Dossier | null;
  loading: boolean;
  error: string | null;
  source: "intake" | "manual" | null;
  setDossier: (d: Dossier, source: "intake" | "manual") => void;
  setLoading: (l: boolean) => void;
  setError: (e: string | null) => void;
  clear: () => void;
}

export const useDossier = create<DossierStore>((set) => ({
  dossier: null,
  loading: false,
  error: null,
  source: null,
  setDossier: (dossier, source) => set({ dossier, source, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  clear: () => set({ dossier: null, loading: false, error: null, source: null }),
}));
