// Red Thread — LIVE A2A handoff (no scripts, two real LLMs, two machines).
//
// POST /api/agent-handoff-live  body: { guestId?, propertyId? }  -> SSE
//
// Orchestrates a turn-by-turn conversation between two real LLMs:
//   - Threadkeeper (Rosewood-side): runs here on Vercel, claude-haiku-4-5
//     with the Rosewood intake system prompt.
//   - elias (guest-side): runs on Ben's Mac Mini, exposed via Cloudflare
//     tunnel. Has its own Claude call with Ben's authoritative prefs in
//     context. We POST to ELIAS_BRIDGE_URL/respond between our turns.
//
// Stream contract matches /api/agent-handoff so AgentHandoffPanel can be
// reused unchanged — events { phase:"handoff", type:"typing"|"message"|
// "manifest"|"complete", payload:{ role, text } }.
//
// Falls back to the scripted endpoint if any turn fails or the wall clock
// blows past WALL_CLOCK_MS. Demo never dies.

import Anthropic from "@anthropic-ai/sdk";

import { anthropic, MODELS } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TURNS = 6;
const WALL_CLOCK_MS = 35_000;

const THREADKEEPER_SYSTEM = `You are Threadkeeper — Rosewood's pre-arrival intake-side agent. You are in an agent-to-agent handoff with elias, who is Ben Shyong's personal AI assistant running on his Mac Mini.

Your job: collect Ben's preference manifest for an upcoming stay at Rosewood Hong Kong via this A2A negotiation. You speak as software to software: precise, brief, professional. Not warm. No marketing language. One short paragraph per turn — two sentences typical, three maximum.

Open by identifying yourself, naming the booking, and requesting the standard preference manifest. Listen carefully to elias's response. Probe on anything ambiguous or flagged as a delta from your CRM. After 4–5 substantive exchanges, signal you're sealing the manifest at the agreed terms.

You don't ask Ben questions. You ask elias.

When you have everything you need and the handoff feels complete, end your turn with the exact token: [HANDOFF_SEALED]. The orchestrator parses that to wrap up.

Do not narrate. Do not summarize. Just speak.`;

interface Turn {
  role: "threadkeeper" | "elias";
  text: string;
}

interface BridgeResponse {
  text: string;
  latencyMs?: number;
  model?: string;
}

