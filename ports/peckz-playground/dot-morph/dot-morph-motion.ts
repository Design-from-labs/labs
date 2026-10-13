/**
 * Frame-by-frame math for the three dots morphing into a three-piece mark.
 *
 * Every shape is resampled into the same number of points along its outline,
 * so a dot and a blade can be blended point by point. Each piece is split into
 * where it sits (its centroid, which orbits the centre) and what it looks like
 * (points relative to that centroid, which morph from a circle into a blade).
 *
 * The whole move is one gesture: every piece orbits one way only, clockwise
 * or counter-clockwise, and every channel eases out without overshoot, so
 * nothing ever turns back.
 *
 * Geometry lives in the 24-unit viewBox of the source icons.
 */

export type Point = { x: number; y: number };

export type Shape = {
  centroid: Point;
  /** Outline points relative to the centroid, clockwise on screen */
  local: Point[];
};

/** 1 orbits clockwise on screen, -1 counter-clockwise */
export type Direction = 1 | -1;

export type Track = {
  startAngle: number;
  /** Past startAngle in the orbit's direction: pieces never turn back */
  endAngle: number;
  /** Back at the dot one full lap on, further round the same way */
  returnAngle: number;
  direction: Direction;
  startRadius: number;
  endRadius: number;
  dot: Point[];
  /** Blade outline in its final orientation, point order matched to `dot` */
  blade: Point[];
  colorIndex: number;
};

export type PieceFrame = { d: string; mix: number; colorIndex: number };

export type Frame = {
  pieces: PieceFrame[];
  coreRadius: number;
  /** How fast the orbit is moving, in move-progress per play; peaks around 2.5 */
  velocity: number;
};

export type MotionSettings = {
  /** Extra lag on each blade's own rotation, in degrees, caught up by the end */
  twist: number;
  /** Fraction of the play the dots spin as circles before blooming into blades */
  expandAt: number;
};

export const CENTER = 12;
export const CORE_RADIUS = 3;
const SAMPLE_COUNT = 240;

/** dots-vertical-solid.svg, top to bottom */
export const DOT_PATHS = [
  "M10 5C10 3.89543 10.8954 3 12 3C13.1046 3 14 3.89543 14 5C14 6.10457 13.1046 7 12 7C10.8954 7 10 6.10457 10 5Z",
  "M10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12Z",
  "M10 19C10 17.8954 10.8954 17 12 17C13.1046 17 14 17.8954 14 19C14 20.1046 13.1046 21 12 21C10.8954 21 10 20.1046 10 19Z",
];

/**
 * The default mark: three petals around a core circle of r 3, top, lower left,
 * lower right. Any three closed paths in the 24-unit viewBox work (pass your
 * own through the component's `mark` prop); each one is a "blade" below.
 */
export const MARK_PATHS = [
  "M12 8.4C10.1 7.6 8 5.6 8 4A4 4 0 0 1 16 4C16 5.6 13.9 7.6 12 8.4Z",
  "M8.8823 13.8C9.1395 15.8454 8.4574 18.6641 7.0718 19.4641A4 4 0 0 1 3.0718 12.5359C4.4574 11.7359 7.2395 12.5546 8.8823 13.8Z",
  "M15.1177 13.8C16.7605 12.5546 19.5426 11.7359 20.9282 12.5359A4 4 0 0 1 16.9282 19.4641C15.5426 18.6641 14.8605 15.8454 15.1177 13.8Z",
];

/* ---------- Easing ---------- */

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

