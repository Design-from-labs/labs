"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

import {
  DITHER_PRESETS,
  type DitherCell,
  type DitherGradientType,
  type DitherMode,
  type DitherPattern,
  type DitherPresetName,
  type DitherSettings,
  type DitherShape,
  type DitherStyle,
  ditherGradientGrid,
  ditherImage,
} from "./vector-dither-core";

/*
 * A React wrapper (Design From Labs) around the vector dither core ported from
 * Shpigford/dither at commit 19125db21f58: https://github.com/Shpigford/dither.
 * The image sampling, the percentage normalization and the default settings
 * follow upstream's web app (packages/web/app.js); the SVG follows
 * packages/core/svg.js, as React elements.
 *
 * Copyright (c) 2026 Josh Pigford. MIT License; the full notice ends this file.
 */

// The core (presets, ditherImage, ditherGenerateSvg for an SVG string, ...)
// is exported from `./vector-dither-core`.

export interface VectorDitherGrid {
  /** Luminance per cell, 0 (dark) to 1 (light), rows of columns. */
  grid: number[][];
  cols: number;
  rows: number;
}

/**
 * Averages an image's luminance per `cellSize` square (upstream's web app,
 * processImage). The image must be loaded and readable (same origin or CORS).
 */
export function vectorDitherImageGrid(
  image: CanvasImageSource & { width: number; height: number },
  cellSize: number,
): VectorDitherGrid {
  const gridCols = Math.ceil(image.width / cellSize);
  const gridRows = Math.ceil(image.height / cellSize);

  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = image.width;
  tmpCanvas.height = image.height;
  const ctx = tmpCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("vector-dither: no 2D canvas");
  }
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, image.width, image.height).data;

  const grid = new Array<number[]>(gridRows);
  for (let gy = 0; gy < gridRows; gy++) {
    grid[gy] = new Array<number>(gridCols);
    for (let gx = 0; gx < gridCols; gx++) {
      let totalLum = 0;
      let count = 0;
      const startX = gx * cellSize;
      const startY = gy * cellSize;
      const endX = Math.min(startX + cellSize, image.width);
      const endY = Math.min(startY + cellSize, image.height);

      for (let py = startY; py < endY; py++) {
        for (let px = startX; px < endX; px++) {
          const i = (py * image.width + px) * 4;
          const lum =
            (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
          totalLum += lum;
          count++;
        }
      }
      grid[gy][gx] = count > 0 ? totalLum / count : 0;
    }
  }
  return { grid, cols: gridCols, rows: gridRows };
}

/**
 * Equal shares for `count` colors, the last taking the remainder (upstream's
 * color-count control).
 */
function equalPercentages(count: number): number[] {
  const percentages = new Array<number>(count).fill(Math.round(100 / count));
  percentages[count - 1] =
    100 - percentages.slice(0, -1).reduce((a, b) => a + b, 0);
  return percentages;
}

/** Makes the shares sum to 100 by adjusting the last (upstream's normalizePercentages). */
function normalizePercentages(input: readonly number[], count: number) {
  const percentages = Array.from({ length: count }, (_, i) => input[i] ?? 0);
  const sum = percentages.reduce((a, b) => a + b, 0);
  if (sum !== 100 && count > 0) {
    percentages[count - 1] = Math.max(0, percentages[count - 1] + (100 - sum));
  }
  return percentages;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** One cell's shape as an SVG element (upstream svgShape, same rounding). */
function Shape({
  shape,
  cx: centerX,
  cy: centerY,
  cellSize,
  sizeFactor,
}: {
  shape: string;
  cx: number;
  cy: number;
  cellSize: number;
  sizeFactor: number;
}) {
  const half = round2((cellSize / 2) * sizeFactor);
  const cx = round2(centerX);
  const cy = round2(centerY);
  switch (shape) {
    case "circle":
      return <circle cx={cx} cy={cy} r={half} />;
    case "square": {
      const s = round2(half * 2);
      return (
        <rect
          x={round2(cx - half)}
          y={round2(cy - half)}
          width={s}
          height={s}
        />
      );
    }
    case "diamond":
      return (
        <polygon
          points={[
            `${cx},${round2(cy - half)}`,
            `${round2(cx + half)},${cy}`,
            `${cx},${round2(cy + half)}`,
            `${round2(cx - half)},${cy}`,
          ].join(" ")}
        />
      );
    default:
      return null;
  }
}

/** Groups the dithered cells by color, as upstream generateSvg does. */
function groupCells(
  dithered: DitherCell[][],
  cols: number,
  rows: number,
  settings: DitherSettings,
) {
  const { cellSize, palette } = settings;
  const groups: { cx: number; cy: number; sizeFactor: number }[][] =
    palette.map(() => []);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = dithered[y][x];
      if (cell.colorIndex === palette.length - 1) continue;
      const cx = x * cellSize + cellSize / 2;
      const cy = y * cellSize + cellSize / 2;
      const sizeFactor = settings.style === "scaled" ? cell.size : 1.0;
      if (sizeFactor < 0.01) continue;
      groups[cell.colorIndex].push({ cx, cy, sizeFactor });
    }
  }
  return groups;
}

