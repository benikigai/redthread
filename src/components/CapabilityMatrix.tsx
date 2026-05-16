import { bandFor, BAND_LABEL, type DialBand, uiToPos } from "./DiscretionDial";

/**
 * The "what changes at each level" disclosure on the guest profile.
 * Three bands; the active one is highlighted by the rose thread.
 */

interface CapabilityRow {
  band: DialBand;
  range: string;
  whatWeKnow: string[];
  whatYouSee: string;
}

const ROWS: CapabilityRow[] = [
  {
    band: "minimal",
    range: "0 – 3",
    whatWeKnow: [
      "Your dietary preferences",
      "Your room temperature, bedding, and scent",
    ],
    whatYouSee:
      "Generic welcome. Room preset per your saved preferences. The front desk greets you normally and the rest of the stay unfolds as you direct it.",
  },
  {
    band: "standard",
    range: "4 – 6",
    whatWeKnow: [
      "+ Prior stays and butler memories from past visits",
      "+ Public professional context",
      "+ Pattern matching across properties",
    ],
    whatYouSee:
      "Welcome amenity sourced to your history. The butler knows you loved Henry's at Hong Kong, and the pescatarian dinner is held at The Sea by Alexander's. No speculation about family, health, or anything outside what you have shared publicly.",
  },
  {
    band: "full",
    range: "7 – 10",
    whatWeKnow: [
      "+ Recent public press and announcements",
      "+ Calendar adjacency and pre-loaded itinerary",
      "+ Cross-property continuity (HK butler notified for next stay)",
    ],
    whatYouSee:
      "Your welcome includes a quiet note about your Series B. 7am at Windy Hill — matches your Hong Kong spa pattern. The Hong Kong butler is told so the thread continues. Still: no health, romance, family, or non-public sources.",
  },
  {
    band: "full",
    range: "9 – 10",
    whatWeKnow: [
      "+ Weekly A2A check-in with your personal agent (calendar, no email)",
      "+ Cross-property offers when your travel matches a Rosewood city",
      "+ Placemaker invitations to events during your dates in that city",
    ],
    whatYouSee:
      "Once a week, your agent and Red Thread compare notes. Bangkok later this quarter? A quiet message from your Hong Kong butler: 10% off two nights at Rosewood Bangkok — and a Placemaker invite to a private dinner Rosewood Bangkok is hosting the night you arrive. Every offer one-tap-decline; we never repeat an unwanted one.",
  },
];

interface CapabilityMatrixProps {
  /** Current dial value, 0–10. Drives which band is highlighted. */
  value: number;
}

export function CapabilityMatrix({ value }: CapabilityMatrixProps) {
  const activeBand = bandFor(uiToPos(value));

  return (
    <section
      aria-labelledby="capability-matrix-heading"
      className="border border-rule rounded-sm bg-paper px-6 py-7"
    >
      <header className="flex items-baseline justify-between border-b border-rule-soft pb-3">
        <h3
          id="capability-matrix-heading"
          className="text-[22px] leading-none text-ink"
          style={{ fontFamily: "var(--font-cormorant), serif" }}
        >
          What changes at each level
        </h3>
        <span className="text-[10px] tracking-[0.18em] uppercase text-ink-faint">
          Your data, your dial
        </span>
      </header>

      <ul className="mt-4 space-y-4">
        {ROWS.map((row) => {
          const active = row.band === activeBand;
          return (
            <li
              key={row.band}
              aria-current={active ? "true" : undefined}
              className={
                "relative border-l-2 pl-5 py-3 " +
                (active
                  ? "border-thread bg-paper-soft"
                  : "border-rule")
              }
            >
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex items-baseline gap-3">
                  <span
                    className={
                      "text-[24px] leading-none tabular-nums " +
                      (active ? "text-thread" : "text-ink-faint")
                    }
                    style={{ fontFamily: "var(--font-cormorant), serif" }}
                  >
                    {row.range}
                  </span>
                  <span
                    className={
                      "text-[14px] tracking-[0.06em] " +
                      (active ? "text-ink font-medium" : "text-ink-mute")
                    }
                    style={{ fontFamily: "var(--font-cormorant), serif" }}
                  >
                    {BAND_LABEL[row.band]}
                    {active ? (
                      <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-thread-deep">
                        ← you are here
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>

              <dl className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                <div>
                  <dt className="text-[10px] tracking-[0.18em] uppercase text-ink-faint mb-1">
                    What we know about you
                  </dt>
                  <dd>
                    <ul className="text-[13px] leading-relaxed text-ink-mute space-y-0.5">
                      {row.whatWeKnow.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] tracking-[0.18em] uppercase text-ink-faint mb-1">
                    What the dossier looks like
                  </dt>
                  <dd className="text-[13px] leading-relaxed text-ink-mute italic">
                    &ldquo;{row.whatYouSee}&rdquo;
                  </dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>

      <p className="mt-5 text-[12px] leading-relaxed text-ink-faint border-t border-rule-soft pt-3">
        The floor never moves with the slider. At every level, Red Thread
        refuses to surface health, romance, family, or anything we&rsquo;d be
        embarrassed to defend. You are trading anticipation depth — not safety.
      </p>
    </section>
  );
}
