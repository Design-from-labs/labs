import { animateValue } from "motion";

/*
 * The tweens Viscose Carousel needs, on Motion. Upstream used GSAP (a tween
 * per value, a timeline with a pause, delayed calls and killTweensOf); here
 * every one of those is a Motion `animateValue` from 0 to 1 whose eased
 * progress is written onto its targets. Motion's driver is the carousel's own
 * frame clock, ticked once at the start of each drawn frame, so every tween
 * moves on the same frame, before the frame reads it, and stops with the
 * render loop off screen.
 *
 * The easing curves reproduce the named eases upstream's parameters use
 * ("power2.out", "circ.out", "back.out(1.7)"...) exactly, as plain functions.
 */

export type Ease = (progress: number) => number;

interface EaseSet {
  in: Ease;
  out: Ease;
  inOut: Ease;
}

/** An ease, its mirror and its in-out, from the in-curve. */
function fromIn(easeIn: Ease): EaseSet {
  return {
    in: easeIn,
    out: (p) => 1 - easeIn(1 - p),
    inOut: (p) => (p < 0.5 ? easeIn(p * 2) / 2 : 1 - easeIn((1 - p) * 2) / 2),
  };
}

/** powerN is the curve of degree N + 1 (power2 is cubic). */
function power(degree: number): EaseSet {
  return {
    in: (p) => p ** degree,
    out: (p) => 1 - (1 - p) ** degree,
    inOut: (p) =>
      p < 0.5 ? (p * 2) ** degree / 2 : 1 - ((1 - p) * 2) ** degree / 2,
  };
}

function back(overshoot = 1.70158): EaseSet {
  const out: Ease = (p) => {
    if (!p) {
      return 0;
    }
    const q = p - 1;
    return q * q * ((overshoot + 1) * q + overshoot) + 1;
  };
  return {
    in: (p) => 1 - out(1 - p),
    out,
    inOut: (p) =>
      p < 0.5 ? (1 - out(1 - p * 2)) / 2 : 0.5 + out((p - 0.5) * 2) / 2,
  };
}

const linear: Ease = (p) => p;

const FAMILIES: Record<string, (arg?: number) => EaseSet> = {
  power0: () => ({ in: linear, out: linear, inOut: linear }),
  power1: () => power(2),
  power2: () => power(3),
  power3: () => power(4),
  power4: () => power(5),
  quad: () => power(2),
  cubic: () => power(3),
  quart: () => power(4),
  quint: () => power(5),
  // The blended exponential lands exactly on 1 at the end of the curve.
  expo: () => fromIn((p) => 2 ** (10 * (p - 1)) * p + p ** 6 * (1 - p)),
  circ: () => fromIn((p) => -(Math.sqrt(1 - p * p) - 1)),
  sine: () => fromIn((p) => (p === 1 ? 1 : -Math.cos((p * Math.PI) / 2) + 1)),
  back: (overshoot) => back(overshoot),
};

/**
 * An easing function from a name such as "power2.out", "power3.inOut",
 * "circ.out", "expo.inOut", "back.out(1.7)" or "none". A bare family name is
 * its out-curve. Unknown names fall back to `fallback` (default linear).
 */
export function parseEase(
  name: string | Ease | undefined,
  fallback: Ease = linear,
): Ease {
  if (typeof name === "function") {
    return name;
  }
  if (!name) {
    return fallback;
  }
  const match = /^([a-z]+\d?)(?:\.(in|out|inout))?(?:\(([-\d.]+)\))?$/i.exec(
    name.trim(),
  );
  if (!match) {
    return fallback;
  }
  const family = match[1].toLowerCase();
  if (family === "none" || family === "linear") {
    return linear;
  }
  const make = FAMILIES[family];
  if (!make) {
    return fallback;
  }
  const set = make(match[3] === undefined ? undefined : Number(match[3]));
  const kind = (match[2] ?? "out").toLowerCase();
  return kind === "in" ? set.in : kind === "inout" ? set.inOut : set.out;
}

type Target = object;
type Values = Record<string, number>;

export interface TweenVars {
  /** Seconds. */
  duration: number;
  ease?: string | Ease;
  /** Seconds between consecutive targets' starts. */
  stagger?: number;
  onUpdate?: () => void;
  onComplete?: () => void;
}

interface Running {
  targets: Target[];
  stop: () => void;
}

function isStyled(target: Target): target is ElementCSSInlineStyle {
  return (
    typeof (target as ElementCSSInlineStyle).style === "object" &&
    (target as ElementCSSInlineStyle).style !== null &&
    typeof (target as ElementCSSInlineStyle).style.setProperty === "function"
  );
}

