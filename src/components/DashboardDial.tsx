"use client";

import Link from "next/link";

import { useDossier } from "@/lib/dossierStore";
import { bandFor, posToUi, BAND_LABEL } from "./DiscretionDial";
import { ThreadHashScale } from "./ThreadHashScale";

// What the concierge is permitted to do at each level — one short line so
// staff can act without leaving the dashboard. These are the same three
// bands as DiscretionDial's bandFor, just framed for staff (not the guest).
const CONCIERGE_GUIDANCE: Record<"minimal" | "standard" | "full", string> = {
  minimal:
    "Acknowledge only what the guest has shared. No volunteered context, no inferred preferences.",
  standard:
    "Use public signals — press, events, prior stays — as quiet starters. Hold private context.",
  full: "Anticipate from public + professional signals. Surface proactively; mark provenance on every detail.",
};

/**
 * Dashboard banner — concierge-side READ-ONLY mirror of the active guest's
 * "Hold the Thread" setting. Shows 11 hash marks (0..10) with the saved
 * level marked by a glowing red knot; below, the band name + a one-line
 * concierge action guide for that band.
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
        <div className="col-span-12 lg:col-span-7">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <div className="caps flex items-center gap-2">
              <span className="inline-block w-4 h-px bg-thread" />
              Hold the Thread · {savedUi} of 10
              <span className="text-ink-faint normal-case tracking-normal italic ml-2 text-[11px]">
                — guest&rsquo;s saved preference
              </span>
            </div>
            <span
              className={`text-[10px] tracking-[0.22em] uppercase font-medium ${bandColor}`}
            >
              {BAND_LABEL[band]}
            </span>
          </div>

          {/* Hash-mark scale 0..10 — read-only on the concierge surface */}
          <ThreadHashScale
            value={savedUi}
            ariaLabel="Hold the Thread"
            ariaValueText={`${savedUi} of 10 — ${BAND_LABEL[band]}`}
          />

          <div className="mt-6 flex justify-between text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            <span>Loosely</span>
            <span aria-hidden="true">·</span>
            <span>Fully</span>
          </div>
        </div>

        {/* Right: concierge guidance + link to /profile */}
        <div className="col-span-12 lg:col-span-5">
          <p className="text-[12px] leading-relaxed text-ink">
            <span className={`font-medium ${bandColor}`}>
              At {BAND_LABEL[band]}:
            </span>{" "}
            {CONCIERGE_GUIDANCE[band]}
          </p>
          <p className="mt-3 text-[11px] text-ink-faint">
            Set by the guest. Concierge cannot change this — every dossier
            honors the saved level.
          </p>
          <p className="mt-2">
            <Link
              href="/profile"
              className="text-[11px] tracking-[0.22em] uppercase font-medium text-ink hover:text-thread-deep border-b border-rule hover:border-thread-deep transition-colors no-underline pb-0.5"
            >
              View as guest →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
