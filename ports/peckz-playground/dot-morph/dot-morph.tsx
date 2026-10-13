"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  appearFrameAt,
  buildTracks,
  CENTER,
  CORE_RADIUS,
  type Direction,
  DOT_PATHS,
  type Frame,
  frameAt,
  MARK_PATHS,
  mixColor,
  SINGLE_DOT_PATH,
  sampleShape,
  splitFrameAt,
  splitGooAt,
  type Track,
} from "./dot-morph-motion";

/**
 * The icon rests in one of three stages and only ever steps to a neighbour:
 * hover splits the dot into three, a click morphs them into the mark and
 * back, and leaving walks it all the way home to the single dot
 */
const STAGES = ["dot", "dots", "mark"] as const;
type DotMorphStage = (typeof STAGES)[number];

/** On load the single dot swells in */
const APPEAR_MS = 320;
const MERGE_MS = 380;

/** Autoplay walks the whole loop, holding on each stage it lands on */
const AUTOPLAY_LOOP: DotMorphStage[] = ["dots", "mark", "dots", "dot"];
const AUTOPLAY_HOLD_MS: Record<DotMorphStage, number> = {
  dot: 700,
  dots: 600,
  mark: 1600,
};

/**
 * Motion blur the After Effects way: every frame stacks sub-frames spread
 * across the shutter. Each is translucent, so wherever all of them overlap the
 * shape reads solid and the fast edges smear into a falloff.
 */
const BLUR_SAMPLES = 10;
const LAYERS = Array.from({ length: BLUR_SAMPLES }, (_, index) => index);
/** Per-sample opacity that stacks up to 99% where every sample overlaps */
const SAMPLE_OPACITY = 1 - 0.01 ** (1 / BLUR_SAMPLES);
/** Shutter angle is measured against a 60fps frame, like a comp in AE */
const FRAME_MS = 1000 / 60;
/** Soft blur in viewBox units per unit of orbit velocity, at soften 1 */
const SOFTEN_UNITS = 0.12;

/**
 * Liquid split: blur the dots, then snap the alpha back to a hard edge. Where
 * two blurred dots overlap their alpha adds up past the cut, so a neck of goo
 * joins them and pinches off as they drip apart. Translucent motion blur
 * samples stack into one solid stretched droplet the same way
 */
const GOO_UNITS = 1.1;
/** Alpha x 18 - 7: anything under ~40% alpha drops out, the rest goes solid */
const GOO_MATRIX = "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7";

type Settings = {
  spin: number;
  twist: number;
  expandAt: number;
  duration: number;
  shutter: number;
  soften: number;
  goo: number;
  split: number;
  size: number;
  speed: number;
  colors: readonly string[] | undefined;
};

type Playback = {
  /** appear: the dot swells in. split: one dot and three. morph: three dots and the mark */
  kind: "appear" | "split" | "morph";
  /** Away from the single dot: splitting into three, or morphing into the mark */
  forward: boolean;
  /** 0-1 through the play, advanced by frame delta times the speed */
  progress: number;
  playing: boolean;
};

type DotMorphProps = Omit<
  React.ComponentProps<"button">,
  "children" | "color"
> & {
  /** Pixels per unit of the 24-unit icon grid: 16 draws a 384px icon. */
  size?: number;
  /**
   * The three closed paths the dots morph into (24-unit viewBox: top, lower
   * left, lower right), around a core circle of radius 3 at the centre.
   * Defaults to three petals.
   */
  mark?: readonly [string, string, string];
  /**
   * Hex colours the pieces bloom into as they become the mark: three pieces,
   * then the core. Leave unset for one solid colour (`currentColor`).
   */
  colors?: readonly [string, string, string, string];
  /** Degrees each dot orbits on the way into the mark. */
  spin?: number;
  /** Extra lag on each piece's own rotation, in degrees, caught up by the end. */
  twist?: number;
  /** Fraction of the morph the dots spin as circles before blooming. */
  expandAt?: number;
  /** Morph length in milliseconds. */
  duration?: number;
  /** Split length (one dot into three) in milliseconds. */
  splitDuration?: number;
  /** Motion-blur shutter angle in degrees; 0 turns the blur off. */
  shutter?: number;
  /** Extra soft blur at peak speed. */
  soften?: number;
  /** How gooey the split is; 0 turns the goo off. */
  goo?: number;
  /** 1 orbits clockwise, -1 counter-clockwise. */
  direction?: Direction;
  /** Playback speed multiplier. */
  speed?: number;
  /** Walk the whole loop on its own (dot, dots, mark, dots, dot). */
  autoplay?: boolean;
  /** Accessible names for the button, by what a press does next. */
  labels?: { toMark: string; toDots: string };
  /** Fires when the icon starts a step toward a new stage. */
  onStageChange?: (stage: DotMorphStage) => void;
};

