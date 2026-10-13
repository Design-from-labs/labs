// ---- upstream: src/core/types.ts ----

/** Attributes of an icon node (values as Lucide exports them: string or
 *  number). `undefined` is allowed on purpose — lucide's SVGProps includes it
 *  and the runtime treats an undefined attr as absent (fallback). */
export type IconNodeAttrs = Record<string, string | number | undefined>;

/** Lucide-style icon data: a `[tag, attrs]` list. Structurally typed —
 *  Lucide is neither a dependency nor a peer; other 24-unit sets and custom
 *  paths work just the same. */
export type IconNode = ReadonlyArray<readonly [string, IconNodeAttrs]>;

/** Input accepted by the core: an IconNode or a raw `d` attribute.
 *  (SVGElement is resolved in the dom layer — the core never touches DOM.) */
export type IconInput = IconNode | string;

/** Normalized subpath: a chain of cubics packed as points
 *  [p0, c1, c2, p1, c1', c2', p2, …] → Float64Array of length 2·(3m+1),
 *  with m = number of segments. Consecutive segments share an endpoint. */
export interface CubicPath {
  pts: Float64Array;
  closed: boolean;
}

/** Subpath sampled at N points by arc length + its topology. It is the
 *  currency between resample and plan; an intermediate shape (interruption)
 *  is also a list of Sampled. */
export interface Sampled {
  pts: Float64Array;
  closed: boolean;
}

/** Number of cubic segments in a CubicPath. */
export function segCount(path: CubicPath): number {
  return (path.pts.length / 2 - 1) / 3;
}

// ---- upstream: src/core/parse.ts ----

/* Parser for the `d` attribute (SVG path data). Resolves relative commands
   and shorthands (H/V → L, S/T → C/Q with control-point reflection) and
   returns raw subpaths with absolute commands. Supports implicit repetition,
   extra pairs after M (implicit lineto), packed arc flags and scientific
   notation. Conversion to cubics lives in normalize.ts. */

/** Raw absolute segment (shorthands already resolved), as a labeled tuple —
 *  compact in the bundle (no object keys the minifier can't mangle). */
export type RawSeg =
  | readonly ["L", x: number, y: number]
  | readonly ["C", x1: number, y1: number, x2: number, y2: number, x: number, y: number]
  | readonly ["Q", x1: number, y1: number, x: number, y: number]
  | readonly [
      "A",
      rx: number,
      ry: number,
      rotDeg: number,
      large: 0 | 1,
      sweep: 0 | 1,
      x: number,
      y: number,
    ];

export interface RawSubpath {
  x0: number;
  y0: number;
  segs: RawSeg[];
  closed: boolean;
}

const COMMANDS = "MmLlHhVvCcSsQqTtAaZz";

export function parsePath(d: string): RawSubpath[] {
  const subs: RawSubpath[] = [];
  const n = d.length;
  let i = 0;
  let cx = 0; // current point
  let cy = 0;
  let sx = 0; // start of the current subpath
  let sy = 0;
  let cur: RawSubpath | null = null;
  let cmd = "";
  let px = 0; // last control point (S/T reflection)
  let py = 0;
  let prev: "C" | "Q" | "" = "";
  let started = false; // the first command must be M/m

  const err = (msg: string): never => {
    throw new Error(`morphicons: ${msg} at d[${i}]`);
  };

  const isDigit = (c: number) => c >= 48 && c <= 57;

  const skip = () => {
    while (i < n) {
      const c = d.charCodeAt(i);
      if (c === 32 || c === 9 || c === 10 || c === 13 || c === 12 || c === 44) i++;
      else break;
    }
  };

  const num = (): number => {
    skip();
    const start = i;
    if (i < n && (d[i] === "+" || d[i] === "-")) i++;
    let dig = false;
    while (i < n && isDigit(d.charCodeAt(i))) {
      i++;
      dig = true;
    }
    if (i < n && d[i] === ".") {
      i++;
      while (i < n && isDigit(d.charCodeAt(i))) {
        i++;
        dig = true;
      }
    }
    if (!dig) err("expected number");
    if (i < n && (d[i] === "e" || d[i] === "E")) {
      const save = i;
      i++;
      if (i < n && (d[i] === "+" || d[i] === "-")) i++;
      let ed = false;
      while (i < n && isDigit(d.charCodeAt(i))) {
        i++;
        ed = true;
      }
      if (!ed) i = save; // dangling "e": not an exponent
    }
    return Number(d.slice(start, i));
  };

  // Arc flag: a single 0|1 character; accepts the packed form "011 1".
  const flag = (): 0 | 1 => {
    skip();
    const c = d[i];
    if (c === "0" || c === "1") {
      i++;
      return c === "1" ? 1 : 0;
    }
    return err("expected arc flag (0|1)");
  };

  // Subpath in progress; after Z, a drawing command opens a new one at (sx, sy).
  const open = (): RawSubpath => {
    if (!started) err("path must start with M/m");
    if (!cur) {
      cur = { x0: cx, y0: cy, segs: [], closed: false };
      subs.push(cur);
    }
    return cur;
  };

  // Relatives: nx/ny add the current point, which is not updated until the
  // command finishes — all pairs of a relative C/S/Q refer to the same origin.
  let rel = false;
  const nx = () => num() + (rel ? cx : 0);
  const ny = () => num() + (rel ? cy : 0);

  while (true) {
    skip();
    if (i >= n) break;
    const ch = d[i] as string;
    if (COMMANDS.includes(ch)) {
      cmd = ch;
      i++;
    } else if (cmd === "") {
      err("path must start with M/m");
    } else if (cmd === "M") {
      cmd = "L"; // extra pairs after M → implicit lineto
    } else if (cmd === "m") {
      cmd = "l";
    } else if (cmd === "Z" || cmd === "z") {
      err("stray data after Z");
    }
    rel = cmd >= "a";

    switch (rel ? cmd.toUpperCase() : cmd) {
      case "M": {
        started = true;
        const x = nx();
        const y = ny();
        cx = x;
        cy = y;
        sx = x;
        sy = y;
        cur = { x0: x, y0: y, segs: [], closed: false };
        subs.push(cur);
        prev = "";
        break;
      }
      case "L": {
        const x = nx();
        const y = ny();
        open().segs.push(["L", x, y]);
        cx = x;
        cy = y;
        prev = "";
        break;
      }
      case "H": {
        const x = nx();
        open().segs.push(["L", x, cy]);
        cx = x;
        prev = "";
        break;
      }
      case "V": {
        const y = ny();
        open().segs.push(["L", cx, y]);
        cy = y;
        prev = "";
        break;
      }
      case "C":
      case "S": {
        let x1: number;
        let y1: number;
        if (cmd === "C" || cmd === "c") {
          x1 = nx();
          y1 = ny();
        } else {
          x1 = prev === "C" ? 2 * cx - px : cx; // reflect previous control point
          y1 = prev === "C" ? 2 * cy - py : cy;
        }
        const x2 = nx();
        const y2 = ny();
        const x = nx();
        const y = ny();
        open().segs.push(["C", x1, y1, x2, y2, x, y]);
        px = x2;
        py = y2;
        cx = x;
        cy = y;
        prev = "C";
        break;
      }
      case "Q":
      case "T": {
        let x1: number;
        let y1: number;
        if (cmd === "Q" || cmd === "q") {
          x1 = nx();
          y1 = ny();
        } else {
          x1 = prev === "Q" ? 2 * cx - px : cx;
          y1 = prev === "Q" ? 2 * cy - py : cy;
        }
        const x = nx();
        const y = ny();
        open().segs.push(["Q", x1, y1, x, y]);
        px = x1;
        py = y1;
        cx = x;
        cy = y;
        prev = "Q";
        break;
      }
      case "A": {
        const rx = num();
        const ry = num();
        const rot = num();
        const large = flag();
        const sweep = flag();
        const x = nx();
        const y = ny();
        open().segs.push(["A", rx, ry, rot, large, sweep, x, y]);
        cx = x;
        cy = y;
        prev = "";
        break;
      }
      case "Z": {
        if (cur) {
          cur.closed = true;
          cur = null;
        }
        cx = sx;
        cy = sy;
        prev = "";
        break;
      }
      default:
        err(`unsupported command "${cmd}"`);
    }
  }

  return subs.filter((s) => s.segs.length > 0);
}