/** Plain values are kept to 6 decimals, style values to 4. */
function write(target: Target, key: string, value: number) {
  if (isStyled(target)) {
    const v = `${Math.round(value * 10000) / 10000}`;
    if (key.startsWith("--")) {
      target.style.setProperty(key, v);
    } else {
      (target.style as unknown as Record<string, string>)[key] = v;
    }
    return;
  }
  (target as Record<string, number>)[key] =
    Math.round(value * 1000000) / 1000000 || 0;
}

function read(target: Target, key: string): number {
  if (isStyled(target)) {
    const inline = key.startsWith("--")
      ? target.style.getPropertyValue(key)
      : (target.style as unknown as Record<string, string>)[key];
    const n = Number.parseFloat(inline);
    if (Number.isFinite(n)) {
      return n;
    }
    if (target instanceof Element) {
      const computed = Number.parseFloat(
        getComputedStyle(target).getPropertyValue(key),
      );
      if (Number.isFinite(computed)) {
        return computed;
      }
    }
    return key === "opacity" ? 1 : 0;
  }
  return Number((target as Record<string, number>)[key]) || 0;
}

/** Writes values onto targets now, as a zero-length tween would. */
export function setValues(targets: Target | Target[], values: Values) {
  for (const target of ([] as Target[]).concat(targets)) {
    for (const key of Object.keys(values)) {
      write(target, key, values[key]);
    }
  }
}

export interface Timeline {
  fromTo: (
    targets: Target | Target[],
    from: Values,
    to: Values,
    vars: TweenVars,
    position?: number,
  ) => Timeline;
  to: (
    targets: Target | Target[],
    to: Values,
    vars: TweenVars,
    position?: number,
  ) => Timeline;
  /** Stops the playhead at `position` (default the end) and calls `callback`. */
  addPause: (position: number | ">" | undefined, callback: () => void) => void;
  /** Seconds, the end of the last child. */
  duration: () => number;
  resume: () => void;
  kill: () => void;
}

export interface Tweens {
  /** The clock, in milliseconds. */
  now: () => number;
  /** Advance every tween to `time` (milliseconds); call once per frame. */
  tick: (time: number) => void;
  to: (targets: Target | Target[], to: Values, vars: TweenVars) => void;
  fromTo: (
    targets: Target | Target[],
    from: Values,
    to: Values,
    vars: TweenVars,
  ) => void;
  /** Calls `callback` after `delay` seconds of the clock. */
  delayedCall: (delay: number, callback: () => void) => void;
  timeline: (vars?: { delay?: number; onComplete?: () => void }) => Timeline;
  /** Stops every tween (and timeline child) that moves one of `targets`. */
  killTweensOf: (targets: Target | Target[]) => void;
  /** Stops everything. */
  dispose: () => void;
}

/**
 * A set of tweens on one clock. `start` is the clock's time now, in
 * milliseconds (performance.now()).
 */
