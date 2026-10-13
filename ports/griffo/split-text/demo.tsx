"use client";

import { stagger } from "motion";
import { useReducedMotion } from "motion/react";
import * as React from "react";
import { SplitText } from "@/components/ui/split-text";

const HEADLINE = "Wave after wave of Type, kerned as set.";
const SHOWN_MS = 3600;
const HIDDEN_MS = 900;

export default function SplitTextDemo() {
  const root = React.useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // The server (and a static preview) renders the plain heading, fully shown;
  // the split starts once the demo is hydrated.
  const [mounted, setMounted] = React.useState(false);
  const [phase, setPhase] = React.useState<"hidden" | "visible">("visible");

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!mounted || reduced) {
      return;
    }
    let shown = true;
    let timer = 0;
    const step = () => {
      // On the gallery wall the tile pauses offscreen, in a hidden tab, under
      // reduced motion and when the visitor pauses animations: a paused tile
      // holds the fully shown heading.
      shown = root.current?.closest("[data-loop-paused]") ? true : !shown;
      setPhase(shown ? "visible" : "hidden");
      timer = window.setTimeout(step, shown ? SHOWN_MS : HIDDEN_MS);
    };
    timer = window.setTimeout(step, SHOWN_MS);
    return () => window.clearTimeout(timer);
  }, [mounted, reduced]);

  const heading = (
    <h2 className="max-w-[13ch] text-center font-serif text-6xl text-foreground leading-[1.05]">
      {HEADLINE}
    </h2>
  );

  return (
    <div ref={root} className="flex justify-center">
      {mounted ? (
        <SplitText
          options={{ type: "chars,words,lines", mask: "lines" }}
          variants={{
            hidden: {
              chars: {
                opacity: 0,
                y: "100%",
                transition: { duration: 0.35, delay: stagger(0.006) },
              },
            },
            visible: {
              chars: ({ lineIndex }) => ({
                opacity: 1,
                y: "0%",
                transition: {
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                  delay: stagger(0.02, { startDelay: lineIndex * 0.15 }),
                },
              }),
            },
          }}
          initial="hidden"
          animate={phase}
        >
          {heading}
        </SplitText>
      ) : (
        heading
      )}
    </div>
  );
}
