"use client";

import Image from "next/image";
import { useRef } from "react";

import { streamAgent } from "@/components/DemoLoader";
import { useDossier } from "@/lib/dossierStore";
import type { PropertyId } from "@/lib/types";

const GUEST_ID = "ben";

const PROPERTIES: { id: PropertyId; name: string; locale: string }[] = [
  { id: "sand-hill", name: "Rosewood Sand Hill", locale: "Menlo Park" },
  { id: "hong-kong", name: "Rosewood Hong Kong", locale: "Victoria Dockside" },
];

export function Header() {
  const active = useDossier((s) => s.activeProperty);
  const phase = useDossier((s) => s.phase);
  const dossier = useDossier((s) => s.dossier);
  const setActiveProperty = useDossier((s) => s.setActiveProperty);
  const aborterRef = useRef<AbortController | null>(null);

  const running =
    phase === "verify" ||
    phase === "research" ||
    phase === "synthesize" ||
    phase === "discretion";

  const onSwitch = async (next: PropertyId) => {
    if (next === active) return;
    setActiveProperty(next);
    // Only re-run if something is already rendered/streaming. First visit
    // leaves the eyebrow + zones in static mode until "Run agent" is clicked.
    const hasDossier = !!dossier;
    if (!hasDossier && !running) return;

    aborterRef.current?.abort();
    const store = useDossier.getState();
    store.clear();
    store.setActiveProperty(next); // clear() resets activeProperty; re-set
    store.startRun("manual");
    const ac = new AbortController();
    aborterRef.current = ac;
    try {
      await streamAgent({ guestId: GUEST_ID, propertyId: next }, ac.signal);
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : String(err);
      useDossier.getState().setError(msg);
    } finally {
      if (aborterRef.current === ac) aborterRef.current = null;
    }
  };

  return (
    <header className="mx-auto w-full max-w-[1480px] px-8 pt-6 pb-3 flex items-center justify-between gap-6">
      <a
        href="https://redthread.boutique"
        className="lockup group flex items-center gap-3 text-ink no-underline transition-opacity hover:opacity-85"
        aria-label="Red Thread — home"
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
        <span className="lockup-text flex flex-col leading-none">
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
      </a>
      <nav aria-label="Property switcher" className="flex items-center gap-1 text-xs">
        <span className="caps mr-3 hidden sm:inline">Property</span>
        <ul className="flex items-center gap-1 border hairline rounded-sm overflow-hidden">
          {PROPERTIES.map((p) => {
            const on = active === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSwitch(p.id)}
                  aria-pressed={on}
                  disabled={running}
                  className={[
                    "px-3 py-2 text-[11px] tracking-[0.18em] uppercase transition-colors disabled:opacity-60 disabled:cursor-wait",
                    on
                      ? "bg-rose-deep text-on-dark"
                      : "text-ink-mute hover:text-ink hover:bg-paper-soft",
                  ].join(" ")}
                >
                  {p.name.replace("Rosewood ", "").replace("Hôtel de ", "")}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="caps hidden md:block">Est. 2026</div>
    </header>
  );
}
