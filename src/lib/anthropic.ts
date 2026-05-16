import Anthropic from "@anthropic-ai/sdk";

// Singleton — instantiate once per server process.
let _client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY not set. Drop your key into .env.local — see .env.example.",
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

// Model picks — see Ideas doc.
//   Opus 4.7 → main agent loop (planning + tool use)
//   Haiku 4.5 → Discretion Layer (fast, principled filtering)
export const MODELS = {
  agent: "claude-opus-4-7",
  discretion: "claude-haiku-4-5",
} as const;
