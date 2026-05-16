import { ZoneShell } from "./ZoneShell";

export function Actuators() {
  return (
    <ZoneShell label="Zone III" title="Actuators" hint="What the system commits to. Action + reasoning.">
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
    </ZoneShell>
  );
}

function Card({ label, headline, because }: { label: string; headline: string; because: string }) {
  return (
    <article className="border hairline bg-paper-soft p-4">
      <div className="caps text-sage-deep mb-1.5">{label}</div>
      <div className="font-display text-lg leading-snug text-ink">{headline}</div>
      <p className="text-xs text-ink-faint mt-2 leading-snug italic">
        <span className="text-ink-mute not-italic">because</span> {because}
      </p>
    </article>
  );
}
