

// ---- upstream: packages/core/src/types.ts ----
/** Corner curve family. Default: `'squircle'` (the cubic-shoulder squircle). */
export type CurveType = "arc" | "squircle" | "superellipse" | "clothoid";

/** Configuration for a single corner. */
export interface CornerConfig {
  radius: number;
  /** Curve family. Default: `'squircle'`. */
  curve?: CurveType;
  /** 0 (sharp) to 1 (max). Used by `'squircle'` and `'clothoid'`;
   *  ignored by `'arc'` and `'superellipse'`. Default: `0.65`
   *  (`CONTINUOUS_SMOOTHING`); the common design-tool preset is `0.6`
   *  (`HANDOFF_SMOOTHING`). */
  smoothing?: number;
  /** Superellipse exponent, only when `curve === 'superellipse'`.
   *  Default: `4` (matches CSS `corner-shape: squircle`). */
  exponent?: number;
  /** Preserve smoothing when space is limited. Default: `true`. */
  preserveSmoothing?: boolean;
}

/** Per-corner configuration. Each corner can be a CornerConfig or a number (radius shorthand). */
export interface PerCornerConfig {
  topLeft?: CornerConfig | number;
  topRight?: CornerConfig | number;
  bottomRight?: CornerConfig | number;
  bottomLeft?: CornerConfig | number;
}

/** Uniform corner options — all corners share the same values.
 *  Alias for {@link CornerConfig} so {@link SmoothCornerOptions} reads as
 *  `uniform | per-corner` at the call site. */
export type UniformCornerOptions = CornerConfig;

/** Options for generating a smooth-cornered path. */
export type SmoothCornerOptions = UniformCornerOptions | PerCornerConfig;

/** Squircle-only resolved parameters (`a, b, c, d, p, arcSectionLength`).
 *  Implementation detail of the squircle curve — not meaningful
 *  for arc / superellipse / clothoid. New code should treat this as
 *  the return shape of `getPathParamsForCorner` rather than
 *  constructing it directly. */
export interface CornerPathParams {
  a: number;
  b: number;
  c: number;
  d: number;
  p: number;
  cornerRadius: number;
  arcSectionLength: number;
}

/** Input parameters for computing a corner's path arcs. */
export interface CornerParams {
  cornerRadius: number;
  cornerSmoothing: number;
  preserveSmoothing: boolean;
  roundingAndSmoothingBudget: number;
}

/** A corner after radius distribution with its available budget. */
export interface NormalizedCorner {
  radius: number;
  roundingAndSmoothingBudget: number;
}

/** All four corners after radius distribution. */
export interface NormalizedCorners {
  topLeft: NormalizedCorner;
  topRight: NormalizedCorner;
  bottomLeft: NormalizedCorner;
  bottomRight: NormalizedCorner;
}

/** Union of the four corner names. */
export type Corner = keyof NormalizedCorners;

/** One of the four rectangle sides. */
export type Side = "top" | "left" | "right" | "bottom";

/** A side–corner pair describing an adjacent relationship. */
export interface Adjacent {
  side: Side;
  corner: Corner;
}

/** A rectangle with per-corner radii, used as input for radius distribution. */
export interface RoundedRectangle {
  topLeftCornerRadius: number;
  topRightCornerRadius: number;
  bottomRightCornerRadius: number;
  bottomLeftCornerRadius: number;
  width: number;
  height: number;
}

/** A single color stop within a gradient. */
export interface GradientStop {
  offset: number;    // 0 to 1
  color: string;     // hex color
  opacity?: number;  // 0 to 1, default 1
}

/** Linear gradient configuration. */
export interface LinearGradientConfig {
  type: "linear";
  angle?: number;       // degrees (CSS convention), default 0 (bottom to top)
  stops: GradientStop[];
}

/** Radial gradient configuration. */
export interface RadialGradientConfig {
  type: "radial";
  cx?: number;  // 0-1 relative, default 0.5
  cy?: number;  // 0-1 relative, default 0.5
  r?: number;   // 0-1 relative, default 0.5
  stops: GradientStop[];
}

/** A gradient configuration — either linear or radial. */
export type GradientConfig = LinearGradientConfig | RadialGradientConfig;

/** Supported border style values for SVG rendering. */
export type BorderStyle = "solid" | "dashed" | "dotted" | "double" | "groove" | "ridge";

/** Configuration for an inner or outer border stroke. */
export interface BorderConfig {
  width: number;
  color: string | GradientConfig;
  opacity: number;
  style?: BorderStyle;
  /** Custom dash length for dashed/dotted styles. */
  dash?: number;
  /** Custom gap length for dashed/dotted styles. */
  gap?: number;
  /** Line cap for dashed/dotted strokes. Default: "butt" for dashed, "round" for dotted. */
  lineCap?: "butt" | "round" | "square";
}

/** Configuration for an inner or drop shadow effect. */
export interface ShadowConfig {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
}

/** Combined configuration for all visual effects applied to a smooth-cornered element. */
export interface EffectsConfig {
  innerBorder?: BorderConfig;
  outerBorder?: BorderConfig;
  middleBorder?: BorderConfig;
  innerShadow?: ShadowConfig | ShadowConfig[];
  shadow?: ShadowConfig | ShadowConfig[];
}

// ---- upstream: packages/core/src/utils.ts ----
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * `n.toFixed(4)`, byte-identical, ~2x faster (54 -> 28 ns per call on the
 * coordinates the emitters actually format). Path emission runs dozens of these
 * per corner (44 in a cold squircle corner alone) and `toFixed` is the single
 * largest line item in a cached `generatePath` call, because V8 routes it
 * through a general exact-decimal conversion. Scaling by 1e4 and splitting the
 * resulting integer stays in double arithmetic instead.
 */
export function fixed4(n: number): string {
  const scaled = n * 1e4;
  const ticks = Math.round(scaled);
  const residual = scaled - ticks;
  // A value that looks like a tie at the 5th decimal is where a scaled multiply
  // and toFixed's exact-decimal rounding disagree: 1234.56785 * 1e4 lands a hair
  // above 12345678.5 while the double itself is a hair below the tie, so
  // Math.round gives "1234.5679" where toFixed gives "1234.5678". A residual of
  // magnitude ~0.5 means `scaled` sat on that fence, whichever way `Math.round`
  // fell; hand the whole neighbourhood back to toFixed rather than guess.
  if (residual > 0.4999999 || residual < -0.4999999) return n.toFixed(4);
  // Non-finite and out-of-safe-range inputs (NaN, ±Infinity, |n| >= ~9e11) lose
  // the exact integer arithmetic this depends on, so they go the slow way too.
  // (NaN and ±Infinity reach here: their residual is NaN, so no comparison above
  // is true.)
  if (!Number.isSafeInteger(ticks)) return n.toFixed(4);

  // Sign comes from `n`, never from `ticks`: -0.00004 rounds to -0, whose
  // `< 0` test is false, and toFixed emits "-0.0000" for it.
  const negative = n < 0;
  const abs = negative ? -ticks : ticks;
  const frac = abs % 1e4;
  // Remainder first, then an exact division of a known multiple of 1e4.
  // `Math.floor(abs / 1e4)` is not safe: above |n| ~ 4.5e11 one ulp of the
  // quotient exceeds 1e-4, so k*1e4 - 1 can round up to k and leave a negative
  // remainder.
  const whole = (abs - frac) / 1e4;
  const pad = frac < 10 ? "000" : frac < 100 ? "00" : frac < 1000 ? "0" : "";
  return (negative ? "-" : "") + whole + "." + pad + frac;
}

// ---- upstream: packages/core/src/curves/types.ts ----
/**
 * Corner orientation in clockwise traversal. Builders write one canonical
 * (entry → exit) curve, rotated to each corner via `orient`.
 */
export type Orient = "TR" | "BR" | "BL" | "TL";

/**
 * Both `cornerRadius` and `roundingAndSmoothingBudget` are post-distribute:
 * the radius is already clamped to the rectangle, the budget is how much of
 * the adjacent edge this corner may consume.
 */
export interface CurveBuilderInput {
  cornerRadius: number;
  smoothing: number;
  exponent: number;
  preserveSmoothing: boolean;
  roundingAndSmoothingBudget: number;
}

/**
 * `p` is the tangency distance from the sharp vertex — where the curve
 * starts along each adjacent edge; the stitcher uses it to place the
 * straight `L` between corners. `pathSegment(orient)` returns relative SVG
 * commands, entering at the pen and exiting at the opposite tangency point.
 */
export interface CurveBuilderOutput {
  p: number;
  pathSegment: (orient: Orient) => string;
}

export type CurveBuilder = (input: CurveBuilderInput) => CurveBuilderOutput;

/** Shared zero-radius output for a non-positive corner footprint. The
 *  `pathSegment` is a static reference, so reuse stays allocation-free. */