/** CSS cubic-bezier() as a function, solved with Newton steps and a bisection fallback */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  function sample(a1: number, a2: number, time: number) {
    return (
      3 * a1 * time * (1 - time) ** 2 +
      3 * a2 * time ** 2 * (1 - time) +
      time ** 3
    );
  }
  function slope(a1: number, a2: number, time: number) {
    return (
      3 * a1 * (1 - time) ** 2 +
      6 * (a2 - a1) * time * (1 - time) +
      3 * (1 - a2) * time ** 2
    );
  }
  return function ease(progress: number) {
    const clamped = clamp(progress, 0, 1);
    let time = clamped;
    for (let step = 0; step < 6; step++) {
      const error = sample(x1, x2, time) - clamped;
      const derivative = slope(x1, x2, time);
      if (Math.abs(error) < 1e-5) {
        return sample(y1, y2, time);
      }
      if (Math.abs(derivative) < 1e-6) {
        break;
      }
      time -= error / derivative;
    }
    let low = 0;
    let high = 1;
    time = clamped;
    for (let step = 0; step < 20; step++) {
      if (sample(x1, x2, time) < clamped) {
        low = time;
      } else {
        high = time;
      }
      time = (low + high) / 2;
    }
    return sample(y1, y2, time);
  };
}

/** One curve for the whole spin: eases in, peaks early, then a long soft brake. y never passes 1 */
const SPIN = cubicBezier(0.3, 0, 0.2, 1);
/** Folding back: fast off the mark, long settle into the spin's stop */
const EXPAND = cubicBezier(0.3, 0, 0.1, 1);
/** Blooming in: the dots stretch into blades from a standstill, so the shape blends instead of popping */
const BLOOM = cubicBezier(0.45, 0, 0.25, 1);
/** How long the bloom takes, as a fraction of the play */
const BLOOM_LENGTH = 0.6;
const COLOR_EASE = cubicBezier(0.4, 0, 0.2, 1);

type Channel = {
  start: number;
  end: number;
  ease: (progress: number) => number;
};

type Channels = Record<"move" | "shape" | "color" | "core", Channel>;

/**
 * When each channel runs, as fractions of the play. It's a figure skater: in,
 * the dots spin tight and only open into blades at `expandAt`, so the bloom is
 * what brakes the spin. Back, the arms come in first (core tucks, blades fold)
 * and the dots carry the lap on.
 */
function channelsFor(toMark: boolean, expandAt: number): Channels {
  if (toMark) {
    return {
      move: { start: 0, end: 1, ease: SPIN },
      shape: {
        start: expandAt,
        end: Math.min(1, expandAt + BLOOM_LENGTH),
        ease: BLOOM,
      },
      color: {
        start: Math.max(0, expandAt - 0.1),
        end: Math.min(1, expandAt + 0.35),
        ease: COLOR_EASE,
      },
      core: {
        start: Math.min(0.9, expandAt + 0.12),
        end: Math.min(1, expandAt + BLOOM_LENGTH),
        ease: BLOOM,
      },
    };
  }
  return {
    move: { start: 0, end: 1, ease: SPIN },
    shape: { start: 0, end: Math.max(0.3, 1 - expandAt), ease: EXPAND },
    color: { start: 0.1, end: Math.max(0.4, 1 - expandAt), ease: COLOR_EASE },
    core: { start: 0, end: 0.4, ease: EXPAND },
  };
}

/** How far toward the mark a channel is, 0 = dots, 1 = mark */
function channelAt(channel: Channel, progress: number, toMark: boolean) {
  const local = channel.ease(
    (progress - channel.start) / (channel.end - channel.start),
  );
  return toMark ? local : 1 - local;
}

/* ---------- Geometry ---------- */

const TAU = Math.PI * 2;

function rotatePoint(point: Point, radians: number): Point {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
}

function signedArea(points: Point[]) {
  let area = 0;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    area += point.x * next.y - next.x * point.y;
  });
  return area / 2;
}

function polygonCentroid(points: Point[]): Point {
  const area = signedArea(points);
  let x = 0;
  let y = 0;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    const cross = point.x * next.y - next.x * point.y;
    x += (point.x + next.x) * cross;
    y += (point.y + next.y) * cross;
  });
  return { x: x / (6 * area), y: y / (6 * area) };
}

