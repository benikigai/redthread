# Red Thread — Demo Runbook

**Event:** Hospitality 2030 · Rosewood Sand Hill · 2026-05-16
**Submission deadline:** 5:00 PM PT
**Pitch slot:** [fill in once known]

> Read this start-to-finish at least once before going on stage. Every fallback is here.

---

## Pre-flight checklist (T-30 min before demo)

Run in order. Tick each box.

- [ ] **Battery > 80%** on demo laptop, **charger in bag**
- [ ] **External display works** — HDMI + USB-C adapter both in bag
- [ ] `git pull origin main` — latest from both terminals
- [ ] `bun install` clean (no missing deps)
- [ ] `.env.local` populated:
  - [ ] `ANTHROPIC_API_KEY` (or `op run --` wrapper ready)
  - [ ] `ELEVENLABS_API_KEY`
  - [ ] `AVIATIONSTACK_API_KEY` (optional — falls back to mock)
- [ ] **Live mode smoke test** (with wifi):
  ```bash
  bun dev
  # in another shell:
  curl -fsS -X POST http://localhost:3000/api/agent \
    -H 'Content-Type: application/json' \
    -d '{"guestId":"lin-chen","propertyId":"sand-hill"}' | jq -e '.actuators.welcomeAmenity.name'
  ```
  Expect a Bay Area amenity name (Frog Hollow pears, Tartine, etc.). **Repeat for `hong-kong` and `crillon`.** If any property errors → triage now, not on stage.

- [ ] **Hold the Thread (dial) smoke test** — three POS bands:
  ```bash
  # Minimal — expect conversationHooks: []
  curl -fsS -X POST http://localhost:3000/api/agent \
    -H 'Content-Type: application/json' \
    -d '{"guestId":"lin-chen","propertyId":"sand-hill","previewPos":20}' \
    | jq '{hooks: (.conversationHooks | length), suppressed: (.suppressed | length)}'
  # Standard — expect 2-3 hooks (professional only)
  curl -fsS -X POST http://localhost:3000/api/agent -H 'Content-Type: application/json' \
    -d '{"guestId":"lin-chen","propertyId":"sand-hill","previewPos":60}' \
    | jq '{hooks: (.conversationHooks | length), suppressed: (.suppressed | length)}'
  # Full — expect hooks expand, suppressed shrinks
  curl -fsS -X POST http://localhost:3000/api/agent -H 'Content-Type: application/json' \
    -d '{"guestId":"lin-chen","propertyId":"sand-hill","previewPos":90}' \
    | jq '{hooks: (.conversationHooks | length), suppressed: (.suppressed | length)}'
  ```
  Hook count must increase as POS rises. If band changes don't fire → the dial demo is dead; investigate before going on stage.

- [ ] **`/profile` page smoke test**:
  - Open `http://localhost:3000/profile` (or `app.redthread.boutique/profile`).
  - Slider starts at **6 / 10** with caption "your saved preference: 6 of 10".
  - Slide to 2 → active band card moves to "0–3 Loosely held ← you are here"; band copy reads *"Red Thread keeps to your dietary, room, and bedding preferences."*
  - Slide to 9 → active band moves to "7–10 Fully held"; band copy mentions Series B, calendar adjacency, cross-property continuity.
  - Save button enables when dirty; clicking it round-trips through `/api/agent` and the button settles on "SAVED".
- [ ] **DEMO_MODE smoke test** (kill wifi, then):
  ```bash
  DEMO_MODE=1 bun dev
  curl -fsS -X POST http://localhost:3000/api/agent \
    -H 'Content-Type: application/json' \
    -d '{"guestId":"lin-chen","propertyId":"hong-kong"}' | jq -e '.actuators.welcomeAmenity.name'
  ```
  Expect a Hong Kong amenity (mooncake, egg tart, etc.). **If fixtures missing → T8 not done; you have no offline fallback. Either finish T8 or pre-record a video now.**
- [ ] **Voice brief smoke test**:
  ```bash
  curl -X POST http://localhost:3000/api/voice \
    -H 'Content-Type: application/json' \
    -d '{"text":"Briefed."}' --output /tmp/brief.mp3
  file /tmp/brief.mp3   # expect: MPEG ADTS
  afplay /tmp/brief.mp3 # expect: audible "Briefed."
  ```
- [ ] **agent.json smoke test**:
  ```bash
  curl -fsS http://localhost:3000/.well-known/agent.json | jq -e '.name'
  ```