export const EMPTY_BUILDER_OUTPUT: CurveBuilderOutput = {
  p: 0,
  pathSegment: () => "",
};

// ---- upstream: packages/core/src/curves/integrate.ts ----
/**
 * Simpson's-rule integration of the clothoid position integrals
 *     X(L) = ∫₀ᴸ cos θ(s) ds,   Y(L) = ∫₀ᴸ sin θ(s) ds
 * where θ(s) = θ₀ + κ₀·s + (A/2)·s². Returns endpoint (x, y) and θ(L).
 *
 * N = 32 keeps the absolute position error below 1e-4 across all
 * realistic radii (R ≤ 500). Simpson error is O((L/N)⁴·L).
 */
export function integrateClothoid(
  theta0: number,
  kappa0: number,
  A: number,
  L: number,
): { x: number; y: number; theta: number } {
  const N = 32;
  if (L <= 0) return { x: 0, y: 0, theta: theta0 };

  const step = L / N;
  let xAcc = 0;
  let yAcc = 0;
  for (let i = 1; i <= N; i++) {
    const sA = (i - 1) * step;
    const sB = sA + step;
    const sM = (sA + sB) / 2;
    const thA = theta0 + kappa0 * sA + (A / 2) * sA * sA;
    const thB = theta0 + kappa0 * sB + (A / 2) * sB * sB;
    const thM = theta0 + kappa0 * sM + (A / 2) * sM * sM;
    xAcc += (step / 6) * (Math.cos(thA) + 4 * Math.cos(thM) + Math.cos(thB));
    yAcc += (step / 6) * (Math.sin(thA) + 4 * Math.sin(thM) + Math.sin(thB));
  }
  const thetaEnd = theta0 + kappa0 * L + (A / 2) * L * L;
  return { x: xAcc, y: yAcc, theta: thetaEnd };
}

// ---- upstream: packages/core/src/curves/orient.ts ----
/**
 * Rotate a canonical (X = entry direction, Y = exit direction) delta into
 * the display (dx, dy) for `orient`, clockwise:
 *
 *   TR — enter +x, exit +y      BL — enter −x, exit −y
 *   BR — enter +y, exit −x      TL — enter −y, exit +x
 *
 * Every orient puts ±X and ±Y in the two slots, so the four corners of a
 * shape emit the *same* magnitudes — only the slot and the sign differ.
 * Formatting per orient therefore did the same work four times over (72
 * `fixed4` calls for a superellipse corner, 56 for a squircle). Instead a
 * builder formats each magnitude once into a `…Text` record, in both signs,
 * and the emitters below only pick strings.
 */

/**
 * The `fixed4` string for `-v`, derived from `v`'s own string instead of a
 * second format call.
 *
 * Two values do not flip textually and must come back unchanged.
 * `(-0).toFixed(4)` is `"0.0000"`, not `"-0.0000"` — zero-radius corners and
 * fully-consumed shoulders produce exact zeros. `(-NaN).toFixed(4)` is
 * `"NaN"`, not `"-NaN"` — a NaN radius reaches the builders unclamped.
 *
 * Everything else is an exact sign flip, *including* magnitudes below
 * 0.00005: the sign is taken before the rounding, so `(-0.00004).toFixed(4)`
 * is `"-0.0000"` and keying this guard on the string `"0.0000"` rather than
 * on `v === 0` would silently drop the minus off small-radius corners.
 */
export function negated(v: number, formatted: string): string {
  if (v === 0 || Number.isNaN(v)) return formatted;
  // 45 = "-". Already-negative magnitudes (a shoulder can overshoot into one)
  // flip by dropping the sign rather than doubling it.
  return formatted.charCodeAt(0) === 45 ? formatted.slice(1) : "-" + formatted;
}

/**
 * One relative cubic's three control deltas in canonical (X, Y) form,
 * pre-formatted in both signs — `x1n` is the string for `-x1`.
 */
export interface CubicText {
  x1: string;
  x1n: string;
  y1: string;
  y1n: string;
  x2: string;
  x2n: string;
  y2: string;
  y2n: string;
  x3: string;
  x3n: string;
  y3: string;
  y3n: string;
}

export function cubicText(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number
): CubicText {
  const fx1 = fixed4(x1);
  const fy1 = fixed4(y1);
  const fx2 = fixed4(x2);
  const fy2 = fixed4(y2);
  const fx3 = fixed4(x3);
  const fy3 = fixed4(y3);
  return {
    x1: fx1,
    x1n: negated(x1, fx1),
    y1: fy1,
    y1n: negated(y1, fy1),
    x2: fx2,
    x2n: negated(x2, fx2),
    y2: fy2,
    y2n: negated(y2, fy2),
    x3: fx3,
    x3n: negated(x3, fx3),
    y3: fy3,
    y3n: negated(y3, fy3),
  };
}

/** Relative `c` command for `t` rotated into `orient`. */
export function cubic(t: CubicText, orient: Orient): string {
  switch (orient) {
    case "TR":
      return `c ${t.x1} ${t.y1} ${t.x2} ${t.y2} ${t.x3} ${t.y3}`;
    case "BR":
      return `c ${t.y1n} ${t.x1} ${t.y2n} ${t.x2} ${t.y3n} ${t.x3}`;
    case "BL":
      return `c ${t.x1n} ${t.y1n} ${t.x2n} ${t.y2n} ${t.x3n} ${t.y3n}`;
    case "TL":
      return `c ${t.y1} ${t.x1n} ${t.y2} ${t.x2n} ${t.y3} ${t.x3n}`;
  }
}

/**
 * A 90° clockwise `a` command with equal x/y radii whose sweep delta has the
 * same magnitude on both axes — the quarter-circle corner and the clothoid's
 * central arc.
 */
export interface EqualArcText {
  /** Both radius slots; an arc radius is never signed. */
  radius: string;
  /** The sweep delta, in both signs. */
  d: string;
  dn: string;
}

export function equalArc(t: EqualArcText, orient: Orient): string {
  switch (orient) {
    case "TR":
      return `a ${t.radius} ${t.radius} 0 0 1 ${t.d} ${t.d}`;
    case "BR":
      return `a ${t.radius} ${t.radius} 0 0 1 ${t.dn} ${t.d}`;
    case "BL":
      return `a ${t.radius} ${t.radius} 0 0 1 ${t.dn} ${t.dn}`;
    case "TL":
      return `a ${t.radius} ${t.radius} 0 0 1 ${t.d} ${t.dn}`;
  }
}

// ---- upstream: packages/core/src/corner-params.ts ----
/**
 * Compute bezier curve parameters for a single corner.
 *
 * Based on the published cubic-shoulder squircle construction and MartinRGB's
 * approximation of it (both cited in the item's fidelity notes).
 */
export function getPathParamsForCorner({
  cornerRadius,
  cornerSmoothing,
  preserveSmoothing,
  roundingAndSmoothingBudget,
}: CornerParams): CornerPathParams {
  // Short-circuit: the `!preserveSmoothing` branch divides by cornerRadius.
  if (cornerRadius <= 0) {
    return { a: 0, b: 0, c: 0, d: 0, p: 0, arcSectionLength: 0, cornerRadius: 0 };
  }

  // From figure 12.2: p = (1 + cornerSmoothing) * q, where q = R (theta = 90deg)
  let p = (1 + cornerSmoothing) * cornerRadius;

  if (!preserveSmoothing) {
    const maxCornerSmoothing =
      roundingAndSmoothingBudget / cornerRadius - 1;
    cornerSmoothing = Math.min(cornerSmoothing, maxCornerSmoothing);
    p = Math.min(p, roundingAndSmoothingBudget);
  }

  // Arc measure shrinks as smoothing increases
  const arcMeasure = 90 * (1 - cornerSmoothing);
  const arcSectionLength =
    Math.sin(toRadians(arcMeasure / 2)) * cornerRadius * Math.sqrt(2);

  const angleAlpha = (90 - arcMeasure) / 2;
  const p3ToP4Distance = cornerRadius * Math.tan(toRadians(angleAlpha / 2));

  // a, b, c, d from figure 11.1
  const angleBeta = 45 * cornerSmoothing;
  const c = p3ToP4Distance * Math.cos(toRadians(angleBeta));
  const d = c * Math.tan(toRadians(angleBeta));

  let b = (p - arcSectionLength - c - d) / 3;
  let a = 2 * b;

  if (preserveSmoothing && p > roundingAndSmoothingBudget) {
    const p1ToP3MaxDistance =
      roundingAndSmoothingBudget - d - arcSectionLength - c;

    const minA = p1ToP3MaxDistance / 6;
    const maxB = p1ToP3MaxDistance - minA;

    b = Math.min(b, maxB);
    a = p1ToP3MaxDistance - b;
    p = Math.min(p, roundingAndSmoothingBudget);
  }

  return { a, b, c, d, p, arcSectionLength, cornerRadius };
}

