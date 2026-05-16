import type { ReactNode } from "react";

type Tone = "light" | "dark";

export function ZoneShell({
  label,
  title,
  hint,
  children,
  tone = "light",
}: {
  label: string;
  title: string;
  hint?: string;
  children: ReactNode;
  tone?: Tone;
}) {
  const isDark = tone === "dark";
  const containerCls = isDark
    ? "border border-white/15 bg-transparent p-6 h-full"
    : "border hairline bg-paper p-6 h-full";
  const headerCls = isDark ? "mb-5 pb-4 border-b border-white/15" : "mb-5 pb-4 border-b hairline";
  const labelCls = isDark
    ? "caps text-brass"
    : "caps";
  const titleCls = isDark
    ? "font-display text-2xl mt-1 leading-none text-paper"
    : "font-display text-2xl mt-1 leading-none";
  const hintCls = isDark
    ? "font-display italic text-paper/65 text-sm mt-2 leading-snug"
    : "font-display italic text-ink-faint text-sm mt-2 leading-snug";

  return (
    <div className={containerCls}>
      <header className={headerCls}>
        <div className={labelCls}>{label}</div>
        <h2 className={titleCls}>{title}</h2>
        {hint ? <p className={hintCls}>{hint}</p> : null}
      </header>
      {children}
    </div>
  );
}
