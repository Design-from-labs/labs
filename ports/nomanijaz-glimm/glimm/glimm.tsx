"use client";

import * as React from "react";

import { type RenderLoopStatus, useRenderLoop } from "@/lib/render-loop";
import {
  createNullShader,
  focusTarget,
  type GlimmDirection,
  type GlimmFocusTarget,
  playContainedSweep,
  playCrossfade,
  playPageCrossfade,
  resolveDirection,
} from "./glimm-contained";
import {
  createMeshShader,
  createNamedropShader,
  createShader,
  type Direction,
  MESH_SHADER_CONTEXT,
  NAMEDROP_SHADER_CONTEXT,
  type Palette,
  resolvePalette,
  SHADER_CONTEXT,
  type ShaderController,
  type SweepHandle,
  type SweepOptions,
} from "./glimm-core";
import {
  type CoveredHandle,
  type Curtain,
  createCurtain,
  playCoveredSweep,
  playMaskedSweep,
} from "./glimm-sweeps";

/*
 * Ported from glimm 0.3.1 by Noman Ijaz (npm `glimm`, git head
 * ea7f5500b109: https://www.npmjs.com/package/glimm), the React entry
 * (`glimm/react`: GlimmProvider and useGlimm) over the framework-agnostic
 * core in glimm-core.ts. The Next.js entry is not ported.
 *
 * Copyright (c) 2026 Noman Ijaz. MIT License; the full notice ends this file.
 */

export type { GlimmDirection, GlimmFocusTarget } from "./glimm-contained";
export type {
  AccentName,
  Direction,
  Easing,
  EasingName,
  MeshShaderController,
  NamedropController,
  Palette,
  PaletteName,
  ShaderController,
  SweepHandle,
  SweepOptions,
} from "./glimm-core";
export {
  ACCENT_ORDER,
  ACCENTS,
  accentChain,
  accentPair,
  createMeshShader,
  createNamedropShader,
  createShader,
  cubicBezier,
  EASINGS,
  hexToRgb,
  oklchToRgb,
  PALETTES,
  playSweep,
  resolveEasing,
  resolvePalette,
  rgbToOklch,
  shuffleAccentPalette,
} from "./glimm-core";

/**
 * Builds a shader controller on the canvas the provider hands it. Upstream's
 * factories (`createShader`, `createMeshShader`) fit; a custom one also
 * implements `draw` and `resize` (see ShaderController) and calls `invalidate`
 * when it needs a frame.
 */
export type ShaderFactory = (opts: {
  canvas: HTMLCanvasElement;
  palette?: Palette;
  bandTight?: number;
  direction?: Direction;
  invalidate?: () => void;
}) => ShaderController | null;

export type GlimmSweepOptions = Omit<SweepOptions, "direction"> & {
  /**
   * `ltr`, `rtl`, `ttb` and `btt` are physical, as upstream. `inline-end`
   * and `inline-start` follow the reading direction (`dir`), so a sweep that
   * moves "forward" moves right to left in a right-to-left page.
   */
  direction?: GlimmDirection;
  /**
   * Where focus lands once the new view is committed: a selector (looked up
   * inside the provider's content), an element, or a function. A heading
   * becomes focusable with tabindex -1. Upstream does not move focus.
   */
  focus?: GlimmFocusTarget;
};

export type GlimmDefaults = Omit<
  GlimmSweepOptions,
  "onMidpoint" | "onComplete" | "focus"
