// Red Thread — the real agent loop. Replaces T1's static stub.
//
// POST /api/agent  body: { guestId, propertyId, flightNumber? }
//
// Default response: application/json — a full Dossier matching T1's contract.
// Opt-in streaming: when Accept: text/event-stream, returns SSE events per phase.
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

interface RequestBody {
  guestId: string;
  propertyId: PropertyId;
  flightNumber?: string;
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
  emit: Emit,
  controller: ReadableStreamDefaultController<Uint8Array>,
): Promise<void> {
  if (fixture.events && fixture.events.length > 0) {
    for (const { event, delayMs } of fixture.events) {
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      emit(event);
    }
  } else {
    // Fallback synthetic timeline when fixture only has dossier
    emit({ phase: "verify", type: "start" });
    await new Promise((r) => setTimeout(r, 200));
    emit({ phase: "research", type: "start" });
    for (const tc of fixture.dossier.toolCalls) {
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
      payload: { suppressed: fixture.dossier.suppressed.length },
    });
    emit({ phase: "done", type: "dossier", payload: fixture.dossier });
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
  emit({
    phase: "verify",
    type: "start",
    payload: { guestId: body.guestId, propertyId: body.propertyId, pos: guest.privacyOpennessScore },
  });

  const toolCalls: ToolCallTrace[] = [];
  emit({ phase: "research", type: "start" });
  const candidate = await runResearchLoop(body, emit, toolCalls);
  emit({ phase: "synthesize", type: "complete" });

  const final = await runDiscretionPass(candidate, guest.privacyOpennessScore, emit);
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

  // Demo mode — replay fixture
  if (process.env.DEMO_MODE === "1") {
    const fixture = loadFixture(body.guestId, body.propertyId);
    if (!fixture) {
      return Response.json(
        { error: `No fixture for ${body.guestId} × ${body.propertyId}` },
        { status: 503 },
      );
    }
    if (!wantsSSE) {
      return Response.json(fixture.dossier);
    }
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit: Emit = (e) => {
          controller.enqueue(formatSSE({ ...e, ts: new Date().toISOString() }));
        };
        await streamFixture(fixture, emit, controller);
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
