"use client";

import Link from "next/link";

import { useDossier } from "@/lib/dossierStore";
import { bandFor, posToUi, BAND_LABEL } from "./DiscretionDial";

/**
 * Dashboard banner — concierge-side READ-ONLY mirror of the active guest's
 * "Hold the Thread" setting. The value is set by the guest through /profile;
 * concierge staff can see the level + band label here but cannot change it.
 * No drag, no input semantics — just a visible report of where the dial sits.
 */
export function DashboardDial() {
  const savedPos = useDossier((s) => s.activeGuestPos);
  const savedUi = posToUi(savedPos);
  const band = bandFor(savedPos);
  const fillPct = (savedUi / 10) * 100;

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
        {/* Left: label + read-only visual bar */}
        <div className="col-span-12 lg:col-span-7">
          <div className="flex items-baseline justify-between gap-3 mb-2.5">
            <div className="caps flex items-center gap-2">
              <span className="inline-block w-4 h-px bg-thread" />
              Hold the Thread · {savedUi} of 10
              <span className="text-ink-faint normal-case tracking-normal italic ml-2 text-[11px]">
                — guest&rsquo;s saved preference
              </span>
            </div>
            <span className={`text-[10px] tracking-[0.22em] uppercase font-medium ${bandColor}`}>
              {BAND_LABEL[band]}
            </span>
          </div>

          {/* Read-only bar — visually presents the level, no drag affordance */}
          <div
            role="img"
            aria-label={`${savedUi} of 10 — ${BAND_LABEL[band]}`}
            className="relative h-px bg-rule"
          >
            <div
              className="absolute left-0 top-0 h-px bg-thread"
              style={{ width: `${fillPct}%`, opacity: 0.85 }}
              aria-hidden="true"
            />
            <span
              className="absolute -top-[5px] w-[10px] h-[10px] rounded-full bg-thread"
              style={{
                left: `calc(${fillPct}% - 5px)`,
                boxShadow: "0 0 10px rgba(200,16,46,0.55)",
              }}
              aria-hidden="true"
            />
          </div>

          <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            <span>Loosely</span>
            <span aria-hidden="true">·</span>
            <span>Fully</span>
          </div>
        </div>

        {/* Right: copy + link to /profile */}
        <div className="col-span-12 lg:col-span-5 text-[12px] leading-relaxed text-ink-mute lg:text-right">
          <p>
            Set by the guest through their profile. Concierge cannot change
            this — every dossier honors the saved level.
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
