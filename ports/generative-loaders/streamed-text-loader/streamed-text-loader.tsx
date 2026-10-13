"use client";

import { motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

// ---- upstream: packages/generative-loaders/src/types.ts ----
export type StreamedTextLoaderVariant =
  | "decode"
  | "typewriter"
  | "skeleton"
  | "cascade"
  | "focus"
  | "wipe"
  | "flip"
  | "redact"
  | "line"
  | "terminal"
  | "wave"
  | "dissolve"
  | "slice"
  | "tracking"
  | "coalesce"
  | "fragments";

export interface StreamedTextLoaderProps {
  text: string;
  variant: StreamedTextLoaderVariant;
  speed?: number;
  color?: string;
  paused?: boolean;
  className?: string;
  "aria-label"?: string;
  /**
   * Labs: the text direction. `"auto"` (default) follows the text itself, so
   * Latin text keeps its order inside a right-to-left page and Arabic or
   * Hebrew text reads right to left in a left-to-right one.
   */
  dir?: "auto" | "ltr" | "rtl";
}

// ---- upstream: packages/generative-loaders/src/styles.css (lines 1-201, plus the reduced-motion block for this prefix) ----
// Shipped as a string that React 19 hoists into <head> once
// (<style href precedence>), instead of upstream's `generative-loaders/styles.css`
// import. Keyframes and custom properties carry the component name.
const css = `:root {
  --streamed-text-loader-color: #111111;
  --streamed-text-loader-ink: #202227;
  --streamed-text-loader-muted: #dfe1e6;
  --streamed-text-loader-font: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.tl-loader,
.tl-loader * { box-sizing: border-box; }

.tl-loader {
  display: block;
  width: 100%;
  color: var(--streamed-text-loader-color);
  font-family: var(--streamed-text-loader-font);
}

.tl-visual {
  display: block;
  width: 100%;
  min-height: 1.4em;
}

.tl-copy {
  display: block;
  width: 100%;
  color: currentColor;
  font: inherit;
  line-height: inherit;
  letter-spacing: inherit;
  white-space: pre-wrap;
}

.tl-word { display:inline-block; white-space:nowrap; }
.tl-space { white-space:pre-wrap; }

.tl-char { display: inline-block; transform-origin: 50% 65%; }

.tl-decode {
  font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  text-transform: uppercase;
}
.tl-decode .tl-char { width: .62em; text-align: center; }
.tl-decode .tl-char[data-resolved="false"] { color: color-mix(in srgb, currentColor 60%, transparent); }
.tl-decode-char { display:inline-grid; width:.62em; text-align:center; }
.tl-decode-char > b,.tl-decode-char > i { grid-area:1/1; font:inherit; font-style:normal; font-weight:inherit; }
.tl-decode-char > i { color:color-mix(in srgb,currentColor 55%,transparent); }

.tl-typewriter { position: relative; }
.tl-cursor {
  display: inline-block;
  width: .08em;
  height: 1em;
  margin-inline-start: .08em;
  border-radius: 1px;
  background: currentColor;
  vertical-align: -.12em;
}

.tl-skeleton-wrap { position: relative; min-height: 2.9em; }
.tl-skeleton { display: grid; gap: .46em; width: 100%; padding-top: .28em; }
.tl-skeleton i {
  position: relative;
  overflow: hidden;
  width: 78%;
  height: .42em;
  border-radius: .14em;
  background: color-mix(in srgb, currentColor 9%, transparent);
}
.tl-skeleton i:nth-child(2) { width: 56%; }
.tl-skeleton i::after {
  content: "";
  position: absolute;
  inset: 0;
  width: 42%;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, currentColor 16%, transparent), transparent);
  transform: translateX(-100%);
  animation: streamed-text-loader-shimmer 1.4s cubic-bezier(.4,0,.2,1) infinite;
}
.tl-skeleton-result { display: block; }
@keyframes streamed-text-loader-shimmer { from { transform: translateX(-140%); } to { transform: translateX(240%); } }

.tl-skeleton-stream { position:relative; }
.tl-skeleton-token { position:relative; display:inline; }

.tl-cascade span,.tl-focus span { display: inline-block; }

.tl-wipe { position: relative; }
.tl-wipe-ghost { color: color-mix(in srgb, currentColor 12%, transparent); }
.tl-wipe-fill { position: absolute; inset: 0; color: currentColor; }
.tl-wipe>i {
  position: absolute;
  top: -.1em;
  bottom: -.1em;
  width: 1px;
  background: currentColor;
  box-shadow: 0 0 8px color-mix(in srgb, currentColor 50%, transparent);
}
.tl-wipe-stream > span { display:inline; }

.tl-flip { perspective: 500px; }

.tl-redact-word { position: relative; display: inline-block; }
.tl-redact-word>i {
  position: absolute;
  inset: .12em -.03em .08em;
  border-radius: .08em;
  background: currentColor;
  transform-origin: right;
}

.tl-line { display: grid; gap: .14em; }
.tl-line>span { display: block; width: max-content; max-width: 100%; }
.tl-line-stream > span { display:inline; white-space:pre-wrap; }

.tl-terminal {
  min-height: 1.45em;
  font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
}
.tl-terminal>b { margin-inline-end: .45em; font-weight: 500; }
.tl-terminal>span { white-space: pre-wrap; }
.tl-terminal-cursor {
  display: inline-block;
  width: .58em;
  height: .9em;
  margin-inline-start: .12em;
  background: currentColor;
  vertical-align: -.08em;
}

.tl-wave .tl-char { min-width: .16em; }

.tl-dissolve-char {
  position: relative;
  display: inline-grid;
  min-width: .16em;
}
.tl-dissolve-char > b {
  grid-area: 1 / 1;
  display: inline-block;
  font: inherit;
  font-weight: inherit;
}
.tl-dissolve-char > i {
  position: absolute;
  z-index: 1;
  left: 58%;
  top: 50%;
  width: .09em;
  height: .09em;
  border-radius: 50%;
  background: currentColor;
  box-shadow: .18em -.08em 0 -.02em currentColor, .3em .09em 0 -.035em currentColor;
  filter: blur(.2px);
  pointer-events: none;
}
.tl-dissolve-char > i:nth-of-type(2n) { width:.06em; height:.06em; opacity:.7; }
.tl-dissolve-char > i:nth-of-type(3n) { width:.12em; height:.12em; }

.tl-slice-char,
.tl-fragment-char {
  display: inline-grid;
  min-width: .14em;
}
.tl-slice-char > i,
.tl-fragment-char > i {
  grid-area: 1 / 1;
  font: inherit;
  font-style: normal;
}
.tl-slice-part-1 { clip-path: inset(0 0 66% 0); }
.tl-slice-part-2 { clip-path: inset(33% 0 33% 0); }
.tl-slice-part-3 { clip-path: inset(66% 0 0 0); }

.tl-tracking .tl-char { min-width: .14em; transform-origin: left center; }

.tl-coalesce-char {
  position: relative;
  display: inline-block;
  min-width: .14em;
}
.tl-coalesce-char > b { display: inline-block; font: inherit; font-weight: inherit; }
.tl-coalesce-char > i {
  position: absolute;
  left: 50%;
  top: 52%;
  width: .13em;
  height: .13em;
  border-radius: 50%;
  background: currentColor;
  pointer-events: none;
}

.tl-fragment-1 { clip-path: polygon(0 0, 58% 0, 42% 52%, 0 66%); }
.tl-fragment-2 { clip-path: polygon(58% 0, 100% 0, 100% 58%, 42% 52%); }
.tl-fragment-3 { clip-path: polygon(0 66%, 42% 52%, 58% 100%, 0 100%); }
.tl-fragment-4 { clip-path: polygon(42% 52%, 100% 58%, 100% 100%, 58% 100%); }

.tl-loader[data-paused="true"] *,
.tl-loader[data-paused="true"] *::before,
.tl-loader[data-paused="true"] *::after { animation-play-state: paused !important; }

/* Labs: right-to-left text reveals in its reading direction. */
.tl-skeleton i:dir(rtl)::after { scale: -1 1; }
.tl-redact-word:dir(rtl)>i { transform-origin: left; }

@media (prefers-reduced-motion: reduce) {
  .tl-loader *, .tl-loader *::before, .tl-loader *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
`;

// ---- upstream: packages/generative-loaders/src/components.tsx (the shared helpers and TextLoader) ----
const scrambleGlyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789()[]{}:;?/";
const particleOffsets = [[-16, -9], [13, -13], [-9, 12], [17, 7], [1, -18]];
const dissolveParticles = [[30, -11], [21, -6], [36, -1], [16, 4], [28, 9], [12, 13]];
const fragmentOffsets = [[-8, -6], [8, -5], [-7, 7], [7, 6]];
// Keep the beginning of a reveal calm. A very steep ease-out makes the first
// frame of each received word feel like a pop, even when the total duration is
// fairly long.
const cushion = [0.22, 0.65, 0.3, 1] as const;

function classes(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

function safeRate(speed: number) {
  return Number.isFinite(speed) && speed > 0 ? speed : 1;
}

function duration(seconds: number, speed: number) {
  return seconds / speed;
}

function charNodes(text: string, render: (char: string, index: number) => ReactNode) {
  let offset = 0;
  return text.split(/(\s+)/).filter(Boolean).map((token) => {
    const start = offset;
    offset += Array.from(token).length;
    if (/^\s+$/.test(token)) return <span className="tl-space" key={`space-${start}`}>{token.split("\n").map((part, index, parts) => <span key={index}>{part}{index < parts.length - 1 && <br />}</span>)}</span>;
    return <span className="tl-word" key={`word-${start}`}>
      {Array.from(token).map((char, index) => render(char, start + index))}
    </span>;
  });
}

function stagger(index: number, start: number, speed: number, amount = .005) {
  return duration(Math.min(.035, Math.max(0, index - start) * amount), speed);
}

function splitAt(text: string, index: number) {
  const characters = Array.from(text);
  return [characters.slice(0, index).join(""), characters.slice(index).join("")] as const;
}

function useIncomingRange(text: string) {
  const [stream, setStream] = useState({ value: text, start: 0, revision: 0 });
  if (stream.value !== text) {
    const next = {
      value: text,
      start: text.startsWith(stream.value) ? Array.from(stream.value).length : 0,
      revision: stream.revision + 1,
    };
    setStream(next);
    return next;
  }
  return stream;
}

interface VisualProps {
  text: string;
  start: number;
  revision: number;
  active: boolean;
  speed: number;
  /** Labs: the resolved direction, so wipes reveal in reading order. */
  rtl?: boolean;
}

function DecodeText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-decode">{charNodes(text, (char, index) => {
    const fresh = active && index >= start && char !== " ";
    const glyph = char === " " ? "\u00a0" : char;
    return <span className="tl-decode-char" key={index}>
      <motion.b initial={fresh ? { opacity: .22 } : false} animate={{ opacity: 1 }} transition={{ duration: duration(.26, speed), delay: stagger(index, start, speed), ease: cushion }}>{glyph}</motion.b>
      {fresh && <motion.i initial={{ opacity: .42 }} animate={{ opacity: 0 }} transition={{ duration: duration(.16, speed), delay: stagger(index, start, speed) }}>{scrambleGlyphs[index % scrambleGlyphs.length]}</motion.i>}
    </span>;
  })}</span>;
}