// ---- upstream: src/core/serialize.ts ----

/* Serialization. In flight each subpath is emitted as a polyline
   `M x y L x y …` with 2 decimals — invisible at 24px, and Math.round is
   faster than toFixed. It is the frame's only allocation. On settle, the
   driver snaps to the target icon's canonical `d` (exact fidelity at rest). */


function fmt(v: number): string {
  return String(Math.round(v * 100) / 100);
}

/** Sampled subpaths → polyline `d` attribute. `closed[k]` appends Z to
 *  subpath k (closed loops in flight); without flags everything is open. */
export function serialize(
  subs: readonly Float64Array[],
  closed?: readonly boolean[],
): string {
  let d = "";
  for (let k = 0; k < subs.length; k++) {
    const o = subs[k];
    const n = o.length / 2;
    d += `M${fmt(o[0])} ${fmt(o[1])}`;
    for (let i = 1; i < n; i++) d += `L${fmt(o[2 * i])} ${fmt(o[2 * i + 1])}`;
    if (closed?.[k]) d += "Z";
  }
  return d;
}

/* Canonical emission uses 4 decimals instead: still invisible at 24px, but
   here the point is byte stability, not size. Arc→cubic conversion goes
   through trig whose last ulp differs across JS engines (V8 vs JSC), and SSR
   hydration compares the server's d against the browser's byte by byte —
   full-precision tails made those differ (Next hydration mismatch on icons
   with non-cardinal arcs, e.g. lucide's eye). Quantization absorbs the ulp;
   parse → emit round-trips within 5e-5 (pinned in normalize.test.ts). */
function fmtCanon(v: number): string {
  return String(Math.round(v * 1e4) / 1e4);
}

/** Cubic subpaths → canonical `d`, quantized to 4 decimals (engine-stable
 *  bytes; see fmtCanon). */
export function cubicsToPathD(paths: readonly CubicPath[]): string {
  let d = "";
  for (const { pts, closed } of paths) {
    d += `M${fmtCanon(pts[0])} ${fmtCanon(pts[1])}`;
    for (let i = 2; i < pts.length; i += 6) {
      d += `C${fmtCanon(pts[i])} ${fmtCanon(pts[i + 1])} ${fmtCanon(pts[i + 2])} ${fmtCanon(
        pts[i + 3],
      )} ${fmtCanon(pts[i + 4])} ${fmtCanon(pts[i + 5])}`;
    }
    if (closed) d += "Z";
  }
  return d;
}

// ---- upstream: src/core/normalize.ts ----

/* Normalization: any SVG primitive → cubic Bézier segments.
   Line → collinear controls at ⅓ and ⅔. Quadratic → exact degree elevation.
   Arc → center parametrization (SVG spec F.6), slices ≤ 90°, α = 4/3·tan(Δθ/4).
   circle/ellipse/rect/polyline/polygon → lines and quarter ellipses. */


/** Control-point offset for a quarter circle: (4/3)·tan(π/8) ≈ 0.5523. */
export const KAPPA = (4 / 3) * Math.tan(Math.PI / 8);

const TAU = 2 * Math.PI;

/** Operations of a cubic accumulator, as a tuple — destructuring them yields
 *  local names the minifier can rename (a class method cannot be). */
type BuilderOps = readonly [
  cubic: (x1: number, y1: number, x2: number, y2: number, x: number, y: number) => void,
  line: (x: number, y: number) => void,
  quad: (x1: number, y1: number, x: number, y: number) => void,
  arc: (
    rx: number,
    ry: number,
    rotDeg: number,
    large: 0 | 1,
    sweep: 0 | 1,
    x: number,
    y: number,
  ) => void,
  finish: (closed: boolean) => CubicPath | null,
];

