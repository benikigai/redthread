"use client";

// Weekly Agent-to-Agent Dialog — at POS 9–10 (Fully bespoke) the guest's
// personal agent and Red Thread hold a weekly check-in over the A2A
// protocol declared at /.well-known/agent.json. This panel renders the
// LAST conversation transcript + the next scheduled call, so concierge
// (and judges) can see the dialog the offers came out of.

import { useDossier } from "@/lib/dossierStore";
import { posToUi } from "./DiscretionDial";

type Speaker = "red-thread" | "guest-agent";

interface Turn {
  speaker: Speaker;
  text: string;
}

// Pre-scripted demo transcript — last Tuesday's A2A check-in. Naming the
// guest agent "Atlas" because consumer personal agents have to ship under
// a name; the protocol payload itself is in /.well-known/agent.json.
const LAST_CALL: { when: string; turns: Turn[]; offersOut: number } = {
  when: "Tuesday · 10:02 PT",
  turns: [
    {
      speaker: "red-thread",
      text: "Hello Atlas. Anything new in the next 90 days where we might be useful?",
    },
    {
      speaker: "guest-agent",
      text: "Bangkok, Dec 12 – 15. Asia FinTech Summit panel. Hotel TBD.",
    },
    {
      speaker: "red-thread",
      text:
        "Rosewood Bangkok has those dates open. Courtesy 10% on a quiet two-night suite. We're also hosting a Threadwork exhibit opening the night he arrives — twelve seats, I can hold one.",
    },
    {
      speaker: "guest-agent",
      text: "Forward both. He'll appreciate the dinner.",
    },
    {
      speaker: "red-thread",
      text: "Done. Logged in his dossier with provenance — no marketing email, just a note from his Hong Kong butler.",
    },
  ],
  offersOut: 3,
};

const NEXT_CALL = "Tuesday · 10:00 PT";

export function WeeklyAgentDialog() {
  const savedPos = useDossier((s) => s.activeGuestPos);
  const savedUi = posToUi(savedPos);

  // Only visible at POS 9-10, same gate as ContinuityOffers. Below 9 the
  // guest's agent has not authorized us to reach out.
  if (savedUi < 9) return null;

  return (
    <section
      aria-label="Weekly agent-to-agent check-in"
      className="mt-6 border hairline bg-paper-soft px-5 py-4"
    >
      <header className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-px bg-thread" />
          <span className="text-[11px] tracking-[0.22em] uppercase font-medium text-thread-deep">
            A2A · Weekly check-in
          </span>
          <span className="text-[11px] text-ink-faint italic normal-case tracking-normal">
            — Red Thread ↔ Atlas (guest&rsquo;s agent)
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em]">
          <span className="text-ink-faint">Next call</span>
          <span className="text-ink font-medium">{NEXT_CALL}</span>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left: transcript of last call */}
        <div className="col-span-12 lg:col-span-8">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-faint mb-2">
            Last call · {LAST_CALL.when}
          </div>
          <ol className="space-y-2">
            {LAST_CALL.turns.map((t, i) => (
              <li
                key={i}
                className={[
                  "border-l-2 px-3 py-2 bg-paper",
                  t.speaker === "red-thread"
                    ? "border-thread"
                    : "border-brass",
                ].join(" ")}
              >
                <div
                  className={[
                    "text-[10px] tracking-[0.22em] uppercase font-medium mb-1",
                    t.speaker === "red-thread" ? "text-thread-deep" : "text-brass",
                  ].join(" ")}
                >
                  {t.speaker === "red-thread" ? "Red Thread" : "Atlas"}
                </div>
                <p className="text-[13px] text-ink leading-snug">{t.text}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Right: what it produced + protocol note */}
        <div className="col-span-12 lg:col-span-4">
          <div className="border hairline bg-paper p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-thread-deep font-medium mb-2">
              What came out
            </div>
            <p className="text-[13px] text-ink leading-snug">
              <span className="font-display text-[18px] text-thread-deep">
                {LAST_CALL.offersOut}
              </span>{" "}
              offers surfaced — see Continuity Offers below.
            </p>
            <p className="mt-3 text-[11px] text-ink-faint leading-relaxed italic">
              Protocol: <span className="font-mono not-italic text-ink-mute">/.well-known/agent.json</span>.
              Consent-bound, schema-governed, guest-overridable. Stop these
              calls anytime by dropping the dial below 9.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
