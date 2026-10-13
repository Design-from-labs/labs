"use client";

import { useState } from "react";

import { useGuideframe } from "@/components/guideframe-grid/useGuideframe";

const DEMO_KEY = "designfrom-labs:guideframe-grid-demo";

// Container-relative positions: a scoped overlay stores guides relative to
// its container, so these stay put wherever the frame sits on the page.
const GUIDES = [
  { id: "demo-guide-x", axis: "x" as const, position: 184 },
  { id: "demo-guide-y", axis: "y" as const, position: 132 },
];

const CARDS = [
  {
    label: "01",
    title: "Overview",
    body: "Snap a guide to this card's edges.",
  },
  { label: "02", title: "Activity", body: "Columns follow the frame's width." },
  {
    label: "03",
    title: "Settings",
    body: "Drag a guide back to a ruler to remove it.",
  },
];

const BUTTON =
  "rounded-md border border-border bg-background px-3 py-1.5 font-medium text-foreground text-xs shadow-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-accent";

function Toolbar({ frame }: { frame: HTMLDivElement | null }) {
  // The overlay is scoped to the frame (`container`), keeps its state under
  // demo-only storage keys, and leaves global shortcuts off so it never acts
  // on the rest of the page; these buttons drive it instead.
  const guideframe = useGuideframe({
    container: frame,
    // Explicit, so the demo also renders on a production build of the site
    // (the default keeps the overlay out of production), and only once the
    // frame exists, so it never mounts on the page body.
    enabled: frame !== null,
    rulers: true,
    // Breakpoints match the frame's width, not the window's.
    breakpoints: { tablet: 480, desktop: 960 },
    columns: { desktop: 12, tablet: 8, mobile: 4 },
    gutter: { desktop: 24, tablet: 20, mobile: 16 },
    margin: { desktop: 32, tablet: 24, mobile: 16 },
    defaultGuides: GUIDES,
    defaultPanelOpen: true,
    shortcut: false,
    storageKey: `${DEMO_KEY}:visible`,
    guidesStorageKey: `${DEMO_KEY}:guides`,
    panelStorageKey: `${DEMO_KEY}:panel`,
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-pressed={guideframe.visible}
        onClick={() => guideframe.setVisible(!guideframe.visible)}
        className={BUTTON}
      >
        Grid and rulers
      </button>
      <button
        type="button"
        aria-pressed={guideframe.panelOpen}
        onClick={() => guideframe.setPanelOpen(!guideframe.panelOpen)}
        className={BUTTON}
      >
        Control panel
      </button>
      <span dir="auto" className="text-muted-foreground text-xs">
        {guideframe.guides.length === 1
          ? "1 guide"
          : `${guideframe.guides.length} guides`}
      </span>
    </div>
  );
}

export default function GuideframeGridDemo() {
  // A state callback ref, so the overlay mounts once the frame exists.
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);

  return (
    <div className="grid w-full gap-3">
      <Toolbar frame={frame} />
      <div
        ref={setFrame}
        className="relative isolate min-h-[30rem] w-full overflow-hidden rounded-xl border border-border bg-muted text-foreground"
      >
        <div className="grid gap-8 px-10 pt-14 pb-12 sm:px-12">
          <header className="grid max-w-md gap-3">
            <p className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">
              Layout check
            </p>
            <h2 className="font-semibold text-3xl tracking-tight">
              Line the page up with its grid.
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Drag from a ruler to place a guide. Guides snap to element edges,
              columns and each other; select one and use the arrow keys to nudge
              it.
            </p>
          </header>
          <section
            aria-label="Sample cards"
            className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            {CARDS.map((card) => (
              <article
                key={card.label}
                className="grid min-h-28 content-end gap-1 rounded-lg border border-border bg-card p-4 text-card-foreground"
              >
                <span className="font-bold text-muted-foreground text-xs">
                  {card.label}
                </span>
                <h3 className="font-semibold text-base">{card.title}</h3>
                <p className="text-muted-foreground text-sm">{card.body}</p>
              </article>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