// ---- upstream: packages/core/src/curves/capsule.ts ----
/**
 * Capsule smoothing. A capsule end cap is the squircle
 * shoulder applied on the flat-edge side only, with the circular arc carried
 * to the cap midline: shoulder cubic → arc → arc → mirrored shoulder cubic,
 * one continuous segment per end. Reuses `getPathParamsForCorner` verbatim so
 * the shoulder math is identical to the squircle corner.
 */
export interface CapsuleEndParams {
  p: number;
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  /** Arc chord along the long axis, `p − e = R·(1 − sinβ)`. */
  ax: number;
  /** Arc chord toward the midline, `R − d = R·cosβ`. */
  ay: number;
  R: number;
}

/**
 * `longHalf` is each end's share of the long axis — ponytail: half the long
 * side, conservative when the opposite end is smaller.
 */
export function capsuleEndParams(
  R: number,
  smoothing: number,
  preserveSmoothing: boolean,
  longHalf: number
): CapsuleEndParams {
  // The flat edge absorbs all smoothing; when it has no room (near-square) s
  // collapses so the cap stays a true circle. This is the !preserveSmoothing
  // clamp applied unconditionally — with it p never exceeds the budget, so the
  // preserveSmoothing compression branch is moot and β stays consistent.
  const sEff = Math.min(smoothing, longHalf / R - 1);
  const params = getPathParamsForCorner({
    cornerRadius: R,
    cornerSmoothing: sEff,
    preserveSmoothing,
    roundingAndSmoothingBudget: longHalf,
  });
  const e = params.a + params.b + params.c;
  return {
    p: params.p,
    a: params.a,
    b: params.b,
    c: params.c,
    d: params.d,
    e,
    ax: params.p - e,
    ay: R - params.d,
    R,
  };
}

/**
 * The nine magnitudes a cap emits, formatted once in both signs. The four
 * caps are the same figure mirrored end-to-end and transposed, so each one
 * spelled these nine numbers out over eighteen `fixed4` calls.
 *
 * Interior control zeros stay literal so they print `0` (like the squircle
 * drawers), keeping the arc's straight seam noise-free — as do the `0 0 1`
 * arc flags.
 */
interface CapText {
  /** Shoulder cubic deltas `a`, `a + b`, and the full shoulder run `e`. */
  a: string;
  an: string;
  ab: string;
  abn: string;
  e: string;
  en: string;
  /** Mirrored-shoulder deltas `c`, `b + c`, and the cross-axis rise `d`. */
  c: string;
  cn: string;
  bc: string;
  bcn: string;
  d: string;
  dn: string;
  /** Arc radius — both radius slots of both `a` commands, never signed. */
  r: string;
  /** Arc chords along and across the long axis. */
  ax: string;
  axn: string;
  ay: string;
  ayn: string;
}

function capText({ a, b, c, d, e, ax, ay, R }: CapsuleEndParams): CapText {
  const ab = a + b;
  const bc = b + c;
  const fa = fixed4(a);
  const fab = fixed4(ab);
  const fe = fixed4(e);
  const fc = fixed4(c);
  const fbc = fixed4(bc);
  const fd = fixed4(d);
  const fax = fixed4(ax);
  const fay = fixed4(ay);
  return {
    a: fa,
    an: negated(a, fa),
    ab: fab,
    abn: negated(ab, fab),
    e: fe,
    en: negated(e, fe),
    c: fc,
    cn: negated(c, fc),
    bc: fbc,
    bcn: negated(bc, fbc),
    d: fd,
    dn: negated(d, fd),
    r: fixed4(R),
    ax: fax,
    axn: negated(ax, fax),
    ay: fay,
    ayn: negated(ay, fay),
  };
}

/** Right cap: (width−p, 0) → (width−p, height). */
export function drawRightCap(params: CapsuleEndParams): string {
  const t = capText(params);
  return `c ${t.a} 0 ${t.ab} 0 ${t.e} ${t.d} a ${t.r} ${t.r} 0 0 1 ${t.ax} ${t.ay} a ${t.r} ${t.r} 0 0 1 ${t.axn} ${t.ay} c ${t.cn} ${t.d} ${t.bcn} ${t.d} ${t.en} ${t.d}`;
}

/** Left cap: (p, height) → (p, 0). */
export function drawLeftCap(params: CapsuleEndParams): string {
  const t = capText(params);
  return `c ${t.an} 0 ${t.abn} 0 ${t.en} ${t.dn} a ${t.r} ${t.r} 0 0 1 ${t.axn} ${t.ayn} a ${t.r} ${t.r} 0 0 1 ${t.ax} ${t.ayn} c ${t.c} ${t.dn} ${t.bc} ${t.dn} ${t.e} ${t.dn}`;
}

/** Top cap: (0, p) → (width, p). */
export function drawTopCap(params: CapsuleEndParams): string {
  const t = capText(params);
  return `c 0 ${t.an} 0 ${t.abn} ${t.d} ${t.en} a ${t.r} ${t.r} 0 0 1 ${t.ay} ${t.axn} a ${t.r} ${t.r} 0 0 1 ${t.ay} ${t.ax} c ${t.d} ${t.c} ${t.d} ${t.bc} ${t.d} ${t.e}`;
}

/** Bottom cap: (width, height−p) → (0, height−p). */
export function drawBottomCap(params: CapsuleEndParams): string {
  const t = capText(params);
  return `c 0 ${t.a} 0 ${t.ab} ${t.dn} ${t.e} a ${t.r} ${t.r} 0 0 1 ${t.ayn} ${t.ax} a ${t.r} ${t.r} 0 0 1 ${t.ayn} ${t.axn} c ${t.dn} ${t.cn} ${t.dn} ${t.bcn} ${t.dn} ${t.en}`;
}

// ---- upstream: packages/core/src/curves/blend.ts ----
/**
 * The blend regime: a uniform squircle resized into the band where its short
 * side sits strictly between 2R and 2(1+s)R. The classic squircle clamps
 * smoothing symmetrically here (a visible pop while resizing toward a
 * capsule); instead each corner gets per-edge smoothing
 *
 *     s_edge = clamp(min(s, room_edge/R − 1), 0, s)
 *
 * so the roomy long edges keep full smoothing while the constrained short
 * edges give theirs up, and the outline moves ~1 px per 1 px of resize all the
 * way to the capsule limit. Both ends of the band are exact: both edges roomy
 * → the squircle, one edge fully consumed → the capsule law.
 * The shoulder cubic per edge is the same figure-11.1 formula as the squircle
 * corner (verified identical to `getPathParamsForCorner` to ~3e-14).
 */

interface Shoulder {
  a: number;
  b: number;
  p: number;
  /** sin/cos of the shoulder→arc tangent angle `45°·s_edge`, computed once —
   *  seg() reads each four times per path. */
  sin: number;
  cos: number;
}

// s_edge is pre-clamped so p = (1+s_edge)R never exceeds `room`; the budget
// branches inside getPathParamsForCorner are therefore inert and the result
// matches the raw figure-11.1 cubic regardless of preserveSmoothing.
function shoulder(
  R: number,
  sEdge: number,
  preserveSmoothing: boolean,
  room: number
): Shoulder {
  const params = getPathParamsForCorner({
    cornerRadius: R,
    cornerSmoothing: sEdge,
    preserveSmoothing,
    roundingAndSmoothingBudget: room,
  });
  const beta = toRadians(45 * sEdge);
  return {
    a: params.a,
    b: params.b,
    p: params.p,
    sin: Math.sin(beta),
    cos: Math.cos(beta),
  };
}

const clampEdge = (room: number, R: number, s: number): number =>
  Math.max(0, Math.min(room / R - 1, s));

const r4 = (n: number): string => fixed4(Object.is(n, -0) ? 0 : n);

/**
 * Full `d` string for a uniform-squircle rectangle in the blend band. `R` is
 * the effective radius `min(radius, width/2, height/2)`; the caller guarantees
 * the short side lies in `(2R, 2(1+s)R)`.
 */
