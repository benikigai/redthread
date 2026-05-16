// Red Thread — the real agent loop. Replaces T1's static stub.
//
// POST /api/agent  body: { guestId, propertyId, flightNumber?, previewPos? }
//
// Default response: application/json — a full Dossier matching T1's contract.
// Opt-in streaming: when Accept: text/event-stream, returns SSE events per phase.
//
// previewPos (0–100): optional override of guest.privacyOpennessScore for the
// Discretion Layer pass only. Drives the "Hold the Thread" guest control —
// concierge dashboard mirrors the guest's saved value; profile screen saves it.
// In DEMO_MODE, fixture is band-reduced to simulate the discretion change.
//
// DEMO_MODE=1 short-circuits the Claude calls and replays a captured fixture
// from data/fixtures/<guestId>__<propertyId>.json — insurance against demo-day
// wifi failure.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODELS } from "@/lib/anthropic";
import { getGuest, getProperty } from "@/lib/crm";
import { RESEARCH_AGENT_SYSTEM, DISCRETION_LAYER_SYSTEM } from "@/lib/prompts";
import { TOOL_DEFINITIONS, dispatchTool } from "@/lib/tools";
import type { Dossier, PropertyId, ToolCallTrace } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TURNS = 8;
const FIXTURE_DIR = join(process.cwd(), "data", "fixtures");

type Phase =
  | "verify"
  | "research"
  | "synthesize"
  | "discretion"
  | "done"
  | "error";

interface SSEEvent {
  phase: Phase;
  type: string;
  payload?: unknown;
  ts: string;
}

interface VoiceIntakeOverrides {
  roomTempC?: number;
  bedding?: "down" | "down-free" | "memory";
  morningRitual?: string;
  dietary?: string;
  /** If provided, also derives a previewPos value when one isn't set explicitly. */
  privacyPosture?: "minimal" | "standard" | "full";
}

interface RequestBody {
  guestId: string;
  propertyId: PropertyId;
  flightNumber?: string;
  /** Override guest.privacyOpennessScore for this call's Discretion pass only.
   *  0–100. Used by the "Hold the Thread" preview control on the dashboard
   *  and by the guest's profile save flow. */
  previewPos?: number;
  /** Voice-intake extraction merged onto the dossier. Used by the live demo
   *  flow where the guest's just-spoken preferences should be reflected in
   *  the brief without re-running Claude. Sent by the client after
   *  /api/voice/intake/complete returns. */
  overrides?: VoiceIntakeOverrides;
}

const POSTURE_TO_POS: Record<NonNullable<VoiceIntakeOverrides["privacyPosture"]>, number> = {
  minimal: 20,
  standard: 55,
  full: 85,
};

/** Apply voice-intake overrides onto a dossier in place. roomTempC/bedding
 *  land on actuators.roomState; dietary lands on welcomeAmenity + handleWithCare;
 *  morningRitual prepends a single itinerary mention. Idempotent. */
function applyOverrides(d: Dossier, ov: VoiceIntakeOverrides): Dossier {
  const cloned: Dossier = JSON.parse(JSON.stringify(d));
  if (typeof ov.roomTempC === "number" && ov.roomTempC >= 16 && ov.roomTempC <= 24) {
    cloned.actuators.roomState.climateC = Math.round(ov.roomTempC);
    cloned.actuators.roomState.reasoning = [
      `Voice intake: guest asked for ${Math.round(ov.roomTempC)}°C on arrival.`,
      ...cloned.actuators.roomState.reasoning.filter((r) => !/thermostat|°C/i.test(r)),
    ];
  }
  if (ov.bedding) {
    const beddingMap = { down: "down pillows", "down-free": "down-free pillows", memory: "memory foam pillows" } as const;
    cloned.actuators.roomState.bedding = beddingMap[ov.bedding];
    cloned.actuators.roomState.reasoning = [
      `Voice intake: guest requested ${cloned.actuators.roomState.bedding}.`,
      ...cloned.actuators.roomState.reasoning.filter((r) => !/bedding|pillow|duvet|down/i.test(r)),
    ];
  }
  if (ov.dietary) {
    cloned.handleWithCare = [
      `Dietary (per intake): ${ov.dietary}.`,
      ...cloned.handleWithCare.filter((s) => !/dietary|aller/i.test(s)),
    ];
  }
  if (ov.morningRitual) {
    const morningEntry: (typeof cloned.actuators.itinerary)[number] = {
      title: "Morning held — per intake",
      category: "wellness",
      timeOfDay: "morning",
      whyHere: ov.morningRitual,
      vendorOrPlace: "TBD",
      time: "07:00",
      reasoning: `Voice intake: "${ov.morningRitual}"`,
    };
    cloned.actuators.itinerary = [
      morningEntry,
      ...cloned.actuators.itinerary.filter((e) => e.timeOfDay !== "morning"),
    ].slice(0, 4);
  }
  return cloned;
}

