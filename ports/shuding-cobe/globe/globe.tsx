"use client";

import createGlobe, {
  type Arc,
  type COBEOptions,
  type Globe as CobeGlobe,
  type Marker,
} from "cobe";
import {
  type AnimationPlaybackControls,
  animate,
  type MotionValue,
  motionValue,
} from "motion";
import * as React from "react";

import { clampDpr, useRenderLoop } from "@/lib/render-loop";
import { cn } from "@/lib/utils";

/*
 * A React wrapper over COBE by Shu Ding (npm `cobe`, src/index.js at commit
 * 7e94076fa8c3): https://github.com/shuding/cobe. The globe, its dotted map,
 * markers, arcs and anchors are drawn by `cobe` itself; the defaults are the
 * code example on the COBE site.
 *
 * Copyright (c) 2021 Shu Ding. MIT License; the full notice ends this file.
 */

export type { Arc as GlobeArc, Marker as GlobeMarker } from "cobe";

/** Appearance options passed through to `cobe` (colors override the tokens). */
export type GlobeOptions = Partial<
  Pick<
    COBEOptions,
    | "diffuse"
    | "mapSamples"
    | "mapBrightness"
    | "mapBaseBrightness"
    | "baseColor"
    | "markerColor"
    | "glowColor"
    | "arcColor"
    | "arcWidth"
    | "arcHeight"
    | "markerElevation"
    | "dark"
    | "opacity"
    | "offset"
    | "scale"
  >
>;

type RGB = [number, number, number];

/** The COBE site's code example (light) and its dark playground preset. */
const DEFAULTS = {
  diffuse: 1.2,
  mapSamples: 16000,
  mapBrightness: 6,
  arcWidth: 0.5,
  arcHeight: 0.3,
} satisfies GlobeOptions;
const LIGHT = {
  base: [1, 1, 1] as RGB,
  marker: [0.2, 0.4, 1] as RGB,
  glow: [1, 1, 1] as RGB,
  arc: [0.3, 0.5, 1] as RGB,
};

/** Upstream's drag ratio: radians per CSS pixel. */
const DRAG = 1 / 300;
/** How far the tilt may move from `theta`, either way (upstream: 0.4). */
const TILT = 0.4;
/** One arrow key press: 15 degrees of longitude, 0.1 of tilt. */
const STEP_PHI = Math.PI / 12;
const STEP_THETA = 0.1;
const FOLLOW = { type: "spring", stiffness: 260, damping: 32 } as const;

/** The context `cobe` asks for (src/index.js); the loop creates it. */
const CONTEXT: WebGLContextAttributes = {
  alpha: true,
  stencil: false,
  antialias: true,
  depth: false,
  preserveDrawingBuffer: false,
};

// ---- tokens -----------------------------------------------------------------

let probe: CanvasRenderingContext2D | null | undefined;

/**
 * A CSS color as COBE's 0..1 RGB. `color(srgb r g b)`, `rgb()` and hex keep
 * full precision; any other color (oklch, a named color) is resolved by a 2D
 * canvas, to 8 bits.
 */
function toRGB(value: string, fallback: RGB): RGB {
  const text = value.trim();
  if (!text) {
    return fallback;
  }
  const srgb = /^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i.exec(text);
  if (srgb) {
    return [Number(srgb[1]), Number(srgb[2]), Number(srgb[3])];
  }
  const rgb = /^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)/i.exec(
    text,
  );
  if (rgb) {
    return [rgb[1], rgb[2], rgb[3]].map((part = "0") =>
      part.endsWith("%") ? Number.parseFloat(part) / 100 : Number(part) / 255,
    ) as RGB;
  }
  const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(text);
  if (hex?.[1]) {
    const digits =
      hex[1].length === 3
        ? hex[1].replace(/./g, (digit) => digit + digit)
        : hex[1];
    return [0, 2, 4].map(
      (index) => Number.parseInt(digits.slice(index, index + 2), 16) / 255,
    ) as RGB;
  }
  if (probe === undefined) {
    probe = document
      .createElement("canvas")
      .getContext("2d", { willReadFrequently: true });
  }
  if (!probe) {
    return fallback;
  }
  probe.fillStyle = "#010203";
  probe.fillStyle = text;
  if (probe.fillStyle === "#010203" && text !== "#010203") {
    return fallback;
  }
  probe.clearRect(0, 0, 1, 1);
  probe.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = probe.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

