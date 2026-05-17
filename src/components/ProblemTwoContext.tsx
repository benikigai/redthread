"use client";

// Maps Hold the Thread + Discretion Layer to Hackathon Problem #2:
// ambient intelligence without surveillance. The guest draws the line;
// the Discretion Layer audits every signal before staff see it.

const MECHANISMS = [
  { label: "Guest draws the line", detail: "Their dial, not ours" },
  { label: "Discretion Layer", detail: "Haiku 4.5 audits every signal" },
  { label: "Auditable removals", detail: "Logged; guest can contest" },
  { label: "Decline once", detail: "The offer never returns" },
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
      </div>

      <p className="text-[13px] text-ink leading-relaxed max-w-prose">
        <em className="not-italic font-medium text-thread-deep">
          &ldquo;They just knew&rdquo;
        </em>{" "}
        vs.{" "}
        <em className="not-italic font-medium text-thread-deep">
          &ldquo;that&rsquo;s creepy&rdquo;
        </em>{" "}
        — the line is different for every guest. So the guest draws it. Every
        signal then clears a second, auditable layer before staff see it.
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
