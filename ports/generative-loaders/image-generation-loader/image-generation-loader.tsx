"use client";

import { useReducedMotion } from "motion/react";
import { type CSSProperties } from "react";

// ---- upstream: packages/generative-loaders/src/types.ts ----
export type ImageGenerationLoaderVariant =
  | "skeleton"
  | "bands"
  | "tiles"
  | "scan"
  | "pixel-grid"
  | "resolution"
  | "coalesce"
  | "diffusion"
  | "raster"
  | "bloom"
  | "focus"
  | "shutter";

export interface ImageGenerationLoaderProps {
  variant: ImageGenerationLoaderVariant;
  size?: number | string;
  speed?: number;
  color?: string;
  radius?: number | string;
  paused?: boolean;
  className?: string;
  /** Accessible status text for the image-generation activity. */
  label?: string;
}

// ---- upstream: packages/generative-loaders/src/styles.css (lines 423-519, plus the reduced-motion block for this prefix) ----
// Shipped as a string that React 19 hoists into <head> once
// (<style href precedence>), instead of upstream's `generative-loaders/styles.css`
// import. Keyframes and custom properties carry the component name.
const css = `.iml-loader,
.iml-loader * { box-sizing:border-box; }

.iml-loader {
  --image-generation-loader-color:currentColor;
  --image-generation-loader-size:10rem;
  --image-generation-loader-radius:10%;
  --image-generation-loader-duration:2.35s;
  display:inline-grid;
  width:var(--image-generation-loader-size);
  height:var(--image-generation-loader-size);
  flex:0 0 auto;
  place-items:center;
  color:var(--image-generation-loader-color);
  line-height:1;
}
.iml-visual { position:relative; display:block; width:100%; height:100%; overflow:hidden; border-radius:var(--image-generation-loader-radius); background:color-mix(in srgb,currentColor 3%,transparent); isolation:isolate; }
.iml-visual>span { position:absolute; inset:0; display:block; }
.iml-visual i,.iml-visual b,.iml-visual em { position:absolute; display:block; margin:0; font:inherit; }

.iml-skeleton { inset:7%!important; overflow:hidden; border:1px solid color-mix(in srgb,currentColor 12%,transparent); background:color-mix(in srgb,currentColor 4%,transparent); }
.iml-skeleton i { inset:0; background:color-mix(in srgb,currentColor 3%,transparent); }
.iml-skeleton b { inset:0 auto 0 -55%; width:48%; background:linear-gradient(90deg,transparent,color-mix(in srgb,currentColor 13%,transparent),transparent); filter:blur(2px); animation:image-generation-loader-skeleton var(--image-generation-loader-duration) cubic-bezier(.45,0,.55,1) infinite; }
@keyframes image-generation-loader-skeleton { 0%,12% { transform:translateX(0); opacity:0; } 24% { opacity:1; } 72% { opacity:1; } 86%,100% { transform:translateX(330%); opacity:0; } }

.iml-bands i { left:8%; width:84%; height:25%; background:color-mix(in srgb,currentColor 72%,transparent); animation:image-generation-loader-band var(--image-generation-loader-duration) cubic-bezier(.65,0,.35,1) infinite; }
.iml-bands i:nth-child(1) { top:8%; transform-origin:left; }
.iml-bands i:nth-child(2) { top:37.5%; transform-origin:right; animation-delay:calc(var(--image-generation-loader-duration) * -.08); }
.iml-bands i:nth-child(3) { bottom:8%; transform-origin:left; animation-delay:calc(var(--image-generation-loader-duration) * -.16); }
.iml-bands b { inset:8%; border:1px solid currentColor; opacity:.12; }
@keyframes image-generation-loader-band { 0%,14%,100% { opacity:.12; transform:scaleX(.72); } 42%,76% { opacity:.82; transform:scaleX(1); } }

.iml-tiles { display:grid!important; grid-template-columns:repeat(4,1fr); gap:3%; padding:7%; }
.iml-tiles i { position:relative; width:100%; height:100%; border-radius:9%; background:color-mix(in srgb,currentColor 68%,transparent); animation:image-generation-loader-tile var(--image-generation-loader-duration) cubic-bezier(.65,0,.35,1) infinite; animation-delay:var(--image-generation-loader-delay); }
@keyframes image-generation-loader-tile { 0%,14%,100% { opacity:.1; transform:scale(.76); } 44%,76% { opacity:.72; transform:scale(1); } }

.iml-scan { inset:7%!important; overflow:hidden; border:1px solid color-mix(in srgb,currentColor 25%,transparent); }
.iml-scan i { inset:0; background:linear-gradient(135deg,color-mix(in srgb,currentColor 8%,transparent),color-mix(in srgb,currentColor 48%,transparent)); clip-path:inset(100% 0 0); animation:image-generation-loader-scan-fill var(--image-generation-loader-duration) cubic-bezier(.65,0,.35,1) infinite; }
.iml-scan b { left:0; right:0; top:0; height:1px; background:color-mix(in srgb,currentColor 72%,transparent); box-shadow:0 0 6px color-mix(in srgb,currentColor 32%,transparent); animation:image-generation-loader-scan-line var(--image-generation-loader-duration) cubic-bezier(.65,0,.35,1) infinite; }
.iml-scan em { inset:11%; border:1px solid color-mix(in srgb,currentColor 24%,transparent); opacity:.32; animation:image-generation-loader-scan-frame var(--image-generation-loader-duration) ease-in-out infinite; }
@keyframes image-generation-loader-scan-fill { 0%,14%,100% { clip-path:inset(100% 0 0); opacity:.08; } 54%,78% { clip-path:inset(0 0 0); opacity:.72; } }
@keyframes image-generation-loader-scan-line { 0%,14% { top:0; opacity:0; } 22% { opacity:.72; } 54% { top:calc(100% - 1px); opacity:.72; } 72%,100% { top:calc(100% - 1px); opacity:0; } }
@keyframes image-generation-loader-scan-frame { 0%,100% { transform:scale(.94); opacity:.1; } 54%,78% { transform:scale(1); opacity:.32; } }

.iml-pixel-grid { display:grid!important; grid-template-columns:repeat(4,1fr); gap:2%; padding:7%; }
.iml-pixel-grid i { position:relative; width:100%; height:100%; background:color-mix(in srgb,currentColor 66%,transparent); animation:image-generation-loader-pixel var(--image-generation-loader-duration) cubic-bezier(.65,0,.35,1) infinite; animation-delay:var(--image-generation-loader-delay); }
@keyframes image-generation-loader-pixel { 0%,14%,100% { opacity:.06; transform:translate(calc((var(--image-generation-loader-x) - 1.5) * 7%),calc((var(--image-generation-loader-y) - 1.5) * 7%)) scale(.72); border-radius:12%; } 44%,76% { opacity:calc(.34 + (var(--image-generation-loader-x) + var(--image-generation-loader-y)) * .045); transform:translate(0,0) scale(1); border-radius:2%; } }

.iml-resolution { display:grid!important; grid-template-columns:repeat(6,1fr); gap:2%; padding:8%; background:color-mix(in srgb,currentColor 3%,transparent); }
.iml-resolution i { position:relative; width:100%; height:100%; border-radius:16%; background:color-mix(in srgb,currentColor var(--image-generation-loader-tone),transparent); opacity:.1; transform:scale(.9); animation:image-generation-loader-resolution var(--image-generation-loader-duration) cubic-bezier(.4,0,.2,1) infinite; animation-delay:var(--image-generation-loader-delay); }
@keyframes image-generation-loader-resolution { 0%,18%,100% { opacity:.1; transform:scale(.9); filter:blur(.35px); } 46%,70% { opacity:.82; transform:scale(1); filter:blur(0); } 84% { opacity:.26; transform:scale(.96); filter:blur(0); } }

.iml-coalesce { inset:7%!important; }
.iml-coalesce i { left:var(--image-generation-loader-start-x); top:var(--image-generation-loader-start-y); width:var(--image-generation-loader-particle-size); aspect-ratio:1; border-radius:50%; background:currentColor; animation:image-generation-loader-coalesce-flow calc(var(--image-generation-loader-duration) * .88) linear infinite; animation-delay:var(--image-generation-loader-delay); }
.iml-coalesce b { left:48.4%; top:48.4%; width:3.2%; aspect-ratio:1; border-radius:50%; background:currentColor; box-shadow:0 0 calc(var(--image-generation-loader-size) * .035) color-mix(in srgb,currentColor 22%,transparent); animation:image-generation-loader-coalesce-core calc(var(--image-generation-loader-duration) * .88) ease-in-out infinite; }
@keyframes image-generation-loader-coalesce-flow { 0% { left:var(--image-generation-loader-start-x); top:var(--image-generation-loader-start-y); opacity:0; transform:translate(-50%,-50%) scale(.35); } 14% { opacity:.26; transform:translate(-50%,-50%) scale(.62); } 56% { left:var(--image-generation-loader-mid-x); top:var(--image-generation-loader-mid-y); opacity:var(--image-generation-loader-particle-opacity); transform:translate(-50%,-50%) scale(.86); } 86% { left:var(--image-generation-loader-end-x); top:var(--image-generation-loader-end-y); opacity:var(--image-generation-loader-particle-opacity); transform:translate(-50%,-50%) scale(1); } 100% { left:50%; top:50%; opacity:0; transform:translate(-50%,-50%) scale(.12); } }
@keyframes image-generation-loader-coalesce-core { 0%,100% { opacity:.46; transform:scale(.76); } 82% { opacity:.9; transform:scale(1.08); } }

.iml-diffusion { inset:7%!important; }
.iml-diffusion i { left:var(--image-generation-loader-x); top:var(--image-generation-loader-y); width:var(--image-generation-loader-dot-size); aspect-ratio:1; border-radius:8%; background:currentColor; animation:image-generation-loader-diffusion var(--image-generation-loader-duration) ease-in-out infinite; animation-delay:var(--image-generation-loader-delay); }
@keyframes image-generation-loader-diffusion { 0%,100% { opacity:.06; filter:blur(2px); transform:translate(-50%,-50%) scale(.35); } 38% { opacity:.7; filter:blur(0); transform:translate(-50%,-50%) scale(1); } 68% { opacity:.2; filter:blur(.5px); transform:translate(-50%,-50%) scale(.64); } }

.iml-raster { display:grid!important; grid-template-rows:repeat(8,1fr); gap:4%; padding:8%; }
.iml-raster i { position:relative; width:100%; height:100%; border-radius:2px; background:currentColor; transform-origin:left; animation:image-generation-loader-raster var(--image-generation-loader-duration) cubic-bezier(.65,0,.35,1) infinite; animation-delay:var(--image-generation-loader-delay); }
.iml-raster i:nth-child(even) { transform-origin:right; }
@keyframes image-generation-loader-raster { 0%,12%,100% { opacity:.06; transform:scaleX(.12); } 46%,72% { opacity:.64; transform:scaleX(1); } }

.iml-bloom { inset:7%!important; overflow:hidden; }
.iml-bloom i,.iml-bloom b,.iml-bloom em { border-radius:50%; }
.iml-bloom i { inset:8%; border:1px solid color-mix(in srgb,currentColor 32%,transparent); animation:image-generation-loader-bloom-ring var(--image-generation-loader-duration) cubic-bezier(.22,1,.36,1) infinite; }
.iml-bloom b { inset:25%; background:color-mix(in srgb,currentColor 18%,transparent); box-shadow:0 0 calc(var(--image-generation-loader-size) * .12) color-mix(in srgb,currentColor 22%,transparent); animation:image-generation-loader-bloom-fill var(--image-generation-loader-duration) ease-in-out infinite; }
.iml-bloom em { inset:42%; background:currentColor; animation:image-generation-loader-bloom-core var(--image-generation-loader-duration) ease-in-out infinite; }
@keyframes image-generation-loader-bloom-ring { 0%,12%,100% { opacity:.08; transform:scale(.28); } 58%,78% { opacity:.5; transform:scale(1); } }
@keyframes image-generation-loader-bloom-fill { 0%,100% { opacity:.05; transform:scale(.45); filter:blur(5px); } 54%,76% { opacity:.55; transform:scale(1.28); filter:blur(0); } }
@keyframes image-generation-loader-bloom-core { 0%,100% { opacity:.16; transform:scale(.6); } 48%,72% { opacity:.86; transform:scale(1); } }

.iml-focus i { border:1px solid currentColor; animation:image-generation-loader-focus var(--image-generation-loader-duration) cubic-bezier(.22,1,.36,1) infinite; }
.iml-focus i:nth-child(1) { inset:8%; }
.iml-focus i:nth-child(2) { inset:21%; animation-delay:calc(var(--image-generation-loader-duration) * -.07); }
.iml-focus i:nth-child(3) { inset:34%; animation-delay:calc(var(--image-generation-loader-duration) * -.14); }
.iml-focus b { inset:42%; background:currentColor; animation:image-generation-loader-focus-core var(--image-generation-loader-duration) ease-in-out infinite; }
@keyframes image-generation-loader-focus { 0%,14%,100% { opacity:.08; transform:scale(1.08); filter:blur(1px); } 46%,76% { opacity:.58; transform:scale(1); filter:blur(0); } }
@keyframes image-generation-loader-focus-core { 0%,14%,100% { opacity:.08; transform:scale(.72); } 48%,76% { opacity:.62; transform:scale(1); } }

.iml-shutter { inset:7%!important; overflow:hidden; border:1px solid color-mix(in srgb,currentColor 18%,transparent); }
.iml-shutter i { top:0; bottom:0; width:50%; background:linear-gradient(90deg,color-mix(in srgb,currentColor 50%,transparent),color-mix(in srgb,currentColor 68%,transparent)); will-change:transform,opacity; animation:image-generation-loader-shutter-panel var(--image-generation-loader-duration) linear infinite; }
.iml-shutter i:nth-child(1) { left:0; transform-origin:left; }
.iml-shutter i:nth-child(2) { right:0; transform-origin:right; background:linear-gradient(270deg,color-mix(in srgb,currentColor 50%,transparent),color-mix(in srgb,currentColor 68%,transparent)); }
.iml-shutter b { left:calc(50% - .5px); top:0; bottom:0; width:1px; background:color-mix(in srgb,currentColor 42%,transparent); animation:image-generation-loader-shutter-seam var(--image-generation-loader-duration) ease-in-out infinite; }
.iml-shutter em { inset:13%; border:1px solid color-mix(in srgb,currentColor 42%,transparent); will-change:transform,opacity; animation:image-generation-loader-shutter-mark var(--image-generation-loader-duration) cubic-bezier(.22,1,.36,1) infinite; }
@keyframes image-generation-loader-shutter-panel { 0%,10%,100% { opacity:.08; transform:scaleX(.2); animation-timing-function:cubic-bezier(.22,1,.36,1); } 42% { opacity:.68; transform:scaleX(1); } 68% { opacity:.68; transform:scaleX(1); animation-timing-function:cubic-bezier(.65,0,.35,1); } 92% { opacity:.08; transform:scaleX(.2); } }
@keyframes image-generation-loader-shutter-seam { 0%,18%,100% { opacity:.08; transform:scaleY(.72); } 44%,72% { opacity:.48; transform:scaleY(1); } 90% { opacity:.12; transform:scaleY(.8); } }
@keyframes image-generation-loader-shutter-mark { 0%,12%,100% { opacity:.04; transform:scale(.9); } 44% { opacity:.42; transform:scale(1); } 68% { opacity:.42; transform:scale(1); } 92% { opacity:.04; transform:scale(.9); } }

.iml-loader[data-paused="true"] *,
.iml-loader[data-paused="true"] *::before,
.iml-loader[data-paused="true"] *::after { animation-play-state:paused!important; }

/* Labs: the figure draws left to right in right-to-left pages too (grids keep
   their timing order); the skeleton sweep follows the reading direction. */
.iml-visual { direction: ltr; }
.iml-loader:dir(rtl) .iml-skeleton { scale: -1 1; }

@media (prefers-reduced-motion: reduce) {
  .iml-loader *, .iml-loader *::before, .iml-loader *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
`;