export function drawBlendPath(
  width: number,
  height: number,
  R: number,
  smoothing: number,
  preserveSmoothing: boolean
): string {
  const H = shoulder(R, clampEdge(width / 2, R, smoothing), preserveSmoothing, width / 2);
  const V = shoulder(R, clampEdge(height / 2, R, smoothing), preserveSmoothing, height / 2);

  // One corner, oriented by unit axes: u points from the corner back along the
  // arrival edge, v along the departure edge. Horizontal edges use the width
  // shoulder H, vertical edges the height shoulder V. The arc runs between the
  // two shoulder→arc junctions j1, j2 on the corner's R-circle (centre o),
  // collapsing to nothing when the shoulders consume the full 90°. Emitted like
  // the other drawers: absolute `L` onto the shoulder start, then relative
  // cubic/arc/cubic, so the four corner deltas stay symmetric.
  const seg = (
    cx: number,
    cy: number,
    ux: number,
    uy: number,
    vx: number,
    vy: number
  ): string => {
    const s1 = uy === 0 ? H : V;
    const s2 = vy === 0 ? H : V;
    const ox = cx + (ux + vx) * R;
    const oy = cy + (uy + vy) * R;
    const j1x = ox - vx * R * s1.cos - ux * R * s1.sin;
    const j1y = oy - vy * R * s1.cos - uy * R * s1.sin;
    const j2x = ox - ux * R * s2.cos - vx * R * s2.sin;
    const j2y = oy - uy * R * s2.cos - vy * R * s2.sin;
    const p0x = cx + ux * s1.p;
    const p0y = cy + uy * s1.p;
    const arced = Math.hypot(j2x - j1x, j2y - j1y) > 1e-6;
    const ex = arced ? j2x : j1x;
    const ey = arced ? j2y : j1y;
    const p3x = cx + vx * s2.p;
    const p3y = cy + vy * s2.p;
    let d = `L ${r4(p0x)} ${r4(p0y)} `;
    d += `c ${r4(-ux * s1.a)} ${r4(-uy * s1.a)} ${r4(-ux * (s1.a + s1.b))} ${r4(-uy * (s1.a + s1.b))} ${r4(j1x - p0x)} ${r4(j1y - p0y)} `;
    if (arced) {
      d += `a ${r4(R)} ${r4(R)} 0 0 1 ${r4(j2x - j1x)} ${r4(j2y - j1y)} `;
    }
    d += `c ${r4(p3x - vx * (s2.a + s2.b) - ex)} ${r4(p3y - vy * (s2.a + s2.b) - ey)} ${r4(p3x - vx * s2.a - ex)} ${r4(p3y - vy * s2.a - ey)} ${r4(p3x - ex)} ${r4(p3y - ey)}`;
    return d;
  };

  // Corners clockwise from top-left; the path opens on the top edge.
  const tr = seg(width, 0, -1, 0, 0, 1);
  const br = seg(width, height, 0, -1, -1, 0);
  const bl = seg(0, height, 1, 0, 0, -1);
  const tl = seg(0, 0, 0, 1, 1, 0);
  return `M ${r4(H.p)} 0 ${tr} ${br} ${bl} ${tl} Z`;
}

// ---- upstream: packages/core/src/curves/arc.ts ----
/**
 * Plain quarter-circle corner via native SVG `a` — the CSS `border-radius`
 * curve and the smoothing → 0 fallback. G1 with the adjacent edges.
 */
export const buildArc: CurveBuilder = ({
  cornerRadius,
  roundingAndSmoothingBudget,
}) => {
  // Clamp to the budget so the adjacent straight `L` segments can't overlap.
  const p = Math.min(cornerRadius, roundingAndSmoothingBudget);
  if (p <= 0) return EMPTY_BUILDER_OUTPUT;
  // Both radii and both sweep deltas are the same magnitude for a quarter
  // circle, so one format call covers the whole command in all four orients
  // — the old per-orient rounding ran sixteen.
  const radius = fixed4(p);
  const arc: EqualArcText = { radius, d: radius, dn: negated(p, radius) };
  return {
    p,
    pathSegment: (orient) => equalArc(arc, orient),
  };
};

// ---- upstream: packages/core/src/curves/squircle.ts ----
/**
 * Squircle — cubic shoulder + central arc + cubic shoulder. G1
 * with the adjacent edges (curvature steps at the cubic↔arc seams).
 *
 * The four per-orient arms stay hand-written rather than going through the
 * shared `cubic` emitter: their literal `0` characters (e.g. `c ${a} 0 …`)
 * print as `0`, not `0.0000`, and routing them through a formatter would
 * round those literals and diff every downstream snapshot despite identical
 * visuals.
 */
export const buildSquircle: CurveBuilder = ({
  cornerRadius,
  smoothing,
  preserveSmoothing,
  roundingAndSmoothingBudget,
}) => {
  const params = getPathParamsForCorner({
    cornerRadius,
    cornerSmoothing: smoothing,
    preserveSmoothing,
    roundingAndSmoothingBudget,
  });
  if (params.cornerRadius <= 0) return EMPTY_BUILDER_OUTPUT;
  const t = squircleText(params);
  return {
    p: params.p,
    pathSegment: (orient) => {
      switch (orient) {
        case "TR":
          return `c ${t.a} 0 ${t.ab} 0 ${t.abc} ${t.d} a ${t.r} ${t.r} 0 0 1 ${t.arc} ${t.arc} c ${t.d} ${t.c} ${t.d} ${t.bc} ${t.d} ${t.abc}`;
        case "BR":
          return `c 0 ${t.a} 0 ${t.ab} ${t.dn} ${t.abc} a ${t.r} ${t.r} 0 0 1 ${t.arcn} ${t.arc} c ${t.cn} ${t.d} ${t.bcn} ${t.d} ${t.abcn} ${t.d}`;
        case "BL":
          return `c ${t.an} 0 ${t.abn} 0 ${t.abcn} ${t.dn} a ${t.r} ${t.r} 0 0 1 ${t.arcn} ${t.arcn} c ${t.dn} ${t.cn} ${t.dn} ${t.bcn} ${t.dn} ${t.abcn}`;
        case "TL":
          return `c 0 ${t.an} 0 ${t.abn} ${t.d} ${t.abcn} a ${t.r} ${t.r} 0 0 1 ${t.arc} ${t.arcn} c ${t.c} ${t.dn} ${t.bc} ${t.dn} ${t.abc} ${t.dn}`;
      }
    },
  };
};

/**
 * The eight distinct magnitudes a squircle corner emits, formatted once in
 * both signs. The four drawers differ only in which slot each lands in, so
 * they used to run the same eight numbers through `fixed4` 56 times between
 * them.
 */
interface SquircleText {
  /** Entry-shoulder cubic deltas: `a`, `a + b`, `a + b + c`. */
  a: string;
  an: string;
  ab: string;
  abn: string;
  abc: string;
  abcn: string;
  /** Exit-shoulder cubic deltas: `c`, `b + c`, and the cross-axis rise `d`. */
  c: string;
  cn: string;
  bc: string;
  bcn: string;
  d: string;
  dn: string;
  /** Corner radius — both radius slots of the `a` command, never signed. */
  r: string;
  /** Arc chord. */
  arc: string;
  /**
   * Arc chord with a literal `-` in front, exactly as the drawers used to
   * spell it (`0 0 1 -${arcSectionLength}`) — *not* the chord negated. At
   * smoothing = 1 the arc collapses and the chord is exactly 0, which the
   * literal prints as `-0.0000` while a numeric negation would print
   * `0.0000` and diff every full-smoothing snapshot.
   */
  arcn: string;
}

function squircleText({
  cornerRadius,
  a,
  b,
  c,
  d,
  arcSectionLength,
}: CornerPathParams): SquircleText {
  const ab = a + b;
  const abc = ab + c;
  const bc = b + c;
  const fa = fixed4(a);
  const fab = fixed4(ab);
  const fabc = fixed4(abc);
  const fc = fixed4(c);
  const fbc = fixed4(bc);
  const fd = fixed4(d);
  const farc = fixed4(arcSectionLength);
  return {
    a: fa,
    an: negated(a, fa),
    ab: fab,
    abn: negated(ab, fab),
    abc: fabc,
    abcn: negated(abc, fabc),
    c: fc,
    cn: negated(c, fc),
    bc: fbc,
    bcn: negated(bc, fbc),
    d: fd,
    dn: negated(d, fd),
    r: fixed4(cornerRadius),
    arc: farc,
    arcn: "-" + farc,
  };
}

// ---- upstream: packages/core/src/curves/superellipse.ts ----
// Fixed sample angles θ ∈ {0, π/6, π/3, π/2} and their trig are shape-
// independent, so precompute once at module load. Endpoints (i = 0, 3)
// are pinned to (0, 0) / (p, p) so their trig is never consulted.
const THETAS = [0, Math.PI / 6, Math.PI / 3, Math.PI / 2] as const;
const SIN_THETA = THETAS.map((th) => Math.sin(th));
const COS_THETA = THETAS.map((th) => Math.cos(th));
// Per-segment parameter midpoints and their trig — likewise constant.
// Evaluated as `(THETAS[i] + THETAS[i + 1]) / 2` exactly, so floating-
// point rounding stays bit-for-bit identical across engines.
const THETA_MID = [
  (THETAS[0] + THETAS[1]) / 2,
  (THETAS[1] + THETAS[2]) / 2,
  (THETAS[2] + THETAS[3]) / 2,
];
const SIN_MID = THETA_MID.map((th) => Math.sin(th));
const COS_MID = THETA_MID.map((th) => Math.cos(th));

