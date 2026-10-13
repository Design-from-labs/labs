"use client";

import * as React from "react";
import { type RenderLoopStatus, useRenderLoop } from "@/lib/render-loop";
import { cn } from "@/lib/utils";
import {
  type Cycle,
  type CycleEvent,
  createCycle,
  createInstance,
  createReveal,
  destroyInstance,
  effectiveCellSize,
  type Instance,
  isSharedContextLost,
  pickRandomImage,
  type RevealState,
  renderInstanceOnce,
  type SampledPalette,
  samplePaletteFromCanvas,
  setInstanceCardBg,
  setInstanceColors,
  setInstancePaused,
  setInstancePixelScale,
  setInstancePreset,
  setInstanceSpeed,
  setInstanceStrength,
  setSharedFragmentShader,
  subscribeSharedContext,
  tickInstance,
  updateInstanceSize,
} from "./image-fx-engine";
import {
  PRESETS,
  type PresetMode,
  type PresetName,
  parseCssColor,
} from "./image-fx-presets";

/*
 * Ported from Jakubantalik/Libraries.dev, packages/img-fx
 * (src/ImageGeneration.tsx, src/types.ts, src/styles.ts and src/index.ts), at
 * commit bcaf88f8a16a: https://github.com/Jakubantalik/Libraries.dev.
 *
 * Copyright (c) 2026 Jakub Antalik. MIT License.
 *
 * Changes from upstream (listed in docs/evidence/ports/image-fx/fidelity.md):
 * the shared renderer is driven by `useRenderLoop` (decision 0021) instead
 * of its own requestAnimationFrame loop; a static mosaic replaces the canvas
 * under reduced motion, without WebGL 2, while the WebGL context is lost and
 * before the first frame; the injected stylesheet is replaced by utility
 * classes; `theme="auto"` resolves after hydration.
 */

// Power-user surface: the engine primitives, as upstream's index exported
// them, so the renderer and reveal pipeline can run without React.
export {
  type CreateInstanceOptions,
  type CreateRevealOptions,
  type Cycle,
  type CycleEvent,
  type CycleOptions,
  type CyclePhase,
  createCycle,
  createInstance,
  createReveal,
  destroyInstance,
  type EaseFn,
  ease,
  effectiveCardBg,
  getFrameRate,
  getMaxDpr,
  type Instance,
  loadImage,
  pickRandomImage,
  type RevealStartOptions,
  type RevealState,
  type SampledPalette,
  samplePaletteFromCanvas,
  setFrameRate,
  setInstanceCardBg,
  setInstanceColors,
  setInstancePaused,
  setInstancePreset,
  setInstanceStrength,
  setInstanceVisible,
  setMaxDpr,
  setSharedFragmentShader,
  tickInstance,
  updateInstanceSize,
} from "./image-fx-engine";
export {
  type EasingKey,
  hexToRgb,
  type MaskShape,
  type MosaicConfig,
  PRESETS,
  type Preset,
  type PresetMode,
  type PresetName,
  type PresetTheme,
  parseCssColor,
  type RevealConfig,
} from "./image-fx-presets";
export { FRAG_SRC as IMAGE_FRAGMENT_SHADER } from "./image-fx-shaders";

/**
 * Theme mode for the img-fx effect.
 *
 * - `auto` (default): walks a small priority chain and updates live on any
 *   change:
 *     1. `<html data-theme="dark|light">`             — shadcn / SSR apps
 *     2. `<html class="dark">` / `class="light">`     — Tailwind v3 darkMode
 *     3. `<html style="color-scheme: dark|light">`    — CSS-only toggles
 *     4. `matchMedia('(prefers-color-scheme: dark)')` — OS preference
 *     5. `'dark'` fallback (SSR-safe; re-resolves on hydration)
 *   A MutationObserver on `<html>` re-resolves whenever class / style /
 *   data-theme changes, so JS theme toggles propagate without a remount.
 * - `dark` / `light`: pin to a specific mode regardless of system / app
 *   preference.
 */
export type ImageFxTheme = "auto" | "dark" | "light";

/** Bundled preset names. Each preset ships both a dark and light tunings block. */
export type ImageFxPreset = PresetName;

/** Phase event emitted by the auto-reveal scheduler. */
export type ImageFxCycleEvent = CycleEvent;

/**
 * Imperative handle exposed via `ref` on `<ImageFx>`. Lets callers trigger a
 * single reveal from a button click or other user action without enabling
 * `autoReveal`.
 *
 * The wrapper element itself is also reachable via `handle.element`.
 *
 * Without the animated effect (reduced motion, no WebGL 2), the handle still
 * works: the image appears and disappears without animation.
 */
