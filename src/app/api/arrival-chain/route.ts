// Red Thread — live arrival-research chain ("show the work").
//
// POST /api/arrival-chain  body: { guestId, propertyId, flightNumber, nationality? }
// Returns SSE — one stream of events per step:
//   - step_start    { id, label }
//   - step_thinking { id, delta }   // Claude streaming tokens
//   - step_complete { id, value, summary }
//   - chain_complete { eta, breakdown }
//
// Steps:
//   01 CRM cross-property         (instant — read data/guests/*.json)
//   02 Flight lookup              (AviationStack live; mock fallback)
//   03 Luggage prediction         (Claude Haiku streaming)
//   04 Customs estimate           (Claude Haiku streaming)
//   05 Transit estimate           (Claude Haiku streaming)
//   06 ETA composition            (math)

import { anthropic, MODELS } from "@/lib/anthropic";
import { getGuest, getProperty } from "@/lib/crm";
import { flightLookup } from "@/lib/flight";
import type { PropertyId } from "@/lib/types";

export const runtime = "nodejs";
// 120s ceiling — 3 web_search steps (~8-15s each) + 3 Haiku reasoning
// (~2-3s each) + flight + ETA composition. Comfortable headroom.
export const maxDuration = 120;

const TRANSIT_MIN: Record<PropertyId, { airport: string; minutes: number; timezone: string }> = {
  "sand-hill": { airport: "SFO", minutes: 28, timezone: "America/Los_Angeles" },
  "hong-kong": { airport: "HKG", minutes: 45, timezone: "Asia/Hong_Kong" },
  crillon: { airport: "CDG", minutes: 50, timezone: "Europe/Paris" },
  phuket: { airport: "HKT", minutes: 75, timezone: "Asia/Bangkok" },
};

interface RequestBody {
  guestId?: string;
  propertyId?: PropertyId;
  flightNumber?: string;
  nationality?: string;
  /** ISO date "YYYY-MM-DD" — the reservation check-in. Used to anchor the
   *  flight landing time-of-day onto the actual arrival date instead of
   *  today (AviationStack returns same-day data). */
  checkIn?: string;
  /** Guest's Hold-the-Thread Privacy Openness Score (0–100). Gates the
   *  deep-web-research steps:
   *    0–30  → all three skipped, surfaced as "gated · minimal band"
   *    31–69 → only press/company research runs (skip LinkedIn + Twitter)
   *    70+   → all three run */
  previewPos?: number;
}

type ResearchBand = "minimal" | "standard" | "full";
function researchBand(pos: number | undefined): ResearchBand {
  if (typeof pos !== "number") return "standard";
  if (pos < 31) return "minimal";
  if (pos < 70) return "standard";
  return "full";
}