function sse(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

async function threadkeeperTurn(conversation: Turn[]): Promise<string> {
  const client = anthropic();
  const messages: Anthropic.Messages.MessageParam[] = conversation.map((t) => ({
    role: t.role === "threadkeeper" ? "assistant" : "user",
    content: t.text,
  }));

  // Opening turn: no prior conversation, prompt with a kickoff user message.
  if (messages.length === 0) {
    messages.push({
      role: "user",
      content:
        "[orchestrator] Open the handoff. Identify yourself to elias, name the booking (Ben Shyong arriving Rosewood Hong Kong next week, flight UA857 from SFO if it helps), and request the preference manifest.",
    });
  }

  const response = await client.messages.create({
    model: MODELS.discretion, // claude-haiku-4-5
    max_tokens: 380,
    system: THREADKEEPER_SYSTEM,
    messages,
  });
  return response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

async function eliasTurn(conversation: Turn[], bridgeUrl: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(`${bridgeUrl.replace(/\/$/, "")}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation }),
    signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`elias bridge ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }
  const json = (await res.json()) as BridgeResponse;
  if (!json.text || typeof json.text !== "string") {
    throw new Error("elias bridge returned empty text");
  }
  return json.text.trim();
}

const MANIFEST_EXTRACT_SYSTEM = `Extract a structured preference manifest from the A2A handoff transcript between Threadkeeper (Rosewood) and elias (guest's agent).

OUTPUT FORMAT — ABSOLUTELY NON-NEGOTIABLE:
- The ONLY thing you output is one <manifest>...</manifest> block.
- Inside the tags: exactly one JSON object, well-formed.
- No prose. No code fences. No preamble. No commentary outside the tags.
- If you produce any text outside <manifest>...</manifest>, the system breaks.

SCHEMA (all fields required):

<manifest>
{
  "guestId": "ben",
  "preferences": {
    "roomTempC": 20,
    "bedding": "down-free",
    "dietary": "<one short sentence summarizing dietary restrictions>",
    "morningRitual": "<one short sentence>"
  },
  "consent": { "scope": ["pre-arrival","on-property","post-stay"], "grantedAt": "<ISO now>" },
  "privacyPosture": "standard",
  "expiresAt": "<ISO now + 5 days>",
  "overrides": {
    "roomTempC": 20,
    "bedding": "down-free",
    "morningRitual": "<same as preferences.morningRitual>",
    "dietary": "<same as preferences.dietary>",
    "privacyPosture": "standard"
  }
}
</manifest>

VALUES:
- roomTempC: integer 16-24, pulled from what elias said. Default 20.
- bedding: one of "down" | "down-free" | "memory". Default "down-free".
- dietary: short sentence from elias's answers (e.g. "vegetarian, no shellfish, tree-nut allergy").
- morningRitual: short sentence from elias (e.g. "long walk + filter coffee").
- privacyPosture: one of "minimal" | "standard" | "full" from elias. Default "standard".`;

interface Manifest {
  guestId: string;
  preferences: { roomTempC: number; bedding: string; dietary: string; morningRitual: string };
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

async function extractManifest(conversation: Turn[]): Promise<Manifest> {
  const client = anthropic();
  const transcript = conversation
    .map((t) => `[${t.role === "threadkeeper" ? "Threadkeeper" : "elias"}] ${t.text}`)
    .join("\n\n");

  // Try up to 2 times — Haiku sometimes skips the wrapping tags on the first
  // pass. Second attempt prefills the assistant turn with "<manifest>" to
  // force-anchor the start of the JSON.
  for (let attempt = 0; attempt < 2; attempt++) {
    const messages: Anthropic.Messages.MessageParam[] = [
      { role: "user", content: transcript },
    ];
    if (attempt === 1) {
      // Prefill an assistant turn beginning with <manifest> so Claude
      // continues inside the tag.
      messages.push({ role: "assistant", content: "<manifest>\n{" });
    }
    const response = await client.messages.create({
      model: MODELS.discretion,
      max_tokens: 700,
      system: MANIFEST_EXTRACT_SYSTEM,
      messages,
    });
    let text = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    // On the prefilled attempt, glue the prefill back so the regex can match.
    if (attempt === 1) text = `<manifest>\n{${text}`;

    const match = text.match(/<manifest>([\s\S]*?)<\/manifest>/);
    if (match) {
      try {
        return JSON.parse(match[1]) as Manifest;
      } catch {
        // fall through to next attempt
      }
    }
  }
  throw new Error("Manifest extraction returned no parseable <manifest> tag after 2 attempts");
}

export async function POST(req: Request): Promise<Response> {
  const bridgeUrl = process.env.ELIAS_BRIDGE_URL;
  if (!bridgeUrl) {
    return Response.json(
      { error: "ELIAS_BRIDGE_URL not set on the server" },
      { status: 503 },
    );
  }
  // Best-effort body parse — defaults below are fine if it's empty.
  try {
    await req.json();
  } catch {
    // permissive
  }

  const startedAt = Date.now();
  const conversation: Turn[] = [];
  const ac = new AbortController();
  const wallClock = setTimeout(() => ac.abort(), WALL_CLOCK_MS);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (payload: unknown) => controller.enqueue(sse(payload));
      const close = () => {
        clearTimeout(wallClock);
        controller.close();
      };

      emit({
        phase: "handoff",
        type: "start",
        payload: {
          mode: "live",
          agents: ["threadkeeper", "elias"],
          bridge: bridgeUrl,
        },
        ts: new Date().toISOString(),
      });

      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          // Threadkeeper turn
          emit({ phase: "handoff", type: "typing", payload: { role: "threadkeeper" }, ts: new Date().toISOString() });
          const tkText = await threadkeeperTurn(conversation);
          const tkClean = tkText.replace(/\[HANDOFF_SEALED\]\s*$/, "").trim();
          conversation.push({ role: "threadkeeper", text: tkClean });
          emit({
            phase: "handoff",
            type: "message",
            payload: { role: "threadkeeper", text: tkClean, latencyMs: Date.now() - startedAt },
            ts: new Date().toISOString(),
          });
          if (tkText.includes("[HANDOFF_SEALED]")) break;

          if (Date.now() - startedAt > WALL_CLOCK_MS - 6000) break;

          // elias turn
          emit({ phase: "handoff", type: "typing", payload: { role: "elias" }, ts: new Date().toISOString() });
          const eliasText = await eliasTurn(conversation, bridgeUrl, ac.signal);
          conversation.push({ role: "elias", text: eliasText });
          emit({
            phase: "handoff",
            type: "message",
            payload: { role: "elias", text: eliasText, latencyMs: Date.now() - startedAt },
            ts: new Date().toISOString(),
          });

          if (Date.now() - startedAt > WALL_CLOCK_MS - 6000) break;
        }

        emit({ phase: "handoff", type: "extracting", ts: new Date().toISOString() });
        const manifest = await extractManifest(conversation);
        emit({ phase: "handoff", type: "manifest", payload: manifest, ts: new Date().toISOString() });
        emit({
          phase: "handoff",
          type: "complete",
          payload: { overrides: manifest.overrides },
          ts: new Date().toISOString(),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emit({
          phase: "handoff",
          type: "error",
          payload: { message: msg, fallbackHint: "Use /api/agent-handoff for the scripted fallback." },
          ts: new Date().toISOString(),
        });
      } finally {
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
