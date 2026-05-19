"use client";

// Red Thread — initial-dossier hydrator.
//
// Server component reads data/fixtures/ben__hong-kong.json and passes it
// to this client component, which seeds the zustand store on first mount
// IF the store is still empty. LinkedIn visitors land on a fully-populated
// dashboard without any API call. Once the user runs a real briefing,
// the store is no longer empty and this is a no-op on subsequent mounts.

import { useEffect, useRef } from "react";

import { useDossier } from "@/lib/dossierStore";
import type { Dossier } from "@/lib/types";

export function StoreHydrator({ initialDossier }: { initialDossier: Dossier }) {
  const ranOnce = useRef(false);
  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    const store = useDossier.getState();
    if (!store.dossier && !store.arrivalReservation && store.liveToolCalls.length === 0) {
      store.setDossier(initialDossier);
    }
  }, [initialDossier]);
  return null;
}
