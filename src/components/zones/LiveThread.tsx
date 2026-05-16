import { ZoneShell } from "./ZoneShell";

const BEATS = [
  { t: "−02:14", phase: "pre", note: "Thread cast — dossier complete, room set, amenity sourced" },
  { t: "00:00", phase: "arrive", note: "Arrival — butler greets by name, no front-desk pause" },
  { t: "+04:20", phase: "on", note: "Spa visit logged — tomorrow&apos;s table moved to quieter alcove" },
  { t: "+18:10", phase: "on", note: "Itinerary nudge held: morning hike — guest stayed in" },
  { t: "+72:00", phase: "post", note: "Thread continues — Hong Kong butler notified for next stay" },
  { t: "+120d", phase: "post", note: "Bangkok exhibit surfaces — HK butler reaches out, not marketing" },
];

export function LiveThread() {
  return (
    <ZoneShell label="Zone IV" title="The live thread" hint="One continuous narrative — pre-arrival to next stay.">
      <div className="relative">
        <div className="absolute left-0 right-0 top-1/2 thread-line" aria-hidden="true" />
        <ol className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {BEATS.map((b) => (
            <li key={b.t} className="bg-paper border hairline p-3 relative z-10">
              <div className="caps text-thread">{b.t}</div>
              <div className="caps text-ink-faint mt-1 text-[0.6rem]">{b.phase}</div>
              <p className="mt-2 text-xs text-ink-mute leading-snug">{b.note}</p>
            </li>
          ))}
        </ol>
      </div>
    </ZoneShell>
  );
}
