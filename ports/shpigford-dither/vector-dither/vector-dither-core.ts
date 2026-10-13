/*
 * Ported from Shpigford/dither (packages/core), at commit 19125db21f58:
 * https://github.com/Shpigford/dither. The six modules are merged in order,
 * each after an upstream marker, with their lines kept; TypeScript types are
 * added, the exports are renamed with a `dither` prefix at the end of the file
 * (the npm library re-exports every item file, so `PRESETS` or `generateSvg`
 * would collide), and two presets are renamed (see the fidelity notes).
 *
 * Copyright (c) 2026 Josh Pigford. MIT License; the full notice ends this file.
 */

export type DitherPattern =
  | 'bayer2'
  | 'bayer4'
  | 'bayer8'
  | 'halftone'
  | 'lines'
  | 'crosses'
  | 'dots'
  | 'grid'
  | 'scales';
export type DitherMode = 'image' | 'linear' | 'radial';
export type DitherStyle = 'threshold' | 'scaled';
export type DitherShape = 'circle' | 'square' | 'diamond';
export type DitherGradientType = 'linear' | 'radial' | 'conic' | 'noise';
export type DitherPresetName = 'bw' | 'green' | 'neon' | 'sepia';

export interface DitherSettings {
  pattern: DitherPattern | (string & {});
  mode: DitherMode | (string & {});
  style: DitherStyle | (string & {});
  shape: DitherShape | (string & {});
  cellSize: number;
  angle: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  /** Colors from darkest to lightest; the last one is the background. */
  palette: string[];
  /** Share of the brightness range per color, summing to 100. */
  percentages: number[];
}

export interface DitherCell {
  colorIndex: number;
  size: number;
}

// ---- upstream: packages/core/bayer.js ----
// Bayer threshold matrices for ordered dithering

const BAYER: Record<number, number[][]> = {
  2: [
    [0, 2],
    [3, 1]
  ],
  4: [
    [ 0,  8,  2, 10],
    [12,  4, 14,  6],
    [ 3, 11,  1,  9],
    [15,  7, 13,  5]
  ],
  8: (() => {
    const b4 = [
      [ 0,  8,  2, 10],
      [12,  4, 14,  6],
      [ 3, 11,  1,  9],
      [15,  7, 13,  5]
    ];
    const m = Array.from({length: 8}, () => new Array<number>(8));
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const bx = x % 4, by = y % 4;
        const quad = (y < 4 ? 0 : 2) + (x < 4 ? 0 : 1);
        const offsets = [0, 2, 3, 1];
        m[y][x] = 4 * b4[by][bx] + offsets[quad];
      }
    }
    return m;
  })()
};

// Normalized to 0–1 range
const BAYER_NORM: Record<string, number[][]> = {};
for (const [size, matrix] of Object.entries(BAYER)) {
  const n = parseInt(size);
  const max = n * n;
  BAYER_NORM[size] = matrix.map(row => row.map(v => (v + 0.5) / max));
}

// ---- upstream: packages/core/patterns.js ----

function getPatternThreshold(pattern: string, x: number, y: number, cellSize: number): number {
  const n = parseInt(pattern.replace('bayer', ''));
  if (BAYER_NORM[n]) {
    return BAYER_NORM[n][y % n][x % n];
  }

  const nx = (x % cellSize) / cellSize;
  const ny = (y % cellSize) / cellSize;
  const cx = 0.5, cy = 0.5;

  switch (pattern) {
    case 'halftone': {
      const dx = nx - cx, dy = ny - cy;
      return Math.sqrt(dx * dx + dy * dy) * 1.414;
    }
    case 'lines':
      return ny;
    case 'crosses': {
      const distX = Math.abs(nx - cx);
      const distY = Math.abs(ny - cy);
      return Math.min(distX, distY) * 2;
    }
    case 'dots': {
      const dx = nx - cx, dy = ny - cy;
      return Math.sqrt(dx * dx + dy * dy) * 1.414;
    }
    case 'grid': {
      const distX = Math.abs(nx - cx);
      const distY = Math.abs(ny - cy);
      return Math.max(distX, distY) * 2;
    }
    case 'scales': {
      const sx = (nx * 2) % 1;
      const sy = (ny * 2) % 1;
      const dx = sx - 0.5, dy = sy - 0.5;
      return Math.sqrt(dx * dx + dy * dy) * 1.414;
    }
    default:
      return 0.5;
  }
}