/** Samples an svg path evenly along its length. Needs the DOM, so call it on the client */
export function sampleShape(d: string, count = SAMPLE_COUNT): Shape {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute(
    "style",
    "position:absolute;width:0;height:0;visibility:hidden",
  );
  const path = document.createElementNS(namespace, "path");
  path.setAttribute("d", d);
  svg.appendChild(path);
  document.body.appendChild(svg);
  const length = path.getTotalLength();
  let points = Array.from({ length: count }, (_, index) => {
    const point = path.getPointAtLength((length * index) / count);
    return { x: point.x, y: point.y };
  });
  svg.remove();

  // y points down, so a positive area is clockwise on screen
  if (signedArea(points) < 0) {
    points = points.reverse();
  }
  const centroid = polygonCentroid(points);
  return {
    centroid,
    local: points.map((point) => ({
      x: point.x - centroid.x,
      y: point.y - centroid.y,
    })),
  };
}

/** Rotates the target's point order so each point lands near its partner in the reference */
function alignTo(reference: Point[], target: Point[]) {
  const count = reference.length;
  let bestOffset = 0;
  let bestCost = Infinity;
  for (let offset = 0; offset < count; offset++) {
    let cost = 0;
    for (let index = 0; index < count; index++) {
      const point = target[(index + offset) % count];
      cost +=
        (point.x - reference[index].x) ** 2 +
        (point.y - reference[index].y) ** 2;
    }
    if (cost < bestCost) {
      bestCost = cost;
      bestOffset = offset;
    }
  }
  return reference.map((_, index) => target[(index + bestOffset) % count]);
}

function polar(point: Point) {
  return {
    angle: Math.atan2(point.y - CENTER, point.x - CENTER),
    radius: Math.hypot(point.x - CENTER, point.y - CENTER),
  };
}

/** How far a piece turns from one angle to another, at least `spin` so every piece turns hard. Always positive */
function sweepSize(
  from: number,
  to: number,
  spin: number,
  direction: Direction,
) {
  const base = ((((to - from) * direction) % TAU) + TAU) % TAU;
  const turns = Math.max(0, Math.ceil((spin - base) / TAU));
  return base + turns * TAU;
}

const PERMUTATIONS = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

/**
 * Pairs each dot with a blade so all of them sweep the same way by roughly the
 * same `spin` degrees, which makes the three read as one rotating group.
 */
export function buildTracks(
  dots: Shape[],
  blades: Shape[],
  spin: number,
  direction: Direction,
) {
  const spinRadians = (spin * Math.PI) / 180;
  const dotPolar = dots.map((dot) => polar(dot.centroid));
  const bladePolar = blades.map((blade) => polar(blade.centroid));
  const isOuter = dotPolar.map((dot) => dot.radius > 0.01);

  let bestOrder = PERMUTATIONS[0];
  let bestCost = Infinity;
  PERMUTATIONS.forEach((order) => {
    const cost = order.reduce((sum, bladeIndex, dotIndex) => {
      if (!isOuter[dotIndex]) {
        return sum;
      }
      const sweep = sweepSize(
        dotPolar[dotIndex].angle,
        bladePolar[bladeIndex].angle,
        spinRadians,
        direction,
      );
      return sum + (sweep - spinRadians) ** 2;
    }, 0);
    if (cost < bestCost) {
      bestCost = cost;
      bestOrder = order;
    }
  });

  const outerSweeps = bestOrder
    .map((bladeIndex, dotIndex) =>
      isOuter[dotIndex]
        ? sweepSize(
            dotPolar[dotIndex].angle,
            bladePolar[bladeIndex].angle,
            spinRadians,
            direction,
          )
        : null,
    )
    .filter((sweep): sweep is number => sweep !== null);
  const groupSweep =
    outerSweeps.reduce((sum, sweep) => sum + sweep, 0) / outerSweeps.length;

  return dots.map((dot, dotIndex): Track => {
    const bladeIndex = bestOrder[dotIndex];
    const endAngle = bladePolar[bladeIndex].angle;
    // The middle dot has no angle of its own: it swings out with the group
    const sweep = isOuter[dotIndex]
      ? sweepSize(dotPolar[dotIndex].angle, endAngle, spinRadians, direction)
      : groupSweep;
    // The way back keeps going the same way until the lap is whole. A short
    // leftover would feel limp after the big throw in, so it takes another lap
    let returnSweep = Math.ceil(sweep / TAU) * TAU - sweep;
    if (returnSweep < Math.PI / 2) {
      returnSweep += TAU;
    }
    return {
      startAngle: endAngle - sweep * direction,
      endAngle,
      returnAngle: endAngle + returnSweep * direction,
      direction,
      startRadius: dotPolar[dotIndex].radius,
      endRadius: bladePolar[bladeIndex].radius,
      dot: dot.local,
      blade: alignTo(dot.local, blades[bladeIndex].local),
      colorIndex: bladeIndex,
    };
  });
}

