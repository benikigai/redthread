"use client";

import { useId } from "react";

/**
 * The literal red thread — a straight strand of cashmere with a knot at the
 * current value. The native <input type="range"> is overlaid invisibly so
 * keyboard / pointer / screen-reader behavior all carry over.
 *
 * Design language
 *   - Thread: matte cashmere red. Subtle hand-spun striations along the
 *     length, a whisper of fuzz halo around the edges, no satin sheen.
 *   - Knot: a small overhand knot of the same thread, drawn as a tied
 *     SVG path. It reads as a thicker spot on the thread, not a foreign
 *     bead. Brass-cream halo sits behind the knot the same way the thread's
 *     halo sits behind the thread.
 *
 * Inset playfield
 *   The slider parts live inside an inner box pulled in by knotSize/2 on
 *   each side so the knot never clips off the row at v=0 or v=10.
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
  const xPct = (value / 10) * 100;

  const rowHeight = compact ? 34 : 48;
  const threadThickness = compact ? 5 : 8;
  const knotSize = compact ? 22 : 30;
  // Half-side inset so the knot never clips the row edges at v=0 / v=10
  const inset = knotSize / 2;

  return (
    <div
      className="thread-row relative w-full select-none"
      style={{ height: rowHeight }}
    >
      <div
        className="thread-playfield absolute top-0 bottom-0"
        style={{ left: inset, right: inset }}
      >
        {/* The thread — a straight horizontal strand of cashmere */}
        <div
          aria-hidden="true"
          className="thread-strand absolute left-0 right-0"
          style={{
            top: `calc(50% - ${threadThickness / 2}px)`,
            height: threadThickness,
          }}
        />

        {/* Integer ticks — tiny brass hairs above/below the thread */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          {Array.from({ length: STEPS }).map((_, i) => {
            const active = i === value;
            const tickHeight = active ? threadThickness + 6 : threadThickness + 3;
            return (
              <span
                key={i}
                style={{
                  position: "absolute",
                  left: `${(i / 10) * 100}%`,
                  top: `calc(50% - ${tickHeight / 2}px)`,
                  height: tickHeight,
                  width: active ? 1.5 : 1,
                  background: active
                    ? "var(--thread-deep)"
                    : "var(--brass)",
                  opacity: active ? 0.85 : 0.28,
                  transform: "translateX(-0.5px)",
                  borderRadius: 1,
                }}
              />
            );
          })}
        </div>

        {/* The knot — an overhand knot drawn as a small SVG, sitting on the
            thread at the value position. Same gradient as the strand so it
            reads as the same fiber, just tied. */}
        <span
          aria-hidden="true"
          className="thread-knot"
          style={{
            left: `${xPct}%`,
            width: knotSize,
            height: knotSize,
            top: `calc(50% - ${knotSize / 2}px)`,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width={knotSize}
            height={knotSize}
            className="block"
            aria-hidden="true"
          >
            <defs>
              <radialGradient
                id={`knot-body-${id}`}
                cx="0.36"
                cy="0.32"
                r="0.85"
              >
                <stop offset="0%" stopColor="#ec5670" />
                <stop offset="32%" stopColor="#c52240" />
                <stop offset="72%" stopColor="#891428" />
                <stop offset="100%" stopColor="#530713" />
              </radialGradient>
              <linearGradient
                id={`knot-wrap-${id}`}
                x1="0"
                x2="1"
                y1="0"
                y2="0"
              >
                <stop offset="0%" stopColor="rgba(50, 4, 12, 0)" />
                <stop offset="20%" stopColor="rgba(50, 4, 12, 0.55)" />
                <stop offset="50%" stopColor="rgba(50, 4, 12, 0.75)" />
                <stop offset="80%" stopColor="rgba(50, 4, 12, 0.55)" />
                <stop offset="100%" stopColor="rgba(50, 4, 12, 0)" />
              </linearGradient>
            </defs>

            {/* Knot body — oval, suggesting wound thread (not a perfect
                bead). Same colour family as the thread strand. */}
            <ellipse
              cx="12"
              cy="12"
              rx="9.5"
              ry="7.4"
              fill={`url(#knot-body-${id})`}
            />

            {/* The wrap — a single curved line that crosses the knot like
                the thread is tied around itself. This is what makes the
                element read as a KNOT and not a bead. */}
            <path
              d="M 3.2 10.6 Q 12 18, 20.8 10.6"
              fill="none"
              stroke={`url(#knot-wrap-${id})`}
              strokeWidth="1.4"
              strokeLinecap="round"
            />

            {/* Sister wrap line above — subtler, hints at the second pass
                of the tie */}
            <path
              d="M 4.5 13.4 Q 12 7, 19.5 13.4"
              fill="none"
              stroke="rgba(50, 4, 12, 0.32)"
              strokeWidth="0.9"
              strokeLinecap="round"
            />

            {/* Soft specular highlight — matte cashmere, not satin */}
            <ellipse
              cx="9"
              cy="8.6"
              rx="3.6"
              ry="2.0"
              fill="rgba(255, 220, 220, 0.42)"
              transform="rotate(-18 9 8.6)"
            />
          </svg>
        </span>

        {/* Native input — invisible but driving everything. Lives in the
            inset playfield so clicks at the leftmost on-thread pixel set
            value=0 and the knot is already there. */}
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
      </div>

      <style jsx>{`
        /* Cashmere thread — matte, soft, slightly hairy. No catenary, no
           shine; just a warm rose strand that looks spun, not extruded. */
        .thread-strand {
          background:
            /* Subtle hand-spun striations — soft diagonal grain */
            repeating-linear-gradient(
              80deg,
              rgba(255, 220, 220, 0.05) 0px,
              transparent 0.7px,
              rgba(40, 0, 8, 0.06) 1.6px,
              transparent 2.6px
            ),
            /* Length-wise variation — natural fibre is never one tone */
            repeating-linear-gradient(
              90deg,
              transparent 0px,
              rgba(0, 0, 0, 0.02) 3px,
              transparent 5px,
              rgba(255, 220, 220, 0.03) 7px,
              transparent 11px
            ),
            /* Base — matte, very gentle vertical shading for roundness */
            linear-gradient(
              180deg,
              #c92e44 0%,
              #b91a32 50%,
              #951125 100%
            );
          border-radius: 999px;
          /* Fuzz halo — multi-layered low-alpha glow suggests loose
             cashmere fibers catching the light around the edges */
          box-shadow:
            0 0 0.5px rgba(160, 16, 36, 0.55),
            0 0 2px rgba(200, 30, 50, 0.28),
            0 0 6px rgba(200, 30, 50, 0.16),
            0 1px 3px rgba(80, 10, 20, 0.10);
          filter: blur(0.22px);
        }

        .thread-knot {
          position: absolute;
          transform: translateX(-50%);
          pointer-events: none;
          /* The knot SVG handles its own colour; the wrapper supplies the
             ambient halo so the knot reads as part of the same fabric */
          filter:
            drop-shadow(0 0 0.5px rgba(200, 30, 50, 0.55))
            drop-shadow(0 0 3px rgba(200, 30, 50, 0.25))
            drop-shadow(0 2px 4px rgba(80, 10, 20, 0.22));
          transition:
            left 70ms linear,
            filter 140ms ease-out;
        }

        /* Knot lift on hover / keyboard focus — uses :has so the sibling
           input's state can style the knot above it. */
        .thread-row:has(.thread-slider-input:hover) .thread-knot,
        .thread-row:has(.thread-slider-input:focus-visible) .thread-knot {
          filter:
            drop-shadow(0 0 0 1px rgba(201, 168, 106, 0.85))
            drop-shadow(0 0 0 2px rgba(245, 241, 232, 0.55))
            drop-shadow(0 0 2px rgba(200, 30, 50, 0.45))
            drop-shadow(0 0 6px rgba(200, 30, 50, 0.30))
            drop-shadow(0 3px 6px rgba(80, 10, 20, 0.28));
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
          /* Visible focus is on the knot via :has — no rectangle outline */
          outline: none;
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