// ---- upstream: packages/core/dither.js ----

function ditherImage(luminanceGrid: number[][], cols: number, rows: number, settings: DitherSettings): DitherCell[][] {
  const { pattern, mode, style, cellSize, angle, scale: radialScale, offsetX, offsetY, palette, percentages } = settings;

  const result = new Array<DitherCell[]>(rows);
  const angleRad = (angle * Math.PI) / 180;

  for (let y = 0; y < rows; y++) {
    result[y] = new Array<DitherCell>(cols);
    for (let x = 0; x < cols; x++) {
      let brightness = luminanceGrid[y][x];

      const nx = x / cols;
      const ny = y / rows;

      if (mode === 'linear') {
        const gradient = (nx * Math.cos(angleRad) + ny * Math.sin(angleRad));
        brightness = brightness * 0.7 + gradient * 0.3;
        brightness = Math.max(0, Math.min(1, brightness));
      } else if (mode === 'radial') {
        const ox = offsetX / 100;
        const oy = offsetY / 100;
        const dx = nx - (0.5 + ox);
        const dy = ny - (0.5 + oy);
        const dist = Math.sqrt(dx * dx + dy * dy) * (radialScale / 100) * 2;
        brightness = brightness * 0.7 + dist * 0.3;
        brightness = Math.max(0, Math.min(1, brightness));
      }

      if (style === 'scaled') {
        const colorInfo = mapToColor(brightness, palette, percentages);
        result[y][x] = { colorIndex: colorInfo.index, size: 1 - brightness };
      } else {
        let threshold;
        if (pattern.startsWith('bayer')) {
          const n = parseInt(pattern.replace('bayer', ''));
          threshold = BAYER_NORM[n][y % n][x % n];
        } else {
          threshold = getPatternThreshold(pattern, x, y, Math.max(2, Math.floor(cellSize / 2)));
        }
        const adjusted = brightness + (threshold - 0.5) * 0.5;
        const colorInfo = mapToColor(Math.max(0, Math.min(1, adjusted)), palette, percentages);
        result[y][x] = { colorIndex: colorInfo.index, size: 1.0 };
      }
    }
  }

  return result;
}

function mapToColor(brightness: number, palette: string[], percentages: number[]): { index: number } {
  const n = palette.length;
  const cumulative = [];
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += percentages[i];
    cumulative.push(sum / 100);
  }

  for (let i = 0; i < n; i++) {
    if (brightness <= cumulative[i]) {
      return { index: i };
    }
  }
  return { index: n - 1 };
}

// ---- upstream: packages/core/svg.js ----

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function svgShape(shape: string, cx: number, cy: number, cellSize: number, sizeFactor: number): string | undefined {
  const half = round2((cellSize / 2) * sizeFactor);
  cx = round2(cx);
  cy = round2(cy);

  switch (shape) {
    case 'circle':
      return `<circle cx="${cx}" cy="${cy}" r="${half}"/>`;
    case 'square': {
      const x = round2(cx - half);
      const y = round2(cy - half);
      const s = round2(half * 2);
      return `<rect x="${x}" y="${y}" width="${s}" height="${s}"/>`;
    }
    case 'diamond': {
      const pts = [
        `${cx},${round2(cy - half)}`,
        `${round2(cx + half)},${cy}`,
        `${cx},${round2(cy + half)}`,
        `${round2(cx - half)},${cy}`
      ].join(' ');
      return `<polygon points="${pts}"/>`;
    }
  }
}

