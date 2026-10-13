"use client";

import * as React from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useRenderLoop } from "@/lib/render-loop";
import { cn } from "@/lib/utils";

/*
 * Ported from obta1ner/lenticular (index.html), at commit fe6e33bbc585:
 * https://github.com/obta1ner/lenticular. The strip compositing, the barrier
 * grid and the pointer and tilt mapping are upstream's; the page chrome
 * (upload, settings and about panels) is left out.
 *
 * Copyright (c) 2025 obtainer. MIT License; the full notice ends this file.
 */

interface Picture {
  images: HTMLImageElement[];
  width: number;
  height: number;
}

interface Grid {
  gridWidth: number;
  rowHeight: number;
  rowOffset: number;
}

/** Interleaves the images in strips, row by row (upstream createComposite). */
function drawComposite(
  ctx: CanvasRenderingContext2D,
  { images, width, height }: Picture,
  { gridWidth, rowHeight, rowOffset }: Grid,
) {
  ctx.clearRect(0, 0, width, height);
  const numImages = images.length;
  const numStrips = Math.ceil(width / gridWidth) + 1;
  const sliceWidth = gridWidth / numImages;
  const numRows = Math.ceil(height / rowHeight);

  for (let row = 0; row < numRows; row++) {
    const y = row * rowHeight;
    const xShift = row % 2 === 0 ? 0 : rowOffset;

    for (let i = -1; i < numStrips; i++) {
      const xBase = i * gridWidth + xShift;

      for (let j = 0; j < numImages; j++) {
        const img = images[j];
        const dx = xBase + j * sliceWidth;

        // Center crop offset
        const offsetX = (img.width - width) / 2;
        const offsetY = (img.height - height) / 2;

        ctx.drawImage(
          img,
          offsetX + dx,
          offsetY + y,
          sliceWidth,
          rowHeight,
          dx,
          y,
          sliceWidth,
          rowHeight,
        );
      }
    }
  }
}

