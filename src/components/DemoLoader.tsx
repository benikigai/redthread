"use client";

// Red Thread — dashboard bootstrap.
//
// When the dashboard loads with ?fromIntake=1, this client island reads the
// voice-intake overrides out of sessionStorage and fetches a live dossier
// from /api/agent. Zone components subscribe to useDossier() and switch from
// their static editorial demo content to the live data when present.

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { useDossier } from "@/lib/dossierStore";

const DEFAULT_GUEST = "lin-chen";
const DEFAULT_PROPERTY = "hong-kong";

interface IntakeOverrides {
  roomTempC?: number;
  bedding?: "down" | "down-free" | "memory";
  morningRitual?: string;
  dietary?: string;
  privacyPosture?: "minimal" | "standard" | "full";
}

export function DemoLoader() {
  const params = useSearchParams();
  const setDossier = useDossier((s) => s.setDossier);
  const setLoading = useDossier((s) => s.setLoading);
  const setError = useDossier((s) => s.setError);

  useEffect(() => {
    const fromIntake = params.get("fromIntake") === "1";
    if (!fromIntake) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      let overrides: IntakeOverrides | undefined;
      try {
        const raw = sessionStorage.getItem("redthread:intake");
        if (raw) overrides = JSON.parse(raw) as IntakeOverrides;
      } catch {
        // ignore parse errors — fetch without overrides
      }
      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestId: DEFAULT_GUEST,
            propertyId: DEFAULT_PROPERTY,
            overrides,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        if (cancelled) return;
        setDossier(data, "intake");
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, setDossier, setLoading, setError]);

  return null;
}
