"use client";

import * as React from "react";
import { Stepper, useAutoPlay } from "@/components/ui/stepper";

const STEPS = [
  {
    title: "Welcome aboard",
    body: "A quick tour of the basics. It takes under a minute.",
  },
  {
    title: "Start a project",
    body: "Begin from a blank canvas or pick one of the templates.",
  },
  {
    title: "Invite your team",
    body: "Share a link so others can comment and edit with you.",
  },
  {
    title: "Stay in sync",
    body: "Changes show up for everyone the moment they happen.",
  },
  {
    title: "You are all set",
    body: "Open your first project whenever you are ready.",
  },
];

/** One original drawing per step, from plain shapes. */
const ART: React.ReactNode[] = [
  // Welcome: a sun rising over a horizon.
  <g key="welcome">
    <circle cx="120" cy="100" r="34" opacity="0.85" />
    <rect x="16" y="104" width="208" height="31" className="fill-muted" />
    <rect x="40" y="101" width="160" height="6" rx="3" opacity="0.2" />
  </g>,
  // Start a project: a canvas with a plus.
  <g key="project">
    <rect x="72" y="35" width="96" height="80" rx="14" opacity="0.15" />
    <rect x="116" y="57" width="8" height="36" rx="4" opacity="0.85" />
    <rect x="102" y="71" width="36" height="8" rx="4" opacity="0.85" />
  </g>,
  // Invite your team: three overlapping faces.
  <g key="team">
    <circle cx="88" cy="75" r="24" opacity="0.2" />
    <circle cx="152" cy="75" r="24" opacity="0.2" />
    <circle cx="120" cy="75" r="28" opacity="0.85" />
  </g>,
  // Stay in sync: two devices joined by a link.
  <g key="sync">
    <rect x="44" y="45" width="56" height="60" rx="10" opacity="0.85" />
    <rect x="140" y="45" width="56" height="60" rx="10" opacity="0.2" />
    <rect x="100" y="72" width="40" height="6" rx="3" opacity="0.5" />
  </g>,
  // All set: a check in a circle.
  <g key="done">
    <circle cx="120" cy="75" r="38" opacity="0.85" />
    <path
      d="M102 76l12 12 24-26"
      fill="none"
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="stroke-muted"
    />
  </g>,
];

function Art({ step }: { step: number }) {
  return (
    <svg
      viewBox="0 0 240 150"
      aria-hidden="true"
      className="h-full w-full text-foreground"
      fill="currentColor"
    >
      <rect width="240" height="150" rx="16" className="fill-muted" />
      {ART[step]}
    </svg>
  );
}

/**
 * True while the gallery pauses this demo (`data-loop-paused` on an
 * ancestor, or on the stage document's root): offscreen, in a hidden tab,
 * under reduced motion, or when the visitor pauses animations.
 */
function useLoopPaused(ref: React.RefObject<HTMLElement | null>) {
  const [paused, setPaused] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const check = () => setPaused(el.closest("[data-loop-paused]") !== null);
    check();
    const observer = new MutationObserver(check);
    for (let node = el.parentElement; node; node = node.parentElement) {
      observer.observe(node, {
        attributes: true,
        attributeFilter: ["data-loop-paused"],
      });
    }
    return () => observer.disconnect();
  }, [ref]);
  return paused;
}

const button =
  "inline-flex h-9 items-center justify-center rounded-full px-4 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function StepperDemo() {
  const [active, setActive] = React.useState(0);
  const root = React.useRef<HTMLDivElement>(null);
  const loopPaused = useLoopPaused(root);
  const { playing, toggle, filling, fillDuration } = useAutoPlay({
    count: STEPS.length,
    active,
    onStepChange: setActive,
    stepDuration: 2000,
    loop: true,
    autoStart: true,
    paused: loopPaused,
  });
  const step = STEPS[active];

  return (
    <div ref={root} className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="aspect-[8/5] w-full">
        <Art step={active} />
      </div>
      {/* Announced when the visitor moves; silent while it plays by itself. */}
      <div aria-live={playing ? "off" : "polite"} className="grid gap-1.5">
        <p className="font-semibold text-foreground text-xl tracking-tight">
          {step.title}
        </p>
        <p className="min-h-10 text-muted-foreground text-sm">{step.body}</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Stepper
          aria-label="Onboarding progress"
          count={STEPS.length}
          active={active}
          onStepClick={setActive}
          filling={filling}
          fillDuration={fillDuration}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause autoplay" : "Play autoplay"}
            className={`${button} border border-border bg-background text-foreground hover:bg-muted`}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => setActive((current) => (current + 1) % STEPS.length)}
            className={`${button} bg-primary text-primary-foreground hover:bg-primary/90`}
          >
            {active === STEPS.length - 1 ? "Restart" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