type Band = "minimal" | "standard" | "full";

function bandFor(pos: number): Band {
  if (pos < 31) return "minimal";
  if (pos < 70) return "standard";
  return "full";
}

/** Demo-only: reduce a fixture Dossier to simulate what the Discretion Layer
 *  would emit at the target POS. Mirrors the band logic in
 *  DISCRETION_LAYER_SYSTEM (src/lib/prompts.ts) closely enough for the dial
 *  to read as live without re-invoking Claude on every slider tick. */
function bandReduceFixture(d: Dossier, pos: number): Dossier {
  const band = bandFor(pos);
  if (band === "full") return d;

  const cloned: Dossier = JSON.parse(JSON.stringify(d));
  const extraSuppressed: { signal: string; reason: string }[] = [];

  if (band === "minimal") {
    for (const h of cloned.conversationHooks ?? []) {
      const label = typeof h === "string" ? h : (h as { hook?: string }).hook ?? "hook";
      extraSuppressed.push({
        signal: `conversation-hook: ${String(label).slice(0, 60)}`,
        reason: "Below POS standard floor — minimal band suppresses all conversation hooks",
      });
    }
    cloned.conversationHooks = [];
    cloned.handleWithCare = [
      "Guest is privacy-conscious. Standard luxury service. No personalized references.",
    ];
  } else {
    // STANDARD: drop hooks that read as personal/recent-life, keep professional.
    const before = cloned.conversationHooks ?? [];
    const after = before.filter((h) => {
      const text = typeof h === "string" ? h : (h as { hook?: string }).hook ?? "";
      const personal = /(family|wife|husband|partner|son|daughter|child|kids|wedding|engagement|breakup|illness|diagnosis|recovery|therapy|treatment)/i;
      return !personal.test(text);
    });
    for (const h of before) {
      if (after.includes(h)) continue;
      const label = typeof h === "string" ? h : (h as { hook?: string }).hook ?? "hook";
      extraSuppressed.push({
        signal: `conversation-hook: ${String(label).slice(0, 60)}`,
        reason: "Standard band — personal/non-professional reference removed",
      });
    }
    cloned.conversationHooks = after;
  }

  cloned.suppressed = [...(cloned.suppressed ?? []), ...extraSuppressed];
  return cloned;
}

type Emit = (event: Omit<SSEEvent, "ts">) => void;

// ─── Demo fixture short-circuit ──────────────────────────────────────────

interface Fixture {
  dossier: Dossier;
  events?: Array<{ event: Omit<SSEEvent, "ts">; delayMs: number }>;
}

