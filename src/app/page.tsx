import { Suspense } from "react";

import { ContinuityOffers } from "@/components/ContinuityOffers";
import { DashboardDial } from "@/components/DashboardDial";
import { WeeklyAgentDialog } from "@/components/WeeklyAgentDialog";
import { DemoLoader } from "@/components/DemoLoader";
import { DemoTrigger } from "@/components/DemoTrigger";
import { Header } from "@/components/Header";
import { InStayEventInjector } from "@/components/InStayEventInjector";
import { ProblemTwoContext } from "@/components/ProblemTwoContext";
import { ReservationIntake } from "@/components/ReservationIntake";
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
      <section className="bg-paper-canvas">
        <div className="mx-auto w-full max-w-[1480px] px-8 pb-12">
          <Eyebrow />
          <ReservationIntake />
          {/* Read-only Hold-the-Thread band — guest controls this on /profile */}
          <DashboardDial />
          {/* Demo callout — maps the dial + Discretion Layer to Problem 2
              ("The Invisible Concierge"). Always visible. */}
          <ProblemTwoContext />
          {/* The next two only render at POS 9-10 (Fully bespoke) — A2A weekly
              call transcript on top, the offers it produced below. */}
          <WeeklyAgentDialog />
          <ContinuityOffers />
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

      {/* Deep rose band — the live thread lives here. Clean transition, no red bar. */}
      <section className="bg-rose-deep text-on-dark">
        <div className="mx-auto w-full max-w-[1480px] px-8 py-14">
          {/* Hotel-system signal injector — feeds in-stay beats into LiveThread */}
          <InStayEventInjector />
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
            <a
              href="https://cerebralvalley.ai/e/rosewood-hospitality-2030/details"
              target="_blank"
              rel="noopener noreferrer"
              className="border-b border-current hover:text-thread transition-colors"
            >
              Hospitality 2030
            </a>{" "}
            · Rosewood Sand Hill
          </div>
        </div>
      </footer>
    </div>
  );
}

function Eyebrow() {
  return (
    <div className="mt-8 flex items-end justify-between gap-8 flex-wrap">
      <div>
        <div className="caps flex items-center gap-3">
          <span className="inline-block w-6 h-px bg-thread" />
          Live dossier
        </div>
        <p className="font-display italic text-ink-mute text-lg mt-3 leading-snug max-w-[48ch]">
          Pre-arrival research streaming · held with discretion, returned with intention.
        </p>
      </div>
    </div>
  );
}
