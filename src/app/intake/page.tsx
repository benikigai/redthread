"use client";

// Red Thread — Pre-Arrival Intake
// Browser-side Convai widget. Voice in, voice out, mic captured by the
// SDK. When the conversation ends, the client hands the conversationId
// to our /api/voice/intake/complete route, which pulls the extraction
// from ElevenLabs and returns the normalized overrides. We stash the
// overrides in sessionStorage and bounce the user to the dashboard with
// `?fromIntake=1`, where the existing dashboard code picks them up and
// re-runs the agent with the new prefs landing on the dossier.

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConversationProvider, useConversation } from "@elevenlabs/react";

const AGENT_ID =
  process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_INTAKE ??
  "agent_5001krs8b43gfjstkz92k6fx9e3n";

type Stage = "idle" | "connecting" | "talking" | "threading" | "done" | "error";

function IntakeInner() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [convId, setConvId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latestLine, setLatestLine] = useState<string>("");

  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      setConvId(conversationId);
      setStage("talking");
    },
    onDisconnect: () => {
      // We trigger the extraction in a separate effect that watches `convId`,
      // so this just nudges the stage. The convId may not be in state yet
      // depending on event ordering — the effect handles both orderings.
      setStage((prev) => (prev === "talking" ? "threading" : prev));
    },
    onMessage: ({ message, source }) => {
      if (source === "ai" && typeof message === "string") {
        setLatestLine(message);
      }
    },
    onError: (msg) => {
      setError(typeof msg === "string" ? msg : "Conversation error");
      setStage("error");
    },
  });

  // After disconnect, fetch the extraction once we have a convId.
  useEffect(() => {
    if (stage !== "threading" || !convId) return;
    let cancelled = false;
    (async () => {
      try {
        // Small grace period so ElevenLabs has time to finalize analysis.
        await new Promise((r) => setTimeout(r, 1500));
        const res = await fetch("/api/voice/intake/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: convId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        if (cancelled) return;
        const overrides = {
          roomTempC: data.roomTempC,
          bedding: data.bedding,
          morningRitual: data.morningRitual,
          dietary: data.dietary,
          privacyPosture: data.privacyPosture,
        };
        sessionStorage.setItem("redthread:intake", JSON.stringify(overrides));
        setStage("done");
        router.push("/?fromIntake=1");
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStage("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stage, convId, router]);

  const begin = async () => {
    setError(null);
    setStage("connecting");
    try {
      await conversation.startSession({ agentId: AGENT_ID });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStage("error");
    }
  };

  const cancel = () => {
    conversation.endSession();
    setStage("idle");
    setConvId(null);
  };

  return (
    <main className="min-h-screen bg-paper-canvas text-ink flex flex-col">
      <header className="w-full border-b border-rule bg-paper-canvas">
        <div className="mx-auto w-full max-w-[1100px] px-8 py-5 flex items-center justify-between gap-6">
          <Link
            href="/profile"
            className="lockup group flex items-center gap-3 text-ink no-underline transition-opacity hover:opacity-85"
            aria-label="Red Thread — your profile"
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
          <div className="text-ink-faint text-xs uppercase tracking-[0.22em]">
            Pre-Arrival Intake
          </div>
        </div>
      </header>

      <section className="flex-1 flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-[640px]">
          <p className="text-ink-faint text-xs uppercase tracking-[0.22em] mb-4">
            For Ms. Mei-Ling Chen
          </p>
          <h1 className="font-serif text-5xl leading-[1.05] mb-6">
            Five quick questions to set your arrival.
          </h1>
          <p className="text-ink-mute text-base leading-relaxed mb-12">
            A short call with our pre-arrival voice. Room, bedding, morning
            rhythm, anything we should know about food, and how publicly
            you&rsquo;d like us to draw on what&rsquo;s already public about you. About
            a minute.
          </p>

          {stage === "idle" && (
            <button
              type="button"
              onClick={begin}
              className="px-8 py-4 bg-rose-deep text-on-dark font-sans uppercase tracking-[0.22em] text-sm hover:bg-rose-darker transition-colors"
            >
              Begin briefing
            </button>
          )}

          {stage === "connecting" && (
            <div className="font-serif italic text-ink-mute text-lg">
              Connecting…
            </div>
          )}

          {stage === "talking" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-thread-deep">
                <span className="relative inline-flex w-2.5 h-2.5">
                  <span className="absolute inset-0 rounded-full bg-thread animate-ping opacity-70" />
                  <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-thread" />
                </span>
                <span className="font-sans uppercase tracking-[0.22em] text-xs">
                  Listening
                </span>
              </div>
              {latestLine && (
                <p className="font-serif italic text-2xl leading-snug text-ink-mute">
                  &ldquo;{latestLine}&rdquo;
                </p>
              )}
              <button
                type="button"
                onClick={cancel}
                className="text-ink-faint text-xs uppercase tracking-[0.18em] hover:text-thread-deep"
              >
                End early
              </button>
            </div>
          )}

          {stage === "threading" && (
            <div className="space-y-3">
              <div className="font-serif italic text-2xl text-ink-mute">
                Threading the dossier…
              </div>
              <p className="text-ink-faint text-sm">
                Your answers are being woven into the brief.
              </p>
            </div>
          )}

          {stage === "done" && (
            <div className="font-serif italic text-2xl text-thread-deep">
              The thread is set. Taking you to the dashboard.
            </div>
          )}

          {stage === "error" && (
            <div className="space-y-4">
              <div className="text-thread-deep font-sans uppercase tracking-[0.18em] text-xs">
                Something went wrong
              </div>
              <p className="text-ink-mute text-sm">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStage("idle");
                  setConvId(null);
                }}
                className="px-6 py-3 bg-rose-deep text-on-dark font-sans uppercase tracking-[0.22em] text-xs hover:bg-rose-darker"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-rule-soft">
        <div className="mx-auto w-full max-w-[1100px] px-8 py-4 text-ink-faint text-xs tracking-[0.18em] uppercase">
          Voice rendered by ElevenLabs · Reasoning by Claude · A Sense of Place, threaded
        </div>
      </footer>
    </main>
  );
}

export default function IntakePage() {
  return (
    <ConversationProvider>
      <IntakeInner />
    </ConversationProvider>
  );
}