function builder(x0: number, y0: number): BuilderOps {
  const pts: number[] = [x0, y0];
  let cx = x0; // current point
  let cy = y0;

  const cubic = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x: number,
    y: number,
  ): void => {
    pts.push(x1, y1, x2, y2, x, y);
    cx = x;
    cy = y;
  };

  const line = (x: number, y: number): void => {
    if (Math.abs(x - cx) < 1e-12 && Math.abs(y - cy) < 1e-12) return; // degenerate
    cubic(
      cx + (x - cx) / 3,
      cy + (y - cy) / 3,
      cx + (2 * (x - cx)) / 3,
      cy + (2 * (y - cy)) / 3,
      x,
      y,
    );
  };

  const quad = (x1: number, y1: number, x: number, y: number): void => {
    cubic(
      cx + (2 / 3) * (x1 - cx),
      cy + (2 / 3) * (y1 - cy),
      x + (2 / 3) * (x1 - x),
      y + (2 / 3) * (y1 - y),
      x,
      y,
    );
  };

  // Elliptical arc → cubics. Endpoint → center per SVG spec, appendix F.6.
  const arc = (
    rx0: number,
    ry0: number,
    rotDeg: number,
    large: 0 | 1,
    sweep: 0 | 1,
    x: number,
    y: number,
  ): void => {
    const x1 = cx;
    const y1 = cy;
    if (Math.abs(x - x1) < 1e-12 && Math.abs(y - y1) < 1e-12) return; // F.6.2
    let rx = Math.abs(rx0);
    let ry = Math.abs(ry0);
    if (rx < 1e-12 || ry < 1e-12) {
      line(x, y); // F.6.6: zero radius → line
      return;
    }
    const phi = (rotDeg * Math.PI) / 180;
    const cosP = Math.cos(phi);
    const sinP = Math.sin(phi);
    const hx = (x1 - x) / 2;
    const hy = (y1 - y) / 2;
    const x1p = cosP * hx + sinP * hy;
    const y1p = -sinP * hx + cosP * hy;
    // F.6.6: scale up insufficient radii
    const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lam > 1) {
      const s = Math.sqrt(lam);
      rx *= s;
      ry *= s;
    }
    // F.6.5: center
    const rx2 = rx * rx;
    const ry2 = ry * ry;
    const xp2 = x1p * x1p;
    const yp2 = y1p * y1p;
    let rad = (rx2 * ry2 - rx2 * yp2 - ry2 * xp2) / (rx2 * yp2 + ry2 * xp2);
    if (rad < 0) rad = 0;
    const co = (large === sweep ? -1 : 1) * Math.sqrt(rad);
    const cxp = (co * rx * y1p) / ry;
    const cyp = (-co * ry * x1p) / rx;
    const ccx = cosP * cxp - sinP * cyp + (x1 + x) / 2;
    const ccy = sinP * cxp + cosP * cyp + (y1 + y) / 2;
    const th1 = Math.atan2((y1p - cyp) / ry, (x1p - cxp) / rx);
    let dth = Math.atan2((-y1p - cyp) / ry, (-x1p - cxp) / rx) - th1;
    if (sweep === 0 && dth > 0) dth -= TAU;
    else if (sweep === 1 && dth < 0) dth += TAU;
    // Slice into arcs ≤ 90°, each slice to a cubic with α = 4/3·tan(δ/4)
    const slices = Math.max(1, Math.ceil(Math.abs(dth) / (Math.PI / 2) - 1e-9));
    const delta = dth / slices;
    const alpha = (4 / 3) * Math.tan(delta / 4);
    const ex = (t: number) => ccx + rx * Math.cos(t) * cosP - ry * Math.sin(t) * sinP;
    const ey = (t: number) => ccy + rx * Math.cos(t) * sinP + ry * Math.sin(t) * cosP;
    const dx = (t: number) => -rx * Math.sin(t) * cosP - ry * Math.cos(t) * sinP;
    const dy = (t: number) => -rx * Math.sin(t) * sinP + ry * Math.cos(t) * cosP;
    let t0 = th1;
    let p0x = x1;
    let p0y = y1;
    for (let s = 1; s <= slices; s++) {
      const t1 = th1 + delta * s;
      const p1x = s === slices ? x : ex(t1); // exact final endpoint, no fp drift
      const p1y = s === slices ? y : ey(t1);
      cubic(
        p0x + alpha * dx(t0),
        p0y + alpha * dy(t0),
        p1x - alpha * dx(t1),
        p1y - alpha * dy(t1),
        p1x,
        p1y,
      );
      t0 = t1;
      p0x = p1x;
      p0y = p1y;
    }
  };

  const finish = (closed: boolean): CubicPath | null => {
    if (closed) line(pts[0], pts[1]); // explicit closing segment if needed
    if (pts.length < 8) return null; // no real segments
    return { pts: Float64Array.from(pts), closed };
  };

  return [cubic, line, quad, arc, finish];
}

function lowerSubpath(raw: RawSubpath): CubicPath | null {
  const [cubic, line, quad, arc, finish] = builder(raw.x0, raw.y0);
  for (const s of raw.segs) {
    switch (s[0]) {
      case "L":
        line(s[1], s[2]);
        break;
      case "C":
        cubic(s[1], s[2], s[3], s[4], s[5], s[6]);
        break;
      case "Q":
        quad(s[1], s[2], s[3], s[4]);
        break;
      case "A":
        arc(s[1], s[2], s[3], s[4], s[5], s[6], s[7]);
        break;
    }
  }
  return finish(raw.closed);
}

