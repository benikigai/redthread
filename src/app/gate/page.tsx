"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

/**
 * Gate page. Visitors land here when they don't yet have the rt_gate cookie.
 * On submit, POST /api/gate sets the cookie, then we navigate to ?next=...
 * (defaults to /).
 *
 * Editorial register matches the rest of the site — cream paper, brass
 * accents, Cormorant for the wordmark, single small form on the page.
 */

export default function GatePage() {
  return (
    <Suspense fallback={null}>
      <GateForm />
    </Suspense>
  );
}

function GateForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Incorrect password");
        setSubmitting(false);
        return;
      }
      // Hard navigation so the middleware sees the new cookie on next req.
      window.location.assign(next);
    } catch {
      setError("Network error — try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper-canvas text-ink flex flex-col">
      <header className="border-b border-rule bg-paper-canvas">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between gap-6">
          <Link
            href="https://redthread.boutique"
            className="lockup group flex items-center gap-3 text-ink no-underline transition-opacity hover:opacity-85"
            aria-label="Red Thread"
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
            Demo access
          </span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <section
          aria-label="Demo password"
          className="w-full max-w-md bg-paper border border-rule px-7 py-8"
        >
          <p className="text-[10px] tracking-[0.22em] uppercase text-thread-deep">
            Held by invitation
          </p>
          <h1
            className="mt-3 text-[36px] leading-[1.05] text-ink"
            style={{ fontFamily: "var(--font-cormorant), serif" }}
          >
            The thread is held.
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-mute italic max-w-prose">
            This is a live demo console. Enter the demo password to continue.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <label className="block">
              <span className="text-[10px] tracking-[0.22em] uppercase text-ink-faint">
                Demo password
              </span>
              <input
                type="password"
                autoComplete="off"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full bg-paper-soft border border-rule px-3 py-2.5 text-[15px] text-ink focus:outline-none focus:border-thread-deep transition-colors"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              />
            </label>

            {error ? (
              <p className="text-[12px] text-thread italic" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting || password.length === 0}
              className={
                "w-full text-[12px] tracking-[0.22em] uppercase font-medium px-5 py-3 transition-colors " +
                (submitting || password.length === 0
                  ? "bg-paper-soft text-ink-faint border border-rule cursor-not-allowed"
                  : "bg-rose-deep text-paper hover:bg-rose-darker")
              }
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              {submitting ? "Holding…" : "Enter the dossier"}
            </button>
          </form>

          <p className="mt-6 text-[11px] leading-relaxed text-ink-faint">
            Red Thread for Hospitality 2030. Password is shared verbally with
            invited judges and partners. Session lasts 12 hours.
          </p>
        </section>
      </div>

      <footer className="border-t border-rule px-6 py-5">
        <div className="max-w-3xl mx-auto text-[11px] text-ink-faint flex flex-wrap justify-between gap-2">
          <span>Red Thread · the line you can audit</span>
          <a
            href="https://cerebralvalley.ai/e/rosewood-hospitality-2030/details"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-thread transition-colors border-b border-current"
          >
            Hospitality 2030
          </a>
        </div>
      </footer>
    </main>
  );
}