/**
 * Superellipse corner. `|X/p|^n + |Y'/p|^n = 1` reflected into the
 * corner, running (0, 0) → (p, p). For n > 2 curvature is exactly 0 at
 * the axis crossings, so the curve is G2-flat with the adjacent edges.
 * n = 2 is a quarter circle; n = 4 is what CSS `corner-shape: squircle`
 * resolves to.
 *
 * Parametric form (X along entry edge toward the sharp vertex, Y into
 * the interior):
 *     X(θ) = p · sin^(2/n)(θ),  Y(θ) = p · (1 − cos^(2/n)(θ))
 * Endpoint tangents: (1, 0) at θ = 0, (0, 1) at θ = π/2; interior
 * tangents are the analytic parametric derivative, normalised.
 *
 * Three cubic Béziers per quadrant, sampled at θ ∈ {0, π/6, π/3, π/2}.
 * Each cubic uses the midpoint-match scheme: endpoint position + tangent
 * (4 constraints) plus the parameter midpoint (2). Hausdorff error is
 * well sub-pixel for n ∈ [2, 4] at realistic radii; degrades to
 * ~5% of corner footprint for n ∈ (4, 8] as the Lamé shape sharpens.
 * Reference-shape tests pin the actual tolerances per exponent.
 */
export const buildSuperellipse: CurveBuilder = ({
  cornerRadius,
  exponent,
  roundingAndSmoothingBudget,
}) => {
  const p = Math.min(cornerRadius, roundingAndSmoothingBudget);
  if (p <= 0) return EMPTY_BUILDER_OUTPUT;
  // n < 2 bulges concave, non-finite n → NaN through Math.pow. Clamp
  // before computing e = 2/n; n = 2 is a quarter-circle.
  const n = Number.isFinite(exponent) ? Math.max(2, exponent) : 4;
  const e = 2 / n;

  // Specialise `pow(x, e)` for integer reciprocals: Math.sqrt is a single
  // hardware instruction vs Math.pow's ~30-50ns C++ call, across the 8-12
  // pow evaluations per builder.
  const powE: (x: number) => number =
    n === 2 ? (x) => x
    : n === 4 ? Math.sqrt
    : n === 8 ? (x) => Math.sqrt(Math.sqrt(x))
    : (x) => Math.pow(x, e);
  // `pow(x, e - 1)` for the tangent derivative: n=2 ⇒ 1; n=4 ⇒ 1/sqrt(x).
  const e1 = e - 1;
  const powE1: (x: number) => number =
    n === 2 ? () => 1
    : n === 4 ? (x) => 1 / Math.sqrt(x)
    : (x) => Math.pow(x, e1);

  // Pin endpoints to (0, 0) and (p, p): Math.cos(π/2) returns 6.123e-17,
  // not exact zero, so the curve would exit at (p, p − ε·p) and the
  // skeleton's `L width br.p` would draw a sub-pixel stub, visible under
  // thick borders.
  const points: Array<[number, number]> = THETAS.map((_th, i) => {
    if (i === 0) return [0, 0];
    if (i === THETAS.length - 1) return [p, p];
    return [p * powE(SIN_THETA[i]), p * (1 - powE(COS_THETA[i]))];
  });
  // Endpoint tangents use the geometric limit (edge direction) — the
  // parametric form is numerically unstable at θ = 0 / π/2 for n > 2.
  const tangents: Array<[number, number]> = THETAS.map((_th, i) => {
    if (i === 0) return [1, 0];
    if (i === THETAS.length - 1) return [0, 1];
    const dX = e * powE1(SIN_THETA[i]) * COS_THETA[i] * p;
    const dY = e * powE1(COS_THETA[i]) * SIN_THETA[i] * p;
    const m = Math.sqrt(dX * dX + dY * dY) || 1;
    return [dX / m, dY / m];
  });

  // The cubic fit is orient-independent, so solve it once here (not 4×
  // inside pathSegment) — and format it here too. Each segment reduces to
  // six control-point deltas that every orient re-emits with permuted slots
  // and flipped signs, so 18 `fixed4` calls now cover all four orients where
  // per-orient rounding ran 72.
  const segments: CubicText[] = [];
  for (let i = 0; i < THETAS.length - 1; i++) {
    const [X0, Y0] = points[i];
    const [X1, Y1] = points[i + 1];
    const [T0x, T0y] = tangents[i];
    const [T1x, T1y] = tangents[i + 1];

    // Parameter midpoint — the third constraint that pins h0, h1.
    const Mx = p * powE(SIN_MID[i]);
    const My = p * (1 - powE(COS_MID[i]));

    // P(0.5) = ½(B0 + B3) + (3/8)(h0 T0 − h1 T1); solve for h0, h1.
    const RHSx = (8 / 3) * (Mx - (X0 + X1) / 2);
    const RHSy = (8 / 3) * (My - (Y0 + Y1) / 2);
    const det = T1x * T0y - T1y * T0x;
    const h0 = det !== 0 ? (-T1y * RHSx + T1x * RHSy) / det : 0;
    const h1 = det !== 0 ? (T0x * RHSy - T0y * RHSx) / det : 0;

    const B1x = X0 + h0 * T0x;
    const B1y = Y0 + h0 * T0y;
    const B2x = X1 - h1 * T1x;
    const B2y = Y1 - h1 * T1y;

    const dB1x = B1x - X0;
    const dB1y = B1y - Y0;
    const dB2x = B2x - X0;
    const dB2y = B2y - Y0;
    const dB3x = X1 - X0;
    const dB3y = Y1 - Y0;
    segments.push(cubicText(dB1x, dB1y, dB2x, dB2y, dB3x, dB3y));
  }

  return {
    p,
    pathSegment: (orient) => {
      let out = cubic(segments[0], orient);
      for (let i = 1; i < segments.length; i++) {
        out += " " + cubic(segments[i], orient);
      }
      return out;
    },
  };
};

// ---- upstream: packages/core/src/curves/clothoid.ts ----
const ANGLE_EPSILON = 1e-6;

/**
 * Clothoid blend: line → clothoid → arc → clothoid → line. Curvature
 * ramps linearly along arc length from 0 (edge) to 1/R (central arc)
 * and mirrors on the way out. G2 at every seam.
 *
 * Smoothing s ∈ [0, 1] splits the 90° rotation: each clothoid half
 * rotates (π/4)·s, the arc rotates (π/2)(1 − s). s = 0 is a quarter
 * circle; s = 1 is the pure Cornu corner. One cubic Bézier per
 * half-fillet + one native SVG `a` for the arc.
 */
