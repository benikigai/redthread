"use client";

import { useId } from "react";

/**
 * The literal red thread — a slider made of a textured rose-red thread with
 * a knot bead at the current value. The native <input type="range"> is
 * overlaid invisibly to keep keyboard / pointer / screen-reader behavior;
 * everything you see is CSS + a small inline SVG knot.
 *
 * Visual language matches the rest of Red Thread:
 *   - the thread is a stacked-gradient red line (sheen + diagonal fiber twist)
 *   - the knot is a small red circle ringed in brass, casting a soft shadow
 *   - integer ticks are tiny brass hashes, the current one rose-deep
 *
 * Used by DiscretionDial (guest variant, on /profile) and DashboardDial
 * (concierge variant, on /).
 */

interface ThreadSliderProps {
  /** Integer 0–10. */
  value: number;
  onChange: (next: number) => void;
  /** Accessible label — short, e.g. "Hold the Thread". */
  ariaLabel: string;
  /** Spoken value description — e.g. "6 of 10 — Held". */
  ariaValueText: string;
  /** Disables the slider. */
  disabled?: boolean;
  /** Compact mode — used in the dashboard banner where vertical room is tight. */
  compact?: boolean;
}

const STEPS = 11; // 0..10

export function ThreadSlider({
  value,
  onChange,
  ariaLabel,
  ariaValueText,
  disabled = false,
  compact = false,
}: ThreadSliderProps) {
  const id = useId();
  const pct = (value / 10) * 100;

  // Heights chosen so the knot stays touch-friendly (≥24px hit target) on both
  // variants. The visible thread is much thinner; the input fills the row.
  const rowHeight = compact ? 26 : 36;
  const threadThickness = compact ? 3 : 4;
  const knotSize = compact ? 14 : 18;

  return (
    <div
      className="relative w-full select-none"
      style={{ height: rowHeight }}
    >
      {/* Thread track — base, fiber, sheen layers. Aligned to vertical center. */}
      <div
        aria-hidden="true"
        className="thread-track absolute left-0 right-0"
        style={{
          top: `calc(50% - ${threadThickness / 2}px)`,
          height: threadThickness,
        }}
      />

      {/* Integer tick marks — tiny brass hashes; the active one rose-deep. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
      >
        {Array.from({ length: STEPS }).map((_, i) => {
          const tickPct = (i / 10) * 100;
          const active = i === value;
          const tickHeight = active ? threadThickness + 6 : threadThickness + 2;
          return (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${tickPct}%`,
                top: `calc(50% - ${tickHeight / 2}px)`,
                height: tickHeight,
                width: active ? 1.5 : 1,
                background: active
                  ? "var(--thread-deep)"
                  : "var(--brass)",
                opacity: active ? 0.9 : 0.35,
                transform: "translateX(-0.5px)",
              }}
            />
          );
        })}
      </div>

      {/* The knot — a small red bead ringed in brass, casting a soft shadow. */}
      <span
        aria-hidden="true"
        className="thread-knot"
        style={{
          left: `${pct}%`,
          width: knotSize,
          height: knotSize,
          top: `calc(50% - ${knotSize / 2}px)`,
        }}
      />

      {/* Native input — invisible but driving everything. Z-indexed above the
          decorations so pointer/keyboard interactions land on it. */}
      <input
        id={id}
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        aria-label={ariaLabel}
        aria-valuetext={ariaValueText}
        className="thread-slider-input absolute inset-0 w-full h-full cursor-pointer disabled:cursor-not-allowed"
      />

      <style jsx>{`
        .thread-track {
          background:
            /* Sheen — bright highlight on the upper half, fading down */
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.32) 0%,
              rgba(255, 255, 255, 0.06) 45%,
              transparent 70%
            ),
            /* Fiber twist — diagonal hatch suggests woven strands */
            repeating-linear-gradient(
              68deg,
              rgba(0, 0, 0, 0.18) 0px,
              rgba(0, 0, 0, 0.18) 0.6px,
              transparent 0.6px,
              transparent 2.4px
            ),
            /* Base — vertical shading for roundness on the thread */
            linear-gradient(
              180deg,
              #e11f3f 0%,
              #c8102e 45%,
              #a50c26 100%
            );
          border-radius: 999px;
          box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.18),
            0 0 12px rgba(200, 16, 46, 0.18);
        }

        .thread-knot {
          position: absolute;
          transform: translateX(-50%);
          border-radius: 50%;
          pointer-events: none;
          background:
            /* Specular highlight, then radial body */
            radial-gradient(
              circle at 32% 28%,
              #ff5070 0%,
              #d61834 38%,
              #8b0010 100%
            );
          /* Brass ring + soft cast shadow */
          box-shadow:
            0 0 0 1.5px var(--brass),
            0 2px 4px rgba(0, 0, 0, 0.28),
            0 0 12px rgba(200, 16, 46, 0.35);
          transition:
            transform 80ms ease-out,
            box-shadow 120ms ease-out,
            left 60ms linear;
        }

        .thread-slider-input {
          appearance: none;
          background: transparent;
          margin: 0;
          padding: 0;
          border: 0;
          opacity: 0; /* the visible part is the divs above */
          z-index: 2;
        }

        /* Make the focus / hover state visible by tweaking the knot */
        .thread-slider-input:focus-visible + :where(.thread-knot),
        .thread-slider-input:focus-visible ~ :where(.thread-knot) {
          /* fallback selector — keyboard focus highlight */
        }
        .thread-slider-input:focus-visible {
          outline: 2px solid var(--thread-deep);
          outline-offset: 4px;
          border-radius: 999px;
        }

        /* WebKit / Blink — keep the native thumb invisible but inflate the
           hit area so dragging works comfortably. */
        .thread-slider-input::-webkit-slider-runnable-track {
          background: transparent;
          height: 100%;
        }
        .thread-slider-input::-webkit-slider-thumb {
          appearance: none;
          width: 28px;
          height: 28px;
          background: transparent;
          border: 0;
          cursor: grab;
        }
        .thread-slider-input:active::-webkit-slider-thumb {
          cursor: grabbing;
        }

        /* Firefox */
        .thread-slider-input::-moz-range-track {
          background: transparent;
          height: 100%;
          border: 0;
        }
        .thread-slider-input::-moz-range-thumb {
          width: 28px;
          height: 28px;
          background: transparent;
          border: 0;
          cursor: grab;
        }
      `}</style>
    </div>
  );
}
