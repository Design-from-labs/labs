import { cancelFrame, cubicBezier, frame } from "motion";

/*
 * The timeline engine behind the liquid surfaces (Anchored Dropdown,
 * Morphing Dropdown, Speed Dial). Upstream choreographs them with a
 * proprietary tween library; this file replaces it with Motion's frame loop
 * (`frame.update`, `cancelFrame`) and plain style and attribute writes, and
 * keeps the semantics the choreography depends on, so the timing matches:
 *
 * - a timeline places tweens, sets and calls at positions in seconds; a
 *   tween reads its start values the first time its start is reached, so
 *   back-to-back tweens hand over without a jump;
 * - `overwrite: "auto"` takes the overlapping properties away from tweens
 *   that are running on the same elements;
 * - transforms compose as translate, rotate, scale around a transform origin:
 *   an inline `transform` on HTML elements, a `transform` matrix attribute on
 *   SVG elements (the origin baked in, so `getCTM()` reads the real place);
 * - `autoAlpha` drives opacity and visibility together;
 * - eases: the named power, back and linear curves, cubic beziers (Motion's
 *   `cubicBezier`) and sampled polylines (the spring curves).
 *
 * Time is `performance.now()` in seconds, read at Motion's frame; a timeline
 * starts at the moment it is created and first renders on the next frame.
 */

export type TaffyEase = (progress: number) => number;
export type TaffyEaseInput = TaffyEase | string;
export type TaffyTarget = Element | null | undefined;
export type TaffyTargets = TaffyTarget | readonly TaffyTarget[];

type Num = number | string;

export interface TaffyVars {
  x?: Num;
  y?: Num;
  scale?: Num;
  scaleX?: Num;
  scaleY?: Num;
  rotation?: Num;
  transformOrigin?: string;
  autoAlpha?: Num;
  opacity?: Num;
  filter?: string;
  attr?: Record<string, string | number>;
  duration?: number;
  ease?: TaffyEaseInput;
  delay?: number;
  stagger?: number | { each: number; from?: "start" | "end" };
  keyframes?: readonly TaffyVars[];
  overwrite?: "auto" | boolean;
  [cssVariable: `--${string}`]: Num | undefined;
}

/* ---------------------------------------------------------------- eases */

const powerIn = (exponent: number) => (p: number) => p ** exponent;
const powerOut = (exponent: number) => (p: number) => 1 - (1 - p) ** exponent;
const powerInOut = (exponent: number) => (p: number) =>
  p < 0.5 ? (2 * p) ** exponent / 2 : 1 - (2 * (1 - p)) ** exponent / 2;

function backOut(overshoot: number): TaffyEase {
  return (p) => {
    const q = 1 - p;
    return 1 - (q ? q * q * ((overshoot + 1) * q - overshoot) : 0);
  };
}

const NAMED: Record<string, TaffyEase> = {
  none: (p) => p,
  linear: (p) => p,
  "power1.in": powerIn(2),
  "power1.out": powerOut(2),
  "power1.inOut": powerInOut(2),
  "power2.in": powerIn(3),
  "power2.out": powerOut(3),
  "power2.inOut": powerInOut(3),
  "power3.in": powerIn(4),
  "power3.out": powerOut(4),
  "power3.inOut": powerInOut(4),
};

const DEFAULT_EASE = NAMED["power1.out"];

export function taffyEase(input: TaffyEaseInput | undefined): TaffyEase {
  if (typeof input === "function") {
    return input;
  }
  if (!input) {
    return DEFAULT_EASE;
  }
  const back = /^back\.out(?:\(([\d.]+)\))?$/.exec(input);
  if (back) {
    return backOut(back[1] ? Number(back[1]) : 1.70158);
  }
  return NAMED[input] ?? DEFAULT_EASE;
}

/** A cubic-bezier ease (Motion's solver), for `x1,y1,x2,y2` curves. */
export function taffyBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): TaffyEase {
  return cubicBezier(x1, y1, x2, y2);
}

/**
 * A sampled curve: straight segments from (0, 0) through `points`, ending at
 * (1, 1). The spring curves are tables of this kind.
 */