function attrNum(attrs: IconNodeAttrs, key: string, fallback = 0): number {
  const v = attrs[key];
  if (v === undefined) return fallback;
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function parsePoints(v: string | number | undefined): number[] {
  const s = String(v ?? "").trim();
  if (!s) return [];
  const nums = s.split(/[\s,]+/).map(Number);
  if (nums.some((x) => !Number.isFinite(x)))
    throw new Error(`morphicons: invalid points: "${s}"`);
  return nums;
}

function polyPath(nums: number[], closed: boolean): CubicPath | null {
  if (nums.length < 4) return null;
  const [, line, , , finish] = builder(nums[0], nums[1]);
  for (let i = 2; i + 1 < nums.length; i += 2) line(nums[i], nums[i + 1]);
  return finish(closed);
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): CubicPath | null {
  if (rx < 1e-12 || ry < 1e-12) return null;
  const kx = KAPPA * rx;
  const ky = KAPPA * ry;
  const e = cx + rx; // east
  const w = cx - rx; // west
  const s = cy + ry; // south
  const n = cy - ry; // north
  const [cubic, , , , finish] = builder(e, cy);
  cubic(e, cy + ky, cx + kx, s, cx, s);
  cubic(cx - kx, s, w, cy + ky, w, cy);
  cubic(w, cy - ky, cx - kx, n, cx, n);
  cubic(cx + kx, n, e, cy - ky, e, cy);
  return finish(true);
}

function rectPath(attrs: IconNodeAttrs): CubicPath | null {
  const x = attrNum(attrs, "x");
  const y = attrNum(attrs, "y");
  const w = attrNum(attrs, "width");
  const h = attrNum(attrs, "height");
  if (w < 1e-12 || h < 1e-12) return null;
  // SVG rules: rx/ry copy each other when only one is given; clamp to half the side.
  let rx = attrNum(attrs, "rx", Number.NaN);
  let ry = attrNum(attrs, "ry", Number.NaN);
  if (Number.isNaN(rx)) rx = Number.isNaN(ry) ? 0 : ry;
  if (Number.isNaN(ry)) ry = rx;
  rx = Math.min(Math.max(rx, 0), w / 2);
  ry = Math.min(Math.max(ry, 0), h / 2);
  if (rx < 1e-12 || ry < 1e-12) {
    return polyPath([x, y, x + w, y, x + w, y + h, x, y + h], true);
  }
  // Coordinates of the straight↔arc joints of each rounded corner.
  const xa = x + rx;
  const xb = x + w - rx;
  const xr = x + w;
  const ya = y + ry;
  const yb = y + h - ry;
  const yd = y + h;
  const kx = KAPPA * rx;
  const ky = KAPPA * ry;
  const [cubic, line, , , finish] = builder(xa, y);
  line(xb, y);
  cubic(xb + kx, y, xr, ya - ky, xr, ya);
  line(xr, yb);
  cubic(xr, yb + ky, xb + kx, yd, xb, yd);
  line(xa, yd);
  cubic(xa - kx, yd, x, yb + ky, x, yb);
  line(x, ya);
  cubic(x, ya - ky, xa - kx, y, xa, y);
  return finish(true);
}

/** Icon (IconNode or `d` string) → list of cubic subpaths. */
export function iconToCubics(input: IconInput): CubicPath[] {
  const out: CubicPath[] = [];
  const push = (p: CubicPath | null) => {
    if (p) out.push(p);
  };
  if (typeof input === "string") {
    for (const s of parsePath(input)) push(lowerSubpath(s));
    return out;
  }
  for (const [tag, attrs] of input) {
    switch (tag) {
      case "path":
        for (const s of parsePath(String(attrs.d ?? ""))) push(lowerSubpath(s));
        break;
      case "line": {
        const [, line, , , finish] = builder(attrNum(attrs, "x1"), attrNum(attrs, "y1"));
        line(attrNum(attrs, "x2"), attrNum(attrs, "y2"));
        push(finish(false));
        break;
      }
      case "circle": {
        const r = attrNum(attrs, "r");
        push(ellipsePath(attrNum(attrs, "cx"), attrNum(attrs, "cy"), r, r));
        break;
      }
      case "ellipse":
        push(
          ellipsePath(
            attrNum(attrs, "cx"),
            attrNum(attrs, "cy"),
            attrNum(attrs, "rx"),
            attrNum(attrs, "ry"),
          ),
        );
        break;
      case "rect":
        push(rectPath(attrs));
        break;
      case "polyline":
        push(polyPath(parsePoints(attrs.points), false));
        break;
      case "polygon":
        push(polyPath(parsePoints(attrs.points), true));
        break;
      default:
        throw new Error(`morphicons: unsupported tag <${tag}>`);
    }
  }
  return out;
}

/** A source viewBox: `24`, `"0 0 20 20"` or `[minX, minY, w, h]`. */
export type ViewBox = number | string | readonly [number, number, number, number];

function parseViewBox(vb: ViewBox): [number, number, number, number] {
  const v =
    typeof vb === "number"
      ? [0, 0, vb, vb]
      : typeof vb === "string"
        ? vb
            .trim()
            .split(/[\s,]+/)
            .map(Number)
        : vb;
  const [minX, minY, w, h] = v as number[];
  if (
    v.length !== 4 ||
    !(w > 0) ||
    !(h > 0) ||
    !Number.isFinite(minX) ||
    !Number.isFinite(minY)
  )
    throw new Error(`morphicons: invalid viewBox "${String(vb)}"`);
  return [minX, minY, w, h];
}

/** Re-grids an icon drawn on `viewBox` onto the shared `grid` (24 by default),
 *  centred and preserving aspect ratio — the SVG `xMidYMid meet` rule.
 *
 *  Both endpoints of a morph must live on the same coordinate space. Lucide and
 *  other 24-unit sets already draw on 24×24; packs drawn on 20 or 32 units
 *  do not, and mixing them unfitted makes Procrustes read the scale/offset gap
 *  as rotation. Apply once at module scope (not per render) and pass the
 *  resulting `d` anywhere an icon is accepted. */
export function fitIcon(input: IconInput, viewBox: ViewBox, grid = 24): string {
  const [minX, minY, w, h] = parseViewBox(viewBox);
  const s = Math.min(grid / w, grid / h);
  const tx = (grid - w * s) / 2 - minX * s;
  const ty = (grid - h * s) / 2 - minY * s;
  const paths = iconToCubics(input);
  for (const { pts } of paths) {
    for (let i = 0; i < pts.length; i += 2) {
      pts[i] = pts[i] * s + tx;
      pts[i + 1] = pts[i + 1] * s + ty;
    }
  }
  return cubicsToPathD(paths);
}

// ---- upstream: src/core/resample.ts ----

/* Arc-length resampling with anchored corners.
   The length of a cubic has no closed form: |B′(t)| is integrated with
   8-point Gauss-Legendre. Corners (tangent discontinuity above an angular
   threshold) are anchored as exact sample points; the remaining points are
   distributed by arc length between corners — integer apportionment by
   largest remainder, minimum 1 interval per run, summing exactly to N−1
   (N if closed). */


/** Default angular threshold for a segment joint to count as a corner. */
export const CORNER_THRESHOLD = Math.PI / 8; // 22.5°

// Gauss-Legendre, 8 points on [−1, 1] — symmetric nodes: only half is stored.
const GX = [
  0.18343464249564978, 0.525532409916329, 0.7966664774136267, 0.9602898564975363,
];
const GW = [
  0.362683783378362, 0.31370664587788727, 0.22238103445337448, 0.10122853629037626,
];

// |B′(t)| of segment k. B′(t) = 3(1−t)²(P₁−P₀) + 6(1−t)t(P₂−P₁) + 3t²(P₃−P₂).
function speed(p: Float64Array, k: number, t: number): number {
  const i = 6 * k;
  const u = 1 - t;
  const c0 = 3 * u * u;
  const c1 = 6 * u * t;
  const c2 = 3 * t * t;
  const dx =
    c0 * (p[i + 2] - p[i]) + c1 * (p[i + 4] - p[i + 2]) + c2 * (p[i + 6] - p[i + 4]);
  const dy =
    c0 * (p[i + 3] - p[i + 1]) + c1 * (p[i + 5] - p[i + 3]) + c2 * (p[i + 7] - p[i + 5]);
  return Math.hypot(dx, dy);
}

// ∫₀^t1 |B′| of segment k via Gauss-Legendre.
function segLen(p: Float64Array, k: number, t1 = 1): number {
  const half = t1 / 2;
  let s = 0;
  for (let j = 0; j < 4; j++)
    s += GW[j] * (speed(p, k, half + half * GX[j]) + speed(p, k, half - half * GX[j]));
  return s * half;
}

// Bernstein evaluation of segment k at t → (out[o], out[o+1]).
function point(
  p: Float64Array,
  k: number,
  t: number,
  out: Float64Array,
  o: number,
): void {
  const i = 6 * k;
  const u = 1 - t;
  const b0 = u * u * u;
  const b1 = 3 * u * u * t;
  const b2 = 3 * u * t * t;
  const b3 = t * t * t;
  out[o] = b0 * p[i] + b1 * p[i + 2] + b2 * p[i + 4] + b3 * p[i + 6];
  out[o + 1] = b0 * p[i + 1] + b1 * p[i + 3] + b2 * p[i + 5] + b3 * p[i + 7];
}

// Tangent at an endpoint of segment k. atEnd: outgoing at P₃ (P₃−P₂);
// otherwise incoming at P₀ (P₁−P₀). Falls back to the next control point
// when degenerate.
function tangent(
  p: Float64Array,
  k: number,
  atEnd: boolean,
): readonly [number, number] | null {
  const i = 6 * k;
  const b = atEnd ? i + 6 : i; // base point (endpoint)
  const s = atEnd ? -1 : 1;
  for (const j of atEnd ? [4, 2, 0] : [2, 4, 6]) {
    const dx = s * (p[i + j] - p[b]);
    const dy = s * (p[i + j + 1] - p[b + 1]);
    if (dx * dx + dy * dy > 1e-18) return [dx, dy];
  }
  return null;
}

/** Segment boundaries (index of the segment starting at the corner) whose
 *  tangent discontinuity exceeds the threshold. For closed paths this
 *  includes the closing joint (boundary = first active segment). */
export function detectCorners(path: CubicPath, threshold = CORNER_THRESHOLD): number[] {
  const p = path.pts;
  const m = (p.length / 2 - 1) / 3;
  const active: number[] = [];
  for (let k = 0; k < m; k++) if (segLen(p, k) > 1e-9) active.push(k);
  if (active.length === 0) return [];
  const corners = new Set<number>();
  const test = (a: number, b: number) => {
    const u = tangent(p, a, true);
    const v = tangent(p, b, false);
    if (!u || !v) return;
    const ang = Math.abs(
      Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]),
    );
    if (ang > threshold) corners.add(b);
  };
  for (let j = 0; j + 1 < active.length; j++) test(active[j], active[j + 1]);
  if (path.closed && active.length > 1) test(active[active.length - 1], active[0]);
  return [...corners].sort((a, b) => a - b);
}

