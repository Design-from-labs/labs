"use client";

import * as React from "react";
import { type IconNode, MorphIcon } from "@/components/ui/morph-icon";

// Icon geometry from Lucide (ISC License, Copyright (c) Lucide Icons and
// Contributors), as `[tag, attrs]` nodes. MorphIcon takes any stroke-drawn
// 24x24 icon data; this demo does not import an icon library.
const MENU: IconNode = [
  ["path", { d: "M4 5h16" }],
  ["path", { d: "M4 12h16" }],
  ["path", { d: "M4 19h16" }],
];
const CLOSE: IconNode = [
  ["path", { d: "M18 6 6 18" }],
  ["path", { d: "m6 6 12 12" }],
];
const PLAY: IconNode = [
  [
    "path",
    {
      d: "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z",
    },
  ],
];
const PAUSE: IconNode = [
  ["rect", { x: "14", y: "3", width: "5", height: "18", rx: "1" }],
  ["rect", { x: "5", y: "3", width: "5", height: "18", rx: "1" }],
];
const SUN: IconNode = [
  ["circle", { cx: "12", cy: "12", r: "4" }],
  ["path", { d: "M12 2v2" }],
  ["path", { d: "M12 20v2" }],
  ["path", { d: "m4.93 4.93 1.41 1.41" }],
  ["path", { d: "m17.66 17.66 1.41 1.41" }],
  ["path", { d: "M2 12h2" }],
  ["path", { d: "M20 12h2" }],
  ["path", { d: "m6.34 17.66-1.41 1.41" }],
  ["path", { d: "m19.07 4.93-1.41 1.41" }],
];
const MOON: IconNode = [
  [
    "path",
    {
      d: "M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",
    },
  ],
];

const TOGGLES = [
  { label: "Menu", off: MENU, on: CLOSE },
  { label: "Play", off: PLAY, on: PAUSE },
  { label: "Dark mode", off: SUN, on: MOON },
] as const;

export default function MorphIconDemo() {
  const [pressed, setPressed] = React.useState<boolean[]>(() =>
    TOGGLES.map(() => false),
  );
  const root = React.useRef<HTMLDivElement>(null);
  const turn = React.useRef(0);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      // On the gallery wall the tile pauses offscreen, in a hidden tab, under
      // reduced motion and when the visitor pauses animations.
      if (root.current?.closest("[data-loop-paused]")) {
        return;
      }
      const index = turn.current % TOGGLES.length;
      turn.current += 1;
      setPressed((current) =>
        current.map((value, i) => (i === index ? !value : value)),
      );
    }, 1100);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div ref={root} className="flex items-center justify-center gap-4">
      {TOGGLES.map((toggle, i) => (
        <button
          key={toggle.label}
          type="button"
          aria-label={toggle.label}
          aria-pressed={pressed[i]}
          onClick={() =>
            setPressed((current) =>
              current.map((value, j) => (j === i ? !value : value)),
            )
          }
          className="inline-flex size-16 items-center justify-center rounded-xl border bg-card text-card-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-primary aria-pressed:text-primary-foreground"
        >
          <MorphIcon icon={pressed[i] ? toggle.on : toggle.off} size={28} />
        </button>
      ))}
    </div>
  );
}
