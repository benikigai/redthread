// Red Thread — voice route. Proxies the "Brief me" ritual through ElevenLabs.
//
// POST /api/voice  body: { text: string, voiceId?: string }
//
// Streams MP3 back. Caches identical (text, voiceId) requests on disk so
// repeat demo plays are free. Voice defaults to Alice (calm British female,
// the Rosewood concierge register).

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";

const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "Xb7hH8MSUJpSbSDYk0k2";
const MODEL_ID = "eleven_turbo_v2_5";
const CACHE_DIR = "/tmp/voice-cache";

const VOICE_SETTINGS = {
  stability: 0.55,
  similarity_boost: 0.75,
  style: 0.2,
  use_speaker_boost: true,
};

interface RequestBody {
  text: string;
  voiceId?: string;
}

function cacheKey(text: string, voiceId: string): string {
  return createHash("sha256").update(`${voiceId}::${text}`).digest("hex");
}

function audioResponse(bytes: Uint8Array): Response {
  // Cast through unknown because Node 25 / TS5 narrows the Uint8Array generic
  // (`Uint8Array<ArrayBufferLike>`) tighter than the Response BodyInit union.
  // At runtime Uint8Array is a valid BodyInit.
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=3600",
      "Content-Length": String(bytes.byteLength),
    },
  });
}

export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ELEVENLABS_API_KEY not set" },
      { status: 503 },
    );
  }

  let body: RequestBody;
  try {
    const raw = await req.json();
    if (!raw || typeof raw !== "object" || typeof raw.text !== "string" || !raw.text.trim()) {
      return Response.json({ error: "Body requires text (non-empty string)" }, { status: 400 });
    }
    body = raw as RequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const voiceId = body.voiceId?.trim() || DEFAULT_VOICE_ID;
  const text = body.text.trim();

  // Cache hit
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, `${cacheKey(text, voiceId)}.mp3`);
  if (existsSync(cachePath)) {
    return audioResponse(readFileSync(cachePath));
  }

  // Live ElevenLabs call
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=mp3_44100_128`;
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: VOICE_SETTINGS,
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Upstream fetch failed: ${msg}` }, { status: 502 });
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return Response.json(
      { error: `ElevenLabs ${upstream.status}`, detail: detail.slice(0, 500) },
      { status: 502 },
    );
  }

  const bytes = new Uint8Array(await upstream.arrayBuffer());
  try {
    writeFileSync(cachePath, bytes);
  } catch {
    // Cache write failures shouldn't block the response — log and continue.
  }
  return audioResponse(bytes);
}