export function taffyPolyline(
  points: readonly (readonly [number, number])[],
): TaffyEase {
  const xs = [0, ...points.map(([x]) => x)];
  const ys = [0, ...points.map(([, y]) => y)];
  const last = xs.length - 1;
  return (p) => {
    if (p <= 0) {
      return 0;
    }
    if (p >= xs[last]) {
      return ys[last];
    }
    let low = 0;
    let high = last;
    while (high - low > 1) {
      const mid = (low + high) >> 1;
      if (xs[mid] <= p) {
        low = mid;
      } else {
        high = mid;
      }
    }
    const span = xs[high] - xs[low];
    return ys[low] + ((ys[high] - ys[low]) * (p - xs[low])) / (span || 1);
  };
}

/* ------------------------------------------------------- element state */

interface ElementState {
  svg: boolean;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  xOrigin: number;
  yOrigin: number;
  xOffset: number;
  yOffset: number;
  opacity?: number;
}

const states = new WeakMap<Element, ElementState>();

const round4 = (value: number) => Math.round(value * 10000) / 10000;
const round5 = (value: number) => Math.round(value * 100000) / 100000 || 0;

function isSvgChild(element: Element) {
  return (
    "getCTM" in element && (element as unknown as SVGElement).ownerSVGElement != null
  );
}

function stateOf(element: Element): ElementState {
  let state = states.get(element);
  if (!state) {
    state = {
      svg: isSvgChild(element),
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      xOrigin: 0,
      yOrigin: 0,
      xOffset: 0,
      yOffset: 0,
    };
    states.set(element, state);
  }
  return state;
}

function styleOf(element: Element) {
  return (element as HTMLElement | SVGElement).style;
}

function renderTransform(element: Element, state: ElementState, ratio: number) {
  if (state.svg) {
    const rad = (state.rotation * Math.PI) / 180;
    let a = state.scaleX;
    let b = 0;
    let c = 0;
    let d = state.scaleY;
    if (state.rotation) {
      a = round5(Math.cos(rad) * state.scaleX);
      b = round5(Math.sin(rad) * state.scaleX);
      c = round5(Math.sin(rad) * -state.scaleY);
      d = round5(Math.cos(rad) * state.scaleY);
    }
    let tx = state.x;
    let ty = state.y;
    if (state.xOrigin || state.yOrigin || state.xOffset || state.yOffset) {
      tx = round5(
        tx + state.xOrigin - (state.xOrigin * a + state.yOrigin * c) + state.xOffset,
      );
      ty = round5(
        ty + state.yOrigin - (state.xOrigin * b + state.yOrigin * d) + state.yOffset,
      );
    }
    element.setAttribute(
      "transform",
      `matrix(${a},${b},${c},${d},${tx},${ty})`,
    );
    return;
  }
  const use3D = ratio > 0 && ratio < 1;
  const x = `${state.x}px`;
  const y = `${state.y}px`;
  let value = "";
  if (use3D || state.x !== 0 || state.y !== 0) {
    value += use3D ? `translate3d(${x}, ${y}, 0px) ` : `translate(${x}, ${y}) `;
  }
  if (state.rotation !== 0) {
    value += `rotate(${state.rotation}deg) `;
  }
  if (state.scaleX !== 1 || state.scaleY !== 1) {
    value += `scale(${state.scaleX}, ${state.scaleY}) `;
  }
  const style = styleOf(element);
  /* The individual transform properties are explicitly off, so no author
     rule of theirs can stack on the composed transform. */
  style.translate = "none";
  style.rotate = "none";
  style.scale = "none";
  style.transform = value || "translate(0, 0)";
}

