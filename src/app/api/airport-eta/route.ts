// Red Thread — airport ETA estimator.
//
// POST /api/airport-eta  body: { flightNumber, nationality?, propertyId }
//
// Returns: ETA at the porte cochère, broken into (landing → customs → bags →
// transit). Customs+bags is a Haiku call (~2s) given nationality + arrival
// local time + airport business signal. Transit time is per-property hardcoded.

import Anthropic from "@anthropic-ai/sdk";

import { anthropic, MODELS } from "@/lib/anthropic";
import { flightLookup } from "@/lib/flight";
import { getProperty } from "@/lib/crm";
import type { PropertyId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

interface RequestBody {
  flightNumber: string;
  nationality?: string;
  propertyId: PropertyId;
}

// Drive times from each property's airport to the porte cochère, in minutes.
// Source: property knowledge / Google Maps spot checks. Conservative midday.
const TRANSIT_MIN: Record<PropertyId, { airport: string; minutes: number }> = {
  "sand-hill": { airport: "SFO", minutes: 28 },
  "hong-kong": { airport: "HKG", minutes: 45 },
  crillon: { airport: "CDG", minutes: 50 },
  phuket: { airport: "HKT", minutes: 75 },
};

interface CustomsEstimate {
  minutes: number;
  reasoning: string;
}

async function estimateCustomsAndBags(
  airport: string,
  nationality: string | undefined,
  scheduledIsoLocal: string,
): Promise<CustomsEstimate> {
  const client = anthropic();
  const system = `You estimate customs + baggage time for arriving international travelers. Output strictly one JSON object: {"minutes": <int>, "reasoning": "<one short sentence>"}. No prose, no code fences. Be specific: cite the airport, day-of-week, hour band (early-morning / midday / evening / late-night), and nationality if given. Minutes range: 4 (e-gate priority, no checked bags) to 75 (heavy hour, manual passport). Default to 25 if uncertain.`;
  const user = `Airport: ${airport}\nScheduled arrival (local): ${scheduledIsoLocal}\nNationality: ${nationality ?? "unknown"}\nAssume one carry-on and one checked bag unless something obvious in the data suggests otherwise.`;
  const response = await client.messages.create({
    model: MODELS.discretion, // Haiku 4.5 — cheap + fast
    max_tokens: 256,
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no json in response");
    const parsed = JSON.parse(match[0]) as { minutes?: number; reasoning?: string };
    const minutes =
      typeof parsed.minutes === "number" && parsed.minutes >= 0 && parsed.minutes <= 180
        ? Math.round(parsed.minutes)
        : 25;
    return { minutes, reasoning: parsed.reasoning ?? "Default estimate (parsed shape was off)." };
  } catch {
    return { minutes: 25, reasoning: "Default — Claude returned unparseable estimate." };
  }
}

export async function POST(req: Request): Promise<Response> {
  let body: RequestBody;
  try {
    const raw = await req.json();
    if (!raw || typeof raw !== "object" || !raw.flightNumber || !raw.propertyId) {
      return Response.json(
        { error: "Body requires flightNumber and propertyId" },
        { status: 400 },
      );
    }
    body = raw as RequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let property;
  try {
    property = getProperty(body.propertyId);
  } catch {
    return Response.json({ error: `Unknown propertyId: ${body.propertyId}` }, { status: 400 });
  }

  const flight = await flightLookup(body.flightNumber);
  const transit = TRANSIT_MIN[body.propertyId];
  const customs = await estimateCustomsAndBags(
    transit.airport,
    body.nationality,
    flight.estimatedArrival,
  );

  const landed = new Date(flight.estimatedArrival);
  const etaPorte = new Date(landed.getTime() + (customs.minutes + transit.minutes) * 60_000);

  return Response.json({
    flight: {
      flightNumber: flight.flightNumber,
      airline: flight.airline,
      origin: flight.origin,
      destination: flight.destination,
      scheduledArrival: flight.scheduledArrival,
      estimatedArrival: flight.estimatedArrival,
      status: flight.status,
      delayMinutes: flight.delayMinutes ?? 0,
    },
    customs,
    transit: { ...transit, property: property.name, locale: property.locale },
    etaAtPorte: etaPorte.toISOString(),
    totalMinutesAfterLanding: customs.minutes + transit.minutes,
    narration: `ETA at the porte cochère: ${etaPorte
      .toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}. ${customs.reasoning} ${customs.minutes} through customs and bags, ${transit.minutes} to ${property.locale.split(",")[0]}.`,
  });
}
