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
  // variants. Threads are bumped slightly thicker than v1 so the textile body
  // reads as woven, not wire.
  const rowHeight = compact ? 28 : 40;
  const threadThickness = compact ? 4 : 6;
  const knotSize = compact ? 16 : 20;

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
        /* Soft textile thread — restrained sheen, low-contrast fibers, warm
           rose base, and a fuzzy halo around the edges suggesting loose
           cotton/silk fibers catching the light. */
        .thread-track {
          background:
            /* Sheen — wide, diffuse, low-peak (matte cotton, not satin) */
            linear-gradient(
              180deg,
              rgba(255, 250, 245, 0.16) 0%,
              rgba(255, 250, 245, 0.06) 35%,
              transparent 75%
            ),
            /* Slubs — horizontal color variation along the thread length,
               like the irregular thickness of natural fiber */
            repeating-linear-gradient(
              90deg,
              transparent 0px,
              rgba(0, 0, 0, 0.025) 2px,
              transparent 4px,
              rgba(255, 220, 220, 0.04) 6px,
              transparent 9px
            ),
            /* Soft fiber twist — much lower contrast than v1, wider spacing */
            repeating-linear-gradient(
              72deg,
              rgba(50, 0, 8, 0.07) 0px,
              rgba(50, 0, 8, 0.07) 0.6px,
              transparent 0.6px,
              transparent 3.4px
            ),
            /* Base — warmer, gentler rose with less contrast top→bottom */
            linear-gradient(
              180deg,
              #d2384c 0%,
              #c01a35 50%,
              #9c1226 100%
            );
          border-radius: 999px;
          /* Fuzz halo + soft drop shadow — diffuse, not crisp */
          box-shadow:
            0 0 0.5px rgba(200, 16, 46, 0.45),
            0 0 4px rgba(200, 16, 46, 0.22),
            0 2px 6px rgba(120, 20, 30, 0.14);
          /* A whisper of edge softening — gives the thread a fiber halo */
          filter: blur(0.18px) saturate(1.02);
        }

        .thread-knot {
          position: absolute;
          transform: translateX(-50%);
          border-radius: 50%;
          pointer-events: none;
          background:
            /* Softer specular — wider, less hot, matte-bead body */
            radial-gradient(
              circle at 35% 32%,
              rgba(255, 220, 225, 0.55) 0%,
              #d8334e 22%,
              #b81830 60%,
              #7a0c1a 100%
            );
          /* Soft cream-brass halo (replaces the crisp brass ring),
             then diffuse cast shadow, then a fuzzy ambient glow */
          box-shadow:
            0 0 0 1px rgba(201, 168, 106, 0.55),
            0 0 0 2px rgba(245, 241, 232, 0.35),
            0 2px 5px rgba(70, 10, 20, 0.25),
            0 0 10px rgba(200, 16, 46, 0.28);
          transition:
            transform 80ms ease-out,
            box-shadow 120ms ease-out,
            left 60ms linear;
          /* Same edge softening as the thread — they belong to the same fabric */
          filter: blur(0.12px);
        }

        /* Lift the knot on focus/hover so it reads as a graspable bead */
        .thread-slider-input:hover ~ .thread-knot,
        .thread-slider-input:focus-visible ~ .thread-knot {
          /* No-op fallback — the rule below using sibling order matters */
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
