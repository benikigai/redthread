"use client";

// Red Thread — demo lock provider + modal.
//
// Pages render freely so LinkedIn visitors see the primed fixture dossier.
// Any expensive interaction (Begin briefing, Agent handoff, Brief Me, voice
// intake, /profile Save) routes through `useDemoLock().requireUnlock(fn)`:
//   - If unlocked (rt_unlocked cookie present), `fn` runs immediately.
//   - If locked, the modal opens with the queued action. On successful
//     password submit, the cookie is set, the modal closes, and `fn` runs.
//
// The middleware also enforces this at the network layer — even if a client
// somehow bypasses requireUnlock, /api/* returns 401 without the cookie.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface DemoLockApi {
  isUnlocked: boolean;
  /** Run `action` if unlocked, otherwise open the modal and queue it. */
  requireUnlock: (action: () => void | Promise<void>) => void;
  /** Open the modal manually (e.g. for a header "Unlock demo" button). */
  open: () => void;
}

const DemoLockContext = createContext<DemoLockApi | null>(null);

function readUnlockCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith("rt_unlocked="));
}

export function DemoLockProvider({ children }: { children: ReactNode }) {
  // Default to UNLOCKED on the server to avoid hydration-mismatch flicker;
  // the effect below corrects the client value on mount. This is purely a
  // UI hint — auth is still enforced by middleware on the network.
  const [isUnlocked, setUnlocked] = useState(true);
  const [pending, setPending] = useState<null | (() => void | Promise<void>)>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setUnlocked(readUnlockCookie());
  }, []);

  const requireUnlock = useCallback(
    (action: () => void | Promise<void>) => {
      if (readUnlockCookie()) {
        action();
        return;
      }
      setPending(() => action);
      setOpen(true);
    },
    [],
  );

  const onUnlocked = useCallback(() => {
    setUnlocked(true);
    setOpen(false);
    if (pending) {
      const fn = pending;
      setPending(null);
      // Run on next tick so the modal can close cleanly before the action
      // fires (helps with re-focus and any layout shift).
      setTimeout(fn, 0);
    }
  }, [pending]);

  const onCancel = useCallback(() => {
    setOpen(false);
    setPending(null);
  }, []);

  return (
    <DemoLockContext.Provider
      value={{ isUnlocked, requireUnlock, open: () => setOpen(true) }}
    >
      {children}
      {open ? <DemoLockModal onUnlocked={onUnlocked} onCancel={onCancel} /> : null}
    </DemoLockContext.Provider>
  );
}

export function useDemoLock(): DemoLockApi {
  const ctx = useContext(DemoLockContext);
  if (!ctx) {
    // Outside provider — fail open so missing wrapper doesn't break the
    // page. Network middleware still enforces.
    return {
      isUnlocked: true,
      requireUnlock: (action) => action(),
      open: () => {},
    };
  }
  return ctx;
}

function DemoLockModal({
  onUnlocked,
  onCancel,
}: {
  onUnlocked: () => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
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
      onUnlocked();
    } catch {
      setError("Network error — try again.");
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Unlock the live demo"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(15, 15, 15, 0.55)", backdropFilter: "blur(2px)" }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <section
        className="w-full max-w-md bg-paper border border-rule px-6 py-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] tracking-[0.22em] uppercase text-thread-deep">
          Held by invitation
        </p>
        <h2
          className="mt-2 text-[28px] leading-[1.1] text-ink"
          style={{ fontFamily: "var(--font-cormorant), serif" }}
        >
          Unlock the live demo.
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-mute italic">
          You can browse the dossier freely. To run live tools (briefing, A2A
          handoff, voice intake) the demo asks for a short password.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
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

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="text-[11px] tracking-[0.22em] uppercase text-ink-faint hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || password.length === 0}
              className={
                "text-[12px] tracking-[0.22em] uppercase font-medium px-5 py-2.5 transition-colors " +
                (submitting || password.length === 0
                  ? "bg-paper-soft text-ink-faint border border-rule cursor-not-allowed"
                  : "bg-rose-deep text-paper hover:bg-rose-darker")
              }
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              {submitting ? "Holding…" : "Enter"}
            </button>
          </div>
        </form>

        <p className="mt-5 text-[11px] leading-relaxed text-ink-faint">
          Don&rsquo;t have one?{" "}
          <a
            href="https://www.linkedin.com/in/benjaminshyong/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink underline hover:text-thread-deep transition-colors"
          >
            DM Ben on LinkedIn →
          </a>
        </p>
      </section>
    </div>
  );
}
