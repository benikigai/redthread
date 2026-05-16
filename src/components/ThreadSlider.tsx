"use client";

import { useId } from "react";

/**
 * The literal red thread — a slider drawn as an SVG quadratic Bézier with a
 * gentle catenary droop, slubs along its length, and a knot bead at the
 * current value. The native <input type="range"> is overlaid invisibly so
 * keyboard / pointer / screen-reader behavior all carry over.
 *
 * Curve math
 *   We use a viewBox of 100 × 10 and a quadratic with control point (50, 7).
 *   The baseline runs at y=5 and the maximum droop is 2 units. With
 *   preserveAspectRatio="none" the path stretches to fill the row, so the
 *   pixel droop is 0.2 × rowHeight (8px for the guest variant, 5.6px for the
 *   compact dashboard banner). The knot and tick marks share this curve via
 *   the same `droopFraction(t) = 4·t·(1−t)` formula, so everything sits *on*
 *   the thread instead of floating above it.
 *
 * Slubs
 *   Five short low-opacity ellipses placed at irregular t positions —
 *   thicker / thinner / lighter / darker bumps that read as natural fibre
 *   variation at glance distance. Each one sits on the curve at its t.
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

// viewBox-relative — baseline at y=5, control point depth = 2 → max droop 2.
// In px on screen: droop = 2 × (rowHeight / 10) = rowHeight × 0.2.
const VIEWBOX_W = 100;
const VIEWBOX_H = 10;
const BASELINE_Y = 5;
const DROOP_UNITS = 2;
const DROOP_PX_FACTOR = DROOP_UNITS / VIEWBOX_H; // 0.2

/** Vertical pixel offset from the row centerline at parameter t (0..1). */
function droopPxAt(t: number, rowHeight: number): number {
  return 4 * t * (1 - t) * DROOP_PX_FACTOR * rowHeight;
}

/** Y coordinate on the curve in viewBox units. */
function curveYAt(t: number): number {
  return BASELINE_Y + 4 * t * (1 - t) * DROOP_UNITS;
}

// Hand-picked slubs along the thread. Each is a small low-opacity ellipse
// placed exactly on the curve at its t value.
const SLUBS = [
  { t: 0.13, rx: 1.4, ry: 0.42, fill: "rgba(40, 0, 6, 0.32)" },
  { t: 0.27, rx: 0.9, ry: 0.36, fill: "rgba(255, 220, 220, 0.20)" },
  { t: 0.41, rx: 1.7, ry: 0.45, fill: "rgba(40, 0, 6, 0.28)" },
  { t: 0.58, rx: 1.1, ry: 0.34, fill: "rgba(255, 220, 220, 0.18)" },
  { t: 0.72, rx: 1.5, ry: 0.42, fill: "rgba(40, 0, 6, 0.30)" },
  { t: 0.88, rx: 1.0, ry: 0.36, fill: "rgba(255, 220, 220, 0.18)" },
];

