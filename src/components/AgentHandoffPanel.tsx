"use client";

// Red Thread — A2A handoff panel.
//
// Subscribes to /api/agent-handoff via SSE, renders the streamed transcript
// between Threadkeeper (Rosewood) and Atlas (Ms. Chen's agent). On manifest
// receipt, the final overrides are forwarded to the existing agent stream
// so the rest of the dashboard animates in with the freshly-negotiated
// preferences applied.

import { useEffect, useRef, useState } from "react";

import { streamAgent } from "@/components/DemoLoader";
import { useDossier } from "@/lib/dossierStore";

type Role = "threadkeeper" | "atlas";

interface Message {
  role: Role;
  text: string;
}

interface ManifestPayload {
  guestId: string;
  preferences: {
    roomTempC: number;
    bedding: "down" | "down-free" | "memory";
    dietary: string;
    morningRitual: string;
  };
  consent: { scope: string[]; grantedAt: string };
  privacyPosture: "minimal" | "standard" | "full";
  expiresAt: string;
  overrides: {
    roomTempC: number;
    bedding: "down" | "down-free" | "memory";
    morningRitual: string;
    dietary: string;
    privacyPosture: "minimal" | "standard" | "full";
  };
}

interface SSEFrame {
  phase: string;
  type: string;
  payload?: {
    role?: Role;
    text?: string;
    overrides?: ManifestPayload["overrides"];
    [k: string]: unknown;
  } & Partial<ManifestPayload>;
}

interface Props {
  guestId?: string;
  propertyId?: string;
  onClose?: () => void;
}

export function AgentHandoffPanel({
  guestId = "lin-chen",
  propertyId = "hong-kong",
  onClose,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState<Role | null>(null);
  const [manifest, setManifest] = useState<ManifestPayload | null>(null);
  const [phase, setPhase] = useState<"streaming" | "complete" | "agent" | "done" | "error">(
    "streaming",
  );
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const ac = new AbortController();
    runHandoff({
      guestId,
      propertyId,
      signal: ac.signal,
      onTyping: (role) => setTyping(role),
      onMessage: (msg) => {
        setTyping(null);
        setMessages((prev) => [...prev, msg]);
      },
      onManifest: (m) => setManifest(m),
      onComplete: async (overrides) => {
        setPhase("agent");
        // Push the negotiated overrides into the existing agent flow so the
        // rest of the dashboard animates in with the manifest applied.
        const ds = useDossier.getState();
        ds.clear();
        ds.startRun("manual");
        try {
          await streamAgent({ guestId, propertyId, overrides }, ac.signal);
          setPhase("done");
        } catch (err) {
          if ((err as { name?: string })?.name === "AbortError") return;
          const msg = err instanceof Error ? err.message : String(err);
          useDossier.getState().setError(msg);
          setPhase("error");
          setError(msg);
        }
      },
      onError: (msg) => {
        setPhase("error");
        setError(msg);
      },
    });
    return () => ac.abort();
  }, [guestId, propertyId]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing, manifest]);

  return (
    <section className="border hairline bg-paper-soft px-5 py-5 mt-4">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <div className="caps text-thread-deep">Agent handoff · live</div>
          <p className="text-sm text-ink-mute mt-1">
            {phase === "streaming" && "Threadkeeper ↔ Atlas — negotiating consent and preferences."}
            {phase === "agent" && "Manifest sealed. Threading the dossier on the new preferences…"}
            {phase === "done" && "Handoff complete. Dossier rendered from the negotiated manifest."}
            {phase === "error" && (error ?? "Handoff error.")}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="caps text-ink-faint hover:text-thread-deep text-[10px] tracking-[0.18em]"
          >
            Close
          </button>
        )}
      </div>

      <div
        ref={scrollerRef}
        className="space-y-3 max-h-[44vh] overflow-y-auto pr-2"
      >
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {typing && <TypingIndicator role={typing} />}
        {manifest && <ManifestCard manifest={manifest} />}
      </div>
    </section>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isThreadkeeper = message.role === "threadkeeper";
  return (
    <div className={`flex ${isThreadkeeper ? "justify-start" : "justify-end"}`}>
      <article
        className={[
          "max-w-[88%] border hairline p-3",
          isThreadkeeper
            ? "bg-paper border-l-2 border-l-thread-deep"
            : "bg-paper border-r-2 border-r-brass",
        ].join(" ")}
      >
        <div
          className={`caps mb-1.5 ${isThreadkeeper ? "text-thread-deep" : "text-brass"}`}
        >
          {isThreadkeeper ? "Threadkeeper · Rosewood" : "Atlas · Ms. Chen"}
        </div>
        <p className="text-sm text-ink leading-relaxed">{message.text}</p>
      </article>
    </div>
  );
}

