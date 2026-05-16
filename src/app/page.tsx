import { Header } from "@/components/Header";
import { ResearchStreams } from "@/components/zones/ResearchStreams";
import { TheBrief } from "@/components/zones/TheBrief";
import { Actuators } from "@/components/zones/Actuators";
import { LiveThread } from "@/components/zones/LiveThread";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col">
      <Header />

      {/* White section — eyebrow + three top zones */}
      <section className="bg-paper">
        <div className="mx-auto w-full max-w-[1480px] px-8 pb-12">
          <Eyebrow />
          <div className="mt-8 grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-4">
              <ResearchStreams />
            </div>
            <div className="col-span-12 lg:col-span-5">
              <TheBrief />
            </div>
            <div className="col-span-12 lg:col-span-3">
              <Actuators />
            </div>
          </div>
        </div>
      </section>

      {/* Full-bleed red thread bar — the literal divider */}
      <div
        className="h-[3px] w-full"
        style={{ background: "#C8102E", boxShadow: "0 0 24px rgba(200,16,46,0.35)" }}
        aria-hidden="true"
      />

      {/* Sage-deep band — the live thread lives here */}
      <section className="bg-sage-deep">
        <div className="mx-auto w-full max-w-[1480px] px-8 py-12">
          <LiveThread />
        </div>
      </section>

      {/* Dark footer band */}
      <footer className="bg-[#1A1A1A] text-paper/75">
        <div className="mx-auto w-full max-w-[1480px] px-8 py-8 flex items-end justify-between gap-4 flex-wrap text-xs">
          <div>
            <span className="text-paper">Red Thread</span> · built for the Affluential Explorer
          </div>
          <div className="text-right text-paper/50">
            Hospitality 2030 · Rosewood Sand Hill
          </div>
        </div>
      </footer>
    </div>
  );
}

function Eyebrow() {
  return (
    <div className="mt-10 flex items-end justify-between gap-8 flex-wrap">
      <div className="max-w-[60ch]">
        <div className="caps flex items-center gap-3">
          <span className="inline-block w-6 h-px bg-thread" />
          Live dossier
        </div>
        <h1 className="font-display font-light text-[clamp(2.5rem,5vw,4.25rem)] leading-[0.98] tracking-tight mt-4">
          A sense of place,
          <br />
          <em className="italic text-thread">threaded</em> through every guest.
        </h1>
      </div>
      <p className="font-display italic text-ink-mute text-lg max-w-[34ch] leading-snug">
        Pre-arrival, on-property, post-stay — held with discretion, returned with intention.
      </p>
    </div>
  );
}