export const buildClothoid: CurveBuilder = ({
  cornerRadius,
  smoothing,
  roundingAndSmoothingBudget,
}) => {
  if (cornerRadius <= 0) return EMPTY_BUILDER_OUTPUT;
  const s = Math.max(0, Math.min(1, smoothing));
  const R = cornerRadius;
  const dTheta = (Math.PI / 4) * s;
  const L = (Math.PI / 2) * R * s;
  // κ(s) = A·s with A = 1/(R·L), so κ(L) = 1/R.
  const A = L > 0 ? 1 / (R * L) : 0;

  // Integrate clothoid 1 in its local frame (origin, tangent along +X).
  // The endpoint drives the natural `p` and cubic handle lengths; the
  // midpoint is the third constraint pinning the fit to the spiral.
  const { x: xC, y: yC } = L > 0
    ? integrateClothoid(0, 0, A, L)
    : { x: 0, y: 0 };
  const { x: xMid, y: yMid } = L > 0
    ? integrateClothoid(0, 0, A, L / 2)
    : { x: 0, y: 0 };

  // Arc centre sits R to the left of the end tangent; by symmetry it
  // lies on the diagonal X + Y = p.
  const arcCx = xC - R * Math.sin(dTheta);
  const arcCy = yC + R * Math.cos(dTheta);
  const naturalP = arcCx + arcCy;

  // Scale R proportionally when the natural footprint overshoots the
  // budget — preserves the shape of the clothoid/arc blend.
  let p = naturalP;
  let effR = R;
  let effX = xC;
  let effY = yC;
  let effMx = xMid;
  let effMy = yMid;
  if (naturalP > roundingAndSmoothingBudget && naturalP > 0) {
    const scale = roundingAndSmoothingBudget / naturalP;
    p = roundingAndSmoothingBudget;
    effR = R * scale;
    effX = xC * scale;
    effY = yC * scale;
    effMx = xMid * scale;
    effMy = yMid * scale;
  }
  if (p <= 0) return EMPTY_BUILDER_OUTPUT;

  // Midpoint-match cubic for the half-fillet. Endpoint position +
  // tangent (4 constraints) and the clothoid midpoint (2) pin h0, h1:
  //
  //   P(0.5) = ½(B0 + B3) + (3/8)(h0·T_a − h1·T_b) = midpoint
  //
  // T_a = (1, 0), T_b = (cos dTheta, sin dTheta); the Y equation gives
  // h1, back-substitution gives h0. Walton–Meek's closed-form
  // (cos α_a / cos α_b weights) instead dipped B2 ~0.45 px outside the
  // rectangle at R = 40 / smoothing = 0.6.
  const cosDt = Math.cos(dTheta);
  const sinDt = Math.sin(dTheta);
  let h0 = 0;
  let h1 = 0;
  if (L > 0) {
    if (sinDt > 1e-12) {
      h1 = ((8 / 3) * (effY / 2 - effMy)) / sinDt;
    }
    h0 = (8 / 3) * (effMx - effX / 2) + h1 * cosDt;
  }

  const arcSweep = Math.PI / 2 - 2 * dTheta;
  const hasArc = Math.abs(arcSweep) > ANGLE_EPSILON;

  // Both half-fillets and the arc are orient-independent, so solve and format
  // them once here. pathSegment used to redo the trig, the deltas and 16
  // `fixed4` calls on every orient — 64 per corner for these 14 magnitudes.
  //
  // Cloth1: B0 = (0, 0), B1 = (h0, 0), B3 = (effX, effY),
  //         B2 = B3 − h1·(cos dTheta, sin dTheta).
  // Cloth2: the mirror of cloth1 across X + Y = p, running
  //         (p − effY, p − effX) → (p, p); relative to its own B0,
  //         B1 = (h1·sin dTheta, h1·cos dTheta), B2 = (effY, effX − h0),
  //         B3 = (effY, effX).
  const fillets =
    L > 0
      ? {
          head: cubicText(h0, 0, effX - h1 * cosDt, effY - h1 * sinDt, effX, effY),
          tail: cubicText(h1 * sinDt, h1 * cosDt, effY, effX - h0, effY, effX),
        }
      : null;

  // Arc (effX, effY) → (p − effY, p − effX); relative delta is
  // (p − effX − effY) on both axes by symmetry.
  let arc: EqualArcText | null = null;
  if (hasArc) {
    const delta = p - effX - effY;
    const d = fixed4(delta);
    arc = { radius: fixed4(effR), d, dn: negated(delta, d) };
  }

  return {
    p,
    pathSegment: (orient) => {
      // At smoothing = 0 there are no fillets, at smoothing = 1 no arc.
      if (fillets === null) return arc === null ? "" : equalArc(arc, orient);
      const head = cubic(fillets.head, orient);
      const tail = cubic(fillets.tail, orient);
      if (arc === null) return head + " " + tail;
      return head + " " + equalArc(arc, orient) + " " + tail;
    },
  };
};

// ---- upstream: packages/core/src/curves/index.ts ----
/** Default superellipse exponent. Matches CSS `corner-shape: squircle` (Lamé n = 4). */
export const DEFAULT_EXPONENT = 4;

// The `Record<CurveType, …>` constraint makes a missing builder a compile error.
const CURVE_BUILDERS: Record<CurveType, CurveBuilder> = {
  arc: buildArc,
  squircle: buildSquircle,
  superellipse: buildSuperellipse,
  clothoid: buildClothoid,
};

/** Registered curve types — iterate this rather than the union literal. */
export const CURVE_TYPES: readonly CurveType[] = Object.keys(CURVE_BUILDERS) as CurveType[];

export function getCurveBuilder(type: CurveType): CurveBuilder {
  return CURVE_BUILDERS[type];
}

// ---- upstream: packages/core/src/curves/cache.ts ----
/**
 * LRU cache for curve-builder output. The corner shape depends only on
 * `(curve, radius, smoothing, exponent, preserveSmoothing, budget)` —
 * width/height place the corner in the skeleton but don't change its shape.
 *
 * Map insertion order = LRU order: touch by delete+set, evict the first
 * key. Capacity 64 is several multiples of any realistic working set.
 */
const CAPACITY = 64;
const cache = new Map<string, CurveBuilderOutput>();

/** Key most recently moved to the back of `cache`. A hit on it needs no
 *  delete+set: the entry is already last in insertion order, so the touch is
 *  three rehashing Map operations that change nothing. A page whose elements
 *  share one corner config hammers exactly this key. `null` whenever the
 *  newest key is unknown (start, after `clearCurveCache`). */
let newestKey: string | null = null;

function key(curve: CurveType, input: CurveBuilderInput): string {
  // Exact-number key — rounding would let two inputs that differ by
  // less than the tolerance share an entry while `builder(input)`
  // would still produce different bytes for each. Mild fragmentation
  // for near-identical floats is fine; correctness drift is not.
  return (
    curve +
    "|" +
    input.cornerRadius +
    "|" +
    input.smoothing +
    "|" +
    input.exponent +
    "|" +
    (input.preserveSmoothing ? 1 : 0) +
    "|" +
    input.roundingAndSmoothingBudget
  );
}

/** Non-finite inputs bypass the cache — they'd otherwise pin a permanent
 *  `"NaN"`-keyed slot that never evicts. The builder still runs. */
function hasNonFiniteKeyField(input: CurveBuilderInput): boolean {
  return (
    !Number.isFinite(input.cornerRadius) ||
    !Number.isFinite(input.smoothing) ||
    !Number.isFinite(input.exponent) ||
    !Number.isFinite(input.roundingAndSmoothingBudget)
  );
}

/** Lazy per-orient string memoisation — `pathSegment` re-runs the blend,
 *  transforms, and toFixed on every call, so cache the string per orient. */
function wrapWithOrientCache(fresh: CurveBuilderOutput): CurveBuilderOutput {
  const orients: Partial<Record<Orient, string>> = {};
  return {
    p: fresh.p,
    pathSegment: (orient) => {
      const cached = orients[orient];
      if (cached !== undefined) return cached;
      const s = fresh.pathSegment(orient);
      orients[orient] = s;
      return s;
    },
  };
}

export function getCachedBuilderOutput(
  curve: CurveType,
  builder: CurveBuilder,
  input: CurveBuilderInput,
): CurveBuilderOutput {
  if (hasNonFiniteKeyField(input)) return builder(input);
  const k = key(curve, input);
  const cached = cache.get(k);
  if (cached) {
    if (k !== newestKey) {
      cache.delete(k);
      cache.set(k, cached);
      newestKey = k;
    }
    return cached;
  }
  const fresh = wrapWithOrientCache(builder(input));
  if (cache.size >= CAPACITY) {
    cache.delete(cache.keys().next().value!);
  }
  cache.set(k, fresh);
  newestKey = k;
  return fresh;
}

export const CURVE_CACHE_CAPACITY = CAPACITY;

export function _curveCacheSize(): number {
  return cache.size;
}

export function clearCurveCache(): void {
  cache.clear();
  newestKey = null;
}

// ---- upstream: packages/core/src/distribute.ts ----
/**
 * One corner's rounding-and-smoothing budget, as the minimum over its two
 * edge-sharing neighbours. `r` is the corner's *original* radius; `nHr`/`nHb`
 * and `nVr`/`nVb` are the *current* radius and budget of the horizontal
 * (width-sharing) and vertical (height-sharing) neighbours respectively — a
 * budget < 0 marks a neighbour that has not been processed yet.
 *
 * Mirrors the per-adjacent term of the original algorithm exactly:
 *   - both radii zero  → 0
 *   - neighbour done   → side − neighbourBudget
 *   - neighbour pending → proportional split (r / (r + neighbourRadius)) · side
 */
function cornerBudget(
  r: number,
  nHr: number,
  nHb: number,
  width: number,
  nVr: number,
  nVb: number,
  height: number
): number {
  const termH =
    r === 0 && nHr === 0
      ? 0
      : nHb >= 0
        ? width - nHb
        : (r / (r + nHr)) * width;
  const termV =
    r === 0 && nVr === 0
      ? 0
      : nVb >= 0
        ? height - nVb
        : (r / (r + nVr)) * height;
  return Math.min(termH, termV);
}

/**
 * Distribute available space among corners, normalizing radii so they
 * don't exceed the rectangle dimensions. Larger corners get priority.
 *
 * Allocation-free: no `Object.entries`, no `.sort`, no `.map`, and no
 * per-call closures. The stable "bigger corner chooses first" ordering
 * (ties broken by TL → TR → BL → BR insertion order) is reproduced with
 * explicit rank comparisons; a uniform equal-radius input resolves through
 * a closed-form fast path.
 */