function applyOrigin(element: Element, state: ElementState, origin: string) {
  if (!state.svg) {
    const [ox = "50%", oy = ox] = origin.split(" ");
    styleOf(element).transformOrigin = `${ox} ${oy}`;
    return;
  }
  const [ox = "50%", oy = ox] = origin.split(" ");
  const box = (element as SVGGraphicsElement).getBBox();
  const xOrigin =
    box.x +
    (ox.includes("%") ? (parseFloat(ox) / 100) * box.width : parseFloat(ox));
  const yOrigin =
    box.y +
    (oy.includes("%") ? (parseFloat(oy) / 100) * box.height : parseFloat(oy));
  /* Keep a transformed element where it is when its origin moves. */
  const rad = (state.rotation * Math.PI) / 180;
  const a = Math.cos(rad) * state.scaleX;
  const b = Math.sin(rad) * state.scaleX;
  const c = Math.sin(rad) * -state.scaleY;
  const d = Math.cos(rad) * state.scaleY;
  const dx = xOrigin - state.xOrigin;
  const dy = yOrigin - state.yOrigin;
  state.xOffset += dx * a + dy * c - dx;
  state.yOffset += dx * b + dy * d - dy;
  state.xOrigin = xOrigin;
  state.yOrigin = yOrigin;
  styleOf(element).transformOrigin = "0px 0px";
}

function readOpacity(element: Element, state: ElementState) {
  if (state.opacity !== undefined) {
    return state.opacity;
  }
  const inline = styleOf(element).opacity;
  const value = inline
    ? Number(inline)
    : Number(getComputedStyle(element).opacity || 1);
  return Number.isNaN(value) ? 1 : value;
}

/** The current value of one animatable property. */
export function taffyGetProperty(element: Element | null, property: string) {
  if (!element) {
    return 0;
  }
  const state = stateOf(element);
  switch (property) {
    case "x":
    case "y":
    case "rotation":
    case "scaleX":
    case "scaleY":
      return state[property];
    case "scale":
      return state.scaleX;
    case "opacity":
    case "autoAlpha":
      return readOpacity(element, state);
    default:
      return parseFloat(getComputedStyle(element).getPropertyValue(property)) || 0;
  }
}

/* --------------------------------------------------------- property plans */

const TRANSFORM_KEYS = new Set(["x", "y", "rotation", "scaleX", "scaleY"]);
const CONTROL_KEYS = new Set([
  "duration",
  "ease",
  "delay",
  "stagger",
  "keyframes",
  "overwrite",
]);

interface NumberTrack {
  kind: "transform" | "opacity" | "variable";
  key: string;
  from: number;
  to: number;
  visibility?: boolean;
}

interface StringTrack {
  kind: "filter";
  key: string;
  from: string;
  to: string;
  parts: { from: number; to: number }[];
  template: string[];
}

interface SetTrack {
  kind: "attr";
  key: string;
  to: string;
  from: string | null;
}

type Track = NumberTrack | StringTrack | SetTrack;

const NUMBER_RE = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;

function parseEnd(value: Num, from: number) {
  if (typeof value === "number") {
    return value;
  }
  const relative = /^([+-])=\s*(-?[\d.]+)/.exec(value);
  if (relative) {
    const amount = Number(relative[2]);
    return relative[1] === "+" ? from + amount : from - amount;
  }
  return parseFloat(value) || 0;
}