function TypewriterText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-typewriter">{charNodes(text, (char, index) => <motion.span
    className="tl-char"
    key={index}
    initial={active && index >= start ? { opacity: 0 } : false}
    animate={{ opacity: 1 }}
    transition={{ duration: duration(.2, speed), delay: stagger(index, start, speed), ease: cushion }}
  >{char === " " ? "\u00a0" : char}</motion.span>)}<motion.i className="tl-cursor" animate={{ opacity: active ? [0, 1, 1, 0] : 1 }} transition={{ repeat: Infinity, duration: duration(.85, speed), times: [0, .1, .58, 1] }} /></span>;
}

function SkeletonText({ text, start, revision, active, speed }: VisualProps) {
  if (!text) return <span className="tl-copy tl-skeleton-wrap"><span className="tl-skeleton"><i /><i /></span></span>;

  const [stable, incoming] = splitAt(text, start);
  return <span className="tl-copy tl-skeleton-stream"><span>{stable}</span>{incoming && <motion.span
    className="tl-skeleton-token"
    key={revision}
    initial={active ? { opacity: 0, y: 2, filter: "blur(2px)" } : false}
    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
    transition={{ duration: duration(.36, speed), ease: cushion }}
  >{incoming}</motion.span>}</span>;
}

function CascadeText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-cascade">{charNodes(text, (char, index) => <motion.span
    className="tl-char"
    key={index}
    initial={active && index >= start ? { opacity: 0, y: 4 } : false}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: duration(.28, speed), delay: stagger(index, start, speed), ease: cushion }}
  >{char === " " ? "\u00a0" : char}</motion.span>)}</span>;
}

