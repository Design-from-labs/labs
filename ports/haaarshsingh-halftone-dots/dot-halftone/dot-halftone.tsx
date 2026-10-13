"use client";

import * as React from "react";

import { clampDpr, useRenderLoop } from "@/lib/render-loop";
import { cn } from "@/lib/utils";

/*
 * Ported from haaarshsingh/halftone-dots (src/DotHalftone.tsx), at commit
 * 21ddfbdae84c: https://github.com/haaarshsingh/halftone-dots. The sampling,
 * the dot sizes and colors and the radial implode and explode morph are
 * upstream's, statement for statement; the canvas is drawn through the
 * render-loop helper instead of a bare requestAnimationFrame.
 *
 * Copyright (c) 2026 Harsh Singh. MIT License; the full notice ends this file.
 */

type Dot = {
  x: number;
  y: number;
  r: number;
  color: string;
  /** Normalized distance from center (0 = center, 1 = corner): drives the wave. */
  w: number;
};

function hexRgb(hex: string): [number, number, number] {
  const n = hex.replace("#", "");
  return [
    Number.parseInt(n.slice(0, 2), 16),
    Number.parseInt(n.slice(2, 4), 16),
    Number.parseInt(n.slice(4, 6), 16),
  ];
}

const ACCENT = "var(--dot-halftone-accent, #5b21ff)";
const GRID = "var(--dot-halftone-grid, rgba(20, 16, 40, 0.18))";

// The clusters sit on the picture's physical corners (each rotated to face
// its corner), so they stay put in right-to-left pages, like the picture.
const CORNERS = [
  { top: 0, left: 0, rotate: 90 },
  { top: 0, right: 0, rotate: 180 },
  { bottom: 0, right: 0, rotate: 270 },
  { bottom: 0, left: 0, rotate: 0 },
];

/** Three accent dots clustered at each corner of the frame. */
function CornerDots({ color }: { color: string }) {
  return (
    <div
      data-slot="dot-halftone-corners"
      className="pointer-events-none absolute z-10"
      style={{ inset: -24 }}
    >
      {CORNERS.map(({ rotate, ...pos }) => (
        <div
          key={rotate}
          className="absolute"
          style={{ ...pos, rotate: `${rotate}deg` }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
            style={{ display: "block", fill: color }}
          >
            <circle cx="2" cy="2" r="2" />
            <circle cx="10" cy="2" r="2" />
            <circle cx="10" cy="10" r="2" />
          </svg>
        </div>
      ))}
    </div>
  );
}

const DOT_MASK = "radial-gradient(circle, #000 1.7px, transparent 2.2px)";

/**
 * The static picture (server render, before the first frame, without a 2D
 * canvas): the image itself seen through a 5 px dot screen, recolored when a
 * gradient is set. Its layer multiplies onto the page, which keys out white.
 */
function HalftoneFallback({
  src,
  gradient,
}: {
  src: string;
  gradient?: readonly [string, string];
}) {
  return (
    <div
      className="relative size-full"
      style={{
        maskImage: DOT_MASK,
        WebkitMaskImage: DOT_MASK,
        maskSize: "5px 5px",
        WebkitMaskSize: "5px 5px",
      }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="size-full object-contain"
          style={
            gradient ? { filter: "grayscale(1) contrast(1.6)" } : undefined
          }
        />
      ) : null}
      {gradient ? (
        <div
          className="absolute inset-0 mix-blend-lighten"
          style={{
            backgroundImage: `linear-gradient(${gradient[0]}, ${gradient[1]})`,
          }}
        />
      ) : null}
    </div>
  );
}

export interface DotHalftoneProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  /** Image to recreate as an animated dot halftone. Changing it morphs. */
  src: string;
  /** Optional top-to-bottom [hex, hex] gradient that recolors the dots. */
  gradient?: readonly [string, string];
  /** Corner-cluster accent color. Default `--dot-halftone-accent` (#5b21ff). */
  accent?: string;
  /** Describes the picture. Without it the halftone is decorative. */
  alt?: string;
  /** Replaces the static picture shown before the first frame. */
  fallback?: React.ReactNode;
}

