"use client";

// Red Thread — initial-dossier hydrator.
//
// Imports the Ben + Hong Kong fixture as a static JSON module so the file
// is bundled into the client at build time (no runtime fs access needed,
// no server function). On first mount, seeds the zustand store if it is
// still empty — LinkedIn visitors land on a fully-populated dashboard
// without any API call. Once the user runs a real briefing, the store is
// no longer empty and subsequent mounts no-op.

import { useEffect, useRef } from "react";

import { useDossier } from "@/lib/dossierStore";
import type { Dossier } from "@/lib/types";
import primedFixture from "@/../data/fixtures/ben__hong-kong.json";

const PRIMED = primedFixture as unknown as Dossier;

export function StoreHydrator() {
  const ranOnce = useRef(false);
  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    const store = useDossier.getState();
    if (!store.dossier && !store.arrivalReservation && store.liveToolCalls.length === 0) {
      store.setDossier(PRIMED);
    }
  }, []);
  return null;
}