interface Palette {
  baseColor: RGB;
  markerColor: RGB;
  glowColor: RGB;
  arcColor: RGB;
  dark: number;
}

/** Reads `--globe-*` from the element, falling back to the light defaults. */
function readPalette(element: Element | null): Palette {
  const style = element ? getComputedStyle(element) : null;
  const read = (name: string) => style?.getPropertyValue(name) ?? "";
  const dark = Number.parseFloat(read("--globe-dark"));
  return {
    baseColor: toRGB(read("--globe-base"), LIGHT.base),
    markerColor: toRGB(read("--globe-marker"), LIGHT.marker),
    glowColor: toRGB(read("--globe-glow"), LIGHT.glow),
    arcColor: toRGB(read("--globe-arc"), LIGHT.arc),
    dark: Number.isFinite(dark) ? dark : 0,
  };
}

// ---- the static picture -------------------------------------------------------

const { PI, sin, cos, sqrt } = Math;

/** COBE's latLonTo3D: [latitude, longitude] in degrees to the unit sphere. */
function toSphere([lat, lon]: readonly [number, number]): RGB {
  const latRad = (lat * PI) / 180;
  const lonRad = (lon * PI) / 180 - PI;
  const cosLat = cos(latRad);
  return [-cosLat * cos(lonRad), sin(latRad), cosLat * sin(lonRad)];
}

/** COBE's applyRotation for a square box: [x, y] in 0..100 and depth. */
function project(p: RGB, phi: number, theta: number, scale: number) {
  const cx = cos(theta);
  const cy = cos(phi);
  const sx = sin(theta);
  const sy = sin(phi);
  const rx = cy * p[0] + sy * p[2];
  const ry = sy * sx * p[0] + cx * p[1] - cy * sx * p[2];
  const rz = -sy * cx * p[0] + sx * p[1] + cy * cx * p[2];
  return {
    x: ((rx * scale + 1) / 2) * 100,
    y: ((-ry * scale + 1) / 2) * 100,
    z: rz,
    visible: rz >= 0 || rx * rx + ry * ry >= 0.64,
  };
}

const round = (value: number) => Math.round(value * 10) / 10;
const BASE = "var(--globe-base, color(srgb 1 1 1))";
const DARK = "var(--globe-dark, 0)";
const GLOW = "var(--globe-glow, color(srgb 1 1 1))";
const MARKER = "var(--globe-marker, color(srgb 0.2 0.4 1))";
const ARC = "var(--globe-arc, color(srgb 0.3 0.5 1))";
/** The sphere: the base color, near black in the dark theme (as COBE shades it). */
const BODY = `color-mix(in srgb, ${BASE}, black calc(${DARK} * 90%))`;
/** Map dots: dark on a light globe, bright on a dark one. */
const DOT = `color-mix(in srgb, color-mix(in srgb, ${BASE} 15%, black), color-mix(in srgb, ${BASE}, white 70%) calc(${DARK} * 100%))`;

/**
 * An inline SVG of the globe at its starting angle: a dotted sphere (an even
 * Fibonacci lattice, without the land map), the glow, and the markers and
 * arcs where COBE would draw them. It is the server render, the wall tile and
 * the picture shown without WebGL 2 or under reduced motion.
 */
