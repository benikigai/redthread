"use client";

import Link from "next/link";

import { useDossier } from "@/lib/dossierStore";
import { bandFor, posToUi, BAND_LABEL } from "./DiscretionDial";
import { ThreadHashScale } from "./ThreadHashScale";

// One sentence per band. Direct, no marketing. Tells the concierge what
// the system will and will not surface at the saved level.
const GUIDANCE: Record<"minimal" | "standard" | "full", string> = {
  minimal: "Public signals only. Greet as a first-time guest.",
  standard: "Public signals as openers. Private context stays private.",
  full: "Anticipate fully. Provenance on every item.",
};

/**
 * Concierge-side mirror of the guest's saved Hold the Thread level.
 * Read-only. Left: the scale (visual answer). Right: number + one line.
 */
export function DashboardDial() {
  const savedPos = useDossier((s) => s.activeGuestPos);
  const savedUi = posToUi(savedPos);
  const band = bandFor(savedPos);

  const bandColor =
    band === "minimal"
      ? "text-ink-faint"
      : band === "standard"
        ? "text-thread-deep"
        : "text-thread";

  return (
    <section
      aria-label="Hold the Thread — read-only concierge view"
      className="mt-6 bg-paper-soft border hairline px-5 py-4"
    >
      <div className="grid grid-cols-12 gap-6 items-center">
        {/* Left: label + hash-mark scale */}
        <div className="col-span-12 lg:col-span-8">
          <div className="caps mb-3 flex items-center gap-2">
            <span className="inline-block w-4 h-px bg-thread" />
            Hold the Thread
          </div>

          <ThreadHashScale
            value={savedUi}
            ariaLabel="Hold the Thread"
            ariaValueText={`${savedUi} of 10 — ${BAND_LABEL[band]}`}
          />

          <div className="mt-6 flex justify-between text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            <span>Loosely</span>
            <span>Fully</span>
          </div>
        </div>

        {/* Right: big number + band + one line */}
        <div className="col-span-12 lg:col-span-4">
          <div className="flex items-baseline gap-2">
            <span
              className="font-display text-4xl text-ink leading-none tabular-nums"
              style={{ fontFamily: "var(--font-cormorant), serif" }}
            >
              {savedUi}
            </span>
            <span className="text-ink-faint text-sm">/ 10</span>
            <span
              className={`ml-2 text-[10px] tracking-[0.22em] uppercase font-medium ${bandColor}`}
            >
              {BAND_LABEL[band]}
            </span>
          </div>

          <p className="mt-3 text-[13px] text-ink leading-snug">
            {GUIDANCE[band]}
          </p>

          <p className="mt-3 text-[10px] tracking-[0.18em] uppercase text-ink-faint">
            Guest-set ·{" "}
            <Link
              href="/profile"
              className="text-ink hover:text-thread-deep border-b border-rule hover:border-thread-deep pb-0.5"
            >
              view as guest →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
