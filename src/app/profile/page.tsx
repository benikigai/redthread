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

/**
 * Ms. Lin Chen's guest profile — the canonical guest-side surface where the
 * Hold the Thread preference lives. The concierge dashboard mirrors this
 * setting read-only; only this page can save a change.
 *
 * For the hackathon: "Save" updates local state and POSTs a preview to
 * /api/agent so the change is round-tripped and visible. A real product
 * would persist to the guest record (PUT /api/guest/lin-chen).
 */

// Hard-coded for the demo. Real product would fetch /api/guest/lin-chen.
const GUEST = {
  id: "lin-chen",
  honorific: "Ms.",
  name: "Lin Chen",
  privacyOpennessScore: 62, // matches data/guests/lin-chen.json
  role: "Founder & CEO, Lattice Capital",
  dietary: ["pescatarian"],
};

export default function ProfilePage() {
  const initialUi = posToUi(GUEST.privacyOpennessScore);
  const [savedUi, setSavedUi] = useState(initialUi);
  const [value, setValue] = useState(initialUi);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

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
    try {
      // Round-trip through /api/agent so the demo can immediately show what
      // the dossier looks like at the new POS. In DEMO_MODE this is the
      // band-reduced fixture; live, it re-invokes the Discretion Layer.
      await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId: GUEST.id,
          propertyId: "sand-hill",
          previewPos: pos,
        }),
      });
      setSavedUi(snapshot);
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

        {/* Voice intake CTA — five-minute briefing she gives us by voice */}
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
            className="shrink-0 inline-flex items-center gap-2 bg-rose-deep text-on-dark px-6 py-3 text-[12px] tracking-[0.22em] uppercase hover:bg-rose-darker transition-colors"
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
              Saving sends Ms. Chen&rsquo;s next dossier through the Discretion
              Layer at this level.
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
                  "text-[12px] tracking-[0.16em] uppercase px-5 py-2.5 transition-colors " +
                  (!isDirty || status === "saving"
                    ? "bg-paper-soft text-ink-faint border border-rule cursor-not-allowed"
                    : "bg-thread text-on-dark border border-thread hover:bg-thread-deep hover:border-thread-deep")
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
