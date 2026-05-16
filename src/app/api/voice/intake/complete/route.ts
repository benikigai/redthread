// Red Thread — voice intake completion handler.
//
// POST /api/voice/intake/complete  body: { conversationId: string }
//
// After the browser's ElevenLabs Convai widget finishes the 5-question intake,
// the client posts the conversation_id here. We fetch the conversation from
// ElevenLabs (server-side — API key never reaches the browser), extract the
// data_collection.values, and return them in our domain shape ready to feed
// into the agent loop as overrides.

export const runtime = "nodejs";
export const maxDuration = 30;

interface RequestBody {
  conversationId: string;
}

interface IntakeResult {
  conversationId: string;
  status: string;
  roomTempC?: number;
  bedding?: "down" | "down-free" | "memory";
  morningRitual?: string;
  dietary?: string;
  privacyPosture?: "minimal" | "standard" | "full";
  privacyOpennessScore?: number;
  transcript?: string;
}

const POS_FROM_POSTURE: Record<string, number> = {
  minimal: 20,
  standard: 55,
  full: 85,
};

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function normalizeBedding(v: unknown): "down" | "down-free" | "memory" | undefined {
  const s = asString(v)?.toLowerCase();
  if (!s) return undefined;
  if (s.includes("memory")) return "memory";
  if (s.includes("free") || s.includes("hypoallergenic")) return "down-free";
  if (s.includes("down")) return "down";
  return undefined;
}

function normalizePrivacy(v: unknown): "minimal" | "standard" | "full" | undefined {
  const s = asString(v)?.toLowerCase();
  if (!s) return undefined;
  if (s.startsWith("min")) return "minimal";
  if (s.startsWith("std") || s.startsWith("stan")) return "standard";
  if (s.startsWith("full")) return "full";
  return undefined;
}

export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ELEVENLABS_API_KEY not set" }, { status: 503 });
  }

  let body: RequestBody;
  try {
    const raw = await req.json();
    if (!raw || typeof raw !== "object" || typeof raw.conversationId !== "string") {
      return Response.json(
        { error: "Body requires conversationId (string)" },
        { status: 400 },
      );
    }
    body = raw as RequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(body.conversationId)}`;
  let upstream: Response;
  try {
    upstream = await fetch(url, { headers: { "xi-api-key": apiKey } });
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

  const conv = (await upstream.json()) as {
    conversation_id?: string;
    status?: string;
    analysis?: {
      data_collection_results?: Record<string, { value?: unknown; rationale?: string }>;
    };
    transcript?: Array<{ role?: string; message?: string }>;
  };

  const dc = conv.analysis?.data_collection_results ?? {};
  const privacy = normalizePrivacy(dc.privacy_posture?.value);
  const result: IntakeResult = {
    conversationId: conv.conversation_id ?? body.conversationId,
    status: conv.status ?? "unknown",
    roomTempC: asNumber(dc.room_temp_c?.value),
    bedding: normalizeBedding(dc.bedding?.value),
    morningRitual: asString(dc.morning_ritual?.value),
    dietary: asString(dc.dietary?.value),
    privacyPosture: privacy,
    privacyOpennessScore: privacy ? POS_FROM_POSTURE[privacy] : undefined,
    transcript: (conv.transcript ?? [])
      .filter((t) => typeof t.message === "string")
      .map((t) => `${t.role ?? "?"}: ${t.message}`)
      .join("\n"),
  };

  return Response.json(result);
}
