"use client";

import * as React from "react";
import { useRenderLoop } from "@/lib/render-loop";
import { cn } from "@/lib/utils";
import {
  defaultSettings,
  HoloRenderer,
  loadStickerImage,
  type StickerSettings,
} from "./holo-sticker-renderer";

/*
 * Ported from jal-co/holosticker (src/components/StickerCanvas.tsx and the
 * component template in src/lib/react-export.ts), at commit 34688eb3fd29:
 * https://github.com/jal-co/holosticker.
 *
 * Copyright (c) 2026 Justin Levine. MIT License; the full notice ends this file.
 */

export type {
  Finish,
  HoloOverlay,
  HoloPattern,
  LayerMaterial,
  PeelDirection,
  StickerSettings,
} from "./holo-sticker-renderer";
export { defaultSettings as holoStickerDefaults } from "./holo-sticker-renderer";

export interface HoloStickerProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  /** The artwork: an SVG, PNG, JPG or WebP URL (a data URL works too). */
  src: string;
  /** Describes the artwork. Without it the sticker is decorative. */
  alt?: string;
  /** Overrides for any dial (finish, border, peel, foil...). */
  settings?: Partial<StickerSettings>;
  /** Tilt toward the pointer. Default true. */
  interactive?: boolean;
  /** A fixed tilt, x and y from -1 to 1, for stills. */
  tilt?: { x: number; y: number };
  /** Device pixel ratio cap. Default 2. */
  maxDpr?: number;
  /** Shown instead of the canvas without WebGL 2 or under reduced motion. */
  fallback?: React.ReactNode;
}

/** The static picture: the artwork with a die-cut edge and a foil sheen. */
function StickerFallback({ src, size }: { src: string; size: number }) {
  const inset = `${((1 - Math.min(size * 1.15, 1)) / 2) * 100}%`;
  const mask = {
    maskImage: `url("${src}")`,
    WebkitMaskImage: `url("${src}")`,
    maskSize: "contain",
    WebkitMaskSize: "contain",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskPosition: "center",
  } as React.CSSProperties;
  return (
    <div className="absolute grid place-items-center" style={{ inset }}>
      <img
        src={src}
        alt=""
        className="col-start-1 row-start-1 max-h-full max-w-full object-contain [filter:drop-shadow(0_0_1.5px_white)_drop-shadow(0_0_1.5px_white)_drop-shadow(0_0_3px_white)_drop-shadow(0_6px_10px_rgb(0_0_0/0.18))]"
      />
      <div
        className="col-start-1 row-start-1 size-full bg-[linear-gradient(115deg,#ff8ad8_0%,#8ad8ff_30%,#b8ff8a_55%,#ffe08a_75%,#ff8ad8_100%)] opacity-45 mix-blend-soft-light"
        style={mask}
      />
    </div>
  );
}

/**
 * A holographic foil sticker: your artwork die-cut with a border, printed on
 * view-dependent holofoil with a peeling corner, rendered with three.js and
 * tilting toward the pointer.
 */
export function HoloSticker({
  src,
  alt,
  settings,
  interactive = true,
  tilt,
  maxDpr = 2,
  fallback,
  className,
  onPointerMove,
  ...props
}: HoloStickerProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const aspect = React.useRef(1);
  const [image, setImage] = React.useState<ImageBitmap | null>(null);
  const merged = React.useMemo(
    () => ({ ...defaultSettings, ...settings }),
    [settings],
  );
  const current = React.useRef({ merged, tilt });
  current.current = { merged, tilt };

  const { status, handle, invalidate } = useRenderLoop<HoloRenderer>(
    canvasRef,
    {
      context: "webgl2",
      contextAttributes: {
        alpha: true,
        depth: true,
        stencil: false,
        antialias: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: true,
      },
      maxDpr,
      setup: (canvas, context) =>
        new HoloRenderer(canvas, context as WebGL2RenderingContext),
      dispose: (renderer) => renderer.dispose(),
      render: (renderer) => {
        const { merged: s, tilt: fixed } = current.current;
        if (fixed) renderer.setTilt(fixed.x, fixed.y);
        renderer.render({ settings: s, imgAspect: aspect.current });
      },
    },
  );

  // Load the artwork; the renderer rebuilds its die-cut maps from it.
  React.useEffect(() => {
    let cancelled = false;
    loadStickerImage(src)
      .then(({ bitmap, aspect: ratio }) => {
        if (cancelled) {
          bitmap.close();
          return;
        }
        aspect.current = ratio;
        setImage((previous) => {
          previous?.close();
          return bitmap;
        });
      })
      .catch(() => {
        if (!cancelled) setImage(null);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  React.useEffect(() => {
    if (status !== "ready") return;
    handle.current?.setImage(image);
    invalidate();
  }, [image, status, handle, invalidate]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    if (!interactive || tilt) return;
    const rect = event.currentTarget.getBoundingClientRect();
    handle.current?.setTilt(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((event.clientY - rect.top) / rect.height) * 2,
    );
  };

  const ready = status === "ready" && image !== null;
  const showCanvas = status === "ready" || status === "pending";
  return (
    <div
      data-slot="holo-sticker"
      data-status={status}
      {...(alt
        ? { role: "img" as const, "aria-label": alt }
        : props["aria-labelledby"]
          ? { role: "img" as const }
          : { "aria-hidden": true as const })}
      className={cn("relative aspect-square w-full overflow-hidden", className)}
      onPointerMove={handlePointerMove}
      {...props}
    >
      <canvas
        ref={canvasRef}
        data-slot="holo-sticker-canvas"
        className={cn("size-full touch-none", !showCanvas && "hidden")}
      />
      <div
        data-slot="holo-sticker-fallback"
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none",
          ready && "opacity-0",
        )}
      >
        {fallback ?? <StickerFallback src={src} size={merged.size} />}
      </div>
    </div>
  );
}