function planTracks(element: Element, vars: TaffyVars): Track[] {
  const state = stateOf(element);
  const tracks: Track[] = [];
  for (const [rawKey, value] of Object.entries(vars)) {
    if (value === undefined || CONTROL_KEYS.has(rawKey)) {
      continue;
    }
    if (rawKey === "attr") {
      for (const [name, attrValue] of Object.entries(
        value as Record<string, string | number>,
      )) {
        tracks.push({
          kind: "attr",
          key: name,
          to: String(attrValue),
          from: element.getAttribute(name),
        });
      }
      continue;
    }
    if (rawKey === "transformOrigin") {
      /* Applied when the tween starts, against the transform as it is now,
         so a moved origin never shifts what is already on screen. */
      applyOrigin(element, state, String(value));
      continue;
    }
    if (rawKey === "scale") {
      for (const key of ["scaleX", "scaleY"] as const) {
        tracks.push({
          kind: "transform",
          key,
          from: state[key],
          to: parseEnd(value as Num, state[key]),
        });
      }
      continue;
    }
    if (TRANSFORM_KEYS.has(rawKey)) {
      const key = rawKey as "x" | "y" | "rotation" | "scaleX" | "scaleY";
      tracks.push({
        kind: "transform",
        key,
        from: state[key],
        to: parseEnd(value as Num, state[key]),
      });
      continue;
    }
    if (rawKey === "autoAlpha" || rawKey === "opacity") {
      let from = readOpacity(element, state);
      const to = parseEnd(value as Num, from);
      if (
        rawKey === "autoAlpha" &&
        from === 1 &&
        to !== 0 &&
        getComputedStyle(element).visibility === "hidden"
      ) {
        from = 0;
      }
      tracks.push({
        kind: "opacity",
        key: "opacity",
        from,
        to,
        visibility: rawKey === "autoAlpha",
      });
      continue;
    }
    if (rawKey === "filter") {
      const style = styleOf(element);
      const start = style.filter || getComputedStyle(element).filter || "none";
      const end = String(value);
      const endNumbers = end.match(NUMBER_RE) ?? [];
      const startNumbers = start === "none" ? [] : (start.match(NUMBER_RE) ?? []);
      tracks.push({
        kind: "filter",
        key: "filter",
        from: start,
        to: end,
        parts: endNumbers.map((n, index) => ({
          from: Number(startNumbers[index] ?? 0),
          to: Number(n),
        })),
        template: end.split(NUMBER_RE),
      });
      continue;
    }
    if (rawKey.startsWith("--")) {
      const style = styleOf(element);
      const current =
        style.getPropertyValue(rawKey) ||
        getComputedStyle(element).getPropertyValue(rawKey);
      const from = parseFloat(current) || 0;
      tracks.push({
        kind: "variable",
        key: rawKey,
        from,
        to: parseEnd(value as Num, from),
      });
    }
  }
  return tracks;
}

function renderTracks(element: Element, tracks: Track[], ratio: number) {
  const state = stateOf(element);
  const style = styleOf(element);
  let transform = false;
  for (const track of tracks) {
    switch (track.kind) {
      case "transform": {
        const key = track.key as "x" | "y" | "rotation" | "scaleX" | "scaleY";
        state[key] = round4(track.from + (track.to - track.from) * ratio);
        transform = true;
        break;
      }
      case "opacity": {
        const value = round4(track.from + (track.to - track.from) * ratio);
        state.opacity = value;
        style.opacity = String(value);
        if (track.visibility) {
          /* Shown as soon as a fade towards a value starts; hidden only once
             a fade to zero has landed. */
          const start = track.from ? "inherit" : "hidden";
          style.visibility =
            track.to !== 0
              ? ratio
                ? "inherit"
                : start
              : ratio !== 1
                ? start
                : "hidden";
        }
        break;
      }
      case "variable":
        style.setProperty(
          track.key,
          String(round4(track.from + (track.to - track.from) * ratio)),
        );
        break;
      case "filter": {
        if (ratio === 0) {
          style.filter = track.from;
          break;
        }
        if (ratio === 1) {
          style.filter = track.to;
          break;
        }
        let out = track.template[0];
        track.parts.forEach((part, index) => {
          out +=
            String(round4(part.from + (part.to - part.from) * ratio)) +
            track.template[index + 1];
        });
        style.filter = out;
        break;
      }
      case "attr":
        if (ratio > 0) {
          element.setAttribute(track.key, track.to);
        } else if (track.from === null) {
          element.removeAttribute(track.key);
        } else {
          element.setAttribute(track.key, track.from);
        }
        break;
    }
  }
  if (transform) {
    renderTransform(element, state, ratio);
  }
}

/* ------------------------------------------------------------- animations */

function toList(targets: TaffyTargets): Element[] {
  if (!targets) {
    return [];
  }
  const list = Array.isArray(targets) ? targets : [targets];
  return list.filter((target): target is Element => target instanceof Element);
}