export function distributeAndNormalize({
  topLeftCornerRadius: OTL,
  topRightCornerRadius: OTR,
  bottomRightCornerRadius: OBR,
  bottomLeftCornerRadius: OBL,
  width,
  height,
}: RoundedRectangle): NormalizedCorners {
  // Fast path: every corner shares one positive radius on a positive box.
  // The general algorithm provably yields budget = min(w, h) / 2 for all
  // four corners here (each corner's minimising term reduces to that value),
  // so the result is bit-identical. Gated on radius > 0 because all-zero
  // input yields a zero budget, not min(w, h) / 2.
  if (
    OTL === OTR &&
    OTR === OBR &&
    OBR === OBL &&
    OTL > 0 &&
    width > 0 &&
    height > 0
  ) {
    const budget = Math.min(width, height) / 2;
    const radius = Math.min(OTL, budget);
    // Shared reference is safe: callers only read the returned corners.
    const corner = { radius, roundingAndSmoothingBudget: budget };
    return {
      topLeft: corner,
      topRight: corner,
      bottomLeft: corner,
      bottomRight: corner,
    };
  }

  // Processing rank of each corner under a stable descending sort by radius.
  // A neighbour j precedes corner i when r_j > r_i, or r_j === r_i and j has
  // the earlier insertion index (TL=0, TR=1, BL=2, BR=3).
  const rankTL =
    (OTR > OTL ? 1 : 0) + (OBL > OTL ? 1 : 0) + (OBR > OTL ? 1 : 0);
  const rankTR =
    (OTL >= OTR ? 1 : 0) + (OBL > OTR ? 1 : 0) + (OBR > OTR ? 1 : 0);
  const rankBL =
    (OTL >= OBL ? 1 : 0) + (OTR >= OBL ? 1 : 0) + (OBR > OBL ? 1 : 0);
  const rankBR =
    (OTL >= OBR ? 1 : 0) + (OTR >= OBR ? 1 : 0) + (OBL >= OBR ? 1 : 0);

  // Current (clamped) radii and budgets; -1 budget marks "not yet processed".
  let cTL = OTL;
  let cTR = OTR;
  let cBL = OBL;
  let cBR = OBR;
  let bTL = -1;
  let bTR = -1;
  let bBL = -1;
  let bBR = -1;

  for (let step = 0; step < 4; step++) {
    const c =
      rankTL === step ? 0 : rankTR === step ? 1 : rankBL === step ? 2 : 3;

    if (c === 0) {
      // topLeft: H neighbour topRight (width), V neighbour bottomLeft (height)
      bTL = cornerBudget(OTL, cTR, bTR, width, cBL, bBL, height);
      cTL = Math.min(OTL, bTL);
    } else if (c === 1) {
      // topRight: H neighbour topLeft (width), V neighbour bottomRight (height)
      bTR = cornerBudget(OTR, cTL, bTL, width, cBR, bBR, height);
      cTR = Math.min(OTR, bTR);
    } else if (c === 2) {
      // bottomLeft: H neighbour bottomRight (width), V neighbour topLeft (height)
      bBL = cornerBudget(OBL, cBR, bBR, width, cTL, bTL, height);
      cBL = Math.min(OBL, bBL);
    } else {
      // bottomRight: H neighbour bottomLeft (width), V neighbour topRight (height)
      bBR = cornerBudget(OBR, cBL, bBL, width, cTR, bTR, height);
      cBR = Math.min(OBR, bBR);
    }
  }

  return {
    topLeft: { radius: cTL, roundingAndSmoothingBudget: bTL },
    topRight: { radius: cTR, roundingAndSmoothingBudget: bTR },
    bottomLeft: { radius: cBL, roundingAndSmoothingBudget: bBL },
    bottomRight: { radius: cBR, roundingAndSmoothingBudget: bBR },
  };
}

// ---- upstream: packages/core/src/generate-path.ts ----
/** Closest squircle match to continuous platform corners (≈0.5 px residual at R=100). */
export const CONTINUOUS_SMOOTHING = 0.65;

/** The common design-tool preset (60%) — use for design-handoff parity. */
export const HANDOFF_SMOOTHING = 0.6;

/** Default smoothing — same value as `CONTINUOUS_SMOOTHING`. Use `HANDOFF_SMOOTHING` for the 60% design-tool preset. */
export const DEFAULT_SMOOTHING = 0.65;
export const DEFAULT_PRESERVE_SMOOTHING = true;
export const DEFAULT_CURVE: CurveType = "squircle";

/** Coordinate formatter for the path templates below, which call it ~26 times
 *  per build; module scope so no closure is allocated per `generatePath` call. */
const r = fixed4;

type Resolved = Required<CornerConfig>;

interface ResolvedCorners {
  topLeft: Resolved;
  topRight: Resolved;
  bottomRight: Resolved;
  bottomLeft: Resolved;
}

function withDefaults(c: CornerConfig): Resolved {
  return {
    radius: c.radius,
    curve: c.curve ?? DEFAULT_CURVE,
    smoothing: c.smoothing ?? DEFAULT_SMOOTHING,
    exponent: c.exponent ?? DEFAULT_EXPONENT,
    preserveSmoothing: c.preserveSmoothing ?? DEFAULT_PRESERVE_SMOOTHING,
  };
}

function resolve(v: CornerConfig | number | undefined): Resolved {
  const c = typeof v === "number" ? { radius: v } : v ?? { radius: 0 };
  return withDefaults(c);
}

function resolveOptions(options: SmoothCornerOptions): ResolvedCorners {
  if ("radius" in options) {
    const c = withDefaults(options);
    return { topLeft: c, topRight: c, bottomRight: c, bottomLeft: c };
  }
  return {
    topLeft: resolve(options.topLeft),
    topRight: resolve(options.topRight),
    bottomRight: resolve(options.bottomRight),
    bottomLeft: resolve(options.bottomLeft),
  };
}

/** Prefix a corner's path segment with a space, or emit nothing for an empty
 *  segment (radius 0) so the `d` string never contains a double space. */
function seg(s: string): string {
  return s.length > 0 ? " " + s : "";
}

/** Cached builder output for one corner, keyed on its *normalized* radius and
 *  budget rather than the raw config. */
function cornerOutput(
  corner: Resolved,
  normalized: NormalizedCorner
): CurveBuilderOutput {
  const builder = getCurveBuilder(corner.curve);
  return getCachedBuilderOutput(corner.curve, builder, {
    cornerRadius: normalized.radius,
    smoothing: corner.smoothing,
    exponent: corner.exponent,
    preserveSmoothing: corner.preserveSmoothing,
    roundingAndSmoothingBudget: normalized.roundingAndSmoothingBudget,
  });
}

/** Slack allowed when deciding a corner's radius has reached the cap radius. */
const CAP_EPS = 1e-9;

/** True when the two corners of one end form a single continuous cap. */
function isCapEnd(
  cx: Resolved,
  cy: Resolved,
  nx: NormalizedCorner,
  ny: NormalizedCorner,
  capR: number
): boolean {
  return (
    cx.curve === "squircle" &&
    cy.curve === "squircle" &&
    Math.abs(nx.radius - capR) < CAP_EPS &&
    Math.abs(ny.radius - capR) < CAP_EPS &&
    cx.smoothing === cy.smoothing &&
    cx.preserveSmoothing === cy.preserveSmoothing
  );
}

/**
 * True when two corners feed the builder identical input, so a single cached
 * output can serve both orients.
 *
 * `resolveOptions` hands back one shared config object for the `{radius}` form
 * and `distributeAndNormalize` one shared normalized corner when all four radii
 * match, so reference identity answers the common case without reading a field.
 *
 * The raw `radius` is deliberately not compared: the builder only ever sees the
 * *normalized* radius, so two raw radii clamped to the same normalized value are
 * genuinely interchangeable. The normalized values must be compared, though —
 * `distributeAndNormalize` can give corners with identical configs different
 * budgets, and a different budget is a different corner shape.
 */
function sameBuilderInput(
  a: Resolved,
  an: NormalizedCorner,
  b: Resolved,
  bn: NormalizedCorner
): boolean {
  return (
    (a === b ||
      (a.curve === b.curve &&
        a.smoothing === b.smoothing &&
        a.exponent === b.exponent &&
        a.preserveSmoothing === b.preserveSmoothing)) &&
    (an === bn ||
      (an.radius === bn.radius &&
        an.roundingAndSmoothingBudget === bn.roundingAndSmoothingBudget))
  );
}

