"use client";

// Demo callout — explicitly maps Hold the Thread + Discretion Layer to
// Hackathon Problem Statement #2: The Invisible Concierge.
// The challenge: ambient intelligence that anticipates without surveillance —
// the line between "they just knew" and "that's creepy."
// Our answer: the guest draws the line themselves on a single dial. The
// Discretion Layer (Claude Haiku 4.5) audits every signal before staff
// sees it, and every removal is logged auditably in dossier.suppressed[].

const MECHANISMS = [
  { label: "Guest-tuned depth", detail: "Dial set by the guest, not us" },
  { label: "Discretion Layer", detail: "Haiku 4.5 audits every signal" },
  { label: "Auditable removals", detail: "Every redaction logged" },
  { label: "One-tap-decline", detail: "Offers never repeat unwanted" },
];

export function ProblemTwoContext() {
  return (
    <section
      aria-label="Problem 2 — The Invisible Concierge"
      className="mt-4 border-l-2 border-thread-deep bg-paper-soft px-5 py-4"
    >
      <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1 mb-2.5">
        <span className="text-[10px] tracking-[0.3em] uppercase font-semibold text-thread-deep">
          Problem 2
        </span>
        <span
          className="font-display italic text-[15px] text-ink leading-none"
          style={{ letterSpacing: "0.01em" }}
        >
          The Invisible Concierge
        </span>
        <span className="text-[10px] tracking-[0.22em] uppercase text-ink-faint">
          how Hold the Thread addresses it
        </span>
      </div>

      <p className="text-[13px] text-ink leading-relaxed max-w-prose">
        Ultra-luxury guests want needs anticipated — not asked for. The hard
        design line is between{" "}
        <em className="not-italic font-medium text-thread-deep">
          &ldquo;they just knew&rdquo;
        </em>{" "}
        and{" "}
        <em className="not-italic font-medium text-thread-deep">
          &ldquo;that&rsquo;s creepy.&rdquo;
        </em>{" "}
        Red Thread doesn&rsquo;t guess where the line is — the guest draws it,
        on a single dial they own. Every inferred signal then passes a second,
        auditable Discretion Layer before any staff member sees it.
      </p>

      <ul className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {MECHANISMS.map((m) => (
          <li
            key={m.label}
            className="flex items-start gap-2 text-[11px] leading-snug"
          >
            <span
              className="shrink-0 mt-[7px] w-1.5 h-1.5 rounded-full bg-thread"
              style={{ boxShadow: "0 0 6px rgba(200,16,46,0.5)" }}
              aria-hidden="true"
            />
            <span>
              <span className="block tracking-[0.18em] uppercase font-semibold text-ink">
                {m.label}
              </span>
              <span className="block text-ink-mute italic">{m.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