function toPath(points: Point[]) {
  return (
    "M" +
    points
      .map((point) => `${point.x.toFixed(3)} ${point.y.toFixed(3)}`)
      .join("L") +
    "Z"
  );
}

/** One frame at `progress` (0-1) through the play, toward the mark or back to the dots */
export function frameAt(
  progress: number,
  toMark: boolean,
  tracks: Track[],
  settings: MotionSettings,
): Frame {
  const channels = channelsFor(toMark, settings.expandAt);
  // How far along its orbit this play is, 0 -> 1 in either direction
  const travel = channelAt(channels.move, progress, true);
  const shape = channelAt(channels.shape, progress, toMark);
  const color = channelAt(channels.color, progress, toMark);
  const core = channelAt(channels.core, progress, toMark);
  const twistRadians = (settings.twist * Math.PI) / 180;

  const pieces = tracks.map((track): PieceFrame => {
    // Both plays orbit the same way: in from the dots, then on round the lap
    const angle = toMark
      ? lerp(track.startAngle, track.endAngle, travel)
      : lerp(track.endAngle, track.returnAngle, travel);
    const radius = toMark
      ? lerp(track.startRadius, track.endRadius, travel)
      : lerp(track.endRadius, track.startRadius, travel);
    const centre = {
      x: CENTER + radius * Math.cos(angle),
      y: CENTER + radius * Math.sin(angle),
    };
    // Each blade turns with its orbit. Forming, it starts behind and catches
    // up; folding away, it runs ahead, so the twist always adds to the spin
    const lag = twistRadians * (1 - shape);
    const orientation =
      angle - track.endAngle + (toMark ? -lag : lag) * track.direction;
    const points = track.dot.map((dotPoint, index) => {
      const blended = {
        x: lerp(dotPoint.x, track.blade[index].x, shape),
        y: lerp(dotPoint.y, track.blade[index].y, shape),
      };
      const rotated = rotatePoint(blended, orientation);
      return { x: centre.x + rotated.x, y: centre.y + rotated.y };
    });
    return { d: toPath(points), mix: color, colorIndex: track.colorIndex };
  });

  const step = 0.005;
  const velocity =
    Math.abs(
      channelAt(channels.move, progress + step, toMark) -
        channelAt(channels.move, progress - step, toMark),
    ) /
    (2 * step);

  return { pieces, coreRadius: CORE_RADIUS * core, velocity };
}

/* ---------- One dot and three ---------- */

const DOT_RADIUS = 2;
/** How far the top and bottom dots sit from the middle one, in DOT_PATHS */
const DOT_SPACING = 7;
/** Splitting: slow while the neck stretches, quick as it snaps, soft into the slots. y never passes 1 */
const SPLIT = cubicBezier(0.5, 0, 0.2, 1);
/** Merging: the outer dots gather pace, then the goo pulls them into one */
const MERGE = cubicBezier(0.45, 0, 0.35, 1);