// ---- upstream: packages/generative-loaders/src/components.tsx (classes, safeRate and ImageLoader) ----
function classes(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

function safeRate(speed: number) {
  return Number.isFinite(speed) && speed > 0 ? speed : 1;
}

const imageTiles = Array.from({ length: 16 }, (_, index) => ({
  index,
  x: index % 4,
  y: Math.floor(index / 4),
}));

const resolutionCells = Array.from({ length: 36 }, (_, index) => {
  const x = index % 6;
  const y = Math.floor(index / 6);
  return { index, distance: Math.abs(x - 2.5) + Math.abs(y - 2.5), tone: 28 + ((x * 13 + y * 9) % 34) };
});

const cssDecimal = (value: number) => value.toFixed(3);

const coalesceParticles = Array.from({ length: 24 }, (_, index) => {
  const angle = index * 137.508 * Math.PI / 180;
  const radiusX = 42 + ((index * 7) % 8);
  const radiusY = 38 + ((index * 11) % 10);
  const startX = 50 + Math.cos(angle) * radiusX;
  const startY = 50 + Math.sin(angle) * radiusY;
  const bend = ((index % 5) - 2) * 1.8;
  return {
    index,
    startX: cssDecimal(startX),
    startY: cssDecimal(startY),
    midX: cssDecimal(startX * .46 + 50 * .54 - Math.sin(angle) * bend),
    midY: cssDecimal(startY * .46 + 50 * .54 + Math.cos(angle) * bend),
    endX: cssDecimal(50 + Math.cos(angle * 1.7) * (1.2 + index % 3 * .55)),
    endY: cssDecimal(50 + Math.sin(angle * 1.7) * (1.2 + index % 3 * .55)),
    size: cssDecimal(1.35 + ((index * 7) % 5) * .32),
    delay: cssDecimal(-((index * 11) % 24) / 24),
    opacity: cssDecimal(.42 + (index % 4) * .12),
  };
});

const diffusionParticles = Array.from({ length: 28 }, (_, index) => ({
  index,
  x: 8 + ((index * 37) % 84),
  y: 8 + ((index * 53) % 84),
  size: cssDecimal(1.8 + ((index * 7) % 5) * .7),
  delay: cssDecimal(-((index * 13) % 28) / 28),
}));

function ImageVisual({ variant }: Pick<ImageGenerationLoaderProps, "variant">) {
  if (variant === "skeleton") return <span className="iml-skeleton"><i /><b /></span>;
  if (variant === "bands") return <span className="iml-bands"><i /><i /><i /><b /></span>;
  if (variant === "tiles") return <span className="iml-tiles">{imageTiles.map(({ index, x, y }) => <i key={index} style={{ "--image-generation-loader-i": index, "--image-generation-loader-delay": `${cssDecimal((Math.abs(x - 1.5) + Math.abs(y - 1.5) - 4) * .12)}s` } as CSSProperties} />)}</span>;
  if (variant === "scan") return <span className="iml-scan"><i /><b /><em /></span>;
  if (variant === "pixel-grid") return <span className="iml-pixel-grid">{imageTiles.map(({ index, x, y }) => <i key={index} style={{ "--image-generation-loader-x": x, "--image-generation-loader-y": y, "--image-generation-loader-delay": `${cssDecimal((x + y - 6) * .09)}s` } as CSSProperties} />)}</span>;
  if (variant === "resolution") return <span className="iml-resolution">{resolutionCells.map(({ index, distance, tone }) => <i key={index} style={{ "--image-generation-loader-delay": `${cssDecimal((distance - 6) * .055)}s`, "--image-generation-loader-tone": `${tone}%` } as CSSProperties} />)}</span>;
  if (variant === "coalesce") return <span className="iml-coalesce">{coalesceParticles.map(({ index, startX, startY, midX, midY, endX, endY, size, delay, opacity }) => <i key={index} style={{ "--image-generation-loader-start-x": `${startX}%`, "--image-generation-loader-start-y": `${startY}%`, "--image-generation-loader-mid-x": `${midX}%`, "--image-generation-loader-mid-y": `${midY}%`, "--image-generation-loader-end-x": `${endX}%`, "--image-generation-loader-end-y": `${endY}%`, "--image-generation-loader-particle-size": `${size}%`, "--image-generation-loader-delay": `calc(var(--image-generation-loader-duration) * ${delay})`, "--image-generation-loader-particle-opacity": opacity } as CSSProperties} />)}<b /></span>;
  if (variant === "diffusion") return <span className="iml-diffusion">{diffusionParticles.map(({ index, x, y, size, delay }) => <i key={index} style={{ "--image-generation-loader-x": `${x}%`, "--image-generation-loader-y": `${y}%`, "--image-generation-loader-dot-size": `${size}%`, "--image-generation-loader-delay": `calc(var(--image-generation-loader-duration) * ${delay})` } as CSSProperties} />)}</span>;
  if (variant === "raster") return <span className="iml-raster">{Array.from({ length: 8 }, (_, index) => <i key={index} style={{ "--image-generation-loader-i": index, "--image-generation-loader-delay": `calc(var(--image-generation-loader-duration) * ${cssDecimal(index * -.035)})` } as CSSProperties} />)}</span>;
  if (variant === "bloom") return <span className="iml-bloom"><i /><b /><em /></span>;
  if (variant === "focus") return <span className="iml-focus"><i /><i /><i /><b /></span>;
  return <span className="iml-shutter"><i /><i /><b /><em /></span>;
}

export function ImageGenerationLoader({
  variant,
  size = "10rem",
  speed = 1,
  color = "currentColor",
  radius = "10%",
  paused = false,
  className,
  label = "Generating image",
}: ImageGenerationLoaderProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const active = !paused && !reduceMotion;
  const safeSpeed = safeRate(speed);

  return <span
    className={classes("iml-loader", className)}
    data-variant={variant}
    data-speed={safeSpeed}
    data-paused={!active ? "true" : "false"}
    role="status"
    aria-label={label}
    style={{
      "--image-generation-loader-color": color,
      "--image-generation-loader-size": typeof size === "number" ? `${size}px` : size,
      "--image-generation-loader-radius": typeof radius === "number" ? `${radius}px` : radius,
      "--image-generation-loader-duration": `${2.35 / safeSpeed}s`,
    } as CSSProperties}
  ><style href="designfrom-image-generation-loader" precedence="default">{css}</style><span className="iml-visual" aria-hidden="true"><ImageVisual variant={variant} /></span>{/* Labs: the label as live-region content. */}<span style={visuallyHidden}>{label}</span></span>;
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
