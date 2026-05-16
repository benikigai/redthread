"use client";

import { useState } from "react";
import type { PropertyId } from "@/lib/types";

const PROPERTIES: { id: PropertyId; name: string; locale: string }[] = [
  { id: "sand-hill", name: "Rosewood Sand Hill", locale: "Menlo Park" },
  { id: "hong-kong", name: "Rosewood Hong Kong", locale: "Victoria Dockside" },
  { id: "crillon", name: "Hôtel de Crillon", locale: "Paris" },
];

export function Header() {
  const [active, setActive] = useState<PropertyId>("sand-hill");
  return (
    <header className="mx-auto w-full max-w-[1480px] px-8 pt-8 pb-2 flex items-center justify-between gap-6">
      <div className="flex items-center gap-3 font-display text-xl tracking-wide">
        <span className="mark-thread" aria-hidden="true" />
        Red Thread
      </div>
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
      <div className="caps hidden md:block">紅線 · Est. 2026</div>
    </header>
  );
}