function GlobeFallback({
  phi,
  theta,
  markers,
  arcs,
  options,
}: {
  phi: number;
  theta: number;
  markers: readonly Marker[];
  arcs: readonly Arc[];
  options: GlobeOptions;
}) {
  const id = React.useId();
  const scale = options.scale ?? 1;
  const elevation = options.markerElevation ?? 0.05;
  const arcHeight = options.arcHeight ?? DEFAULTS.arcHeight;
  const arcWidth = options.arcWidth ?? DEFAULTS.arcWidth;
  const picture = React.useMemo(() => {
    // Map dots in three depth bands (fainter and smaller toward the edge).
    const bands = ["", "", ""];
    const count = 900;
    const golden = PI * (3 - sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (2 * (i + 0.5)) / count;
      const r = sqrt(1 - y * y);
      const a = i * golden;
      const p = project(
        [cos(a) * r * 0.8, y * 0.8, sin(a) * r * 0.8],
        phi,
        theta,
        scale,
      );
      // Dots crowd at the rim in projection; leave the outermost ring clear.
      if (p.z <= 0.15) {
        continue;
      }
      const band = p.z > 0.55 ? 0 : p.z > 0.32 ? 1 : 2;
      bands[band] += `M${round(p.x)} ${round(p.y)}h0`;
    }
    const lift = (location: readonly [number, number], radius: number) => {
      const p = toSphere(location);
      return [p[0] * radius, p[1] * radius, p[2] * radius] as RGB;
    };
    const dots = markers.flatMap((marker, index) => {
      const p = project(
        lift(marker.location, 0.8 + elevation),
        phi,
        theta,
        scale,
      );
      return p.visible
        ? [
            {
              key: marker.id ?? index,
              x: round(p.x),
              y: round(p.y),
              r: Math.max(25 * marker.size * scale, 0.4),
              color: marker.color,
            },
          ]
        : [];
    });
    // Arcs: COBE's quadratic Bezier from the lifted ends over the lifted midpoint.
    const lines = arcs.map((arc, index) => {
      const from = lift(arc.from, 0.8 + elevation);
      const to = lift(arc.to, 0.8 + elevation);
      const sum = toSphere(arc.from).map(
        (v, k) => v + (toSphere(arc.to)[k] ?? 0),
      ) as RGB;
      const length = Math.hypot(...sum) || 1;
      const lift2 = 0.8 + arcHeight + elevation;
      const mid = sum.map((v) => (v / length) * lift2) as RGB;
      let d = "";
      let drawing = false;
      for (let step = 0; step <= 24; step++) {
        const t = step / 24;
        const u = 1 - t;
        const point = [0, 1, 2].map(
          (k) =>
            u * u * (from[k] ?? 0) +
            2 * u * t * (mid[k] ?? 0) +
            t * t * (to[k] ?? 0),
        ) as RGB;
        const p = project(point, phi, theta, scale);
        if (p.visible) {
          d += `${drawing ? "L" : "M"}${round(p.x)} ${round(p.y)}`;
        }
        drawing = p.visible;
      }
      return { key: arc.id ?? index, d, color: arc.color };
    });
    return { bands, dots, lines };
  }, [phi, theta, scale, elevation, arcHeight, markers, arcs]);

  const rgb = (color?: readonly number[]) =>
    color
      ? `color(srgb ${color[0] ?? 0} ${color[1] ?? 0} ${color[2] ?? 0})`
      : undefined;
  const radius = 40 * scale;
  const halo = Math.min(radius * 1.25, 50);
  return (
    <svg
      viewBox="0 0 100 100"
      className="size-full overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop
            offset={`${(radius / halo) * 100}%`}
            style={{ stopColor: GLOW }}
            stopOpacity="0.9"
          />
          <stop offset="100%" style={{ stopColor: GLOW }} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-shade`}>
          <stop offset="0%" stopColor="black" stopOpacity="0" />
          <stop offset="70%" stopColor="black" stopOpacity="0.06" />
          <stop offset="88%" style={{ stopColor: GLOW }} stopOpacity="0" />
          <stop offset="100%" style={{ stopColor: GLOW }} stopOpacity="0.5" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r={halo} fill={`url(#${id}-glow)`} />
      <circle cx="50" cy="50" r={radius} style={{ fill: BODY }} />
      <circle cx="50" cy="50" r={radius} fill={`url(#${id}-shade)`} />
      <g fill="none" strokeLinecap="round" style={{ stroke: DOT }}>
        <path d={picture.bands[0]} strokeWidth={0.7 * scale} />
        <path
          d={picture.bands[1]}
          strokeWidth={0.6 * scale}
          strokeOpacity="0.65"
        />
        <path
          d={picture.bands[2]}
          strokeWidth={0.5 * scale}
          strokeOpacity="0.3"
        />
      </g>
      {picture.lines.map((line) => (
        <path
          key={line.key}
          d={line.d}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={arcWidth * 0.5 * scale}
          style={{ stroke: rgb(options.arcColor ?? line.color) ?? ARC }}
        />
      ))}
      {picture.dots.map((dot) => (
        <circle
          key={dot.key}
          cx={dot.x}
          cy={dot.y}
          r={dot.r}
          style={{ fill: rgb(dot.color ?? options.markerColor) ?? MARKER }}
        />
      ))}
    </svg>
  );
}

// ---- the WebGL globe ------------------------------------------------------------

interface GlobeHandle {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  globe: CobeGlobe;
  /** The pixel ratio `cobe` was created with (it cannot change it later). */
  dpr: number;
  /** The <div> `cobe` wrapped the canvas in (it also holds the anchors). */
  wrapper: HTMLElement;
  /** cobe's <style> of `--cobe-visible-*` variables. */
  style: HTMLStyleElement | null;
  image: HTMLImageElement | null;
  texture: WebGLTexture | null;
  /** The context was lost after this globe was made: its objects are gone. */
  stale: boolean;
  onLost: () => void;
  /** The last markers, arcs and arc shape handed to `cobe`. */
  sent: {
    markers: readonly Marker[];
    arcs: readonly Arc[];
    shape: string;
  };
}

export interface GlobeProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  /** Points on the globe: `{ location: [lat, lon], size, color?, id? }`. */
  markers?: readonly Marker[];
  /** Curves between two points: `{ from, to, color?, id? }`. */
  arcs?: readonly Arc[];
  /** Starting longitude rotation in radians. Default 0. */
  phi?: number;
  /** Tilt in radians. Default 0.2. */
  theta?: number;
  /** Auto-rotation in radians per second (0 stops it). Default 0.3. */
  speed?: number;
  /** Drag to spin (with momentum) and, when labelled, arrow keys. Default true. */
  interactive?: boolean;
  /** Names the globe for assistive technology; without it, it is decorative. */
  label?: string;
  /** Appearance passed to `cobe` (diffuse, mapSamples, scale, colors...). */
  options?: GlobeOptions;
  /** Device pixel ratio cap. Default 2. */
  maxDpr?: number;
  /** Replaces the static picture shown without WebGL 2 or under reduced motion. */
  fallback?: React.ReactNode;
  /** Laid over the globe: labels anchored to marker ids (`--cobe-<id>`). */
  children?: React.ReactNode;
}

