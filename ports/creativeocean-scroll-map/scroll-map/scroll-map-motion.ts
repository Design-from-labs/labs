import { animateValue, cancelFrame, frame, frameData } from "motion";

/*
 * The motion of ScrollMap, on Motion. The pen drove it with GSAP: a scrubbed
 * ScrollTrigger timeline (the route drawn by DrawSVG, a dot moved along it by
 * MotionPath, a zoom on the map group), two quickTo tweens that glide the
 * camera after the dot, and three small timelines for opening and closing the
 * map. None of that ships. Every tween here is a Motion `animateValue` whose
 * driver is the map's own frame clock, and the three plugins are plain SVG:
 *
 *   DrawSVG    -> stroke-dasharray on the route (one dash of the drawn length)
 *   MotionPath -> getPointAtLength on the route
 *   ScrollTrigger scrub -> a tween of the timeline's progress that is
 *                 restarted from where it is on every change of the scroll
 *                 progress (GSAP's resetTo), expo-out over `scrub` seconds
 *
 * GSAP's named eases are written out as functions. The clock ticks once per
 * animation frame, and runs only while something is moving.
 */

export type Ease = (progress: number) => number;

// ---- GSAP's named eases ----------------------------------------------------

const expoIn: Ease = (p) => 2 ** (10 * (p - 1)) * p + p ** 6 * (1 - p);

/** "none" */
export const none: Ease = (p) => p;
/** "sine.inOut" */
export const sineInOut: Ease = (p) => -0.5 * (Math.cos(Math.PI * p) - 1);
/** "expo" and "expo.out" (GSAP's expo curve is blended so it lands on 1). */
export const expoOut: Ease = (p) => 1 - expoIn(1 - p);
/** "expo.inOut" */
export const expoInOut: Ease = (p) =>
  p < 0.5 ? expoIn(p * 2) / 2 : 1 - expoIn((1 - p) * 2) / 2;
/** "power1.out" (quad), GSAP's default ease */
export const power1Out: Ease = (p) => 1 - (1 - p) ** 2;
/** "power2.inOut" (cubic) */
export const power2InOut: Ease = (p) =>
  p < 0.5 ? (p * 2) ** 3 / 2 : 1 - ((1 - p) * 2) ** 3 / 2;
/** "power3.inOut" (quart) */
export const power3InOut: Ease = (p) =>
  p < 0.5 ? (p * 2) ** 4 / 2 : 1 - ((1 - p) * 2) ** 4 / 2;

// ---- the pen's timeline ----------------------------------------------------

/** The timeline's length in the pen's seconds; progress 0 to 1 spans it. */
const TIMELINE = 0.5;
/** The zoom tween: 0.15 s in, a 0.2 s hold, 0.15 s back out (yoyo). */
const ZOOM_TIME = 0.15;
const ZOOM_HOLD = 0.2;

/** The map group's scale at timeline progress `p`. */
export function zoomAt(p: number, from: number, to: number): number {
  const t = p * TIMELINE;
  if (t <= ZOOM_TIME) {
    return from + (to - from) * sineInOut(t / ZOOM_TIME);
  }
  if (t < ZOOM_TIME + ZOOM_HOLD) {
    return to;
  }
  return from + (to - from) * sineInOut((TIMELINE - t) / ZOOM_TIME);
}

/** Six significant digits, as the drawn dash is written. */
function sig(n: number): string {
  return String(Number(n.toPrecision(6)));
}

// ---- the clock -------------------------------------------------------------

interface Driver {
  start: () => void;
  stop: () => void;
  now: () => number;
}

/** A value that glides to a target and can be sent to a new one from where it is. */
interface Glide {
  /** The value now, at the clock's time. */
  value: () => number;
  /** Start again from the current value (or `from`) towards `target`. */
  restart: (target: number, from?: number) => void;
  /** Jump to `value` with no tween. */
  set: (value: number) => void;
  stop: () => void;
}

export interface ScrollMapEngineOptions {
  pov: SVGGElement;
  camera: SVGGElement;
  route: SVGPathElement;
  dot: SVGCircleElement;
  /** The pane whose width opens from `split` to 100 (percent). */
  pane: HTMLElement;
  /** The close button: shown while the map is open. */
  close: HTMLElement;
  /** The viewBox side of the map; the zoom turns about its centre. */
  size: number;
  /** The zoom at the start and at its deepest. */
  zoom: [number, number];
  /** Seconds the drawn route takes to catch up with the scroll; 0 follows it directly. */
  scrub: number;
  /** The pane's closed width, in percent of its parent. */
  split: number;
  /** Lock or unlock scrolling of the page (or container) while the map is open. */
  lockScroll: (locked: boolean) => void;
}