export interface ImageFxHandle {
  /** The wrapper `<div>` element. */
  element: HTMLDivElement | null;
  /**
   * Run a reveal pass now.
   *
   * - No-op if a reveal is already in progress (currently revealing, holding
   *   the image visible, or fading back to the shader).
   * - `hold: 'auto'` (default) — runs reveal -> hold (`revealHoldMs`) -> hide
   *   automatically, mirroring the auto-loop's pass.
   * - `hold: 'manual'` — runs reveal then stays in the visible phase until
   *   `triggerHide()` is called. Use this for "Reveal / Hide" toggle buttons.
   *
   * Requires a non-empty `images` prop; otherwise it's a silent no-op.
   */
  triggerReveal: (opts?: { hold?: "auto" | "manual" }) => void;
  /**
   * Manually trigger the hide fade if an image is currently revealed (in
   * `reveal` or `visible` phase). No-op otherwise.
   */
  triggerHide: () => void;
  /**
   * Regenerate the currently revealed image in place: the image breaks into
   * the effect's pixel-cell grid, the cells churn (pop in/out with the
   * preset's flicker clock) while the shader plays through the gaps, and
   * after `durationMs` the next image from the pool dissolves in over the
   * churn (held like `triggerReveal({ hold: 'manual' })`).
   *
   * By default the effect is also recolored from the outgoing image — its
   * palette is sampled from the visible pixels and mapped onto the preset's
   * palette slots by luminance rank, so the churn reads as pixelation born
   * from that image rather than the preset's stock colors. The preset
   * palette (or the `colors` prop, when set) is restored automatically once
   * the new image is fully visible.
   *
   * The churn always runs on a pixel-mosaic preset (`pixels-mechanic` /
   * `pixels-organic`). When the active preset is `sweep-gradient`, the effect
   * temporarily switches to a randomly-picked pixel preset for the churn and
   * restores the authored preset once the new image is fully visible.
   *
   * Options:
   * - `durationMs` — churn length before the next image auto-reveals.
   *   @default 4000
   * - `tintFromImage` — recolor the effect from the outgoing image.
   *   @default true
   * - `autoReveal` — set to `false` to churn indefinitely instead; end it
   *   manually with `triggerReveal()` (next image dissolves in over the
   *   churn) or `triggerHide()`.
   *   @default true
   *
   * No-op unless an image is currently revealed (`reveal` or `visible`
   * phase). Emits an `idle` cycle event when the churn starts.
   */
  triggerRegenerate: (opts?: {
    durationMs?: number;
    tintFromImage?: boolean;
    autoReveal?: boolean;
  }) => void;
  /**
   * Returns true while an image is showing on top of the shader (any of the
   * `reveal`, `visible`, or `hide` phases). Useful for driving the label /
   * icon of a Reveal/Hide toggle button.
   */
  isImageActive: () => boolean;
}

export interface ImageFxProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The imperative handle (see `ImageFxHandle`). */
  ref?: React.Ref<ImageFxHandle>;
  /**
   * Single host element to wrap. The wrapper sizes itself to the child; the
   * shader paints inside the wrapper at full size, clipped to the child's
   * border-radius. Optional: size the wrapper with `className` instead.
   */
  children?: React.ReactNode;

  /**
   * Selects which bundled preset to render.
   *
   * - `pixels-organic` - Chromium Flow rendered as a pixel mosaic.
   * - `pixels-mechanic`- Nebula rendered as a pixel mosaic.
   * - `sweep-gradient` - Gradient Sweep rendered as a pixel mosaic.
   *
   * @default 'pixels-organic'
   */
  preset?: ImageFxPreset;

  /**
   * Theme mode. `'auto'` resolves via `matchMedia('(prefers-color-scheme: dark)')`
   * and switches live when the OS theme changes.
   * @default 'auto'
   */
  theme?: ImageFxTheme;

  /**
   * Effect strength (0..2). In 0..1 it multiplies the shader canvas opacity
   * (the shader keeps animating at full intensity; only the rendered alpha
   * is scaled down) — exactly the historical behavior. Above 1 the canvas
   * stays fully opaque and the shader's palette intensity is boosted
   * instead, making the effect markedly more prominent.
   * @default 1
   */
  strength?: number;

  /**
   * Animation speed multiplier on top of the preset's baked tempo. Scales
   * the effect's whole clock — drift, churn and flicker together — so the
   * character of the motion is preserved. `1` (default) is the preset
   * tempo; `0.5` half speed, `2` double.
   */
  speed?: number;

  /**
   * Pixel-cell size multiplier for the mosaic effect. Scales the on-screen
   * size of each pixel cell (and the matching reveal dissolve) without
   * touching the preset:
   *
   *   - `1` (default) — the preset's authored cell size.
   *   - `0.5` — cells at half size (finer grid, effect reads as "zoomed out").
   *   - `2` — cells at double size (chunkier grid, "zoomed in").
   *
   * Implemented by dividing the shader grid's base cell count by this value,
   * so the shader mosaic and the reveal pixel dissolve stay in lockstep. The
   * grid always keeps a floor of 2 cells, so extreme values are safe.
   * @default 1
   */
  pixelScale?: number;

  /**
   * Card background colour. Accepts any CSS colour string the browser can
   * parse — hex (`#rgb` / `#rrggbb` / `#rrggbbaa`), `rgb()` / `rgba()`,
   * `hsl()` / `hsla()`, named colours, modern `color(...)` syntax — and is
   * applied two ways:
   *
   *   1. Verbatim as the wrapper element's CSS `background`, so the
   *      original alpha is preserved visually.
   *   2. Parsed to an opaque RGB triple for the shader's `u_cardBg`
   *      uniform, which drives colour-proximity / contrast logic so any
   *      shader colours that match the card background get faded out and
   *      the effect stays visually balanced.
   *
   * Alpha is intentionally dropped when feeding the shader — the renderer
   * has no source for what's behind a translucent card and can't composite
   * correctly. If precise shader behaviour matters under a translucent
   * surface, pass the opaque colour you want the shader to reason against.
   *
   * Useful for keeping colours in sync when the host card surface changes
   * (e.g. dark-mode card swatch). When omitted, the preset's bundled
   * `cardBg` (always opaque hex) is used.
   */
  cardBg?: string;

  /**
   * Optional palette override for the running effect (up to 7 CSS colors,
   * one per shader palette slot). A slot with a value replaces the preset
   * color verbatim; `null` / `undefined` slots keep the preset color. Pass
   * `undefined` (or omit) to use the preset palette.
   *
   * Useful for re-tinting the effect from external data — e.g. colors
   * sampled from the image being regenerated — while keeping the exact same
   * animation and cell grid.
   */
  colors?: (string | null | undefined)[];

  /**
   * Image pool used by the reveal animation. Pass a single string to reveal
   * the same image every cycle, or an array for random pick (never
   * repeating the previous index).
   * @default []
   */
  images?: string | string[];

  /**
   * When true, runs the auto-reveal scheduler:
   *   shader (random delay) -> reveal -> hold -> hide -> repeat.
   * @default false
   */
  autoReveal?: boolean;

  /**
   * Random shader-only delay range in seconds between reveals.
   * @default [2, 4]
   */
  revealDelayRange?: [number, number];

  /**
   * One-time delay applied before the very first reveal (after `autoReveal`
   * is enabled or `triggerReveal` runs the first cycle). Subsequent reveals
   * follow `revealDelayRange`.
   *
   * - `number`: exact seconds.
   * - `[min, max]`: seconds range, randomised once at cycle creation.
   * - `undefined` (default): library picks a small jitter (0-1.5 s) so
   *   multiple instances on the same page don't tick in lockstep.
   *
   * Useful for staggering hero cards (e.g. card #2 = `[1, 3]`, card #3 =
   * `[1, 3]`) so they don't all reveal at once.
   */
  revealInitialDelay?: number | [number, number];

  /**
   * Time the image stays fully visible after the reveal animation completes,
   * before the hide cross-fade kicks in.
   *
   * - `number` — fixed milliseconds.
   * - `[min, max]` — random milliseconds per cycle, picked fresh each reveal.
   *
   * @default 2000
   */
  revealHoldMs?: number | [number, number];

  /** ms cross-fade back to the shader. @default 300 */
  revealFadeOutMs?: number;

  /**
   * Optional explicit corner radius (CSS px). When omitted, reads the
   * computed `border-radius` of the wrapped child each resize.
   */
  borderRadius?: number;

  /** Freezes the shader and the auto-reveal scheduler. @default false */
  paused?: boolean;

  /**
   * Escape hatch: a replacement fragment shader (GLSL 1.00 syntax, as the
   * bundled one — `gl_FragColor`, `texture2D`). Every uniform the engine
   * uploads keeps its name; the shader is free to interpret them however it
   * likes. The material is shared, so this applies page-wide while set.
   */
  fragmentShader?: string;

  /** Phase event hook for the auto-reveal cycle. */
  onCycle?: (event: ImageFxCycleEvent) => void;

  /**
   * Optional callback invoked just before each image pick that returns a list
   * of src strings the cycle MUST avoid this round. Use this to coordinate
   * multiple `<ImageFx>` instances that share an image pool so they never
   * display the same image at the same time.
   *
   * The callback runs on every pick (including manual `triggerReveal()`) so
   * it can read live state. If every candidate is excluded, the cycle falls
   * back to a normal random pick so it never gets stuck.
   */
  excludeSrcs?: () => string[] | Set<string> | null | undefined;

  /**
   * Replaces the static mosaic shown under reduced motion, without WebGL 2,
   * while the WebGL context is lost and before the first frame.
   */
  fallback?: React.ReactNode;

  /** Reports the render loop's status (pending, ready, unsupported...). */
  onStatusChange?: (status: RenderLoopStatus) => void;

  /**
   * Labs: run the effect on a software WebGL renderer too. Off by default:
   * the shader costs seconds per frame without a GPU (measured: a 24 s first
   * frame and a long task per frame in software Chromium), so the static
   * picture shows instead.
   */
  allowSoftwareRenderer?: boolean;
}