> & {
  /**
   * 'instant' skips the sweep, 'sweep' plays anyway (both upstream, default
   * 'instant'). 'crossfade' fades the new view in over the old one instead.
   */
  reducedMotion?: "instant" | "sweep" | "crossfade";
  /** z-index of the canvas overlay. Default 9999 (2 in a container). */
  zIndex?: number;
  /** Optional override for the shader controller factory. Defaults to the
   *  fullscreen-quad `createShader`; pass `createMeshShader` (or any other
   *  ShaderFactory) to use a different sweep look in this subtree. */
  shaderFactory?: ShaderFactory;
  /** Fires once when the underlying shader controller is created (again
   *  after a restored WebGL context). Lets callers grab a ref to the
   *  controller for live tuning. */
  onController?: (ctrl: ShaderController) => void;
  /**
   * `viewport` (upstream): the band crosses the whole window and the page
   * is held with the browser's View Transitions. `container`: the band
   * crosses the provider's own box and the content inside it is held as a
   * frozen copy, so a transition can live inside a card, a tile or a dialog.
   */
  scope?: "viewport" | "container";
  /**
   * What a sweep does when WebGL cannot draw (no context, a lost context):
   * 'wipe' (default) runs the same masks without the band, 'instant' swaps
   * at once (upstream).
   */
  fallback?: "wipe" | "instant";
  /** Context attributes for a custom `shaderFactory`; upstream's three
   *  factories need no entry. */
  shaderContext?: WebGLContextAttributes;
};

/** A sweep handle; the covered and masked sweeps can also be interrupted. */
type ActiveHandle = SweepHandle & { interrupt?: () => void };

export type SweepFn = (
  /** A function that triggers your navigation (router.push, etc.). Awaited inside the sweep. */
  navigate: () => void | Promise<void>,
  /** Per-call overrides (merged over provider defaults). */
  options?: GlimmSweepOptions,
) => SweepHandle;

type Ctx = {
  sweep: SweepFn;
  defaults: GlimmDefaults;
};

const GlimmContext = React.createContext<Ctx | null>(null);