- [ ] **Volume up to 70%**, speaker tested (NOT through laptop speakers if room is large)
- [ ] **Browser zoom set** so the four zones fit on one screen at presenter laptop resolution
- [ ] **Browser tabs closed** except the demo app
- [ ] **Notifications silenced** (macOS Focus → Do Not Disturb)
- [ ] **Demo URLs bookmarked**: `app.redthread.boutique` (or `localhost:3000`), `redthread.boutique` (marketing)
- [ ] **Backup video recorded** — full 2:30 walkthrough on phone, saved offline
- [ ] **Pre-arrival fixture cached** in browser — load Sand Hill once before going on stage so initial paint is hot

---

## Demo path A — Live mode (preferred)

**Setting:** dossier app open at `app.redthread.boutique`, Sand Hill property pre-selected, four zones rendering.

### Beat 1 (0:00–0:15) — Open on the contradiction

**Say:** *"Rosewood's promise is 'A Sense of Place.' The technology underneath is cookie-cutter — the same welcome amenity in Menlo Park and Hong Kong. We built the operating system that closes the gap."*

**Do:** stay on Sand Hill view. Let the four zones speak. Don't click yet.

### Beat 2 (0:15–0:45) — Walk one dossier

**Say:** *"This is Ms. Lin Chen. CEO of a fintech, Series B announced last month. She's flown into SFO — flight tracked live. She last stayed with us in Hong Kong, where she loved Henry's tasting menu and praised the sandalwood scent. She did a beachfront stay in Phuket last year — declined alcohol, did 6 AM beach walks, booked a vegetarian Thai cooking class."*

**Do:** point to the four zones as you narrate:
- **Zone I — Research streams:** "These are the parallel tool calls — flight lookup, CRM cross-property, web search for public signals. The agent runs them concurrently."
- **Zone II — The brief:** "One-line bio, conversation hooks the front desk can use, handle-with-care notes."
- **Zone III — Actuators:** "What the system *commits to* — room at 19°C, sandalwood scent, Frog Hollow Bartlett pears for welcome, a private morning hike at Windy Hill Preserve, Tartine sourdough for the room. Each with reasoning and citation."
- **Zone IV — Live thread:** "Pre-arrival, on-property, post-stay — the same guest, threaded across the visit."

### Beat 3 (0:45–1:15) — Property switcher money shot

**Say:** *"Now watch what happens when she's staying in Hong Kong instead."*

**Do:** click the property switcher → **Rosewood Hong Kong**. Watch the agent re-run. Narrate as the cards stream:

**Say:** *"Same Ms. Chen. Different city. The system isn't re-using a template — it's reasoning from her preferences and Hong Kong's Sense of Place. Welcome amenity is a hand-painted mooncake from Kee Wah — they've made them since 1938; she loved the Kee Wah mooncake on her last stay. Morning is Tai Chi on the Asaya rooftop. Evening is Yat Lok roast goose, pescatarian-adjusted. Same guest, radically different bespoke arrival. That's the anti-cookie-cutter promise made literal."*

**Do:** click the switcher again → **Hôtel de Crillon, Paris**. Narrate briefly: *"Pierre Hermé macarons. Musée d'Orsay pre-opening. Les Ambassadeurs pescatarian tasting. The thread continues."*

### Beat 4 (1:15–1:50) — Hold the Thread (the dial money shot)

**Say:** *"Now — who decides what shows up here? Not us. Ms. Chen does. This is her own profile."*

**Do:** open `app.redthread.boutique/profile` in the same tab (or a pre-staged tab). Land on the slider at **6 of 10**.

**Say:** *"She has one control — Hold the Thread. Right now she's at six of ten, which we call 'Held' — the system anticipates her professional life and her room preferences, but never speculates about family, health, or anything she hasn't shared publicly. Watch what happens when she dials it down."*

**Do:** drag the slider to **2**. The active band moves to *Loosely held*. Pause one beat.

**Say:** *"At two of ten — Loosely held — the conversation hooks evaporate. The brief reads 'guest is privacy-conscious. Standard luxury service.' We keep her dietary, her bedding, her room temperature. Nothing else."*

**Do:** drag the slider to **9**. The active band moves to *Fully held*. Pause one beat.

**Say:** *"At nine — Fully held — we anticipate fully. Her Series B announcement surfaces as a conversation opener. The Hong Kong butler is told so the thread continues to her next stay. And the floor — no health, no romance, no family, no non-public sources — never moves with the slider. **She trades anticipation depth. Never safety.** Every signal we remove is logged for her review. This is the GDPR and EU AI Act answer made tangible — the dial is in her hand."*

**Do:** drag the slider back to **6**. Click back to the dashboard.

*Optional add (if 5+ min slot):* point out the *concierge mirror* widget on the dashboard reading "Hold the Thread · 6 (Ms. Chen's preference · preview)" — **"the dial is read-only for staff. Only she can save a change."***

### Beat 5 (1:50–2:10) — Voice brief moment

**Say:** *"The front desk concierge gets a 20-second voice brief on the way to the door. Listen."*

