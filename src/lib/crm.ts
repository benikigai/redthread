// Mock CRM — reads guest and property data from the data/ JSON files.
// Used by the agent loop as the data substrate for prior stays + property knowledge.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Guest, Property, PropertyId, PriorStay } from "@/lib/types";

const DATA_DIR = join(process.cwd(), "data");

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function getGuest(guestId: string): Guest {
  try {
    return readJson<Guest>(join(DATA_DIR, "guests", `${guestId}.json`));
  } catch {
    throw new Error(`Unknown guestId: ${guestId}`);
  }
}

export function getProperty(propertyId: PropertyId): Property {
  try {
    return readJson<Property>(
      join(DATA_DIR, "properties", `${propertyId}.json`),
    );
  } catch {
    throw new Error(`Unknown propertyId: ${propertyId}`);
  }
}

export function crmCrossProperty(guestId: string): PriorStay[] {
  return getGuest(guestId).priorStays;
}
