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
export const maxDuration = 60;

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

        // ── Step 02 — Flight lookup ──────────────────────────────────
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
