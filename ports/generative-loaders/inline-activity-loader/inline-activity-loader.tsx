"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState, type CSSProperties } from "react";

// ---- upstream: packages/generative-loaders/src/types.ts ----
export type InlineActivityLoaderVariant =
  | "glyph"
  | "matrix"
  | "orbit"
  | "ripple"
  | "signal"
  | "spark"
  | "rotor"
  | "pixel-drift"
  | "chomp"
  | "snake"
  | "fold"
  | "gravity"
  | "domino"
  | "aperture"
  | "dot-pulse"
  | "vortex"
  | "halo"
  | "count-up";

export interface InlineActivityLoaderProps {
  variant: InlineActivityLoaderVariant;
  size?: number | string;
  speed?: number;
  color?: string;
  paused?: boolean;
  className?: string;
  /** Adds an accessible status label. Omit when adjacent text already names the activity. */
  label?: string;
}

// ---- upstream: packages/generative-loaders/src/styles.css (lines 203-421, plus the reduced-motion block for this prefix) ----
// Shipped as a string that React 19 hoists into <head> once
// (<style href precedence>), instead of upstream's `generative-loaders/styles.css`
// import. Keyframes and custom properties carry the component name.
const css = `.il-loader,
.il-loader * { box-sizing: border-box; }

.il-loader {
  --inline-activity-loader-color: currentColor;
  --inline-activity-loader-size: 1.15em;
  --inline-activity-loader-duration: 1.2s;
  width: var(--inline-activity-loader-size);
  height: var(--inline-activity-loader-size);
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  color: var(--inline-activity-loader-color);
  line-height: 1;
  vertical-align: -.16em;
}

.il-count-up {
  display: grid;
  height: 100%;
  min-width: 3ch;
  place-items: center;
  text-align: center;
  font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  font-size: max(10px, calc(var(--inline-activity-loader-size) * .43));
  font-variant-numeric: tabular-nums;
  font-weight: 650;
  line-height: 1;
  letter-spacing: -.08em;
  transform: translateY(.03em);
}

.il-glyph,
.il-matrix {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
}

.il-glyph { grid-template-columns: repeat(3, 1fr); gap: 8%; padding: 8%; }
.il-glyph i {
  width: 76%;
  aspect-ratio: 1;
  border: max(1px, calc(var(--inline-activity-loader-size) * .055)) solid currentColor;
  animation: inline-activity-loader-glyph var(--inline-activity-loader-duration) cubic-bezier(.45,0,.2,1) infinite;
  animation-delay: var(--inline-activity-loader-delay);
}
@keyframes inline-activity-loader-glyph {
  0%,100% { border-radius: 50%; transform: scale(.38) rotate(0deg); opacity: .28; background: transparent; }
  35% { border-radius: 20%; transform: scale(1) rotate(45deg); opacity: 1; background: currentColor; }
  68% { border-radius: 50% 8% 50% 8%; transform: scale(.72) rotate(90deg); opacity: .62; background: transparent; }
}

.il-matrix { grid-template-columns: repeat(5, 1fr); padding: 3%; }
.il-matrix i {
  width: calc(72% - var(--inline-activity-loader-distance) * 7%);
  aspect-ratio: 1;
  border-radius: 50%;
  background: currentColor;
  animation: inline-activity-loader-matrix var(--inline-activity-loader-duration) ease-in-out infinite;
  animation-delay: var(--inline-activity-loader-delay);
}
@keyframes inline-activity-loader-matrix { 0%,100% { opacity: .22; transform: scale(.48); } 48% { opacity: 1; transform: scale(1); } }

.il-orbit,
.il-spark { position: relative; width: 100%; height: 100%; display: block; }
.il-ripple { width: 100%; height: 100%; display: grid; place-items: center; }
.il-orbit { animation: inline-activity-loader-turn var(--inline-activity-loader-duration) linear infinite; }
.il-orbit i { position: absolute; width: 18%; aspect-ratio: 1; border-radius: 50%; background: currentColor; }
.il-orbit i:nth-child(1) { left: 41%; top: 0; }
.il-orbit i:nth-child(2) { right: 3%; bottom: 18%; opacity: .58; }
.il-orbit i:nth-child(3) { left: 3%; bottom: 18%; opacity: .28; }
.il-orbit b { position: absolute; inset: 30%; border: max(1px, calc(var(--inline-activity-loader-size) * .06)) solid currentColor; border-radius: 50%; }
@keyframes inline-activity-loader-turn { to { transform: rotate(360deg); } }

.il-ripple i,
.il-ripple b {
  grid-area: 1 / 1;
  width: 18%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: currentColor;
  transform-origin: center;
}
.il-ripple i { animation: inline-activity-loader-ripple var(--inline-activity-loader-duration) ease-out infinite; }
.il-ripple i:nth-child(2) { animation-delay: calc(var(--inline-activity-loader-duration) / -3); }
.il-ripple i:nth-child(3) { animation-delay: calc(var(--inline-activity-loader-duration) / -1.5); }
@keyframes inline-activity-loader-ripple { 0% { opacity: .8; transform: scale(.4); } 100% { opacity: 0; transform: scale(5.2); } }

.il-signal { width: 100%; height: 76%; display: flex; align-items: center; justify-content: space-between; }
.il-signal i { width: 12%; height: 30%; border-radius: 99px; background: currentColor; animation: inline-activity-loader-signal var(--inline-activity-loader-duration) ease-in-out infinite; animation-delay: var(--inline-activity-loader-delay); }
@keyframes inline-activity-loader-signal { 0%,100% { height: 25%; opacity: .28; } 50% { height: 100%; opacity: 1; } }

.il-spark i {
  position: absolute;
  display: block;
  aspect-ratio: 1;
  background: currentColor;
  clip-path: polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%);
  animation: inline-activity-loader-spark var(--inline-activity-loader-duration) cubic-bezier(.45,0,.2,1) infinite;
}
.il-spark i:nth-child(1) { inset: 18%; }
.il-spark i:nth-child(2) { width: 24%; right: 1%; top: 2%; animation-delay: calc(var(--inline-activity-loader-duration) * -.34); }
.il-spark i:nth-child(3) { width: 17%; left: 4%; bottom: 8%; animation-delay: calc(var(--inline-activity-loader-duration) * -.67); }
@keyframes inline-activity-loader-spark {
  0%,100% { opacity: .2; transform: scale(.38) rotate(-12deg); }
  42% { opacity: 1; transform: scale(1) rotate(0deg); }
  68% { opacity: .58; transform: scale(.72) rotate(9deg); }
}

.il-rotor,
.il-chomp,
.il-snake,
.il-gravity,
.il-aperture,
.il-vortex,
.il-halo { position:relative; width:100%; height:100%; display:block; }

.il-rotor { animation:inline-activity-loader-rotor calc(var(--inline-activity-loader-duration) * 1.4) cubic-bezier(.55,.06,.38,.94) infinite; }
.il-rotor svg { width:100%; height:100%; display:block; overflow:visible; }
.il-rotor-spokes { fill:none; stroke:currentColor; stroke-width:12; stroke-linecap:round; stroke-linejoin:round; opacity:.24; }
.il-rotor-ring { fill:color-mix(in srgb,currentColor 7%,transparent); stroke:currentColor; stroke-width:5.5; }
.il-rotor-ring-right { opacity:.76; }
.il-rotor-ring-left { opacity:.52; }
.il-rotor-hub-glow { fill:currentColor; opacity:.2; }
.il-rotor-hub { fill:currentColor; }
@keyframes inline-activity-loader-rotor { 0% { transform:rotate(0deg); } 35% { transform:rotate(145deg); } 70%,100% { transform:rotate(360deg); } }

.il-pixel-drift { width:100%; height:100%; display:grid; grid-template-columns:repeat(4,1fr); gap:7%; padding:5%; transform:rotate(45deg) scale(.78); }
.il-pixel-drift i { aspect-ratio:1; background:currentColor; animation:inline-activity-loader-pixel-drift var(--inline-activity-loader-duration) cubic-bezier(.4,0,.2,1) infinite; animation-delay:var(--inline-activity-loader-delay); }
@keyframes inline-activity-loader-pixel-drift { 0%,100% { opacity:.16; transform:translate(-28%,-28%) scale(.45); border-radius:50%; } 42% { opacity:1; transform:translate(0,0) scale(1); border-radius:10%; } 72% { opacity:.48; transform:translate(24%,24%) scale(.68); border-radius:35%; } }

.il-chomp { overflow:hidden; }
.il-chomp b { position:absolute; left:2%; top:27%; width:46%; height:46%; }
.il-chomp b::before,.il-chomp b::after { content:""; position:absolute; left:0; width:100%; height:50%; background:currentColor; animation:inline-activity-loader-chomp calc(var(--inline-activity-loader-duration) * .56) ease-in-out infinite; }
.il-chomp b::before { top:0; border-radius:999px 999px 0 0; transform-origin:50% 100%; }
.il-chomp b::after { bottom:0; border-radius:0 0 999px 999px; transform-origin:50% 0; animation-name:inline-activity-loader-chomp-lower; }
.il-chomp i { position:absolute; right:-10%; top:44%; width:10%; aspect-ratio:1; border-radius:50%; background:currentColor; animation:inline-activity-loader-chomp-dot calc(var(--inline-activity-loader-duration) * 1.15) linear infinite; animation-delay:var(--inline-activity-loader-delay); }
@keyframes inline-activity-loader-chomp { 0%,100% { transform:rotate(-28deg); } 48% { transform:rotate(0); } }
@keyframes inline-activity-loader-chomp-lower { 0%,100% { transform:rotate(28deg); } 48% { transform:rotate(0); } }
@keyframes inline-activity-loader-chomp-dot { from { transform:translateX(0); opacity:0; } 14% { opacity:1; } 78% { opacity:1; } to { transform:translateX(calc(var(--inline-activity-loader-size) * -.62)); opacity:0; } }

.il-snake { --inline-activity-loader-snake-duration:calc(var(--inline-activity-loader-duration) * 1.8); }
.il-snake i { position:absolute; z-index:1; left:7%; top:7%; width:15%; aspect-ratio:1; border-radius:50%; background:currentColor; opacity:calc(1 - var(--inline-activity-loader-i) * .075); animation:inline-activity-loader-snake var(--inline-activity-loader-snake-duration) linear infinite; animation-delay:calc(var(--inline-activity-loader-snake-duration) * (var(--inline-activity-loader-i) * .042 - 1)); }
.il-snake i:first-child { border-radius:42%; box-shadow:0 0 0 max(1px,calc(var(--inline-activity-loader-size) * .025)) color-mix(in srgb,currentColor 18%,transparent); }
.il-snake b { position:absolute; right:5%; top:45%; width:10%; aspect-ratio:1; border-radius:50%; background:currentColor; animation:inline-activity-loader-snake-food var(--inline-activity-loader-snake-duration) ease-in-out infinite; }
@keyframes inline-activity-loader-snake {
  0%,100% { left:7%; top:7%; transform:scale(var(--inline-activity-loader-scale)); }
  20% { left:78%; top:7%; transform:scale(var(--inline-activity-loader-scale)); }
  25% { left:86%; top:15%; transform:scale(var(--inline-activity-loader-scale)); }
  45% { left:86%; top:78%; transform:scale(var(--inline-activity-loader-scale)); }
  50% { left:78%; top:86%; transform:scale(var(--inline-activity-loader-scale)); }
  70% { left:7%; top:86%; transform:scale(var(--inline-activity-loader-scale)); }
  75% { left:0; top:78%; transform:scale(var(--inline-activity-loader-scale)); }
  95% { left:0; top:15%; transform:scale(var(--inline-activity-loader-scale)); }
}
@keyframes inline-activity-loader-snake-food {
  0%,20%,100% { opacity:.2; transform:scale(.65); }
  28% { opacity:.9; transform:scale(1); }
  34%,44% { opacity:0; transform:scale(.2); }
  52% { opacity:.2; transform:scale(.65); }
}

.il-fold { width:100%; height:100%; display:grid; grid-template-columns:repeat(2,1fr); gap:5%; padding:8%; perspective:calc(var(--inline-activity-loader-size) * 3); transform:rotate(45deg) scale(.82); }
.il-fold i { background:currentColor; transform-origin:0 50%; animation:inline-activity-loader-fold var(--inline-activity-loader-duration) cubic-bezier(.65,0,.35,1) infinite; animation-delay:var(--inline-activity-loader-delay); }
.il-fold i:nth-child(2),.il-fold i:nth-child(3) { opacity:.62; transform-origin:100% 50%; }
@keyframes inline-activity-loader-fold { 0%,100% { opacity:.18; transform:rotateY(78deg) scale(.72); } 45% { opacity:1; transform:rotateY(0) scale(1); } 72% { opacity:.48; transform:rotateX(-42deg) scale(.86); } }

.il-gravity { animation:inline-activity-loader-gravity-warp calc(var(--inline-activity-loader-duration) * 1.8) ease-in-out infinite; }
.il-gravity::before,.il-gravity::after { content:""; position:absolute; border:max(1px,calc(var(--inline-activity-loader-size) * .045)) solid currentColor; border-radius:50%; opacity:.2; }
.il-gravity::before { inset:12%; transform:rotate(-18deg) scaleY(.56); }
.il-gravity::after { inset:26%; transform:rotate(22deg) scaleY(.7); opacity:.34; }
.il-gravity i { position:absolute; left:45%; top:45%; width:10%; aspect-ratio:1; border-radius:50%; background:currentColor; transform-origin:50% 50%; animation:inline-activity-loader-gravity var(--inline-activity-loader-duration) cubic-bezier(.5,0,.25,1) infinite; animation-delay:var(--inline-activity-loader-delay); }
.il-gravity b { position:absolute; inset:39%; z-index:1; border-radius:50%; background:currentColor; box-shadow:0 0 0 max(1px,calc(var(--inline-activity-loader-size) * .05)) color-mix(in srgb,currentColor 18%,transparent); animation:inline-activity-loader-gravity-core var(--inline-activity-loader-duration) ease-in-out infinite; }
@keyframes inline-activity-loader-gravity { 0% { transform:rotate(var(--inline-activity-loader-angle)) translateY(calc(var(--inline-activity-loader-size) * -.42)) scale(.52); opacity:.22; } 58% { opacity:1; } 86%,100% { transform:rotate(calc(var(--inline-activity-loader-angle) + 150deg)) translateY(0) scale(.12); opacity:0; } }
@keyframes inline-activity-loader-gravity-warp { 0%,100% { transform:rotate(-5deg) scale(.94); } 50% { transform:rotate(7deg) scale(1); } }
@keyframes inline-activity-loader-gravity-core { 0%,100% { transform:scale(.78); } 58% { transform:scale(1.14); } }

.il-domino { width:100%; height:78%; display:flex; align-items:flex-end; justify-content:space-between; padding:0 4%; }
.il-domino i { width:16%; height:76%; border-radius:18%; background:currentColor; transform-origin:50% 100%; animation:inline-activity-loader-domino calc(var(--inline-activity-loader-duration) * 1.15) cubic-bezier(.5,0,.25,1) infinite; animation-delay:var(--inline-activity-loader-delay); }
@keyframes inline-activity-loader-domino { 0%,22%,100% { transform:rotate(0deg) translateX(0); opacity:.32; } 58%,76% { transform:rotate(32deg) translateX(10%); opacity:1; } }

.il-aperture { animation:inline-activity-loader-aperture-turn calc(var(--inline-activity-loader-duration) * 2) linear infinite; }
.il-aperture i { position:absolute; left:43%; top:5%; width:14%; height:46%; background:currentColor; clip-path:polygon(0 0,100% 18%,70% 100%,0 76%); transform-origin:50% 98%; transform:rotate(var(--inline-activity-loader-angle)) scaleY(.68); animation:inline-activity-loader-aperture var(--inline-activity-loader-duration) ease-in-out infinite; animation-delay:var(--inline-activity-loader-delay); }
.il-aperture b { position:absolute; inset:39%; border-radius:50%; background:color-mix(in srgb,currentColor 12%,transparent); box-shadow:0 0 0 max(1px,calc(var(--inline-activity-loader-size) * .045)) currentColor; }
@keyframes inline-activity-loader-aperture { 0%,100% { opacity:.28; transform:rotate(var(--inline-activity-loader-angle)) scaleY(.54); } 48% { opacity:1; transform:rotate(calc(var(--inline-activity-loader-angle) + 18deg)) scaleY(1); } }
@keyframes inline-activity-loader-aperture-turn { to { transform:rotate(360deg); } }

.il-dot-pulse { width:100%; height:100%; display:flex; align-items:center; justify-content:space-between; padding:0 3%; }
.il-dot-pulse i { width:18%; aspect-ratio:1; border-radius:50%; background:currentColor; animation:inline-activity-loader-dot-pulse var(--inline-activity-loader-duration) cubic-bezier(.45,0,.2,1) infinite; animation-delay:calc(var(--inline-activity-loader-duration) * (var(--inline-activity-loader-i) * -.15)); }
@keyframes inline-activity-loader-dot-pulse {
  0%,100% { opacity:.24; transform:translateY(0) scale(.62); }
  38% { opacity:1; transform:translateY(-32%) scale(1); }
  68% { opacity:.52; transform:translateY(10%) scale(.78); }
}

.il-vortex { animation:inline-activity-loader-vortex-turn calc(var(--inline-activity-loader-duration) * 3.2) linear infinite; }
.il-vortex i { position:absolute; left:var(--inline-activity-loader-x); top:var(--inline-activity-loader-y); width:6%; aspect-ratio:1; border-radius:50%; background:currentColor; transform:translate(-50%,-50%) scale(var(--inline-activity-loader-scale)); animation:inline-activity-loader-vortex-dot var(--inline-activity-loader-duration) ease-in-out infinite; animation-delay:var(--inline-activity-loader-delay); }
.il-vortex b { position:absolute; inset:45%; border-radius:50%; background:currentColor; animation:inline-activity-loader-vortex-core var(--inline-activity-loader-duration) ease-in-out infinite; }
@keyframes inline-activity-loader-vortex-turn { to { transform:rotate(360deg); } }
@keyframes inline-activity-loader-vortex-dot {
  0%,100% { opacity:.2; transform:translate(-50%,-50%) scale(.48); }
  48% { opacity:1; transform:translate(-50%,-50%) scale(var(--inline-activity-loader-scale)); }
}
@keyframes inline-activity-loader-vortex-core { 0%,100% { opacity:.35; transform:scale(.7); } 50% { opacity:1; transform:scale(1); } }

.il-halo { animation:inline-activity-loader-halo-drift calc(var(--inline-activity-loader-duration) * 2.4) ease-in-out infinite; }
.il-halo i { position:absolute; left:42%; top:2%; width:16%; aspect-ratio:1; border-radius:50%; background:currentColor; transform-origin:50% 300%; animation:inline-activity-loader-halo var(--inline-activity-loader-duration) ease-in-out infinite; animation-delay:calc(var(--inline-activity-loader-duration) * (var(--inline-activity-loader-i) * -.105)); }
@keyframes inline-activity-loader-halo {
  0%,100% { opacity:.22; transform:rotate(var(--inline-activity-loader-angle)) scale(.58); }
  42% { opacity:1; transform:rotate(var(--inline-activity-loader-angle)) scale(1); }
  70% { opacity:.48; transform:rotate(var(--inline-activity-loader-angle)) scale(.76); }
}
@keyframes inline-activity-loader-halo-drift { 0%,100% { transform:rotate(-7deg) scale(.94); } 50% { transform:rotate(7deg) scale(1); } }

.il-loader[data-paused="true"] *,
.il-loader[data-paused="true"] *::before,
.il-loader[data-paused="true"] *::after { animation-play-state: paused !important; }

/* Labs: figures draw left to right in right-to-left pages too, so rows and
   grids keep their timing order (a loader has nothing to mirror). */
.il-loader { direction: ltr; }

@media (prefers-reduced-motion: reduce) {
  .il-loader *, .il-loader *::before, .il-loader *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
`;