type Loaded =
  | { state: "none" }
  | { state: "loading"; src: string }
  | { state: "ready"; src: string; image: HTMLImageElement }
  | { state: "error"; src: string };

export interface VectorDitherProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  /**
   * An image to dither (read once with a 2D canvas, so same origin or CORS).
   * Without it a generated gradient is dithered.
   */
  src?: string;
  /** The generated source: "linear", "radial", "conic" or "noise". Default "linear". */
  gradient?: DitherGradientType;
  /** Angle of a linear or conic gradient source, in degrees. Default 45. */
  gradientAngle?: number;
  /** Width of the generated source in pixels. Default 1024. */
  width?: number;
  /** Height of the generated source in pixels. Default: the width (1:1). */
  height?: number;
  /** Threshold pattern. Default "bayer4". */
  pattern?: DitherPattern;
  /** Brightness overlay: none ("image"), "linear" or "radial". Default "image". */
  mode?: DitherMode;
  /** "threshold" (full cells) or "scaled" (cells sized by darkness). Default "threshold". */
  ditherStyle?: DitherStyle;
  /** Cell shape. Default "square". */
  shape?: DitherShape;
  /** Cell size in source pixels. Default 8. */
  cellSize?: number;
  /** Angle of the "linear" mode overlay, in degrees. Default 45. */
  angle?: number;
  /** Size of the "radial" mode overlay, in percent. Default 100. */
  scale?: number;
  /** Center offset of the "radial" mode overlay, -100 to 100. Default 0. */
  offsetX?: number;
  /** Center offset of the "radial" mode overlay, -100 to 100. Default 0. */
  offsetY?: number;
  /**
   * A preset ("bw", "green", "neon", "sepia") or colors from darkest to
   * lightest; the last color is the background. Default "green".
   */
  palette?: DitherPresetName | readonly string[];
  /** Share of the brightness range per color; normalized to sum to 100. */
  percentages?: readonly number[];
  /** Describes the picture. Without it the dither is decorative. */
  alt?: string;
  /** Shown while an image loads or if it cannot be read. */
  fallback?: React.ReactNode;
}

/**
 * Turns a gradient or an image into an ordered (Bayer) or pattern dither and
 * renders it as inline SVG: one shape per dark cell, grouped by color, crisp
 * at any size.
 */