interface Frame {
  cssW: number;
  cssH: number;
  /** Draw the morph (true) or the settled dots (false). */
  morph: boolean;
}

/**
 * Samples a source image into a grid of dots and paints them on a single
 * <canvas>: dot size tracks the source's ink coverage and the color is taken
 * from the source (or an optional gradient). Switching `src` plays a dramatic
 * radial-wave morph: old dots implode from the center, new ones explode back.
 */
export function DotHalftone({
  src,
  gradient,
  accent,
  alt,
  fallback,
  className,
  style,
  ...props
}: DotHalftoneProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const dotsRef = React.useRef<Dot[]>([]);
  const prevDotsRef = React.useRef<Dot[]>([]);
  const startRef = React.useRef(0);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const frameRef = React.useRef<Frame | null>(null);
  const gradientRef = React.useRef(gradient);
  gradientRef.current = gradient;
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  // Re-run when the image or gradient values change (string key avoids
  // re-running just because a new array reference was passed).
  const gradKey = gradient ? gradient.join("|") : "";

  /** Paints the settled dots (upstream's static branch). */
  const drawStatic = React.useCallback(
    (ctx: CanvasRenderingContext2D, cssW: number, cssH: number) => {
      ctx.clearRect(0, 0, cssW, cssH);
      for (const d of dotsRef.current) {
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [],
  );

  /** Paints one morph frame `el` ms in; returns true once it has settled. */
  const drawMorph = React.useCallback(
    (ctx: CanvasRenderingContext2D, frame: Frame, el: number) => {
      // Old dots pop then implode from the center; new dots explode back in
      // with overshoot: a radial wave.
      const EXIT_DUR = 300;
      const EXIT_STAGGER = 200;
      const ENTER_DELAY = 150;
      const ENTER_DUR = 380;
      const ENTER_STAGGER = 220;
      const easeOutBack = (t: number) => {
        const c1 = 1.9;
        const c3 = c1 + 1;
        const p = t - 1;
        return 1 + c3 * p * p * p + c1 * p * p;
      };
      const prevList = prevDotsRef.current;
      ctx.clearRect(0, 0, frame.cssW, frame.cssH);
      let done = true;

      for (let k = 0; k < prevList.length; k++) {
        const d = prevList[k];
        const u = (el - d.w * EXIT_STAGGER) / EXIT_DUR;
        if (u >= 1) continue;
        done = false;
        let scale: number;
        if (u <= 0) scale = 1;
        else if (u < 0.35) scale = 1 + (u / 0.35) * 0.35;
        else scale = 1.35 * (1 - (u - 0.35) / 0.65);
        const r = d.r * scale;
        if (r <= 0.06) continue;
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      const list = dotsRef.current;
      for (let k = 0; k < list.length; k++) {
        const d = list[k];
        const t = Math.min(
          1,
          Math.max(0, (el - ENTER_DELAY - d.w * ENTER_STAGGER) / ENTER_DUR),
        );
        if (t < 1) done = false;
        if (t <= 0) continue;
        const r = d.r * Math.max(0, easeOutBack(t));
        if (r <= 0.06) continue;
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      return done;
    },
    [],
  );

  const { status, invalidate, handle } =
    useRenderLoop<CanvasRenderingContext2D>(canvasRef, {
      context: "2d",
      // Frames are drawn on demand: once for a still, and one after another
      // only while a morph runs.
      continuous: false,
      // Under reduced motion the dots still draw, statically (upstream's own
      // branch), instead of a placeholder.
      respectReducedMotion: false,
      setup: (_canvas, context) => context as CanvasRenderingContext2D,
      // A resize re-samples and repaints at once (upstream's ResizeObserver).
      resize: () => prepare(false),
      render: (ctx) => {
        const frame = frameRef.current;
        if (!frame) return;
        if (!frame.morph) {
          drawStatic(ctx, frame.cssW, frame.cssH);
          return;
        }
        const done = drawMorph(
          ctx,
          frame,
          performance.now() - startRef.current,
        );
        if (done) {
          prevDotsRef.current = [];
          frame.morph = false;
        } else {
          invalidate();
        }
      },
    });

  /**
   * Sizes the canvas, samples the image into dots and either paints them at
   * once or starts the morph (upstream's render()).
   */
  function prepare(animate: boolean) {
    const img = imgRef.current;
    const ctx = handle.current;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!img || !ctx || !wrap || !canvas) return;
    const rect = wrap.getBoundingClientRect();
    const cssW = rect.width;
    const cssH = rect.height;
    if (cssW < 4 || cssH < 4) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const grad = gradientRef.current;

    // Supersampled backing store: 1.5x the (capped) pixel ratio, at most 3.
    const ss = Math.min(3, clampDpr() * 1.5);
    canvas.width = Math.round(cssW * ss);
    canvas.height = Math.round(cssH * ss);
    ctx.setTransform(ss, 0, 0, ss, 0, 0);

    const CELL = 5;
    const cols = Math.max(1, Math.round(cssW / CELL));
    const rows = Math.max(1, Math.round(cssH / CELL));
    const cw = cssW / cols;
    const ch = cssH / rows;
    const maxR = Math.min(cw, ch) / 2;

    // Supersample each cell and measure ink coverage (fraction of non-white
    // pixels) plus the average ink color: recreates the source faithfully.
    const SUP = 4;
    const bw = cols * SUP;
    const bh = rows * SUP;
    const sc = document.createElement("canvas");
    sc.width = bw;
    sc.height = bh;
    const sctx = sc.getContext("2d");
    if (!sctx) return;
    sctx.clearRect(0, 0, bw, bh);
    const s = Math.min(bw / img.width, bh / img.height);
    const dw = img.width * s;
    const dh = img.height * s;
    sctx.drawImage(img, (bw - dw) / 2, (bh - dh) / 2, dw, dh);
    const { data } = sctx.getImageData(0, 0, bw, bh);

    const gTop = grad ? hexRgb(grad[0]) : null;
    const gBot = grad ? hexRgb(grad[1]) : null;
    const dots: Dot[] = [];
    for (let yy = 0; yy < rows; yy++) {
      for (let xx = 0; xx < cols; xx++) {
        let cr = 0;
        let cg = 0;
        let cb = 0;
        let ink = 0;
        for (let sy = 0; sy < SUP; sy++) {
          for (let sx = 0; sx < SUP; sx++) {
            const i = ((yy * SUP + sy) * bw + (xx * SUP + sx)) * 4;
            if (data[i + 3] < 24) continue;
            const r0 = data[i];
            const g0 = data[i + 1];
            const b0 = data[i + 2];
            const lum = (0.299 * r0 + 0.587 * g0 + 0.114 * b0) / 255;
            if (lum > 0.92) continue; // background / white
            cr += r0;
            cg += g0;
            cb += b0;
            ink++;
          }
        }
        if (ink === 0) continue;
        const coverage = ink / (SUP * SUP);
        const radius = maxR * Math.min(1, 0.42 + coverage * 0.7);
        let color: string;
        if (gTop && gBot) {
          const ty = yy / (rows - 1 || 1);
          color = `rgb(${Math.round(gTop[0] + (gBot[0] - gTop[0]) * ty)}, ${Math.round(
            gTop[1] + (gBot[1] - gTop[1]) * ty,
          )}, ${Math.round(gTop[2] + (gBot[2] - gTop[2]) * ty)})`;
        } else {
          color = `rgb(${Math.round(cr / ink)}, ${Math.round(cg / ink)}, ${Math.round(cb / ink)})`;
        }
        dots.push({
          x: (xx + 0.5) * cw + (Math.random() - 0.5) * 1.2,
          y: (yy + 0.5) * ch + (Math.random() - 0.5) * 1.2,
          r: Math.min(maxR * 1.05, radius),
          color,
          w: 0,
        });
      }
    }

    // Radial wave value: 0 at the center, 1 at the corners.
    const cx = cssW / 2;
    const cy = cssH / 2;
    const maxD = Math.hypot(cx, cy) || 1;
    for (let k = 0; k < dots.length; k++) {
      const d = dots[k];
      d.w = Math.hypot(d.x - cx, d.y - cy) / maxD;
    }

    const morph = animate && !reduceMotion;
    prevDotsRef.current = morph ? dotsRef.current : [];
    dotsRef.current = dots;
    startRef.current = performance.now();
    frameRef.current = { cssW, cssH, morph };

    if (!morph) {
      // A still is painted at once, so a resize never shows a blank frame.
      drawStatic(ctx, cssW, cssH);
    }
    invalidate();
  }

  // Load the image, then sample it with the morph. Each new image (or
  // gradient) also re-samples the current one as a still at the next frame,
  // as upstream's fresh ResizeObserver did with its first callback; whichever
  // comes second wins (at mount a cached image usually loads first, so the
  // still replaces the morph). Later resizes come through the loop's
  // `resize`.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `gradKey` stands for `gradient`, read through a ref.
  React.useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let cancelled = false;
    setFailed(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      imgRef.current = img;
      setLoaded(true);
      prepare(true);
    };
    img.onerror = () => {
      if (!cancelled) setFailed(true);
    };
    img.src = src;

    const first = new ResizeObserver(() => {
      first.disconnect();
      if (!cancelled) prepare(false);
    });
    first.observe(wrap);
    return () => {
      cancelled = true;
      first.disconnect();
    };
  }, [src, gradKey]);

  // The loop may come up after the image (or come back after a remount).
  React.useEffect(() => {
    if (status === "ready" && imgRef.current && !frameRef.current) {
      prepare(true);
    }
  });

  const bgMask =
    "radial-gradient(circle at 50% 50%, #000 0%, #000 30%, rgba(0,0,0,0.4) 55%, transparent 78%)";
  const ready = status === "ready" && loaded && !failed;
  const showCanvas = status === "ready" || status === "pending";

  return (
    <div
      data-slot="dot-halftone"
      data-status={failed ? "unsupported" : status}
      {...(alt
        ? { role: "img" as const, "aria-label": alt }
        : props["aria-labelledby"]
          ? { role: "img" as const }
          : { "aria-hidden": true as const })}
      className={cn("relative aspect-square w-full", className)}
      style={style}
      {...props}
    >
      <div
        aria-hidden="true"
        data-slot="dot-halftone-grid"
        className="pointer-events-none absolute"
        style={{
          inset: -40,
          backgroundImage: `radial-gradient(circle at 1px 1px, ${GRID} 1px, rgba(0,0,0,0) 1px)`,
          backgroundSize: "8px 8px",
          WebkitMaskImage: bgMask,
          maskImage: bgMask,
        }}
      />
      <div ref={wrapRef} className="absolute" style={{ inset: -24 }}>
        <canvas
          ref={canvasRef}
          data-slot="dot-halftone-canvas"
          className={cn("block size-full", !showCanvas && "hidden")}
        />
        <div
          data-slot="dot-halftone-fallback"
          className={cn(
            "pointer-events-none absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none",
            fallback === undefined && "mix-blend-multiply",
            ready && "opacity-0",
          )}
        >
          {fallback ?? (
            <HalftoneFallback src={failed ? "" : src} gradient={gradient} />
          )}
        </div>
      </div>
      <CornerDots color={accent ?? ACCENT} />
    </div>
  );
}
