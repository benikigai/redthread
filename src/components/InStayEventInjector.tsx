"use client";

// Live in-stay signal injector — sits inside the rose-deep band above
// LiveThread. Each preset click pushes an InStayEvent into the dossier
// store; LiveThread renders the event as a beat on the red thread between
// arrival and post-stay. A real product would replace this with PMS / POS /
// spa-system webhooks; for the hackathon demo, judges can watch a thread
// populate as concierge taps "Room service ordered" or "Spa booked".

import { useState } from "react";

import { useDossier, type InStayCategory } from "@/lib/dossierStore";

interface Preset {
  category: InStayCategory;
  label: string;
  detail: string;
  short: string;
}

const PRESETS: Preset[] = [
  {
    category: "room-service",
    label: "Room service · breakfast",
    detail: "Continental + a quiet pot of pu-erh, sent up at 8:15",
    short: "Room service",
  },
  {
    category: "spa",
    label: "Spa · hammam ritual booked",
    detail: "Asaya rooftop, 14:00 tomorrow — solo, no add-ons",
    short: "Spa",
  },
  {
    category: "front-desk",
    label: "Front desk call · car at 17:30",
    detail: "Requested a quiet sedan to West Kowloon at 17:30",
    short: "Front desk",
  },
  {
    category: "late-checkout",
    label: "Late checkout · 14:00 honored",
    detail: "Two extra hours; no upcharge; turn-down deferred",
    short: "Late checkout",
  },
];

export function InStayEventInjector() {
  const pushInStayEvent = useDossier((s) => s.pushInStayEvent);
  const clearInStayEvents = useDossier((s) => s.clearInStayEvents);
  const events = useDossier((s) => s.inStayEvents);
  const [custom, setCustom] = useState("");

  const submitCustom = () => {
    const text = custom.trim();
    if (!text) return;
    pushInStayEvent({ category: "custom", label: text });
    setCustom("");
  };

  return (
    <section
      aria-label="In-stay signal injector — live events from hotel systems"
      className="border border-on-dark/15 bg-rose-darker/40 p-5 mb-6"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-brass">
          <span className="text-[10px] tracking-[0.28em] uppercase font-medium">
            Live signals
          </span>
          <span className="text-[10px] text-on-dark/55 italic normal-case tracking-normal">
            — PMS · POS · spa · front desk
          </span>
        </div>
        {events.length > 0 && (
          <button
            type="button"
            onClick={clearInStayEvents}
            className="text-[10px] tracking-[0.22em] uppercase text-on-dark/55 hover:text-on-dark transition-colors"
          >
            Clear {events.length}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.category}
            type="button"
            onClick={() =>
              pushInStayEvent({
                category: p.category,
                label: p.label,
                detail: p.detail,
              })
            }
            className="text-[11px] tracking-[0.18em] uppercase font-medium px-3 py-2 bg-rose-deep text-paper hover:bg-thread-deep transition-colors border border-on-dark/15"
            title={p.detail}
          >
            + {p.short}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitCustom();
          }}
          placeholder="Custom signal — e.g., concierge dropped off a book"
          className="flex-1 bg-rose-darker text-on-dark placeholder:text-on-dark/40 border border-on-dark/15 px-3 py-2 text-[12px] focus:outline-none focus:border-brass"
        />
        <button
          type="button"
          onClick={submitCustom}
          disabled={!custom.trim()}
          className="text-[11px] tracking-[0.22em] uppercase font-medium px-4 py-2 bg-rose-deep text-paper hover:bg-thread-deep transition-colors border border-on-dark/15 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Push
        </button>
      </div>
    </section>
  );
}
