"use client";

// Red Thread — dashboard bootstrap with live SSE streaming.
//
// Reads ?fromIntake=1, optionally pulls voice-intake overrides out of
// sessionStorage, then POSTs to /api/agent with Accept: text/event-stream.
// As the SSE events arrive — phase boundaries, per-tool-call start/complete,
// and finally the done event with the full dossier — the zustand store is
// updated incrementally so zone components animate the work as it happens.

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { useDossier } from "@/lib/dossierStore";
import type { Dossier } from "@/lib/types";

const DEFAULT_GUEST = "lin-chen";

interface IntakeOverrides {
  roomTempC?: number;
  bedding?: "down" | "down-free" | "memory";
  morningRitual?: string;
  dietary?: string;
  privacyPosture?: "minimal" | "standard" | "full";
}

interface SSEEvent {
  phase: string;
  type: string;
  payload?: {
    tool?: string;
    args?: unknown;
    summary?: string;
    message?: string;
    suppressed?: number;
    [k: string]: unknown;
  };
  ts: string;
}

export function DemoLoader() {
  const params = useSearchParams();
  const fired = useRef(false);

  useEffect(() => {
    if (params.get("fromIntake") !== "1") return;
    if (fired.current) return;
    fired.current = true;

    const store = useDossier.getState();
    store.startRun("intake");

    let overrides: IntakeOverrides | undefined;
    try {
      const raw = sessionStorage.getItem("redthread:intake");
      if (raw) overrides = JSON.parse(raw) as IntakeOverrides;
    } catch {
      // ignore — proceed without overrides
    }

    const controller = new AbortController();
    // Pull the selected property from the store — Header writes it, store
    // defaults to "hong-kong" so intake-only flows still work unchanged.
    const propertyId = useDossier.getState().activeProperty;
    streamAgent(
      { guestId: DEFAULT_GUEST, propertyId, overrides },
      controller.signal,
    ).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      useDossier.getState().setError(msg);
    });
    return () => controller.abort();
  }, [params]);

  return null;
}

/** Open the SSE stream and feed events into the store. Exported so a
 *  "Begin demo" button on the dashboard can also call it. */
export async function streamAgent(
  body: {
    guestId: string;
    propertyId: string;
    overrides?: IntakeOverrides;
    flightNumber?: string;
    previewPos?: number;
  },
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`/api/agent ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Parse "data: <json>\n\n" records out of the buffer.
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const line = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      try {
        const event = JSON.parse(line.slice(6)) as SSEEvent;
        handleEvent(event);
      } catch {
        // skip malformed
      }
    }
  }
}

function handleEvent(event: SSEEvent) {
  const store = useDossier.getState();
  switch (event.phase) {
    case "verify":
      store.setPhase("verify");
      break;
    case "research":
      store.setPhase("research");
      if (event.type === "tool_use_start" && event.payload?.tool) {
        store.pushToolStart(event.payload.tool, event.payload.args);
      } else if (event.type === "tool_use_complete" && event.payload?.tool) {
        store.pushToolComplete(event.payload.tool, event.payload.summary ?? "");
      } else if (event.type === "tool_use_error" && event.payload?.tool) {
        store.pushToolError(event.payload.tool, event.payload.message ?? "error");
      }
      break;
    case "synthesize":
      store.setPhase("synthesize");
      break;
    case "discretion":
      store.setPhase("discretion");
      break;
    case "done":
      if (event.type === "dossier" && event.payload) {
        store.setDossier(event.payload as unknown as Dossier);
      }
      break;
    case "error":
      store.setError(event.payload?.message ?? "Agent error");
      break;
  }
}
