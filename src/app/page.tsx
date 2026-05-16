import { Suspense } from "react";

import { DashboardDial } from "@/components/DashboardDial";
import { DemoLoader } from "@/components/DemoLoader";
import { DemoTrigger } from "@/components/DemoTrigger";
import { Header } from "@/components/Header";
import { ResearchStreams } from "@/components/zones/ResearchStreams";
import { TheBrief } from "@/components/zones/TheBrief";
import { Actuators } from "@/components/zones/Actuators";
import { LiveThread } from "@/components/zones/LiveThread";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Reads ?fromIntake=1 + sessionStorage, fetches /api/agent, populates store. */}
      <Suspense fallback={null}>
        <DemoLoader />
      </Suspense>
      <Header />

      {/* Warm cream desk — header + eyebrow + zones float as paper sheets on it */}
      <section className="bg-paper-soft">
        <div className="mx-auto w-full max-w-[1480px] px-8 pb-12">
          <Eyebrow />
          <DemoTrigger />
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

      {/* Hold the Thread — concierge mirror of Ms. Chen's saved POS */}
      <DashboardDial />

      {/* Deep rose band — the live thread lives here. Clean transition, no red bar. */}
      <section className="bg-rose-deep text-on-dark">
        <div className="mx-auto w-full max-w-[1480px] px-8 py-14">
          <LiveThread />
        </div>
      </section>

      {/* Deeper rose footer */}
      <footer className="bg-rose-darker text-on-dark">
        <div className="mx-auto w-full max-w-[1480px] px-8 py-8 flex items-end justify-between gap-4 flex-wrap text-xs">
          <div>
            <span className="text-on-dark font-medium">Red Thread</span>
            <span className="text-on-dark/55"> · built for the Affluential Explorer</span>
          </div>
          <div className="text-right text-on-dark/55">
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
        <h1
          className="font-display font-normal text-[clamp(2.5rem,5vw,4.25rem)] leading-[1.02] tracking-tight mt-5"
          style={{ letterSpacing: "-0.014em" }}
        >
          A sense of place,
          <br />
          <em className="italic text-thread font-normal">threaded</em> through every guest.
        </h1>
      </div>
      <p className="text-ink-mute max-w-[48ch] mt-2" style={{ fontSize: "1.05rem", lineHeight: 1.7 }}>
        Pre-arrival, on-property, post-stay — held with discretion, returned with intention.
      </p>
    </div>
  );
}