function circlePath(x: number, y: number, radius: number) {
  return (
    `M${(x - radius).toFixed(3)} ${y.toFixed(3)}` +
    `a${radius.toFixed(3)} ${radius.toFixed(3)} 0 1 0 ${(radius * 2).toFixed(3)} 0` +
    `a${radius.toFixed(3)} ${radius.toFixed(3)} 0 1 0 ${(-radius * 2).toFixed(3)} 0Z`
  );
}

/** The resting single dot. All three pieces draw it, stacked */
export const SINGLE_DOT_PATH = circlePath(CENTER, CENTER, DOT_RADIUS);

/** The three dots, top to bottom. `spread` 0 = stacked into one dot, 1 = the menu dots */
function dotsFrame(spread: number, radius: number): Frame {
  const pieces = [-1, 0, 1].map((side, index): PieceFrame => {
    const y = CENTER + side * DOT_SPACING * spread;
    return { d: circlePath(CENTER, y, radius), mix: 0, colorIndex: index };
  });
  return { pieces, coreRadius: 0, velocity: 0 };
}

/** On load: the single dot swells in at the centre */
export function appearFrameAt(progress: number): Frame {
  return dotsFrame(0, DOT_RADIUS * EXPAND(progress));
}

/** One dot splitting into three, or three merging back into one */
export function splitFrameAt(progress: number, toThree: boolean): Frame {
  const spread = toThree ? SPLIT(progress) : 1 - MERGE(progress);
  return dotsFrame(spread, DOT_RADIUS);
}

/**
 * How gooey the split is at `progress`, 1 = full. The goo has to be gone by the
 * time three dots rest, because it slightly rounds and swells a still dot.
 * Merging, it comes up early, since the dots bridge before they touch
 */
export function splitGooAt(progress: number, toThree: boolean) {
  if (toThree) {
    const rise = EXPAND(progress / 0.15);
    const melt = COLOR_EASE((progress - 0.55) / 0.37);
    return rise * (1 - melt);
  }
  const rise = COLOR_EASE((progress - 0.05) / 0.3);
  const melt = COLOR_EASE((progress - 0.85) / 0.15);
  return rise * (1 - melt);
}

/* ---------- Colour ---------- */

function hexToLinear(hex: string) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(
    (channel) => {
      const srgb = channel / 255;
      return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
    },
  );
}

function linearToOklab(rgb: number[]) {
  const [red, green, blue] = rgb;
  const long = Math.cbrt(
    0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue,
  );
  const medium = Math.cbrt(
    0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue,
  );
  const short = Math.cbrt(
    0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue,
  );
  return [
    0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short,
    1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short,
    0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short,
  ];
}

function oklabToHex(lab: number[]) {
  const [lightness, greenRed, blueYellow] = lab;
  const long =
    (lightness + 0.3963377774 * greenRed + 0.2158037573 * blueYellow) ** 3;
  const medium =
    (lightness - 0.1055613458 * greenRed - 0.0638541728 * blueYellow) ** 3;
  const short =
    (lightness - 0.0894841775 * greenRed - 1.291485548 * blueYellow) ** 3;
  const linear = [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  ];
  return (
    "#" +
    linear
      .map((channel) => {
        const clamped = clamp(channel, 0, 1);
        const srgb =
          clamped <= 0.0031308
            ? clamped * 12.92
            : 1.055 * clamped ** (1 / 2.4) - 0.055;
        return Math.round(srgb * 255)
          .toString(16)
          .padStart(2, "0");
      })
      .join("")
  );
}

/** Blends two hex colours in OKLab so the midpoint never goes muddy */
export function mixColor(from: string, to: string, amount: number) {
  if (amount <= 0) {
    return from;
  }
  if (amount >= 1) {
    return to;
  }
  const start = linearToOklab(hexToLinear(from));
  const end = linearToOklab(hexToLinear(to));
  return oklabToHex(
    start.map((channel, index) => lerp(channel, end[index], amount)),
  );
}