/** Renderer names of software WebGL implementations (no GPU). */
const SOFTWARE_RENDERER =
  /swiftshader|llvmpipe|softpipe|software|basic render/i;
let softwareRenderer: boolean | undefined;

/**
 * Labs: whether this browser's WebGL 2 runs without a GPU. Read once from a
 * throwaway context; browsers that mask the renderer name count as hardware.
 */
function isSoftwareRenderer(): boolean {
  if (softwareRenderer !== undefined) return softwareRenderer;
  softwareRenderer = false;
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (gl) {
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      const name = String(
        gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
      );
      softwareRenderer = SOFTWARE_RENDERER.test(name);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    softwareRenderer = false;
  }
  return softwareRenderer;
}

/**
 * Resolve `'auto'` to a concrete `'dark' | 'light'` value, checking sources in
 * priority order so the library plays nicely with the most common app-side
 * theme conventions (not just the OS-level media query):
 *
 *   1. `<html data-theme="dark|light">`          — shadcn / many SSR apps
 *   2. `<html class="dark">` / `class="light">`  — Tailwind v3 darkMode: class
 *   3. `<html style="color-scheme: dark">`       — CSS-only theme toggles
 *   4. `matchMedia('(prefers-color-scheme: dark)')` — OS / browser preference
 *   5. Default `'dark'`                          — SSR-safe fallback
 *
 * Live updates: subscribed to both the matchMedia change event AND a
 * MutationObserver on `<html>` for `class` / `style` / `data-theme` changes,
 * so toggling a theme-class via JS reflects in the shader without remount.
 */
function detectTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  const html = document.documentElement;

  const dataTheme = html.getAttribute("data-theme");
  if (dataTheme === "dark" || dataTheme === "light") return dataTheme;

  if (html.classList.contains("dark")) return "dark";
  if (html.classList.contains("light")) return "light";

  const colorScheme =
    html.style.colorScheme || getComputedStyle(html).colorScheme;
  if (colorScheme === "dark") return "dark";
  if (colorScheme === "light") return "light";

  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "dark";
}

/**
 * The resolved theme, or null while `auto` is unresolved (the server render
 * and the hydrating render, so both match; upstream read the document during
 * the first render).
 */
function useResolvedTheme(theme: ImageFxTheme): "dark" | "light" | null {
  const [resolved, setResolved] = React.useState<"dark" | "light" | null>(
    theme === "auto" ? null : theme,
  );

  React.useEffect(() => {
    if (theme !== "auto") {
      setResolved(theme);
      return;
    }
    if (typeof window === "undefined") return;

    const update = (): void => setResolved(detectTheme());
    update();

    const mql = window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
    mql?.addEventListener("change", update);

    let mo: MutationObserver | null = null;
    if (
      typeof document !== "undefined" &&
      typeof MutationObserver !== "undefined"
    ) {
      mo = new MutationObserver(update);
      mo.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "style", "data-theme"],
      });
    }

    return () => {
      mql?.removeEventListener("change", update);
      mo?.disconnect();
    };
  }, [theme]);

  return theme === "auto" ? resolved : theme;
}

