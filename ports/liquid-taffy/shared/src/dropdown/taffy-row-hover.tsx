"use client";

// ---- upstream: src/components/liquid/RowHover.tsx ----
/* The travelling hover — ONE highlight for a whole list of rows.

   The hover is not painted on the rows. A single pill lives under them and
   the engine carries it from row to row, going a little gelatinous on the
   way: it squashes flat as it takes off and rings back to shape on the
   house spring once it lands — turned on its side for a vertical list.

   Its shape never changes — four rounded corners, one row's height — and
   neither does its colour: the surface's own neutral tint, whatever the row
   underneath is doing. Colour belongs to the icons. A selected run merges its own wash
   into one long shape; the hover stays the size of the thing the pointer is
   actually on, so "what am I about to click" is never ambiguous.

   Which row is hovered is the host's state; everything else is here, so the
   two dropdowns cannot drift apart. Labs: the host also points it at the row
   that has keyboard focus, so the highlight travels with the arrow keys. */

import { useLayoutEffect, useRef } from "react";

import { prefersReducedMotion } from "@/lib/taffy-motion";
import { HOUSE_SPRING } from "@/lib/taffy-springs";
import { taffyKillTweensOf, taffySet, taffyTimeline, taffyTo } from "@/lib/taffy-tween";

const SPRING = HOUSE_SPRING;

export interface RowHoverProps {
  /* The row the pointer is on, or null for none. */
  index: number | null;
  rowHeight: number;
  /* The panel's padding: the pill sits inside it, exactly where a row does. */
  inset: number;
  /* Labs: the host's class for the pill (it owns the stylesheet). */
  className: string;
}

export function RowHover({ index, rowHeight, inset, className }: RowHoverProps) {
  const pillRef = useRef<HTMLSpanElement>(null);
  /* Where the pill last was. null means it is dark — the next row it takes
     lights up in place instead of flying in from a stale position. */
  const atRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const pill = pillRef.current;
    if (!pill) {
      return;
    }

    if (index === null) {
      taffyKillTweensOf(pill);
      taffyTo(pill, { autoAlpha: 0, duration: 0.12, ease: "power1.out" });
      atRef.current = null;
      return;
    }

    const y = inset + index * rowHeight;
    const from = atRef.current;
    atRef.current = index;

    taffyKillTweensOf(pill);

    /* Arriving from nowhere, or reduced motion: the pill is simply where it
       belongs. Nothing travels across a list it was not already on. */
    if (from === null || prefersReducedMotion()) {
      taffySet(pill, { y, scaleX: 1, scaleY: 1 });
      taffyTo(pill, { autoAlpha: 1, duration: 0.1, ease: "power1.out" });
      return;
    }

    /* The travel answers the pointer, it does not chase it: an OUT ease from
       the first frame (an in-out's soft start read as lag), most of the
       distance covered in the first hundred milliseconds, and the jelly
       recovery overlapping the tail of the ride instead of waiting for it. */
    taffyTimeline()
      .to(pill, { y, duration: 0.19, ease: "power3.out" }, 0)
      /* Flat and a touch wide mid-flight — mass thrown along the travel. */
      .to(pill, { scaleY: 0.82, scaleX: 1.02, duration: 0.08, ease: "power2.out" }, 0)
      .to(pill, { scaleY: 1, scaleX: 1, duration: 0.4, ease: SPRING }, 0.09);
  }, [index, inset, rowHeight]);

  return (
    <span
      ref={pillRef}
      className={className}
      aria-hidden="true"
      style={{ height: rowHeight, insetInline: inset }}
    />
  );
}