export function ThreadSlider({
  value,
  onChange,
  ariaLabel,
  ariaValueText,
  disabled = false,
  compact = false,
}: ThreadSliderProps) {
  const id = useId();
  const t = value / 10;
  const xPct = t * 100;

  const rowHeight = compact ? 32 : 44;
  const threadThickness = compact ? 4 : 6;
  const knotSize = compact ? 16 : 20;

  const knotDroopPx = droopPxAt(t, rowHeight);

  // Tick positions — each tick sits on the curve at its own t
  const ticks = Array.from({ length: STEPS }, (_, i) => {
    const ti = i / 10;
    return {
      i,
      pct: ti * 100,
      droopPx: droopPxAt(ti, rowHeight),
    };
  });

  // Quadratic Bézier in viewBox units — slight catenary droop
  const PATH = `M 0 ${BASELINE_Y} Q ${VIEWBOX_W / 2} ${BASELINE_Y + DROOP_UNITS} ${VIEWBOX_W} ${BASELINE_Y}`;
  // Sheen path lifted slightly above the body
  const SHEEN_PATH = `M 0 ${BASELINE_Y - 0.6} Q ${VIEWBOX_W / 2} ${BASELINE_Y + DROOP_UNITS - 0.6} ${VIEWBOX_W} ${BASELINE_Y - 0.6}`;

  return (
    <div
      className="relative w-full select-none"
      style={{ height: rowHeight }}
    >
      {/* The thread itself — SVG with the curve, gradient stroke, slubs, sheen */}
      <svg
        aria-hidden="true"
        className="thread-svg absolute inset-0 w-full h-full overflow-visible"
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`thread-body-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#d8334e" />
            <stop offset="50%" stopColor="#c01a35" />
            <stop offset="100%" stopColor="#9c1226" />
          </linearGradient>
          <linearGradient id={`thread-sheen-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,250,245,0.45)" />
            <stop offset="100%" stopColor="rgba(255,250,245,0)" />
          </linearGradient>
        </defs>

        {/* Body — gradient stroke; non-scaling so it stays exactly N px wide */}
        <path
          d={PATH}
          fill="none"
          stroke={`url(#thread-body-${id})`}
          strokeWidth={threadThickness}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Slubs — soft thickness bumps along the curve */}
        {SLUBS.map((s, idx) => (
          <ellipse
            key={idx}
            cx={s.t * VIEWBOX_W}
            cy={curveYAt(s.t)}
            rx={s.rx}
            ry={s.ry}
            fill={s.fill}
          />
        ))}

        {/* Sheen — thin lighter stroke along the upper edge */}
        <path
          d={SHEEN_PATH}
          fill="none"
          stroke={`url(#thread-sheen-${id})`}
          strokeWidth={Math.max(1, threadThickness - 4)}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          opacity={0.55}
        />
      </svg>

      {/* Integer tick marks — each draped to its position on the curve */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        {ticks.map((tick) => {
          const active = tick.i === value;
          const tickHeight = active ? threadThickness + 6 : threadThickness + 2;
          return (
            <span
              key={tick.i}
              style={{
                position: "absolute",
                left: `${tick.pct}%`,
                top: `calc(50% - ${tickHeight / 2}px + ${tick.droopPx}px)`,
                height: tickHeight,
                width: active ? 1.5 : 1,
                background: active
                  ? "var(--thread-deep)"
                  : "var(--brass)",
                opacity: active ? 0.9 : 0.32,
                transform: "translateX(-0.5px)",
              }}
            />
          );
        })}
      </div>

      {/* The knot — sits ON the curve at value's t */}
      <span
        aria-hidden="true"
        className="thread-knot"
        style={{
          left: `${xPct}%`,
          width: knotSize,
          height: knotSize,
          top: `calc(50% - ${knotSize / 2}px + ${knotDroopPx}px)`,
        }}
      />

      {/* Native input — invisible but driving everything */}
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
        .thread-svg {
          /* Diffuse halo + soft cast shadow — same fabric language as the knot */
          filter:
            drop-shadow(0 0 0.5px rgba(200, 16, 46, 0.45))
            drop-shadow(0 0 3px rgba(200, 16, 46, 0.22))
            drop-shadow(0 2px 5px rgba(120, 20, 30, 0.14));
        }

        .thread-knot {
          position: absolute;
          transform: translateX(-50%);
          border-radius: 50%;
          pointer-events: none;
          background:
            radial-gradient(
              circle at 35% 32%,
              rgba(255, 220, 225, 0.55) 0%,
              #d8334e 22%,
              #b81830 60%,
              #7a0c1a 100%
            );
          box-shadow:
            0 0 0 1px rgba(201, 168, 106, 0.55),
            0 0 0 2px rgba(245, 241, 232, 0.35),
            0 2px 5px rgba(70, 10, 20, 0.25),
            0 0 10px rgba(200, 16, 46, 0.28);
          transition:
            transform 80ms ease-out,
            box-shadow 120ms ease-out,
            left 60ms linear,
            top 60ms linear;
          filter: blur(0.12px);
        }

        .thread-slider-input {
          appearance: none;
          background: transparent;
          margin: 0;
          padding: 0;
          border: 0;
          opacity: 0;
          z-index: 2;
        }
        .thread-slider-input:focus-visible {
          outline: 2px solid var(--thread-deep);
          outline-offset: 4px;
          border-radius: 999px;
        }
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