function loadFixture(guestId: string, propertyId: PropertyId): Fixture | null {
  const path = join(FIXTURE_DIR, `${guestId}__${propertyId}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as Fixture;
}

async function streamFixture(
  fixture: Fixture,
  effectiveDossier: Dossier,
  emit: Emit,
  controller: ReadableStreamDefaultController<Uint8Array>,
): Promise<void> {
  if (fixture.events && fixture.events.length > 0) {
    for (const { event, delayMs } of fixture.events) {
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      // Swap the canonical dossier for the band-reduced one when this event
      // carries a dossier payload (so previewPos changes visibly even in SSE).
      const swapped =
        event.type === "dossier"
          ? { ...event, payload: effectiveDossier }
          : event.phase === "discretion" && event.type === "complete"
            ? { ...event, payload: { suppressed: effectiveDossier.suppressed.length } }
            : event;
      emit(swapped);
    }
  } else {
    // Fallback synthetic timeline when fixture only has dossier
    emit({ phase: "verify", type: "start" });
    await new Promise((r) => setTimeout(r, 200));
    emit({ phase: "research", type: "start" });
    for (const tc of effectiveDossier.toolCalls) {
      emit({ phase: "research", type: "tool_use_start", payload: { tool: tc.tool } });
      await new Promise((r) => setTimeout(r, 250));
      emit({
        phase: "research",
        type: "tool_use_complete",
        payload: { tool: tc.tool, summary: tc.result },
      });
    }
    emit({ phase: "synthesize", type: "complete" });
    await new Promise((r) => setTimeout(r, 200));
    emit({
      phase: "discretion",
      type: "complete",
      payload: { suppressed: effectiveDossier.suppressed.length },
    });
    emit({ phase: "done", type: "dossier", payload: effectiveDossier });
  }
  controller.close();
}

// ─── Agent loop ──────────────────────────────────────────────────────────

function buildUserPrompt(body: RequestBody): string {
  const guest = getGuest(body.guestId);
  const property = getProperty(body.propertyId);
  return `Produce a Dossier for the arriving guest at this property.

GUEST PROFILE (from CRM — authoritative):
${JSON.stringify(guest, null, 2)}

PROPERTY PROFILE (from CRM — authoritative):
${JSON.stringify(property, null, 2)}

ARRIVAL CONTEXT:
- guestId: ${body.guestId}
- propertyId: ${body.propertyId}
${body.flightNumber ? `- flightNumber: ${body.flightNumber}` : "- no flight info provided"}
- generatedAt (use verbatim in Dossier): ${new Date().toISOString()}

Run web_search, crm_cross_property${body.flightNumber ? ", and flight_lookup" : ""} as needed. Then synthesize the Dossier and wrap it in <dossier>...</dossier>.`;
}

async function runResearchLoop(
  body: RequestBody,
  emit: Emit,
  toolCalls: ToolCallTrace[],
): Promise<Dossier> {
  const client = anthropic();
  const conversation: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: buildUserPrompt(body) },
  ];

  let finalMessage: Anthropic.Messages.Message | null = null;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.messages.create({
      model: MODELS.agent,
      max_tokens: 4096,
      system: RESEARCH_AGENT_SYSTEM,
      tools: TOOL_DEFINITIONS,
      messages: conversation,
    });

    // Surface server_tool_use (web_search) blocks to the stream + toolCalls
    for (const block of response.content) {
      if (block.type === "server_tool_use" && block.name === "web_search") {
        const startedAt = new Date().toISOString();
        emit({
          phase: "research",
          type: "tool_use_start",
          payload: { tool: "web_search", args: block.input },
        });
        toolCalls.push({
          tool: "web_search",
          status: "complete",
          args: block.input,
          startedAt,
          finishedAt: startedAt,
        });
      }
      if (block.type === "web_search_tool_result") {
        const count = Array.isArray(block.content) ? block.content.length : 0;
        emit({
          phase: "research",
          type: "tool_use_complete",
          payload: { tool: "web_search", summary: `${count} result${count === 1 ? "" : "s"}` },
        });
        const last = toolCalls[toolCalls.length - 1];
        if (last && last.tool === "web_search") {
          last.result = `${count} result${count === 1 ? "" : "s"}`;
          last.finishedAt = new Date().toISOString();
        }
      }
    }

    if (response.stop_reason !== "tool_use") {
      finalMessage = response;
      break;
    }

    // Dispatch local custom tools
    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const startedAt = new Date().toISOString();
      emit({
        phase: "research",
        type: "tool_use_start",
        payload: { tool: block.name, args: block.input },
      });
      try {
        const { result, summary } = await dispatchTool(block.name, block.input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
        emit({
          phase: "research",
          type: "tool_use_complete",
          payload: { tool: block.name, summary },
        });
        toolCalls.push({
          tool: block.name,
          status: "complete",
          args: block.input,
          result: summary,
          startedAt,
          finishedAt: new Date().toISOString(),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `Error: ${msg}`,
          is_error: true,
        });
        emit({
          phase: "research",
          type: "tool_use_error",
          payload: { tool: block.name, message: msg },
        });
        toolCalls.push({
          tool: block.name,
          status: "failed",
          args: block.input,
          result: msg,
          startedAt,
          finishedAt: new Date().toISOString(),
        });
      }
    }

    conversation.push({ role: "assistant", content: response.content });
    conversation.push({ role: "user", content: toolResults });
  }

  if (!finalMessage) {
    throw new Error(`Research loop did not converge within ${MAX_TURNS} turns`);
  }

  const text = finalMessage.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const match = text.match(/<dossier>([\s\S]*?)<\/dossier>/);
  if (!match) throw new Error("Research output missing <dossier> tags");
  const candidate = JSON.parse(match[1]) as Dossier;
  return candidate;
}

async function runDiscretionPass(
  candidate: Dossier,
  pos: number,
  emit: Emit,
): Promise<Dossier> {
  emit({ phase: "discretion", type: "start", payload: { pos } });
  const client = anthropic();
  const response = await client.messages.create({
    model: MODELS.discretion,
    max_tokens: 4096,
    system: DISCRETION_LAYER_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Guest Privacy Openness Score: ${pos}\n\nCandidate Dossier:\n${JSON.stringify(candidate, null, 2)}`,
      },
    ],
  });
  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const match = text.match(/<filtered>([\s\S]*?)<\/filtered>/);
  if (!match) throw new Error("Discretion output missing <filtered> tags");
  const filtered = JSON.parse(match[1]) as Dossier;
  emit({
    phase: "discretion",
    type: "complete",
    payload: { suppressed: filtered.suppressed.length },
  });
  return filtered;
}