function normaliseImages(input: string | string[] | undefined): string[] {
  if (!input) return [];
  if (typeof input === "string") return [input];
  return input.slice();
}

/** The regenerate churn always runs on one of these pixel-mosaic presets. */
const PIXEL_CHURN_PRESETS = ["pixels-mechanic", "pixels-organic"] as const;

type PixelChurnPreset = (typeof PIXEL_CHURN_PRESETS)[number];

function isPixelChurnPreset(name: ImageFxPreset): name is PixelChurnPreset {
  return (PIXEL_CHURN_PRESETS as readonly string[]).includes(name);
}

/** Cells along one side of the fallback's repeating tile. */
const TILE = 12;
const sameColor = (a: string, b: string) =>
  parseCssColor(a).every((v, i) => Math.abs(v - parseCssColor(b)[i]) < 0.004);

/**
 * The static picture: the preset's pixel mosaic, frozen. Cells follow a
 * smooth, tiling wave through the preset palette (lightest cells on the
 * crests), sized like the shader's cells, with the shader's soft edge fade.
 */
function MosaicFallback({
  mode,
  cardBg,
  colors,
  pixelScale,
  className,
}: {
  mode: PresetMode;
  cardBg: string;
  colors?: (string | null | undefined)[];
  pixelScale: number;
  className?: string;
}) {
  const id = React.useId();
  const cells = React.useMemo(() => {
    const palette = mode.colors
      .map((c, i) => colors?.[i] ?? c)
      .filter((c) => !sameColor(c, mode.cardBg) && !sameColor(c, cardBg));
    const [br, bg, bb] = parseCssColor(cardBg);
    const bgLum = 0.299 * br + 0.587 * bg + 0.114 * bb;
    // Order by contrast with the card, so wave crests get the strongest tone.
    const ranked = palette
      .map((c) => {
        const [r, g, b] = parseCssColor(c);
        return { c, d: Math.abs(0.299 * r + 0.587 * g + 0.114 * b - bgLum) };
      })
      .sort((a, b) => a.d - b.d);
    // The rarest, strongest highlight tone is left out of a still picture.
    const tones = ranked.length > 2 ? ranked.slice(0, -1) : ranked;
    if (tones.length === 0) return [];
    const out: { x: number; y: number; c: string; o: number }[] = [];
    const tau = Math.PI * 2;
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const v =
          0.5 +
          0.22 * Math.sin((tau * x) / TILE) +
          0.18 * Math.cos((tau * (x + 2 * y)) / TILE) +
          0.1 * Math.sin((tau * 3 * y) / TILE);
        const t = Math.min(0.999, Math.max(0, v));
        // Mostly quiet tones, stronger ones only on the wave crests.
        const pick = tones[Math.floor(t * t * tones.length)];
        // Dark presets draw the mosaic at their fill opacity, faded for tones
        // close to the card (the shader's smoothstep over 0.33). Light
        // palettes sit within a few percent of the card, and their highlight
        // lifts them, so a still shows them nearly opaque.
        const k = Math.min(1, pick.d / 0.33);
        const base =
          mode.theme === "light"
            ? 0.9
            : mode.pixelConfig.fillOpacity * Math.max(0.5, k * k * (3 - 2 * k));
        const o = base * (0.5 + 0.5 * t);
        out.push({ x, y, c: pick.c, o: Math.round(o * 100) / 100 });
      }
    }
    return out;
  }, [mode, cardBg, colors]);
  const cell =
    320 / (6 + effectiveCellSize(mode.pixelConfig.cellSize, pixelScale) * 74);
  // Cells are drawn in cell units (the pattern's viewBox), gap included.
  const gap = mode.pixelConfig.gap;
  const side = Math.round((1 - gap) * 1000) / 1000;
  const offset = Math.round((gap / 2) * 1000) / 1000;
  const tile = Math.round(cell * TILE * 100) / 100;
  const fade = `${mode.pixelConfig.edgeFade}px`;
  const mask = `linear-gradient(to right, transparent, #000 ${fade}, #000 calc(100% - ${fade}), transparent), linear-gradient(to bottom, transparent, #000 ${fade}, #000 calc(100% - ${fade}), transparent)`;
  return (
    <div
      className={cn("absolute inset-0", className)}
      style={{ background: cardBg }}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 size-full"
        style={{
          maskImage: mask,
          WebkitMaskImage: mask,
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
        }}
      >
        <defs>
          <pattern
            id={id}
            width={tile}
            height={tile}
            viewBox={`0 0 ${TILE} ${TILE}`}
            patternUnits="userSpaceOnUse"
          >
            {cells.map((c) => (
              <rect
                key={`${c.x}-${c.y}`}
                x={c.x + offset}
                y={c.y + offset}
                width={side}
                height={side}
                fill={c.c}
                fillOpacity={c.o}
              />
            ))}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    </div>
  );
}

interface LoopHandle {
  inst: Instance;
  reveal: RevealState;
  cycle: Cycle;
  ticked: boolean;
}

/**
 * Animated WebGL "image generation / loader" effect. Wrap a card and it gets
 * a real-time shader-driven loading mosaic that reveals an image from a pool
 * you provide, on a loop (`autoReveal`) or on demand through the `ref`
 * handle.
 */