function TypingIndicator({ role }: { role: Role }) {
  const isThreadkeeper = role === "threadkeeper";
  return (
    <div className={`flex ${isThreadkeeper ? "justify-start" : "justify-end"}`}>
      <div
        className={[
          "border hairline px-3 py-2",
          isThreadkeeper
            ? "bg-paper border-l-2 border-l-thread-deep"
            : "bg-paper border-r-2 border-r-brass",
        ].join(" ")}
      >
        <div
          className={`caps mb-1 ${isThreadkeeper ? "text-thread-deep" : "text-brass"}`}
        >
          {isThreadkeeper ? "Threadkeeper" : "Atlas"}
        </div>
        <div className="flex items-center gap-1 h-4">
          <Dot delay={0} />
          <Dot delay={150} />
          <Dot delay={300} />
        </div>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full bg-ink-faint"
      style={{
        animation: `redthread-typing 0.9s ${delay}ms infinite ease-in-out`,
      }}
    />
  );
}

function ManifestCard({ manifest }: { manifest: ManifestPayload }) {
  const grantedAt = new Date(manifest.consent.grantedAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="border hairline bg-paper px-4 py-3 mt-2">
      <div className="caps text-thread-deep mb-2">Manifest · sealed</div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-ink-mute">
        <dt className="caps text-ink-faint">guest</dt>
        <dd>{manifest.guestId}</dd>
        <dt className="caps text-ink-faint">room</dt>
        <dd>
          {manifest.preferences.roomTempC}°C · {manifest.preferences.bedding}
        </dd>
        <dt className="caps text-ink-faint">dietary</dt>
        <dd>{manifest.preferences.dietary}</dd>
        <dt className="caps text-ink-faint">ritual</dt>
        <dd>{manifest.preferences.morningRitual}</dd>
        <dt className="caps text-ink-faint">privacy</dt>
        <dd>{manifest.privacyPosture}</dd>
        <dt className="caps text-ink-faint">consent</dt>
        <dd>
          {manifest.consent.scope.join(" · ")} · granted {grantedAt}
        </dd>
      </dl>
      <style>{`
        @keyframes redthread-typing {
          0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-2px); }
        }
      `}</style>
    </div>
  );
}

interface RunHandoffOpts {
  guestId: string;
  propertyId: string;
  signal: AbortSignal;
  onTyping: (role: Role) => void;
  onMessage: (m: Message) => void;
  onManifest: (m: ManifestPayload) => void;
  onComplete: (overrides: ManifestPayload["overrides"]) => Promise<void>;
  onError: (msg: string) => void;
}

async function runHandoff(opts: RunHandoffOpts) {
  try {
    const res = await fetch("/api/agent-handoff", {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ guestId: opts.guestId, propertyId: opts.propertyId }),
      signal: opts.signal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`/api/agent-handoff ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const chunk = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const line = chunk.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;
        try {
          const frame = JSON.parse(line.slice(6)) as SSEFrame;
          if (frame.type === "typing" && frame.payload?.role) {
            opts.onTyping(frame.payload.role);
          } else if (frame.type === "message" && frame.payload?.role && frame.payload.text) {
            opts.onMessage({ role: frame.payload.role, text: frame.payload.text });
          } else if (frame.type === "manifest" && frame.payload) {
            opts.onManifest(frame.payload as ManifestPayload);
          } else if (frame.type === "complete" && frame.payload?.overrides) {
            await opts.onComplete(frame.payload.overrides);
          }
        } catch {
          // skip malformed
        }
      }
    }
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") return;
    const msg = err instanceof Error ? err.message : String(err);
    opts.onError(msg);
  }
}
