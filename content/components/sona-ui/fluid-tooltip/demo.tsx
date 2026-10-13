"use client";

import { FluidTooltip } from "@/components/ui/fluid-tooltip";

// Simple stroked glyphs, so the demo works with any icon set.
const glyph = {
  className: "size-4",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const items = [
  {
    id: "home",
    label: "Home",
    icon: (
      <svg {...glyph}>
        <path d="M4 11 12 4l8 7" />
        <path d="M6 10v10h12V10" />
      </svg>
    ),
  },
  {
    id: "search",
    label: "Search",
    icon: (
      <svg {...glyph}>
        <circle cx="11" cy="11" r="6" />
        <path d="m20 20-4.5-4.5" />
      </svg>
    ),
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: (
      <svg {...glyph}>
        <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
        <path d="M10 21h4" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: (
      <svg {...glyph}>
        <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="10" cy="17" r="2" />
      </svg>
    ),
  },
];

export default function FluidTooltipDemo() {
  return (
    <FluidTooltip.Group orientation="horizontal">
      <div className="flex items-center gap-1 rounded-2xl border border-border bg-muted/60 p-1.5">
        {items.map((item) => (
          <FluidTooltip.Root key={item.id} id={item.id}>
            <FluidTooltip.Trigger asChild>
              <button
                type="button"
                aria-label={item.label}
                className="grid size-10 place-items-center rounded-xl text-muted-foreground outline-none transition-colors duration-150 hover:bg-background hover:text-foreground focus-visible:bg-background focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.icon}
              </button>
            </FluidTooltip.Trigger>
            <FluidTooltip.Content>{item.label}</FluidTooltip.Content>
          </FluidTooltip.Root>
        ))}
      </div>
    </FluidTooltip.Group>
  );
}