function FocusText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-focus">{charNodes(text, (char, index) => <motion.span
    className="tl-char"
    key={index}
    initial={active && index >= start ? { opacity: .18, filter: "blur(2px)" } : false}
    animate={{ opacity: 1, filter: "blur(0px)" }}
    transition={{ duration: duration(.28, speed), delay: stagger(index, start, speed), ease: cushion }}
  >{char === " " ? "\u00a0" : char}</motion.span>)}</span>;
}

function WipeText({ text, start, revision, active, speed, rtl }: VisualProps) {
  const [stable, incoming] = splitAt(text, start);
  return <span className="tl-copy tl-wipe-stream"><span>{stable}</span><motion.span
    key={revision}
    initial={active ? { clipPath: rtl ? "inset(0 0% 0 100%)" : "inset(0 100% 0 0)" } : false}
    animate={{ clipPath: rtl ? "inset(0 0% 0 0%)" : "inset(0 0% 0 0)" }}
    transition={{ duration: duration(.28, speed), ease: cushion }}
  >{incoming}</motion.span></span>;
}

function FlipText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-flip">{charNodes(text, (char, index) => <motion.span
    className="tl-char"
    key={index}
    initial={active && index >= start ? { opacity: 0, rotateX: -42, y: 1 } : false}
    animate={{ opacity: 1, rotateX: 0, y: 0 }}
    transition={{ duration: duration(.28, speed), delay: stagger(index, start, speed), ease: cushion }}
  >{char === " " ? "\u00a0" : char}</motion.span>)}</span>;
}

