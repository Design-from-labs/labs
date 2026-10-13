import {
  balloonDefaultSize,
  createBallonElement,
  svgFiltersHtml,
} from "./balloons-svg";

// ---- Labs: options shared by balloons() and textBalloons() ----
// Upstream always fills the viewport. These options are additions; with none
// of them, both functions behave as upstream's (the fidelity record).

export interface BalloonsOptions {
  /**
   * Contain the effect in this element instead of the viewport: the layer is
   * absolutely positioned inside it and sized from its box. A static element
   * is made `position: relative` while the effect runs.
   */
  container?: HTMLElement | null;
  /** Abort to stop at once: the animations are cancelled and the layer removed. */
  signal?: AbortSignal;
  /**
   * What to do under `prefers-reduced-motion: reduce`. `"fade"` (default)
   * shows one still frame of the effect that fades in and out (opacity only,
   * nothing moves); `"skip"` does nothing and resolves at once.
   */
  reducedMotion?: "fade" | "skip";
}

let releases = 0;
/** A per-release suffix for SVG ids (a counter: Math.random stays untouched). */
export function nextBalloonsId() {
  releases += 1;
  return `b${releases}`;
}

export function balloonsReduceMotion() {
  return (
    typeof globalThis.matchMedia === "function" &&
    globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Still frames shown under reduced motion fade in and out over this long. */
export const BALLOONS_STILL_DURATION = 2400;

/** Fades a still layer in and out (opacity only). */
export function fadeBalloonsStill(layer: HTMLElement) {
  return layer.animate(
    [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }],
    { duration: BALLOONS_STILL_DURATION, easing: "ease-in-out" },
  );
}

const positioned = new WeakMap<HTMLElement, { count: number; position: string }>();

/** Makes a static container a containing block while layers are inside it. */
export function holdBalloonsContainer(container: HTMLElement) {
  const held = positioned.get(container);
  if (held) {
    held.count += 1;
  } else if (getComputedStyle(container).position === "static") {
    positioned.set(container, { count: 1, position: container.style.position });
    container.style.position = "relative";
  }
  return () => {
    const entry = positioned.get(container);
    if (!entry) return;
    entry.count -= 1;
    if (entry.count === 0) {
      container.style.position = entry.position;
      positioned.delete(container);
    }
  };
}

// ---- upstream: src/balloons.ts ----
// Line for line, with the Labs options woven in (each marked "Labs"). The
// unused farthestBallonPosition and a commented-out log are dropped, and
// upstream's re-export of textBalloons lives in balloons.tsx.

const easings = [
  // easeOutQuint
  "cubic-bezier(0.22, 1, 0.36, 1)",
  // easeOutCubic
  "cubic-bezier(0.33, 1, 0.68, 1)",
];
const colorPairs = [
  // yellow
  ["#ffec37ee", "#f8b13dff"],
  // red
  ["#f89640ee", "#c03940ff"],
  //blue
  ["#3bc0f0ee", "#0075bcff"],
  // green
  ["#b0cb47ee", "#3d954bff"],
  // purple
  ["#cf85b8ee", "#a3509dff"],
];

function createBalloonAnimation({
  balloon,
  x,
  y,
  z,
  targetX,
  targetY,
  targetZ,
  zIndex,
}: {
  balloon: HTMLElement;
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  zIndex: number;
}) {
  balloon.style.zIndex = zIndex.toString();
  // Add blur to the closes ballons for bokeh effect
  balloon.style.filter = `blur(${zIndex > 7 ? 8 : 0}px)`;
  const getAnimation = () => {
    const tiltAngle = Math.random() * (15 - 8) + 8; // Random tilt angle between 8 and 15 degrees
    const tiltDirection = Math.random() < 0.5 ? 1 : -1; // Random tilt direction
    return balloon.animate(
      [
        {
          transform: `translate(-50%, 0%) translate3d(${x}px, ${y}px, ${z}px) rotate3d(0, 0, 1, ${
            tiltDirection * -tiltAngle
          }deg)`,
          opacity: 1,
        },
        {
          transform: `translate(-50%, 0%) translate3d(${
            x + (targetX - x) / 2
          }px, ${y + (y + targetY * 5 - y) / 2}px, ${
            z + (targetZ - z) / 2
          }px) rotate3d(0, 0, 1, ${tiltDirection * tiltAngle}deg)`,
          opacity: 1,
          offset: 0.5,
        },
        {
          transform: `translate(-50%, 0%) translate3d(${targetX}px, ${
            y + targetY * 5
          }px, ${targetZ}px) rotate3d(0, 0, 1, ${
            tiltDirection * -tiltAngle
          }deg)`,
          opacity: 1,
        },
      ],
      {
        duration: (Math.random() * 1000 + 5000) * 5,
        easing: easings[Math.floor(Math.random() * easings.length)],
        delay: zIndex * 200,
      }
    );
  };
  return { balloon, getAnimation, delay: zIndex * 200 };
}

/**
 * Releases a bunch of balloons that float up and away. Resolves when the
 * last one has left (about 30 s; a still frame under reduced motion, 2.4 s).
 */
export function balloons(options: BalloonsOptions = {}): Promise<void> {
  return new Promise((resolve) => {
    // Labs: reduced motion, cancellation and containment.
    const reduce = balloonsReduceMotion();
    if ((reduce && options.reducedMotion === "skip") || options.signal?.aborted) {
      resolve();
      return;
    }
    const host = options.container ?? null;
    const release = host ? holdBalloonsContainer(host) : () => {};
    const id = nextBalloonsId();

    const balloonsContainer = document.createElement("balloons");

    Object.assign(balloonsContainer.style, {
      overflow: "hidden",
      position: host ? "absolute" : "fixed",
      inset: "0",
      zIndex: "999",
      display: "inline-block",
      pointerEvents: "none",
      perspective: "1500px",
      perspectiveOrigin: host ? "50% 100%" : "50vw 100vh",
      contain: "style, layout, paint",
    });
    balloonsContainer.setAttribute("aria-hidden", "true");

    (host ?? document.documentElement).appendChild(balloonsContainer);

    // Labs: the scene is the container's box when there is one.
    const viewWidth = host ? host.clientWidth : window.innerWidth;
    const viewHeight = host ? host.clientHeight : window.innerHeight;

    const sceneSize = { width: viewWidth, height: viewHeight };
    // make balloon height relative to screen size for this nice bokeh/perspective effect
    const balloonHeight = Math.floor(
      Math.min(sceneSize.width, sceneSize.height) * 1
    );

    const balloonWidth =
      (balloonDefaultSize.width / balloonDefaultSize.height) * balloonHeight;
    let amount = Math.max(
      7,
      Math.round(viewWidth / (balloonWidth / 2))
    );
    // make max dist depend on number of balloons and their size for realistic effect
    // we dont want them to be too separated or too squeezed together
    const maxDist = Math.max(
      (amount * balloonWidth) / 2,
      (balloonWidth / 2) * 10
    );

    type BallonPosition = {
      x: number;
      y: number;
      z: number;
      targetX: number;
      targetY: number;
      targetZ: number;
    };

    let balloonPositions: BallonPosition[] = [];

    for (let i = 0; i < amount; i++) {
      const x = Math.round(sceneSize.width * Math.random());
      // make sure balloons first render below the bottom of the screen
      const y = viewHeight;
      const z = Math.round(-1 * (Math.random() * maxDist));

      const targetX = Math.round(
        x + Math.random() * balloonWidth * 6 * (Math.random() > 0.5 ? 1 : -1)
      );
      const targetY = -viewHeight;
      // balloons don't move in the Z direction
      const targetZ = z;
      balloonPositions.push({
        x,
        y,
        z,
        targetX,
        targetY,
        targetZ,
      });
    }

    balloonPositions = balloonPositions.sort((a, b) => a.z - b.z);
    const closestBallonPosition = balloonPositions[balloonPositions.length - 1];
    balloonPositions = balloonPositions.map((pos) => ({
      ...pos,
      z: pos.z - closestBallonPosition.z,
      targetZ: pos.z - closestBallonPosition.z,
    }));

    const filtersElement = document.createElement("div");
    filtersElement.innerHTML = svgFiltersHtml(id);
    balloonsContainer.appendChild(filtersElement);

    let currentZIndex = 1;

    const animations = balloonPositions.map((pos, index) => {
      const colorPair = colorPairs[index % colorPairs.length];

      const balloon = createBallonElement({
        balloonColor: colorPair[1],
        lightColor: colorPair[0],
        width: balloonWidth,
        id,
      });
      balloonsContainer.appendChild(balloon);

      return createBalloonAnimation({
        balloon,
        ...pos,
        zIndex: currentZIndex++,
      });
    });

    // Labs: one place that ends the release (finished, still frame or abort).
    const running: Animation[] = [];
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      for (const animation of running) animation.cancel();
      balloonsContainer.remove();
      release();
      options.signal?.removeEventListener("abort", finish);
      resolve();
    };
    options.signal?.addEventListener("abort", finish);

    // Wait a bit for the balloon prerender
    requestAnimationFrame(() => {
      if (done) return;
      if (reduce) {
        // Labs: one still frame, each balloon a little way into its flight,
        // faded in and out; nothing moves.
        for (const { getAnimation, delay } of animations) {
          const animation = getAnimation();
          animation.pause();
          animation.currentTime = delay + 900;
          running.push(animation);
        }
        const fade = fadeBalloonsStill(balloonsContainer);
        running.push(fade);
        fade.finished.then(finish, () => {});
        return;
      }
      const animationPromises = animations.map(({ balloon, getAnimation }) => {
        const a = getAnimation();
        running.push(a);
        return a.finished.then(() => {
          balloon.remove();
        });
      });

      Promise.all(animationPromises).then(finish, () => {});
    });
  });
}