/** Total arc length of the subpath (per-segment Gauss-Legendre). */
export function arcLength(path: CubicPath): number {
  const m = (path.pts.length / 2 - 1) / 3;
  let L = 0;
  for (let k = 0; k < m; k++) L += segLen(path.pts, k);
  return L;
}

// Arc-length inversion: t such that ∫₀^t |B′| = s. Safeguarded Newton with
// a bisection bracket; |B′| is the exact derivative of the objective.
function invert(p: Float64Array, k: number, s: number, ls: number): number {
  if (s <= 0) return 0;
  if (s >= ls) return 1;
  let lo = 0;
  let hi = 1;
  let t = s / ls;
  for (let it = 0; it < 12; it++) {
    const f = segLen(p, k, t) - s;
    if (Math.abs(f) < 1e-10 * ls + 1e-14) break;
    if (f > 0) hi = t;
    else lo = t;
    const sp = speed(p, k, t);
    let nt = sp > 1e-12 ? t - f / sp : (lo + hi) / 2;
    if (!(nt > lo && nt < hi)) nt = (lo + hi) / 2;
    t = nt;
  }
  return t;
}

/** Samples a cubic subpath at N points equidistant by arc length, anchoring
 *  corners and endpoints as exact samples. Returns Float64Array(2N). Closed
 *  paths distribute N intervals around the loop (without duplicating the
 *  first point); the circular start-point freedom is resolved by the plan's
 *  circular correspondence. */
export function resamplePath(
  path: CubicPath,
  N = 64,
  cornerThreshold = CORNER_THRESHOLD,
): Float64Array {
  const p = path.pts;
  const m = (p.length / 2 - 1) / 3;
  const out = new Float64Array(2 * N);
  const fill = () => {
    for (let i = 0; i < N; i++) {
      out[2 * i] = p[0];
      out[2 * i + 1] = p[1];
    }
    return out;
  };
  if (m < 1) return fill();
  const lens = new Array<number>(m);
  let L = 0;
  for (let k = 0; k < m; k++) {
    lens[k] = segLen(p, k);
    L += lens[k];
  }
  if (L < 1e-12) return fill();

  // Anchors: segment boundaries. For open paths, endpoints + corners. For
  // closed paths, ONLY corners: sampling must be intrinsic to the shape and
  // not to the arbitrary M point — two congruent loops with different start
  // points produce the same sample set (modulo index rotation, which the
  // plan's circular correspondence resolves). With no corners (a circle)
  // the path start is the only possible reference.
  const cs = detectCorners(path, cornerThreshold);
  const anchors = path.closed
    ? cs.length > 0
      ? cs
      : [0]
    : [...new Set([0, ...cs, m])].sort((a, b) => a - b);
  // Runs between anchors; for closed paths the last wraps to anchors[0] + m.
  const runs: Array<[number, number]> = [];
  if (path.closed) {
    for (let j = 0; j < anchors.length; j++) {
      const a = anchors[j];
      const b = j + 1 < anchors.length ? anchors[j + 1] : anchors[0] + m;
      runs.push([a, b]);
    }
  } else {
    for (let j = 0; j + 1 < anchors.length; j++) runs.push([anchors[j], anchors[j + 1]]);
  }
  const rl = runs.map(([a, b]) => {
    let s = 0;
    for (let k = a; k < b; k++) s += lens[k % m];
    return s;
  });
  const intervals = path.closed ? N : N - 1;
  if (runs.length > intervals)
    throw new Error(`morphicons: N=${N} too small (${runs.length} runs)`);

  // Largest-remainder apportionment: proportional to length, min 1, exact sum.
  const total = rl.reduce((a, b) => a + b, 0) || 1;
  const ideal = rl.map((l) => (intervals * l) / total);
  const counts = ideal.map((q) => Math.max(1, Math.floor(q)));
  let R = intervals - counts.reduce((a, b) => a + b, 0);
  if (R > 0) {
    // Quantized fraction: the quadrature's fp noise (~1e-15) must not decide
    // the tie-break — runs congruent under rotation must apportion the same
    // in both icons or Procrustes loses the exact congruence.
    const order = ideal
      .map((q, idx) => [Math.round((q - Math.floor(q)) * 1e9), idx] as const)
      .sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    for (let j = 0; j < R; j++) counts[order[j % counts.length][1]]++;
  }
  while (R < 0) {
    let bi = 0;
    for (let idx = 1; idx < counts.length; idx++) if (counts[idx] > counts[bi]) bi = idx;
    if (counts[bi] <= 1) break;
    counts[bi]--;
    R++;
  }

  // Sampling: exact anchor at the start of each run + interiors by inversion.
  let w = 0;
  for (let r = 0; r < runs.length; r++) {
    const [k0, k1] = runs[r];
    const cnt = counts[r];
    const Lr = rl[r];
    const vi = 6 * (k0 % m);
    out[2 * w] = p[vi];
    out[2 * w + 1] = p[vi + 1];
    w++;
    let seg = k0;
    let acc = 0;
    for (let j = 1; j < cnt; j++) {
      const target = (Lr * j) / cnt;
      while (seg < k1 - 1 && acc + lens[seg % m] < target) {
        acc += lens[seg % m];
        seg++;
      }
      const k = seg % m;
      const ls = lens[k];
      const t = ls > 1e-12 ? invert(p, k, target - acc, ls) : 0;
      point(p, k, t, out, 2 * w);
      w++;
    }
  }
  if (!path.closed) {
    const vi = 6 * m;
    out[2 * w] = p[vi];
    out[2 * w + 1] = p[vi + 1];
  }
  return out;
}

/** Full input pipeline: icon → cubics → sampled subpaths with their
 *  topology (the plan needs to know which subpaths are closed loops). */
export function resampleIcon(input: IconInput, N = 64): Sampled[] {
  return iconToCubics(input).map((path) => ({
    pts: resamplePath(path, N),
    closed: path.closed,
  }));
}

