"use client";

import * as React from "react";

import {
  GlimmProvider,
  type PaletteName,
  type SweepFn,
  useGlimm,
} from "@/components/ui/glimm";

const PALETTE_NAMES: PaletteName[] = [
  "prism",
  "berry",
  "lagoon",
  "citrus",
  "azure",
  "ember",
];

/** The first and last band colors of each palette, for its swatch. */
const SWATCHES: Record<PaletteName, [string, string]> = {
  prism: ["#00C0E8", "#CB30E0"],
  berry: ["#FF2D55", "#CB30E0"],
  lagoon: ["#0088FF", "#34C759"],
  citrus: ["#34C759", "#FF8D28"],
  azure: ["#00C0E8", "#6155F5"],
  ember: ["#FFCC00", "#FF2D55"],
};

const VIEWS = ["today", "plan"] as const;
type View = (typeof VIEWS)[number];

const BARS = [38, 54, 46, 72, 60, 88, 66];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

const TASKS = [
  { label: "Review the launch checklist", done: true },
  { label: "Send the draft to the design team", done: false },
  { label: "Book the walkthrough for Friday", done: false },
];

/**
 * The view's heading, where focus lands after a sweep. A role rather than an
 * h2: the specimen wall allows no heading elements inside a tile.
 */
function ViewTitle({ children }: { children: React.ReactNode }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: the wall forbids h1 to h6 inside a tile
    <p
      role="heading"
      aria-level={2}
      data-glimm-demo-heading=""
      className="font-semibold text-xl outline-none"
    >
      {children}
    </p>
  );
}

/** Generated screens: a stat with a bar chart, and a short task list. */
function TodayView() {
  return (
    <div className="flex size-full flex-col gap-4 bg-card p-5 text-card-foreground">
      <div>
        <p className="text-muted-foreground text-xs">This week</p>
        <ViewTitle>Today</ViewTitle>
      </div>
      <div className="flex items-end gap-4">
        <p className="font-semibold text-4xl tabular-nums">2,481</p>
        <p className="pb-1 text-muted-foreground text-xs">visits so far</p>
      </div>
      <div className="mt-auto flex h-28 gap-2" aria-hidden="true">
        {BARS.map((height, index) => (
          <div
            key={DAYS[index] ?? index}
            className="flex h-full flex-1 flex-col gap-1"
          >
            <div className="flex flex-1 items-end">
              <div
                className="w-full rounded-sm bg-primary/80"
                style={{ height: `${height}%` }}
              />
            </div>
            <span className="text-center text-[10px] text-muted-foreground">
              {DAYS[index]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanView() {
  return (
    <div className="flex size-full flex-col gap-4 bg-foreground p-5 text-background">
      <div>
        <p className="text-background/70 text-xs">Up next</p>
        <ViewTitle>Plan</ViewTitle>
      </div>
      <ul className="flex flex-col gap-2">
        {TASKS.map((task) => (
          <li
            key={task.label}
            className="flex items-center gap-3 rounded-lg bg-background/10 px-3 py-2.5 text-sm"
          >
            <span
              aria-hidden="true"
              className="grid size-4 shrink-0 place-items-center rounded-full border border-background/60 text-[10px] data-[done=true]:bg-background data-[done=true]:text-foreground"
              data-done={task.done}
            >
              {task.done ? "✓" : ""}
            </span>
            <span className={task.done ? "line-through opacity-70" : ""}>
              {task.label}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-auto text-background/70 text-xs">
        1 of 3 done. The rest are due this week.
      </p>
    </div>
  );
}

const button =
  "inline-flex h-9 items-center rounded-full bg-primary px-4 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60";

/** Hands the provider's `sweep` to the controls below the stage, which sit
 * outside the box the band crosses. */
function SweepBridge({
  sweepRef,
}: {
  sweepRef: React.RefObject<SweepFn | null>;
}) {
  const { sweep } = useGlimm();
  sweepRef.current = sweep;
  return null;
}

export default function GlimmDemo() {
  const sweepRef = React.useRef<SweepFn | null>(null);
  const [view, setView] = React.useState<View>("today");
  const [palette, setPalette] = React.useState<PaletteName>("prism");
  const [busy, setBusy] = React.useState(false);
  const group = React.useId();

  const play = () => {
    setBusy(true);
    sweepRef
      .current?.(
        () => setView((current) => (current === "today" ? "plan" : "today")),
        {
          palette,
          // Land on the new view's heading, as a router would after a navigation.
          focus: "[data-glimm-demo-heading]",
        },
      )
      .done.then(() => setBusy(false));
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <GlimmProvider
        scope="container"
        direction="inline-end"
        reducedMotion="crossfade"
        className="h-64 w-full rounded-xl border border-border shadow-xs"
      >
        <SweepBridge sweepRef={sweepRef} />
        {view === "today" ? <TodayView /> : <PlanView />}
      </GlimmProvider>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className={button} disabled={busy} onClick={play}>
          {view === "today" ? "Show the plan" : "Show today"}
        </button>
        <fieldset className="m-0 flex items-center gap-1.5 border-0 p-0">
          <legend className="sr-only">Band colors</legend>
          {PALETTE_NAMES.map((name) => {
            const [from, to] = SWATCHES[name];
            return (
              <label key={name} title={name} className="relative block">
                <input
                  type="radio"
                  name={group}
                  value={name}
                  checked={palette === name}
                  onChange={() => setPalette(name)}
                  className="peer sr-only"
                />
                <span className="sr-only">{name}</span>
                <span
                  aria-hidden="true"
                  className="block size-6 cursor-pointer rounded-full border border-border transition-transform peer-checked:scale-110 peer-checked:ring-2 peer-checked:ring-foreground peer-checked:ring-offset-2 peer-checked:ring-offset-background peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
                  }}
                />
              </label>
            );
          })}
        </fieldset>
      </div>
      <p className="sr-only" aria-live="polite">
        {view === "today" ? "Showing today." : "Showing the plan."}
      </p>
    </div>
  );
}
