"use client";

import * as React from "react";

import { DotHalftone } from "@/components/ui/dot-halftone";

// Four original illustrations on white (white is keyed out), as inline SVG,
// so the demo needs no image files.
const ART = {
  rocket: `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="#ffffff"/><circle cx="120" cy="130" r="10" fill="#1d1b2e"/><circle cx="470" cy="100" r="14" fill="#1d1b2e"/><circle cx="500" cy="380" r="9" fill="#1d1b2e"/><circle cx="90" cy="420" r="12" fill="#1d1b2e"/><g transform="rotate(35 300 300)"><path d="M300 70 C365 140 380 250 365 360 L235 360 C220 250 235 140 300 70 Z" fill="#2a2840"/><circle cx="300" cy="215" r="44" fill="#ffffff"/><circle cx="300" cy="215" r="30" fill="#4a4670"/><path d="M235 290 L170 390 L240 370 Z" fill="#3b3858"/><path d="M365 290 L430 390 L360 370 Z" fill="#3b3858"/><rect x="262" y="360" width="76" height="26" rx="8" fill="#1d1b2e"/><path d="M268 392 C270 450 300 510 300 530 C300 510 330 450 332 392 Z" fill="#55506f"/></g></svg>`,
  city: `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="#ffffff"/><circle cx="430" cy="150" r="62" fill="#f2a33a"/><rect x="60" y="300" width="90" height="230" fill="#2d3e63"/><rect x="150" y="210" width="80" height="320" fill="#3f5687"/><rect x="230" y="260" width="110" height="270" fill="#25324f"/><rect x="340" y="170" width="70" height="360" fill="#4f6aa3"/><rect x="410" y="280" width="120" height="250" fill="#2d3e63"/><rect x="166" y="232" width="16" height="22" fill="#cdd8f2"/><rect x="196" y="232" width="16" height="22" fill="#cdd8f2"/><rect x="166" y="272" width="16" height="22" fill="#cdd8f2"/><rect x="196" y="272" width="16" height="22" fill="#cdd8f2"/><rect x="166" y="312" width="16" height="22" fill="#cdd8f2"/><rect x="196" y="312" width="16" height="22" fill="#cdd8f2"/><rect x="166" y="352" width="16" height="22" fill="#cdd8f2"/><rect x="196" y="352" width="16" height="22" fill="#cdd8f2"/><rect x="166" y="392" width="16" height="22" fill="#cdd8f2"/><rect x="196" y="392" width="16" height="22" fill="#cdd8f2"/><rect x="166" y="432" width="16" height="22" fill="#cdd8f2"/><rect x="196" y="432" width="16" height="22" fill="#cdd8f2"/><rect x="166" y="472" width="16" height="22" fill="#cdd8f2"/><rect x="196" y="472" width="16" height="22" fill="#cdd8f2"/><rect x="356" y="192" width="38" height="14" fill="#cdd8f2"/><rect x="356" y="232" width="38" height="14" fill="#cdd8f2"/><rect x="356" y="272" width="38" height="14" fill="#cdd8f2"/><rect x="356" y="312" width="38" height="14" fill="#cdd8f2"/><rect x="356" y="352" width="38" height="14" fill="#cdd8f2"/><rect x="356" y="392" width="38" height="14" fill="#cdd8f2"/><rect x="356" y="432" width="38" height="14" fill="#cdd8f2"/><rect x="356" y="472" width="38" height="14" fill="#cdd8f2"/><rect x="426" y="302" width="20" height="20" fill="#9fb3dd"/><rect x="460" y="302" width="20" height="20" fill="#9fb3dd"/><rect x="494" y="302" width="20" height="20" fill="#9fb3dd"/><rect x="426" y="344" width="20" height="20" fill="#9fb3dd"/><rect x="460" y="344" width="20" height="20" fill="#9fb3dd"/><rect x="494" y="344" width="20" height="20" fill="#9fb3dd"/><rect x="426" y="386" width="20" height="20" fill="#9fb3dd"/><rect x="460" y="386" width="20" height="20" fill="#9fb3dd"/><rect x="494" y="386" width="20" height="20" fill="#9fb3dd"/><rect x="426" y="428" width="20" height="20" fill="#9fb3dd"/><rect x="460" y="428" width="20" height="20" fill="#9fb3dd"/><rect x="494" y="428" width="20" height="20" fill="#9fb3dd"/><rect x="426" y="470" width="20" height="20" fill="#9fb3dd"/><rect x="460" y="470" width="20" height="20" fill="#9fb3dd"/><rect x="494" y="470" width="20" height="20" fill="#9fb3dd"/><rect x="40" y="530" width="520" height="22" fill="#1b2438"/></svg>`,
  servers: `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="#ffffff"/><rect x="130" y="110" width="340" height="80" rx="14" fill="#263238"/><rect x="160" y="134" width="150" height="10" rx="5" fill="#546e7a"/><rect x="160" y="156" width="110" height="10" rx="5" fill="#546e7a"/><circle cx="400" cy="150" r="11" fill="#22c55e"/><circle cx="435" cy="150" r="11" fill="#22c55e"/><rect x="130" y="210" width="340" height="80" rx="14" fill="#263238"/><rect x="160" y="234" width="150" height="10" rx="5" fill="#546e7a"/><rect x="160" y="256" width="110" height="10" rx="5" fill="#546e7a"/><circle cx="400" cy="250" r="11" fill="#22c55e"/><circle cx="435" cy="250" r="11" fill="#f59e0b"/><rect x="130" y="310" width="340" height="80" rx="14" fill="#263238"/><rect x="160" y="334" width="150" height="10" rx="5" fill="#546e7a"/><rect x="160" y="356" width="110" height="10" rx="5" fill="#546e7a"/><circle cx="400" cy="350" r="11" fill="#22c55e"/><circle cx="435" cy="350" r="11" fill="#22c55e"/><rect x="130" y="410" width="340" height="80" rx="14" fill="#263238"/><rect x="160" y="434" width="150" height="10" rx="5" fill="#546e7a"/><rect x="160" y="456" width="110" height="10" rx="5" fill="#546e7a"/><circle cx="400" cy="450" r="11" fill="#22c55e"/><circle cx="435" cy="450" r="11" fill="#f59e0b"/><rect x="290" y="510" width="20" height="40" fill="#263238"/><rect x="200" y="545" width="200" height="16" rx="8" fill="#263238"/></svg>`,
  robot: `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="#ffffff"/><rect x="292" y="70" width="16" height="60" fill="#3a2a1a"/><circle cx="300" cy="66" r="20" fill="#3a2a1a"/><rect x="170" y="130" width="260" height="190" rx="40" fill="#4a3522"/><circle cx="245" cy="215" r="32" fill="#ffffff"/><circle cx="355" cy="215" r="32" fill="#ffffff"/><circle cx="245" cy="215" r="16" fill="#2a1d10"/><circle cx="355" cy="215" r="16" fill="#2a1d10"/><rect x="240" y="270" width="120" height="18" rx="9" fill="#ffffff"/><rect x="140" y="190" width="30" height="70" rx="12" fill="#3a2a1a"/><rect x="430" y="190" width="30" height="70" rx="12" fill="#3a2a1a"/><rect x="200" y="340" width="200" height="180" rx="30" fill="#4a3522"/><circle cx="300" cy="420" r="34" fill="#ffffff"/><circle cx="300" cy="420" r="20" fill="#5e4430"/><rect x="130" y="360" width="56" height="130" rx="26" fill="#3a2a1a"/><rect x="414" y="360" width="56" height="130" rx="26" fill="#3a2a1a"/><rect x="225" y="520" width="50" height="50" rx="14" fill="#3a2a1a"/><rect x="325" y="520" width="50" height="50" rx="14" fill="#3a2a1a"/></svg>`,
};

