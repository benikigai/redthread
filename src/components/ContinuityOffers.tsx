"use client";

// Continuity Offers — only renders when the active guest sits at POS 9 or
// 10 (Full+ band). At that level the guest has explicitly authorized Red
// Thread to ping weekly for a rough itinerary AND, when their travel
// overlaps a Rosewood city, surface concrete offers: a discounted next
// stay, a Placemaker event invite. Every offer is one-tap-decline; we
// don't ask twice.
//
// Visible on the concierge dashboard so staff can SEE what proactive
// outreach is running on the guest's behalf — and verify provenance.

import { useDossier } from "@/lib/dossierStore";
import { posToUi } from "./DiscretionDial";

interface Offer {
  id: string;
  category: "stay-discount" | "event-invite" | "checkin";
  when: string;
  headline: string;
  detail: string;
  provenance: string;
}

// Demo offers — what would fire if Ben sits at 9-10 with a confirmed
// Bangkok trip on his calendar. Real product would draw these from:
//   · guest calendar adjacency (with consent)
//   · property promotions feed
//   · Placemaker events calendar
const OFFERS: Offer[] = [
  {
    id: "weekly-checkin",
    category: "checkin",
    when: "Every Tuesday",
    headline: "Weekly itinerary check-in",
    detail:
      "Your butler asks for a rough next-90-days outline. Decline once, we skip the week.",
    provenance: "guest authorization · Hold the Thread 9/10",
  },
  {
    id: "bangkok-stay",
    category: "stay-discount",
    when: "Dec 12 – 15",
    headline: "10% off · Rosewood Bangkok",
    detail:
      "Calendar shows a Bangkok trip in your future. Two-night stay held at —10%, your usual quiet suite. No charge to hold.",
    provenance: "calendar adjacency · cross-property continuity",
  },
  {
    id: "bangkok-event",
    category: "event-invite",
    when: "Dec 13 · 19:00",
    headline: "Threadwork — opening night",
    detail:
      "Rosewood Bangkok is hosting a private dinner the night you arrive. New Asian embroidery exhibit, twelve seats, your name on the list.",
    provenance: "Placemaker · Bangkok cultural calendar",
  },
];

export function ContinuityOffers() {
  const savedPos = useDossier((s) => s.activeGuestPos);
  const savedUi = posToUi(savedPos);

  // Only visible at POS 9-10 (the top of the FULL band). Below 9 the guest
  // hasn't authorized proactive outreach — we keep the panel hidden so
  // concierge isn't tempted to act on offers that aren't allowed.
  if (savedUi < 9) return null;

  return (
    <section
      aria-label="Continuity offers — proactive outreach authorized at this level"
      className="mt-6 border hairline bg-paper-soft p-5"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-px bg-thread" />
          <span className="text-[11px] tracking-[0.22em] uppercase font-medium text-thread-deep">
            Continuity offers
          </span>
          <span className="text-[11px] text-ink-faint italic normal-case tracking-normal ml-1">
            — running because guest is at {savedUi} of 10
          </span>
        </div>
        <span className="text-[10px] tracking-[0.22em] uppercase font-medium text-thread">
          Full+
        </span>
      </div>

      <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {OFFERS.map((o) => (
          <li
            key={o.id}
            className="bg-paper border hairline p-3 flex flex-col gap-1"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] tracking-[0.22em] uppercase font-medium text-brass">
                {categoryLabel(o.category)}
              </span>
              <span className="text-[10px] font-mono text-ink-faint">{o.when}</span>
            </div>
            <h4 className="font-display text-[15px] leading-tight text-ink">
              {o.headline}
            </h4>
            <p className="text-[12px] text-ink-mute leading-snug">{o.detail}</p>
            <p className="text-[10px] text-ink-faint italic mt-1 leading-snug">
              · {o.provenance}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] text-ink-faint leading-relaxed">
        Every offer is one-tap-decline. Red Thread never repeats an unwanted
        suggestion. To stop receiving these, the guest drops the dial below 9
        on their profile.
      </p>
    </section>
  );
}

function categoryLabel(c: Offer["category"]): string {
  switch (c) {
    case "stay-discount":
      return "Stay discount";
    case "event-invite":
      return "Event invite";
    case "checkin":
      return "Weekly check-in";
  }
}