// ---- upstream: packages/generative-loaders/src/components.tsx (classes, safeRate and InlineLoader) ----
function classes(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

function safeRate(speed: number) {
  return Number.isFinite(speed) && speed > 0 ? speed : 1;
}

const matrixDots = Array.from({ length: 25 }, (_, index) => {
  const x = index % 5;
  const y = Math.floor(index / 5);
  return { index, distance: Math.abs(x - 2) + Math.abs(y - 2) };
});

const vortexDots = [8, 12, 16].flatMap((count, ring) => Array.from({ length: count }, (_, index) => ({
  id: `${ring}-${index}`,
  x: 50 + Math.sin((index * (360 / count) + ring * 11) * Math.PI / 180) * (18 + ring * 14),
  y: 50 - Math.cos((index * (360 / count) + ring * 11) * Math.PI / 180) * (18 + ring * 14),
  delay: -(ring * .12 + index / count),
  scale: 1 - ring * .12,
})));

function CountUpVisual({ active, speed }: { active: boolean; speed: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    const delay = value === 100 ? 800 : 45;
    const timer = window.setTimeout(() => {
      setValue((current) => current === 100 ? 0 : current + 1);
    }, delay / speed);
    return () => window.clearTimeout(timer);
  }, [active, speed, value]);

  return <span className="il-count-up" data-value={value}>{value}</span>;
}