abstract class TaffyAnimation {
  /** Start, in the parent's time (seconds). */
  start = 0;
  /** Insertion order, for ties. */
  order = 0;
  parent: TaffyTimeline | null = null;
  killed = false;
  /** Local time last rendered, or null before the first render. */
  rendered: number | null = null;
  abstract duration(): number;
  abstract renderAt(time: number, backwards: boolean): void;
  kill() {
    this.killed = true;
    this.parent?.remove(this);
  }
}

const running = new Set<TaffyTween>();

class TaffyTween extends TaffyAnimation {
  readonly targets: Element[];
  readonly vars: TaffyVars;
  readonly length: number;
  readonly ease: TaffyEase;
  readonly overwrite: boolean;
  readonly fromVars: TaffyVars | null;
  tracks: Map<Element, Track[]> | null = null;

  constructor(
    targets: Element[],
    vars: TaffyVars,
    fromVars: TaffyVars | null = null,
  ) {
    super();
    this.targets = targets;
    this.vars = vars;
    this.length = vars.duration ?? 0.5;
    this.ease = taffyEase(vars.ease);
    this.overwrite = vars.overwrite === "auto";
    this.fromVars = fromVars;
    if (fromVars) {
      /* A fromTo shows its start values at once. */
      for (const target of targets) {
        renderTracks(target, planTracks(target, fromVars), 1);
      }
    }
  }

  duration() {
    return this.length;
  }

  private init() {
    this.tracks = new Map();
    for (const target of this.targets) {
      this.tracks.set(target, planTracks(target, this.vars));
    }
    if (this.overwrite) {
      for (const other of running) {
        if (other !== this) {
          other.release(this);
        }
      }
    }
    running.add(this);
  }

  /** Overwrite: drop the properties `owner` now animates on shared targets. */
  release(owner: TaffyTween) {
    if (!this.tracks || !owner.tracks) {
      return;
    }
    for (const [target, tracks] of this.tracks) {
      const theirs = owner.tracks.get(target);
      if (!theirs) {
        continue;
      }
      const taken = new Set(theirs.map((track) => track.key));
      this.tracks.set(
        target,
        tracks.filter((track) => !taken.has(track.key)),
      );
    }
  }

  renderAt(time: number, backwards: boolean) {
    if (this.killed) {
      return;
    }
    if (time < 0 && !backwards) {
      return;
    }
    /* A set has no length: it is either before its moment or after it. */
    const clamped =
      this.length === 0
        ? time >= 0
          ? 0
          : -1
        : Math.min(Math.max(time, 0), this.length);
    if (this.rendered === clamped && this.tracks) {
      return;
    }
    if (!this.tracks) {
      if (time < 0) {
        return;
      }
      this.init();
    }
    this.rendered = clamped;
    let ratio: number;
    if (this.length === 0) {
      ratio = clamped === 0 ? 1 : 0;
    } else {
      ratio = clamped >= this.length ? 1 : this.ease(clamped / this.length);
    }
    for (const [target, tracks] of this.tracks ?? []) {
      renderTracks(target, tracks, ratio);
    }
    if (clamped >= this.length && !backwards) {
      running.delete(this);
    } else {
      running.add(this);
    }
  }

  kill() {
    super.kill();
    running.delete(this);
  }

  hasTarget(element: Element) {
    return this.targets.includes(element);
  }
}

class TaffyCall extends TaffyAnimation {
  readonly fn: () => void;
  constructor(fn: () => void) {
    super();
    this.fn = fn;
  }
  duration() {
    return 0;
  }
  renderAt(time: number, backwards: boolean) {
    if (this.killed || backwards) {
      if (backwards && time < 0) {
        this.rendered = null;
      }
      return;
    }
    if (time >= 0 && this.rendered === null) {
      this.rendered = 0;
      this.fn();
    }
  }
}

export interface TaffyTimelineOptions {
  paused?: boolean;
  delay?: number;
}

export class TaffyTimeline extends TaffyAnimation {
  private children: TaffyAnimation[] = [];
  private counter = 0;
  private time = 0;
  private speed = 1;
  private reversed = false;
  paused: boolean;
  readonly delay: number;
  /** Engine time of the last advance, for root timelines. */
  last = 0;

  constructor(options: TaffyTimelineOptions = {}) {
    super();
    this.paused = options.paused ?? false;
    this.delay = options.delay ?? 0;
  }