export function VectorDither({
  src,
  gradient = "linear",
  gradientAngle = 45,
  width = 1024,
  height,
  pattern = "bayer4",
  mode = "image",
  ditherStyle = "threshold",
  shape = "square",
  cellSize = 8,
  angle = 45,
  scale = 100,
  offsetX = 0,
  offsetY = 0,
  palette = "green",
  percentages,
  alt,
  fallback,
  className,
  ...props
}: VectorDitherProps) {
  const [loaded, setLoaded] = React.useState<Loaded>({ state: "none" });

  React.useEffect(() => {
    if (!src) {
      setLoaded({ state: "none" });
      return;
    }
    let cancelled = false;
    setLoaded({ state: "loading", src });
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!cancelled) setLoaded({ state: "ready", src, image: img });
    };
    img.onerror = () => {
      if (!cancelled) setLoaded({ state: "error", src });
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  const image =
    src && loaded.state === "ready" && loaded.src === src ? loaded.image : null;
  const source = React.useMemo((): VectorDitherGrid | "error" | null => {
    if (src) {
      if (!image) return null;
      try {
        return vectorDitherImageGrid(image, cellSize);
      } catch {
        // A cross-origin image without CORS cannot be read.
        return "error";
      }
    }
    return ditherGradientGrid(
      gradient,
      width,
      cellSize,
      height ?? width,
      gradientAngle,
    );
  }, [src, image, cellSize, gradient, width, height, gradientAngle]);

  const colorsKey = typeof palette === "string" ? palette : palette.join(",");
  const percentagesKey = percentages?.join(",") ?? "";
  // biome-ignore lint/correctness/useExhaustiveDependencies: the keys stand for the arrays' values.
  const settings = React.useMemo((): DitherSettings => {
    const preset =
      typeof palette === "string"
        ? (DITHER_PRESETS[palette] ?? DITHER_PRESETS.green)
        : null;
    const colors = preset ? [...preset.colors] : [...palette];
    const shares = normalizePercentages(
      percentages ?? preset?.percentages ?? equalPercentages(colors.length),
      colors.length,
    );
    return {
      pattern,
      mode,
      style: ditherStyle,
      shape,
      cellSize,
      angle,
      scale,
      offsetX,
      offsetY,
      palette: colors,
      percentages: shares,
    };
  }, [
    pattern,
    mode,
    ditherStyle,
    shape,
    cellSize,
    angle,
    scale,
    offsetX,
    offsetY,
    colorsKey,
    percentagesKey,
  ]);

  const groups = React.useMemo(() => {
    if (!source || source === "error" || settings.palette.length === 0) {
      return null;
    }
    const dithered = ditherImage(
      source.grid,
      source.cols,
      source.rows,
      settings,
    );
    return groupCells(dithered, source.cols, source.rows, settings);
  }, [source, settings]);

  const failed = loaded.state === "error" || source === "error";
  const status = groups ? "ready" : failed ? "unsupported" : "pending";
  const a11y = alt
    ? { role: "img" as const, "aria-label": alt }
    : props["aria-labelledby"]
      ? { role: "img" as const }
      : { "aria-hidden": true as const };

  let picture: React.ReactNode;
  if (groups && source && source !== "error") {
    const svgWidth = source.cols * settings.cellSize;
    const svgHeight = source.rows * settings.cellSize;
    const colors = settings.palette;
    picture = (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        data-slot="vector-dither-svg"
        aria-hidden="true"
        className="block"
        // Inline, so the width and height attributes (kept from upstream's
        // markup) never win over the fluid size.
        style={{ width: "100%", height: "auto" }}
      >
        <rect width="100%" height="100%" fill={colors[colors.length - 1]} />
        {groups.slice(0, -1).map((cells, i) =>
          cells.length === 0 ? null : (
            <g key={i} fill={colors[i]} data-color={i}>
              {cells.map((cell, k) => (
                <Shape
                  key={k}
                  shape={settings.shape}
                  cx={cell.cx}
                  cy={cell.cy}
                  cellSize={settings.cellSize}
                  sizeFactor={cell.sizeFactor}
                />
              ))}
            </g>
          ),
        )}
      </svg>
    );
  } else {
    picture = (
      <div data-slot="vector-dither-fallback">
        {fallback ??
          (src && !failed ? (
            <img src={src} alt="" className="block h-auto w-full" />
          ) : (
            <div
              className="aspect-square w-full"
              style={{
                backgroundColor: settings.palette[settings.palette.length - 1],
              }}
            />
          ))}
      </div>
    );
  }

  return (
    <div
      data-slot="vector-dither"
      data-status={status}
      {...a11y}
      className={cn("relative w-full", className)}
      {...props}
    >
      {picture}
    </div>
  );
}
