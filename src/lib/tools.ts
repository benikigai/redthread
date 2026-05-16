// Claude tool declarations + dispatcher for the Red Thread agent loop.
// - web_search is a Claude-native server tool (Claude executes it; we never see the call here).
// - flight_lookup and crm_cross_property are custom tools dispatched in this process.

import type Anthropic from "@anthropic-ai/sdk";

import { crmCrossProperty } from "@/lib/crm";
import { flightLookup } from "@/lib/flight";

export const TOOL_DEFINITIONS: Anthropic.Messages.ToolUnion[] = [
  // Claude native server tool — research the public web. Type is the latest
  // available in @anthropic-ai/sdk@0.96.x.
  {
    type: "web_search_20260209",
    name: "web_search",
    max_uses: 6,
  },
  {
    name: "flight_lookup",
    description:
      "Look up arrival status for a flight by IATA flight number (e.g. 'UA857'). Returns scheduled/estimated arrival, airline, status, and delay.",
    input_schema: {
      type: "object" as const,
      properties: {
        flightNumber: {
          type: "string" as const,
          description: "IATA flight number, e.g. 'UA857' or 'CX870'.",
        },
      },
      required: ["flightNumber"],
    },
  },
  {
    name: "crm_cross_property",
    description:
      "Retrieve a guest's prior stays across all Rosewood properties. Returns an array of PriorStay objects (propertyId, arrived, nights, highlights, amenityResponses).",
    input_schema: {
      type: "object" as const,
      properties: {
        guestId: {
          type: "string" as const,
          description: "Guest identifier, e.g. 'lin-chen'.",
        },
      },
      required: ["guestId"],
    },
  },
];

export interface ToolCallRecord {
  tool: string;
  args: unknown;
  result: string;
  startedAt: string;
  finishedAt: string;
}

export async function dispatchTool(
  name: string,
  input: unknown,
): Promise<{ result: unknown; summary: string }> {
  const args = (input ?? {}) as Record<string, unknown>;

  switch (name) {
    case "flight_lookup": {
      const flightNumber = typeof args.flightNumber === "string"
        ? args.flightNumber
        : "";
      if (!flightNumber) {
        throw new Error("flight_lookup requires flightNumber (string)");
      }
      const f = await flightLookup(flightNumber);
      const summary = `${f.flightNumber} ${f.origin}→${f.destination} · ${f.status}${
        typeof f.delayMinutes === "number" ? ` (${f.delayMinutes >= 0 ? "+" : ""}${f.delayMinutes} min)` : ""
      }`;
      return { result: f, summary };
    }

    case "crm_cross_property": {
      const guestId = typeof args.guestId === "string" ? args.guestId : "";
      if (!guestId) {
        throw new Error("crm_cross_property requires guestId (string)");
      }
      const stays = crmCrossProperty(guestId);
      const summary = `${stays.length} prior stay${stays.length === 1 ? "" : "s"}: ${
        stays.map((s) => s.propertyId).join(", ")
      }`;
      return { result: stays, summary };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
