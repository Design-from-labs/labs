"use client";

import type * as React from "react";

import { Globe, type GlobeArc, type GlobeMarker } from "@/components/ui/globe";

// The markers and arc of the COBE site's code example, with ids, so the labels
// below follow them by CSS anchor positioning (`--cobe-<id>`). A label shows
// while its marker faces the viewer (`--cobe-visible-<id>`).
const MARKERS: GlobeMarker[] = [
  { location: [37.78, -122.44], size: 0.03, id: "sf" },
  { location: [40.71, -74.01], size: 0.03, id: "nyc" },
];
const ARCS: GlobeArc[] = [{ from: [37.78, -122.44], to: [40.71, -74.01] }];

const LABELS = [
  { id: "sf", name: "San Francisco" },
  { id: "nyc", name: "New York" },
];

export default function GlobeDemo() {
  return (
    <Globe
      markers={MARKERS}
      arcs={ARCS}
      label="A globe with an arc from San Francisco to New York"
      className="mx-auto max-w-[600px]"
    >
      {LABELS.map((city) => (
        <span
          key={city.id}
          aria-hidden="true"
          className="pointer-events-none absolute whitespace-nowrap rounded-full border bg-background/90 px-2 py-0.5 font-medium text-foreground text-xs shadow-sm transition-[opacity,filter] duration-300 motion-reduce:transition-none"
          style={
            {
              positionAnchor: `--cobe-${city.id}`,
              positionArea: "top",
              marginBlockEnd: 6,
              opacity: `var(--cobe-visible-${city.id}, 0)`,
              filter: `blur(calc((1 - var(--cobe-visible-${city.id}, 0)) * 8px))`,
            } as React.CSSProperties
          }
        >
          {city.name}
        </span>
      ))}
    </Globe>
  );
}
