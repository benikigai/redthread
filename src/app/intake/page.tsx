"use client";

// Red Thread — Pre-Arrival Intake
// Browser-side Convai widget. Voice in, voice out, mic captured by the SDK.
// When the conversation ends, the client hands the conversationId to
// /api/voice/intake/complete, which pulls the extraction from ElevenLabs.
//
// UI surfaces the three questions the guest will be asked alongside a live
// transcript so they can see what's being asked, follow along, and feel the
// thread populate. If the mic / network falls over, the visible scaffolding
// stays — they still know what we'd ask.

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConversationProvider, useConversation } from "@elevenlabs/react";

const AGENT_ID =
  process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_INTAKE ??
  "agent_5001krs8b43gfjstkz92k6fx9e3n";

// Pre-scripted demo conversation — two TTS voices speaking to each other.
// No microphone required. Plays sequentially, populates transcript +
// question outline, ends with fixture overrides routed to the dashboard.
const CONCIERGE_VOICE_ID =
  process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_CONCIERGE || "Xb7hH8MSUJpSbSDYk0k2"; // Alice
const GUEST_VOICE_ID =
  process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_GUEST || "9BWtsMINqrJLrRacOk9x"; // Aria

const DEMO_DIALOG: { speaker: "ai" | "you"; text: string; questionKey?: string }[] = [
  { speaker: "ai", text: "Welcome back, Mr. Shyong. Three quick things, in your voice." },
  { speaker: "ai", text: "First, the room — how would you like it set?", questionKey: "room" },
  { speaker: "you", text: "Twenty Celsius. Lights low when I arrive. Neutral scent, please." },
  { speaker: "ai", text: "Anything we should know about food?", questionKey: "dietary" },
  { speaker: "you", text: "Vegetarian. Chaat got it right last visit — I trust the kitchen." },
  { speaker: "ai", text: "And how publicly may we draw on what's already known about you?", questionKey: "privacy" },
  { speaker: "you", text: "Standard. The Series A and the FinTech Week keynote are public. Otherwise, hold the thread close." },
  { speaker: "ai", text: "Thank you, Mr. Shyong. The thread is set." },
];

// Hard-coded fixture overrides matching DEMO_DIALOG — what the agent receives
// when the demo conversation finishes. Mirrors what /api/voice/intake/complete
// would extract from a real ElevenLabs conversation.
const DEMO_OVERRIDES = {
  roomTempC: 20,
  dietary: "vegetarian",
  privacyPosture: "standard" as const,
};

type Stage =
  | "idle"
  | "connecting"
  | "talking"
  | "threading"
  | "done"
  | "error"
  | "demo-loading"
  | "demo-playing";

interface TranscriptLine {
  id: number;
  speaker: "ai" | "you";
  text: string;
  at: number;
}

const QUESTIONS = [
  {
    key: "room",
    label: "Room",
    title: "How would you like your room set?",
    hint: "Temperature, lighting, scent.",
    match: /(temperatur|room|degree|warm|cool|°|lighting|scent)/i,
  },
  {
    key: "dietary",
    label: "Food",
    title: "Anything we should know about food?",
    hint: "Diet, restrictions, favourites.",
    match: /(food|diet|eat|allerg|pescat|vegan|vegetarian|meat|fish|drink|alcohol)/i,
  },
  {
    key: "privacy",
    label: "Privacy",
    title: "How tightly should we hold the thread?",
    hint: "Minimal · Standard · Full.",
    match: /(privacy|public|press|article|social|signal|news|background)/i,
  },
] as const;