/**
 * A single dot that splits into three menu dots on hover, then spins and
 * blooms into a three-piece mark on press, with motion blur and a gooey split.
 * The frame loop writes SVG attributes directly, so React never re-renders
 * during a play.
 */
function DotMorph({
  size = 16,
  mark = MARK_PATHS as unknown as readonly [string, string, string],
  colors,
  spin = 270,
  twist = 45,
  expandAt = 0.3,
  duration = 600,
  splitDuration = 420,
  shutter = 360,
  soften = 0.5,
  goo = 1,
  direction = 1,
  speed = 1,
  autoplay = false,
  labels = { toMark: "Show the mark", toDots: "Back to the menu dots" },
  onStageChange,
  className,
  onClick,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: DotMorphProps) {
  const [isMark, setIsMark] = React.useState(false);
  const gooId = `dot-morph-goo-${React.useId().replace(/:/g, "")}`;

  const stageRef = React.useRef<HTMLDivElement>(null);
  const layerRefs = React.useRef<(SVGGElement | null)[]>([]);
  const pieceRefs = React.useRef<(SVGPathElement | null)[][]>(
    LAYERS.map(() => []),
  );
  const coreRefs = React.useRef<(SVGCircleElement | null)[]>([]);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const gooGroupRef = React.useRef<SVGGElement>(null);
  const gooBlurRef = React.useRef<SVGFEGaussianBlurElement>(null);

  /** The stage the icon rests on, or is playing toward */
  const currentRef = React.useRef<DotMorphStage>("dot");
  /** Where hover, clicks and autoplay want the icon. Plays step toward it whenever the icon comes to rest */
  const targetRef = React.useRef<DotMorphStage>("dot");
  const tracksRef = React.useRef<Track[] | null>(null);
  const playbackRef = React.useRef<Playback>({
    kind: "appear",
    forward: true,
    progress: 1,
    playing: false,
  });
  const onStageChangeRef = React.useRef(onStageChange);
  onStageChangeRef.current = onStageChange;

  // The frame loop reads settings from a ref so prop changes never restart it
  const settingsRef = React.useRef<Settings>({
    spin,
    twist,
    expandAt,
    duration,
    shutter,
    soften,
    goo,
    split: splitDuration,
    size,
    speed,
    colors,
  });
  settingsRef.current = {
    spin,
    twist,
    expandAt,
    duration,
    shutter,
    soften,
    goo,
    split: splitDuration,
    size,
    speed,
    colors,
  };
  const markRef = React.useRef(mark);
  markRef.current = mark;

  usePixelSnap(stageRef, size);

  // Resample once on the client, re-pair dots and pieces whenever the spin, direction or mark changes
  const markKey = mark.join("|");
  React.useEffect(() => {
    const shapes = {
      dots: DOT_PATHS.map((d) => sampleShape(d)),
      blades: markKey.split("|").map((d) => sampleShape(d)),
    };
    tracksRef.current = buildTracks(
      shapes.dots,
      shapes.blades,
      spin,
      direction,
    );
  }, [spin, direction, markKey]);

  /** Click: three dots to the mark and back. From the single dot it walks the whole way */
  function toggle() {
    setTarget(targetRef.current === "mark" ? "dots" : "mark");
  }

  function setTarget(stage: DotMorphStage) {
    targetRef.current = stage;
    settle();
  }

  /**
   * Steps one stage toward the target. Nothing reverses midway, since the
   * spin only ever goes one way, so a change of mind waits for the play to
   * land. The frame loop calls this again whenever a play lands
   */
  function settle() {
    if (playbackRef.current.playing) {
      return;
    }
    const from = STAGES.indexOf(currentRef.current);
    const to = STAGES.indexOf(targetRef.current);
    if (from === to) {
      return;
    }
    startStep(STAGES[from + Math.sign(to - from)]);
  }

  /** Hover in splits the dot, hover out walks it home. Mouse only, so a tap stays a click */
  function handlePointerHover(event: React.PointerEvent, entering: boolean) {
    if (event.pointerType !== "mouse" || autoplay) {
      return;
    }
    if (!entering) {
      setTarget("dot");
    } else if (targetRef.current === "dot") {
      setTarget("dots");
    }
  }

  function startStep(next: DotMorphStage) {
    const from = currentRef.current;
    currentRef.current = next;
    setIsMark(next === "mark");
    onStageChangeRef.current?.(next);
    const touchesMark = from === "mark" || next === "mark";
    if (prefersReducedMotion()) {
      playbackRef.current.playing = false;
      renderRest(next);
      settle();
      return;
    }
    playbackRef.current = {
      kind: touchesMark ? "morph" : "split",
      forward: touchesMark ? next === "mark" : next === "dots",
      progress: 0,
      playing: true,
    };
  }

  function startAppear() {
    currentRef.current = "dot";
    targetRef.current = "dot";
    setIsMark(false);
    if (prefersReducedMotion()) {
      renderRest("dot");
      return;
    }
    playbackRef.current = {
      kind: "appear",
      forward: true,
      progress: 0,
      playing: true,
    };
    drawPlay(playbackRef.current);
  }

  function playMsFor(kind: Playback["kind"], forward: boolean) {
    const settings = settingsRef.current;
    if (kind === "appear") {
      return APPEAR_MS;
    }
    if (kind === "split") {
      return forward ? settings.split : MERGE_MS;
    }
    return settings.duration;
  }

  /** The ink as a hex colour, for blending in OKLab */
  function inkHex() {
    const svg = svgRef.current;
    const color = svg ? getComputedStyle(svg).color : "";
    const match = /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(color);
    if (!match) {
      return "#000000";
    }
    return `#${match
      .slice(1, 4)
      .map((channel) => Number(channel).toString(16).padStart(2, "0"))
      .join("")}`;
  }

  function colorFor(colorIndex: number, mix: number) {
    const settings = settingsRef.current;
    if (!settings.colors) {
      return "currentColor";
    }
    return mixColor(inkHex(), settings.colors[colorIndex], mix);
  }

  function renderLayer(layerIndex: number, frame: Frame, opacity: number) {
    const layer = layerRefs.current[layerIndex];
    layer?.removeAttribute("display");
    layer?.setAttribute("opacity", opacity.toFixed(3));
    frame.pieces.forEach((piece, index) => {
      const element = pieceRefs.current[layerIndex][index];
      element?.setAttribute("d", piece.d);
      element?.setAttribute("fill", colorFor(piece.colorIndex, piece.mix));
    });
    renderCore(layerIndex, frame.coreRadius);
  }

  /** Only the first layer is used at rest */
  function hideLayersAfter(count: number) {
    LAYERS.slice(count).forEach((layerIndex) => {
      layerRefs.current[layerIndex]?.setAttribute("display", "none");
    });
  }

  /**
   * A CSS blur on the svg runs on the GPU. The same blur as an svg <filter> is
   * redrawn on the CPU every frame in Safari, which dropped iOS to ~10fps
   */
  function renderSoften(stdDeviation: number) {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    if (stdDeviation < 0.01) {
      svg.style.filter = "";
      return;
    }
    // stdDeviation is in viewBox units, and the svg draws `size` px per unit
    const pixels = stdDeviation * settingsRef.current.size;
    svg.style.filter = `blur(${pixels.toFixed(2)}px)`;
  }

  /** At rest the source paths are drawn as-is, so the still frame is the real icon */
  function renderRest(stage: DotMorphStage) {
    const layer = layerRefs.current[0];
    layer?.removeAttribute("display");
    layer?.setAttribute("opacity", "1");
    const atMark = stage === "mark";
    const paths =
      stage === "mark"
        ? markRef.current
        : stage === "dots"
          ? DOT_PATHS
          : DOT_PATHS.map(() => SINGLE_DOT_PATH);
    paths.forEach((d, index) => {
      const element = pieceRefs.current[0][index];
      element?.setAttribute("d", d);
      element?.setAttribute("fill", colorFor(index, atMark ? 1 : 0));
    });
    renderCore(0, atMark ? CORE_RADIUS : 0);
    hideLayersAfter(1);
    renderSoften(0);
    renderGoo(0);
  }

  function renderCore(layerIndex: number, radius: number) {
    const settings = settingsRef.current;
    const core = coreRefs.current[layerIndex];
    core?.setAttribute("r", radius.toFixed(3));
    core?.setAttribute("fill", settings.colors?.[3] ?? "currentColor");
  }

  function renderGoo(stdDeviation: number) {
    if (stdDeviation < 0.01) {
      gooGroupRef.current?.removeAttribute("filter");
      return;
    }
    gooBlurRef.current?.setAttribute("stdDeviation", stdDeviation.toFixed(3));
    gooGroupRef.current?.setAttribute("filter", `url(#${gooId})`);
  }

  function drawAt(progress: number, toMark: boolean) {
    const tracks = tracksRef.current;
    if (!tracks) {
      return;
    }
    renderGoo(0);
    const settings = settingsRef.current;
    drawBlurred(progress, settings.duration, (sampleProgress) =>
      frameAt(sampleProgress, toMark, tracks, settings),
    );
  }

  function drawPlay(playback: Playback) {
    const settings = settingsRef.current;
    const playMs = playMsFor(playback.kind, playback.forward);
    if (playback.kind === "morph") {
      drawAt(playback.progress, playback.forward);
      return;
    }
    if (playback.kind === "appear") {
      renderGoo(0);
      drawBlurred(playback.progress, playMs, appearFrameAt);
      return;
    }
    drawBlurred(playback.progress, playMs, (sampleProgress) =>
      splitFrameAt(sampleProgress, playback.forward),
    );
    renderGoo(
      settings.goo *
        splitGooAt(playback.progress, playback.forward) *
        GOO_UNITS,
    );
  }

  /** Stacks shutter samples of any play, `playMs` long, around `progress` */
  function drawBlurred(
    progress: number,
    playMs: number,
    frameFor: (sampleProgress: number) => Frame,
  ) {
    const settings = settingsRef.current;
    const shutterProgress = ((settings.shutter / 360) * FRAME_MS) / playMs;

    if (shutterProgress <= 0) {
      renderLayer(0, frameFor(progress), 1);
      hideLayersAfter(1);
    } else {
      // Centred shutter: half the samples trail the frame, half lead it
      LAYERS.forEach((layerIndex) => {
        const offset =
          (layerIndex / (BLUR_SAMPLES - 1) - 0.5) * shutterProgress;
        const sampleProgress = Math.min(1, Math.max(0, progress + offset));
        renderLayer(layerIndex, frameFor(sampleProgress), SAMPLE_OPACITY);
      });
    }

    const velocity = frameFor(progress).velocity;
    renderSoften(settings.soften * velocity * SOFTEN_UNITS);
  }

  // Frame loop: advance the play, then write attributes straight to the svg
  // biome-ignore lint/correctness/useExhaustiveDependencies: the loop reads refs only and must run once
  React.useEffect(() => {
    let frameId = 0;
    let lastTime = performance.now();

    function tick(now: number) {
      const delta = Math.min(64, now - lastTime);
      lastTime = now;
      const playback = playbackRef.current;
      const settings = settingsRef.current;

      if (playback.playing) {
        const playMs = playMsFor(playback.kind, playback.forward);
        playback.progress += (delta * settings.speed) / playMs;
        if (playback.progress >= 1) {
          playback.playing = false;
          renderRest(currentRef.current);
          settle();
        } else {
          drawPlay(playback);
        }
      } else {
        renderRest(currentRef.current);
      }
      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Swell in on load. A layout effect, so it starts before the first paint
  // biome-ignore lint/correctness/useExhaustiveDependencies: startAppear only touches refs and stable setters
  React.useLayoutEffect(() => {
    startAppear();
  }, []);

  // Autoplay: walk the loop, holding on each stage once the icon lands there
  // biome-ignore lint/correctness/useExhaustiveDependencies: setTarget only touches refs and stable setters
  React.useEffect(() => {
    if (!autoplay) {
      return;
    }
    let loopIndex = 0;
    let landedAt: number | null = null;
    const interval = window.setInterval(() => {
      const landed =
        !playbackRef.current.playing &&
        currentRef.current === targetRef.current;
      if (!landed) {
        landedAt = null;
        return;
      }
      const now = performance.now();
      landedAt ??= now;
      const hold =
        AUTOPLAY_HOLD_MS[currentRef.current] / settingsRef.current.speed;
      if (now - landedAt >= hold) {
        landedAt = null;
        setTarget(AUTOPLAY_LOOP[loopIndex % AUTOPLAY_LOOP.length]);
        loopIndex++;
      }
    }, 50);
    return () => window.clearInterval(interval);
  }, [autoplay]);

  const pixelSize = 24 * size;

  return (
    <div ref={stageRef} data-slot="dot-morph" className="relative w-fit">
      <button
        type="button"
        aria-label={isMark ? labels.toDots : labels.toMark}
        aria-pressed={isMark}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            toggle();
          }
        }}
        onPointerEnter={(event) => {
          onPointerEnter?.(event);
          handlePointerHover(event, true);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          handlePointerHover(event, false);
        }}
        onFocus={(event) => {
          onFocus?.(event);
          // Keyboard parity with hover: focus splits the dot, blur walks it home
          if (
            !autoplay &&
            event.currentTarget.matches(":focus-visible") &&
            targetRef.current === "dot"
          ) {
            setTarget("dots");
          }
        }}
        onBlur={(event) => {
          onBlur?.(event);
          if (!autoplay) {
            setTarget("dot");
          }
        }}
        className={cn(
          "block cursor-pointer rounded-[48px] bg-transparent p-8 outline-none transition-[background-color] duration-200 ease-[ease] [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-current/40 hover:bg-[color-mix(in_oklab,currentColor_6%,transparent)] active:bg-[color-mix(in_oklab,currentColor_10%,transparent)] active:duration-[80ms]",
          autoplay && "hover:bg-transparent active:bg-transparent",
          className,
        )}
        {...props}
      >
        {/* Rendered at an integer multiple of the 24-unit viewBox so edges land on whole pixels */}
        <svg
          ref={svgRef}
          viewBox="0 0 24 24"
          width={pixelSize}
          height={pixelSize}
          className="block overflow-visible will-change-[filter]"
          aria-hidden="true"
        >
          <defs>
            <filter
              id={gooId}
              filterUnits="userSpaceOnUse"
              x={-6}
              y={-12}
              width={36}
              height={44}
            >
              <feGaussianBlur ref={gooBlurRef} stdDeviation={0} />
              <feColorMatrix type="matrix" values={GOO_MATRIX} />
            </filter>
          </defs>
          {/*
            Labs: the server renders the resting single dot (upstream hid the
            three source dots until the swell-in), so a page that is never
            hydrated still shows the icon. On mount the layout effect starts
            the swell-in before the first paint.
          */}
          <g ref={gooGroupRef}>
            <g>
              {LAYERS.map((layerIndex) => (
                <g
                  key={layerIndex}
                  ref={(element) => {
                    layerRefs.current[layerIndex] = element;
                  }}
                  display={layerIndex === 0 ? undefined : "none"}
                >
                  {DOT_PATHS.map((_, index) => (
                    <path
                      key={index}
                      ref={(element) => {
                        pieceRefs.current[layerIndex][index] = element;
                      }}
                      d={SINGLE_DOT_PATH}
                      fill="currentColor"
                    />
                  ))}
                  <circle
                    ref={(element) => {
                      coreRefs.current[layerIndex] = element;
                    }}
                    cx={CENTER}
                    cy={CENTER}
                    r={0}
                  />
                </g>
              ))}
            </g>
          </g>
        </svg>
      </button>
    </div>
  );
}

/**
 * Flex centering can leave an element on a fractional pixel, which blurs
 * crisp SVG strokes inside it. Nudge it onto the device pixel grid using a
 * layout offset (not a transform, which Chrome can rasterize off-grid), and
 * re-snap whenever the container changes size, e.g. on resize or after the
 * page font loads. The element needs `position: relative`.
 *
 * `key` re-runs the snap when it changes, e.g. after the element remounts.
 */
function usePixelSnap(ref: React.RefObject<HTMLElement | null>, key: unknown) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` intentionally re-runs the effect after a remount
  React.useEffect(() => {
    const element = ref.current;
    const container = element?.parentElement;
    if (!element || !container) {
      return;
    }

    function snapToPixelGrid() {
      if (!element) {
        return;
      }
      const dpr = window.devicePixelRatio || 1;
      element.style.top = "";
      element.style.left = "";
      const rect = element.getBoundingClientRect();
      const offsetX = Math.round(rect.left * dpr) / dpr - rect.left;
      const offsetY = Math.round(rect.top * dpr) / dpr - rect.top;
      element.style.left = `${offsetX}px`;
      element.style.top = `${offsetY}px`;
    }

    snapToPixelGrid();
    const observer = new ResizeObserver(snapToPixelGrid);
    observer.observe(container);
    observer.observe(element);
    document.fonts.ready.then(snapToPixelGrid);
    window.addEventListener("resize", snapToPixelGrid);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", snapToPixelGrid);
    };
  }, [ref, key]);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export { DotMorph, type DotMorphProps, type DotMorphStage };
