// Red Thread — A2A (agent-to-agent) handoff.
//
// POST /api/agent-handoff  body: { guestId, propertyId }  -> SSE
//
// Streams a scripted six-turn conversation between two agents:
//   - "Threadkeeper" — Rosewood's intake-side agent (Red Thread)
//   - "Atlas" — Ms. Chen's personal AI assistant
//
// Pre-authored for demo reliability. Same artifact as a live two-LLM run
// would produce; the real protocol lives at /.well-known/agent.json.
//
// Final SSE event carries the structured manifest, which the client uses
// as `overrides` against /api/agent so the rest of the dashboard animates
// in with the freshly-negotiated preferences.

export const runtime = "nodejs";
export const maxDuration = 30;

interface HandoffTurn {
  delayMs: number;
  role: "threadkeeper" | "atlas";
  text: string;
}

const SCRIPT: HandoffTurn[] = [
  {
    delayMs: 600,
    role: "threadkeeper",
    text: "Atlas, Threadkeeper here. Ms. Chen lands at HKG tomorrow at sixteen-forty-two on UA857. May I confirm she's still on the booked itinerary?",
  },
  {
    delayMs: 1500,
    role: "atlas",
    text: "Confirmed, Threadkeeper. Itinerary unchanged. She has consented to share her stay preferences with Rosewood Hong Kong for this booking. Signing the manifest now.",
  },
  {
    delayMs: 1300,
    role: "threadkeeper",
    text: "Received. I've countersigned at standard scope — pre-arrival, on-property, post-stay. Two questions before I close: any updates to her sleep or dietary preferences since her last Hong Kong stay?",
  },
  {
    delayMs: 1700,
    role: "atlas",
    text: "Two material updates. She has been sleeping at twenty-one degrees this season — colder than the nineteen you have on file. And the pescatarian trial ended; she is eating shellfish again as of March. The tree-nut allergy stands.",
  },
  {
    delayMs: 1300,
    role: "threadkeeper",
    text: "Noted on both. Privacy Openness Score — still standard for this booking?",
  },
  {
    delayMs: 1400,
    role: "atlas",
    text: "She moved it to minimal last week. Public mentions are out. Stay-only signals are in.",
  },
  {
    delayMs: 1100,
    role: "threadkeeper",
    text: "Understood. Sealing the manifest. Threading the dossier accordingly. Thank you, Atlas.",
  },
];

const MANIFEST_DELAY_MS = 700;

interface ManifestPayload {
  guestId: string;
  preferences: {
    roomTempC: number;
    bedding: "down" | "down-free" | "memory";
    dietary: string;
    morningRitual: string;
  };
  consent: {
    scope: Array<"pre-arrival" | "on-property" | "post-stay">;
    grantedAt: string;
  };
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

function buildManifest(guestId: string): ManifestPayload {
  const now = new Date();
  const inFiveDays = new Date(now.getTime() + 5 * 86400 * 1000);
  const prefs = {
    roomTempC: 21,
    bedding: "down-free" as const,
    dietary: "pescatarian + shellfish ok, tree-nut allergy",
    morningRitual: "harbour-view yoga",
  };
  return {
    guestId,
    preferences: prefs,
    consent: {
      scope: ["pre-arrival", "on-property", "post-stay"],
      grantedAt: now.toISOString(),
    },
    privacyPosture: "minimal",
    expiresAt: inFiveDays.toISOString(),
    overrides: {
      ...prefs,
      privacyPosture: "minimal",
    },
  };
}

function sse(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function POST(req: Request): Promise<Response> {
  let guestId = "ben";
  let propertyId = "hong-kong";
  try {
    const raw = await req.json();
    if (raw && typeof raw === "object") {
      if (typeof raw.guestId === "string") guestId = raw.guestId;
      if (typeof raw.propertyId === "string") propertyId = raw.propertyId;
    }
  } catch {
    // permissive — keep defaults
  }

  const manifest = buildManifest(guestId);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(
        sse({
          phase: "handoff",
          type: "start",
          payload: { guestId, propertyId, agents: ["threadkeeper", "atlas"] },
          ts: new Date().toISOString(),
        }),
      );
      for (const turn of SCRIPT) {
        await new Promise((r) => setTimeout(r, turn.delayMs));
        controller.enqueue(
          sse({
            phase: "handoff",
            type: "typing",
            payload: { role: turn.role },
            ts: new Date().toISOString(),
          }),
        );
        // Tiny gap between "typing" indicator and the actual message — gives
        // the UI a beat to render the typing dots before the text appears.
        await new Promise((r) => setTimeout(r, 350));
        controller.enqueue(
          sse({
            phase: "handoff",
            type: "message",
            payload: { role: turn.role, text: turn.text },
            ts: new Date().toISOString(),
          }),
        );
      }
      await new Promise((r) => setTimeout(r, MANIFEST_DELAY_MS));
      controller.enqueue(
        sse({
          phase: "handoff",
          type: "manifest",
          payload: manifest,
          ts: new Date().toISOString(),
        }),
      );
      controller.enqueue(
        sse({
          phase: "handoff",
          type: "complete",
          payload: { overrides: manifest.overrides },
          ts: new Date().toISOString(),
        }),
      );
      controller.close();
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
