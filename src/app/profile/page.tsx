"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { CapabilityMatrix } from "@/components/CapabilityMatrix";
import { useDemoLock } from "@/components/DemoLock";
import { streamAgent } from "@/components/DemoLoader";
import {
  BAND_LABEL,
  BAND_BENEFIT,
  bandFor,
  posToUi,
  uiToPos,
} from "@/components/DiscretionDial";
import { ThreadHashScale } from "@/components/ThreadHashScale";
import { useDossier } from "@/lib/dossierStore";

// Guest-facing benefit framing — what YOU GET at each level, in positive
// terms. The dial isn't about giving up privacy; it's about tuning the
// experience you receive.
const GUEST_GUIDANCE: Record<"minimal" | "standard" | "full", string> = {
  minimal:
    "A fresh-eye welcome. We treat each arrival as if we're meeting you for the first time — nothing assumed, nothing volunteered. The room is set to your saved preferences; the rest is yours to direct.",
  standard:
    "Familiar without intrusion. The butler remembers Henry's at Hong Kong, the pescatarian dinner is held at a quiet table, and the welcome amenity is sourced to a place you've loved before. Private context stays private.",
  full: "A fully bespoke experience. Every detail anticipated; every offer surfaced with provenance. Your Hong Kong butler knows about your Bangkok trip. Your favorite Placemaker is on standby. Weekly check-ins for what's next. This is the thread at its full reach — and you can drop it back down at any time.",
};

/**
 * Guest-side profile — canonical surface for the Hold the Thread dial. The
 * concierge dashboard's DashboardDial mirrors this read-only via the shared
 * zustand store: when the guest hits Save here, setActiveGuestPos writes to
 * the store and the dashboard updates LIVE without a page reload.
 *
 * Which guest is shown is driven by activeGuestId in the store, set by the
 * ReservationIntake preset on the dashboard. Default: Ben.
 */

const GUESTS = {
  ben: {
    id: "ben",
    honorific: "Mr.",
    name: "Benjamin Shyong",
    role: "Founder & CEO, OpenClaw / Injester",
    dietary: ["vegetarian"],
    defaultPos: 55,
  },
  "lin-chen": {
    id: "lin-chen",
    honorific: "Ms.",
    name: "Lin Chen",
    role: "Founder & CEO, Lattice Capital",
    dietary: ["pescatarian"],
    defaultPos: 62,
  },
} as const;

