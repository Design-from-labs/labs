"use client";

import { Lifeline } from "@/components/lifeline/lifeline";
import { defineLifeline } from "@/components/lifeline/lifeline-data";
import { LifelineLegend } from "@/components/lifeline/lifeline-legend";

/**
 * Neutral sample media: small inline SVGs (no network, no real people).
 * `photo` paints a landscape card, `portrait` an abstract avatar.
 */
const svg = (width: number, height: number, body: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`,
  )}`;

const photo = (sky: string, ground: string, sun: string) =>
  svg(
    320,
    240,
    `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs><rect width="320" height="240" fill="url(#s)"/><circle cx="228" cy="86" r="34" fill="${sun}"/><path d="M0 178 L84 118 L150 162 L222 104 L320 170 L320 240 L0 240 Z" fill="${ground}"/>`,
  );

const portrait = (from: string, to: string) =>
  svg(
    64,
    64,
    `<defs><linearGradient id="p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="64" height="64" fill="url(#p)"/><circle cx="32" cy="26" r="11" fill="#ffffff" fill-opacity="0.85"/><path d="M12 60 C14 44 50 44 52 60 Z" fill="#ffffff" fill-opacity="0.85"/>`,
  );

// Card tilts are pinned here so every render matches; leave `rotate` out
// and each card rolls a fresh tilt per visit.
export const sampleLifeline = defineLifeline({
  slug: "sample",
  name: "A sample life",
  birthYear: 1990,
  endYear: 2026,
  description: "A fictional designer's life, year by year.",
  milestones: {
    1990: {
      id: "born",
      events: ["Born in a small coastal town."],
    },
    1996: {
      id: "school",
      events: ["Started school.", "Joined the drawing club."],
      mentors: [
        {
          name: "Ada Rivers",
          role: "Art teacher",
          photo: portrait("#93c5fd", "#1d4ed8"),
        },
      ],
    },
    1999: {
      id: "first-site",
      events: [
        [
          { type: "text", value: "Built a first website on " },
          {
            type: "link",
            value: "a borrowed computer",
            href: "https://example.com",
          },
          { type: "text", value: "." },
        ],
      ],
    },
    2004: {
      id: "studies",
      events: ["Started studying graphic design."],
    },
    2006: {
      id: "atelier",
      companies: [{ id: "atelier", name: "Atelier" }],
      events: ["Joined Atelier as a junior designer."],
      met: [{ name: "Mara Ellis", photo: portrait("#fbcfe8", "#be185d") }],
    },
    2008: {
      id: "exhibition",
      events: [
        {
          text: "First solo exhibition.",
          image: {
            src: photo("#bae6fd", "#0f766e", "#fde68a"),
            alt: "Prints pinned to a gallery wall",
          },
        },
      ],
    },
    2010: {
      id: "the-move",
      events: ["Moved to the city."],
      photos: [
        {
          src: photo("#fed7aa", "#9a3412", "#fef3c7"),
          alt: "Boxes stacked in an empty flat",
          rotate: -4.5,
        },
        {
          src: photo("#c7d2fe", "#3730a3", "#e0e7ff"),
          alt: "The view from the new window",
          rotate: 3.5,
        },
      ],
    },
    2013: {
      id: "field-office",
      companies: [{ id: "field-office", name: "Field Office" }],
      events: ["Co-founded Field Office."],
      mentors: [{ name: "Jun Park", role: "Partner" }],
    },
    2016: {
      id: "launch",
      events: [
        {
          text: "Shipped the first product.",
          image: {
            src: photo("#d9f99d", "#3f6212", "#fef9c3"),
            alt: "The launch day whiteboard",
          },
        },
      ],
    },
    2019: {
      id: "talk",
      events: ["Gave a first conference talk."],
      met: [{ name: "Theo Grant" }],
    },
    2022: {
      id: "teaching",
      events: ["Started teaching a design course."],
      photos: [
        {
          src: photo("#e9d5ff", "#6b21a8", "#fae8ff"),
          alt: "A classroom after the last session",
          rotate: -3,
        },
      ],
    },
    2026: {
      id: "today",
      events: [{ text: "Still going.", effect: "fireworks" }],
    },
  },
});

export default function LifelineDemo() {
  return (
    <div className="w-full">
      {/* The rail's label shield paints --lifeline-surface (white or black),
          so the box sits on the same surface. */}
      <div className="h-[640px] w-full overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-black">
        <Lifeline
          mode="embed"
          markers={sampleLifeline.markers}
          birthYear={sampleLifeline.birthYear}
          title={sampleLifeline.name}
          className="h-full"
        />
      </div>
      <div className="mt-4">
        <LifelineLegend />
      </div>
    </div>
  );
}