  duration() {
    let end = 0;
    for (const child of this.children) {
      end = Math.max(end, child.start + child.duration());
    }
    return end;
  }

  add(child: TaffyAnimation, position: number) {
    child.start = position;
    child.order = this.counter++;
    child.parent = this;
    this.children.push(child);
    this.children.sort((a, b) => a.start - b.start || a.order - b.order);
    return this;
  }

  remove(child: TaffyAnimation) {
    const index = this.children.indexOf(child);
    if (index >= 0) {
      this.children.splice(index, 1);
    }
  }

  to(targets: TaffyTargets, vars: TaffyVars, position = 0) {
    for (const tween of buildTweens(toList(targets), vars)) {
      this.add(tween.animation, position + tween.offset);
    }
    return this;
  }

  fromTo(
    targets: TaffyTargets,
    fromVars: TaffyVars,
    vars: TaffyVars,
    position = 0,
  ) {
    const list = toList(targets);
    if (list.length > 0) {
      this.add(new TaffyTween(list, vars, fromVars), position);
    }
    return this;
  }

  set(targets: TaffyTargets, vars: TaffyVars, position = 0) {
    const list = toList(targets);
    if (list.length > 0) {
      this.add(new TaffyTween(list, { ...vars, duration: 0 }), position);
    }
    return this;
  }

  call(fn: () => void, position = 0) {
    this.add(new TaffyCall(fn), position);
    return this;
  }

  renderAt(time: number, backwards: boolean) {
    if (this.killed) {
      return;
    }
    const local = time - this.delay;
    const children = backwards ? [...this.children].reverse() : this.children;
    for (const child of children) {
      if (child.killed) {
        continue;
      }
      if (!backwards && local < child.start) {
        continue;
      }
      child.renderAt(local - child.start, backwards);
    }
    this.rendered = local;
  }

  /** Advance a root timeline by `delta` seconds of engine time. */
  advance(delta: number) {
    if (this.paused || this.killed) {
      return;
    }
    const end = this.duration() + this.delay;
    const next = this.time + delta * this.speed * (this.reversed ? -1 : 1);
    this.time = Math.min(Math.max(next, 0), end);
    this.renderAt(this.time, this.reversed);
    if ((this.reversed && this.time <= 0) || (!this.reversed && this.time >= end)) {
      detach(this);
    }
  }

  isActive() {
    if (this.killed || this.paused || !roots.has(this)) {
      return false;
    }
    return this.time < this.duration() + this.delay;
  }

  /** Jump to a share of the run and render it at once. */
  progress(value: number) {
    const end = this.duration() + this.delay;
    const next = Math.min(Math.max(value, 0), 1) * end;
    const backwards = next < this.time;
    this.time = next;
    this.renderAt(next, backwards);
    return this;
  }

  pause() {
    this.paused = true;
    return this;
  }

  timeScale(value: number) {
    this.speed = value;
    return this;
  }

  play() {
    this.reversed = false;
    this.paused = false;
    attach(this);
    return this;
  }

  reverse() {
    this.reversed = true;
    this.paused = false;
    attach(this);
    return this;
  }

  kill() {
    this.killed = true;
    for (const child of this.children) {
      if (child instanceof TaffyTween) {
        running.delete(child);
      }
      child.killed = true;
    }
    detach(this);
  }

  /** Every tween inside, for killTweensOf. */
  tweens(): TaffyTween[] {
    return this.children.flatMap((child) =>
      child instanceof TaffyTween
        ? [child]
        : child instanceof TaffyTimeline
          ? child.tweens()
          : [],
    );
  }
}

