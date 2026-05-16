"use client";

import { ZoneShell } from "./ZoneShell";
import { BriefMeButton, composeNarrationFromDossier } from "@/components/BriefMeButton";
import { useDossier } from "@/lib/dossierStore";

const STATIC_NARRATION =
  "Ms. Lin Chen — founder, fintech, first visit to Sand Hill. Room is set: nineteen degrees, warm dim, down-free pillows, sandalwood low. Welcome amenity is heirloom Bartlett pears with Bay Area honey, from Frog Hollow Farm, thirty minutes from property. Itinerary held: a seven AM private hike at Windy Hill; and a pescatarian tasting at The Sea by Alexander's. Conversation hooks. Closed Series B last month — congratulate without prying. The Discretion Layer suppressed three signals, auditable. The thread is held.";

export function TheBrief() {
  const dossier = useDossier((s) => s.dossier);

  return (
    <ZoneShell label="Zone II" title="The brief" hint="Desk view. What the concierge actually sees.">
      {dossier ? <BriefLive /> : <BriefStatic />}
    </ZoneShell>
  );
}

function BriefLive() {
  const dossier = useDossier((s) => s.dossier);
  if (!dossier) return null;
  const narration = composeNarrationFromDossier(dossier);
  return (
    <div className="space-y-6">
      <div>
        <div className="caps mb-2 text-thread-deep">Returning guest · live</div>
        <h3 className="font-display text-3xl leading-tight">Ms. Lin Chen</h3>
        <p className="font-display italic text-ink-mute text-lg mt-2 leading-snug">
          {dossier.bio}
        </p>
      </div>

      {dossier.conversationHooks.length > 0 && (
        <div>
          <div className="caps mb-2">Conversation hooks</div>
          <ul className="space-y-1.5 text-sm text-ink-mute">
            {dossier.conversationHooks.map((h, i) => (
              <li key={i}>· {h}</li>
            ))}
          </ul>
        </div>
      )}

      {dossier.handleWithCare.length > 0 && (
        <div className="border hairline bg-paper-soft px-4 py-3">
          <div className="caps text-thread-deep mb-2">Handle with care</div>
          <ul className="space-y-1.5 text-sm text-ink-mute leading-snug">
            {dossier.handleWithCare.map((h, i) => (
              <li key={i}>· {h}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="border hairline bg-paper-soft px-4 py-3">
        <div className="caps text-thread-deep mb-2">Discretion Layer</div>
        <p className="text-sm text-ink-mute leading-snug">
          {dossier.suppressed.length} signal{dossier.suppressed.length === 1 ? "" : "s"} suppressed. Auditable.
        </p>
      </div>

      <BriefMeButton narration={narration} />
    </div>
  );
}

function BriefStatic() {
  return (
    <div className="space-y-6">
      <div>
        <div className="caps mb-2">Returning guest</div>
        <h3 className="font-display text-3xl leading-tight">
          Ms. Lin Chen
          <span className="text-ink-faint italic font-light text-base ml-2">/ HK ×2 · Phuket ×1</span>
        </h3>
        <p className="font-display italic text-ink-mute text-lg mt-2 leading-snug">
          Founder, fintech. First visit to Sand Hill. Quiet luxury — has been everywhere.
        </p>
      </div>

      <div>
        <div className="caps mb-2">Conversation hooks</div>
        <ul className="space-y-1.5 text-sm text-ink-mute">
          <li>· Closed Series B last month — congratulate without prying</li>
          <li>· Prior HK suite scent (sandalwood) — mention if asked</li>
          <li>· Pescatarian; loved Henry&apos;s at HK — Sea by Alexander&apos;s noted</li>
        </ul>
      </div>

      <div className="border hairline bg-paper-soft px-4 py-3">
        <div className="caps text-thread-deep mb-2">Handle with care</div>
        <p className="text-sm text-ink-mute leading-snug">
          Discretion Layer suppressed 3 signals (medical, romantic, financial detail beyond
          public). Auditable.
        </p>
      </div>

      <BriefMeButton narration={STATIC_NARRATION} />
    </div>
  );
}