export interface ScrollMapEngine {
  /** The scroll progress changed (0 to 1): the timeline follows it, smoothed. */
  setScroll: (progress: number) => void;
  /** Show the timeline at `progress` at once, camera included. */
  jump: (progress: number) => void;
  /** Open or close the map; without `animate` it happens at once. */
  setOpen: (open: boolean, animate: boolean) => void;
  /** Where the timeline is now. */
  progress: () => number;
  dispose: () => void;
}

export function createScrollMapEngine(
  options: ScrollMapEngineOptions,
): ScrollMapEngine {
  const { pov, camera, route, dot, pane, close, size, zoom, split } = options;
  const centre = size / 2;
  const length = route.getTotalLength();

  // The clock. Lag smoothing as GSAP's ticker has it: a gap of more than
  // 500 ms counts as 33 ms. It ticks inside Motion's frame loop (the update
  // step), so a scroll change that Motion delivers in a frame's read step is
  // followed by a tick of the same frame, as GSAP's ticker follows the
  // scroll event that precedes it. It sleeps when nothing moves.
  let clock = performance.now();
  let last = clock;
  // One frame, as the last ticks measured it (60 Hz until they have).
  let interval = 1000 / 60;
  let awake = false;
  const subscribers = new Set<(time: number) => void>();

  const driver = (update: (time: number) => void): Driver => ({
    start: () => {
      subscribers.add(update);
      wake();
    },
    stop: () => {
      subscribers.delete(update);
    },
    now: () => clock,
  });

  const tick = () => {
    const now = performance.now();
    let elapsed = now - last;
    last = now;
    if (elapsed >= 4 && elapsed <= 50) {
      interval = elapsed;
    }
    if (elapsed > 500 || elapsed < 0) {
      elapsed = 33;
    }
    clock += elapsed;
    // A tween started during a tick first moves on the next one.
    for (const update of [...subscribers]) {
      if (subscribers.has(update)) {
        update(clock);
      }
    }
    if (subscribers.size === 0) {
      sleep();
    }
  };

  function wake() {
    if (!awake) {
      awake = true;
      // Woken inside a frame (Motion delivered a scroll change in its read
      // step), the tick that follows in the same frame covers one frame; woken
      // by an event between frames, the clock starts counting now.
      const now = performance.now();
      last = frameData.isProcessing ? now - interval : now;
      frame.update(tick, true);
    }
  }

  function sleep() {
    awake = false;
    cancelFrame(tick);
  }

  /** Tweens `write` from a value to a target over `seconds` on the clock. */
  function glide(
    initial: number,
    seconds: number,
    ease: Ease,
    write: (value: number) => void,
    onComplete?: () => void,
  ): Glide {
    let from = initial;
    let to = initial;
    let startedAt = clock;
    let running = false;
    let current = initial;
    let animation: ReturnType<typeof animateValue<number>> | undefined;

    const at = () => {
      if (!running) {
        return current;
      }
      const t = Math.min(
        1,
        Math.max(0, (clock - startedAt) / (seconds * 1000)),
      );
      return from + (to - from) * ease(t);
    };

    const stop = () => {
      animation?.stop();
      animation = undefined;
      running = false;
    };

    return {
      value: () => (current = at()),
      restart: (target, startValue) => {
        const begin = startValue ?? at();
        stop();
        from = begin;
        to = target;
        startedAt = clock;
        running = true;
        current = begin;
        write(begin);
        animation = animateValue({
          keyframes: [begin, target],
          duration: seconds * 1000,
          ease,
          driver,
          startTime: startedAt,
          onUpdate: (value: number) => {
            current = value;
            write(value);
          },
          onComplete: () => {
            running = false;
            current = target;
            write(target);
            onComplete?.();
          },
        });
      },
      set: (value) => {
        stop();
        current = value;
        write(value);
      },
      stop,
    };
  }

  // ---- what the timeline draws ----
  // Values are kept whole and written rounded, as the pen's plugins wrote them.
  const r4 = (n: number) => Math.round(n * 10000) / 10000;
  const r5 = (n: number) => Math.round(n * 100000) / 100000;
  let progress = 0;
  const cam = { x: 0, y: 0 };
  const writeCamera = (axis: "x" | "y") => (value: number) => {
    cam[axis] = value;
    camera.setAttribute(
      "transform",
      `matrix(1,0,0,1,${r4(cam.x)},${r4(cam.y)})`,
    );
  };
  const camX = glide(0, 1, expoOut, writeCamera("x"));
  const camY = glide(0, 1, expoOut, writeCamera("y"));

  /** Draws the timeline at `p`; the camera follows the dot (or jumps to it). */
  function render(p: number, snap: boolean) {
    progress = p;
    const drawn = p * length;
    const point = route.getPointAtLength(drawn);
    dot.setAttribute(
      "transform",
      `matrix(1,0,0,1,${r5(point.x)},${r5(point.y)})`,
    );
    route.style.strokeDasharray = `${sig(drawn)}px, ${sig(length + 0.1 - drawn)}px`;
    route.style.strokeDashoffset = "0";
    const scale = r4(zoomAt(p, zoom[0], zoom[1]));
    pov.setAttribute(
      "transform",
      `matrix(${scale},0,0,${scale},${centre},${centre})`,
    );
    if (snap) {
      camX.set(-point.x);
      camY.set(-point.y);
    } else {
      camX.restart(-point.x);
      camY.restart(-point.y);
    }
  }

  const follow = (value: number) => {
    if (value !== progress) {
      render(value, false);
    }
  };
  // ScrollTrigger's scrub: the timeline's progress chases the scroll progress.
  const scrub = glide(0, Math.max(options.scrub, 0.001), expoOut, follow);

  // ---- the open map ----
  let width = split;
  const writeWidth = (value: number) => {
    width = value;
    pane.style.width = `${r4(value)}%`;
  };
  let alpha = 0;
  const writeAlpha = (value: number) => {
    alpha = value;
    close.style.opacity = String(r4(value));
  };
  const widthTween = glide(split, 0.5, power3InOut, writeWidth);
  // The close button fades in from 0.3 s for 0.5 s; one tween of 0.8 s holds
  // it at 0 for the first 0.3.
  const fadeIn = glide(
    0,
    0.8,
    (p) => (p < 0.375 ? 0 : power1Out((p - 0.375) / 0.625)),
    writeAlpha,
  );
  const fadeOut = glide(0, 0.2, power1Out, writeAlpha, () => {
    close.style.visibility = "hidden";
  });
  const openProgress = glide(0, 0.5, power2InOut, follow);
  const closeWidth = glide(split, 0.5, expoInOut, writeWidth, () => {
    options.lockScroll(false);
  });

  const stopOpening = () => {
    widthTween.stop();
    fadeIn.stop();
    fadeOut.stop();
    closeWidth.stop();
    openProgress.stop();
  };

  return {
    progress: () => progress,
    setScroll: (target) => {
      if (options.scrub <= 0) {
        follow(target);
        return;
      }
      scrub.restart(target, progress);
    },
    jump: (value) => {
      scrub.stop();
      openProgress.stop();
      render(value, true);
    },
    setOpen: (open, animate) => {
      stopOpening();
      if (!pane.style.width) {
        // Start from the width the page laid out (the stylesheet rounds it to
        // whole pixels, as the pen's pin did), not from the plain percentage.
        const parent = pane.offsetParent as HTMLElement | null;
        const total = parent?.clientWidth ?? 0;
        if (total > 0) {
          width = (pane.getBoundingClientRect().width / total) * 100;
        }
      }
      if (!animate) {
        writeWidth(open ? 100 : split);
        writeAlpha(open ? 1 : 0);
        close.style.visibility = open ? "visible" : "hidden";
        options.lockScroll(open);
        return;
      }
      if (open) {
        options.lockScroll(true);
        close.style.visibility = "visible";
        widthTween.restart(100, width);
        // The pen let a scrub still catching up fight the opening tween and
        // snap the map back when it ended; opening stops it instead.
        scrub.stop();
        openProgress.restart(1, progress);
        fadeIn.restart(1, alpha);
      } else {
        fadeOut.restart(0, alpha);
        closeWidth.restart(split, width);
      }
    },
    dispose: () => {
      stopOpening();
      scrub.stop();
      camX.stop();
      camY.stop();
      subscribers.clear();
      sleep();
    },
  };
}
