"use client";

import { useId } from "react";

/**
 * Hold the Thread — the guest's discretion control.
 *
 * UI scale is 0–10 (integer); internal POS is 0–100. The mapping is linear
 * with bands at 0–30 / 31–69 / 70–100 (mirrors DISCRETION_LAYER_SYSTEM in
 * src/lib/prompts.ts). 0 = "Loosely held", 10 = "Fully held".
 */

export type DialBand = "minimal" | "standard" | "full";

export function uiToPos(ui: number): number {
  // 0..10 → 0..100; snap so each tick lands inside its band
  // 0→0, 1→10, 2→20, 3→30, 4→40, 5→50, 6→60, 7→70, 8→80, 9→90, 10→100
  return Math.max(0, Math.min(100, Math.round(ui) * 10));
}

export function posToUi(pos: number): number {
  return Math.max(0, Math.min(10, Math.round(pos / 10)));
}

export function bandFor(pos: number): DialBand {
  if (pos < 31) return "minimal";
  if (pos < 70) return "standard";
  return "full";
}

export const BAND_LABEL: Record<DialBand, string> = {
  minimal: "Loosely held",
  standard: "Held",
  full: "Fully held",
};

interface DiscretionDialProps {
  /** Current value, 0–10 integer. */
  value: number;
  /** Called on every change with the new 0–10 value. */
  onChange: (next: number) => void;
  /** Optional caption shown above the slider — e.g. "your saved preference: 6". */
  caption?: string;
  /** Render variant — "guest" is full-width with poles; "concierge" is the
   *  small mirror widget for the dashboard. */
  variant?: "guest" | "concierge";
  /** Disables interaction (e.g. concierge preview where saving is gated). */
  readOnly?: boolean;
}

export function DiscretionDial({
  value,
  onChange,
  caption,
  variant = "guest",
  readOnly = false,
}: DiscretionDialProps) {
  const id = useId();
  const band = bandFor(uiToPos(value));

  if (variant === "concierge") {
    return (
      <div className="border border-rule rounded-sm bg-paper-soft px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor={id}
            className="text-[10px] tracking-[0.18em] uppercase text-ink-faint font-medium"
          >
            Hold the Thread · {value}
          </label>
          <span className="text-[10px] text-ink-faint italic">
            guest preference · preview
          </span>
        </div>
        <input
          id={id}
          type="range"
          min={0}
          max={10}
          step={1}
          value={value}
          disabled={readOnly}
          onChange={(e) => onChange(Number(e.currentTarget.value))}
          className="w-full mt-2 accent-thread"
          aria-valuetext={`${value} of 10 — ${BAND_LABEL[band]}`}
        />
        <p className="mt-1 text-[11px] leading-snug text-ink-faint">
          Mirrors Ms. Chen&rsquo;s saved value. Drag to preview other levels.
          Saving requires consent through her profile.
        </p>
      </div>
    );
  }

  // Guest variant — full-width, editorial, used on /profile
  return (
    <div className="border border-rule rounded-sm bg-paper px-6 py-7">
      <div className="flex items-baseline justify-between">
        <h3
          className="text-[28px] leading-none text-ink"
          style={{ fontFamily: "var(--font-cormorant), serif" }}
        >
          Hold the Thread
        </h3>
        <div
          className="text-[28px] leading-none text-thread tabular-nums"
          style={{ fontFamily: "var(--font-cormorant), serif" }}
          aria-hidden="true"
        >
          {value}
          <span className="text-ink-faint text-[18px]"> / 10</span>
        </div>
      </div>

      <p className="mt-3 text-[14px] leading-relaxed text-ink-mute italic">
        How much should Red Thread anticipate for you?
      </p>

      {caption ? (
        <p className="mt-2 text-[11px] tracking-[0.14em] uppercase text-ink-faint">
          {caption}
        </p>
      ) : null}

      <div className="mt-6">
        <input
          id={id}
          type="range"
          min={0}
          max={10}
          step={1}
          value={value}
          disabled={readOnly}
          onChange={(e) => onChange(Number(e.currentTarget.value))}
          className="w-full accent-thread"
          aria-label="Hold the Thread"
          aria-valuetext={`${value} of 10 — ${BAND_LABEL[band]}`}
        />

        {/* Tick labels under the slider */}
        <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          <span>Loosely</span>
          <span aria-hidden="true">·</span>
          <span>Fully</span>
        </div>
      </div>

      <p className="mt-6 text-[13px] leading-relaxed text-ink-mute">
        <span className="text-thread-deep font-medium">{BAND_LABEL[band]}.</span>{" "}
        {band === "minimal"
          ? "Red Thread keeps to your dietary, room, and bedding preferences. No personalized references, no anticipated itinerary."
          : band === "standard"
            ? "Red Thread keeps the conversation grounded in your professional life and your room preferences. We never speculate about family, health, or anything outside what you have shared publicly."
            : "Red Thread anticipates fully — public press, calendar adjacency, cross-property continuity. We still refuse to surface anything about family, health, romance, or non-public sources."}
      </p>

      <p className="mt-4 text-[12px] leading-relaxed text-ink-faint">
        Every signal we remove at your current setting is saved in your private
        log — yours to review or contest at any time.
      </p>
    </div>
  );
}
