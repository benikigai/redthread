// ─── Red Thread — shared type contracts (T1 / T2 boundary) ─────────────────
// Keep this file additive. Breaking changes require coordination.

// Active properties have full data files under data/properties/.
// "phuket" exists only as a prior-stay reference (Ms. Chen's history).
export type PropertyId = "sand-hill" | "hong-kong" | "crillon" | "phuket";

export interface Guest {
  id: string;
  name: string;
  honorific?: string;
  pronouns?: string;
  priorStays: PriorStay[];
  dietary: string[];
  preferences: {
    roomTempC?: number;
    pillows?: "down" | "down-free" | "memory";
    scent?: string;
    audio?: "silence" | "ambient" | "preset";
    bedding?: string[];
  };
  publicSignals: {
    role?: string;
    company?: string;
    recentEvents?: string[];
  };
  privacyOpennessScore: number; // 0–100, guest-overridable
}

export interface PriorStay {
  propertyId: PropertyId;
  arrived: string; // ISO date
  nights: number;
  highlights: string[]; // freeform staff notes
  amenityResponses?: { name: string; reaction: "loved" | "neutral" | "declined" }[];
}

// ─── Property data ─────────────────────────────────────────────────────────
export interface Property {
  id: PropertyId;
  name: string;
  locale: string;
  senseOfPlace: string; // one paragraph — what makes this property *here*
  amenityOptions: AmenityOption[]; // curated locally-sourced
  signatureExperiences: Experience[];
  roomDefaults: RoomState;
  placemakers: Placemaker[];
}

export interface AmenityOption {
  name: string;
  source: string; // e.g., "Frog Hollow Farm, Brentwood CA"
  placemaker?: string;
  dietary: string[];
  story: string; // why this is Sense of Place
}

export interface Experience {
  title: string;
  category: "wellness" | "culinary" | "cultural" | "nature" | "shopping";
  timeOfDay: "morning" | "afternoon" | "evening";
  whyHere: string; // Sense of Place anchor
  vendorOrPlace: string;
}

export interface RoomState {
  climateC: number;
  lighting: "bright" | "ambient" | "warm-dim" | "off";
  scent?: string;
  audio?: string;
  bedding?: string;
}

export interface Placemaker {
  name: string;
  domain: string; // e.g., "food critic", "tea master"
  bio: string;
}

// ─── Dossier — the agent's structured output ───────────────────────────────
export interface Dossier {
  guestId: string;
  propertyId: PropertyId;
  generatedAt: string; // ISO

  bio: string; // one-line
  conversationHooks: string[];
  handleWithCare: string[]; // surfaced discretion notes

  // Discretion Layer log — what was suppressed and why
  suppressed: { signal: string; reason: string }[];

  actuators: {
    roomState: RoomState & { reasoning: string[] };
    welcomeAmenity: AmenityOption & { reasoning: string };
    itinerary: (Experience & { time: string; reasoning: string })[];
  };

  // Tool-call provenance for the live agent loop UI
  toolCalls: ToolCallTrace[];
}

export interface ToolCallTrace {
  tool: string;
  status: "queued" | "streaming" | "complete" | "failed";
  args?: unknown;
  result?: string; // one-line summary for the UI
  startedAt?: string;
  finishedAt?: string;
}
