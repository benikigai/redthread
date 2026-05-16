"use client";

import { ZoneShell } from "./ZoneShell";
import { useDossier } from "@/lib/dossierStore";
import type { Dossier } from "@/lib/types";

export function Actuators() {
  const dossier = useDossier((s) => s.dossier);
  return (
    <ZoneShell label="Zone III" title="Actuators" hint="What the system commits to. Action + reasoning.">
      {dossier ? <ActuatorsLive dossier={dossier} /> : <ActuatorsEmpty />}
    </ZoneShell>
  );
}

function ActuatorsLive({ dossier }: { dossier: Dossier }) {
  const { roomState, welcomeAmenity, itinerary } = dossier.actuators;
  const roomHeadline = [
    `${roomState.climateC}°C`,
    roomState.lighting,
    roomState.scent,
    roomState.bedding,
  ]
    .filter(Boolean)
    .join(" · ");
  const itineraryHeadline = itinerary
    .slice(0, 2)
    .map((e) => `${e.time} ${e.title}`)
    .join(" · ");
  return (
    <div className="space-y-4">
      <Card
        label="Room state · live"
        headline={roomHeadline}
        because={roomState.reasoning[0] ?? "—"}
      />
      <Card
        label="Welcome amenity · live"
        headline={welcomeAmenity.name}
        because={welcomeAmenity.reasoning}
      />
      <Card
        label="Itinerary held · live"
        headline={itineraryHeadline || "—"}
        because={itinerary[0]?.reasoning ?? "—"}
      />
    </div>
  );
}

function ActuatorsEmpty() {
  return (
    <div className="py-10 text-center space-y-2">
      <div className="caps text-ink-faint">Awaiting briefing</div>
      <p className="font-display italic text-ink-mute text-sm leading-snug max-w-[32ch] mx-auto">
        Room state, welcome amenity, and itinerary commit here once the dossier completes.
      </p>
    </div>
  );
}

function ActuatorsStatic() {
  return (
    <div className="space-y-4">
      <Card
        label="Room state"
        headline="19°C · warm dim · sandalwood"
        because="HK stays: thermostat 19°C twice. Late arrival — lighting pre-set wind-down."
      />
      <Card
        label="Welcome amenity"
        headline="Frog Hollow heirloom pears + Bay Area honey"
        because="30 min from property. Pescatarian-safe. Sand Hill native — refuses the cookie-cutter macaron."
      />
      <Card
        label="Itinerary held"
        headline="07:00 Windy Hill · 19:00 The Sea by Alexander&apos;s"
        because="Morning ritual matches HK spa pattern. Dinner echoes Henry&apos;s register."
      />
    </div>
  );
}

function Card({ label, headline, because }: { label: string; headline: string; because: string }) {
  return (
    <article className="border hairline bg-paper-soft p-4">
      <div className="caps text-thread-deep mb-1.5">{label}</div>
      <div className="font-display text-lg leading-snug text-ink">{headline}</div>
      <p className="text-xs text-ink-faint mt-2 leading-snug italic">
        <span className="text-ink-mute not-italic">because</span> {because}
      </p>
    </article>
  );
}
