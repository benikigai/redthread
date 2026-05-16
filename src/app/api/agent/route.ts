// Stub endpoint — T2 implements the real agent loop.
// Returns a static Dossier shape so the frontend can wire against the contract.

import { NextResponse } from "next/server";
import type { Dossier, PropertyId } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const propertyId: PropertyId = body?.propertyId ?? "sand-hill";
  const guestId: string = body?.guestId ?? "lin-chen";

  const dossier: Dossier = {
    guestId,
    propertyId,
    generatedAt: new Date().toISOString(),
    bio: "Ms. Lin Chen — founder, fintech. HK ×2, Phuket ×1. First visit to Sand Hill.",
    conversationHooks: [
      "Closed Series B last month — congratulate without prying",
      "Prior HK suite scent (sandalwood) — mention if asked",
      "Pescatarian; loved Henry's at HK — Sea by Alexander's noted",
    ],
    handleWithCare: [
      "Affluential Explorer — extravagant presentations land flat",
      "Quiet table preferred — avoid main dining room",
    ],
    suppressed: [
      { signal: "medical", reason: "Outside Privacy Openness Score floor" },
      { signal: "romantic", reason: "Not relevant to service moment" },
      { signal: "financial-detail-beyond-public", reason: "Discretion Layer policy" },
    ],
    actuators: {
      roomState: {
        climateC: 19,
        lighting: "warm-dim",
        scent: "sandalwood, low",
        bedding: "down-free pillows",
        reasoning: [
          "HK stays: thermostat 19°C twice",
          "Late arrival (15:42 SFO + drive) — wind-down lighting",
        ],
      },
      welcomeAmenity: {
        name: "Heirloom Bartlett pears + Bay Area honey",
        source: "Frog Hollow Farm, Brentwood CA (30 min)",
        dietary: ["vegan-safe", "pescatarian"],
        story: "Sand Hill is oak woodland, not Mediterranean — refuses the macaron",
        reasoning: "Sense of Place native; pescatarian-safe; rejects cookie-cutter luxury",
      },
      itinerary: [
        {
          title: "Private morning hike",
          category: "nature",
          timeOfDay: "morning",
          whyHere: "Windy Hill Preserve, 12 min — oak woodland that defines Sand Hill",
          vendorOrPlace: "Windy Hill Preserve",
          time: "07:00",
          reasoning: "Matches HK spa pattern — morning ritual",
        },
        {
          title: "Dinner — pescatarian-led tasting",
          category: "culinary",
          timeOfDay: "evening",
          whyHere: "Quiet, founder-frequented, echoes Henry's at HK",
          vendorOrPlace: "The Sea by Alexander's",
          time: "19:00",
          reasoning: "Pescatarian; quiet table held; familiar register",
        },
      ],
    },
    toolCalls: [
      { tool: "flight_lookup", status: "complete", result: "UA857 SFO arr 15:42 — 18 min early" },
      { tool: "prior_stays", status: "complete", result: "HK ×2 · Phuket ×1 — flags noted" },
      { tool: "social_signal", status: "complete", result: "Public — Series B announcement" },
      { tool: "placemaker_local", status: "complete", result: "Frog Hollow suggested by Sand Hill Placemaker" },
      { tool: "discretion_filter", status: "complete", result: "3 signals suppressed (auditable)" },
    ],
  };

  return NextResponse.json(dossier);
}
