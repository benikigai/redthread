# Red Thread — Judge Pitch

**Event:** Hospitality 2030 · Rosewood Sand Hill · 2026-05-16
**Submission deadline:** 5:00 PM PT
**Live site:** [redthread.boutique](https://redthread.boutique)
**Demo app:** [app.redthread.boutique](https://app.redthread.boutique)

---

## The two-minute pitch

> Luxury hospitality has a contradiction at its center. Rosewood's promise is **A Sense of Place** — but the operating system underneath is cookie-cutter. The same welcome amenity. The same itinerary template. The same room defaults regardless of who walks in.
>
> **Red Thread is the agentic OS that resolves the contradiction.** Ms. Lin Chen arrives at Sand Hill — and the system has already cast the thread: her Phuket vegetarian cooking class, her 19°C room preference, her sandalwood scent from Hong Kong, her Series B announcement last month. Not because we surveilled her. Because **she set the dial herself.** In her own Red Thread profile, Ms. Chen holds the thread at six of ten — the system anticipates her professional life and her room preferences, but never speculates about family, health, or anything she hasn't shared publicly. She can dial it down to *Loosely held* and we keep nothing but her dietary and bedding preferences. She can dial it up to *Fully held* and we anticipate her calendar across properties. The floor of what we refuse to surface never moves with the dial. **She trades anticipation depth — never safety.**
>
> Switch the property to Hong Kong. Same Ms. Chen, same dial setting. The dossier re-runs in seconds. Now her welcome amenity is a hand-painted mooncake from Kee Wah. Her morning is Tai Chi on the Asaya rooftop. Her evening is Yat Lok roast goose — pescatarian-adjusted. **Same guest, radically different bespoke service.** That's the anti-cookie-cutter demo.
>
> Switch to the Crillon. Pierre Hermé macarons. Musée d'Orsay pre-opening. Les Ambassadeurs pescatarian tasting. The thread continues across properties — because Rosewood's properties already share a guest. They just haven't been threaded.
>
> Under the hood: Claude Opus 4.7 runs the research loop with parallel tool calls — flight status, CRM cross-property, web_search for public signals. Claude Haiku 4.5 runs the **Discretion Layer** — the second pass that honors the dial position and strips everything below the line, with every removal logged for Ms. Chen's review. ElevenLabs Alice gives the front-desk concierge a 20-second voice brief on her way to the door. And we publish a static `/.well-known/agent.json` — the 2030 bet that guest agents will negotiate with property agents directly.
>
> This isn't a chatbot bolted to a hotel. It's the **operationalisation of Relationship Hospitality** — Sonia Cheng's framing — for the Affluential Explorer who already expects you to remember. And it's the answer to the question every hospitality executive is currently asking AI vendors: *"how do I make sure this doesn't get me sued or fired?"* The answer is the dial in the guest's hand — and the audit log behind it.

**Time check:** ~2:00 read at conversational pace.

---

## The 30-second version (elevator)

Red Thread is an agentic operating system for luxury hospitality. Same guest, three Rosewood properties — Sand Hill, Hong Kong, Crillon — get three radically different bespoke arrivals because the agent threads her history, her flight, her preferences, and the property's **Sense of Place** into a live dossier. The guest holds a single dial — *Hold the Thread* — that decides how much the system anticipates; a Discretion Layer enforces her setting with an audit log she can read. The front desk gets a voice brief. The guest experiences "they remembered," not "they tracked me."

---

## The opening line (use verbatim)

> "Rosewood's promise is *A Sense of Place*. The technology underneath is cookie-cutter. We built the operating system that closes the gap."

---

## The closing line (use verbatim)

> "The thread is cast before she lands. Held while she's here. Continues after she leaves. That's not a feature. That's the operating system Rosewood already promised — we just shipped it."

---

## Why this wins (judge talking points)

### 1. It maps to Rosewood's own strategic language

We did not invent a theme. We operationalised Rosewood's:

- **A Sense of Place** (trademarked 1979) — the compass for every actuator
- **Relationship Hospitality** (Sonia Cheng's framing) — the *dossier* is this principle made executable
- **Affluential Explorer** — Rosewood's named target guest persona
- **Discovery** (the 2025 rebrand keyword) — our loading state literally reads *"Threading the dossier…"*

Judges from Rosewood leadership will recognise every phrase.

### 2. The dial is in the guest's hand — and the Discretion Layer enforces it

Every luxury AI demo this weekend will be a chatbot. Ours is the only one with **a slider the guest controls and a second model whose only job is to honor it**. Ms. Chen's profile screen has a single control — **Hold the Thread** — running from *Loosely held* to *Fully held* on a ten-point scale. The Discretion Layer (Claude Haiku 4.5) takes the candidate dossier and her dial setting and removes everything that crosses the line, logging every removal into `Dossier.suppressed[]` for her review.

Drag the slider on stage and **watch the dossier breathe.** At two of ten, the conversation hooks evaporate and the brief reads "guest is privacy-conscious — standard luxury service." At nine, the suppressed log empties and her Series B announcement surfaces as a conversation opener. The floor — no health, no romance, no family, no non-public sources — never moves with the slider.

This is the answer to the question every hospitality executive is currently asking AI vendors: *"how do I make sure this doesn't get me sued or fired?"* The dial puts the answer in the guest's hand and the audit trail in the operator's.

### 3. The property switcher is the demo moment

One guest. Three properties. Three completely different bespoke arrivals — generated live. Welcome amenity, room state, itinerary, conversation hooks — all reasoned from the same source data through the same agent loop, but anchored to each property's Sense of Place. **Watching the same Ms. Chen get a mooncake in Hong Kong, Bartlett pears at Sand Hill, and Pierre Hermé macarons in Paris is the un-cookie-cutter promise made literal.**

### 4. `/.well-known/agent.json` is the 2030 forward bet

The brief is "Hospitality 2030." Our submission ships an actual agent-to-agent handoff manifest at a public well-known URL. When the guest's own agent eventually wants to negotiate dietary, accessibility, and itinerary preferences with the property's agent, this is the endpoint it'll call. Greycroft and the Rosewood venture team will recognise the move.

### 5. The Discretion Layer is the Greycroft answer to "regulation risk"

Two-pass architecture (research → filter) is the GDPR-compatible, EU AI Act-compatible, board-defensible answer. Most demos hand-wave this. Ours has it in the data contract: `Dossier.suppressed[]` is a first-class field.

---

## Anticipated Q&A bank

### "How is this different from a CRM with AI on top?"
> A CRM stores what staff observed. Red Thread *reasons* across stays, properties, and public signals — and decides what to surface. Property-aware: the same guest history yields a Bartlett-pear-and-Tartine welcome in Menlo Park and a mooncake-and-Lock-Cha-tea welcome in Hong Kong. A CRM gives you data. Red Thread gives you a *commitment* — the actuators are what the system promises to do.

### "What stops the model from hallucinating?"
> Three layers. (1) The agent loop is tool-grounded — flight data from AviationStack, prior stays from the CRM, public signals from Claude's native `web_search`. The dossier cites every signal. (2) The Discretion Layer is a second model whose system prompt explicitly refuses speculation about wealth, romance, family, health, or minors. (3) Every actuator carries a `reasoning` field tied back to a `ToolCallTrace` — staff can audit *why* the system suggested the Filoli docent tour and not the Stanford game.

### "What about privacy / GDPR / the EU AI Act?"
> Built in at the data layer **and** in the UI. Every guest has a `privacyOpennessScore` (0–100, guest-overridable). The guest controls it through **Hold the Thread** in their own profile — a ten-point dial with three bands: *Loosely held* (dietary + room only), *Held* (professional accomplishments), *Fully held* (with surveillance-feeling content still redacted). The Discretion Layer enforces the setting on every dossier; every removal is logged in `Dossier.suppressed[]` with the reason. The guest reads her own log. The property reads its own audit trail. Same data, two compliance stories.

### "Wait — who can move the dial?"
> Only the guest, through her profile. The concierge dashboard *mirrors* the current setting and lets staff preview what other levels would look like for training — but saving requires the guest's consent through her own app. We are deliberate about this. Putting the slider in the concierge's hand would invert the brand promise.

### "Why two models — why not just Opus?"
> Separation of concerns. Opus 4.7 is good at research and synthesis. Haiku 4.5 is fast, cheap, and *boring* — which is exactly what you want in a filter. A model that's actively trying to be helpful is the wrong model to ask "what should we *not* say." We get a 10× cost reduction on the filtering pass and a cleaner audit trail.

### "Could this actually run in a Rosewood property?"
> The architecture is property-portable today. Each property is a JSON file with `senseOfPlace`, `amenityOptions`, `signatureExperiences`, and `placemakers`. Sand Hill's file references Frog Hollow Farm and Cantor Arts; Hong Kong references Kee Wah Bakery and the M+ Museum. To add Le Guanahani or Phare, a property manager writes one file. The agent loop and Discretion Layer don't change.

### "What's the agent.json thing?"
> A static manifest at `/.well-known/agent.json` describing how a guest's personal agent can hand off preferences to the property's agent. It's the bet that by 2030, guests won't fill out preference forms — their agents will negotiate the stay. Today it's a forward-compatibility shim. By the time it matters, we'll already be the implementation other properties point to.

### "Can it handle a property it's never seen?"
> The agent loop is property-agnostic — it reads whatever's in the property JSON and reasons against it. New property = new JSON file with the same shape. Placemakers, amenities, and experiences are data, not code.

### "What's the demo if the wifi dies?"
> `DEMO_MODE=1` short-circuits the agent loop and replays pre-captured fixture dossiers — same UI, same property switcher, same voice brief, no network. We rehearsed both paths.

### "What did you build today vs. before the hack?"
> Everything you see was built today, in this room. Two terminals — T1 frontend, T2 backend — built in parallel under a written working agreement. Type contract in `src/lib/types.ts` is the seam. Commit log is in the repo.

### "Why 'red thread'?"
> The Chinese 紅線 — the invisible thread that connects people fated to meet. Borrowed deliberately. Rosewood Hong Kong is the Cheng family's flagship; the etymology earns its place. And it names the actual product behavior — the thread is cast pre-arrival, held on-property, continues post-stay.

### "Business model?"
> Per-property SaaS, priced on dossiers generated. Initial wedge is the existing Rosewood portfolio (16 properties; same guest, same preferences, currently siloed). Expansion is to the Cheng family's broader luxury portfolio, then to comparable independent groups (Aman, Belmond, Six Senses). We don't sell to chains that don't believe Sense of Place is the product — they're not a fit.

### "Why are you the team to build this?"
> [Team-specific — fill in: founder backgrounds, hospitality domain, AI infra]

---

## Speaking-time targets

| Section | Target time |
|---|---|
| Opening line | 0:08 |
| Setup (the contradiction) | 0:20 |
| Lin Chen walks through one property | 0:30 |
| Property switcher money shot (live) | 0:25 |
| **Hold the Thread — drag the dial live** | **0:35** |
| Voice brief moment (play one) | 0:18 |
| agent.json forward bet | 0:12 |
| Closing line | 0:12 |
| **Total** | **~2:40** |

If we have 4 minutes: keep all of the above with breathing room.
If we have 3: drop agent.json to 0:08, voice brief to 0:12 — total ~2:25.
If we have 2: opening → switcher → **dial** → close. The dial is non-negotiable; it is the demo.
If we have 1: opening line → dial (drag from 6 → 2 → 9) → closing line.