function InlineVisual({ variant, active, speed }: Pick<InlineActivityLoaderProps, "variant"> & { active: boolean; speed: number }) {
  if (variant === "glyph") return <span className="il-glyph">{Array.from({ length: 9 }, (_, index) => <i key={index} style={{ "--inline-activity-loader-i": index, "--inline-activity-loader-delay": `${index * -.11}s` } as CSSProperties} />)}</span>;
  if (variant === "matrix") return <span className="il-matrix">{matrixDots.map(({ index, distance }) => <i key={index} style={{ "--inline-activity-loader-i": index, "--inline-activity-loader-distance": distance, "--inline-activity-loader-delay": `${distance * -.13 - index * .008}s` } as CSSProperties} />)}</span>;
  if (variant === "orbit") return <span className="il-orbit"><i /><i /><i /><b /></span>;
  if (variant === "ripple") return <span className="il-ripple"><i /><i /><i /><b /></span>;
  if (variant === "signal") return <span className="il-signal">{Array.from({ length: 5 }, (_, index) => <i key={index} style={{ "--inline-activity-loader-i": index, "--inline-activity-loader-delay": `${index * -.12}s` } as CSSProperties} />)}</span>;
  if (variant === "spark") return <span className="il-spark"><i /><i /><i /></span>;
  if (variant === "rotor") return <span className="il-rotor"><svg aria-hidden="true" viewBox="0 0 100 100">
    <path className="il-rotor-spokes" d="M50 56 L50 22 M50 56 L79.45 73 M50 56 L20.55 73" />
    <circle className="il-rotor-ring il-rotor-ring-top" cx="50" cy="18" r="13" />
    <circle className="il-rotor-ring il-rotor-ring-right" cx="82.91" cy="75" r="13" />
    <circle className="il-rotor-ring il-rotor-ring-left" cx="17.09" cy="75" r="13" />
    <circle className="il-rotor-hub-glow" cx="50" cy="56" r="12" />
    <circle className="il-rotor-hub" cx="50" cy="56" r="8.5" />
  </svg></span>;
  if (variant === "pixel-drift") return <span className="il-pixel-drift">{Array.from({ length: 16 }, (_, index) => <i key={index} style={{ "--inline-activity-loader-i": index, "--inline-activity-loader-delay": `${((index % 4) + Math.floor(index / 4)) * -.1}s` } as CSSProperties} />)}</span>;
  if (variant === "chomp") return <span className="il-chomp"><b />{Array.from({ length: 4 }, (_, index) => <i key={index} style={{ "--inline-activity-loader-delay": `${index * -.24}s` } as CSSProperties} />)}</span>;
  if (variant === "snake") return <span className="il-snake">{Array.from({ length: 7 }, (_, index) => <i key={index} style={{ "--inline-activity-loader-i": index, "--inline-activity-loader-scale": 1 - index * .075 } as CSSProperties} />)}<b /></span>;
  if (variant === "fold") return <span className="il-fold">{Array.from({ length: 4 }, (_, index) => <i key={index} style={{ "--inline-activity-loader-delay": `${index * -.18}s` } as CSSProperties} />)}</span>;
  if (variant === "gravity") return <span className="il-gravity">{Array.from({ length: 5 }, (_, index) => <i key={index} style={{ "--inline-activity-loader-angle": `${index * 72}deg`, "--inline-activity-loader-delay": `${index * -.19}s` } as CSSProperties} />)}<b /></span>;
  if (variant === "domino") return <span className="il-domino">{Array.from({ length: 4 }, (_, index) => <i key={index} style={{ "--inline-activity-loader-delay": `calc(var(--inline-activity-loader-duration) * ${(3 - index) * -.115})` } as CSSProperties} />)}</span>;
  if (variant === "aperture") return <span className="il-aperture">{Array.from({ length: 6 }, (_, index) => <i key={index} style={{ "--inline-activity-loader-angle": `${index * 60}deg`, "--inline-activity-loader-delay": `${index * -.08}s` } as CSSProperties} />)}<b /></span>;
  if (variant === "dot-pulse") return <span className="il-dot-pulse">{Array.from({ length: 4 }, (_, index) => <i key={index} style={{ "--inline-activity-loader-i": 3 - index } as CSSProperties} />)}</span>;
  if (variant === "vortex") return <span className="il-vortex">{vortexDots.map((dot) => <i key={dot.id} style={{ "--inline-activity-loader-x": `${dot.x}%`, "--inline-activity-loader-y": `${dot.y}%`, "--inline-activity-loader-delay": `${dot.delay}s`, "--inline-activity-loader-scale": dot.scale } as CSSProperties} />)}<b /></span>;
  if (variant === "halo") return <span className="il-halo">{Array.from({ length: 8 }, (_, index) => <i key={index} style={{ "--inline-activity-loader-angle": `${index * 45}deg`, "--inline-activity-loader-i": index } as CSSProperties} />)}</span>;
  return <CountUpVisual active={active} speed={speed} />;
}

export function InlineActivityLoader({
  variant,
  size = "1.15em",
  speed = 1,
  color = "currentColor",
  paused = false,
  className,
  label,
}: InlineActivityLoaderProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const active = !paused && !reduceMotion;
  const safeSpeed = safeRate(speed);

  return <span
    className={classes("il-loader", className)}
    data-variant={variant}
    data-speed={safeSpeed}
    data-paused={!active ? "true" : "false"}
    role={label ? "status" : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : "true"}
    style={{
      "--inline-activity-loader-color": color,
      "--inline-activity-loader-size": typeof size === "number" ? `${size}px` : size,
      "--inline-activity-loader-duration": `${1.2 / safeSpeed}s`,
    } as CSSProperties}
  ><style href="designfrom-inline-activity-loader" precedence="default">{css}</style><InlineVisual variant={variant} active={active} speed={safeSpeed} />{/* Labs: the label as live-region content. Without a label the loader stays aria-hidden: adjacent text names the activity. */}{label ? <span style={visuallyHidden}>{label}</span> : null}</span>;
}

// ---- Labs ----
/** The standard visually hidden (sr-only) clip: read by screen readers, never painted. */
const visuallyHidden: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};