export function useGlimm() {
  const ctx = React.useContext(GlimmContext);
  if (!ctx) {
    throw new Error("useGlimm must be used inside <GlimmProvider>");
  }
  return ctx;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** The attributes each upstream factory asks `getContext` for. */
const FACTORY_CONTEXTS = new Map<ShaderFactory, WebGLContextAttributes>([
  [createShader, SHADER_CONTEXT],
  [createMeshShader, MESH_SHADER_CONTEXT],
  [createNamedropShader, NAMEDROP_SHADER_CONTEXT],
]);

const nextFrames = (count: number) =>
  new Promise<void>((resolve) => {
    const step = (left: number) =>
      requestAnimationFrame(() => (left > 1 ? step(left - 1) : resolve()));
    step(count);
  });

export function GlimmProvider({
  children,
  className,
  style,
  scope = "viewport",
  fallback = "wipe",
  shaderContext,
  ...defaults
}: GlimmDefaults & {
  children: React.ReactNode;
  /** Styles the box of a `container` scope; ignored in the viewport scope. */
  className?: string;
  style?: React.CSSProperties;
}) {
  const contained = scope === "container";
  const hostRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const ctrlRef = React.useRef<ShaderController | null>(null);
  const nullCtrlRef = React.useRef<ShaderController | null>(null);
  const activeRef = React.useRef<ActiveHandle | null>(null);
  const curtainRef = React.useRef<Curtain | null>(null);
  const invalidateRef = React.useRef<() => void>(() => {});
  const statusRef = React.useRef<RenderLoopStatus>("pending");
  const [isPending, startTransition] = React.useTransition();
  const [committedTicket, setCommittedTicket] = React.useState(0);
  const ticketRef = React.useRef(0);
  const waitersRef = React.useRef(new Map<number, () => void>());

  React.useEffect(() => {
    if (isPending) return;
    for (const [ticket, finish] of waitersRef.current) {
      if (ticket <= committedTicket) finish();
    }
  }, [committedTicket, isPending]);

  const commit = (
    navigate: () => void | Promise<void>,
    signal: AbortSignal,
  ) => {
    if (signal.aborted) return Promise.resolve();
    const ticket = ++ticketRef.current;
    let result: void | Promise<void> | undefined;
    let finish!: () => void;
    const committed = new Promise<void>((resolve) => {
      finish = () => {
        waitersRef.current.delete(ticket);
        signal.removeEventListener("abort", finish);
        resolve();
      };
      waitersRef.current.set(ticket, finish);
      signal.addEventListener("abort", finish, { once: true });
    });
    try {
      startTransition(() => {
        result = navigate();
        setCommittedTicket(ticket);
      });
    } catch (error) {
      finish();
      return Promise.reject(error);
    }
    return Promise.all([committed, result]).then(() => {});
  };

  const defaultsRef = React.useRef(defaults);
  // Upstream lists `defaults` as the dependency; it is a new object on every
  // render, so this is the same effect without the dependency list.
  React.useEffect(() => {
    defaultsRef.current = defaults;
  });
  // The settings upstream does not have; read when a sweep starts.
  const extrasRef = React.useRef({ scope, fallback });
  extrasRef.current = { scope, fallback };

  // Upstream creates its canvas and shader on the first sweep and runs its own
  // animation-frame loop while the band is visible. Here the provider renders
  // the canvas and the shared render loop owns the context, the pixel ratio,
  // the pauses and context loss (decision 0021); frames are drawn on demand,
  // only while the band has alpha.
  const factory: ShaderFactory = defaults.shaderFactory ?? createShader;
  const { status, invalidate } = useRenderLoop<ShaderController>(canvasRef, {
    context: "webgl",
    contextAttributes:
      shaderContext ?? FACTORY_CONTEXTS.get(factory) ?? SHADER_CONTEXT,
    continuous: false,
    respectReducedMotion: defaults.reducedMotion !== "sweep",
    setup: (canvas) => {
      const currentDefaults = defaultsRef.current;
      const create: ShaderFactory =
        currentDefaults.shaderFactory ?? createShader;
      const ctrl = create({
        canvas,
        palette: resolvePalette(currentDefaults.palette),
        bandTight: currentDefaults.bandTight,
        direction: resolveDirection(
          currentDefaults.direction,
          canvas.parentElement,
        ),
        invalidate: () => invalidateRef.current(),
      });
      if (!ctrl) {
        throw new Error("The shader could not be created.");
      }
      ctrlRef.current = ctrl;
      currentDefaults.onController?.(ctrl);
      return ctrl;
    },
    resize: (ctrl, size) => ctrl.resize(size),
    render: (ctrl) => {
      ctrl.draw();
      if (ctrl.getAlpha() > 0) invalidateRef.current();
    },
    dispose: (ctrl) => {
      if (ctrlRef.current === ctrl) ctrlRef.current = null;
      ctrl.destroy();
    },
  });
  invalidateRef.current = invalidate;
  statusRef.current = status;

  const ensureCurtain = () => {
    if (curtainRef.current) return curtainRef.current;
    const host = hostRef.current;
    if (!host) return null;
    curtainRef.current = createCurtain(host);
    return curtainRef.current;
  };
  const ensureCurtainRef = React.useRef(ensureCurtain);
  ensureCurtainRef.current = ensureCurtain;
  const commitRef = React.useRef(commit);
  commitRef.current = commit;

  React.useEffect(() => {
    return () => {
      activeRef.current?.cancel();
      curtainRef.current?.destroy();
      curtainRef.current = null;
      for (const finish of waitersRef.current.values()) finish();
    };
  }, []);

  const sweep = React.useMemo<SweepFn>(() => {
    return (navigate, options) => {
      const d = defaultsRef.current;
      const { scope: currentScope, fallback: currentFallback } =
        extrasRef.current;
      const container = containerRef.current;
      const content = contentRef.current;
      if (activeRef.current?.interrupt) activeRef.current.interrupt();
      else activeRef.current?.cancel();
      activeRef.current = null;
      const focusScope: ParentNode =
        currentScope === "container" && content ? content : document;
      const instant = () => {
        curtainRef.current?.hide();
        ctrlRef.current?.setAlpha(0);
        ctrlRef.current?.setProgress(0);
        let cancelled = false;
        let resolveCancelled!: () => void;
        const cancelledP = new Promise<void>((resolve) => {
          resolveCancelled = resolve;
        });
        const task = Promise.resolve()
          .then(async () => {
            if (cancelled) return;
            await navigate();
            if (cancelled) return;
            if (options?.focus) {
              await nextFrames(2);
              if (cancelled) return;
              focusTarget(options.focus, focusScope);
            }
            await options?.onMidpoint?.();
            if (!cancelled) options?.onComplete?.();
          })
          .catch((error) => {
            console.error("[glimm] navigation callback failed:", error);
          });
        const p = Promise.race([task, cancelledP]);
        const handle2: ActiveHandle = {
          midpoint: p,
          done: p,
          cancel: () => {
            cancelled = true;
            resolveCancelled();
          },
        };
        activeRef.current = handle2;
        void p.then(() => {
          if (activeRef.current === handle2) activeRef.current = null;
        });
        return handle2;
      };
      // Upstream's per-call callbacks, with the focus handoff after the commit.
      const run = async (signal: AbortSignal) => {
        await commitRef.current(navigate, signal);
        if (signal.aborted) return;
        focusTarget(options?.focus, focusScope);
        await options?.onMidpoint?.();
      };
      const track = (handle: CoveredHandle) => {
        activeRef.current = handle;
        handle.done.finally(() => {
          if (activeRef.current === handle) activeRef.current = null;
        });
        return handle;
      };
      if (d.reducedMotion !== "sweep" && prefersReducedMotion()) {
        if (d.reducedMotion === "crossfade") {
          const handle =
            currentScope === "container" && container && content
              ? playCrossfade(container, content, run, options ?? {})
              : playPageCrossfade(run, options ?? {});
          if (handle) return track(handle);
        }
        return instant();
      }
      const live = statusRef.current === "lost" ? null : ctrlRef.current;
      if (!live && currentFallback === "instant") return instant();
      if (!live && !nullCtrlRef.current) {
        nullCtrlRef.current = createNullShader();
      }
      const ctrl = live ?? (nullCtrlRef.current as ShaderController);
      const playOpts: SweepOptions = {
        ...d,
        ...options,
        direction: resolveDirection(
          options?.direction ?? d.direction,
          hostRef.current,
        ),
        onMidpoint: undefined,
      };
      if (currentScope === "container") {
        if (!container || !content) return instant();
        return track(
          playContainedSweep(ctrl, container, content, run, playOpts),
        );
      }
      const curtain = ensureCurtainRef.current();
      if (!curtain) return instant();
      const play =
        typeof document.startViewTransition === "function"
          ? playMaskedSweep
          : playCoveredSweep;
      return track(play(ctrl, curtain, run, playOpts));
    };
  }, []);

  const value = React.useMemo(
    () => ({ sweep, defaults }),
    // biome-ignore lint/correctness/useExhaustiveDependencies: upstream's context value follows the (rest) defaults object, which is new every render
    [sweep, defaults],
  );

  const layer = (
    <div
      ref={hostRef}
      data-slot="glimm-layer"
      data-status={status}
      aria-hidden
      style={{
        position: contained ? "absolute" : "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: defaults.zIndex ?? (contained ? 2 : 9999),
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          pointerEvents: "none",
        }}
      />
    </div>
  );

  if (contained) {
    return (
      <GlimmContext.Provider value={value}>
        <div
          ref={containerRef}
          data-slot="glimm"
          data-scope="container"
          data-status={status}
          className={className}
          style={{
            position: "relative",
            overflow: "hidden",
            isolation: "isolate",
            ...style,
          }}
        >
          <div
            ref={contentRef}
            data-slot="glimm-content"
            style={{ position: "relative", width: "100%", height: "100%" }}
          >
            {children}
          </div>
          {layer}
        </div>
      </GlimmContext.Provider>
    );
  }
  return (
    <GlimmContext.Provider value={value}>
      {children}
      {layer}
    </GlimmContext.Provider>
  );
}