function sse(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

/** AviationStack returns same-day data. Project the time-of-day onto the
 *  reservation's check-in date in the property's local timezone, so the
 *  demo's narrative date matches the inputs. */
function projectLandingToCheckIn(
  flightIso: string,
  checkInDate: string | undefined,
  timezone: string,
): string {
  if (!checkInDate) return flightIso;
  // Render the flight's hour:minute in the property's local timezone.
  const flight = new Date(flightIso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(flight);
  const hh = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const mm = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  // Build an ISO string that represents "checkInDate at hh:mm in property TZ".
  // Trick: format the wall-clock string, parse via timezone-aware Date.
  // Easiest correct path: compute the UTC offset of timezone at the target
  // date by stamping checkInDate noon UTC and reading its local-render offset.
  const noonUtc = new Date(`${checkInDate}T12:00:00Z`);
  const tzAtNoon = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(noonUtc);
  const localNoonHour = parseInt(tzAtNoon.find((p) => p.type === "hour")?.value ?? "12", 10);
  const offsetHours = 12 - localNoonHour; // hours to subtract from local → UTC
  const utcHour = hh + offsetHours;
  const projected = new Date(`${checkInDate}T00:00:00Z`);
  projected.setUTCHours(utcHour, mm, 0, 0);
  return projected.toISOString();
}

/** Run a streaming Haiku call and emit one step_thinking event per delta. */
async function streamReasoning(
  stepId: string,
  systemPrompt: string,
  userPrompt: string,
  emit: (e: unknown) => void,
): Promise<{ text: string; valueTag?: string }> {
  const client = anthropic();
  let full = "";
  const stream = client.messages.stream({
    model: MODELS.discretion,
    max_tokens: 380,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta") {
      const delta = event.delta;
      if (delta.type === "text_delta") {
        const piece = delta.text;
        full += piece;
        emit({
          type: "step_thinking",
          payload: { id: stepId, delta: piece },
          ts: new Date().toISOString(),
        });
      }
    }
  }
  await stream.finalMessage();
  // Parse out an optional <value>...</value> tag the system prompt asks for.
  const m = full.match(/<value>([\s\S]*?)<\/value>/);
  return { text: full, valueTag: m?.[1].trim() };
}

const LUGGAGE_SYSTEM = `You estimate whether an arriving hotel guest will carry on or check luggage, given their profile and trip context.

Output ≤120 words of reasoning that cites: trip length, business/leisure context, prior stay patterns, and any explicit signals. End with a <value>...</value> tag containing exactly one of:
  "carry-on only"
  "carry-on + 1 checked"
  "carry-on + 2+ checked"
  "unknown"`;

const CUSTOMS_SYSTEM = `You estimate minutes through customs + immigration + baggage claim for an arriving international traveler, given their nationality, the arrival airport, and the local time.

Output ≤120 words of reasoning citing: passport queue (e-gate eligibility, priority lanes), time-of-day load, baggage claim time if applicable. End with a <value>...</value> tag containing the integer minutes (e.g. "<value>18</value>").`;

const TRANSIT_SYSTEM = `You estimate minutes by taxi/car from an airport to a luxury hotel, given the route and local time of day.

Output ≤120 words of reasoning citing: route geography, day-of-week, time-of-day, typical congestion patterns, and any known disruptions. End with a <value>...</value> tag containing the integer minutes.`;

/** Run a Claude call with the web_search server tool enabled. Streams text
 *  reasoning tokens through emit(); also surfaces the queries Claude
 *  actually ran (server_tool_use blocks). Returns the assembled reasoning. */
async function streamWebResearch(
  stepId: string,
  userPrompt: string,
  emit: (e: unknown) => void,
  maxUses: number = 1,
): Promise<{ text: string; queries: string[]; resultCount: number }> {
  const client = anthropic();
  let full = "";
  const queries: string[] = [];
  let resultCount = 0;

  // Pre-emit a "starting" beat so the card shows life immediately.
  emit({
    type: "step_thinking",
    payload: { id: stepId, delta: "Spawning web_search …\n" },
    ts: new Date().toISOString(),
  });

  const stream = client.messages.stream({
    model: MODELS.discretion,
    max_tokens: 500,
    system:
      "You are a research assistant. Use the web_search tool to find what you're asked about. After running the searches, write ≤100 words summarizing the most relevant findings with source citations. Be specific: cite article titles, dates, profile URLs.",
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: maxUses }],
    messages: [{ role: "user", content: userPrompt }],
  });

  for await (const event of stream) {
    if (event.type === "content_block_start") {
      const block = event.content_block;
      if (block.type === "server_tool_use" && block.name === "web_search") {
        // Query may not be in input yet; we'll fill it from finalMessage.
        emit({
          type: "step_thinking",
          payload: { id: stepId, delta: "\n→ web_search firing…\n" },
          ts: new Date().toISOString(),
        });
      } else if (block.type === "web_search_tool_result") {
        const list = Array.isArray(block.content) ? block.content : [];
        resultCount += list.length;
        emit({
          type: "step_thinking",
          payload: { id: stepId, delta: `   ${list.length} result${list.length === 1 ? "" : "s"} returned\n` },
          ts: new Date().toISOString(),
        });
      }
    } else if (event.type === "content_block_delta") {
      const delta = event.delta;
      if (delta.type === "text_delta") {
        full += delta.text;
        emit({
          type: "step_thinking",
          payload: { id: stepId, delta: delta.text },
          ts: new Date().toISOString(),
        });
      }
    }
  }

  // Pull final message to read the actual queries (input is now resolved).
  const final = await stream.finalMessage();
  for (const block of final.content) {
    if (block.type === "server_tool_use" && block.name === "web_search") {
      const q = (block.input as { query?: string }).query;
      if (q) queries.push(q);
    }
  }
  return { text: full, queries, resultCount };
}

