import type { ReactNode } from "react";

export function ZoneShell({
  label,
  title,
  hint,
  children,
}: {
  label: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="border hairline bg-paper p-6 h-full">
      <header className="mb-5 pb-4 border-b hairline">
        <div className="caps">{label}</div>
        <h2 className="font-display text-2xl mt-1 leading-none">{title}</h2>
        {hint ? (
          <p className="font-display italic text-ink-faint text-sm mt-2 leading-snug">{hint}</p>
        ) : null}
      </header>
      {children}
    </div>
  );
}