const toUrl = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

const SAMPLES: {
  label: string;
  alt: string;
  src: string;
  gradient?: [string, string];
}[] = [
  {
    label: "Rocket",
    alt: "A rocket drawn in dots",
    src: toUrl(ART.rocket),
    gradient: ["#ff6ea6", "#7b2ff7"],
  },
  { label: "City", alt: "A city skyline drawn in dots", src: toUrl(ART.city) },
  {
    label: "Servers",
    alt: "A rack of servers drawn in dots",
    src: toUrl(ART.servers),
  },
  {
    label: "Robot",
    alt: "A robot drawn in dots",
    src: toUrl(ART.robot),
    gradient: ["#ffc98a", "#f97316"],
  },
];

export default function DotHalftoneDemo() {
  const [active, setActive] = React.useState(0);
  const sample = SAMPLES[active];
  return (
    <div className="flex flex-col items-center gap-10 p-10">
      <DotHalftone
        src={sample.src}
        gradient={sample.gradient}
        alt={sample.alt}
        className="max-w-[420px]"
      />
      <fieldset
        aria-label="Sample images"
        className="m-0 flex min-w-0 flex-wrap justify-center gap-2 border-0 p-0"
      >
        {SAMPLES.map((s, i) => (
          <button
            key={s.label}
            type="button"
            aria-pressed={i === active}
            onClick={() => setActive(i)}
            className="rounded-full border border-border bg-background px-4 py-2 text-foreground text-sm outline-none transition-[background-color,border-color,transform] duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background motion-reduce:transition-none"
          >
            {s.label}
          </button>
        ))}
      </fieldset>
    </div>
  );
}