export async function POST(req: Request): Promise<Response> {
  let body: RequestBody = {};
  try {
    const raw = await req.json();
    if (raw && typeof raw === "object") body = raw as RequestBody;
  } catch {
    // permissive
  }
  const guestId = body.guestId ?? "ben";
  const propertyId = (body.propertyId ?? "hong-kong") as PropertyId;
  const flightNumber = body.flightNumber ?? "CX872";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (payload: unknown) => controller.enqueue(sse(payload));
      const close = () => controller.close();

      emit({
        type: "chain_start",
        payload: { guestId, propertyId, flightNumber },
        ts: new Date().toISOString(),
      });

      try {
        // ── Step 01 — CRM cross-property ─────────────────────────────
        emit({
          type: "step_start",
          payload: { id: "crm", label: "Cross-property CRM lookup" },
          ts: new Date().toISOString(),
        });
        const guest = getGuest(guestId);
        const property = getProperty(propertyId);
        const stays = guest.priorStays;
        const stayLabel = stays
          .map((s) => `${s.propertyId} ${s.arrived}`)
          .join(", ");
        emit({
          type: "step_complete",
          payload: {
            id: "crm",
            value: `${stays.length} prior stays`,
            summary: `Pulled ${guest.name}'s record. ${stays.length} prior stays — ${stayLabel}. Dietary: ${(guest.dietary ?? []).join(", ") || "—"}.`,
            data: {
              priorStays: stays.length,
              dietary: guest.dietary,
              roomTempC: guest.preferences.roomTempC,
              privacyOpennessScore: guest.privacyOpennessScore,
            },
          },
          ts: new Date().toISOString(),
        });

        // Hold-the-Thread band — gates which web-research steps actually run.
        const band = researchBand(body.previewPos);
        const runLinkedIn = band === "full";
        const runTwitter = band === "full";
        const runPress = band === "full" || band === "standard";

        const gatedNote = (label: string): string =>
          band === "minimal"
            ? `Suppressed — guest set Hold the Thread to minimal. ${label} not run.`
            : `Suppressed — standard band keeps only press/company research. ${label} not run.`;

        // ── Step 02 — LinkedIn deep research (full band only) ────────
        emit({
          type: "step_start",
          payload: { id: "linkedin", label: "Web research · LinkedIn" },
          ts: new Date().toISOString(),
        });
        if (!runLinkedIn) {
          emit({
            type: "step_thinking",
            payload: { id: "linkedin", delta: gatedNote("LinkedIn lookup") },
            ts: new Date().toISOString(),
          });
          emit({
            type: "step_complete",
            payload: {
              id: "linkedin",
              value: `gated · ${band} band`,
              summary: gatedNote("LinkedIn lookup"),
              data: { gated: true, band },
            },
            ts: new Date().toISOString(),
          });
        } else {
          const linkedinPrompt = `Find ${guest.name}'s LinkedIn profile and recent professional activity.
Known context: ${guest.publicSignals.role ?? "founder"} at ${guest.publicSignals.company ?? "unknown company"}.
Run a LinkedIn-targeted search and a follow-up if needed. Summarize role, employer, and any recent posts or career events.`;
          const li = await streamWebResearch("linkedin", linkedinPrompt, emit, 2);
          emit({
            type: "step_complete",
            payload: {
              id: "linkedin",
              value: `${li.queries.length} ${li.queries.length === 1 ? "query" : "queries"} · ${li.resultCount} results`,
              summary: li.text.slice(0, 200),
              data: { queries: li.queries },
            },
            ts: new Date().toISOString(),
          });
        }

        // ── Step 03 — Twitter / X (full band only) ───────────────────
        emit({
          type: "step_start",
          payload: { id: "twitter", label: "Web research · X / Twitter" },
          ts: new Date().toISOString(),
        });
        if (!runTwitter) {
          emit({
            type: "step_thinking",
            payload: { id: "twitter", delta: gatedNote("X / Twitter lookup") },
            ts: new Date().toISOString(),
          });
          emit({
            type: "step_complete",
            payload: {
              id: "twitter",
              value: `gated · ${band} band`,
              summary: gatedNote("X / Twitter lookup"),
              data: { gated: true, band },
            },
            ts: new Date().toISOString(),
          });
        } else {
          const twitterPrompt = `Find ${guest.name}'s X (Twitter) presence and recent public posts.
Known context: ${guest.publicSignals.role ?? "founder"} at ${guest.publicSignals.company ?? "unknown company"}.
Run an X / Twitter-targeted search (try "site:twitter.com" or "site:x.com"). Summarize handle, recent posts, and tone.`;
          const tw = await streamWebResearch("twitter", twitterPrompt, emit, 2);
          emit({
            type: "step_complete",
            payload: {
              id: "twitter",
              value: `${tw.queries.length} ${tw.queries.length === 1 ? "query" : "queries"} · ${tw.resultCount} results`,
              summary: tw.text.slice(0, 200),
              data: { queries: tw.queries },
            },
            ts: new Date().toISOString(),
          });
        }

        // ── Step 04 — Press / company research (standard + full) ─────
        emit({
          type: "step_start",
          payload: { id: "press", label: "Web research · Press + company" },
          ts: new Date().toISOString(),
        });
        if (!runPress) {
          emit({
            type: "step_thinking",
            payload: { id: "press", delta: gatedNote("Press / company lookup") },
            ts: new Date().toISOString(),
          });
          emit({
            type: "step_complete",
            payload: {
              id: "press",
              value: `gated · ${band} band`,
              summary: gatedNote("Press / company lookup"),
              data: { gated: true, band },
            },
            ts: new Date().toISOString(),
          });
        } else {
          const recent = (guest.publicSignals.recentEvents ?? []).slice(0, 2).join(" · ") || "general press";
          const pressPrompt = `Find recent press / public coverage about ${guest.name} or ${guest.publicSignals.company ?? "their company"}.
Hints from CRM: ${recent}.
Run targeted press / news searches; summarize the most recent two or three items with dates.`;
          const pr = await streamWebResearch("press", pressPrompt, emit, 2);
          emit({
            type: "step_complete",
            payload: {
              id: "press",
              value: `${pr.queries.length} ${pr.queries.length === 1 ? "query" : "queries"} · ${pr.resultCount} results`,
              summary: pr.text.slice(0, 200),
              data: { queries: pr.queries },
            },
            ts: new Date().toISOString(),
          });
        }

        // ── Step 05 — Flight lookup ──────────────────────────────────
        emit({
          type: "step_start",
          payload: { id: "flight", label: `Flight lookup — ${flightNumber}` },
          ts: new Date().toISOString(),
        });
        const flight = await flightLookup(flightNumber);
        // AviationStack returns same-day flight data. For a future reservation
        // (e.g. May 29) anchor the landing time-of-day to the reservation
        // check-in date so the narrative reads "lands May 29 18:55" instead
        // of "lands today 06:09."
        const landingIso = projectLandingToCheckIn(
          flight.estimatedArrival,
          body.checkIn,
          TRANSIT_MIN[propertyId].timezone,
        );
        const landingLocal = new Date(landingIso).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: TRANSIT_MIN[propertyId].timezone,
        });
        const delayPhrase =
          typeof flight.delayMinutes === "number"
            ? flight.delayMinutes >= 0
              ? `${flight.delayMinutes} min late`
              : `${Math.abs(flight.delayMinutes)} min early`
            : "on time";
        emit({
          type: "step_complete",
          payload: {
            id: "flight",
            value: `${flight.flightNumber} · ${flight.status} · ${delayPhrase}`,
            summary: `${flight.flightNumber} (${flight.airline}): ${flight.origin}→${flight.destination}, lands ${landingLocal} local. Status: ${flight.status}.`,
            data: {
              flightNumber: flight.flightNumber,
              origin: flight.origin,
              destination: flight.destination,
              landingIso,
              landingLocal,
              status: flight.status,
              delayMinutes: flight.delayMinutes,
            },
          },
          ts: new Date().toISOString(),
        });

        // ── Step 03 — Luggage prediction (Haiku streaming) ───────────
        emit({
          type: "step_start",
          payload: { id: "luggage", label: "Luggage prediction" },
          ts: new Date().toISOString(),
        });
        const luggagePrompt = `Guest: ${guest.name}, ${guest.publicSignals.role ?? "founder"}, ${guest.publicSignals.company ?? ""}.
Trip: ${property.name} — checking in for a short business stay (likely 2-3 nights).
Prior stays: ${stays.length} (${stays.map((s) => `${s.propertyId} for ${s.nights}n`).join(", ")}).
Behavioral signals: typically packs light on business trips, carries a laptop bag + a small soft duffel based on past stay notes.

Predict luggage. End with <value>...</value> tag.`;
        const lug = await streamReasoning("luggage", LUGGAGE_SYSTEM, luggagePrompt, emit);
        const luggageValue = lug.valueTag ?? "unknown";
        const luggageMinutes = luggageValue.startsWith("carry-on only") ? 0 : 12;
        emit({
          type: "step_complete",
          payload: {
            id: "luggage",
            value: luggageValue,
            summary: `Prediction: ${luggageValue}${luggageMinutes ? ` (+${luggageMinutes} min for bag claim)` : " (skip bag claim)"}.`,
            data: { value: luggageValue, addedMinutes: luggageMinutes },
          },
          ts: new Date().toISOString(),
        });

        // ── Step 04 — Customs estimate (Haiku streaming) ─────────────
        emit({
          type: "step_start",
          payload: { id: "customs", label: "Customs + immigration estimate" },
          ts: new Date().toISOString(),
        });
        const customsPrompt = `Airport: ${TRANSIT_MIN[propertyId].airport}
Local arrival: ${landingLocal} (${landingIso})
Nationality: ${body.nationality ?? "American"}
Luggage: ${luggageValue}

Estimate minutes through customs + immigration + (if applicable) baggage claim. End with <value>...</value> tag containing the integer minutes.`;
        const cust = await streamReasoning("customs", CUSTOMS_SYSTEM, customsPrompt, emit);
        const customsMinutes = parseInt(cust.valueTag ?? "20", 10) || 20;
        emit({
          type: "step_complete",
          payload: {
            id: "customs",
            value: `${customsMinutes} min`,
            summary: `Estimated ${customsMinutes} minutes through customs + immigration.`,
            data: { minutes: customsMinutes },
          },
          ts: new Date().toISOString(),
        });

        // ── Step 05 — Transit estimate (Haiku streaming) ─────────────
        emit({
          type: "step_start",
          payload: { id: "transit", label: `Transit — airport to ${property.name}` },
          ts: new Date().toISOString(),
        });
        const transitDefault = TRANSIT_MIN[propertyId];
        const localHour = new Date(landingIso).toLocaleString("en-US", {
          hour: "2-digit",
          hour12: false,
          timeZone: TRANSIT_MIN[propertyId].timezone,
        });
        const localDay = new Date(landingIso).toLocaleString("en-US", {
          weekday: "long",
          timeZone: TRANSIT_MIN[propertyId].timezone,
        });
        const transitPrompt = `Route: ${transitDefault.airport} → ${property.name} (${property.locale}).
Local day-of-week: ${localDay}
Local arrival hour: ${localHour}:00 (24h)
Baseline typical drive: ${transitDefault.minutes} minutes (no traffic).

Estimate realistic minutes for this route at this day + time. Cite typical congestion. End with <value>...</value> tag containing the integer minutes.`;
        const tr = await streamReasoning("transit", TRANSIT_SYSTEM, transitPrompt, emit);
        const transitMinutes =
          parseInt(tr.valueTag ?? String(transitDefault.minutes), 10) || transitDefault.minutes;
        emit({
          type: "step_complete",
          payload: {
            id: "transit",
            value: `${transitMinutes} min`,
            summary: `Estimated ${transitMinutes} min taxi from ${transitDefault.airport} to ${property.name}.`,
            data: { minutes: transitMinutes, airport: transitDefault.airport },
          },
          ts: new Date().toISOString(),
        });

        // ── Step 06 — ETA composition ────────────────────────────────
        emit({
          type: "step_start",
          payload: { id: "eta", label: "ETA at porte cochère" },
          ts: new Date().toISOString(),
        });
        const totalAfterLanding = customsMinutes + luggageMinutes + transitMinutes;
        const eta = new Date(new Date(landingIso).getTime() + totalAfterLanding * 60_000);
        const etaLocal = eta.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: TRANSIT_MIN[propertyId].timezone,
        });
        emit({
          type: "step_complete",
          payload: {
            id: "eta",
            value: etaLocal,
            summary: `Lands ${landingLocal} · +${customsMinutes} customs · ${luggageMinutes ? `+${luggageMinutes} bags · ` : ""}+${transitMinutes} transit = ${etaLocal} at the porte cochère.`,
            data: {
              landingLocal,
              customsMinutes,
              luggageMinutes,
              transitMinutes,
              etaLocal,
              etaIso: eta.toISOString(),
            },
          },
          ts: new Date().toISOString(),
        });

        emit({
          type: "chain_complete",
          payload: {
            etaLocal,
            totalAfterLanding,
            breakdown: { customsMinutes, luggageMinutes, transitMinutes },
          },
          ts: new Date().toISOString(),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emit({
          type: "error",
          payload: { message: msg },
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