export function createTweens(start: number): Tweens {
  let now = start;
  // A tween started during a tick (a delayed call firing, say) first moves
  // on the next tick, as upstream's GSAP tweens did.
  const subscribers = new Set<(time: number) => void>();
  const running = new Set<Running>();
  const timelines = new Set<{ kill: () => void }>();

  const driver = (update: (time: number) => void) => ({
    start: () => {
      subscribers.add(update);
    },
    stop: () => {
      subscribers.delete(update);
    },
    now: () => now,
  });

  /**
   * One Motion animation per target, 0 to 1 over the duration, eased; each
   * update writes from + (to - from) * progress. Start values come from the
   * targets when the tween starts, unless `from` gives them.
   */
  const play = (
    list: Target[],
    from: Values | null,
    to: Values,
    vars: TweenVars,
    startTime: number | undefined,
    clock: typeof driver = driver,
  ): Running => {
    const ease = parseEase(vars.ease);
    const keys = Object.keys(to);
    const stagger = (vars.stagger ?? 0) * 1000;
    const total = list.length;
    let done = 0;
    const animations = list.map((target, index) => {
      const starts = keys.map((key) => (from ? from[key] : read(target, key)));
      const animation = animateValue({
        keyframes: [0, 1],
        duration: vars.duration * 1000,
        ease,
        driver: clock,
        startTime,
        // Staggered targets wait out their offset as a delay, holding their
        // start value meanwhile.
        delay: index * stagger,
        onUpdate: (progress: number) => {
          for (let k = 0; k < keys.length; k++) {
            write(
              target,
              keys[k],
              starts[k] + (to[keys[k]] - starts[k]) * progress,
            );
          }
          if (index === total - 1 || stagger === 0) {
            vars.onUpdate?.();
          }
        },
        onComplete: () => {
          done++;
          if (done === total) {
            running.delete(handle);
            vars.onComplete?.();
          }
        },
      });
      return animation;
    });
    const handle: Running = {
      targets: list,
      stop: () => {
        for (const animation of animations) {
          animation.stop();
        }
        running.delete(handle);
      },
    };
    running.add(handle);
    return handle;
  };

  const asList = (targets: Target | Target[]) =>
    ([] as Target[]).concat(targets).filter(Boolean);

  /**
   * A timeline is a clock of its own: its children are Motion animations
   * driven by the timeline's local time, which stands still while it is
   * paused and runs on from where it stopped when it resumes.
   */
  const timeline: Tweens["timeline"] = (vars = {}) => {
    interface Child {
      at: number;
      end: number;
      begin?: () => Running;
      pause?: () => void;
      handle?: Running;
      started: boolean;
    }
    const children: Child[] = [];
    // The clock time (ms) at which the timeline's time is 0.
    let origin = now + (vars.delay ?? 0) * 1000;
    // The timeline's own time (ms), and its children's subscriptions.
    let local = 0;
    const childSubscribers = new Set<(time: number) => void>();
    const localDriver = (update: (time: number) => void) => ({
      start: () => {
        childSubscribers.add(update);
      },
      stop: () => {
        childSubscribers.delete(update);
      },
      now: () => local,
    });
    let paused = false;
    let pausedAt = 0;
    let completed = false;
    let killed = false;
    let lastTime = -1;

    const length = () =>
      children.reduce((max, child) => Math.max(max, child.end), 0);

    const update = () => {
      if (paused || killed) {
        return;
      }
      let time = (now - origin) / 1000;
      if (time < 0) {
        return;
      }
      // A pause the playhead crosses holds it there.
      let pauseHit: Child | undefined;
      for (const child of children) {
        if (child.pause && child.at > lastTime && child.at <= time) {
          if (!pauseHit || child.at < pauseHit.at) {
            pauseHit = child;
          }
        }
      }
      if (pauseHit) {
        time = pauseHit.at;
      }
      local = time * 1000;
      for (const child of children) {
        if (child.begin && !child.started && child.at <= time) {
          child.started = true;
          child.handle = child.begin();
        }
      }
      // A Set iterates entries added while it is iterated, so a child that
      // starts on this tick moves on it too.
      for (const tick of childSubscribers) {
        tick(local);
      }
      lastTime = time;
      if (pauseHit) {
        paused = true;
        pausedAt = time;
        pauseHit.pause?.();
        return;
      }
      if (!completed && time >= length()) {
        completed = true;
        subscribers.delete(update);
        vars.onComplete?.();
      }
    };
    subscribers.add(update);

    const add = (
      targets: Target | Target[],
      from: Values | null,
      to: Values,
      tween: TweenVars,
      position?: number,
    ) => {
      const list = asList(targets);
      const at = position ?? length();
      const stagger = (tween.stagger ?? 0) * Math.max(0, list.length - 1);
      if (from) {
        // From-values are written at once, before the playhead arrives.
        setValues(list, from);
      }
      children.push({
        at,
        end: at + tween.duration + stagger,
        started: false,
        begin: () => play(list, from, to, tween, at * 1000, localDriver),
      });
      return api;
    };

    const api: Timeline = {
      fromTo: (targets, from, to, tween, position) =>
        add(targets, from, to, tween, position),
      to: (targets, to, tween, position) =>
        add(targets, null, to, tween, position),
      addPause: (position, callback) => {
        const at =
          position === undefined || position === ">" ? length() : position;
        children.push({ at, end: at, started: true, pause: callback });
      },
      duration: length,
      resume: () => {
        if (!paused || killed) {
          return;
        }
        paused = false;
        origin = now - pausedAt * 1000;
      },
      kill: () => {
        killed = true;
        subscribers.delete(update);
        for (const child of children) {
          child.handle?.stop();
        }
        childSubscribers.clear();
        timelines.delete(api);
      },
    };
    timelines.add(api);
    return api;
  };

  return {
    now: () => now,
    tick: (time) => {
      now = time;
      for (const update of [...subscribers]) {
        update(time);
      }
    },
    to: (targets, to, vars) => {
      play(asList(targets), null, to, vars, undefined);
    },
    fromTo: (targets, from, to, vars) => {
      const list = asList(targets);
      setValues(list, from);
      play(list, from, to, vars, undefined);
    },
    delayedCall: (delay, callback) => {
      play(
        [{ t: 0 }],
        null,
        { t: 1 },
        { duration: delay, onComplete: callback },
        undefined,
      );
    },
    timeline,
    killTweensOf: (targets) => {
      const list = asList(targets);
      for (const handle of [...running]) {
        if (handle.targets.some((target) => list.includes(target))) {
          handle.stop();
        }
      }
    },
    dispose: () => {
      for (const handle of [...running]) {
        handle.stop();
      }
      for (const line of [...timelines]) {
        line.kill();
      }
      subscribers.clear();
    },
  };
}