export function ImageFx({
  ref: forwardedRef,
  children,
  preset = "pixels-organic",
  theme = "auto",
  strength = 1,
  speed = 1,
  pixelScale = 1,
  cardBg: cardBgProp,
  colors,
  images,
  autoReveal = false,
  revealDelayRange = [2, 4],
  revealInitialDelay,
  revealHoldMs = 2000,
  revealFadeOutMs = 300,
  borderRadius,
  paused = false,
  fragmentShader,
  onCycle,
  excludeSrcs,
  fallback,
  onStatusChange,
  allowSoftwareRenderer = false,
  className,
  style,
  ...rest
}: ImageFxProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const shaderCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const instanceRef = React.useRef<Instance | null>(null);
  const revealRef = React.useRef<RevealState | null>(null);
  const cycleRef = React.useRef<Cycle | null>(null);
  const onCycleRef = React.useRef(onCycle);
  const excludeSrcsRef = React.useRef(excludeSrcs);

  // Transient image-derived recolor for the regenerate churn. While set, it
  // overrides the palette + card surface (shader uniforms AND the wrapper's
  // CSS background) so the effect wears the outgoing image's colors; cleared
  // automatically when the next image reaches `visible`.
  const [regenTint, setRegenTint] = React.useState<SampledPalette | null>(null);

  // Transient preset override for the regenerate churn. The churn must always
  // run on a pixel-mosaic preset (`pixels-mechanic` / `pixels-organic`): when
  // the active preset is not one of those (e.g. `sweep-gradient`), a random
  // pixel preset is swapped onto the instance for the churn's duration and
  // the authored preset is restored once the next image is fully visible.
  const [regenPresetName, setRegenPresetName] =
    React.useState<ImageFxPreset | null>(null);

  // Labs: without the animated effect (reduced motion, no WebGL 2, a lost
  // context) the handle shows and hides the image statically.
  const [staticSrc, setStaticSrc] = React.useState<string | null>(null);
  const staticRef = React.useRef<{
    src: string | null;
    lastIdx: number;
    timer: ReturnType<typeof setTimeout> | null;
  }>({ src: null, lastIdx: -1, timer: null });

  // Keep the latest callbacks live without re-subscribing the cycle.
  React.useEffect(() => {
    onCycleRef.current = onCycle;
  }, [onCycle]);
  React.useEffect(() => {
    excludeSrcsRef.current = excludeSrcs;
  }, [excludeSrcs]);

  const themeState = useResolvedTheme(theme);
  const resolvedTheme = themeState ?? "dark";
  const presetMode = React.useMemo(
    () => PRESETS[preset].modes[resolvedTheme],
    [preset, resolvedTheme],
  );
  // Effective background colour (override > preset). Drives both the wrapper's
  // CSS background and the shader's `u_cardBg` uniform so contrast logic in
  // the shader stays in sync with the actual host card surface.
  const cardBg = cardBgProp ?? presetMode.cardBg;

  // Live refs for the imperative `triggerRegenerate` (its handle is created
  // once with empty deps, so it must read current values through refs).
  const presetModeRef = React.useRef(presetMode);
  presetModeRef.current = presetMode;
  const presetRef = React.useRef(preset);
  presetRef.current = preset;
  const resolvedThemeRef = React.useRef(resolvedTheme);
  resolvedThemeRef.current = resolvedTheme;
  const pausedRef = React.useRef(paused);
  pausedRef.current = paused;

  // Normalised image pool + refs holding the latest cycle inputs so the
  // mount-only lifecycle effect can read them when constructing the cycle.
  // (The cycle itself is created in the lifecycle effect so manual
  // `triggerReveal()` works regardless of the `autoReveal` flag.)
  const imagesArr = React.useMemo(() => normaliseImages(images), [images]);
  const imagesArrRef = React.useRef(imagesArr);
  const revealDelayRangeRef = React.useRef(revealDelayRange);
  const revealHoldMsRef = React.useRef(revealHoldMs);
  const revealFadeOutMsRef = React.useRef(revealFadeOutMs);
  imagesArrRef.current = imagesArr;
  revealDelayRangeRef.current = revealDelayRange;
  revealHoldMsRef.current = revealHoldMs;
  revealFadeOutMsRef.current = revealFadeOutMs;
  // Labs: read by the render loop's setup, which runs outside render.
  const current = React.useRef({
    presetMode,
    strength,
    speed,
    cardBgProp,
    colors,
    pixelScale,
    autoReveal,
  });
  current.current = {
    presetMode,
    strength,
    speed,
    cardBgProp,
    colors,
    pixelScale,
    autoReveal,
  };

  // Resolve `revealInitialDelay` into a stable ms value at mount time.
  // Range tuples randomise ONCE here so re-renders never reseed the value.
  const [initialDelayMs] = React.useState<number | undefined>(() => {
    if (revealInitialDelay == null) return undefined;
    if (typeof revealInitialDelay === "number") {
      return Math.max(0, revealInitialDelay) * 1000;
    }
    const [min, max] = revealInitialDelay;
    const lo = Math.max(0, Math.min(min, max));
    const hi = Math.max(0, Math.max(min, max));
    return (lo + Math.random() * (hi - lo)) * 1000;
  });

  // Dynamic measure: size from the root's bounding box and corner radius
  // from the wrapped child's computed style (falls back to the root if the
  // child has none). The shader can only render a single uniform corner
  // radius, so we sample `borderTopLeftRadius` and apply it on all four
  // corners — matches how the canvases inherit border-radius from the root.
  const measure = React.useCallback((): { w: number; h: number; r: number } => {
    const root = rootRef.current;
    if (!root) return { w: 1, h: 1, r: 0 };
    const rect = root.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    let r = 0;
    if (typeof borderRadius === "number") {
      r = borderRadius;
    } else {
      const childEl = contentRef.current
        ?.firstElementChild as HTMLElement | null;
      if (childEl) {
        const parsed = parseFloat(
          getComputedStyle(childEl).borderTopLeftRadius,
        );
        if (Number.isFinite(parsed) && parsed > 0) r = parsed;
      }
      if (r === 0) {
        const parsed = parseFloat(getComputedStyle(root).borderTopLeftRadius);
        if (Number.isFinite(parsed) && parsed > 0) r = parsed;
      }
    }
    return { w, h, r };
  }, [borderRadius]);
  const measureRef = React.useRef(measure);
  measureRef.current = measure;

  // Labs: the render loop (decision 0021) owns the frame clock, the
  // off-screen and hidden-tab pauses and the reduced-motion gate; setup is
  // upstream's lifecycle effect (instance + reveal + cycle).
  const loop = useRenderLoop<LoopHandle>(shaderCanvasRef, {
    context: "2d",
    continuous: !paused,
    setup: (shader) => {
      // Labs: without a GPU the shader stalls the page; the loop then reports
      // `unsupported` and the static picture stays.
      if (!allowSoftwareRenderer && isSoftwareRenderer()) {
        throw new Error("image-fx: software WebGL renderer");
      }
      const overlay = overlayCanvasRef.current;
      if (!overlay) throw new Error("image-fx: overlay canvas missing");
      const initial = measureRef.current();
      const opts = current.current;
      const inst = createInstance({
        canvas: shader,
        cssWidth: initial.w,
        cssHeight: initial.h,
        preset: opts.presetMode,
        strength: opts.strength,
        speed: opts.speed,
        cardBg: opts.cardBgProp ?? null,
        pixelScale: opts.pixelScale,
      });
      instanceRef.current = inst;
      // Labs: upstream's wakeLoop() now asks this loop for a frame.
      inst.wake = () => loop.invalidate();
      inst.canvas.style.opacity = String(
        Math.max(0, Math.min(1, opts.strength)),
      );
      setInstanceColors(inst, opts.colors ?? null);

      const reveal = createReveal({
        canvas: overlay,
        cssWidth: initial.w,
        cssHeight: initial.h,
        shaderCanvas: shader,
      });
      inst.reveal = reveal;
      revealRef.current = reveal;

      // Cycle is created up-front (independent of `autoReveal`) so that the
      // imperative `triggerReveal()` works for manual user-driven reveals too.
      // `start()` is only called when `autoReveal` is true.
      const cycle = createCycle({
        reveal,
        images: imagesArrRef.current,
        delayRange: revealDelayRangeRef.current,
        holdMs: revealHoldMsRef.current,
        fadeOutMs: revealFadeOutMsRef.current,
        initialDelayMs,
        onPhase: (e) => {
          // A fully-visible image ends any regenerate churn — restore the
          // preset palette / consumer-provided colors and the authored preset.
          // (No-op re-set when nothing is active; React bails on identical
          // state.)
          if (e.phase === "visible") {
            setRegenTint(null);
            setRegenPresetName(null);
          }
          onCycleRef.current?.(e);
        },
        excludeSrcs: () => excludeSrcsRef.current?.() ?? null,
      });
      cycleRef.current = cycle;
      if (pausedRef.current) {
        cycle.setPaused(true);
        setInstancePaused(inst, true);
      }
      if (opts.autoReveal) cycle.start();
      return { inst, reveal, cycle, ticked: false };
    },
    // Sizes come from upstream's measure (below); the shader paint sizes the
    // canvas itself, so the loop must not reset it.
    resize: () => {},
    render: (handle, frame) => {
      // A zero delta after the first frame means the loop was paused (off
      // screen, hidden tab or `paused`); restart the clock as upstream did.
      const resumed = handle.ticked && frame.delta === 0;
      handle.ticked = true;
      tickInstance(handle.inst, performance.now(), resumed);
    },
    dispose: (handle) => {
      handle.cycle.dispose();
      if (cycleRef.current === handle.cycle) cycleRef.current = null;
      handle.reveal.dispose();
      if (revealRef.current === handle.reveal) revealRef.current = null;
      destroyInstance(handle.inst);
      if (instanceRef.current === handle.inst) instanceRef.current = null;
    },
  });

  // Labs: the shared WebGL context can be lost; show the fallback meanwhile.
  const [contextLost, setContextLost] = React.useState(false);
  React.useEffect(() => {
    setContextLost(isSharedContextLost());
    return subscribeSharedContext(setContextLost);
  }, []);
  const animated = loop.status === "ready" && !contextLost;
  const animatedRef = React.useRef(animated);
  animatedRef.current = animated;

  React.useEffect(() => {
    onStatusChange?.(loop.status);
  }, [loop.status, onStatusChange]);

  React.useImperativeHandle(forwardedRef, () => {
    // Labs: the static path, without the animated effect.
    const s = staticRef.current;
    const emit = (phase: CycleEvent["phase"]) =>
      onCycleRef.current?.({ phase, src: s.src });
    const clearTimer = () => {
      if (s.timer != null) clearTimeout(s.timer);
      s.timer = null;
    };
    const staticHide = () => {
      if (s.src == null) return;
      clearTimer();
      emit("hide");
      s.src = null;
      setStaticSrc(null);
      emit("idle");
    };
    const staticShow = (hold: "auto" | "manual") => {
      const pool = imagesArrRef.current;
      if (pool.length === 0) return;
      const raw = excludeSrcsRef.current?.();
      const excluded = raw == null ? null : new Set(raw);
      const allowed = excluded
        ? pool.filter((src) => !excluded.has(src))
        : pool;
      const pick = pickRandomImage(
        allowed.length > 0 ? allowed : pool,
        s.lastIdx,
      );
      if (!pick) return;
      s.lastIdx = pick.idx;
      s.src = pick.src;
      setStaticSrc(pick.src);
      emit("reveal");
      emit("visible");
      if (hold === "auto") {
        const [lo, hi] =
          typeof revealHoldMsRef.current === "number"
            ? [revealHoldMsRef.current, revealHoldMsRef.current]
            : revealHoldMsRef.current;
        s.timer = setTimeout(staticHide, lo + Math.random() * (hi - lo));
      }
    };
    return {
      get element() {
        return rootRef.current;
      },
      triggerReveal(opts) {
        if (!animatedRef.current) {
          if (pausedRef.current || s.src != null) return;
          staticShow(opts?.hold ?? "auto");
          return;
        }
        cycleRef.current?.triggerOnce(opts);
      },
      triggerHide() {
        if (!animatedRef.current) {
          if (!pausedRef.current) staticHide();
          return;
        }
        cycleRef.current?.triggerHide();
      },
      triggerRegenerate(opts) {
        if (!animatedRef.current) {
          if (pausedRef.current || s.src == null) return;
          clearTimer();
          emit("idle");
          if (opts?.autoReveal ?? true) staticShow("manual");
          else {
            s.src = null;
            setStaticSrc(null);
          }
          return;
        }
        const cycle = cycleRef.current;
        if (!cycle || pausedRef.current) return;
        const phase = cycle.getPhase();
        if (phase !== "reveal" && phase !== "visible") return;
        // The churn always runs on a pixel-mosaic preset: keep the active
        // preset when it's already one, otherwise (e.g. sweep-gradient)
        // temporarily switch the instance to a random pixel preset. The
        // authored preset is restored when the next image reaches `visible`.
        const activePreset = presetRef.current;
        const churnName = isPixelChurnPreset(activePreset)
          ? null
          : PIXEL_CHURN_PRESETS[
              Math.floor(Math.random() * PIXEL_CHURN_PRESETS.length)
            ];
        // Recolor the effect from the visible image (overlay canvas) so the
        // churn showing through the dropped cells reads as pixelation born
        // from that image rather than the preset's stock palette. The sample
        // maps onto the CHURN preset's palette slots (the preset actually
        // rendering during the churn), not the outgoing preset's.
        if (opts?.tintFromImage ?? true) {
          const overlay = overlayCanvasRef.current;
          if (overlay) {
            const churnColors = churnName
              ? PRESETS[churnName].modes[resolvedThemeRef.current].colors
              : presetModeRef.current.colors;
            const sampled = samplePaletteFromCanvas(overlay, churnColors);
            if (sampled) setRegenTint(sampled);
          }
        }
        if (churnName) setRegenPresetName(churnName);
        const autoRevealAfter = opts?.autoReveal ?? true;
        cycle.triggerBoil(
          autoRevealAfter
            ? { autoRevealAfterMs: opts?.durationMs ?? 4000 }
            : undefined,
        );
      },
      isImageActive() {
        if (!animatedRef.current) return s.src != null;
        const phase = cycleRef.current?.getPhase() ?? "idle";
        return phase === "reveal" || phase === "visible" || phase === "hide";
      },
    };
  }, []);
  React.useEffect(
    () => () => {
      const timer = staticRef.current.timer;
      if (timer != null) clearTimeout(timer);
    },
    [],
  );

  // Sync the wrapper's dimensions + corner radius to the host card.
  //
  // The radius must follow the wrapped child dynamically so the effect
  // always matches whatever the consumer's card looks like — even if they
  // toggle a class, adjust an inline style, or swap the child entirely.
  //
  // Three observers handle the three change vectors:
  //   1. ResizeObserver on root  -> wrapper resized (window resize, parent
  //      flex/grid change, container query, etc.)
  //   2. ResizeObserver on child -> child intrinsic size changed (text
  //      reflow, image load), which can also imply a CSS recalc that
  //      affects radius.
  //   3. MutationObserver on child -> class / style / data-* attribute
  //      changes that may swap border-radius without touching size (theme
  //      toggle, hover/active class flip from parent, etc.).
  //
  // All three coalesce through a single rAF so the canvas isn't resized
  // more than once per frame. (Labs: this runs without the animated effect
  // too, so the fallback is clipped to the same radius.)
  React.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const initial = measureRef.current();
    root.style.setProperty("--image-gen-radius", `${initial.r}px`);
    root.style.borderRadius = `${initial.r}px`;

    let resizeRaf = 0;
    let lastW = initial.w;
    let lastH = initial.h;
    let lastR = initial.r;
    const applyMeasure = (): void => {
      resizeRaf = 0;
      const next = measureRef.current();
      // Skip GL resize if dimensions didn't actually change; still re-apply
      // border-radius because that's the cheap part and may have moved.
      const i = instanceRef.current;
      if (next.w !== lastW || next.h !== lastH) {
        if (i) updateInstanceSize(i, next.w, next.h);
        lastW = next.w;
        lastH = next.h;
      }
      if (next.r !== lastR) {
        root.style.setProperty("--image-gen-radius", `${next.r}px`);
        root.style.borderRadius = `${next.r}px`;
        lastR = next.r;
      }
    };
    const scheduleMeasure = (): void => {
      if (resizeRaf !== 0) return;
      resizeRaf = requestAnimationFrame(applyMeasure);
    };

    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(root);
    const childEl = contentRef.current?.firstElementChild as HTMLElement | null;
    if (childEl) ro.observe(childEl);

    // Watch for CSS-affecting attribute changes on the child so radius
    // updates that don't trigger a resize (e.g. swapping a `rounded-lg`
    // class with `rounded-xl`) are still reflected immediately.
    let mo: MutationObserver | null = null;
    if (childEl && typeof MutationObserver !== "undefined") {
      mo = new MutationObserver(scheduleMeasure);
      mo.observe(childEl, {
        attributes: true,
        attributeFilter: ["class", "style"],
      });
    }

    return () => {
      ro.disconnect();
      mo?.disconnect();
      if (resizeRaf !== 0) cancelAnimationFrame(resizeRaf);
    };
  }, []);

  // Sync preset/theme to the instance + force a one-shot repaint so paused
  // instances reflect the prop change live (rAF tick is gated on `!paused`).
  // An active regenerate churn preset override takes precedence over the prop.
  React.useEffect(() => {
    const i = instanceRef.current;
    if (!i) return;
    const effectiveMode = regenPresetName
      ? PRESETS[regenPresetName].modes[resolvedTheme]
      : presetMode;
    setInstancePreset(i, effectiveMode);
    renderInstanceOnce(i);
  }, [presetMode, regenPresetName, resolvedTheme]);

  // Sync cardBg override to the instance (shader uniform + reveal helper),
  // then repaint once so the change shows immediately even while paused.
  // An active regenerate tint takes precedence over the prop.
  React.useEffect(() => {
    const i = instanceRef.current;
    if (!i) return;
    setInstanceCardBg(i, regenTint?.cardBg ?? cardBgProp ?? null);
    renderInstanceOnce(i);
  }, [cardBgProp, regenTint]);

  // Sync the palette override (per-slot colors, e.g. sampled from an image).
  // An active regenerate tint takes precedence over the prop.
  React.useEffect(() => {
    const i = instanceRef.current;
    if (!i) return;
    setInstanceColors(i, regenTint?.colors ?? colors ?? null);
    renderInstanceOnce(i);
  }, [colors, regenTint]);

  // Sync strength via the visible canvas opacity (no shader recompile).
  // The `opacity` style change is purely DOM and applies even while paused;
  // no GL repaint needed.
  React.useEffect(() => {
    const i = instanceRef.current;
    if (!i) return;
    setInstanceStrength(i, strength);
    if (i.canvas) {
      i.canvas.style.opacity = String(Math.max(0, Math.min(1, strength)));
    }
  }, [strength]);

  // Sync speed — scales the instance's animation clock, no repaint needed.
  React.useEffect(() => {
    const i = instanceRef.current;
    if (!i) return;
    setInstanceSpeed(i, speed);
  }, [speed]);

  // Sync pixelScale (recomputes the mosaic grid density) and repaint once so
  // the change is visible immediately even while paused.
  React.useEffect(() => {
    const i = instanceRef.current;
    if (!i) return;
    setInstancePixelScale(i, pixelScale);
    renderInstanceOnce(i);
  }, [pixelScale]);

  // Custom fragment stage: page-wide while set, back to the bundled one when
  // this instance drops it or unmounts.
  React.useEffect(() => {
    if (!fragmentShader || loop.status !== "ready") return;
    setSharedFragmentShader(fragmentShader);
    return () => setSharedFragmentShader(null);
  }, [fragmentShader, loop.status]);

  // Sync paused.
  React.useEffect(() => {
    const i = instanceRef.current;
    if (i) setInstancePaused(i, paused);
    cycleRef.current?.setPaused(paused);
  }, [paused]);

  // Patch live updates to the always-on cycle (avoid recreating per prop change).
  React.useEffect(() => {
    cycleRef.current?.setImages(imagesArr);
  }, [imagesArr]);
  React.useEffect(() => {
    cycleRef.current?.setOptions({
      delayRange: revealDelayRange,
      holdMs: revealHoldMs,
      fadeOutMs: revealFadeOutMs,
    });
  }, [revealDelayRange, revealHoldMs, revealFadeOutMs]);

  // Start/stop the auto-loop in response to the `autoReveal` flag. The cycle
  // itself is created in the render loop's setup (which also starts it when
  // `autoReveal` is on) so manual `triggerReveal()` works even when
  // `autoReveal === false`.
  React.useEffect(() => {
    const cycle = cycleRef.current;
    if (!cycle) return;
    if (autoReveal) {
      cycle.start();
      return () => cycle.stop();
    }
    cycle.stop();
    return undefined;
  }, [autoReveal]);

  const wrapperStyle = React.useMemo<React.CSSProperties>(() => {
    return {
      // During a regenerate churn the card surface wears the outgoing
      // image's average color so the dropped cells read as image pixels.
      background: regenTint?.cardBg ?? cardBg,
      ...style,
    };
  }, [cardBg, regenTint, style]);

  // Labs: before `theme="auto"` resolves (server render, gallery tile) the
  // fallback follows the page's `dark` class.
  const fallbackFor = (mode: "dark" | "light", extra?: string) => (
    <MosaicFallback
      mode={PRESETS[preset].modes[mode]}
      cardBg={cardBgProp ?? PRESETS[preset].modes[mode].cardBg}
      colors={colors}
      pixelScale={pixelScale}
      className={extra}
    />
  );
  const mosaic =
    fallback ??
    (themeState === null ? (
      <>
        {fallbackFor("light", "dark:hidden")}
        {fallbackFor("dark", "hidden dark:block")}
      </>
    ) : (
      fallbackFor(themeState)
    ));

  return (
    <div
      {...rest}
      ref={rootRef}
      data-slot="image-fx"
      data-preset={preset}
      data-theme={themeState ?? undefined}
      data-paused={paused ? "true" : undefined}
      data-status={loop.status}
      className={cn(
        "relative isolate inline-block flex-none overflow-hidden align-top leading-[0]",
        className,
      )}
      style={wrapperStyle}
    >
      {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: a canvas without tabIndex is not focusable; the effect is decorative, as upstream marks it */}
      <canvas
        ref={shaderCanvasRef}
        data-slot="image-fx-shader"
        className="pointer-events-none absolute inset-0 z-[1] block size-full rounded-[inherit]"
        aria-hidden="true"
      />
      {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: a canvas without tabIndex is not focusable; the effect is decorative, as upstream marks it */}
      <canvas
        ref={overlayCanvasRef}
        data-slot="image-fx-overlay"
        className="pointer-events-none absolute inset-0 z-[2] block size-full rounded-[inherit]"
        aria-hidden="true"
      />
      <div
        data-slot="image-fx-fallback"
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 z-[3] overflow-hidden rounded-[inherit] transition-opacity duration-300 motion-reduce:transition-none",
          animated && "opacity-0",
        )}
      >
        {mosaic}
        {staticSrc && !animated ? (
          <img
            src={staticSrc}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
      </div>
      <div
        ref={contentRef}
        data-slot="image-fx-content"
        className="relative z-0 block leading-normal"
      >
        {children}
      </div>
    </div>
  );
}

/** Upstream's names, for code written against img-fx. */
export {
  ImageFx as ImageGeneration,
  type ImageFxCycleEvent as ImageGenerationCycleEvent,
  type ImageFxHandle as ImageGenerationHandle,
  type ImageFxPreset as ImageGenerationPreset,
  type ImageFxProps as ImageGenerationProps,
  type ImageFxTheme as ImageGenerationTheme,
};