/** SVG path `d` string for a smooth-cornered rectangle. */
export function generatePath(
  width: number,
  height: number,
  options: SmoothCornerOptions
): string {
  if (width <= 0 || height <= 0) {
    return "M 0 0 H 0 V 0 H 0 Z";
  }

  const corners = resolveOptions(options);

  // Fast path: all corners zero
  if (
    corners.topLeft.radius <= 0 &&
    corners.topRight.radius <= 0 &&
    corners.bottomRight.radius <= 0 &&
    corners.bottomLeft.radius <= 0
  ) {
    return `M 0 0 H ${width} V ${height} H 0 Z`;
  }

  const normalized = distributeAndNormalize({
    topLeftCornerRadius: corners.topLeft.radius,
    topRightCornerRadius: corners.topRight.radius,
    bottomRightCornerRadius: corners.bottomRight.radius,
    bottomLeftCornerRadius: corners.bottomLeft.radius,
    width,
    height,
  });

  // Corner outputs are resolved by the branch that needs them, not up front:
  // the blend branch below returns without touching any corner, and a capped
  // end discards both of its corners. ~18% of a blend/capsule call used to go
  // into building outputs that were then thrown away.

  // In the band 2R < short side < 2(1+s)R the classic template would pop while
  // resizing toward a capsule; curves/blend.ts smooths per-edge instead. Both
  // band edges fall through to the byte-identical pure regimes.
  const u = corners.topLeft;
  if (isUniformSquircle(corners)) {
    const blendR = Math.min(u.radius, width / 2, height / 2);
    const shortHalf = Math.min(width, height) / 2;
    // Strict bounds keep the pure regimes' exact byte output at both edges.
    const BAND_EPS = 1e-9;
    if (
      blendR > 0 &&
      shortHalf > blendR + BAND_EPS &&
      shortHalf < (1 + u.smoothing) * blendR - BAND_EPS
    ) {
      return drawBlendPath(width, height, blendR, u.smoothing, u.preserveSmoothing);
    }
  }

  // Capsule smoothing: a fully-rounded end becomes one continuous
  // cap segment. Each end is independent (half-pills work); non-capsule ends
  // fall through to the byte-identical template below.
  const horizontal = width >= height;
  const capR = horizontal ? height / 2 : width / 2;

  if (horizontal) {
    const rightCap = isCapEnd(
      corners.topRight, corners.bottomRight,
      normalized.topRight, normalized.bottomRight, capR
    );
    const leftCap = isCapEnd(
      corners.topLeft, corners.bottomLeft,
      normalized.topLeft, normalized.bottomLeft, capR
    );
    if (rightCap || leftCap) {
      const longHalf = width / 2;
      const cR = rightCap
        ? capsuleEndParams(capR, corners.topRight.smoothing, corners.topRight.preserveSmoothing, longHalf)
        : null;
      const cL = leftCap
        ? capsuleEndParams(capR, corners.topLeft.smoothing, corners.topLeft.preserveSmoothing, longHalf)
        : null;

      // A capped end emits one cap segment, so only the uncapped end's corners
      // are built. Each `!` below sits inside the matching `cR`/`cL` guard.
      const oTL = cL ? null : cornerOutput(corners.topLeft, normalized.topLeft);
      const oTR = cR ? null : cornerOutput(corners.topRight, normalized.topRight);
      const oBR = cR ? null : cornerOutput(corners.bottomRight, normalized.bottomRight);
      const oBL = cL ? null : cornerOutput(corners.bottomLeft, normalized.bottomLeft);

      let d = "M " + r(cL ? cL.p : oTL!.p) + " 0";
      d += " L " + r(width - (cR ? cR.p : oTR!.p)) + " 0";
      if (cR) {
        d += " " + drawRightCap(cR);
      } else {
        d += seg(oTR!.pathSegment("TR"));
        d += " L " + r(width) + " " + r(oBR!.p);
        d += " L " + r(width) + " " + r(height - oBR!.p);
        d += seg(oBR!.pathSegment("BR"));
      }
      if (cL) {
        d += " L " + r(cL.p) + " " + r(height);
        d += " " + drawLeftCap(cL);
      } else {
        d += " L " + r(width - oBL!.p) + " " + r(height);
        d += " L " + r(oBL!.p) + " " + r(height);
        d += seg(oBL!.pathSegment("BL"));
        d += " L 0 " + r(height - oTL!.p);
        d += " L 0 " + r(oTL!.p);
        d += seg(oTL!.pathSegment("TL"));
      }
      return d + " Z";
    }
  } else {
    const topCap = isCapEnd(
      corners.topLeft, corners.topRight,
      normalized.topLeft, normalized.topRight, capR
    );
    const bottomCap = isCapEnd(
      corners.bottomLeft, corners.bottomRight,
      normalized.bottomLeft, normalized.bottomRight, capR
    );
    if (topCap || bottomCap) {
      const longHalf = height / 2;
      const cT = topCap
        ? capsuleEndParams(capR, corners.topLeft.smoothing, corners.topLeft.preserveSmoothing, longHalf)
        : null;
      const cB = bottomCap
        ? capsuleEndParams(capR, corners.bottomLeft.smoothing, corners.bottomLeft.preserveSmoothing, longHalf)
        : null;

      const oTL = cT ? null : cornerOutput(corners.topLeft, normalized.topLeft);
      const oTR = cT ? null : cornerOutput(corners.topRight, normalized.topRight);
      const oBR = cB ? null : cornerOutput(corners.bottomRight, normalized.bottomRight);
      const oBL = cB ? null : cornerOutput(corners.bottomLeft, normalized.bottomLeft);

      let d: string;
      if (cT) {
        d = "M 0 " + r(cT.p) + " " + drawTopCap(cT);
      } else {
        d = "M " + r(oTL!.p) + " 0";
        d += " L " + r(width - oTR!.p) + " 0";
        d += seg(oTR!.pathSegment("TR"));
      }
      d += " L " + r(width) + " " + r(height - (cB ? cB.p : oBR!.p));
      if (cB) {
        d += " " + drawBottomCap(cB);
      } else {
        d += seg(oBR!.pathSegment("BR"));
        d += " L " + r(oBL!.p) + " " + r(height);
        d += seg(oBL!.pathSegment("BL"));
      }
      if (cT) {
        d += " L 0 " + r(cT.p);
      } else {
        d += " L 0 " + r(height - oTL!.p);
        d += " L 0 " + r(oTL!.p);
        d += seg(oTL!.pathSegment("TL"));
      }
      return d + " Z";
    }
  }

  // Every corner contributes here, so all four resolve now. When they feed the
  // builder identical input, one lookup serves all four orients: four lookups
  // cost 0.383 µs building four cache keys and touching the LRU four times
  // against 0.094 µs for one — and they already returned this very object,
  // since an identical key is the same cache entry. The per-orient string memo
  // lives on the output, so each orient's segment stays independent.
  const oTL = cornerOutput(corners.topLeft, normalized.topLeft);
  const uniform =
    sameBuilderInput(corners.topLeft, normalized.topLeft, corners.topRight, normalized.topRight) &&
    sameBuilderInput(corners.topLeft, normalized.topLeft, corners.bottomRight, normalized.bottomRight) &&
    sameBuilderInput(corners.topLeft, normalized.topLeft, corners.bottomLeft, normalized.bottomLeft);
  const oTR = uniform ? oTL : cornerOutput(corners.topRight, normalized.topRight);
  const oBR = uniform ? oTL : cornerOutput(corners.bottomRight, normalized.bottomRight);
  const oBL = uniform ? oTL : cornerOutput(corners.bottomLeft, normalized.bottomLeft);

  // Each side ends with a paired L to the next corner's `p` — geometrically
  // a no-op when adjacent radii match, harmless otherwise. Direct concat
  // avoids a per-call template + whitespace regex pass; `r()` rounds each
  // coordinate to 4 decimals so output is bit-stable across Node / browser
  // engines (Math.sin/cos vary by 1 ULP between V8 builds, and the inner
  // pathSegments are already rounded to the same precision). `seg()` skips
  // the leading space for empty corner segments (radius=0) so we never
  // emit double-spaces.
  return (
    "M " + r(oTL.p) + " 0" +
    " L " + r(width - oTR.p) + " 0" +
    seg(oTR.pathSegment("TR")) +
    " L " + r(width) + " " + r(oBR.p) +
    " L " + r(width) + " " + r(height - oBR.p) +
    seg(oBR.pathSegment("BR")) +
    " L " + r(width - oBL.p) + " " + r(height) +
    " L " + r(oBL.p) + " " + r(height) +
    seg(oBL.pathSegment("BL")) +
    " L 0 " + r(height - oTL.p) +
    " L 0 " + r(oTL.p) +
    seg(oTL.pathSegment("TL")) +
    " Z"
  );
}

function isUniformSquircle(c: ResolvedCorners): boolean {
  const u = c.topLeft;
  const tr = c.topRight;
  const br = c.bottomRight;
  const bl = c.bottomLeft;
  return (
    u.curve === "squircle" &&
    tr.curve === "squircle" &&
    tr.radius === u.radius &&
    tr.smoothing === u.smoothing &&
    tr.preserveSmoothing === u.preserveSmoothing &&
    br.curve === "squircle" &&
    br.radius === u.radius &&
    br.smoothing === u.smoothing &&
    br.preserveSmoothing === u.preserveSmoothing &&
    bl.curve === "squircle" &&
    bl.radius === u.radius &&
    bl.smoothing === u.smoothing &&
    bl.preserveSmoothing === u.preserveSmoothing
  );
}

/** CSS `clip-path: path(...)` value for a smooth-cornered rectangle. */
export function generateClipPath(
  width: number,
  height: number,
  options: SmoothCornerOptions
): string {
  return `path("${generatePath(width, height, options)}")`;
}