/** The black barrier grid, shifted by `offsetX` (upstream createBarrier). */
function drawBarrier(
  ctx: CanvasRenderingContext2D,
  { images, width, height }: Picture,
  { gridWidth, rowHeight, rowOffset }: Grid,
  offsetX: number,
  color: string,
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;

  const numImages = images.length;
  const sliceWidth = gridWidth / numImages;
  const barWidth = gridWidth - sliceWidth;
  const totalBars = Math.ceil(width / gridWidth) + 2;
  const numRows = Math.ceil(height / rowHeight);

  for (let row = 0; row < numRows; row++) {
    const y = row * rowHeight;
    const xShift = row % 2 === 0 ? 0 : rowOffset;

    for (let i = -1; i < totalBars; i++) {
      const x = i * gridWidth + offsetX + xShift;
      ctx.fillRect(x, y, barWidth, rowHeight);
    }
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

type OrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

export interface LenticularProps
  extends Omit<React.ComponentProps<"div">, "children" | "onChange"> {
  /** The views, in tilt order (left to right). Upstream uses three. */
  images: readonly string[];
  /** Strip pitch in image pixels: one strip of every view. Default 8. */
  gridWidth?: number;
  /** Height of a row of strips in image pixels. Default 40. */
  rowHeight?: number;
  /** Horizontal offset of every other row in image pixels. Default 4. */
  rowOffset?: number;
  /** How many view cycles one full sweep runs through. Default 1. */
  speed?: number;
  /** The phone tilt (degrees either way) that sweeps every view. Default 45. */
  maxAngle?: number;
  /**
   * What moves the views: the pointer across the whole window (upstream),
   * the pointer across the picture, or nothing (keyboard and `progress`
   * only). Default "window".
   */
  track?: "window" | "element" | "none";
  /** Follow the device's tilt on touch devices. Default true. */
  tilt?: boolean;
  /** Sweep position from 0 to 1. Set it to control the picture yourself. */
  progress?: number;
  /** Called with the sweep position whenever the pointer, tilt or keys move it. */
  onProgressChange?: (progress: number) => void;
}

/**
 * A lenticular picture: the views are cut into interleaved strips under a
 * barrier grid, and moving the pointer (or tilting the phone) slides the grid
 * so a different view shows through, like a printed lenticular sticker.
 */
export function Lenticular({
  images: sources,
  gridWidth = 8,
  rowHeight = 40,
  rowOffset = 4,
  speed = 1,
  maxAngle = 45,
  track = "window",
  tilt = true,
  progress,
  onProgressChange,
  className,
  "aria-label": ariaLabel = "Lenticular picture",
  onKeyDown,
  onPointerMove,
  ...props
}: LenticularProps) {
  const compositeRef = React.useRef<HTMLCanvasElement>(null);
  const barrierRef = React.useRef<HTMLCanvasElement>(null);
  const [picture, setPicture] = React.useState<Picture | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [input, setInput] = React.useState(progress ?? 0);
  const [needsPermission, setNeedsPermission] = React.useState(false);
  const reduceMotion = useReducedMotion();
  const value = progress ?? input;
  const grid = React.useMemo(
    () => ({ gridWidth, rowHeight, rowOffset }),
    [gridWidth, rowHeight, rowOffset],
  );
  const count = sources.length;
  const key = sources.join("\n");

  const state = React.useRef({ picture, grid, value, count, speed });
  state.current = { picture, grid, value, count, speed };
  const changeRef = React.useRef(onProgressChange);
  changeRef.current = onProgressChange;
  const setValue = React.useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(1, next));
    setInput(clamped);
    changeRef.current?.(clamped);
  }, []);

  // The barrier is redrawn on demand, only while the picture is on screen.
  const { status, invalidate } = useRenderLoop<CanvasRenderingContext2D>(
    barrierRef,
    {
      context: "2d",
      continuous: false,
      respectReducedMotion: false,
      setup: (_canvas, context) => context as CanvasRenderingContext2D,
      // The canvases keep the images' own pixel size (upstream init).
      resize: () => {},
      render: (ctx) => {
        const s = state.current;
        const canvas = barrierRef.current;
        if (!s.picture || !canvas) {
          return;
        }
        const color =
          getComputedStyle(canvas)
            .getPropertyValue("--lenticular-grid")
            .trim() || "black";
        // update(): progress = p * images * speed; shift = progress * gridWidth
        const shift = s.value * s.count * s.speed * s.grid.gridWidth;
        drawBarrier(ctx, s.picture, s.grid, shift % s.grid.gridWidth, color);
      },
    },
  );

  // Load every view, then size both canvases to the smallest (upstream init).
  // `key` stands for the list of sources, so a new array with the same URLs
  // does not reload them.
  React.useEffect(() => {
    let cancelled = false;
    setFailed(false);
    Promise.all(key.split("\n").map(loadImage))
      .then((images) => {
        if (cancelled) {
          return;
        }
        const width = Math.min(...images.map((img) => img.width));
        const height = Math.min(...images.map((img) => img.height));
        setPicture({ images, width, height });
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  React.useLayoutEffect(() => {
    const composite = compositeRef.current;
    const barrier = barrierRef.current;
    if (!picture || !composite || !barrier) {
      return;
    }
    for (const canvas of [composite, barrier]) {
      canvas.width = picture.width;
      canvas.height = picture.height;
    }
    const ctx = composite.getContext("2d");
    if (ctx) {
      drawComposite(ctx, picture, grid);
    }
    invalidate();
  }, [picture, grid, invalidate]);

  // Redraw the barrier after every render (the sweep, speed or views moved).
  React.useEffect(() => {
    invalidate();
  });

  // Pointer across the window (upstream handleMouse): p = clientX / innerWidth.
  React.useEffect(() => {
    if (track !== "window" || progress !== undefined || reduceMotion) {
      return;
    }
    const onMove = (event: MouseEvent) => {
      setValue(event.clientX / window.innerWidth);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [track, progress, reduceMotion, setValue]);

  // Device tilt (upstream handleOrientation), after permission where needed.
  const listenToTilt = React.useCallback(() => {
    const onOrientation = (event: DeviceOrientationEvent) => {
      const gamma = event.gamma || 0;
      const clamped = Math.max(-maxAngle, Math.min(maxAngle, gamma));
      setValue((clamped + maxAngle) / (maxAngle * 2));
    };
    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, [maxAngle, setValue]);
  const tiltCleanup = React.useRef<(() => void) | null>(null);
  React.useEffect(() => {
    const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (
      !tilt ||
      !touch ||
      progress !== undefined ||
      reduceMotion ||
      typeof DeviceOrientationEvent === "undefined"
    ) {
      setNeedsPermission(false);
      return;
    }
    const Orientation =
      DeviceOrientationEvent as OrientationEventWithPermission;
    if (typeof Orientation.requestPermission === "function") {
      setNeedsPermission(true);
    } else {
      tiltCleanup.current = listenToTilt();
    }
    return () => {
      tiltCleanup.current?.();
      tiltCleanup.current = null;
    };
  }, [tilt, progress, reduceMotion, listenToTilt]);
  const askForTilt = () => {
    const Orientation =
      DeviceOrientationEvent as OrientationEventWithPermission;
    Orientation.requestPermission?.().then((result) => {
      if (result === "granted") {
        tiltCleanup.current?.();
        tiltCleanup.current = listenToTilt();
        setNeedsPermission(false);
      }
    });
  };

  // Keyboard: each arrow press moves to the next view.
  const step = 1 / (Math.max(count, 1) * Math.max(count, 1) * speed);
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) {
      return;
    }
    // The sweep follows the physical pointer position, so the arrows do too
    // (in right-to-left pages as well): right moves as the pointer moving right.
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      next = value + step;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      next = value - step;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = 1;
    }
    if (next !== null) {
      event.preventDefault();
      setValue(next);
    }
  };
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    if (track !== "element" || progress !== undefined || reduceMotion) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setValue((event.clientX - rect.left) / rect.width);
  };

  // Which view shows through the gaps: the barrier leaves strip j open where
  // j = (offset / slice - 1) mod N.
  const slice = gridWidth / Math.max(count, 1);
  const offset = (value * count * speed * gridWidth) % gridWidth;
  const view =
    ((((Math.round(offset / slice) - 1) % count) + count) % count) + 1;

  const ready = picture !== null && status === "ready" && !failed;
  return (
    <div
      data-slot="lenticular"
      data-status={failed ? "unsupported" : status}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      aria-valuetext={`View ${view} of ${count}`}
      className={cn(
        "relative inline-block max-h-svh max-w-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      onKeyDown={handleKeyDown}
      onPointerMove={handlePointerMove}
      {...props}
    >
      <canvas
        ref={compositeRef}
        data-slot="lenticular-composite"
        className={cn(
          "relative z-[1] block h-auto max-h-[inherit] w-auto max-w-full [image-rendering:pixelated]",
          !ready && "hidden",
        )}
      />
      <canvas
        ref={barrierRef}
        data-slot="lenticular-barrier"
        className={cn(
          "pointer-events-none absolute inset-0 z-[2] block size-full [image-rendering:pixelated]",
          !ready && "invisible",
        )}
      />
      {!ready && sources[0] ? (
        // Before the strips are drawn, without a 2D canvas, or if a view
        // fails to load: the first view, still.
        <img
          src={sources[0]}
          alt=""
          aria-hidden="true"
          data-slot="lenticular-fallback"
          className="block h-auto max-h-[inherit] w-auto max-w-full"
        />
      ) : null}
      {needsPermission ? (
        <button
          type="button"
          data-slot="lenticular-tilt"
          onClick={askForTilt}
          className="absolute inset-x-0 bottom-3 z-[3] mx-auto w-fit rounded-full border bg-background/90 px-3 py-1.5 font-medium text-foreground text-xs shadow-sm outline-none backdrop-blur focus-visible:ring-2 focus-visible:ring-ring"
        >
          Tilt to play
        </button>
      ) : null}
    </div>
  );
}
