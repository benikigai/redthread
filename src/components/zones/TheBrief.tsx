"use client";

import { ZoneShell } from "./ZoneShell";
import { BriefMeButton, composeNarrationFromDossier } from "@/components/BriefMeButton";
import { useDossier } from "@/lib/dossierStore";

const STATIC_NARRATION =
  "Mr. Benjamin Shyong — founder of OpenClaw, returning to Rosewood Hong Kong for FinTech Week. Room is set: twenty degrees, ambient low, down-free pillows, neutral scent. Welcome amenity is a Lock Cha tea flight, three estates. Itinerary held: a six-thirty harbour walk with filter coffee on return; a three o'clock private tea ceremony at Wing Lee Street with Selena Lai; and a vegetarian tasting at Chaat in the evening. Two conversation hooks. The Discretion Layer suppressed three signals, auditable. The thread is held.";

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
        <h3 className="font-display text-3xl leading-tight">Mr. Benjamin Shyong</h3>
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
          Mr. Benjamin Shyong
          <span className="text-ink-faint italic font-light text-base ml-2">/ HK ×2 · Sand Hill ×1</span>
        </h3>
        <p className="font-display italic text-ink-mute text-lg mt-2 leading-snug">
          Founder, OpenClaw / Injester. Returning to Rosewood Hong Kong for FinTech Week.
        </p>
      </div>

      <div>
        <div className="caps mb-2">Conversation hooks</div>
        <ul className="space-y-1.5 text-sm text-ink-mute">
          <li>· FinTech Week keynote last October — reference only if he raises it</li>
          <li>· Asked about Lock Cha private session at last checkout — Selena Lai is available</li>
          <li>· Vegetarian (corrected from stale 2024 pescatarian tag); tree-nut allergy is hard</li>
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