// ---- upstream: src/core/plan.ts ----

/* Correspondence and alignment. Closed-form 2D Procrustes (no SVD: atan2),
   subpath matching by centroid+length cost (surjective when p ≠ q: leftovers
   duplicate — "cell division"), circular correspondence for closed loops,
   minimal-rotation tie-break with λ, and a global hybrid: if the whole icon
   is congruent under ONE similarity, every subpath shares it (coherent
   block rotation). */


/** Weight of |ΔL| in the subpath pairing cost. */
const LEN_WEIGHT = 0.35;

/** λ of the minimal-rotation tie-break: score = res + λ·|θ|/π.
 *  It exists because shapes symmetric under inversion (lines) tie in
 *  residual for both traversal orientations yet produce different rotations. */
const LAMBDA = 0.05;

/** Global residual below which the whole icon counts as congruent and the
 *  plan shares (θ, σ) across all items (hybrid variant of Procrustes). */
const GLOBAL_EPS = 5e-3;

/** Bounds for exhaustive matching; above them it falls back to greedy with
 *  repair. 8! = 40 320 permutations / 1e5 assignments — both sub-ms. */
const PERM_MAX = 8;
const SURJ_MAX = 1e5;

export interface Similarity {
  theta: number;
  sigma: number;
  res: number;
}

export interface Alignment extends Similarity {
  ca: readonly [number, number];
  cb: readonly [number, number];
  /** A with the chosen correspondence (re-indexed only if A is the closed loop). */
  a: Float64Array;
  /** B with the chosen correspondence (orientation and circular offset). */
  b: Float64Array;
}

export interface PlanItem {
  /** Points of A with the chosen correspondence (if A is a closed loop it
   *  may come circularly re-indexed: same points, different cut). */
  a: Float64Array;
  /** A centered on its centroid. */
  aC: Float64Array;
  /** B brought into A's frame: R(−θ)·(b − c_B)/σ. */
  bT: Float64Array;
  /** B oriented, raw (for linear mode and for exact t=1). */
  bO: Float64Array;
  ca: readonly [number, number];
  cb: readonly [number, number];
  theta: number;
  lnSigma: number;
  res: number;
  /** true if both endpoints are closed loops: the subpath flies with Z.
   *  Closed → open flies open: the loop opens at the chosen cut. */
  closed: boolean;
  /** Block transport (set by the global hybrid, else null): mid-flight the
   *  centroid rides the shared similarity around the global centroid instead
   *  of lerping — off = c_A − g_A; drift closes c(1) = c_B exactly. */
  block: {
    off: readonly [number, number];
    drift: readonly [number, number];
  } | null;
}

export interface MorphPlan {
  items: PlanItem[];
  n: number;
}

export function centroid(p: Float64Array): [number, number] {
  const n = p.length / 2;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    cx += p[2 * i];
    cy += p[2 * i + 1];
  }
  return [cx / n, cy / n];
}

export function polyLen(p: Float64Array): number {
  const n = p.length / 2;
  let L = 0;
  for (let i = 1; i < n; i++)
    L += Math.hypot(p[2 * i] - p[2 * i - 2], p[2 * i + 1] - p[2 * i - 1]);
  return L;
}

export function reversePts(p: Float64Array): Float64Array {
  const n = p.length / 2;
  const out = new Float64Array(2 * n);
  for (let i = 0; i < n; i++) {
    out[2 * i] = p[2 * (n - 1 - i)];
    out[2 * i + 1] = p[2 * (n - 1 - i) + 1];
  }
  return out;
}

/** Circular re-indexing of a loop: out[i] = p[(i+off) mod n]. Same point
 *  set, different cut point — the circular degree of freedom of closed paths. */
export function rotatePts(p: Float64Array, off: number): Float64Array {
  const n = p.length / 2;
  const out = new Float64Array(2 * n);
  for (let i = 0; i < n; i++) {
    const j = (i + off) % n;
    out[2 * i] = p[2 * j];
    out[2 * i + 1] = p[2 * j + 1];
  }
  return out;
}

/** Optimal similarity (θ, σ) minimizing Σ|σ·R(θ)·(a−c_A) − (b−c_B)|².
 *  θ* = atan2(S_xy − S_yx, S_xx + S_yy); σ* by zero derivative.
 *  res = RMS residual normalized by b's energy (0 → same shape). */
export function procrustes(
  a: Float64Array,
  b: Float64Array,
  ca: readonly [number, number],
  cb: readonly [number, number],
): Similarity {
  const n = a.length / 2;
  let sxx = 0;
  let sxy = 0;
  let syx = 0;
  let syy = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    const ax = a[2 * i] - ca[0];
    const ay = a[2 * i + 1] - ca[1];
    const bx = b[2 * i] - cb[0];
    const by = b[2 * i + 1] - cb[1];
    sxx += ax * bx;
    syy += ay * by;
    sxy += ax * by;
    syx += ay * bx;
    na += ax * ax + ay * ay;
    nb += bx * bx + by * by;
  }
  const theta = Math.atan2(sxy - syx, sxx + syy);
  const num = Math.cos(theta) * (sxx + syy) + Math.sin(theta) * (sxy - syx);
  let sigma = na > 1e-12 ? num / na : 1;
  if (!(sigma > 1e-6)) sigma = 1e-6;
  const res2 = Math.max(0, sigma * sigma * na - 2 * sigma * num + nb);
  const res = nb > 1e-12 ? Math.sqrt(res2 / nb) : 0;
  return { theta, sigma, res };
}

/** Best index-to-index correspondence between a and b: tries both traversal
 *  directions and, if there is a closed loop, its N circular offsets,
 *  scoring with score = res + λ·|θ|/π. The freedom is applied to ONE cloud
 *  — the closed one (b if both are); varying both at once would be
 *  redundant. */
export function alignPair(
  aPts: Float64Array,
  bPts: Float64Array,
  aClosed = false,
  bClosed = false,
): Alignment {
  const ca = centroid(aPts);
  const cb = centroid(bPts);
  const varyA = aClosed && !bClosed;
  const base = varyA ? aPts : bPts;
  const offs = aClosed || bClosed ? base.length / 2 : 1;
  let bestScore = Number.POSITIVE_INFINITY;
  let best = base;
  let sim: Similarity = { theta: 0, sigma: 1, res: 0 };
  for (let dir = 0; dir < 2; dir++) {
    const walk = dir ? reversePts(base) : base;
    for (let off = 0; off < offs; off++) {
      const cand = off ? rotatePts(walk, off) : walk;
      const s = varyA ? procrustes(cand, bPts, ca, cb) : procrustes(aPts, cand, ca, cb);
      const score = s.res + (LAMBDA * Math.abs(s.theta)) / Math.PI;
      if (score < bestScore) {
        bestScore = score;
        best = cand;
        sim = s;
      }
    }
  }
  return varyA
    ? { ca, cb, a: best, b: bPts, ...sim }
    : { ca, cb, a: aPts, b: best, ...sim };
}

