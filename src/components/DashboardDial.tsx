"use client";

import Link from "next/link";
import { useState } from "react";

import { useDossier } from "@/lib/dossierStore";
import { bandFor, posToUi, uiToPos, BAND_LABEL } from "./DiscretionDial";
import { ThreadSlider } from "./ThreadSlider";

/**
 * Dashboard banner — the concierge mirror of the active guest's "Hold the
 * Thread" setting. Read-only "preview" semantics: staff can drag to see what
 * other levels look like; the saved value comes from the guest via /profile
 * and is mirrored here through the zustand store (ReservationIntake sets it
 * on preset selection and on submit).
 */
export function DashboardDial() {
  const savedPos = useDossier((s) => s.activeGuestPos);
  const savedUi = posToUi(savedPos);
  // Track a UI-level "override" — when the user drags the dial we use the
  // override; when the user-bound saved value changes (preset toggle), we
  // mirror it. The "store previous prop in state" pattern lets us bail out
  // of stale override without using an effect.
  const [override, setOverride] = useState<number | null>(null);
  const [prevSaved, setPrevSaved] = useState(savedUi);
  if (prevSaved !== savedUi) {
    setPrevSaved(savedUi);
    setOverride(null);
  }
  const value = override ?? savedUi;
  const setValue = (next: number) =>
    setOverride(next === savedUi ? null : next);
  const band = bandFor(uiToPos(value));
  const isPreview = override !== null && override !== savedUi;

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
                — guest&rsquo;s preference
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
              View as guest →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
