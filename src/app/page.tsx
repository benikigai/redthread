import { Header } from "@/components/Header";
import { ResearchStreams } from "@/components/zones/ResearchStreams";
import { TheBrief } from "@/components/zones/TheBrief";
import { Actuators } from "@/components/zones/Actuators";
import { LiveThread } from "@/components/zones/LiveThread";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-[1480px] px-8 pb-16">
        <Eyebrow />
        <div className="mt-8 grid grid-cols-12 gap-6">
          {/* Zone 1 — Research Streams */}
          <section className="col-span-12 lg:col-span-4">
            <ResearchStreams />
          </section>
          {/* Zone 2 — The Brief (desk view, center column) */}
          <section className="col-span-12 lg:col-span-5">
            <TheBrief />
          </section>
          {/* Zone 3 — Actuators */}
          <section className="col-span-12 lg:col-span-3">
            <Actuators />
          </section>
          {/* Zone 4 — Live Thread (full width below) */}
          <section className="col-span-12 mt-2">
            <LiveThread />
          </section>
        </div>
      </main>
      <footer className="mx-auto w-full max-w-[1480px] px-8 py-8 border-t hairline">
        <div className="flex items-end justify-between gap-4 flex-wrap text-xs text-ink-faint">
          <div>
            <span className="text-ink-mute">Red Thread</span> · built for the Affluential Explorer
          </div>
          <div className="text-right">Hospitality 2030 · Rosewood Sand Hill</div>
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