export default function ProfilePage() {
  // The active guest comes from the store — set by the dashboard's
  // ReservationIntake preset toggle. Default Ben on a cold visit.
  const activeGuestId = useDossier((s) => s.activeGuestId);
  const activeGuestPos = useDossier((s) => s.activeGuestPos);
  const setActiveGuestPos = useDossier((s) => s.setActiveGuestPos);
  const GUEST = GUESTS[activeGuestId];

  const [savedUi, setSavedUi] = useState(() => posToUi(activeGuestPos));
  const [value, setValue] = useState(() => posToUi(activeGuestPos));
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const { requireUnlock } = useDemoLock();

  // Sync local state if the active guest changes while /profile is open
  // (e.g. via a multi-tab demo or another route writing the store).
  useEffect(() => {
    const ui = posToUi(activeGuestPos);
    setSavedUi(ui);
    setValue(ui);
  }, [activeGuestId, activeGuestPos]);

  // Clear the "saved" pill once the user starts editing again
  useEffect(() => {
    if (status === "saved" && value !== savedUi) setStatus("idle");
  }, [value, savedUi, status]);

  const pos = uiToPos(value);
  const band = bandFor(pos);
  const isDirty = value !== savedUi;

  function save() {
    // Saving fires a re-stream of /api/agent at the new POS, so the modal
    // gates this too. Local POS edits don't actually update zones until
    // the agent re-runs.
    requireUnlock(runSave);
  }

  async function runSave() {
    setStatus("saving");
    const snapshot = value;
    const newPos = uiToPos(snapshot);
    try {
      // 1. Write the new saved POS to the shared store. The dashboard's
      //    DashboardDial subscribes via zustand and re-renders the moment
      //    this lands — no page reload needed.
      setActiveGuestPos(newPos);
      setSavedUi(snapshot);

      // 2. If the briefing has already been run on the dashboard, re-stream
      //    /api/agent at the new POS so the zones 1/2/3 actually repaint at
      //    the new band. Fire-and-forget — when the guest navigates back to
      //    the dashboard, the new dossier is already loaded (or streaming).
      //    Without this, the dial moves but the cards stay stuck on the
      //    previous band's content.
      const store = useDossier.getState();
      const propertyId = store.activeProperty;
      const briefingHasRun = !!store.dossier || !!store.arrivalReservation;
      if (briefingHasRun) {
        store.startRun("manual");
        // No live:true — the fixture path with per-tick band reduction is
        // what makes the dial repaint instantly. live:true would force the
        // slow Claude pipeline.
        streamAgent({
          guestId: GUEST.id,
          propertyId,
          previewPos: newPos,
        }).catch(() => {
          // network failure doesn't roll back the user's intent
        });
      }

      setStatus("saved");
    } catch {
      setStatus("idle");
    }
  }

  return (
    <main className="min-h-screen bg-paper-canvas text-ink">
      <header className="border-b border-rule bg-paper-canvas">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between gap-6">
          <Link
            href="/"
            className="lockup group flex items-center gap-3 text-ink no-underline transition-opacity hover:opacity-85"
            aria-label="Red Thread — concierge dashboard"
          >
            <Image
              src="/logo.png"
              alt=""
              width={36}
              height={36}
              priority
              className="lockup-mark"
              aria-hidden="true"
            />
            <span className="flex flex-col leading-none">
              <span
                className="font-display text-[1.35rem] leading-none"
                style={{ letterSpacing: "0.02em" }}
              >
                Red Thread
              </span>
              <span
                className="mt-1 text-[0.88rem] text-brass"
                style={{
                  fontFamily: "var(--font-noto-serif-sc), var(--font-cormorant), serif",
                  fontWeight: 500,
                  letterSpacing: "0.18em",
                }}
              >
                紅線
              </span>
            </span>
          </Link>
          <span
            className="text-[11px] tracking-[0.22em] uppercase text-ink-faint hidden sm:inline"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            Your profile
          </span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 pt-12 pb-24">
        <p className="text-[10px] tracking-[0.22em] uppercase text-ink-faint">
          Welcome back
        </p>
        <h1
          className="mt-3 text-[44px] leading-[1.1] text-ink"
          style={{ fontFamily: "var(--font-cormorant), serif" }}
        >
          {GUEST.honorific} {GUEST.name}
        </h1>
        <p className="mt-2 text-[14px] text-ink-mute">
          {GUEST.role}
        </p>

        <p
          className="mt-10 text-[16px] leading-relaxed text-ink-mute italic max-w-xl"
          style={{ fontFamily: "var(--font-cormorant), serif" }}
        >
          One thread connects you to the property, the property to the place,
          and the place to the next stay. You decide how tightly we hold it.
        </p>

        {/* Voice intake CTA — five-minute briefing in their voice */}
        <section
          aria-label="Pre-arrival voice briefing"
          className="mt-10 bg-paper border border-rule p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
        >
          <div>
            <p className="text-[10px] tracking-[0.22em] uppercase text-thread-deep">
              Pre-arrival briefing
            </p>
            <h2
              className="mt-2 text-[22px] leading-tight text-ink"
              style={{ fontFamily: "var(--font-cormorant), serif" }}
            >
              Three quick questions, in your voice.
            </h2>
            <p className="mt-2 text-[14px] text-ink-mute max-w-md leading-relaxed">
              Room, food, and how publicly we may draw on what&rsquo;s known
              about you. Under a minute.
            </p>
          </div>
          <Link
            href="/intake"
            className="shrink-0 inline-flex items-center gap-2 bg-rose-deep text-paper hover:bg-rose-darker px-6 py-3 text-[12px] tracking-[0.22em] uppercase font-medium transition-colors"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            Begin briefing
            <span aria-hidden="true">→</span>
          </Link>
        </section>

        <div className="mt-10 space-y-6">
          {/* Hold the Thread — same hash-mark dial as the concierge dashboard,
              but interactive here. The guest is the only one who can change
              this; Save writes to the shared store so the dashboard updates
              live. */}
          <section
            aria-label="Hold the Thread — your privacy openness"
            className="bg-paper border hairline px-5 py-5"
          >
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <div className="caps flex items-center gap-2">
                <span className="inline-block w-4 h-px bg-thread" />
                Hold the Thread · {value} of 10
                <span className="text-ink-faint normal-case tracking-normal italic ml-2 text-[11px]">
                  {isDirty
                    ? `— saved: ${savedUi} of 10 · unsaved change`
                    : "— your saved preference"}
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span
                  className={`text-[10px] tracking-[0.22em] uppercase font-medium ${
                    band === "minimal"
                      ? "text-ink-faint"
                      : band === "standard"
                        ? "text-thread-deep"
                        : "text-thread"
                  }`}
                >
                  {BAND_LABEL[band]}
                </span>
                <span className="text-[12px] italic text-ink-mute">
                  {BAND_BENEFIT[band]}
                </span>
              </div>
            </div>

            <ThreadHashScale
              value={value}
              onChange={setValue}
              ariaLabel="Hold the Thread — drag to set your privacy openness"
              ariaValueText={`${value} of 10 — ${BAND_LABEL[band]}`}
            />

            <div className="mt-6 flex justify-between text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              <span>Loosely</span>
              <span aria-hidden="true">·</span>
              <span>Fully</span>
            </div>

            <p className="mt-5 text-[13px] leading-relaxed text-ink">
              <span
                className={`font-medium ${
                  band === "minimal"
                    ? "text-ink-faint"
                    : band === "standard"
                      ? "text-thread-deep"
                      : "text-thread"
                }`}
              >
                At {BAND_LABEL[band]}:
              </span>{" "}
              {GUEST_GUIDANCE[band]}
            </p>
          </section>

          <div className="flex items-center justify-between gap-4">
            <p className="text-[12px] text-ink-faint">
              Saving sends your next dossier through the Discretion
              Layer at this level. The concierge dashboard updates live —
              no email, no notification, no delay.
              <br />
              Adjustable any time. Every removed signal is logged for your
              review.
            </p>

            <div className="flex items-center gap-3 shrink-0">
              {isDirty ? (
                <button
                  type="button"
                  onClick={() => setValue(savedUi)}
                  className="text-[12px] tracking-[0.12em] uppercase text-ink-faint hover:text-ink-mute"
                  style={{ fontFamily: "var(--font-inter), sans-serif" }}
                >
                  Reset
                </button>
              ) : null}
              <button
                type="button"
                disabled={!isDirty || status === "saving"}
                onClick={save}
                className={
                  "text-[12px] tracking-[0.16em] uppercase font-medium px-5 py-2.5 transition-colors " +
                  (!isDirty || status === "saving"
                    ? "bg-paper-soft text-ink-faint border border-rule cursor-not-allowed"
                    : "bg-rose-deep text-paper hover:bg-rose-darker")
                }
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                {status === "saving"
                  ? "Threading…"
                  : status === "saved"
                    ? "Saved"
                    : "Save change"}
              </button>
            </div>
          </div>

          <CapabilityMatrix value={value} />
        </div>

        <footer className="mt-16 pt-6 border-t border-rule text-[11px] text-ink-faint flex justify-between">
          <span>
            Hold the Thread is currently {band} — {value} of 10
          </span>
          <Link
            href="/"
            className="hover:text-thread transition-colors"
          >
            Return to Red Thread →
          </Link>
        </footer>
      </div>
    </main>
  );
}
