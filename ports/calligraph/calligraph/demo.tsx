"use client";

import * as React from "react";
import { Calligraph } from "@/components/ui/calligraph";

// The upstream site's demo: a word, a price and a slot counter, cycling.
const WORDS = ["Calligraph", "Craft", "Creative", "Create"];
const PRICES = [35.99, 24.89, 17.38, 3.15];
const SPINS = [1204, 387, 52, 9631];

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function CalligraphDemo() {
  const [index, setIndex] = React.useState(0);
  const root = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      // On the gallery wall the tile pauses offscreen, in a hidden tab, under
      // reduced motion and when the visitor pauses animations.
      if (root.current?.closest("[data-loop-paused]")) {
        return;
      }
      setIndex((current) => (current + 1) % WORDS.length);
    }, 2400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div ref={root} className="flex flex-col items-center gap-5 text-center">
      <Calligraph className="select-none font-bold text-5xl text-foreground">
        {WORDS[index]}
      </Calligraph>
      <div className="flex items-baseline gap-8 font-semibold text-2xl text-muted-foreground tabular-nums">
        <Calligraph variant="number" animation="snappy">
          {usd.format(PRICES[index])}
        </Calligraph>
        <Calligraph variant="slots" animation="snappy">
          {usd.format(SPINS[index])}
        </Calligraph>
      </div>
    </div>
  );
}