function RedactText({ text, start, revision, active, speed }: VisualProps) {
  const [stable, incoming] = splitAt(text, start);
  return <span className="tl-copy tl-redact"><span>{stable}</span>{incoming && <span className="tl-redact-word" key={revision}><motion.span
    initial={active ? { opacity: .28, filter: "blur(.035em)" } : false}
    animate={{ opacity: 1, filter: "blur(0em)" }}
    transition={{ delay: duration(.08, speed), duration: duration(.42, speed), ease: cushion }}
  >{incoming}</motion.span><motion.i
    initial={active ? { scaleX: 1, opacity: .2 } : false}
    animate={{ scaleX: [1, 1, .18, 0], opacity: [.2, .2, .14, 0] }}
    transition={{ duration: duration(.48, speed), times: [0, .16, .78, 1], ease: cushion }}
  /></span>}</span>;
}

function LineText({ text, start, revision, active, speed, rtl }: VisualProps) {
  const [stable, incoming] = splitAt(text, start);
  return <span className="tl-copy tl-line-stream"><span>{stable}</span><motion.span
    key={revision}
    initial={active ? { opacity: 0, x: rtl ? 3 : -3, clipPath: rtl ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)" } : false}
    animate={{ opacity: 1, x: 0, clipPath: "inset(0 0 0 0)" }}
    transition={{ duration: duration(.3, speed), ease: cushion }}
  >{incoming}</motion.span></span>;
}

function TerminalText({ text, start, revision, active, speed }: VisualProps) {
  const [stable, incoming] = splitAt(text, start);
  return <span className="tl-copy tl-terminal"><b aria-hidden="true">›</b><span>{stable}<motion.span key={revision} initial={active ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: duration(.18, speed), ease: cushion }}>{incoming}</motion.span></span><motion.i className="tl-terminal-cursor" animate={{ opacity: active ? [1, 1, 0, 0] : 1 }} transition={{ repeat: Infinity, duration: duration(.8, speed) }} /></span>;
}