// Cost matrix dist(centroids) + LEN_WEIGHT·|ΔL| between all pairs.
function costMatrix(A: Float64Array[], B: Float64Array[]): number[][] {
  const cbs = B.map(centroid);
  const lbs = B.map(polyLen);
  return A.map((a) => {
    const ca = centroid(a);
    const la = polyLen(a);
    return cbs.map(
      (cb, j) =>
        Math.hypot(ca[0] - cb[0], ca[1] - cb[1]) + LEN_WEIGHT * Math.abs(la - lbs[j]),
    );
  });
}

// p === q: minimum-cost permutation. Exhaustive with pruning up to PERM_MAX;
// greedy (pairs sorted by cost) above it — with that many subpaths the
// exact optimum stops mattering visually.
function bestPermutation(C: number[][]): number[] {
  const n = C.length;
  if (n > PERM_MAX) {
    const pairs: Array<[number, number, number]> = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) pairs.push([C[i][j], i, j]);
    pairs.sort((x, y) => x[0] - y[0]);
    const out = new Array<number>(n).fill(-1);
    const used = new Array<boolean>(n).fill(false);
    for (const [, i, j] of pairs) {
      if (out[i] < 0 && !used[j]) {
        out[i] = j;
        used[j] = true;
      }
    }
    return out;
  }
  const idx = Array.from({ length: n }, (_, i) => i);
  let best = idx.slice();
  let bc = Number.POSITIVE_INFINITY;
  const perm = (arr: number[], k: number, acc: number) => {
    if (acc >= bc) return;
    if (k === n) {
      bc = acc;
      best = arr.slice();
      return;
    }
    for (let i = k; i < n; i++) {
      [arr[k], arr[i]] = [arr[i], arr[k]];
      perm(arr, k + 1, acc + C[k][arr[k]]);
      [arr[k], arr[i]] = [arr[i], arr[k]];
    }
  };
  perm(idx, 0, 0);
  return best;
}

// p ≠ q: surjective assignment from the large side to the small one, minimum
// cost. Enumeration with pruning when S^B is small; greedy + coverage repair
// otherwise. Surjectivity guarantees no subpath appears or vanishes out of
// nowhere.
function bestSurjection(C: number[][]): number[] {
  const B = C.length;
  const S = C[0].length;
  if (S ** B > SURJ_MAX) {
    const f = C.map((row) => {
      let m = 0;
      for (let j = 1; j < row.length; j++) if (row[j] < row[m]) m = j;
      return m;
    });
    const mult = new Array<number>(S).fill(0);
    for (const s of f) mult[s]++;
    for (let s = 0; s < S; s++) {
      if (mult[s] > 0) continue;
      let bi = -1;
      let bc = Number.POSITIVE_INFINITY;
      for (let i = 0; i < B; i++) {
        if (mult[f[i]] < 2) continue; // only donors with multiplicity
        const extra = C[i][s] - C[i][f[i]];
        if (extra < bc) {
          bc = extra;
          bi = i;
        }
      }
      mult[f[bi]]--;
      f[bi] = s;
      mult[s]++;
    }
    return f;
  }
  let best: number[] | null = null;
  let bc = Number.POSITIVE_INFINITY;
  const f = new Array<number>(B);
  const mult = new Array<number>(S).fill(0);
  const rec = (i: number, acc: number, covered: number) => {
    if (acc >= bc || S - covered > B - i) return;
    if (i === B) {
      bc = acc;
      best = f.slice();
      return;
    }
    for (let s = 0; s < S; s++) {
      f[i] = s;
      mult[s]++;
      rec(i + 1, acc + C[i][s], covered + (mult[s] === 1 ? 1 : 0));
      mult[s]--;
    }
  };
  rec(0, 0, 0);
  if (!best) throw new Error("morphicons: no valid surjection (B < S)");
  return best;
}

// Global hybrid: Procrustes over the concatenated clouds with the already
// chosen correspondence. If the global residual ≈ 0 the whole icon is
// congruent and every item shares (θ, σ): coherent block rotation (keeps a
// symmetric subpath from picking the opposite spin).
function applyGlobal(items: PlanItem[], n: number): void {
  const T = items.length * n;
  const ga = new Float64Array(2 * T);
  const gb = new Float64Array(2 * T);
  items.forEach((it, k) => {
    ga.set(it.a, 2 * n * k);
    gb.set(it.bO, 2 * n * k);
  });
  const gca = centroid(ga);
  const g = procrustes(ga, gb, gca, centroid(gb));
  if (g.res >= GLOBAL_EPS) return;
  const cos = Math.cos(-g.theta);
  const sin = Math.sin(-g.theta);
  const rc = Math.cos(g.theta);
  const rs = Math.sin(g.theta);
  for (const it of items) {
    let e2 = 0;
    let nb = 0;
    for (let i = 0; i < n; i++) {
      const bx = it.bO[2 * i] - it.cb[0];
      const by = it.bO[2 * i + 1] - it.cb[1];
      it.bT[2 * i] = (bx * cos - by * sin) / g.sigma;
      it.bT[2 * i + 1] = (bx * sin + by * cos) / g.sigma;
      const ex = g.sigma * (rc * it.aC[2 * i] - rs * it.aC[2 * i + 1]) - bx;
      const ey = g.sigma * (rs * it.aC[2 * i] + rc * it.aC[2 * i + 1]) - by;
      e2 += ex * ex + ey * ey;
      nb += bx * bx + by * by;
    }
    it.theta = g.theta;
    it.lnSigma = Math.log(g.sigma);
    it.res = nb > 1e-12 ? Math.sqrt(e2 / nb) : 0;
    // Block transport: every part spins with the shared θ, but lerping the
    // centroids would send off-center parts along the chord — inside the
    // arc — and the block would deform mid-flight (an arrow's head sags
    // toward its shaft). The centroid rides the shared similarity around
    // the global centroid instead; drift absorbs the (tiny) global residual
    // so t = 1 stays exact. Same ops as the interpolator on purpose: the
    // rotation delta cancels bit-exactly at both endpoints.
    const s1 = Math.exp(it.lnSigma);
    const c1 = Math.cos(it.theta) * s1;
    const n1 = Math.sin(it.theta) * s1;
    const ox = it.ca[0] - gca[0];
    const oy = it.ca[1] - gca[1];
    const rx = ox * c1 - oy * n1 - ox;
    const ry = ox * n1 + oy * c1 - oy;
    it.block = {
      off: [ox, oy],
      drift: [it.cb[0] - it.ca[0] - rx, it.cb[1] - it.ca[1] - ry],
    };
  }
}

/** Builds the morph plan between two lists of sampled subpaths. The plan is
 *  cacheable and serializable; it accepts any list — including intermediate
 *  shapes (interruptions). */
