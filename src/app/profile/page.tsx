"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { CapabilityMatrix } from "@/components/CapabilityMatrix";
import {
  DiscretionDial,
  bandFor,
  posToUi,
  uiToPos,
} from "@/components/DiscretionDial";
import { useDossier } from "@/lib/dossierStore";

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

  async function save() {
    setStatus("saving");
    const snapshot = value;
    const newPos = uiToPos(snapshot);
    try {
      // 1. Push the new saved value to the shared store FIRST. The dashboard's
      //    DashboardDial subscribes via zustand and will re-render live the
      //    moment this lands — no page reload needed, no manual notification.
      setActiveGuestPos(newPos);
      setSavedUi(snapshot);

      // 2. Round-trip through /api/agent (preview) so the demo can immediately
      //    show what the dossier looks like at the new level. Best-effort —
      //    we don't undo the saved value if the preview fetch fails.
      await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId: GUEST.id,
          propertyId: "sand-hill",
          previewPos: newPos,
        }),
      }).catch(() => {
        // network failure doesn't roll back the user's intent
      });

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
                className="mt-1 text-[0.72rem] text-brass"
                style={{
                  fontFamily: "var(--font-noto-serif-sc), var(--font-cormorant), serif",
                  fontWeight: 400,
                  letterSpacing: "0.15em",
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
              Five quick questions, in your voice.
            </h2>
            <p className="mt-2 text-[14px] text-ink-mute max-w-md leading-relaxed">
              Room, bedding, morning rhythm, food, and how publicly we may draw
              on what&rsquo;s known about you. About a minute.
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
          <DiscretionDial
            value={value}
            onChange={setValue}
            caption={
              isDirty
                ? `your saved preference: ${savedUi} of 10 — unsaved change`
                : `your saved preference: ${savedUi} of 10`
            }
          />

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