function WaveText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-wave">{charNodes(text, (char, index) => <motion.span
    className="tl-char"
    key={index}
    initial={active && index >= start ? { opacity: 0, y: 4, scale: .94 } : false}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: duration(.28, speed), delay: stagger(index, start, speed), ease: cushion }}
  >{char === " " ? "\u00a0" : char}</motion.span>)}</span>;
}

function DissolveText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-dissolve">{charNodes(text, (char, index) => {
    const fresh = active && index >= start && char !== " ";
    const delay = duration(Math.min(.2, Math.max(0, index - start) * .018), speed);
    return <span className="tl-dissolve-char" key={index}>
      <motion.b
        initial={fresh ? { opacity: .05, filter: "blur(3px)", clipPath: "inset(0 100% 0 0)" } : false}
        animate={{ opacity: 1, filter: "blur(0px)", clipPath: "inset(0 0% 0 0)" }}
        transition={{ duration: duration(.46, speed), delay, ease: cushion }}
      >{char === " " ? "\u00a0" : char}</motion.b>
      {fresh && dissolveParticles.map(([x, y], particle) => <motion.i
        aria-hidden="true"
        key={particle}
        initial={{ opacity: 0, x, y, scale: .35 }}
        animate={{ opacity: [0, .72, 0], x: [x, x * .28, 0], y: [y, y * .3, 0], scale: [.35, 1, .12] }}
        transition={{ duration: duration(.44, speed), delay: delay + duration(particle * .012, speed), ease: cushion, times: [0, .42, 1] }}
      />)}
    </span>;
  })}</span>;
}

function SliceText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-slice">{charNodes(text, (char, index) => {
    const fresh = active && index >= start;
    const glyph = char === " " ? "\u00a0" : char;
    return <span className="tl-slice-char" key={index}>{[0, 1, 2].map((part) => <motion.i
      key={part}
      className={`tl-slice-part tl-slice-part-${part + 1}`}
      initial={fresh ? { opacity: 0, x: part === 1 ? 3 : part === 0 ? -3 : 2 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: duration(.28, speed), ease: cushion, delay: stagger(index, start, speed) + duration(part * .01, speed) }}
    >{glyph}</motion.i>)}</span>;
  })}</span>;
}

function TrackingText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-tracking">{charNodes(text, (char, index) => <motion.span
    className="tl-char"
    key={index}
    initial={active && index >= start ? { opacity: 0, x: 4, scaleX: 1.06 } : false}
    animate={{ opacity: 1, x: 0, scaleX: 1 }}
    transition={{ duration: duration(.28, speed), delay: stagger(index, start, speed), ease: cushion }}
  >{char === " " ? "\u00a0" : char}</motion.span>)}</span>;
}

function CoalesceText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-coalesce">{charNodes(text, (char, index) => {
    const fresh = active && index >= start && char !== " ";
    return <span className="tl-coalesce-char" key={index}>
      <motion.b initial={fresh ? { opacity: 0, filter: "blur(2px)", scale: .9 } : false} animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }} transition={{ duration: duration(.28, speed), delay: stagger(index, start, speed), ease: cushion }}>{char === " " ? "\u00a0" : char}</motion.b>
      {fresh && particleOffsets.slice(0, 3).map(([x, y], particle) => <motion.i key={particle} initial={{ opacity: .45, x: x * .55, y: y * .55, scale: .5 }} animate={{ opacity: 0, x: 0, y: 0, scale: 0 }} transition={{ duration: duration(.24, speed), delay: stagger(index, start, speed) + duration(particle * .012, speed), ease: cushion }} />)}
    </span>;
  })}</span>;
}