export function buildPlan(
  srcSubs: readonly Sampled[],
  dstSubs: readonly Sampled[],
): MorphPlan {
  const p = srcSubs.length;
  const q = dstSubs.length;
  if (p === 0 || q === 0) throw new Error("morphicons: icon has no subpaths");
  const A = srcSubs.map((s) => s.pts);
  const B = dstSubs.map((s) => s.pts);
  const pairs: Array<[number, number]> = [];
  if (p === q) {
    const perm = bestPermutation(costMatrix(A, B));
    for (let i = 0; i < p; i++) pairs.push([i, perm[i]]);
  } else if (p < q) {
    const f = bestSurjection(costMatrix(B, A));
    for (let j = 0; j < q; j++) pairs.push([f[j], j]);
  } else {
    const f = bestSurjection(costMatrix(A, B));
    for (let i = 0; i < p; i++) pairs.push([i, f[i]]);
  }
  const n = A[0].length / 2;
  const items: PlanItem[] = pairs.map(([si, di]) => {
    const al = alignPair(A[si], B[di], srcSubs[si].closed, dstSubs[di].closed);
    const a = al.a;
    const aC = new Float64Array(2 * n);
    const bT = new Float64Array(2 * n);
    const bO = new Float64Array(2 * n);
    const cos = Math.cos(-al.theta);
    const sin = Math.sin(-al.theta);
    for (let i = 0; i < n; i++) {
      aC[2 * i] = a[2 * i] - al.ca[0];
      aC[2 * i + 1] = a[2 * i + 1] - al.ca[1];
      const bx = al.b[2 * i] - al.cb[0];
      const by = al.b[2 * i + 1] - al.cb[1];
      bT[2 * i] = (bx * cos - by * sin) / al.sigma;
      bT[2 * i + 1] = (bx * sin + by * cos) / al.sigma;
      bO[2 * i] = al.b[2 * i];
      bO[2 * i + 1] = al.b[2 * i + 1];
    }
    return {
      a,
      aC,
      bT,
      bO,
      ca: al.ca,
      cb: al.cb,
      theta: al.theta,
      lnSigma: Math.log(al.sigma),
      res: al.res,
      closed: srcSubs[si].closed && dstSubs[di].closed,
      block: null,
    };
  });
  if (items.length > 1) applyGlobal(items, n);
  return { items, n };
}

// ---- upstream: src/core/interpolate.ts ----

/* Polar interpolation: the similarity is interpolated in its natural space
   (linear angle, log-linear scale, lerped centroid) and applied to the
   residual blend in the aligned frame:
     P(t) = c(t) + σᵗ·R(t·θ)·[(1−t)·aC + t·bT]
   Under the global hybrid the centroid does not lerp — it rides the shared
   similarity around the global centroid (block transport, see plan.ts):
     c(t) = ca + t·drift + (σᵗ·R(t·θ) − I)·off
   so congruent icons stay rigid mid-flight, not only at the endpoints.
   Exact at t=0 and t=1; with spring overshoot (t>1) it extrapolates
   naturally. Raw lerp (linear mode) is kept for comparison. */


/** Preallocated output buffers for a plan (zero allocation per frame). */
export function allocOutputs(plan: MorphPlan): Float64Array[] {
  return plan.items.map(() => new Float64Array(2 * plan.n));
}

export function interpPolar(plan: MorphPlan, t: number, out: Float64Array[]): void {
  for (let k = 0; k < plan.items.length; k++) {
    const it = plan.items[k];
    const o = out[k];
    const n = plan.n;
    const s = Math.exp(it.lnSigma * t);
    const ang = it.theta * t;
    const cos = Math.cos(ang) * s;
    const sin = Math.sin(ang) * s;
    let cx: number;
    let cy: number;
    if (it.block) {
      const [ox, oy] = it.block.off;
      const [dx, dy] = it.block.drift;
      cx = it.ca[0] + dx * t + (ox * cos - oy * sin - ox);
      cy = it.ca[1] + dy * t + (ox * sin + oy * cos - oy);
    } else {
      cx = it.ca[0] + (it.cb[0] - it.ca[0]) * t;
      cy = it.ca[1] + (it.cb[1] - it.ca[1]) * t;
    }
    for (let i = 0; i < n; i++) {
      const px = it.aC[2 * i] + (it.bT[2 * i] - it.aC[2 * i]) * t;
      const py = it.aC[2 * i + 1] + (it.bT[2 * i + 1] - it.aC[2 * i + 1]) * t;
      o[2 * i] = cx + px * cos - py * sin;
      o[2 * i + 1] = cy + px * sin + py * cos;
    }
  }
}

/** Raw coordinate lerp (same correspondence, no decomposition). */
export function interpLinear(plan: MorphPlan, t: number, out: Float64Array[]): void {
  for (let k = 0; k < plan.items.length; k++) {
    const it = plan.items[k];
    const o = out[k];
    const n = plan.n;
    for (let i = 0; i < n; i++) {
      o[2 * i] = it.a[2 * i] + (it.bO[2 * i] - it.a[2 * i]) * t;
      o[2 * i + 1] = it.a[2 * i + 1] + (it.bO[2 * i + 1] - it.a[2 * i + 1]) * t;
    }
  }
}

// ---- upstream: src/core/spring.ts ----

/* Spring: damped harmonic oscillator over the progress x: 0 → 1,
   ẍ = k·(1−x) − c·ẋ, integrated with semi-implicit Euler at 1/240 s substeps
   (stable up to ω·h ≈ 2; with k=420, ω≈20.5 — ample margin). Interruptible:
   start() resets x to 0 while preserving velocity (clamped to ±14). */

export class Spring {
  x = 1;
  v = 0;
  k = 250;
  c = 24;

  config(k: number, c: number): void {
    this.k = k;
    this.c = c;
  }

  /** Starts (or restarts mid-flight) preserving velocity. */
  start(): void {
    this.x = 0;
    if (this.v > 14) this.v = 14;
    if (this.v < -14) this.v = -14;
  }

  /** Advances dt seconds. Returns true on settle (|1−x| < 0.001 ∧ |v| < 0.02). */
  step(dt: number): boolean {
    const h = 1 / 240;
    const steps = Math.max(1, Math.min(16, Math.ceil(dt / h)));
    const s = dt / steps;
    for (let i = 0; i < steps; i++) {
      const a = this.k * (1 - this.x) - this.c * this.v;
      this.v += a * s;
      this.x += this.v * s;
    }
    return Math.abs(1 - this.x) < 0.001 && Math.abs(this.v) < 0.02;
  }
}

/** Spring presets (ζ = c/(2√k)) with the API's public names. */
export const SPRING_PRESETS = {
  /** ζ = 1.00 — critically damped, no overshoot. */
  smooth: { k: 170, c: 26 },
  /** ζ = 0.73 — fast, subtle overshoot. */
  snappy: { k: 420, c: 30 },
  /** ζ = 0.40 — playful. */
  bouncy: { k: 300, c: 14 },
} as const;

export type SpringPreset = keyof typeof SPRING_PRESETS;
