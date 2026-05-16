"use client";

// Shared visual for Hold the Thread — 11 hash marks (0..10), filled bar
// up to current level, glowing red knot at the saved position, numerals
// beneath. Used in:
//   - DashboardDial (concierge-side, read-only — no onChange prop)
//   - ThreadDial on /profile (guest-side, interactive — onChange provided)
//
// When onChange is supplied a transparent native <input type="range"> is
// laid over the visual, so the guest can drag the knot with mouse, touch,
// or keyboard arrows — same look on both surfaces, only the interactivity
// changes.

interface Props {
  value: number; // 0..10
  onChange?: (next: number) => void;
  ariaLabel: string;
  ariaValueText?: string;
}

export function ThreadHashScale({ value, onChange, ariaLabel, ariaValueText }: Props) {
  const fillPct = (value / 10) * 100;
  const interactive = typeof onChange === "function";

  return (
    <div className="relative h-7">
      {/* Continuous baseline */}
      <div
        className="absolute top-1/2 left-0 right-0 h-px bg-rule -translate-y-1/2"
        aria-hidden="true"
      />
      {/* Filled portion from 0 to current */}
      <div
        className="absolute top-1/2 left-0 h-px bg-thread -translate-y-1/2"
        style={{ width: `${fillPct}%`, opacity: 0.85 }}
        aria-hidden="true"
      />
      {/* 11 hash marks */}
      {Array.from({ length: 11 }, (_, i) => {
        const isFilled = i <= value;
        const isActive = i === value;
        return (
          <span
            key={i}
            className="absolute top-1/2 w-px h-3 -translate-y-1/2"
            style={{
              left: `${(i / 10) * 100}%`,
              background: isFilled ? "var(--thread)" : "var(--rule)",
              opacity: isActive ? 0 : isFilled ? 0.85 : 0.7,
            }}
            aria-hidden="true"
          />
        );
      })}
      {/* Numerals 0..10 below */}
      <div
        className="absolute top-[calc(50%+10px)] left-0 right-0 flex justify-between text-[9px] font-mono text-ink-faint"
        aria-hidden="true"
      >
        {Array.from({ length: 11 }, (_, i) => (
          <span
            key={i}
            className={i === value ? "text-thread-deep font-medium" : ""}
            style={{
              width: 0,
              transform: `translateX(${i === 0 ? 0 : i === 10 ? -100 : -50}%)`,
            }}
          >
            {i}
          </span>
        ))}
      </div>
      {/* Glow knot at saved position */}
      <span
        className="absolute top-1/2 w-[12px] h-[12px] rounded-full bg-thread -translate-y-1/2 pointer-events-none"
        style={{
          left: `calc(${fillPct}% - 6px)`,
          boxShadow: "0 0 12px rgba(200,16,46,0.65)",
        }}
        aria-hidden="true"
      />

      {/* Interactive overlay — transparent native range input */}
      {interactive ? (
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={value}
          onChange={(e) => onChange?.(Number(e.currentTarget.value))}
          aria-label={ariaLabel}
          aria-valuetext={ariaValueText}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ touchAction: "none" }}
        />
      ) : (
        <span role="img" aria-label={ariaValueText ?? ariaLabel} className="sr-only">
          {ariaValueText ?? ariaLabel}
        </span>
      )}
    </div>
  );
}