function IntakeInner() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [convId, setConvId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set());
  const lineIdRef = useRef(0);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const demoAudioRef = useRef<HTMLAudioElement | null>(null);
  const demoCancelRef = useRef(false);

  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setConvId(conversationId);
      setStage("talking");
    },
    onDisconnect: () => {
      setStage((prev) => (prev === "talking" ? "threading" : prev));
    },
    onMessage: ({ message, source }) => {
      if (typeof message !== "string" || !message.trim()) return;
      const speaker = source === "ai" ? "ai" : "you";
      lineIdRef.current += 1;
      setTranscript((t) => [
        ...t,
        { id: lineIdRef.current, speaker, text: message.trim(), at: Date.now() },
      ]);
      if (speaker === "ai") {
        const idx = QUESTIONS.findIndex((q) => q.match.test(message));
        if (idx !== -1) {
          setActiveIdx(idx);
          // Any earlier question the AI moved past is implicitly answered
          setDoneKeys((prev) => {
            const next = new Set(prev);
            for (let i = 0; i < idx; i++) next.add(QUESTIONS[i].key);
            return next;
          });
        }
      } else if (speaker === "you") {
        // user just answered → mark current as done
        setDoneKeys((prev) => {
          const next = new Set(prev);
          next.add(QUESTIONS[activeIdx].key);
          return next;
        });
      }
    },
    onError: (msg) => {
      // eslint-disable-next-line no-console
      console.error("[intake] convai error:", msg);
      setError(typeof msg === "string" ? msg : "Conversation error");
      setStage("error");
    },
    onDebug: (info) => {
      // eslint-disable-next-line no-console
      console.log("[intake] convai debug:", info);
    },
    onStatusChange: ({ status }) => {
      // eslint-disable-next-line no-console
      console.log("[intake] convai status:", status);
    },
  });

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [transcript.length]);

  // Trigger extraction after disconnect
  useEffect(() => {
    if (stage !== "threading" || !convId) return;
    let cancelled = false;
    (async () => {
      try {
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

  // Cleanup timeout / demo audio on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      demoCancelRef.current = true;
      demoAudioRef.current?.pause();
    };
  }, []);

  // Two pre-scripted voice agents speaking to each other. Fetches all audio
  // in parallel from /api/voice (cached on disk after first play), then plays
  // sequentially while the transcript + question outline animate forward.
  const playDemoDialog = async () => {
    setError(null);
    setTranscript([]);
    setActiveIdx(0);
    setDoneKeys(new Set());
    setStage("demo-loading");
    demoCancelRef.current = false;

    const fetchLine = async (text: string, voiceId: string): Promise<string> => {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId }),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Voice fetch ${res.status}${errBody ? `: ${errBody.slice(0, 120)}` : ""}`);
      }
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    };

    let audioUrls: string[];
    try {
      audioUrls = await Promise.all(
        DEMO_DIALOG.map((line) =>
          fetchLine(line.text, line.speaker === "ai" ? CONCIERGE_VOICE_ID : GUEST_VOICE_ID),
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStage("error");
      return;
    }

    if (demoCancelRef.current) {
      audioUrls.forEach((u) => URL.revokeObjectURL(u));
      return;
    }

    setStage("demo-playing");

    const playOne = (url: string) =>
      new Promise<void>((resolve) => {
        const audio = new Audio(url);
        demoAudioRef.current = audio;
        // 1.3× speech rate — natural-sounding while shaving ~25% off the
        // demo. Keeps both voices intelligible without sounding chipmunked.
        audio.playbackRate = 1.3;
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        void audio.play().catch(() => resolve());
      });

    for (let i = 0; i < DEMO_DIALOG.length; i++) {
      if (demoCancelRef.current) break;
      const line = DEMO_DIALOG[i];

      // Surface the line in transcript before playing audio
      lineIdRef.current += 1;
      setTranscript((t) => [
        ...t,
        { id: lineIdRef.current, speaker: line.speaker, text: line.text, at: Date.now() },
      ]);
      if (line.questionKey && line.speaker === "ai") {
        const qIdx = QUESTIONS.findIndex((q) => q.key === line.questionKey);
        if (qIdx !== -1) {
          setActiveIdx(qIdx);
          setDoneKeys((prev) => {
            const next = new Set(prev);
            for (let j = 0; j < qIdx; j++) next.add(QUESTIONS[j].key);
            return next;
          });
        }
      } else if (line.speaker === "you") {
        setDoneKeys((prev) => {
          const next = new Set(prev);
          next.add(QUESTIONS[activeIdx].key);
          return next;
        });
      }

      await playOne(audioUrls[i]);
      // tighter beat between lines — demo pacing trumps natural rhythm
      if (!demoCancelRef.current) await new Promise((r) => setTimeout(r, 120));
    }

    audioUrls.forEach((u) => URL.revokeObjectURL(u));
    if (demoCancelRef.current) return;

    // Mark all questions complete; persist demo overrides and route.
    setDoneKeys(new Set(QUESTIONS.map((q) => q.key)));
    setStage("threading");
    try {
      sessionStorage.setItem("redthread:intake", JSON.stringify(DEMO_OVERRIDES));
    } catch {
      // ignore — proceed
    }
    await new Promise((r) => setTimeout(r, 900));
    setStage("done");
    router.push("/?fromIntake=1");
  };

  const cancelDemo = () => {
    demoCancelRef.current = true;
    demoAudioRef.current?.pause();
    setStage("idle");
  };

  const begin = async () => {
    setError(null);
    setTranscript([]);
    setActiveIdx(0);
    setDoneKeys(new Set());
    setStage("connecting");

    // Connection timeout — if onConnect never fires (silent mic denial,
    // CORS, agent misconfigured), surface a real error instead of a spinner.
    timeoutRef.current = window.setTimeout(() => {
      setStage((prev) => {
        if (prev !== "connecting") return prev;
        setError(
          "Couldn't open the voice channel. Check that your browser has microphone permission for this site, then try again.",
        );
        return "error";
      });
    }, 12_000);

    try {
      // Explicit mic permission probe so denials don't fail silently
      if (navigator?.mediaDevices?.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
          throw new Error(
            "Microphone access was blocked. Allow it in your browser's site settings and try again.",
          );
        });
      }
      // WebRTC instead of WebSocket — friendlier to firewalls and gives
      // cleaner audio in browsers that throttle WS audio.
      await conversation.startSession({ agentId: AGENT_ID, connectionType: "webrtc" });
    } catch (err) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStage("error");
    }
  };

  const cancel = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    conversation.endSession();
    setStage((prev) => (prev === "talking" ? "threading" : "idle"));
    setConvId((c) => c);
  };

  const showQuestionPanel =
    stage === "talking" ||
    stage === "threading" ||
    stage === "done" ||
    stage === "demo-loading" ||
    stage === "demo-playing";

  const lastFewLines = useMemo(() => transcript.slice(-6), [transcript]);

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
          <div className="text-ink-faint text-xs uppercase tracking-[0.22em]">
            Pre-Arrival Intake
          </div>
        </div>
      </header>

      <section className="flex-1 px-6 sm:px-8 py-12">
        <div className="mx-auto w-full max-w-[1080px]">
          <p className="text-ink-faint text-xs uppercase tracking-[0.22em] mb-3">
            For Mr. Benjamin Shyong
          </p>
          <h1 className="font-display text-[clamp(2.25rem,4vw,3rem)] leading-[1.05] mb-4">
            Three quick questions to set your arrival.
          </h1>
          <p className="text-ink-mute text-base leading-relaxed mb-10 max-w-[640px]">
            A short call with our pre-arrival voice. Speak naturally — the
            thread populates as you answer.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10">
            {/* LEFT — three questions */}
            <aside aria-label="Questions">
              <p className="caps mb-4 text-thread-deep">What we&rsquo;ll ask</p>
              <ol className="space-y-3">
                {QUESTIONS.map((q, i) => {
                  const done = doneKeys.has(q.key);
                  const active = showQuestionPanel && activeIdx === i && !done;
                  return (
                    <li
                      key={q.key}
                      className={[
                        "border p-4 transition-colors",
                        done
                          ? "border-rule bg-paper-soft"
                          : active
                            ? "border-thread bg-paper"
                            : "border-rule bg-paper",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={[
                            "shrink-0 w-6 h-6 inline-flex items-center justify-center text-[11px] font-medium border rounded-full transition-colors",
                            done
                              ? "border-thread-deep bg-thread-deep text-on-dark"
                              : active
                                ? "border-thread text-thread"
                                : "border-rule text-ink-faint",
                          ].join(" ")}
                          aria-hidden="true"
                        >
                          {done ? "✓" : i + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="caps text-ink-faint mb-1">
                            {q.label}
                          </div>
                          <div className="font-display text-lg leading-snug">
                            {q.title}
                          </div>
                          <div className="text-[12px] text-ink-mute mt-1">
                            {q.hint}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </aside>

            {/* RIGHT — control + transcript */}
            <section aria-label="Voice intake" className="space-y-6">
              {stage === "idle" && (
                <div className="space-y-4">
                  <div className="border border-rule bg-paper p-6 sm:p-8">
                    <p className="caps text-thread-deep">Voice channel</p>
                    <h2 className="font-display text-2xl mt-2 mb-4 leading-snug">
                      Begin when you&rsquo;re ready.
                    </h2>
                    <p className="text-ink-mute text-sm leading-relaxed mb-6">
                      Your browser will ask for microphone access — that&rsquo;s
                      expected. Speak conversationally; the thread will weave in
                      your answers as you go.
                    </p>
                    <button
                      type="button"
                      onClick={begin}
                      className="px-8 py-4 bg-rose-deep text-paper font-sans uppercase tracking-[0.22em] text-sm font-medium hover:bg-rose-darker transition-colors"
                    >
                      Begin briefing
                    </button>
                  </div>

                  <div className="border border-rule bg-paper-soft p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="max-w-md">
                        <p className="caps text-brass">Watch the demo</p>
                        <h3 className="font-display text-xl mt-2 leading-snug">
                          Two voices — concierge &amp; guest — speak it for
                          you.
                        </h3>
                        <p className="text-ink-mute text-sm leading-relaxed mt-2">
                          No microphone needed. A pre-scripted briefing plays
                          aloud; the thread populates the same way.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={playDemoDialog}
                        className="shrink-0 px-6 py-3 border border-thread-deep text-thread-deep font-sans uppercase tracking-[0.22em] text-xs hover:bg-thread-deep hover:text-on-dark transition-colors"
                      >
                        Play demo
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {stage === "demo-loading" && (
                <div className="border border-rule bg-paper p-6 sm:p-8 space-y-3">
                  <div className="flex items-center gap-3 text-thread-deep">
                    <span className="relative inline-flex w-2.5 h-2.5">
                      <span className="absolute inset-0 rounded-full bg-thread animate-ping opacity-70" />
                      <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-thread" />
                    </span>
                    <span className="caps">Preparing the voices</span>
                  </div>
                  <p className="font-display italic text-ink-mute text-lg">
                    Rendering each line — about a second.
                  </p>
                </div>
              )}

              {stage === "connecting" && (
                <div className="border border-rule bg-paper p-6 sm:p-8 space-y-3">
                  <div className="flex items-center gap-3 text-thread-deep">
                    <span className="relative inline-flex w-2.5 h-2.5">
                      <span className="absolute inset-0 rounded-full bg-thread animate-ping opacity-70" />
                      <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-thread" />
                    </span>
                    <span className="caps">Opening the channel</span>
                  </div>
                  <p className="font-display italic text-ink-mute text-lg">
                    Allow microphone access in the browser prompt, then the
                    voice will speak first.
                  </p>
                </div>
              )}

              {(stage === "talking" ||
                stage === "threading" ||
                stage === "done" ||
                stage === "demo-playing") && (
                <div className="border border-rule bg-paper p-6 sm:p-8 space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-thread-deep">
                      <span className="relative inline-flex w-2.5 h-2.5">
                        {(stage === "talking" || stage === "demo-playing") && (
                          <span className="absolute inset-0 rounded-full bg-thread animate-ping opacity-70" />
                        )}
                        <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-thread" />
                      </span>
                      <span className="caps">
                        {stage === "talking"
                          ? "Listening"
                          : stage === "demo-playing"
                            ? "Demo conversation"
                            : stage === "threading"
                              ? "Threading the dossier"
                              : "Thread set"}
                      </span>
                    </div>
                    {stage === "talking" && (
                      <button
                        type="button"
                        onClick={cancel}
                        className="text-ink-faint text-xs uppercase tracking-[0.18em] hover:text-thread-deep"
                      >
                        End early
                      </button>
                    )}
                    {stage === "demo-playing" && (
                      <button
                        type="button"
                        onClick={cancelDemo}
                        className="text-ink-faint text-xs uppercase tracking-[0.18em] hover:text-thread-deep"
                      >
                        Stop demo
                      </button>
                    )}
                  </div>

                  {/* Live transcript */}
                  <div
                    className="h-[300px] overflow-y-auto pr-2 space-y-3"
                    aria-live="polite"
                    aria-atomic="false"
                  >
                    {lastFewLines.length === 0 && (
                      <p className="text-ink-faint text-sm italic">
                        Waiting for the voice to speak first…
                      </p>
                    )}
                    {lastFewLines.map((line) => (
                      <div
                        key={line.id}
                        className={[
                          "p-3 border-l-2 max-w-[95%]",
                          line.speaker === "ai"
                            ? "border-thread-deep bg-paper-canvas"
                            : "border-brass bg-paper ml-auto",
                        ].join(" ")}
                      >
                        <div className="caps text-[0.6rem] mb-1 text-ink-faint">
                          {line.speaker === "ai" ? "Red Thread" : "You"}
                        </div>
                        <div
                          className={[
                            "text-sm leading-snug",
                            line.speaker === "ai"
                              ? "font-display italic text-ink"
                              : "text-ink",
                          ].join(" ")}
                        >
                          {line.speaker === "ai" ? `“${line.text}”` : line.text}
                        </div>
                      </div>
                    ))}
                    <div ref={transcriptEndRef} />
                  </div>

                  {stage === "threading" && (
                    <p className="font-display italic text-thread-deep text-base">
                      Weaving your answers into the brief…
                    </p>
                  )}
                  {stage === "done" && (
                    <p className="font-display italic text-thread-deep text-base">
                      The thread is set. Taking you to the dashboard.
                    </p>
                  )}
                </div>
              )}

              {stage === "error" && (
                <div className="border border-thread-deep bg-paper p-6 sm:p-8 space-y-4">
                  <div className="caps text-thread-deep">
                    Something went wrong
                  </div>
                  <p className="text-ink leading-relaxed">{error}</p>
                  <details className="text-sm text-ink-mute">
                    <summary className="cursor-pointer hover:text-ink">
                      Troubleshooting
                    </summary>
                    <ul className="mt-2 ml-4 list-disc space-y-1">
                      <li>
                        Click the lock icon in your browser&rsquo;s address bar
                        and ensure microphone permission is set to
                        <strong> Allow </strong>for this site.
                      </li>
                      <li>
                        On macOS, check System Settings → Privacy &amp; Security
                        → Microphone — your browser must be enabled.
                      </li>
                      <li>
                        Refresh the page if you&rsquo;ve just granted the
                        permission.
                      </li>
                    </ul>
                  </details>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setStage("idle");
                      setConvId(null);
                    }}
                    className="px-6 py-3 bg-rose-deep text-paper font-sans uppercase tracking-[0.22em] text-xs font-medium hover:bg-rose-darker"
                  >
                    Try again
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </section>

      <footer className="border-t border-rule">
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