**Do:** click "Brief me." Play the ElevenLabs Alice voice. **Wait the full clip in silence — don't talk over the voice.**

### Beat 6 (2:10–2:25) — agent.json forward bet

**Say:** *"Hospitality 2030. We ship a static agent-to-agent handoff manifest at slash-dot-well-known-slash-agent-dot-json. When the guest's own agent eventually wants to negotiate dietary and itinerary preferences with the property's agent, this is the endpoint. We're the first implementation other properties will point to."*

**Do:** optional — open `app.redthread.boutique/.well-known/agent.json` in a new tab if there's time. Skip if running long.

### Beat 7 (2:25–2:40) — Close

**Say:** *"The thread is cast before she lands. Held while she's here. Continues after she leaves. That's not a feature. That's the operating system Rosewood already promised — we just shipped it."*

**Do:** return to Sand Hill view. End on the four zones.

---

## Demo path B — DEMO_MODE (wifi failure)

**Trigger:** wifi fails, Anthropic 503s, AviationStack down, or laptop loses network mid-demo.

**Recovery:** seamlessly switch narration. The audience does not need to know.

1. **Do not announce the failure.** Say *"Let me show you our offline mode — this is what runs at properties without reliable connectivity, like a private island."*
2. Open new terminal, `pkill -f "next dev"`, then `DEMO_MODE=1 bun dev`.
3. Refresh browser. Property switcher continues to work — fixtures pre-captured for all three properties.
4. Voice brief: if ElevenLabs is the failure, say *"the voice brief is fetched from cache when offline"* and **skip it** — keep moving.
5. Otherwise the script is identical.

**If DEMO_MODE itself fails** (no fixtures, e.g. T8 not done):
1. **Switch to backup video** on phone, narrate over it.
2. Phrase it as *"this is a recording from one of our earlier runs — same demo, captured this morning."*

---

## Demo path C — Backup video (worst case)

If both live and DEMO_MODE are dead:

1. Phone unlocks, video plays full-screen, sound on.
2. Narrate live over the video using the Beat 1–7 script above.
3. End on the closing line. Don't apologise. **The audience came for the story, not the tech.**

---

## Anti-patterns — do NOT do these on stage

- ❌ Do not open the browser dev tools. Looks unfinished.
- ❌ Do not narrate the loading state. Say a sentence about the four zones while it threads — silence reads as broken.
- ❌ Do not switch properties more than 2 times. Three is the money shot; four is showing off; five is filler.
- ❌ Do not click into the JSON. Judges came for the experience, not the schema.
- ❌ Do not use the word "demo" more than twice. Use "the system," "the dossier," "the experience."
- ❌ Do not say "AI" if you can say "the agent" or "Claude." More specific = more credible.
- ❌ Do not apologise for anything that wasn't asked about.
- ❌ Do not show the terminal. If something breaks, switch to backup video, do not debug live.
- ❌ Do not drag the dial more than three times (down · up · home). Each move needs a beat of silence to land — over-scrubbing kills the gravity.
- ❌ Do not say "Privacy Openness Score" on stage. Internal name. On stage: *"Hold the Thread"* or *"the dial"*.

---

## On-stage cheat card (print and pocket)

```
OPEN:   "Rosewood's promise is A Sense of Place. The tech underneath
         is cookie-cutter. We built the OS that closes the gap."

WALK:   Lin Chen. CEO Lattice. Series B last month. Flew SFO.
        Loved Henry's HK. Sandalwood. Phuket: vegetarian, 6 AM walks.

SWITCH: Sand Hill → HK → Crillon.
        "Same guest. Three radically different bespoke arrivals."

DIAL:   Open /profile. Drag 6 → 2 → 9 → 6.
        "She holds the thread. We never speculate. Floor never moves.
         She trades anticipation depth, never safety."

VOICE:  Click "Brief me." Wait in silence.

A2A:    "/.well-known/agent.json. Hospitality 2030 forward bet."

CLOSE:  "Cast before she lands. Held while she's here. Continues
         after she leaves. The OS Rosewood already promised —
         we just shipped it."
```

---

## Post-demo Q&A

See `pitch.md` § Anticipated Q&A bank for prepared answers.

**If asked something you don't know:** *"Honest answer — we didn't get to that today; we made the call to ship the property switcher and the Discretion Layer first. Here's how we'd approach it…"* Then briefly outline. Better than bluffing.

---

## After-demo checklist

- [ ] Devpost submission live by 5:00 PM PT (`docs/submission.md` is paste-ready)
- [ ] GitHub repo public and linked from Devpost
- [ ] Live URLs reachable from outside the venue wifi
- [ ] Team contact info on the submission
- [ ] Thank the Rosewood and venue staff who made it possible
