"use client";

import Image from "next/image";
import { useState } from "react";
import type { PropertyId } from "@/lib/types";

const PROPERTIES: { id: PropertyId; name: string; locale: string }[] = [
  { id: "sand-hill", name: "Rosewood Sand Hill", locale: "Menlo Park" },
  { id: "hong-kong", name: "Rosewood Hong Kong", locale: "Victoria Dockside" },
];

export function Header() {
  const [active, setActive] = useState<PropertyId>("sand-hill");
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
                  onClick={() => setActive(p.id)}
                  aria-pressed={on}
                  className={[
                    "px-3 py-2 text-[11px] tracking-[0.18em] uppercase transition-colors",
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
