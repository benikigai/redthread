"use client";

// Brief me — voice playback of a dossier narration.
// POSTs the composed text to /api/voice, plays the returned audio/mpeg.
// Click while playing → stop. Identical text reuses the disk cache → ~5ms warm.

import { useRef, useState } from "react";

import type { Dossier } from "@/lib/types";

type State = "idle" | "loading" | "playing" | "error";

/** Compose a 25-40 second spoken brief from a live Dossier. */
export function composeNarrationFromDossier(d: Dossier): string {
  const parts: string[] = [];

  parts.push(`Ms. Lin Chen — ${trimBio(d.bio)}.`);

  const rs = d.actuators.roomState;
  const roomLine = [
    `${rs.climateC} degrees`,
    rs.lighting && rs.lighting !== "off" ? rs.lighting : null,
    rs.bedding,
    rs.scent ? `scent of ${rs.scent.replace(/, low$/i, "")}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  parts.push(`Room is set: ${roomLine}.`);

  const am = d.actuators.welcomeAmenity;
  parts.push(`Welcome amenity is ${am.name}, from ${am.source}.`);

  const it = d.actuators.itinerary.slice(0, 2);
  if (it.length > 0) {
    parts.push(
      `Itinerary held: ${it.map((e) => `${e.time}, ${e.title}`).join("; and ")}.`,
    );
  }

  if (d.conversationHooks.length > 0) {
    parts.push(`Conversation hooks. ${d.conversationHooks[0]}`);
  }

  if (d.suppressed.length > 0) {
    parts.push(
      `The Discretion Layer suppressed ${d.suppressed.length} signal${d.suppressed.length === 1 ? "" : "s"}, auditable.`,
    );
  }

  parts.push("The thread is held.");
  return parts.join(" ");
}

function trimBio(bio: string): string {
  // Cut at first period to keep narration concise.
  const idx = bio.indexOf(".");
  return idx > 0 ? bio.slice(0, idx) : bio;
}

interface Props {
  narration: string;
}

export function BriefMeButton({ narration }: Props) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setState("idle");
  };

  const play = async () => {
    if (state === "playing" || state === "loading") {
      stop();
      return;
    }
    setError(null);
    setState("loading");
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: narration }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`/api/voice ${res.status}${detail ? `: ${detail.slice(0, 120)}` : ""}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        urlRef.current = null;
        audioRef.current = null;
        setState("idle");
      };
      audio.onerror = () => {
        setError("Audio playback error");
        setState("error");
      };
      await audio.play();
      setState("playing");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setState("error");
    }
  };

  const label =
    state === "loading"
      ? "Threading voice…"
      : state === "playing"
        ? "Pause"
        : state === "error"
          ? "Try again"
          : "Brief me · ElevenLabs voice";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={play}
        className="caps text-ink hover:text-thread-deep border hairline px-4 py-3 w-full transition-colors flex items-center justify-between"
        aria-live="polite"
      >
        <span>{label}</span>
        <span aria-hidden="true">
          {state === "playing" ? "■" : state === "loading" ? "…" : "▷"}
        </span>
      </button>
      {state === "error" && error && (
        <p className="text-xs text-thread-deep">{error}</p>
      )}
    </div>
  );
}
