// A generated street map in the 1500 x 1500 space of the route: a stand-in for
// the pen's uploaded map photograph, which has no license. Pure geometry from
// a fixed seed, so the server and the client draw the same picture. It is the
// default `art` of ScrollMap; pass your own SVG content (an <image> of your own
// map, say) to replace it. It is a bare fragment, not a <g>: the fidelity run
// serves the same markup inside the pen, whose `.pov g` selector would move
// any group of its own.

const SIZE = 1500;
const CENTER = SIZE / 2;
const GRID_ANGLE = (-7 * Math.PI) / 180;
const MINOR = 64;
const MAJOR_EVERY = 4;

/** A small seeded generator (mulberry32), so the blocks never change. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Rotates a point of the street grid into map space. */
function rotate(x: number, y: number): [number, number] {
  const cos = Math.cos(GRID_ANGLE);
  const sin = Math.sin(GRID_ANGLE);
  const dx = x - CENTER;
  const dy = y - CENTER;
  return [CENTER + dx * cos - dy * sin, CENTER + dx * sin + dy * cos];
}

/** Clips the segment a-b to the map square (Liang-Barsky); null if outside. */
function clip(
  a: [number, number],
  b: [number, number],
): [[number, number], [number, number]] | null {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  let t0 = 0;
  let t1 = 1;
  const edges: [number, number][] = [
    [-dx, a[0]],
    [dx, SIZE - a[0]],
    [-dy, a[1]],
    [dy, SIZE - a[1]],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) {
        return null;
      }
    } else {
      const r = q / p;
      if (p < 0) {
        t0 = Math.max(t0, r);
      } else {
        t1 = Math.min(t1, r);
      }
      if (t0 > t1) {
        return null;
      }
    }
  }
  return [
    [a[0] + t0 * dx, a[1] + t0 * dy],
    [a[0] + t1 * dx, a[1] + t1 * dy],
  ];
}

function segment(a: [number, number], b: [number, number]): string {
  const c = clip(a, b);
  return c
    ? `M${round(c[0][0])} ${round(c[0][1])}L${round(c[1][0])} ${round(c[1][1])}`
    : "";
}

/** The streets of a rotated grid, then a few diagonals and the route's own. */
function streets() {
  let minor = "";
  let major = "";
  const reach = 1400;
  for (let i = -22; i <= 22; i++) {
    const offset = CENTER + i * MINOR;
    const target = i % MAJOR_EVERY === 0 ? "major" : "minor";
    for (const [a, b] of [
      [
        [offset, CENTER - reach],
        [offset, CENTER + reach],
      ],
      [
        [CENTER - reach, offset],
        [CENTER + reach, offset],
      ],
    ] as [[number, number], [number, number]][]) {
      const s = segment(rotate(a[0], a[1]), rotate(b[0], b[1]));
      if (target === "major") {
        major += s;
      } else {
        minor += s;
      }
    }
  }
  // Two avenues that cut across the grid.
  major += segment([0, 380], [1500, 980]);
  major += segment([200, 1500], [1280, 0]);
  // The ride's own streets: the route's legs, run out past both ends.
  const legs: [[number, number], [number, number]][] = [
    [
      [723.6, 989],
      [770, 860],
    ],
    [
      [761.6, 900],
      [765, 780],
    ],
    [
      [765, 833],
      [570, 845],
    ],
    [
      [738, 830],
      [734, 760],
    ],
    [
      [602, 800],
      [622, 905],
    ],
    [
      [610, 877],
      [770, 858],
    ],
    [
      [716, 862],
      [714, 790],
    ],
  ];
  for (const [a, b] of legs) {
    minor += segment(a, b);
  }
  return { minor, major };
}

/** Building blocks: a small rotated rectangle inset in most grid cells. */
function blocks(): string {
  const rand = seeded(1507);
  let d = "";
  const inset = 11;
  for (let i = -9; i < 10; i++) {
    for (let j = -9; j < 10; j++) {
      if (i % MAJOR_EVERY === 0 && j % MAJOR_EVERY === 0 && rand() < 0.3) {
        continue;
      }
      if (rand() < 0.22) {
        continue;
      }
      const x0 = CENTER + i * MINOR + inset;
      const y0 = CENTER + j * MINOR + inset;
      const w = MINOR - inset * 2 - Math.floor(rand() * 14);
      const h = MINOR - inset * 2 - Math.floor(rand() * 14);
      const pts = (
        [
          [x0, y0],
          [x0 + w, y0],
          [x0 + w, y0 + h],
          [x0, y0 + h],
        ] as [number, number][]
      ).map(([x, y]) => rotate(x, y));
      d += `M${pts.map(([x, y]) => `${round(x)} ${round(y)}`).join("L")}Z`;
    }
  }
  return d;
}

/** A rotated rectangle of the grid, as a path (used for the parks). */
function plot(i: number, j: number, cols: number, rows: number): string {
  const x0 = CENTER + i * MINOR + 5;
  const y0 = CENTER + j * MINOR + 5;
  const x1 = x0 + cols * MINOR - 10;
  const y1 = y0 + rows * MINOR - 10;
  const pts = (
    [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ] as [number, number][]
  ).map(([x, y]) => rotate(x, y));
  return `M${pts.map(([x, y]) => `${round(x)} ${round(y)}`).join("L")}Z`;
}

const STREETS = streets();
const BLOCKS = blocks();
const PARKS = plot(-4, -2, 2, 1) + plot(2, 0, 1, 2) + plot(-1, 3, 2, 1);
const WATER =
  "M0 1196C210 1128 400 1248 640 1206S1010 1120 1220 1176 1420 1160 1500 1128V1500H0Z";
const RIVER = "M1500 396C1330 470 1250 600 1290 740S1180 960 1110 1130";

export function ScrollMapArt() {
  return (
    <>
      <rect width={SIZE} height={SIZE} fill="#ece9df" stroke="none" />
      <path d={BLOCKS} fill="#dedacb" stroke="none" />
      <path d={PARKS} fill="#cfe0c0" stroke="none" />
      <path
        d={STREETS.minor}
        stroke="#d3cebd"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d={STREETS.major}
        stroke="#c7c0aa"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d={STREETS.minor}
        stroke="#ffffff"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d={STREETS.major}
        stroke="#fbf5e1"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path d={RIVER} stroke="#b9d3e6" strokeWidth="46" strokeLinecap="round" />
      <path d={WATER} fill="#b9d3e6" stroke="none" />
    </>
  );
}