function generateSvg(luminanceGrid: number[][] | null | undefined, cols: number, rows: number, settings: DitherSettings): string {
  if (!luminanceGrid) return '';

  const cellSize = settings.cellSize;
  const dithered = ditherImage(luminanceGrid, cols, rows, settings);

  const width = cols * cellSize;
  const height = rows * cellSize;

  // Group cells by color
  const groups: Record<number, { cx: number; cy: number; sizeFactor: number }[]> = {};
  for (let i = 0; i < settings.palette.length; i++) {
    groups[i] = [];
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = dithered[y][x];
      if (cell.colorIndex === settings.palette.length - 1) continue;

      const cx = x * cellSize + cellSize / 2;
      const cy = y * cellSize + cellSize / 2;
      const sizeFactor = settings.style === 'scaled' ? cell.size : 1.0;

      if (sizeFactor < 0.01) continue;

      groups[cell.colorIndex].push({ cx, cy, sizeFactor });
    }
  }

  const bgColor = settings.palette[settings.palette.length - 1];
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`;
  svg += `  <rect width="100%" height="100%" fill="${bgColor}"/>\n`;

  for (let i = 0; i < settings.palette.length - 1; i++) {
    const cells = groups[i];
    if (cells.length === 0) continue;

    svg += `  <g fill="${settings.palette[i]}" id="color-${i}">\n`;
    for (const cell of cells) {
      svg += '    ' + svgShape(settings.shape, cell.cx, cell.cy, cellSize, cell.sizeFactor) + '\n';
    }
    svg += '  </g>\n';
  }

  svg += '</svg>';
  return svg;
}

// ---- upstream: packages/core/gradient.js ----
function pseudoNoise(x: number, y: number): number {
  let n = x * 374761393 + y * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  n = n ^ (n >> 16);
  return (n & 0x7fffffff) / 0x7fffffff;
}

function generateGradientGrid(type: DitherGradientType | (string & {}), size: number, cellSize: number, height?: number, angle?: number): { grid: number[][]; cols: number; rows: number } {
  const cols = Math.ceil(size / cellSize);
  const rows = Math.ceil((height || size) / cellSize);
  const angleRad = ((angle || 0) * Math.PI) / 180;

  const grid = new Array<number[]>(rows);
  for (let gy = 0; gy < rows; gy++) {
    grid[gy] = new Array<number>(cols);
    for (let gx = 0; gx < cols; gx++) {
      const nx = gx / (cols - 1 || 1);
      const ny = gy / (rows - 1 || 1);

      let lum;
      switch (type) {
        case 'linear': {
          // Project position onto the angle vector, then normalize to 0–1
          const raw = nx * Math.cos(angleRad) + ny * Math.sin(angleRad);
          // Normalize based on the max possible projection for this angle
          const maxProj = Math.abs(Math.cos(angleRad)) + Math.abs(Math.sin(angleRad));
          lum = maxProj > 0 ? raw / maxProj : 0;
          break;
        }
        case 'radial': {
          const dx = nx - 0.5, dy = ny - 0.5;
          lum = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);
          break;
        }
        case 'conic': {
          const a = Math.atan2(ny - 0.5, nx - 0.5) + angleRad;
          lum = ((a + Math.PI) % (2 * Math.PI)) / (2 * Math.PI);
          break;
        }
        case 'noise':
          lum = pseudoNoise(gx, gy);
          break;
        default:
          lum = nx;
      }
      grid[gy][gx] = lum;
    }
  }

  return { grid, cols, rows };
}

// ---- upstream: packages/core/palettes.js ----
// `gameboy` is `green` and `cga` is `neon` here (same colors and shares).
const PRESETS: Record<DitherPresetName, { colors: string[]; percentages: number[] }> = {
  bw:      { colors: ['#000000', '#ffffff'], percentages: [50, 50] },
  green:   { colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'], percentages: [25, 25, 25, 25] },
  neon:    { colors: ['#000000', '#55ffff', '#ff55ff', '#ffffff'], percentages: [25, 25, 25, 25] },
  sepia:   { colors: ['#2b1d0e', '#6b4226', '#c4956a', '#f5e6c8'], percentages: [25, 25, 25, 25] }
};

// ---- upstream: packages/core/index.js (exports, prefixed) ----
export {
  BAYER as DITHER_BAYER,
  BAYER_NORM as DITHER_BAYER_NORM,
  getPatternThreshold as ditherPatternThreshold,
  ditherImage,
  mapToColor as ditherMapToColor,
  generateSvg as ditherGenerateSvg,
  generateGradientGrid as ditherGradientGrid,
  PRESETS as DITHER_PRESETS,
};
