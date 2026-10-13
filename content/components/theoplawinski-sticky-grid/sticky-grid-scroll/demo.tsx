"use client";

import * as React from "react";

import { type LenisRef, SmoothScroll } from "@/components/ui/smooth-scroll";
import { StickyGridScroll } from "@/components/ui/sticky-grid-scroll";

// Original art: twelve abstract compositions as inline SVG, so the demo needs
// no image files.
function art(i: number) {
  const hue = (i * 47) % 360;
  const a = (hue + 40) % 360;
  const b = (hue + 160) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 55% 82%)"/><stop offset="1" stop-color="hsl(${(hue + 70) % 360} 45% 38%)"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/><circle cx="${20 + ((i * 29) % 60)}" cy="${25 + ((i * 17) % 50)}" r="${18 + (i % 4) * 5}" fill="hsl(${a} 70% 60%)" opacity=".85"/><rect x="${10 + ((i * 13) % 40)}" y="${50 + ((i * 7) % 30)}" width="46" height="22" rx="6" transform="rotate(${(i * 23) % 60} 50 60)" fill="hsl(${b} 60% 45%)" opacity=".8"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const IMAGES = Array.from({ length: 12 }, (_, i) => ({
  src: art(i + 1),
  alt: "",
}));

const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);

/**
 * On the specimen wall only, scroll down through the whole effect and back up
 * through Lenis. Holds still while the wall marks the tile paused (off
 * screen, hidden tab, reduced motion, the visitor's pause).
 */
function useWallScroll(lenisRef: React.RefObject<LenisRef | null>) {
  React.useEffect(() => {
    let timer = 0;
    let down = true;
    const step = () => {
      const lenis = lenisRef.current?.lenis;
      const wrapper = lenisRef.current?.wrapper;
      if (!lenis || !wrapper) {
        timer = window.setTimeout(step, 250);
        return;
      }
      if (!wrapper.closest("[data-specimen]")) {
        return;
      }
      if (wrapper.closest("[data-loop-paused]")) {
        timer = window.setTimeout(step, 250);
        return;
      }
      lenis.scrollTo(down ? lenis.limit : 0, { duration: 7, easing: ease });
      down = !down;
      timer = window.setTimeout(step, 8200);
    };
    timer = window.setTimeout(step, 400);
    return () => window.clearTimeout(timer);
  }, [lenisRef]);
}

export default function StickyGridScrollDemo() {
  const lenisRef = React.useRef<LenisRef>(null);
  // The scroll container is the SmoothScroll wrapper.
  const container = React.useMemo<React.RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        return lenisRef.current?.wrapper ?? null;
      },
    }),
    [],
  );
  useWallScroll(lenisRef);
  return (
    <SmoothScroll
      ref={lenisRef}
      options={{ lerp: 0.08, wheelMultiplier: 1.4 }}
      className="aspect-[5/4] w-full max-w-3xl overflow-y-auto rounded-lg [container-type:size]"
      tabIndex={0}
      role="region"
      aria-label="Sticky grid scroll demo"
    >
      <div className="relative z-[1] grid h-[100cqh] place-items-center overflow-hidden bg-[linear-gradient(135deg,oklch(0.85_0.08_80),oklch(0.55_0.12_30))] p-6">
        <p className="relative text-center text-white text-xs uppercase tracking-wide">
          Scroll to open the grid
        </p>
      </div>
      <StickyGridScroll
        container={container}
        images={IMAGES}
        title="Twelve frames, one stage"
        description="Each column slides in from above or below, then the grid opens around the title."
        action={<a href="#sticky-grid-scroll">See the series</a>}
      />
    </SmoothScroll>
  );
}
