"use client";

import * as React from "react";
import { useRenderLoop } from "@/lib/render-loop";
import { cn } from "@/lib/utils";
import {
  type HoloFoilLook,
  type HoloFoilMaterial,
  type HoloFoilPreset,
  HoloFoilScene,
  holoFoilParams,
  makeScratchBumpSource,
} from "./holo-foil-scene";

/*
 * Ported from dmitrykurash/holocloth (src/App.tsx and src/scene.ts), at
 * commit a6078ba698a5: https://github.com/dmitrykurash/holocloth.
 *
 * Copyright (c) 2026 Dmitry Kurash. MIT License; the full notice ends this file.
 */

export type {
  HoloFoilLook,
  HoloFoilMaterial,
  HoloFoilPreset,
} from "./holo-foil-scene";

export interface HoloFoilProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  /** The starting look: holographic foil, chrome, or black cloth. Default "holo". */
  preset?: HoloFoilPreset;
  /** Overrides for the material dials (color, rainbow, sparkle, finish, bump). */
  material?: Partial<HoloFoilMaterial>;
  /** Overrides for the camera look (background, exposure, bloom, grain...). */
  look?: Partial<HoloFoilLook>;
  /** A full-bleed image printed on the foil; it also sets the sheet's shape. */
  image?: string;
  /** Lean the sheet toward the pointer. Default true. */
  interactive?: boolean;
  /**
   * Freezes the film grain at this time, in seconds, and draws only when
   * something changes. Use it for stills and screenshots.
   */
  time?: number;
  /** Device pixel ratio cap. Default 2. */
  maxDpr?: number;
  /** Shown instead of the canvas without WebGL 2 or under reduced motion. */
  fallback?: React.ReactNode;
}

/** The static picture: a draped foil sheet in CSS. */
function FoilFallback() {
  return (
    <div className="absolute inset-0 grid place-items-center [perspective:900px]">
      <div className="h-[78%] w-[42%] rotate-[-8deg] rounded-[6%] bg-[conic-gradient(from_200deg_at_35%_40%,#7fd4ff,#c7a6ff,#ff9ad5,#ffd59a,#a6ffcf,#7fd4ff)] opacity-80 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)] [transform:rotateX(18deg)_rotateY(-24deg)]" />
    </div>
  );
}

/**
 * A sheet of holographic foil: rainbow diffraction that sweeps with the view
 * angle, sparkle, a scratched clear coat and soft bloom, rendered with
 * three.js. The sheet keeps a draped pose and leans toward the pointer.
 */
export function HoloFoil({
  preset = "holo",
  material,
  look,
  image,
  interactive = true,
  time,
  maxDpr = 2,
  fallback,
  className,
  onPointerMove,
  onPointerLeave,
  "aria-label": ariaLabel,
  style,
  ...props
}: HoloFoilProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const params = React.useMemo(
    () => holoFoilParams(preset, material, look),
    [preset, material, look],
  );
  const current = React.useRef({ params, time });
  current.current = { params, time };
  const fixed = time !== undefined;

  const { status, handle, invalidate } = useRenderLoop<HoloFoilScene>(
    canvasRef,
    {
      context: "webgl2",
      contextAttributes: {
        alpha: true,
        depth: true,
        stencil: false,
        antialias: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        powerPreference: "high-performance",
      },
      maxDpr,
      continuous: !fixed,
      setup: (canvas, context) => {
        const scene = new HoloFoilScene(
          canvas,
          context as WebGL2RenderingContext,
        );
        const { material: m, look: l } = current.current.params;
        scene.setBumpMap(makeScratchBumpSource(), m.bumpTiling);
        scene.applyParams(m, l);
        return scene;
      },
      resize: (scene, size) => scene.setSize(size.width, size.height, size.dpr),
      dispose: (scene) => scene.dispose(),
      render: (scene, frame) => {
        const t = current.current.time;
        scene.render(t ?? frame.time);
      },
    },
  );

  React.useEffect(() => {
    if (status !== "ready") return;
    handle.current?.applyParams(params.material, params.look);
    invalidate();
  }, [params, status, handle, invalidate]);

  React.useEffect(() => {
    const scene = handle.current;
    if (!scene || status !== "ready") return;
    if (!image) {
      scene.setClothImage(null);
      invalidate();
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      scene.setClothImage(img);
      invalidate();
    };
    img.src = image;
    return () => {
      cancelled = true;
    };
  }, [image, status, handle, invalidate]);

  // With a fixed `time` the foil draws on demand: after every render.
  React.useEffect(() => {
    invalidate();
  });

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    if (!interactive) return;
    const rect = event.currentTarget.getBoundingClientRect();
    handle.current?.setTilt(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((event.clientY - rect.top) / rect.height) * 2,
    );
    invalidate();
  };
  const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);
    if (!interactive) return;
    handle.current?.setTilt(0, 0);
    invalidate();
  };

  const labelled = Boolean(ariaLabel || props["aria-labelledby"]);
  const ready = status === "ready";
  // Keep the canvas laid out while the context is lost: a hidden canvas is
  // off screen to the loop's IntersectionObserver, so a restored context
  // would never draw again.
  const showCanvas = status !== "unsupported" && status !== "reduced-motion";
  return (
    <div
      data-slot="holo-foil"
      data-status={status}
      {...(labelled
        ? { role: "img" as const, "aria-label": ariaLabel }
        : { "aria-hidden": true as const })}
      className={cn(
        "relative aspect-[16/10] w-full overflow-hidden",
        className,
      )}
      style={{ backgroundColor: params.look.background, ...style }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...props}
    >
      <canvas
        ref={canvasRef}
        data-slot="holo-foil-canvas"
        className={cn("block size-full touch-none", !showCanvas && "hidden")}
      />
      <div
        data-slot="holo-foil-fallback"
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none",
          ready && "opacity-0",
        )}
      >
        {fallback ?? <FoilFallback />}
      </div>
    </div>
  );
}