async function runAgent(body: RequestBody, emit: Emit): Promise<Dossier> {
  const guest = getGuest(body.guestId);
  const pos = body.previewPos ?? guest.privacyOpennessScore;
  emit({
    phase: "verify",
    type: "start",
    payload: {
      guestId: body.guestId,
      propertyId: body.propertyId,
      pos,
      posSource: body.previewPos !== undefined ? "preview" : "guest-profile",
    },
  });

  const toolCalls: ToolCallTrace[] = [];
  emit({ phase: "research", type: "start" });
  const candidate = await runResearchLoop(body, emit, toolCalls);
  emit({ phase: "synthesize", type: "complete" });

  const final = await runDiscretionPass(candidate, pos, emit);
  final.toolCalls = toolCalls;

  emit({ phase: "done", type: "dossier", payload: final });
  return final;
}

// ─── HTTP handler ────────────────────────────────────────────────────────

function sseHeaders(): Headers {
  return new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
}

function formatSSE(event: SSEEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function POST(req: Request): Promise<Response> {
  let body: RequestBody;
  try {
    const raw = await req.json();
    if (!raw || typeof raw !== "object" || !raw.guestId || !raw.propertyId) {
      return Response.json(
        { error: "Body requires guestId and propertyId" },
        { status: 400 },
      );
    }
    body = raw as RequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const wantsSSE =
    (req.headers.get("accept") ?? "").toLowerCase().includes("text/event-stream");

  // Demo mode — replay fixture, optionally band-reduced for previewPos
  if (process.env.DEMO_MODE === "1") {
    const fixture = loadFixture(body.guestId, body.propertyId);
    if (!fixture) {
      return Response.json(
        { error: `No fixture for ${body.guestId} × ${body.propertyId}` },
        { status: 503 },
      );
    }
    // Apply voice-intake overrides first (substantive prefs land on the base),
    // then band-reduce per POS (privacy filtering is the last layer).
    const withOverrides = body.overrides
      ? applyOverrides(fixture.dossier, body.overrides)
      : fixture.dossier;
    const effectivePos =
      body.previewPos !== undefined
        ? body.previewPos
        : body.overrides?.privacyPosture
          ? POSTURE_TO_POS[body.overrides.privacyPosture]
          : undefined;
    const effective =
      effectivePos !== undefined
        ? bandReduceFixture(withOverrides, effectivePos)
        : withOverrides;
    if (!wantsSSE) {
      return Response.json(effective);
    }
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit: Emit = (e) => {
          controller.enqueue(formatSSE({ ...e, ts: new Date().toISOString() }));
        };
        await streamFixture(fixture, effective, emit, controller);
      },
    });
    return new Response(stream, { headers: sseHeaders() });
  }

  if (!wantsSSE) {
    // JSON path — collect events, return final dossier
    try {
      const events: SSEEvent[] = [];
      const emit: Emit = (e) => {
        events.push({ ...e, ts: new Date().toISOString() });
      };
      const dossier = await runAgent(body, emit);
      return Response.json(dossier);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return Response.json({ error: msg }, { status: 500 });
    }
  }

  // SSE path
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit: Emit = (e) => {
        controller.enqueue(formatSSE({ ...e, ts: new Date().toISOString() }));
      };
      try {
        await runAgent(body, emit);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emit({ phase: "error", type: "fatal", payload: { message: msg } });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: sseHeaders() });
}
