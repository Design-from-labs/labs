"use client";

import * as React from "react";

import { Liquid } from "@/components/ui/liquid-gooey";

const glyph = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const SATELLITES = [
  {
    label: "New file",
    x: -54,
    y: -34,
    icon: (
      <svg {...glyph}>
        <path d="M9 1.5H4A1.5 1.5 0 0 0 2.5 3v10A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5V6z" />
        <path d="M9 1.5V6h4.5" />
      </svg>
    ),
  },
  {
    label: "Add image",
    x: 0,
    y: -64,
    icon: (
      <svg {...glyph}>
        <rect x="1.5" y="1.5" width="13" height="13" rx="2" />
        <circle cx="5.5" cy="5.5" r="1.25" />
        <path d="M14.5 10.5L11 7l-7.5 7.5" />
      </svg>
    ),
  },
  {
    label: "New folder",
    x: 54,
    y: -34,
    icon: (
      <svg {...glyph}>
        <path d="M14.5 12.5A1.5 1.5 0 0 1 13 14H3a1.5 1.5 0 0 1-1.5-1.5V3A1.5 1.5 0 0 1 3 1.5h3L7.5 4H13a1.5 1.5 0 0 1 1.5 1.5z" />
      </svg>
    ),
  },
];

const BUTTON =
  "grid size-10 cursor-pointer place-items-center rounded-full bg-transparent text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export default function LiquidGooeyDemo() {
  const [open, setOpen] = React.useState(false);
  const toggle = () => setOpen((value) => !value);

  return (
    <Liquid
      blur={6}
      contrast={18}
      shadow="0 0 0 1px rgba(0, 0, 0, 0.06), 0 2px 6px rgba(0, 0, 0, 0.05), 0 4px 42px rgba(0, 0, 0, 0.06)"
      className="h-[140px] w-[200px]"
    >
      {SATELLITES.map((satellite, index) => (
        <Liquid.Item
          key={satellite.label}
          className="absolute start-20 top-20"
          x={open ? satellite.x : 0}
          y={open ? satellite.y : 0}
          transition={{
            duration: open ? 550 : 250,
            ease: open
              ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
              : "cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          delay={open ? index * 40 : 0}
        >
          <button
            type="button"
            aria-label={satellite.label}
            tabIndex={open ? 0 : -1}
            aria-hidden={!open}
            onClick={toggle}
            className={`${BUTTON} ${open ? "hover:bg-foreground/5" : "pointer-events-none"}`}
          >
            <span
              className={`grid place-items-center transition-[opacity,filter] duration-150 motion-reduce:transition-none ${open ? "opacity-100 blur-none" : "opacity-0 blur-[2px]"}`}
            >
              {satellite.icon}
            </span>
          </button>
        </Liquid.Item>
      ))}
      <Liquid.Item className="absolute start-20 top-20">
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={toggle}
          className={BUTTON}
        >
          <span
            className={`grid place-items-center transition-transform duration-250 ease-in-out motion-reduce:transition-none ${open ? "rotate-45" : ""}`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M10 4V16M4 10H16" />
            </svg>
          </span>
        </button>
      </Liquid.Item>
    </Liquid>
  );
}
