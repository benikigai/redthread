// Capture a live agent run into a fixture for DEMO_MODE=1 replay.
//
// Usage:
//   bun scripts/capture-fixture.ts <guestId> <propertyId> [flightNumber]
//
// Hits POST /api/agent in JSON mode and writes data/fixtures/<g>__<p>.json
// in the { dossier } shape consumed by src/app/api/agent/route.ts.

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const [, , guestId, propertyId, flightNumber] = process.argv;
if (!guestId || !propertyId) {
  console.error("Usage: bun scripts/capture-fixture.ts <guestId> <propertyId> [flightNumber]");
  process.exit(1);
}

const BASE = process.env.AGENT_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = join(process.cwd(), "data", "fixtures");
const OUT_PATH = join(OUT_DIR, `${guestId}__${propertyId}.json`);

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const body: Record<string, string> = { guestId, propertyId };
if (flightNumber) body.flightNumber = flightNumber;

console.log(`POST ${BASE}/api/agent ${JSON.stringify(body)}`);
const t0 = Date.now();
const res = await fetch(`${BASE}/api/agent`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
if (!res.ok) {
  console.error(`HTTP ${res.status} after ${elapsed}s`);
  console.error(await res.text());
  process.exit(1);
}
const dossier = await res.json();
writeFileSync(OUT_PATH, JSON.stringify({ dossier }, null, 2) + "\n");
console.log(`✓ wrote ${OUT_PATH} (${elapsed}s, ${dossier.toolCalls?.length ?? 0} tool calls)`);
