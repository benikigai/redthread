import { ZoneShell } from "./ZoneShell";

const BEATS = [
  { t: "−02:14", phase: "pre", note: "Thread cast — dossier complete, room set, amenity sourced" },
  { t: "00:00", phase: "arrive", note: "Arrival — butler greets by name, no front-desk pause" },
  { t: "+04:20", phase: "on", note: "Spa visit logged — tomorrow’s table moved to quieter alcove" },
  { t: "+18:10", phase: "on", note: "Itinerary nudge held: morning hike — guest stayed in" },
  { t: "+72:00", phase: "post", note: "Thread continues — Hong Kong butler notified for next stay" },
  { t: "+120d", phase: "post", note: "Bangkok exhibit surfaces — HK butler reaches out, not marketing" },
];

export function LiveThread() {
  return (
    <ZoneShell
      tone="dark"
      label="Movement IV"
      title="The live thread"
      hint="One continuous narrative — pre-arrival to next stay."
    >
      <div className="relative pt-2 pb-4">
        {/* The literal red thread, behind the beats */}
        <div
          className="absolute left-0 right-0 top-1/2 h-px"
          style={{
            background:
              "linear-gradient(to right, transparent 0%, #C8102E 8%, #C8102E 92%, transparent 100%)",
            opacity: 0.85,
            boxShadow: "0 0 16px rgba(200,16,46,0.35)",
          }}
          aria-hidden="true"
        />
        <ol className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 z-10">
          {BEATS.map((b) => (
            <li
              key={b.t}
              className="relative bg-sage-deep border border-white/15 p-3"
            >
              {/* Knot — a small red dot anchoring this beat to the thread */}
              <span
                className="absolute -top-[5px] left-4 w-[10px] h-[10px] rounded-full border border-white/40"
                style={{ background: "#C8102E", boxShadow: "0 0 10px rgba(200,16,46,0.6)" }}
                aria-hidden="true"
              />
              <div className="caps text-brass">{b.t}</div>
              <div className="caps text-paper/55 mt-1 text-[0.6rem]">{b.phase}</div>
              <p className="mt-2 text-xs text-paper/85 leading-snug">{b.note}</p>
            </li>
          ))}
        </ol>
      </div>
    </ZoneShell>
  );
}