const NO_MARKERS: readonly Marker[] = [];
const NO_ARCS: readonly Arc[] = [];

/**
 * A dotted WebGL globe with markers and arcs, drawn by COBE: it turns on its
 * own, spins with a spring and momentum when dragged, steps with the arrow
 * keys, takes its colors from `--globe-*` tokens, and shows a static SVG
 * globe without WebGL 2 or under reduced motion.
 */
export function Globe({
  markers = NO_MARKERS,
  arcs = NO_ARCS,
  phi = 0,
  theta = 0.2,
  speed = 0.3,
  interactive = true,
  label,
  options,
  maxDpr = 2,
  fallback,
  className,
  children,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onKeyDown,
  onFocus,
  onBlur,
  ...props
}: GlobeProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [textureReady, setTextureReady] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const hovered = React.useRef(false);
  const spin = React.useRef(0);
  const appearance = React.useMemo(
    () => ({ ...DEFAULTS, ...options }),
    [options],
  );

  // The user's rotation: targets set by drag and keys, and the values the
  // globe shows, which follow their targets with a spring.
  const [rotation] = React.useState(() => ({
    phiTarget: motionValue(0),
    thetaTarget: motionValue(0),
    phi: motionValue(0),
    theta: motionValue(0),
  }));

  const state = React.useRef({ markers, arcs, phi, theta, speed, appearance });
  state.current = { markers, arcs, phi, theta, speed, appearance };
  const rotating = speed !== 0 && !dragging && !focused;
  const invalidateRef = React.useRef<() => void>(() => {});

  const frameOptions = (palette: Palette) => {
    const s = state.current;
    const a = s.appearance;
    return {
      phi: s.phi + spin.current + rotation.phi.get(),
      theta: s.theta + rotation.theta.get(),
      baseColor: a.baseColor ?? palette.baseColor,
      markerColor: a.markerColor ?? palette.markerColor,
      glowColor: a.glowColor ?? palette.glowColor,
      arcColor: a.arcColor ?? palette.arcColor,
      dark: a.dark ?? palette.dark,
      diffuse: a.diffuse,
      mapSamples: a.mapSamples,
      mapBrightness: a.mapBrightness,
      mapBaseBrightness: a.mapBaseBrightness ?? 0,
      opacity: a.opacity ?? 1,
      offset: a.offset ?? [0, 0],
      scale: a.scale ?? 1,
      arcWidth: a.arcWidth,
      arcHeight: a.arcHeight,
      markerElevation: a.markerElevation ?? 0.05,
    } satisfies Partial<COBEOptions>;
  };
  const arcShape = (a: GlobeOptions) =>
    `${a.arcWidth}/${a.arcHeight}/${a.markerElevation ?? 0.05}`;

  /** Creates the `cobe` globe on the loop's canvas and context. */
  const mount = (
    canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    dpr: number,
  ): GlobeHandle => {
    const s = state.current;
    const parent = canvas.parentNode;
    const lastStyle = document.head.lastElementChild;
    // npm cobe 2.0.1 loads its land texture with `new Image()` but, unlike
    // upstream's later source, neither redraws once it arrives nor releases
    // it on destroy. Capture that image (only during this synchronous call)
    // to redraw, to keep the fallback up until the land shows, and to free it.
    let image: HTMLImageElement | null = null;
    const NativeImage = window.Image;
    window.Image = class extends NativeImage {
      constructor(width?: number, height?: number) {
        super(width, height);
        image = this;
      }
    };
    let globe: CobeGlobe;
    try {
      globe = createGlobe(canvas, {
        ...frameOptions(readPalette(rootRef.current)),
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        devicePixelRatio: dpr,
        markers: [...s.markers],
        arcs: [...s.arcs],
      } as COBEOptions);
    } finally {
      window.Image = NativeImage;
    }
    const wrapper = canvas.parentElement;
    if (!wrapper || wrapper === parent) {
      // cobe returns a no-op globe when its shaders do not compile.
      throw new Error("globe: cobe could not start");
    }
    // The first draw left cobe's texture bound to unit 0.
    const texture = gl.getParameter(
      gl.TEXTURE_BINDING_2D,
    ) as WebGLTexture | null;
    // Upstream's later source rewrites its anchor <style> only on change;
    // 2.0.1 rewrites it every frame, which restyles the whole page.
    const last = document.head.lastElementChild;
    const style =
      last instanceof HTMLStyleElement && last !== lastStyle ? last : null;
    if (style) {
      const text = Object.getOwnPropertyDescriptor(
        Node.prototype,
        "textContent",
      );
      if (text?.get && text.set) {
        const { get, set } = text;
        Object.defineProperty(style, "textContent", {
          configurable: true,
          get() {
            return get.call(this);
          },
          set(value: string) {
            if (value !== get.call(this)) {
              set.call(this, value);
            }
          },
        });
      }
    }
    const handle: GlobeHandle = {
      canvas,
      gl,
      globe,
      dpr,
      wrapper,
      style,
      image,
      texture,
      stale: false,
      onLost: () => {
        handle.stale = true;
      },
      sent: { markers: s.markers, arcs: s.arcs, shape: arcShape(s.appearance) },
    };
    canvas.addEventListener("webglcontextlost", handle.onLost);
    const loaded = image as HTMLImageElement | null;
    if (loaded) {
      loaded.addEventListener("load", () => {
        // Disposing clears cobe's own handler first: then this globe is gone.
        if (loaded.onload) {
          setTextureReady(true);
          invalidateRef.current();
        }
      });
    }
    return handle;
  };

  /** Destroys the globe and puts the canvas back where React rendered it. */
  const unmount = (handle: GlobeHandle) => {
    if (handle.image) {
      handle.image.onload = null;
      handle.image = null;
    }
    const { canvas, gl, wrapper } = handle;
    canvas.removeEventListener("webglcontextlost", handle.onLost);
    if (handle.stale) {
      // A lost context took cobe's objects with it; only its DOM is left
      // (the anchors go with the wrapper below).
      handle.style?.remove();
    } else {
      handle.globe.destroy();
      if (handle.texture) {
        gl.deleteTexture(handle.texture);
      }
      // cobe leaves its vertex attributes enabled; the next globe on this
      // context (StrictMode, a new pixel ratio) must not draw with them.
      const attributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number;
      for (let index = 0; index < attributes; index++) {
        gl.disableVertexAttribArray(index);
        gl.vertexAttribDivisor(index, 0);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    if (wrapper.parentNode && canvas.parentNode === wrapper) {
      wrapper.parentNode.insertBefore(canvas, wrapper);
    }
    wrapper.remove();
  };

  const loop = useRenderLoop<GlobeHandle>(canvasRef, {
    context: "webgl2",
    contextAttributes: CONTEXT,
    maxDpr,
    continuous: rotating,
    setup: (canvas, context) => {
      setTextureReady(false);
      return mount(canvas, context as WebGL2RenderingContext, clampDpr(maxDpr));
    },
    dispose: unmount,
    // cobe sizes the buffer itself (CSS size times the pixel ratio it was
    // created with), so a new ratio needs a new globe.
    resize: (handle, size) => {
      if (size.dpr !== handle.dpr) {
        unmount(handle);
        setTextureReady(false);
        Object.assign(handle, mount(handle.canvas, handle.gl, size.dpr));
        return;
      }
      handle.globe.update({ width: size.width, height: size.height });
    },
    render: (handle, frame) => {
      const s = state.current;
      const paused = rootRef.current?.closest("[data-loop-paused]");
      if (!paused) {
        spin.current += s.speed * frame.delta * (hovered.current ? 0.8 : 1);
      }
      const next: Partial<COBEOptions> = frameOptions(
        readPalette(rootRef.current),
      );
      const shape = arcShape(s.appearance);
      if (shape !== handle.sent.shape) {
        // cobe bakes the arc shape into its buffers when it receives arcs.
        handle.globe.update({
          arcWidth: next.arcWidth,
          arcHeight: next.arcHeight,
          markerElevation: next.markerElevation,
        });
      }
      if (s.markers !== handle.sent.markers) {
        next.markers = [...s.markers];
      }
      if (s.arcs !== handle.sent.arcs || shape !== handle.sent.shape) {
        next.arcs = [...s.arcs];
      }
      handle.sent = { markers: s.markers, arcs: s.arcs, shape };
      handle.globe.update(next);
    },
  });
  invalidateRef.current = loop.invalidate;
  const { status, invalidate } = loop;

  // Redraw when a prop changes or rotation resumes.
  React.useEffect(() => {
    invalidate();
  });

  // The shown rotation follows its target with a spring; every change draws.
  React.useEffect(() => {
    let phiAnimation: AnimationPlaybackControls | undefined;
    let thetaAnimation: AnimationPlaybackControls | undefined;
    const follow = (
      value: MotionValue<number>,
      target: number,
      current?: AnimationPlaybackControls,
    ) => {
      current?.stop();
      return animate(value, target, {
        ...FOLLOW,
        velocity: value.getVelocity(),
      });
    };
    const off = [
      rotation.phiTarget.on("change", (target) => {
        phiAnimation = follow(rotation.phi, target, phiAnimation);
      }),
      rotation.thetaTarget.on("change", (target) => {
        thetaAnimation = follow(rotation.theta, target, thetaAnimation);
      }),
      rotation.phi.on("change", () => invalidate()),
      rotation.theta.on("change", () => invalidate()),
    ];
    return () => {
      for (const unsubscribe of off) {
        unsubscribe();
      }
      phiAnimation?.stop();
      thetaAnimation?.stop();
    };
  }, [rotation, invalidate]);

  // A theme switch changes the tokens; draw again when it happens.
  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const observer = new MutationObserver(() => invalidate());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });
    media.addEventListener("change", invalidate);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", invalidate);
    };
  }, [invalidate]);

  const live = interactive && status === "ready";
  const momentum = React.useRef<AnimationPlaybackControls[]>([]);
  const stopMomentum = () => {
    for (const controls of momentum.current) {
      controls.stop();
    }
    momentum.current = [];
  };
  React.useEffect(
    () => () => {
      for (const controls of momentum.current) {
        controls.stop();
      }
    },
    [],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event);
    if (!live || event.defaultPrevented || event.button !== 0) {
      return;
    }
    stopMomentum();
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    const start = {
      x: event.clientX,
      y: event.clientY,
      phi: rotation.phiTarget.get(),
      theta: rotation.thetaTarget.get(),
    };
    setDragging(true);
    const move = (e: PointerEvent) => {
      rotation.phiTarget.set(start.phi + (e.clientX - start.x) * DRAG);
      const tilt = start.theta + (e.clientY - start.y) * DRAG;
      // Past the tilt limit the globe resists (a rubber band).
      const limit = Math.max(-TILT, Math.min(TILT, tilt));
      rotation.thetaTarget.set(limit + (tilt - limit) * 0.3);
    };
    const end = () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", end);
      element.removeEventListener("pointercancel", end);
      setDragging(false);
      // Momentum: keep spinning with the release velocity, then settle; the
      // tilt springs back inside its limits.
      momentum.current = [
        animate(rotation.phiTarget, rotation.phiTarget.get(), {
          type: "inertia",
          velocity: rotation.phiTarget.getVelocity(),
          power: 0.35,
          timeConstant: 500,
        }),
        animate(rotation.thetaTarget, rotation.thetaTarget.get(), {
          type: "inertia",
          velocity: rotation.thetaTarget.getVelocity(),
          power: 0.2,
          timeConstant: 400,
          min: -TILT,
          max: TILT,
          bounceStiffness: 300,
          bounceDamping: 30,
        }),
      ];
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", end);
    element.addEventListener("pointercancel", end);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (!live || event.defaultPrevented) {
      return;
    }
    // Physical directions, as a drag (in right-to-left pages too).
    const { phiTarget, thetaTarget } = rotation;
    const tilt = (value: number) => Math.max(-TILT, Math.min(TILT, value));
    if (event.key === "ArrowRight") {
      phiTarget.set(phiTarget.get() + STEP_PHI);
    } else if (event.key === "ArrowLeft") {
      phiTarget.set(phiTarget.get() - STEP_PHI);
    } else if (event.key === "ArrowDown") {
      thetaTarget.set(tilt(thetaTarget.get() + STEP_THETA));
    } else if (event.key === "ArrowUp") {
      thetaTarget.set(tilt(thetaTarget.get() - STEP_THETA));
    } else if (event.key === "Home") {
      // Back to the starting view, the short way round.
      const turn = 2 * PI;
      const offset = spin.current + phiTarget.get();
      const wrapped = ((((offset + PI) % turn) + turn) % turn) - PI;
      phiTarget.set(phiTarget.get() - wrapped);
      thetaTarget.set(0);
    } else {
      return;
    }
    event.preventDefault();
    stopMomentum();
  };

  const ready = status === "ready" && textureReady;
  // Keep a lost canvas laid out: hidden, it would leave the viewport for the
  // loop's IntersectionObserver, and the restored context would never draw.
  const showCanvas = status !== "unsupported" && status !== "reduced-motion";
  const named = Boolean(label || props["aria-labelledby"]);
  const keyboard = live && named;
  return (
    <div
      ref={rootRef}
      data-slot="globe"
      data-status={status}
      data-dragging={dragging ? "" : undefined}
      role="img"
      aria-label={label}
      aria-hidden={named ? undefined : true}
      tabIndex={keyboard ? 0 : undefined}
      className={cn(
        "relative isolate aspect-square w-full select-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        live && "cursor-grab touch-pan-y data-[dragging]:cursor-grabbing",
        className,
      )}
      onPointerDown={handlePointerDown}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        hovered.current = true;
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        hovered.current = false;
      }}
      onKeyDown={handleKeyDown}
      onFocus={(event) => {
        onFocus?.(event);
        // Rotation pauses while the globe has keyboard focus.
        if (event.target === event.currentTarget) setFocused(true);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        if (event.target === event.currentTarget) setFocused(false);
      }}
      {...props}
    >
      {/* cobe wraps the canvas in its own <div>; this layer keeps that wrapper
          away from React's other children. */}
      <div className="absolute inset-0">
        <canvas
          ref={canvasRef}
          data-slot="globe-canvas"
          className={cn("block size-full", !showCanvas && "hidden")}
        />
      </div>
      <div
        data-slot="globe-fallback"
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none",
          ready && "opacity-0",
        )}
      >
        {fallback ?? (
          <GlobeFallback
            phi={phi}
            theta={theta}
            markers={markers}
            arcs={arcs}
            options={appearance}
          />
        )}
      </div>
      {children}
    </div>
  );
}