function buildTweens(
  targets: Element[],
  vars: TaffyVars,
): { animation: TaffyAnimation; offset: number }[] {
  if (targets.length === 0) {
    return [];
  }
  if (vars.keyframes) {
    const sequence = new TaffyTimeline();
    let at = 0;
    for (const keyframe of vars.keyframes) {
      sequence.to(
        targets,
        { overwrite: vars.overwrite, ...keyframe },
        at,
      );
      at += keyframe.duration ?? 0.5;
    }
    return [{ animation: sequence, offset: vars.delay ?? 0 }];
  }
  const { stagger, delay = 0 } = vars;
  if (stagger !== undefined && targets.length > 1) {
    const each = typeof stagger === "number" ? stagger : stagger.each;
    const fromEnd = typeof stagger === "object" && stagger.from === "end";
    return targets.map((target, index) => ({
      animation: new TaffyTween([target], vars),
      offset: delay + each * (fromEnd ? targets.length - 1 - index : index),
    }));
  }
  return [{ animation: new TaffyTween(targets, vars), offset: delay }];
}

/* ----------------------------------------------------------------- root */

const roots = new Set<TaffyTimeline>();
type TickListener = (time: number, deltaMs: number) => void;
const listeners: TickListener[] = [];
const epoch = typeof performance !== "undefined" ? performance.now() : 0;
let lastDelta = 1000 / 60;
let tickTime = 0;
let awake = false;

const now = () => performance.now();

function process() {
  const stamp = now();
  for (const root of [...roots]) {
    const delta = (stamp - root.last) / 1000;
    root.last = stamp;
    root.advance(delta);
  }
  lastDelta = stamp - (tickTime * 1000 + epoch);
  tickTime = (stamp - epoch) / 1000;
  for (const listener of [...listeners]) {
    listener(tickTime, lastDelta);
  }
  if (roots.size === 0 && listeners.length === 0) {
    sleep();
  }
}

function wake() {
  if (!awake) {
    awake = true;
    tickTime = (now() - epoch) / 1000;
    frame.update(process, true);
  }
}

function sleep() {
  if (awake) {
    awake = false;
    cancelFrame(process);
  }
}

function attach(timeline: TaffyTimeline) {
  if (!roots.has(timeline)) {
    timeline.last = now();
    roots.add(timeline);
  }
  wake();
}

function detach(timeline: TaffyTimeline) {
  roots.delete(timeline);
}

/** A new timeline, playing from now unless `paused`. */
export function taffyTimeline(options: TaffyTimelineOptions = {}) {
  const timeline = new TaffyTimeline(options);
  if (!timeline.paused) {
    attach(timeline);
  }
  return timeline;
}

/** One tween (or a staggered set), playing from now. */
export function taffyTo(targets: TaffyTargets, vars: TaffyVars) {
  const timeline = taffyTimeline();
  timeline.to(targets, vars, 0);
  return timeline;
}

/** Writes values at once. */
export function taffySet(targets: TaffyTargets, vars: TaffyVars) {
  for (const target of toList(targets)) {
    renderTracks(target, planTracks(target, vars), 1);
  }
}

/** Stops every tween that animates any of `targets`. */
export function taffyKillTweensOf(targets: TaffyTargets) {
  const list = toList(targets);
  for (const root of roots) {
    for (const tween of root.tweens()) {
      if (list.some((target) => tween.hasTarget(target))) {
        tween.kill();
      }
    }
  }
}

/** The shared frame clock: listeners get (seconds, delta ms) every frame. */
export const taffyTicker = {
  add(listener: TickListener) {
    if (!listeners.includes(listener)) {
      listeners.push(listener);
    }
    wake();
  },
  remove(listener: TickListener) {
    const index = listeners.indexOf(listener);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  },
  /** Seconds since the engine loaded, as of the last frame. */
  get time() {
    return tickTime;
  },
  /** The last frame's length relative to one frame at `fps`. */
  deltaRatio(fps = 60) {
    return lastDelta / (1000 / fps);
  },
};

/** Forgets what the engine knows about `targets` and drops their transforms,
    so they can be placed again from scratch (a geometry change). */
export function taffyClear(targets: TaffyTargets) {
  taffyKillTweensOf(targets);
  for (const target of toList(targets)) {
    states.delete(target);
    if (isSvgChild(target)) {
      target.removeAttribute("transform");
    } else {
      styleOf(target).removeProperty("transform");
    }
    styleOf(target).removeProperty("transform-origin");
  }
}