function FragmentsText({ text, start, active, speed }: VisualProps) {
  return <span className="tl-copy tl-fragments">{charNodes(text, (char, index) => {
    const fresh = active && index >= start;
    const glyph = char === " " ? "\u00a0" : char;
    return <span className="tl-fragment-char" key={index}>{fragmentOffsets.map(([x, y], fragment) => <motion.i
      key={fragment}
      className={`tl-fragment tl-fragment-${fragment + 1}`}
      initial={fresh ? { opacity: 0, x, y } : false}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: duration(.28, speed), delay: stagger(index, start, speed) + duration(fragment * .01, speed), ease: cushion }}
    >{glyph}</motion.i>)}</span>;
  })}</span>;
}

const visuals: Record<StreamedTextLoaderVariant, (props: VisualProps) => ReactNode> = {
  decode: DecodeText,
  typewriter: TypewriterText,
  skeleton: SkeletonText,
  cascade: CascadeText,
  focus: FocusText,
  wipe: WipeText,
  flip: FlipText,
  redact: RedactText,
  line: LineText,
  terminal: TerminalText,
  wave: WaveText,
  dissolve: DissolveText,
  slice: SliceText,
  tracking: TrackingText,
  coalesce: CoalesceText,
  fragments: FragmentsText,
};

export function StreamedTextLoader({
  text,
  variant,
  speed = 1,
  color = "#111111",
  paused = false,
  className,
  "aria-label": ariaLabel,
  dir = "auto",
}: StreamedTextLoaderProps) {
  const reduceMotion = Boolean(useReducedMotion());
  // Labs: the resolved direction, so wipes reveal in reading order. With
  // dir="auto" it follows the text's first letter (as the browser does); with
  // no letter yet (the skeleton) it follows the page, read before paint.
  const root = useRef<HTMLSpanElement>(null);
  const [pageRtl, setPageRtl] = useState(false);
  useLayoutEffect(() => {
    const parent = root.current?.parentElement;
    if (!parent) return;
    let next: boolean;
    try {
      next = parent.matches(":dir(rtl)");
    } catch {
      next = getComputedStyle(parent).direction === "rtl";
    }
    setPageRtl(next);
  }, [text, dir]);
  const firstLetter = text.match(/\p{L}/u)?.[0];
  const rtl = dir === "rtl" || (dir === "auto" && (firstLetter ? RTL_LETTER.test(firstLetter) : pageRtl));
  const stream = useIncomingRange(text);
  const safeSpeed = safeRate(speed);
  const Visual = useMemo(() => visuals[variant], [variant]);
  const active = !paused && !reduceMotion;

  return <span
    ref={root}
    // Labs: "auto" with no letter yet (the skeleton) follows the page instead,
    // since the browser resolves auto to left to right when there is nothing to read.
    dir={dir === "auto" && !firstLetter ? undefined : dir}
    className={classes("tl-loader", className)}
    data-variant={variant}
    data-speed={safeSpeed}
    data-paused={!active ? "true" : "false"}
    data-received-length={Array.from(text).length}
    role="status"
    aria-live="polite"
    aria-label={ariaLabel ?? text.replace(/\s+/g, " ").trim()}
    style={{ "--streamed-text-loader-color": color } as CSSProperties}
  >
    <style href="designfrom-streamed-text-loader" precedence="default">{css}</style>
    <span className="tl-visual" aria-hidden="true">{Visual({ text, start: stream.start, revision: stream.revision, active, speed: safeSpeed, rtl })}</span>
    {/* Labs: the received text as live-region content (the visual layer is aria-hidden). */}
    <span style={visuallyHidden}>{text}</span>
  </span>;
}

// ---- Labs ----
/** Letters of the right-to-left scripts (Hebrew, Arabic, Syriac, Thaana, NKo, and their presentation forms). */
const RTL_LETTER = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

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
