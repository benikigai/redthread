"use client";

import Link from "next/link";
import { useState } from "react";

import { bandFor, posToUi, uiToPos, BAND_LABEL } from "./DiscretionDial";
import { ThreadSlider } from "./ThreadSlider";

/**
 * Dashboard banner — the concierge mirror of Mr. Shyong's Hold the Thread
 * setting. Read-only "preview" semantics: staff can drag to see what other
 * levels look like; saving requires the guest's consent through /profile.
 *
 * Single source of truth for the saved value is the guest's profile; in this
 * hackathon scope we hard-code the starting value from data/guests/ben.json
 * (POS=55 → 5/10). A real product would fetch /api/guest/ben.
 */
const SAVED_POS = 55; // matches data/guests/ben.json
const SAVED_UI = posToUi(SAVED_POS);

export function DashboardDial() {
  const [value, setValue] = useState(SAVED_UI);
  const band = bandFor(uiToPos(value));
  const isPreview = value !== SAVED_UI;

  return (
    <section
      aria-label="Hold the Thread — concierge mirror"
      className="bg-paper-soft border-y border-rule"
    >
      <div className="mx-auto w-full max-w-[1480px] px-8 py-5 grid grid-cols-12 gap-6 items-center">
        {/* Left: label + slider */}
        <div className="col-span-12 lg:col-span-7">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <div className="caps flex items-center gap-2">
              <span className="inline-block w-4 h-px bg-thread" />
              Hold the Thread · {value} of 10
              <span className="text-ink-faint normal-case tracking-normal italic ml-2 text-[11px]">
                — Ms. Chen&rsquo;s preference
                {isPreview ? " · preview" : ""}
              </span>
            </div>
            <span
              className={
                "text-[10px] tracking-[0.18em] uppercase " +
                (band === "minimal"
                  ? "text-ink-faint"
                  : band === "standard"
                    ? "text-thread-deep"
                    : "text-thread")
              }
            >
              {BAND_LABEL[band]}
            </span>
          </div>
          <ThreadSlider
            value={value}
            onChange={setValue}
            compact
            ariaLabel="Hold the Thread (preview)"
            ariaValueText={`${value} of 10 — ${BAND_LABEL[band]}`}
          />
          <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            <span>Loosely</span>
            <span aria-hidden="true">·</span>
            <span>Fully</span>
          </div>
        </div>

        {/* Right: copy + link to /profile */}
        <div className="col-span-12 lg:col-span-5 text-[12px] leading-relaxed text-ink-mute lg:text-right">
          <p>
            Drag to preview what the dossier looks like at other levels.
            Saving requires her consent through her profile.
          </p>
          <p className="mt-2">
            <Link
              href="/profile"
              className="caps text-ink hover:text-thread border-b border-rule hover:border-thread transition-colors no-underline pb-0.5"
            >
              View as Ms. Chen →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
