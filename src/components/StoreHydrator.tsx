"use client";

// Red Thread — initial-dossier hydrator.
//
// Bundles data/fixtures/ben__hong-kong.json into the client at build time
// via a static JSON import (resolveJsonModule + tsconfig path alias). On
// first mount, seeds the zustand store IF the store is still empty —
// LinkedIn visitors land on a fully-populated dashboard without any API
// call. Once the user runs a real briefing, subsequent mounts no-op.

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
    const empty =
      !store.dossier &&
      !store.arrivalReservation &&
      store.liveToolCalls.length === 0 &&
      store.arrivalSteps.length === 0;
    if (empty) store.setDossier(PRIMED);
  }, []);
  return null;
}
