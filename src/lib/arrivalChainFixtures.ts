// Red Thread — pre-baked arrival-chain fixtures.
//
// The /api/arrival-chain route is real Claude end-to-end, but the live demo
// can stall when Anthropic's web_search server tool takes 10-30s per call.
// To keep the pitch flowing, /api/arrival-chain checks for a fixture here
// first and replays it with realistic per-event timing. POS gating still
// applies — minimal/standard bands suppress the LinkedIn/Twitter steps
// even on replay.
//
// To keep this maintainable: only the web_research steps are pre-baked.
// CRM, flight, luggage, customs, transit, ETA still compute live (those
// are fast and need the user's inputs).

export interface WebResearchFixture {
  queries: string[];
  resultCount: number;
  reasoning: string;
  durationMs: number;
}

// keyed by guestId (we only have two demo guests; the same fixtures fit
// either property since web research is about the person, not the hotel)
const FIXTURES: Record<string, { linkedin: WebResearchFixture; twitter: WebResearchFixture; press: WebResearchFixture }> = {
  ben: {
    linkedin: {
      queries: [`site:linkedin.com "Benjamin Shyong" OpenClaw`],
      resultCount: 6,
      reasoning: `Located Benjamin Shyong's LinkedIn profile — Founder & CEO at OpenClaw / Injester, listed as an AI infrastructure company. Recent activity (last 90 days) includes the Series A announcement post (March 2026) and a thread about the Stanford GSB AI for Operations cohort he visited in May. Profile lists Bay Area as home base, prior stints in Hong Kong tech, and explicit comfort with public posting. Confirms CRM signals: founder profile, AI infra, recent funding event.`,
      durationMs: 5400,
    },
    twitter: {
      queries: [`site:x.com OR site:twitter.com "Benjamin Shyong" OR @benshyong`],
      resultCount: 4,
      reasoning: `Found an X presence linked from his LinkedIn. Recent posts are mostly technical — agent frameworks, MCP, and a couple of threads about Hong Kong's fintech scene around the FinTech Week keynote (October 2025). Tone: dry, builder-flavored, no personal life surfaced. Useful conversation hooks: agent infrastructure, HK fintech. Nothing private or surveillance-y.`,
      durationMs: 4900,
    },
    press: {
      queries: [`"OpenClaw" Series A 2026 announcement`],
      resultCount: 9,
      reasoning: `OpenClaw's Series A coverage (March 2026): TechCrunch, The Information, and Fortune all picked it up. Round size and lead investor are publicly disclosed. Secondary coverage cites HK FinTech Week keynote (Oct 2025) and a brief mention in a Stanford GSB AI for Operations alumni post (May 2026). All findings match CRM publicSignals — no contradictions, no surprises.`,
      durationMs: 7200,
    },
  },
  "lin-chen": {
    linkedin: {
      queries: [`site:linkedin.com "Lin Chen" Lattice Capital fintech`],
      resultCount: 3,
      reasoning: `Identity confidence: moderate. LinkedIn returns multiple "Lin Chen" profiles; one matches the CRM context — listed as Founder & CEO at Lattice Capital (fintech, Hong Kong). Profile is sparse — minimal activity, locked posts, no photo on public view. Suggests intentional low-profile posture. Cross-checks her CRM role and HK base.`,
      durationMs: 5100,
    },
    twitter: {
      queries: [`site:x.com OR site:twitter.com "Lin Chen" Lattice Capital`],
      resultCount: 2,
      reasoning: `No verifiable X presence under the matching profile. Two unrelated accounts with similar names — neither cites Lattice Capital. Conclusion: she likely does not maintain a public X presence, which aligns with her privacy posture. Do not surface speculative handles to staff.`,
      durationMs: 4600,
    },
    press: {
      queries: [`"Lin Chen" "Lattice Capital" fintech Series B`],
      resultCount: 7,
      reasoning: `Found Lattice Capital's Series B announcement (April 2026) in Asian Investor and a brief Bloomberg pickup. Also a Hong Kong FinTech Week 2025 keynote listing matching the CRM. Coverage is professional / industry-trade only — no personal-life press, which matches her standard-band posture.`,
      durationMs: 6800,
    },
  },
};

export function getWebResearchFixtures(guestId: string) {
  return FIXTURES[guestId] ?? FIXTURES.ben;
}
