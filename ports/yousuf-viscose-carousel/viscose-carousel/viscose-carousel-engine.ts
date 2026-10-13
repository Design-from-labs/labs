import * as THREE from "three";
import {
  createTweens,
  setValues,
  type Timeline,
  type Tweens,
} from "./viscose-carousel-motion";
import {
  fragmentShader,
  MAX_LINKS,
  MAX_PLANES,
  textFragmentShader,
  textVertexShader,
  vertexShader,
} from "./viscose-carousel-shaders";

/*
 * The ring of Viscose Carousel, ported from Yousuf-developer/Viscose-carousel
 * at commit f91a6de57019b7dcc58c28a2ea83f5a6dd9f3882: components/Carousel.jsx
 * (the effect that drives the ring) and components/ring/utils.js, params.js,
 * atlas.js, splitText.js, bead.js and meta.js, merged into this file. Each
 * upstream module starts at a `// ---- upstream: <path> ----` marker and
 * keeps its lines, except where fidelity.md lists a change: GSAP is replaced
 * by Motion (./viscose-carousel-motion), the project page, the footage and
 * the lil-gui panel are left out, sizes follow the component's box instead of
 * the window, and the projects come from the `items` it is given.
 *
 * Copyright (c) 2026 Yousuf Soomro. MIT License; the full notice ends this
 * file.
 */

/** One card on the ring. */
export interface ViscoseCarouselItem {
  /** The project's name, set large over the ring and in the index. */
  title: string;
  /** The card's picture: any image URL the page may read (same origin or CORS). */
  image: string;
  /** The discipline beside the card. */
  discipline?: string;
  /** The year beside the card. */
  year?: string;
}

// ---- upstream: components/ring/utils.js ----
const TAU = Math.PI * 2;
const HALF_PI = Math.PI / 2;
const DEG = Math.PI / 180;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// Ring slot for plane i. The fan opens from the seed outwards, alternating
// sides: 0, +1, -1, +2, -2... Consecutive indices are therefore on opposite
// sides of the seed, which matters anywhere position is derived from index.
const signedOffset = (i: number) =>
  i === 0 ? 0 : i % 2 === 1 ? (i + 1) / 2 : -i / 2;

// Relaxation factor toward a target. Rates are written per 60fps frame and
// corrected for real frame time, so the feel holds at any refresh rate.
const chase = (dt: number, rate: number) => 1 - Math.pow(1 - rate, dt * 60);

// ---- upstream: components/ring/params.js ----
// The two rooms. Applied over the defaults by `theme`; each value is still a
// param of its own afterwards, so a room can be tuned from either start.
export const VISCOSE_THEMES = {
  dark: {
    paper: "#0e0e0d",
    ink: "#efece6",
    toneLift: 0,
    toneGain: 1,
    glow: 0.14,
    glowLight: 50,
    grain: 0.1,
    grainBlend: "soft-light",
    vignette: 0.6,
  },
  light: {
    paper: "#f2efe9",
    ink: "#16140f",
    toneLift: 0.035,
    toneGain: 1.07,
    glow: 0.16,
    glowLight: 30,
    grain: 0.08,
    grainBlend: "multiply",
    vignette: 0,
  },
};

/**
 * Every tunable in one place. A fresh object per mount.
 *
 *  - Every px figure is quoted at `refWidth` and scaled from there.
 *  - Below `narrowAt` and again below `tightAt` the ring is re-proportioned
 *    rather than just scaled down. Those bands multiply the fit, they do not
 *    replace it, and they stack.
 *
 * The three faces are CSS font-family lists; empty means the component's own
 * font (its computed font-family).
 */
export function viscoseCarouselDefaults(count = 18) {
  return {
    // -- fit ------------------------------------------------------------
    // 14" MacBook Pro at default scaling: 3024x1964 native, 1512x982 points.
    refWidth: 1512,
    refHeight: 870, // viewport, i.e. screen less menu bar and browser chrome
    fitHeight: 0, // 0 = width alone drives scale, 1 = whichever axis is tighter
    minScale: 0.5, // a phone is not a small desktop; bracket the extremes
    maxScale: 1.75,

    narrowAt: 1024, // inclusive
    narrowPlane: 1.25,
    narrowRadius: 1.3, // cards grow faster than the arc, or the gaps close up
    narrowText: 1.5, // type cannot shrink like a picture can and stay readable
    narrowPosX: -2.5,
    narrowEndScale: 4.22,

    tightAt: 640, // inclusive
    tightRadius: 0.82, // multiplies narrowRadius, for the ring as it forms
    tightCard: 0.8, // the front card's width at rest, of the window's
    tightSpacing: 0.54, // its neighbours' distance from it, of the window's height
    tightSplit: 0.8, // the heading, competing with the ring for centre screen

    // -- geometry, all at the reference window ---------------------------
    planeSize: 90, // long edge in px; aspect locked at 1.5 : 1
    count, // one plane per project, so the deal comes out even
    ringRadius: 340,
    seed: 0, // where plane 0 sits, degrees (0 = 3 o'clock)
    radial: true, // long edge points outward; off = long edge along the ring
    radius: 6, // corner
    textured: true, // off = flat silhouette, useful for reading the goo
    blend: 14, // px over which neighbouring art crossfades in the goo
    imageOffset: 0, // rotates the whole deal; 0 lands the entry on items[0]

    // -- loading ---------------------------------------------------------
    // The counter is the gate: the entry launches on the frame it reads 100.
    holdAfter: 0,
    loaderChase: 0.18,
    loaderBottom: 1, // vh
    loaderOut: 0.45, // seconds to fade once the hold lets go

    // -- entry timing ----------------------------------------------------
    stagger: 0.34,
    launchTime: 1.95,
    spreadEase: "power2.out",
    spreadTime: 3.6,
    stageAt: 0.7,
    spinTurns: 1,
    spinTime: 2.6,
    spinEase: "power2.inOut",
    spinDelay: 0,
    posX: -2, // fraction of half the viewport width
    posY: 0,
    endScale: 4.46,
    moveTime: 2.2,
    moveEase: "power2.inOut",
    moveDelay: 0.2,

    // -- scroll / drag / click, live once the entry finishes --------------
    scrollSpeed: 0.0022, // rad/s of angular velocity per px of wheel delta
    damping: 0.94, // velocity kept per 60fps frame
    maxSpeed: 12, // rad/s, so one flick cannot run away
    dragSpeed: 1,
    snap: true, // settle with a plane facing front
    snapTime: 0.8, // run-in, once the flick itself is spent
    snapFrom: 1, // rad/s under which the ring commits to a slot
    pickTime: 0.55, // click-to-centre: seconds for one slot, root-scaled
    pickEase: "power3.inOut",

    // -- the room ---------------------------------------------------------
    theme: "dark" as "dark" | "light",
    paper: "#0e0e0d",
    ink: "#efece6",
    toneLift: 0,
    toneGain: 1,

    // -- the intro heading, in the scene ---------------------------------
    text: "Works '26",
    textSize: 41,
    textFont: "",
    textWeight: 400,
    textTracking: 0, // em
    textAt: 0.42, // fraction of the spread
    textTime: 0.95,
    textStagger: 0.015,
    textEase: "power4.out",
    textOut: true,
    textOutAt: -0.5, // seconds relative to the ring landing; negative = early
    textOutTime: 0.7,
    textOutEase: "power2.in",

    // -- the type around the ring ---------------------------------------
    metaLeft: 5.5, // vw, the page's left margin
    metaRight: 5.5, // and its right
    titleSize: 13, // vw
    narrowTitle: 1, // x below narrowAt
    tightTitle: 1.4, // x below tightAt: as large as the longest name allows
    titleGap: 2, // vh between the name's foot and the card's top edge
    titleBlur: 0.15, // em the name smears to in its morph; the small rows use nameBlur
    titleDim: 1, // 1 is ink; lower sets the name back into the room
    titleLean: 0.6, // degrees of skew per rad/s
    titleLeanMax: 7, // and no further
    metaSize: 1.15, // vw, the discipline beside the year
    metaMin: 14, // px, its floor, which a phone reaches
    smallMin: 13, // px, the floor under the year, the counters and the index
    metaGapR: 1.2, // vw between them
    blockGap: 5, // vw from the card's right edge to the block
    listReach: 2.2, // slots over which the index brightens toward the front
    glow: 0.14, // strength, 0 is off
    glowSpread: 64, // vw, the falloff's horizontal radius
    glowLight: 50, // the glow's lightness, %: above the paper it lights, below it shades
    grain: 0.1, // opacity, 0 is off
    grainBlend: "soft-light", // or "multiply", which reads on light paper
    vignette: 0.6, // strength, 0 is off
    nameFont: "",
    nameWeight: 500,
    idxSize: (16 / 1440) * 100, // a step lighter and smaller than the name
    idxFont: "",
    idxWeight: 400,
    listSize: 1.0, // vw; the column's line height is unitless so rows follow
    listDim: 0.28, // opacity of the names not at the front

    // The morph between one card's words and the next.
    nameMorphTime: 1.2,
    nameEase: "circ.out",
    nameBlur: 8.5, // px the outgoing word smears to before it lets go
    nameEdge: 400, // alpha gain — how abruptly the threshold sets
    nameCut: 0.33, // and the alpha it sets at
    nameSoften: 0.35, // px of blur after it, standing in for antialiasing

    // -- glass lip along the top and bottom ------------------------------
    glass: true,
    bandTop: 0.08, // fraction of viewport height
    bandBottom: 0.08,
    refract: 60, // px the image is pulled in at the very edge
    squeeze: 0.05,
    ripple: 5, // px of wave along the lip
    rippleFreq: 0.02,
    fringe: 1.5, // px of chromatic split
    sheen: 0.05,

    // -- pointer ---------------------------------------------------------
    hover: true,
    touchHold: 0.16, // seconds of near-still press before a finger counts
    touchSlop: 10, // px of travel inside that window that calls it a swipe
    lag: 0.3, // cursor smoothing, per 60fps frame
    melt: 34, // px added to the ring's own blend at the cursor
    meltReach: 260, // px the softening and the wake carry
    reach: 1.7, // lean and swell falloff, in plane long edges
    swell: 0.09,
    pull: 26, // px a plane leans toward the cursor
    grab: 0.14, // how fast a plane takes up a lean, per 60fps frame
    release: 0.06, // and how slowly it lets go — asymmetric on purpose
    web: 0.2, // hovered thread width, as a fraction of the facing edge
    webReach: 1.15,
    wave: 4, // px of capillary wake at full pointer speed
    waveFreq: 0.05,
    waveSpeed: 7,

    sideScale: 0.035,
    sidePush: 17, // px
    sideDim: 0.15,
    sideReach: 2.4, // in plane long edges, measured from the hovered card

    // -- the bead at the cursor ----------------------------------------------
    beadSize: 14, // px across at rest
    beadPillH: 15, // px, half the pill's height over a card
    beadPillPad: 15, // px of honey either side of the word
    beadKnock: 0.55, // how bright the picture shows through the word
    beadTail: 0.38, // the tail's radius, as a fraction of the head's
    beadLag: 0.3, // how fast the tail catches up, per 60fps frame
    beadStretch: 2.6, // longest the drop gets, in head radii
    beadMelt: 20, // px of blend between it and a card
    beadReach: 64, // px from a card's edge at which the drop starts reaching for it
    beadInk: 2.5, // px over which its ink meets a card's colour
    beadSnap: 240, // px a thread stretches before it lets go
    beadHold: 1.3, // s a thread lasts if it is not pulled
    tagText: "View",
    wordSize: 13, // px

    // -- honey between neighbouring planes --------------------------------
    thread: 1.0,
    thin: 0.4,
    pinch: 0.35,
    sag: 6,
    dissolve: 2.9,
    fillet: 14,

    // -- birth of the seed -------------------------------------------------
    wobble: 3,
    goo: 35,
  };
}

export type ViscoseCarouselParams = ReturnType<typeof viscoseCarouselDefaults>;

type Uniforms = ReturnType<typeof createUniforms>;

// ---- upstream: components/ring/atlas.js ----
// Cell aspect matches the plane's 1.5 : 1 so nothing is distorted.
const CELL_MIN = 512;
const CELL_MAX = 1024;

function cellWidth(
  maxSize: number,
  cols: number,
  share: number,
  viewW: number,
  dpr: number,
) {
  const need = Math.round(viewW * share * dpr);
  const cell = Math.min(CELL_MAX, Math.max(CELL_MIN, need));
  // Never past what the GPU will take, or the upload fails silently.
  return Math.min(cell, Math.floor(maxSize / cols));
}

const loadImage = (src: string, priority?: "high" | "low") =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    // The sheet is uploaded to WebGL and read back for its colour, so a
    // picture from another origin has to come with CORS.
    if (!/^(data|blob):/.test(src)) img.crossOrigin = "anonymous";
    // Must be set before src or the request is already away.
    if (priority) img.fetchPriority = priority;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });

/**
 * Packs every image into one texture, synchronously blank and filling in as
 * images arrive. `first` settles once cell 0 is on the texture, `ready` once
 * all of them are. Neither rejects.
 */
function buildAtlas(
  files: string[],
  onProgress: (p: number) => void,
  maxSize: number,
  onColor: (i: number, rgb: number[]) => void,
  share: number,
  viewW: number,
  dpr: number,
) {
  const cols = Math.ceil(Math.sqrt(files.length));
  const rows = Math.ceil(files.length / cols);
  const CELL_W = cellWidth(maxSize, cols, share, viewW, dpr);
  const CELL_H = Math.round(CELL_W / 1.5);

  const canvas = document.createElement("canvas");
  canvas.width = cols * CELL_W;
  canvas.height = rows * CELL_H;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  const texture = new THREE.CanvasTexture(canvas);
  // The shader flips each cell itself, so leave the sheet as drawn.
  texture.flipY = false;
  // NoColorSpace deliberately: this shader writes straight to the framebuffer
  // with no encoding step.
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;

  // The room is lit by the front card, so each picture's average colour is
  // read as it lands: an 8x8 downsample, which is sixty-four pixels of it.
  const probe = document.createElement("canvas");
  probe.width = probe.height = 8;
  const pctx = probe.getContext("2d", {
    willReadFrequently: true,
  }) as CanvasRenderingContext2D;
  const average = (img: HTMLImageElement) => {
    pctx.drawImage(img, 0, 0, 8, 8);
    const d = pctx.getImageData(0, 0, 8, 8).data;
    let r = 0;
    let g = 0;
    let b = 0;
    for (let k = 0; k < d.length; k += 4) {
      r += d[k];
      g += d[k + 1];
      b += d[k + 2];
    }
    const n = d.length / 4;
    return [r / n, g / n, b / n];
  };

  const paint = (img: HTMLImageElement, i: number) => {
    const x = (i % cols) * CELL_W;
    const y = Math.floor(i / cols) * CELL_H;

    // Cover fit: fill the cell, crop the overflow, never squash.
    const scale = Math.max(CELL_W / img.width, CELL_H / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, CELL_W, CELL_H); // clip, or an oversized image bleeds
    ctx.clip();
    ctx.drawImage(img, x + (CELL_W - dw) / 2, y + (CELL_H - dh) / 2, dw, dh);
    ctx.restore();
    onColor?.(i, average(img));
  };

  let settled = 0;
  const tick = () => onProgress?.(settled / files.length);

  const fetchInto = (i: number, priority: "high" | "low") =>
    loadImage(files[i], priority)
      .then((img) => paint(img, i))
      .catch((err) => console.warn("[atlas]", err.message))
      .finally(() => {
        settled++;
        tick();
      });

  // Cell 0 is the seed's art, the only thing on screen during the hold, so it
  // is asked for ahead of the rest and uploaded the moment it lands.
  const first = fetchInto(0, "high").then(() => {
    texture.needsUpdate = true;
  });

  // One upload at the end for everything else.
  const ready = Promise.all([
    first,
    ...files.slice(1).map((_, k) => fetchInto(k + 1, "low")),
  ]).then(() => {
    texture.needsUpdate = true;
  });

  tick();
  return { texture, grid: [cols, rows], count: files.length, first, ready };
}

// ---- upstream: components/ring/splitText.js ----
type Glyph = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

/**
 * The intro heading, one glyph per quad, in the scene so the planes sweep
 * over it. `chars` are the reveal uniforms and `fades` the opacity ones; the
 * entry timeline tweens both as arrays.
 */
function createSplitText(group: THREE.Group, params: ViscoseCarouselParams) {
  let chars: { value: number }[] = [];
  let fades: { value: number }[] = [];

  const dispose = () => {
    for (const child of [...(group.children as Glyph[])]) {
      group.remove(child);
      child.geometry.dispose();
      child.material.uniforms.uTex.value?.dispose();
      child.material.dispose();
    }
    chars = [];
    fades = [];
  };

  const build = () => {
    dispose();

    const size = params.textSize;
    // Above display resolution — type is the first thing to show softness and
    // these canvases are tiny.
    const dpr = Math.min(window.devicePixelRatio, 2) * 2;
    const font = `${params.textWeight} ${size}px ${params.textFont}`;

    const measure = document
      .createElement("canvas")
      .getContext("2d") as CanvasRenderingContext2D;
    measure.font = font;

    const glyphs = [...params.text];
    const advances = glyphs.map((ch) => measure.measureText(ch).width);
    const tracking = params.textTracking * size;
    const totalW =
      advances.reduce((a, b) => a + b, 0) + tracking * (glyphs.length - 1);

    // Padding gives overhanging glyphs room and lengthens the wipe a little.
    const pad = size * 0.25;
    const cellH = size * 1.3 + pad * 2;

    let x = -totalW / 2;

    glyphs.forEach((ch, i) => {
      const adv = advances[i];
      if (ch.trim()) {
        const cellW = adv + pad * 2;

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.ceil(cellW * dpr));
        canvas.height = Math.max(1, Math.ceil(cellH * dpr));
        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
        ctx.scale(dpr, dpr);
        ctx.font = font;
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#000";
        ctx.fillText(ch, pad, pad + size); // puts cap-height centre on y = 0

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.NoColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;

        const mat = new THREE.ShaderMaterial({
          vertexShader: textVertexShader,
          fragmentShader: textFragmentShader,
          uniforms: {
            uTex: { value: tex },
            uReveal: { value: 0 },
            // As authored: the shader writes it straight through.
            uColor: {
              value: new THREE.Color().setStyle(
                params.ink,
                THREE.LinearSRGBColorSpace,
              ),
            },
            uOpacity: { value: 1 },
          },
          transparent: true,
          depthTest: false,
          depthWrite: false,
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
        mesh.scale.set(cellW, cellH, 1);
        // Cell is the advance box plus symmetric padding, so centring on the
        // advance keeps the run correctly spaced.
        mesh.position.set(x + adv / 2, 0, 0);
        mesh.renderOrder = 0;
        group.add(mesh);
        chars.push(mat.uniforms.uReveal);
        fades.push(mat.uniforms.uOpacity);
      }
      x += adv + tracking;
    });
  };

  return {
    build,
    dispose,
    get chars() {
      return chars;
    },
    get fades() {
      return fades;
    },
  };
}

// ---- upstream: components/ring/bead.js ----
// The sheet, in css px: wide enough for a longer word.
const SHEET_W = 160;
const SHEET_H = 40;

/**
 * The word cut out of the cursor's bead when it opens into a pill over a
 * card. Only the green channel is used. `width` is the set word's width in
 * css px, which the pill is sized from.
 */
function createBeadWord(params: ViscoseCarouselParams, uniforms: Uniforms) {
  let tex: THREE.CanvasTexture | null = null;
  let width = 0;

  const build = () => {
    const word = String(params.tagText).toUpperCase();
    // Above display resolution: small type over busy artwork.
    const dpr = Math.min(window.devicePixelRatio, 2) * 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(SHEET_W * dpr);
    canvas.height = Math.ceil(SHEET_H * dpr);

    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    ctx.font = `500 ${params.wordSize}px ${params.nameFont}`;
    const track = params.wordSize * 0.1;
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${track}px`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Tracking trails the last letter too, so centring leaves the word half a
    // space left of the pointer; put it back, and leave it out of the width.
    width = ctx.measureText(word).width - track;
    ctx.fillStyle = "#0f0";
    ctx.fillText(word, SHEET_W * 0.5 + track * 0.5, SHEET_H * 0.5);

    tex?.dispose();
    tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.NoColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    uniforms.uBeadTex.value = tex;
    const lp = uniforms.uBeadLP.value;
    lp.set(SHEET_W * 0.5, SHEET_H * 0.5, lp.z, lp.w);
  };

  const dispose = () => tex?.dispose();

  return {
    build,
    dispose,
    get width() {
      return width;
    },
  };
}

// ---- upstream: components/ring/meta.js ----
/**
 * The project block beside the ring: the title on one row, [type . year] on
 * the row under it, and a counter over both.
 *
 * Changing card melts one set of words into the next. Two copies are stacked,
 * one blurred out as the other blurs in, and the pair run through an alpha
 * threshold that forces every pixel above a cut solid and drops the rest.
 * A word that is not actually changing is painted from a third row outside
 * the filtered subtree, so it does not thicken.
 */
export interface ViscoseMetaGroup {
  box: HTMLElement | null;
  goo: HTMLElement | null;
  layers: (HTMLElement | null)[];
  plain: HTMLElement | null;
  blur?: number;
}

type MetaGroups = { left: ViscoseMetaGroup; right: ViscoseMetaGroup };

const SIDES = ["left", "right"] as const;
const SLOTS = 2;

const slotsOf = (row: HTMLElement | null | undefined) =>
  row?.firstElementChild?.children as HTMLCollectionOf<HTMLElement> | undefined;

// One word's share of a morph. f = 1 present, 0 gone.
function fade(el: HTMLElement | undefined, f: number, blur: number) {
  if (!el) return;
  if (f >= 1) {
    el.style.filter = "none";
    el.style.opacity = "1";
  } else if (f <= 0) {
    // Cleared as well as hidden, so a spent word is not left holding a 100px
    // blur the compositor has to keep around.
    el.style.filter = "none";
    el.style.opacity = "0";
  } else {
    el.style.filter = `blur(${Math.min(blur / f - blur, 100)}px)`;
    el.style.opacity = `${Math.pow(f, 0.4)}`;
  }
}

function createGroup(
  side: (typeof SIDES)[number],
  groups: MetaGroups,
  params: ViscoseCarouselParams,
  tw: Tweens,
  filterId: string,
) {
  const m = { t: 1 };
  let prev = ["", ""];
  let moving = [false, false];

  const draw = () => {
    const g = groups[side];
    if (!g) return;
    const out = slotsOf(g.layers[0]);
    const into = slotsOf(g.layers[1]);
    const held = slotsOf(g.plain);
    const t = m.t;

    for (let j = 0; j < SLOTS; j++) {
      if (moving[j]) {
        // Each group smears in proportion to its own size.
        fade(out?.[j], 1 - t, g.blur ?? params.nameBlur);
        fade(into?.[j], t, g.blur ?? params.nameBlur);
        if (held?.[j]) held[j].style.opacity = "0";
      } else {
        if (out?.[j]) out[j].style.opacity = "0";
        if (into?.[j]) into[j].style.opacity = "0";
        if (held?.[j]) held[j].style.opacity = "1";
      }
    }

    // Only worth its cost while two words are in play.
    if (g.goo) {
      g.goo.style.filter =
        t >= 1 ? "none" : `url(#${filterId}) blur(${params.nameSoften}px)`;
    }
  };

  const set = (parts: string[], dur?: number) => {
    const g = groups[side];
    if (!g?.layers[0] || !g.layers[1] || !g.plain) return;
    tw.killTweensOf(m);

    // A change landing mid-morph finishes the one in flight first.
    m.t = 1;
    draw();

    const next = [parts[0] ?? "", parts[1] ?? ""];
    moving = [next[0] !== prev[0], next[1] !== prev[1]];

    const out = slotsOf(g.layers[0]);
    const into = slotsOf(g.layers[1]);
    const held = slotsOf(g.plain);
    for (let j = 0; j < SLOTS; j++) {
      if (out?.[j]) out[j].textContent = prev[j];
      if (into?.[j]) into[j].textContent = next[j];
      if (held?.[j]) held[j].textContent = next[j];
    }
    prev = next;

    if (!moving[0] && !moving[1]) {
      m.t = 1;
      draw();
      return;
    }

    m.t = 0;
    draw();
    tw.to(
      m,
      { t: 1 },
      {
        duration: dur ?? params.nameMorphTime,
        ease: params.nameEase,
        onUpdate: draw,
      },
    );
  };

  // Finish whatever morph is in flight, now.
  const settle = () => {
    tw.killTweensOf(m);
    m.t = 1;
    draw();
  };

  return { m, set, settle };
}

interface MetaRefs {
  groups: MetaGroups;
  loader: HTMLElement | null;
  cut: Element | null;
  live: HTMLElement | null;
  count: HTMLElement | null;
}

interface MetaLayout {
  textK: number;
  viewW: number;
  viewH: number;
  titleVw: number;
  blockX: number;
  blockW: number;
  blockY: number;
  under: number | null;
  cardTop: number;
}

function createMeta(
  refs: MetaRefs,
  params: ViscoseCarouselParams,
  tw: Tweens,
  items: ViscoseCarouselItem[],
  filterId: string,
) {
  const { groups, loader, cut, live, count } = refs;
  const left = createGroup("left", groups, params, tw, filterId);
  const right = createGroup("right", groups, params, tw, filterId);

  // Only the alpha row does any work; colour passes straight through.
  const setThreshold = () => {
    cut?.setAttribute(
      "values",
      `1 0 0 0 0
       0 1 0 0 0
       0 0 1 0 0
       0 0 0 ${params.nameEdge} ${-params.nameEdge * params.nameCut}`,
    );
  };

  const style = ({
    textK,
    viewW,
    viewH,
    titleVw,
    blockX,
    blockW,
    blockY,
    under,
    cardTop,
  }: MetaLayout) => {
    const gapPx = (params.titleGap / 100) * (viewW * 0.65);
    const titlePx = (titleVw * viewW) / 100;
    // In px with floors: in vw alone the small type fell to 6px on a phone.
    const metaPx = Math.max(
      params.metaMin,
      (params.metaSize * textK * viewW) / 100,
    );
    const smallPx = Math.max(
      params.smallMin,
      (params.idxSize * textK * viewW) / 100,
    );
    const midY = under != null ? under + smallPx * 0.5 + metaPx * 0.75 : blockY;
    const titleFace = params.textFont;
    const bigFace = params.nameFont;
    const smallFace = params.idxFont;

    for (const side of SIDES) {
      const g = groups[side];
      if (!g?.box) continue;
      const isTitle = side === "left";
      g.box.style.display = "";

      const rowPx = isTitle ? titlePx : metaPx;
      g.blur = isTitle ? titlePx * params.titleBlur : params.nameBlur;
      // Roomy, because this box is what the filter region is measured off and
      // the blur needs somewhere to go.
      const h = rowPx * 3;
      g.box.style.height = `${h}px`;

      if (isTitle) {
        // The name: full width, centred on the card, its foot a gap above the
        // card's top edge, and behind the canvas so the ring passes in front.
        g.box.style.width = `${viewW}px`;
        g.box.style.left = "0";
        g.box.style.right = "auto";
        g.box.style.top = `${cardTop - gapPx - titlePx * 0.5 - h * 0.5}px`;
        g.box.style.bottom = "";
        g.box.style.transform = "none";
        g.box.style.translate = "none";
        g.box.style.zIndex = "-1";
      } else {
        g.box.style.width = `${Math.max(160, blockW)}px`;
        g.box.style.left = `${blockX}px`;
        g.box.style.right = "auto";
        g.box.style.top = `${midY + metaPx * 0.75}px`;
        g.box.style.bottom = "";
        g.box.style.transform = "";
        g.box.style.translate = "";
        g.box.style.zIndex = "";
      }

      // All three rows, the steady one included. They have to agree exactly or
      // a word would jump as it moved between them.
      for (const layer of [...g.layers, g.plain]) {
        if (!layer) continue;
        layer.style.alignItems = "";
        layer.style.justifyContent = isTitle ? "center" : "flex-start";
        const row = layer.firstElementChild as HTMLElement;
        row.style.alignItems = "";
        row.style.flexDirection = "";
        row.style.gap = isTitle
          ? "0"
          : `${Math.max(metaPx * 0.6, (params.metaGapR * viewW) / 100)}px`;
        // On the row, not the words: the morph owns the words' opacity.
        row.style.opacity = isTitle ? `${params.titleDim}` : "";
        const [lead, trail] = row.children as HTMLCollectionOf<HTMLElement>;
        lead.style.display = isTitle ? "none" : "";
        lead.style.order = "";
        lead.style.marginTop = "";
        lead.style.marginLeft = "";
        lead.style.lineHeight = "";
        lead.style.letterSpacing = "";
        lead.style.color = "";
        lead.style.fontFamily = bigFace;
        lead.style.fontSize = `${metaPx}px`;
        lead.style.fontWeight = `${params.nameWeight}`;
        trail.style.fontFamily = isTitle ? titleFace : smallFace;
        trail.style.fontSize = isTitle ? `${titlePx}px` : `${smallPx}px`;
        trail.style.fontWeight = isTitle
          ? `${params.textWeight}`
          : `${params.idxWeight}`;
        trail.style.letterSpacing = isTitle ? "-0.03em" : "";
        trail.style.lineHeight = isTitle ? "1" : "";
        trail.style.color = "";
      }
    }

    // The counter, over the discipline.
    if (count) {
      count.style.left = `${blockX}px`;
      count.style.top = `${midY - metaPx * 0.75}px`;
      count.style.fontFamily = smallFace;
      count.style.fontSize = `${smallPx}px`;
      count.style.fontWeight = `${params.idxWeight}`;
      count.style.color = "var(--viscose-carousel-ink-2)";
    }

    // The load counter is set from here too.
    if (loader) {
      loader.style.bottom = `${(params.loaderBottom * viewH) / 100}px`;
      loader.style.fontFamily = smallFace;
      loader.style.fontSize = `${smallPx}px`;
      loader.style.fontWeight = `${params.idxWeight}`;
    }

    setThreshold();
  };

  // The name leans with the ring. On the rows, not the box.
  let leaning = 0;
  const lean = (deg: number) => {
    if (Math.abs(deg - leaning) < 0.02) return;
    leaning = deg;
    const g = groups.left;
    if (!g) return;
    const t = Math.abs(deg) < 0.02 ? "" : `skewX(${(-deg).toFixed(2)}deg)`;
    for (const layer of [...g.layers, g.plain]) {
      const row = layer?.firstElementChild as HTMLElement | null | undefined;
      if (row) row.style.transform = t;
    }
  };

  // Both groups in one call, so the number can never drift from the name it
  // is numbering.
  const show = (i: number, dur?: number) => {
    const p = items[i];
    if (!p) return;
    left.set([String(i + 1).padStart(2, "0"), p.title], dur);
    right.set([p.discipline ?? "", p.year ?? ""], dur);
    if (count) {
      count.textContent = `${String(i + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
    }
    // The groups are hidden from the accessibility tree, so the card is
    // announced once, in full, from the live region instead.
    if (live) {
      const detail = [p.discipline, p.year].filter(Boolean).join(", ");
      live.textContent = detail ? `${p.title}. ${detail}.` : `${p.title}.`;
    }
  };

  const settle = () => {
    left.settle();
    right.settle();
  };

  const dispose = () => {
    tw.killTweensOf(left.m);
    tw.killTweensOf(right.m);
  };

  return { show, style, setThreshold, settle, lean, dispose };
}

// ---- upstream: components/Carousel.jsx ----
// The fan starts fractionally into the spread so the seed reads first.
const FAN_START = 0.06;

const blankTexture = () => {
  const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  t.needsUpdate = true;
  return t;
};

const MAX_TEXT = 17;
const MAX_RULES = 5;

function createUniforms(
  params: ViscoseCarouselParams,
  blanks: {
    hero: THREE.Texture;
    live: THREE.Texture;
    more: THREE.Texture;
    text: THREE.Texture;
  },
) {
  return {
    uResolution: { value: new THREE.Vector2(1, 1) },
    uSize: { value: new THREE.Vector2(150, 100) },
    uRadius: { value: params.radius },
    uCount: { value: params.count },
    uPos: {
      value: Array.from({ length: MAX_PLANES }, () => new THREE.Vector2()),
    },
    uRot: { value: new Float32Array(MAX_PLANES) },
    // xy = birth scale, z = brightness, w = atlas cell. Packed because a
    // uniform array costs a full vec4 row per element either way.
    uScale: {
      value: Array.from(
        { length: MAX_PLANES },
        () => new THREE.Vector4(0, 0, 1, 0),
      ),
    },
    uLinkCount: { value: 0 },
    uLinkA: {
      value: Array.from({ length: MAX_LINKS }, () => new THREE.Vector2()),
    },
    uLinkB: {
      value: Array.from({ length: MAX_LINKS }, () => new THREE.Vector2()),
    },
    // (rEnd, rMid, sag, fillet), packed to stay inside the uniform budget.
    uLinkPar: {
      value: Array.from({ length: MAX_LINKS }, () => new THREE.Vector4()),
    },
    uK: { value: params.goo },
    uWobble: { value: params.wobble },
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(params.ink) },
    uTone: { value: new THREE.Vector2(params.toneLift, params.toneGain) },
    uAtlas: { value: blankTexture() as THREE.Texture }, // placeholder so the sampler is bound
    uGrid: { value: new THREE.Vector2(1, 1) },
    uBlend: { value: params.blend },
    uTextured: { value: 0 },
    uBandTop: { value: 0 },
    uBandBottom: { value: 0 },
    uGlass: { value: new THREE.Vector4() },
    uFringe: { value: 0 },
    uSheen: { value: 0 },
    uMouse: { value: new THREE.Vector4() },
    uMelt: { value: new THREE.Vector4() },
    uBead: { value: new THREE.Vector4(-1e4, -1e4, -1e4, -1e4) },
    uBeadR: { value: new THREE.Vector4() },
    uBeadT: { value: new THREE.Vector4(0, 0, -100, -100) },
    uBeadTex: { value: blanks.text },
    uBeadL: { value: new THREE.Vector4() },
    uBeadLP: { value: new THREE.Vector4(1, 1, 1, 0) },
    // The project page's samplers and blocks: bound, and left at "none".
    uHero: { value: blanks.hero },
    uHeroP: { value: new THREE.Vector4(-1, 0, 1, 1) },
    uLive: { value: blanks.live },
    uLiveP: { value: new THREE.Vector4(-1, 0, 1, 1) },
    uMore: { value: blanks.more },
    uMoreP: { value: new THREE.Vector4(1e6, 1, 0, 0) },
    uText: { value: blanks.text },
    uTextCount: { value: 0 },
    uTextRect: {
      value: Array.from({ length: MAX_TEXT }, () => new THREE.Vector4()),
    },
    uTextUV: {
      value: Array.from({ length: MAX_TEXT }, () => new THREE.Vector4()),
    },
    uTextA: { value: new Float32Array(MAX_TEXT) },
    uRule: {
      value: Array.from({ length: MAX_RULES }, () => new THREE.Vector4()),
    },
  };
}

/** The DOM the component renders around the canvas. */
export interface ViscoseCarouselElements {
  /** The component's root: the room's colours are written on it. */
  root: HTMLElement;
  glow: HTMLElement | null;
  grain: HTMLElement | null;
  count: HTMLElement | null;
  loader: HTMLElement | null;
  live: HTMLElement | null;
  cut: Element | null;
  list: HTMLElement | null;
  listItems: (HTMLElement | null)[];
  meta: MetaGroups;
}

export interface ViscoseCarouselEngineOptions {
  canvas: HTMLCanvasElement;
  context: WebGL2RenderingContext | WebGLRenderingContext;
  elements: ViscoseCarouselElements;
  items: ViscoseCarouselItem[];
  params?: Partial<ViscoseCarouselParams>;
  /** The id of the SVG filter that fuses the melting words. */
  filterId: string;
  /** The device pixel ratio to draw at. */
  dpr: number;
  /** A card was opened (clicked at the front, or turned to by a click). */
  onOpen?: (index: number) => void;
  /** The card facing front changed. */
  onFront?: (index: number) => void;
}

export interface ViscoseCarouselEngine {
  resize: (width: number, height: number, dpr: number) => void;
  frame: () => void;
  /** Turn the ring by whole cards (1 = the next project). */
  step: (by: number) => void;
  /** Turn the ring to a project. */
  goTo: (index: number) => void;
  /** Open the card at the front (or the one being turned to). */
  activate: () => void;
  dispose: () => void;
}

export function createViscoseCarouselEngine(
  options: ViscoseCarouselEngineOptions,
): ViscoseCarouselEngine {
  const { canvas, elements: els, filterId } = options;
  const items = options.items.slice(0, MAX_LINKS);
  const container = canvas;
  const listEl = els.list;
  const loaderEl = els.loader;
  const glowEl = els.glow;
  const grainEl = els.grain;
  let disposed = false;

  const user = options.params ?? {};
  const params = viscoseCarouselDefaults(items.length);
  params.theme = user.theme ?? params.theme;
  Object.assign(params, VISCOSE_THEMES[params.theme] ?? {});
  Object.assign(params, user);
  params.count = items.length;
  // The faces default to the component's own font.
  const inherited = getComputedStyle(els.root).fontFamily || "sans-serif";
  params.textFont ||= inherited;
  params.nameFont ||= inherited;
  params.idxFont ||= inherited;

  // progress: the seed is born at screen centre
  // launch:   the seed travels out to its place on the ring
  // spread:   the rest peel off it and the ring draws
  // spin:     whole-ring rotation, radians
  // shift:    the ring moves off centre and resizes
  const state = { progress: 0, launch: 0, spread: 0, spin: 0, shift: 0 };

  // Motion drives every tween on this clock, advanced once per drawn frame.
  const tw = createTweens(performance.now());

  // The loop's context, created with the attributes three.js asks for with
  // { antialias: true, alpha: true }.
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context: options.context as WebGL2RenderingContext,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(options.dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);

  const heroBlank = blankTexture();
  const liveBlank = blankTexture();
  // Paper, not white, so a plane born before its art reads as an unlit slab.
  const moreBlank = new THREE.DataTexture(
    new Uint8Array([14, 14, 13, 255]),
    1,
    1,
  );
  moreBlank.needsUpdate = true;
  const textBlank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
  textBlank.needsUpdate = true;

  const uniforms = createUniforms(params, {
    hero: heroBlank,
    live: liveBlank,
    more: moreBlank,
    text: textBlank,
  });

  const glyphs = () => textGroup.children as Glyph[];

  // The room, written to the root so the CSS reads the same two colours the
  // shader and the heading do.
  const rethemeHooks: (() => void)[] = [];
  const retheme = () => {
    const root = els.root;
    root.style.setProperty("--viscose-carousel-paper", params.paper);
    root.style.setProperty("--viscose-carousel-ink", params.ink);
    const paper = new THREE.Color(params.paper);
    // Scrollbars and form controls follow the room.
    const lum = 0.2126 * paper.r + 0.7152 * paper.g + 0.0722 * paper.b;
    root.style.colorScheme = lum < 0.5 ? "dark" : "light";
    // As authored, not converted to linear: the shader writes colour
    // straight through.
    uniforms.uColor.value.setStyle(params.ink, THREE.LinearSRGBColorSpace);
    uniforms.uTone.value.set(params.toneLift, params.toneGain);
    // The paper in the values the shader writes straight through.
    const ps = paper.clone().convertLinearToSRGB();
    for (const glyph of glyphs()) {
      glyph.material.uniforms.uColor.value.setStyle(
        params.ink,
        THREE.LinearSRGBColorSpace,
      );
    }
    (moreBlank.image.data as Uint8Array).set([
      Math.round(ps.r * 255),
      Math.round(ps.g * 255),
      Math.round(ps.b * 255),
      255,
    ]);
    moreBlank.needsUpdate = true;
    // The paper the room's gradients are dithered against: ±1 level of
    // triangular noise, so on average it is the paper itself.
    if (glowEl) {
      const tile = document.createElement("canvas");
      tile.width = tile.height = 64;
      const tctx = tile.getContext("2d") as CanvasRenderingContext2D;
      const img = tctx.createImageData(64, 64);
      const rgb = [ps.r, ps.g, ps.b].map((v) => Math.round(v * 255));
      for (let i = 0; i < img.data.length; i += 4) {
        const n =
          (Math.random() < 0.5 ? 0 : 1) + (Math.random() < 0.5 ? 0 : 1) - 1;
        img.data[i] = rgb[0] + n;
        img.data[i + 1] = rgb[1] + n;
        img.data[i + 2] = rgb[2] + n;
        img.data[i + 3] = 255;
      }
      tctx.putImageData(img, 0, 0);
      glowEl.style.setProperty(
        "--viscose-carousel-dither",
        `url(${tile.toDataURL()})`,
      );
    }
    for (const fn of rethemeHooks) fn();
  };

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
    }),
  );
  // Above the type, so the planes occlude it as the ring sweeps past.
  mesh.renderOrder = 10;
  scene.add(mesh);

  const textGroup = new THREE.Group();
  scene.add(textGroup);
  retheme();

  const splitText = createSplitText(textGroup, params);
  const wordSheet = createBeadWord(params, uniforms);
  const meta = createMeta(
    {
      groups: els.meta,
      loader: loaderEl,
      cut: els.cut,
      live: els.live,
      count: els.count,
    },
    params,
    tw,
    items,
    filterId,
  );

  /* ---------------------------------------------------------------- art */
  let firstIn = false; // the seed's own cell is on the texture
  let loadProg = 0; // and how much of the rest has arrived, 0..1

  // Opened on the frame the counter reads 100, and by nothing else.
  let launchReady = false;
  const readyWaiters: (() => void)[] = [];
  const whenReady = (fn: () => void) =>
    launchReady ? fn() : readyWaiters.push(fn);

  // Each picture's average colour, lifted to a light.
  const tint: string[] = [];
  const tintRaw: number[][] = [];
  const lift = ([r, g, b]: number[]) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    let h = 0;
    let s = 0;
    if (d > 0.0001) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    // A tint, not a colour.
    const light = params.glowLight;
    const sat = light < 50 ? Math.min(45, s * 80) : Math.min(55, s * 120);
    return `hsl(${h.toFixed(0)} ${sat.toFixed(0)}% ${light}%)`;
  };

  let viewW = Math.max(1, canvas.clientWidth);
  let viewH = Math.max(1, canvas.clientHeight);

  const atlas = buildAtlas(
    items.map((item) => item.image),
    (p) => {
      if (!disposed) loadProg = p;
    },
    renderer.capabilities.maxTextureSize,
    (i, rgb) => {
      if (disposed) return;
      tintRaw[i] = rgb;
      tint[i] = lift(rgb);
      if (i === shown) paintGlow();
    },
    // A phone's front card is most of the width; elsewhere ~40% of it.
    viewW <= params.tightAt ? Math.max(0.4, params.tightCard) : 0.4,
    viewW,
    options.dpr,
  );

  uniforms.uAtlas.value.dispose();
  atlas.texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  uniforms.uAtlas.value = atlas.texture;
  uniforms.uGrid.value.set(atlas.grid[0], atlas.grid[1]);
  const imageCount = atlas.count;

  // Art is dealt by ring slot, not plane index. Negated because turning the
  // ring forward walks the front slot backwards.
  const cellOf = (slot: number) => {
    const imgOff = Math.round(params.imageOffset);
    return imageCount > 0
      ? (((imgOff - slot) % imageCount) + imageCount) % imageCount
      : 0;
  };

  atlas.first.then(() => {
    if (!disposed) firstIn = true;
  });
  atlas.ready.then(() => {
    if (!disposed) loadProg = 1;
  });

  /* --------------------------------------------------------------- size */
  const bounds = { left: 0, top: 0 };

  let fit = 1;
  let planeK = 1;
  let radiusK = 1;
  let textK = 1;
  let narrowNow = false;
  let tightNow = false;
  let tightEnd = 1;
  let tightX = 0;
  // The stage's end scale in this band.
  const endNow = () =>
    tightNow ? tightEnd : narrowNow ? params.narrowEndScale : params.endScale;

  const refit = () => {
    const byW = viewW / Math.max(1, params.refWidth);
    const byH = viewH / Math.max(1, params.refHeight);
    const s =
      byW * (1 - params.fitHeight) + Math.min(byW, byH) * params.fitHeight;
    fit = Math.min(params.maxScale, Math.max(params.minScale, s));

    const narrow = viewW <= params.narrowAt;
    const tight = viewW <= params.tightAt;
    narrowNow = narrow;
    tightNow = tight;
    planeK = narrow ? params.narrowPlane : 1;
    radiusK =
      (narrow ? params.narrowRadius : 1) * (tight ? params.tightRadius : 1);
    textK = narrow ? params.narrowText : 1;
    // A phone is composed in fractions of its own window.
    if (tight) {
      const formed = params.ringRadius * radiusK * fit;
      const atRest =
        (params.tightSpacing * viewH) /
        (2 * Math.sin(Math.PI / Math.max(3, Math.round(params.count))));
      const card = Math.min(params.tightCard * viewW, viewH * 0.5);
      tightEnd = Math.max(1, atRest / formed);
      planeK = card / tightEnd / (params.planeSize * fit);
      tightX = -atRest / (viewW * 0.5);
    }

    // The heading is rasterised per glyph; scaling the group costs nothing.
    const k = fit * textK * (tight ? params.tightSplit : 1);
    textGroup.scale.set(k, k, 1);
  };

  // The glass lip's inner edge, in CSS px from the top of the box.
  const lipPx = () => (params.glass ? params.bandTop * viewH : 0);

  const titleVwNow = () => {
    const vw =
      params.titleSize *
      (tightNow ? params.tightTitle : narrowNow ? params.narrowTitle : 1);
    const g = endNow() * fit;
    const W = params.planeSize * planeK * g;
    const cardTop = viewH * 0.5 - W / 1.5 / 2;
    const gapPx = (params.titleGap / 100) * (viewW * 0.65);
    // Nothing sits above the name but the lip, which it keeps out of.
    const room = cardTop - gapPx - lipPx();
    return Math.min(vw, Math.max(3, (room / viewW) * 100));
  };

  // The site frame and the index column.
  const styleSite = () => {
    const small = `${(params.listSize * textK * viewW) / 100}px`;
    if (grainEl) {
      grainEl.style.opacity = `${params.grain}`;
      grainEl.style.mixBlendMode = params.grainBlend;
    }
    if (glowEl) {
      const el = glowEl;
      el.style.setProperty("--viscose-carousel-vig", `${params.vignette}`);
      el.style.setProperty("--viscose-carousel-glow-a", `${params.glow}`);
      el.style.setProperty(
        "--viscose-carousel-glow-w",
        `${(params.glowSpread * viewW) / 100}px`,
      );
      el.style.setProperty(
        "--viscose-carousel-glow-h",
        `${(params.glowSpread * 0.7 * viewW) / 100}px`,
      );
    }
    if (listEl) {
      listEl.style.right = `${(params.metaRight * viewW) / 100}px`;
      listEl.style.fontSize = small;
      listEl.style.display = tightNow ? "none" : "";
    }
  };

  const styleMeta = () => {
    styleSite();
    const g = endNow() * fit;
    const W = params.planeSize * planeK * g;
    const gap = (params.blockGap / 100) * viewW;
    const blockX = viewW * 0.5 + W * 0.5 + gap;
    const colW = listEl && !tightNow ? listEl.offsetWidth : 0;
    const right = (params.metaRight / 100) * viewW;
    const blockW = viewW - right - (colW ? colW + gap * 0.6 : 0) - blockX;
    const cardTop = viewH * 0.5 - W / 1.5 / 2;
    const phone = tightNow;
    meta.style({
      textK,
      viewW,
      viewH,
      titleVw: titleVwNow(),
      blockX: phone ? viewW * 0.5 - W * 0.5 : blockX,
      blockW: phone ? W : blockW,
      blockY: viewH * 0.5,
      under: phone ? viewH * 0.5 + W / 1.5 / 2 + 0.035 * viewW : null,
      cardTop,
    });
  };

  // Everything that arrives with the heading.
  const siteEls = () => [listEl, els.count].filter(Boolean) as HTMLElement[];

  const resize = () => {
    refit();
    renderer.setSize(viewW, viewH, false);
    camera.left = -viewW / 2;
    camera.right = viewW / 2;
    camera.top = viewH / 2;
    camera.bottom = -viewH / 2;
    camera.updateProjectionMatrix();
    mesh.scale.set(viewW, viewH, 1);
    uniforms.uResolution.value.set(viewW, viewH);

    const rect = canvas.getBoundingClientRect();
    bounds.left = rect.left;
    bounds.top = rect.top;
  };

  let needsRender = true;
  resize();

  /* ------------------------------------------------------- spin & input */
  const ringCentre = { x: 0, y: 0 };
  let frontAngle = 0;
  let interactive = false;
  let spinVel = 0; // rad/s
  let dragging = false;
  let dragPrevAngle = 0;
  let dragPrevTime = 0;

  let settling = false;
  let snapTo = 0;
  let snapCap = 0;

  // A click (or a key) is turning the ring to a card; momentum is suspended.
  let picking = false;
  // The cell a pick is turning to, so keys step on from where it will land.
  let pickCell = -1;

  let pointerTravel = 0; // tells a click from a drag
  let travelX = 0;
  let travelY = 0;

  const pointerAngle = (e: PointerEvent) => {
    const dx = e.clientX - bounds.left - ringCentre.x;
    const dy = e.clientY - bounds.top - ringCentre.y;
    return Math.atan2(-dy, dx);
  };

  const stopPick = () => {
    if (!picking) return;
    tw.killTweensOf(state);
    picking = false;
    pickCell = -1;
  };

  // A card opens: the component's onOpen. The name is shown first if the
  // ring has not shown it yet.
  const openProject = (i: number) => {
    if (!interactive) return;
    const cell = cellOf(signedOffset(i));
    if (announced !== cell) {
      meta.show(cell);
      announced = cell;
    }
    options.onOpen?.(cell);
  };

  // Turn the ring until plane i faces front, then (by default) open it.
  const pick = (i: number, open = true) => {
    const slot = TAU / Math.round(params.count);
    const base = frontAngle - params.seed * DEG - signedOffset(i) * slot;
    const target = base + Math.round((state.spin - base) / TAU) * TAU;

    const slots = Math.abs(target - state.spin) / slot;
    // Already facing front: the click means open it.
    if (slots < 0.01) {
      if (open) openProject(i);
      return;
    }

    const dur = params.pickTime * Math.sqrt(Math.max(1, slots));

    const c = cellOf(signedOffset(i));
    if (announced !== c) {
      meta.show(c, Math.min(params.nameMorphTime, dur));
      announced = c;
    }

    spinVel = 0;
    settling = false;
    picking = true;
    pickCell = c;
    tw.killTweensOf(state);
    tw.to(
      state,
      { spin: target },
      {
        duration: dur,
        ease: params.pickEase,
        onComplete: () => {
          picking = false;
          pickCell = -1;
          if (open) openProject(i);
        },
      },
    );
  };

  // Which plane is wearing a given cell right now.
  const planeOf = (cell: number) => {
    const count = Math.round(params.count);
    for (let i = 0; i < count; i++) {
      if (cellOf(signedOffset(i)) === cell) return i;
    }
    return -1;
  };

  /* ------------------------------------------------------------ pointer */
  const pointer = { x: 0, y: 0, inside: false, seeded: false };
  const cursor = { x: 0, y: 0, amt: 0, wake: 0 };

  let coarse = false;
  let held = false;
  let holdTimer = 0;

  const endHold = () => {
    clearTimeout(holdTimer);
    holdTimer = 0;
    held = false;
  };

  const beginHold = () => {
    clearTimeout(holdTimer);
    holdTimer = window.setTimeout(() => {
      held = true;
    }, params.touchHold * 1000);
  };

  const engaged = () => (coarse ? held : pointer.inside);

  const trackPointer = (e: PointerEvent) => {
    coarse = e.pointerType === "touch";
    // The box can move with the page, so it is measured with the event.
    const rect = canvas.getBoundingClientRect();
    bounds.left = rect.left;
    bounds.top = rect.top;
    pointer.x = e.clientX - bounds.left - viewW * 0.5;
    pointer.y = viewH * 0.5 - (e.clientY - bounds.top);
    pointer.inside = true;
    if (!pointer.seeded) {
      pointer.seeded = true;
      cursor.x = pointer.x;
      cursor.y = pointer.y;
    }
  };

  const onPointerLeave = () => {
    pointer.inside = false;
  };

  const onWheel = (e: WheelEvent) => {
    if (!interactive) return;
    e.preventDefault();
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    stopPick();
    settling = false;
    spinVel += d * params.scrollSpeed;
    spinVel = Math.max(-params.maxSpeed, Math.min(params.maxSpeed, spinVel));
  };

  const onPointerDown = (e: PointerEvent) => {
    pointerTravel = 0;
    travelX = e.clientX;
    travelY = e.clientY;
    trackPointer(e);
    if (!interactive) return;
    stopPick();
    if (coarse) beginHold();
    dragging = true;
    paintCursor();
    settling = false;
    spinVel = 0;
    dragPrevAngle = pointerAngle(e);
    dragPrevTime = performance.now();
    canvas.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    trackPointer(e);

    pointerTravel +=
      Math.abs(e.clientX - travelX) + Math.abs(e.clientY - travelY);
    travelX = e.clientX;
    travelY = e.clientY;
    if (coarse && !held && pointerTravel > params.touchSlop) endHold();

    if (!dragging) return;

    const a = pointerAngle(e);
    let delta = a - dragPrevAngle;
    if (delta > Math.PI) delta -= TAU;
    if (delta < -Math.PI) delta += TAU;

    const turn = delta * params.dragSpeed;
    state.spin += turn;

    const now = performance.now();
    spinVel = turn / (Math.max(8, now - dragPrevTime) / 1000);
    dragPrevAngle = a;
    dragPrevTime = now;
  };

  const onPointerUp = (e: PointerEvent) => {
    trackPointer(e);
    endHold();
    if (!dragging) return;
    dragging = false;
    paintCursor();
    if (canvas.hasPointerCapture?.(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  };

  const onClick = () => {
    if (!interactive || pointerTravel >= 5) return;
    if (over < 0) return;
    pick(over);
  };

  container.addEventListener("wheel", onWheel, { passive: false });
  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("pointerup", onPointerUp);
  container.addEventListener("pointercancel", onPointerUp);
  container.addEventListener("pointerleave", onPointerLeave);
  container.addEventListener("click", onClick);

  const updatePointer = (dt: number) => {
    const live = params.hover && engaged() && pointer.seeded && interactive;
    cursor.amt += ((live ? 1 : 0) - cursor.amt) * chase(dt, 0.12);

    const k = chase(dt, params.lag);
    cursor.x += (pointer.x - cursor.x) * k;
    cursor.y += (pointer.y - cursor.y) * k;

    const trail = Math.hypot(pointer.x - cursor.x, pointer.y - cursor.y);
    cursor.wake = Math.max(
      cursor.wake * Math.pow(0.94, dt * 60),
      clamp01(trail / (Math.max(dt, 0.001) * 2600)),
    );

    uniforms.uMouse.value.set(
      cursor.x,
      cursor.y,
      cursor.amt,
      params.melt * fit,
    );
    uniforms.uMelt.value.set(
      params.meltReach * fit,
      params.wave * fit * cursor.wake * cursor.amt,
      params.waveFreq,
      params.waveSpeed,
    );
  };

  /* ------------------------------------------------------- load counter */
  const loading = { shown: 0 };

  const tickLoader = (dt: number) => {
    const target = Math.min(loadProg, clamp01(state.progress));
    loading.shown += (target - loading.shown) * chase(dt, params.loaderChase);

    // Never 000; that reads as nothing happening.
    const n = Math.min(100, Math.max(1, Math.round(loading.shown * 100)));
    if (loaderEl) loaderEl.textContent = String(n).padStart(3, "0");

    if (!launchReady && n >= 100) {
      launchReady = true;
      for (const fn of readyWaiters) fn();
      readyWaiters.length = 0;
    }
  };

  /* ------------------------------------------------------- the carousel */
  const travel = new Float32Array(MAX_PLANES);
  const cum = new Float32Array(MAX_PLANES);
  const order: number[] = [];
  const bySlot = (a: number, b: number) => signedOffset(a) - signedOffset(b);
  // Where each plane would sit with no cursor near it.
  const rest = Array.from({ length: MAX_PLANES }, () => new THREE.Vector2());

  const hoverF = new Float32Array(MAX_PLANES);
  const leanX = new Float32Array(MAX_PLANES);
  const leanY = new Float32Array(MAX_PLANES);
  const webF = new Float32Array(MAX_LINKS);
  const sideF = new Float32Array(MAX_PLANES);
  // Where the hovered card is, latched at the end of a frame for the next.
  const focusPos = new THREE.Vector2();

  const swellOf = (i: number) =>
    Math.max(0.05, 1 + params.swell * hoverF[i] - params.sideScale * sideF[i]);

  // Which card is at the front, and which is under the cursor.
  let shown = -1;
  let announced = -1;
  let over = -1;
  const bead = {
    on: false,
    r: 0,
    v: 0,
    hw: 0,
    hv: 0,
    tx: 0,
    ty: 0,
    word: 0,
    card: -1,
    from: -1,
    ax: 0,
    ay: 0,
    s: 0,
    held: false,
  };
  // A thread starts where the head left the card, kept in the card's units.
  const pullFrom = (i: number, W: number, H: number) => {
    const c = uniforms.uPos.value[i];
    const rot = uniforms.uRot.value[i];
    const sc = uniforms.uScale.value[i];
    const hw = W * 0.5 * sc.x;
    const hh = H * 0.5 * sc.y;
    const bury = params.beadSize * 0.5;
    if (hw <= bury || hh <= bury) return;
    const qx = pointer.x - c.x;
    const qy = pointer.y - c.y;
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    let lx = qx * cr + qy * sr;
    let ly = -qx * sr + qy * cr;
    const rr = Math.min(uniforms.uRadius.value, hw, hh);
    const core = Math.max(rr, bury);
    const kx = Math.max(-(hw - core), Math.min(hw - core, lx));
    const ky = Math.max(-(hh - core), Math.min(hh - core, ly));
    let ox = lx - kx;
    let oy = ly - ky;
    const ol = Math.hypot(ox, oy);
    const reach = Math.max(0, rr - bury);
    if (ol > reach) {
      ox *= reach / ol;
      oy *= reach / ol;
    }
    lx = kx + ox;
    ly = ky + oy;
    bead.from = i;
    bead.ax = lx / hw;
    bead.ay = ly / hh;
    bead.s = 1;
    bead.held = true;
  };
  const glowAt = { x: -1, y: -1 };
  let leanNow = 0;
  const listK = new Float32Array(MAX_PLANES);
  const listO = new Float32Array(MAX_PLANES).fill(-1);

  const paintCursor = () => {
    canvas.style.cursor = bead.on
      ? "none"
      : !interactive
        ? ""
        : dragging
          ? "grabbing"
          : over >= 0
            ? "pointer"
            : "grab";
  };

  // The room takes the front card's colour.
  const paintGlow = () => {
    const el = glowEl;
    if (el && shown >= 0 && tint[shown]) {
      el.style.setProperty("--viscose-carousel-glow", tint[shown]);
    }
  };
  rethemeHooks.push(() => {
    for (let i = 0; i < tintRaw.length; i++) {
      if (tintRaw[i]) tint[i] = lift(tintRaw[i]);
    }
    paintGlow();
  });

  const paintList = () => {
    const list = els.listItems;
    for (let i = 0; i < list.length; i++) {
      const el = list[i];
      if (!el) continue;
      const on = i === shown;
      if (on) el.setAttribute("aria-current", "true");
      else el.removeAttribute("aria-current");
    }
  };

  const layout = (dt: number) => {
    const count = Math.round(params.count);
    uniforms.uCount.value = count;

    const step = TAU / count;
    const spread = clamp01(state.spread);

    const endScale = endNow();
    const posX = tightNow
      ? tightX
      : narrowNow
        ? params.narrowPosX
        : params.posX;

    // The stage transform. Everything in plane-pixels goes through g.
    const shift = clamp01(state.shift);
    const g = (1 + (endScale - 1) * shift) * fit;
    const cx = posX * viewW * 0.5 * shift;
    const cy = params.posY * viewH * 0.5 * shift;

    ringCentre.x = viewW * 0.5 + cx;
    ringCentre.y = viewH * 0.5 - cy;
    frontAngle = cx !== 0 || cy !== 0 ? Math.atan2(-cy, -cx) : 0;

    const W = params.planeSize * planeK * g;
    const H = W / 1.5;
    uniforms.uSize.value.set(W, H);
    uniforms.uRadius.value = params.radius * planeK * g;

    const sepExtent = params.radial ? H : W;
    const faceEdge = params.radial ? W : H;

    const R = params.ringRadius * radiusK * g;
    const restingGap = 2 * R * Math.sin(step / 2) - sepExtent;
    const finalSep = Math.max(1, restingGap);

    const maxN = Math.max(1, Math.abs(signedOffset(count - 1)));
    const dur = Math.max(0.1, 1 - FAN_START - params.stagger);

    cum[0] = 0;
    for (let n = 1; n <= maxN; n++) {
      const start = FAN_START + ((n - 1) / maxN) * params.stagger;
      const t = clamp01((spread - start) / dur);
      const e = t * t * (3 - 2 * t);
      travel[n] = e;
      cum[n] = cum[n - 1] + e;
    }

    const seedAngle = params.seed * DEG;
    const launch = easeInOutCubic(clamp01(state.launch));
    const Rnow = R * launch;

    // The glow sits on the front of the ring.
    if (glowEl) {
      const gx = viewW * 0.5 + Math.cos(frontAngle) * Rnow + cx;
      const gy = viewH * 0.5 - (Math.sin(frontAngle) * Rnow + cy);
      if (Math.abs(gx - glowAt.x) > 0.5 || Math.abs(gy - glowAt.y) > 0.5) {
        glowAt.x = gx;
        glowAt.y = gy;
        glowEl.style.setProperty(
          "--viscose-carousel-glow-x",
          `${gx.toFixed(1)}px`,
        );
        glowEl.style.setProperty(
          "--viscose-carousel-glow-y",
          `${gy.toFixed(1)}px`,
        );
      }
    }

    order.length = 0;

    const track = cursor.amt > 0.001;
    const reach = Math.max(1, params.reach * W);
    const sideReach = Math.max(1, params.sideReach * W);
    // Asymmetric on purpose: the ring takes up a lean quickly and lets go
    // slowly.
    const kRise = chase(dt, params.grab);
    const kFall = chase(dt, params.release);

    let frontI = -1;
    let frontD = 1e9;
    let frontCell = 0;

    const probe = pointer.inside && pointer.seeded && interactive;
    let overI = -1;
    const focusI = track ? over : -1;

    for (let i = 0; i < count; i++) {
      const sIdx = signedOffset(i);
      const n = Math.abs(sIdx);
      const u = i === 0 ? clamp01(state.progress) : travel[n];
      const cell = cellOf(sIdx);

      const angle = seedAngle + Math.sign(sIdx) * step * cum[n] + state.spin;
      const px = Math.cos(angle) * Rnow + cx;
      const py = Math.sin(angle) * Rnow + cy;
      rest[i].set(px, py);

      const da = angle - frontAngle;
      const sda = Math.atan2(Math.sin(da), Math.cos(da));
      const toFront = Math.abs(sda);
      if (toFront < frontD) {
        frontD = toFront;
        frontI = i;
        frontCell = cell;
      }
      listK[cell] = toFront / step;

      // Lean toward the cursor, scaled by u so the unborn keep out of it.
      let f = 0;
      let toX = 0;
      let toY = 0;
      if (track) {
        const dx = cursor.x - px;
        const dy = cursor.y - py;
        const dist = Math.hypot(dx, dy);
        f = smoothstep(reach, reach * 0.22, dist) * cursor.amt * u;
        if (f > 0.0001 && dist > 0.0001) {
          const lean = (params.pull * fit * f) / dist;
          toX = dx * lean;
          toY = dy * lean;
        }
      }

      const k = f > hoverF[i] ? kRise : kFall;
      hoverF[i] += (f - hoverF[i]) * k;
      leanX[i] += (toX - leanX[i]) * k;
      leanY[i] += (toY - leanY[i]) * k;

      // Standing aside, measured from the hovered card.
      let sf = 0;
      if (focusI >= 0 && i !== focusI) {
        const d = Math.hypot(focusPos.x - px, focusPos.y - py);
        sf = smoothstep(sideReach, sideReach * 0.2, d) * u;
      }
      sideF[i] += (sf - sideF[i]) * (sf > sideF[i] ? kRise : kFall);

      let pushX = 0;
      let pushY = 0;
      if (sideF[i] > 0.0001) {
        const dx = px - focusPos.x;
        const dy = py - focusPos.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.0001) {
          const away = (params.sidePush * fit * sideF[i]) / dist;
          pushX = dx * away;
          pushY = dy * away;
        }
      }

      const fx = px + leanX[i] + pushX;
      const fy = py + leanY[i] + pushY;
      const rot = (params.radial ? angle : angle + HALF_PI) * launch;

      uniforms.uPos.value[i].set(fx, fy);
      uniforms.uRot.value[i] = rot;

      // The seed grows over its whole birth; the others reach full size
      // early and spend the rest of their travel pulling away.
      const sx =
        i === 0
          ? easeOutCubic(clamp01(u / 0.7))
          : easeOutCubic(clamp01(u / 0.34));
      const sy =
        i === 0
          ? easeOutCubic(clamp01((u - 0.18) / 0.74))
          : easeOutCubic(clamp01((u - 0.06) / 0.36));
      const sw = swellOf(i);
      uniforms.uScale.value[i].set(
        sx * sw,
        sy * sw,
        1 - params.sideDim * sideF[i],
        cell,
      );

      // Same box the shader draws, tested in the plane's own frame.
      if (probe && overI < 0) {
        const qx = cursor.x - fx;
        const qy = cursor.y - fy;
        const cr = Math.cos(rot);
        const sr = Math.sin(rot);
        if (
          Math.abs(qx * cr + qy * sr) <= W * 0.5 * sx * sw &&
          Math.abs(-qx * sr + qy * cr) <= H * 0.5 * sy * sw
        ) {
          overI = i;
        }
      }

      order.push(i);
    }

    for (let i = count; i < MAX_PLANES; i++) {
      uniforms.uScale.value[i].set(0, 0, 1, 0);
      hoverF[i] = 0;
      leanX[i] = 0;
      leanY[i] = 0;
      sideF[i] = 0;
    }

    // The index brightens toward the front and leans out to meet it.
    {
      const list = els.listItems;
      const reach = Math.max(0.1, params.listReach);
      for (let c = 0; c < count && c < list.length; c++) {
        const el = list[c];
        if (!el) continue;
        const w = clamp01(1 - listK[c] / reach);
        const o = params.listDim + (1 - params.listDim) * w * w;
        if (Math.abs(o - listO[c]) > 0.004) {
          listO[c] = o;
          el.style.opacity = `${o.toFixed(3)}`;
          el.style.transform = `translateX(${(-w * 0.45).toFixed(3)}em)`;
        }
      }
    }
    if (overI !== over) {
      over = overI;
      paintCursor();
    }
    // The bead. With a mouse it is the cursor on the ring.
    const mouse = !coarse;
    if (mouse !== bead.on) {
      bead.on = mouse;
      paintCursor();
    }
    const word =
      mouse && pointer.inside && !dragging && interactive && over >= 0;
    const sunk = word ? over : -1;
    if (sunk !== bead.card) {
      if (bead.card >= 0) pullFrom(bead.card, W, H);
      bead.card = sunk;
    }
    const present = mouse && pointer.inside && pointer.seeded;
    const drop = present && !word;
    const sdt = Math.min(dt, 1 / 30);
    const rTo = !present
      ? 0
      : word
        ? params.beadPillH
        : params.beadSize * 0.5;
    const wTo = word
      ? Math.max(rTo, wordSheet.width * 0.5 + params.beadPillPad)
      : rTo;
    bead.v += (rTo - bead.r) * 320 * sdt - bead.v * 22 * sdt;
    bead.r += bead.v * sdt;
    if (bead.r <= 0) {
      bead.r = 0;
      bead.v = Math.max(0, bead.v);
    }
    bead.hv += (wTo - bead.hw) * 240 * sdt - bead.hv * 15 * sdt;
    bead.hw = Math.max(0, bead.hw + bead.hv * sdt);
    // Near a card the drop reaches for it.
    let aimX = pointer.x;
    let aimY = pointer.y;
    if (drop && params.beadReach > 0) {
      let best = params.beadReach;
      for (let i = 0; i < count; i++) {
        const sc = uniforms.uScale.value[i];
        const hw = W * 0.5 * sc.x;
        const hh = H * 0.5 * sc.y;
        if (hw < 1 || hh < 1) continue;
        const c = uniforms.uPos.value[i];
        const rot = uniforms.uRot.value[i];
        const cr = Math.cos(rot);
        const sr = Math.sin(rot);
        const qx = pointer.x - c.x;
        const qy = pointer.y - c.y;
        const lx = qx * cr + qy * sr;
        const ly = -qx * sr + qy * cr;
        const rr = Math.min(uniforms.uRadius.value, hw, hh);
        const ox = Math.max(Math.abs(lx) - (hw - rr), 0);
        const oy = Math.max(Math.abs(ly) - (hh - rr), 0);
        const ol = Math.hypot(ox, oy);
        const gap = ol - rr;
        if (gap <= 0 || gap >= best) continue;
        best = gap;
        const nx = (-Math.sign(lx) * ox) / ol;
        const ny = (-Math.sign(ly) * oy) / ol;
        const k = smoothstep(params.beadReach, params.beadReach * 0.2, gap);
        const len = Math.min(gap, bead.r * params.beadStretch) * k;
        aimX = pointer.x + (nx * cr - ny * sr) * len;
        aimY = pointer.y + (nx * sr + ny * cr) * len;
      }
    }
    const kt = chase(dt, params.beadLag);
    bead.tx += (aimX - bead.tx) * kt;
    bead.ty += (aimY - bead.ty) * kt;
    {
      const dx = bead.tx - pointer.x;
      const dy = bead.ty - pointer.y;
      const dl = Math.hypot(dx, dy);
      const most =
        Math.max(bead.r, bead.hw) + bead.r * (params.beadStretch - 1);
      if (dl > most) {
        const k = most / dl;
        bead.tx = pointer.x + dx * k;
        bead.ty = pointer.y + dy * k;
      }
    }
    uniforms.uBead.value.set(pointer.x, pointer.y, bead.tx, bead.ty);
    uniforms.uBeadR.value.set(
      bead.r,
      bead.r * params.beadTail,
      params.beadMelt,
      params.beadInk,
    );
    bead.word += ((word ? 1 : 0) - bead.word) * chase(dt, word ? 0.12 : 0.3);
    const wa = bead.word * bead.word * (3 - 2 * bead.word);
    const bl = uniforms.uBeadL.value;
    bl.x = wa;
    bl.y = Math.max(bead.hw, bead.r);
    uniforms.uBeadLP.value.z = params.beadKnock;

    // The thread, fixed to the spot on the card it came out of.
    const bt = uniforms.uBeadT.value;
    bt.z = bt.w = -100;
    if (bead.s > 0 && bead.from >= 0 && bead.from < count) {
      const c = uniforms.uPos.value[bead.from];
      const rot = uniforms.uRot.value[bead.from];
      const sc = uniforms.uScale.value[bead.from];
      const lx = bead.ax * W * 0.5 * sc.x;
      const ly = bead.ay * H * 0.5 * sc.y;
      const cr = Math.cos(rot);
      const sr = Math.sin(rot);
      bt.x = c.x + lx * cr - ly * sr;
      bt.y = c.y + lx * sr + ly * cr;
      const len = Math.hypot(pointer.x - bt.x, pointer.y - bt.y);
      const stretch = clamp01(len / Math.max(1, params.beadSnap));
      const hold = bead.s * (1 - stretch * stretch);
      if (hold < 0.2 && bead.held) bead.v += params.beadSize * 2.5;
      bead.held = hold >= 0.2;
      bead.s = Math.max(
        0,
        bead.s - dt * (hold < 0.2 ? 6 : 1 / Math.max(0.05, params.beadHold)),
      );
      const w = bead.s * (1 - stretch * stretch);
      const r0 = Math.min(bead.r * 0.85, params.beadSize * 0.42 * w);
      bt.z = r0 - params.dissolve * (1 - w);
      bt.w = bt.z * (1 - (1 - params.pinch) * smoothstep(0, 0.6, stretch));
      bl.z = params.sag * stretch;
      bl.w = Math.min(params.beadMelt * 0.5, Math.max(r0, 0) * 1.5);
    } else {
      bead.s = 0;
    }
    if (over >= 0) focusPos.copy(rest[over]);

    if (frontI >= 0 && imageCount > 0 && frontCell !== shown) {
      shown = frontCell;
      paintList();
      paintGlow();
      options.onFront?.(shown);
    }

    /* ---- honey ---- */
    order.sort(bySlot);

    const edgeHalf = faceEdge * 0.5 * params.thread;
    const closed = spread > 0.995 && count > 2;
    const linkCount = Math.min(closed ? count : count - 1, MAX_LINKS);

    for (let l = 0; l < linkCount; l++) {
      const ia = order[l];
      const ib = order[(l + 1) % count];

      const ca = uniforms.uPos.value[ia];
      const cb = uniforms.uPos.value[ib];
      const scA = uniforms.uScale.value[ia];
      const scB = uniforms.uScale.value[ib];

      // Measured between resting centres and birth scales, never hovered
      // ones.
      const shrinkA = (params.radial ? scA.y : scA.x) / swellOf(ia);
      const shrinkB = (params.radial ? scB.y : scB.x) / swellOf(ib);
      const sep =
        rest[ia].distanceTo(rest[ib]) - sepExtent * 0.5 * (shrinkA + shrinkB);

      const v = clamp01(sep / finalSep);

      let fl = 0;
      if (track && params.web > 0.0001) {
        const mx = (ca.x + cb.x) * 0.5;
        const my = (ca.y + cb.y) * 0.5;
        const webReach = Math.max(1, params.webReach * W);
        const d = Math.hypot(cursor.x - mx, cursor.y - my);
        fl = smoothstep(webReach, webReach * 0.15, d) * cursor.amt;
      }
      webF[l] += (fl - webF[l]) * (fl > webF[l] ? kRise : kFall);

      const w = Math.max(Math.pow(1 - v, params.thin), params.web * webF[l]);
      const rEnd = edgeHalf * w - params.dissolve;
      const rMid = rEnd * (1 - (1 - params.pinch) * smoothstep(0, 0.7, v));

      uniforms.uLinkA.value[l].copy(ca);
      uniforms.uLinkB.value[l].copy(cb);
      uniforms.uLinkPar.value[l].set(
        rEnd,
        rMid,
        params.sag * g * Math.pow(v, 1.5),
        Math.min(
          params.fillet * g * smoothstep(0, 0.35, v),
          Math.max(rMid, 0) * 1.5,
        ),
      );
    }
    for (let l = linkCount; l < MAX_LINKS; l++) {
      uniforms.uLinkPar.value[l].set(-100, -100, 0, 0);
    }
    uniforms.uLinkCount.value = linkCount;

    // A phone's card grows further on the way to rest, so its goo does too.
    const gooK = tightNow
      ? 1 + (tightEnd / params.narrowEndScale - 1) * shift
      : 1;
    uniforms.uK.value = params.goo * planeK * fit * gooK;
    uniforms.uWobble.value =
      params.wobble * fit * (1 - smoothstep(0.2, 0.95, state.progress));

    uniforms.uTextured.value = params.textured && firstIn ? 1 : 0;
    uniforms.uBlend.value = Math.max(0.5, params.blend * planeK * g);

    const on = params.glass;
    uniforms.uBandTop.value = on ? params.bandTop * viewH : 0;
    uniforms.uBandBottom.value = on ? params.bandBottom * viewH : 0;
    uniforms.uGlass.value.set(
      params.refract,
      params.squeeze,
      params.ripple,
      params.rippleFreq,
    );
    uniforms.uFringe.value = on ? params.fringe : 0;
    uniforms.uSheen.value = on ? params.sheen : 0;
  };

  /* ------------------------------------------------------- entry timeline */
  let entryGen = 0;

  const metaBoxes = () =>
    [els.meta.left.box, els.meta.right.box].filter(Boolean) as HTMLElement[];

  // The ring's share of upstream's hard reset: the lockups shown, the name
  // back where style() put it, behind the ring.
  const resetRing = () => {
    setValues(metaBoxes(), { opacity: 1 });
    const bigBox = els.meta.left.box;
    if (bigBox) {
      bigBox.style.transform = "translate(0px, 0px)";
      bigBox.style.transformOrigin = "50% 50%";
      bigBox.style.translate = "none";
      bigBox.style.zIndex = "-1";
    }
  };

  const build = () => {
    resetRing();
    interactive = false;
    paintCursor();
    announced = -1;
    spinVel = 0;
    dragging = false;
    settling = false;
    stopPick();

    const gen = ++entryGen;
    if (loaderEl) setValues(loaderEl, { opacity: launchReady ? 0 : 1 });

    const line = tw.timeline({
      delay: 0.25,
      onComplete: () => {
        interactive = true;
        paintCursor();
      },
    });

    line.fromTo(
      state,
      { progress: 0, launch: 0, spread: 0, spin: 0, shift: 0 },
      { progress: 1 },
      { duration: 1.2, ease: "power2.out" },
    );

    // Formed and sitting at centre until the counter lands.
    line.addPause(">", () => {
      whenReady(() => {
        tw.delayedCall(params.holdAfter, () => {
          if (disposed || gen !== entryGen) return;
          line.resume();
          if (loaderEl) {
            tw.to(
              loaderEl,
              { opacity: 0 },
              { duration: params.loaderOut, ease: "power2.in" },
            );
          }
        });
      });
    });

    line.to(
      state,
      { launch: 1 },
      { duration: params.launchTime, ease: "power2.inOut" },
    );

    const spreadStart = line.duration() - 0.15;
    line.to(
      state,
      { spread: 1 },
      { duration: params.spreadTime, ease: params.spreadEase },
      spreadStart,
    );

    const stageStart = spreadStart + params.stageAt * params.spreadTime;
    line.to(
      state,
      { spin: params.spinTurns * TAU },
      { duration: params.spinTime, ease: params.spinEase },
      stageStart + params.spinDelay,
    );
    line.to(
      state,
      { shift: 1 },
      { duration: params.moveTime, ease: params.moveEase },
      stageStart + params.moveDelay,
    );

    const textStart = spreadStart + params.textAt * params.spreadTime;

    if (splitText.chars.length) {
      line.fromTo(
        splitText.chars,
        { value: 0 },
        { value: 1 },
        {
          duration: params.textTime,
          ease: params.textEase,
          stagger: params.textStagger,
        },
        textStart,
      );
    }

    // The heading has done its job by the time the ring is in place.
    if (params.textOut && splitText.fades.length) {
      const landed = Math.max(
        stageStart + params.spinDelay + params.spinTime,
        stageStart + params.moveDelay + params.moveTime,
      );
      line.fromTo(
        splitText.fades,
        { value: 1 },
        { value: 0 },
        {
          duration: params.textOutTime,
          ease: params.textOutEase,
          stagger: params.textStagger,
        },
        Math.max(0, landed + params.textOutAt),
      );
    }

    // The column and the counter arrive with the heading.
    const site = siteEls();
    if (site.length) {
      line.fromTo(
        site,
        { opacity: 0 },
        { opacity: 1 },
        { duration: params.textTime, ease: params.textEase },
        textStart,
      );
    }
    if (glowEl) {
      line.fromTo(
        glowEl,
        { "--viscose-carousel-glow-on": 0 },
        { "--viscose-carousel-glow-on": 1 },
        { duration: params.textTime, ease: params.textEase },
        textStart,
      );
    }

    return line;
  };

  styleMeta();

  let tl: Timeline | null = null;
  const replay = () => {
    tl?.kill();
    tl = build();
  };

  // The entry is built once, and not until the faces are in.
  const startEntry = () => {
    if (disposed || tl) return;
    splitText.build();
    wordSheet.build();
    styleMeta();
    replay();
  };

  const fontFallback = window.setTimeout(startEntry, 3000);
  const faces = document.fonts
    ? [
        document.fonts.ready,
        document.fonts.load(
          `${params.textWeight} ${params.textSize}px ${params.textFont}`,
        ),
        document.fonts.load(`500 ${params.wordSize}px ${params.nameFont}`),
      ]
    : [];
  Promise.all(faces).then(startEntry).catch(startEntry);

  resetRing();

  /* ---------------------------------------------------------------- loop */
  const start = performance.now();
  let prevT = start;
  // The tweens' clock: real time, except that a gap (a hidden tab, the box
  // off screen) counts as one short frame, so nothing jumps on return.
  let clock = start;
  let clockAt = start;

  // Render on demand: draw only if a uniform, a texture or a glyph moved past
  // 1e-3 since the frame last drawn, or something in the shader runs on time.
  const shot = { cur: new Float64Array(4096), last: new Float64Array(4096) };
  let shotN = 0;
  let lastN = -1;
  const keep = (v: number) => {
    if (shotN < shot.cur.length) shot.cur[shotN++] = v;
  };
  // biome-ignore lint/suspicious/noExplicitAny: walks every uniform value type
  const keepVal = (v: any): void => {
    if (typeof v === "number") keep(v);
    else if (typeof v === "boolean") keep(v ? 1 : 0);
    else if (!v) keep(0);
    else if (v.isTexture) {
      keep(v.id);
      keep(v.version);
    } else if (v.isVector2) {
      keep(v.x);
      keep(v.y);
    } else if (v.isVector3) {
      keep(v.x);
      keep(v.y);
      keep(v.z);
    } else if (v.isVector4) {
      keep(v.x);
      keep(v.y);
      keep(v.z);
      keep(v.w);
    } else if (v.isColor) {
      keep(v.r);
      keep(v.g);
      keep(v.b);
    } else if (ArrayBuffer.isView(v) || Array.isArray(v)) {
      const list = v as ArrayLike<unknown>;
      for (let i = 0; i < list.length; i++) keepVal(list[i]);
    }
  };
  const watched = (Object.keys(uniforms) as (keyof Uniforms)[])
    .filter((k) => k !== "uTime")
    .map((k) => uniforms[k]);
  const changed = () => {
    shotN = 0;
    for (const u of watched) keepVal(u.value);
    keep(textGroup.scale.x);
    for (const glyph of glyphs()) {
      keep(glyph.visible ? 1 : 0);
      keep(glyph.position.x);
      keep(glyph.position.y);
      keep(glyph.scale.x);
      keep(glyph.scale.y);
      const gu = glyph.material.uniforms;
      for (const k in gu) if (k !== "uTime") keepVal(gu[k].value);
    }
    if (shotN !== lastN) return true;
    for (let i = 0; i < shotN; i++) {
      if (Math.abs(shot.cur[i] - shot.last[i]) > 1e-3) return true;
    }
    return false;
  };

  const frame = () => {
    if (disposed) return;
    const now = performance.now();
    const gap = now - clockAt;
    clock += gap > 500 || gap < 0 ? 33 : gap;
    clockAt = now;
    // Every tween first, as upstream's GSAP ticker ran before its loop.
    tw.tick(clock);

    // Clamped, so a backgrounded tab does not resume with one huge step.
    const dt = Math.min(0.05, (now - prevT) / 1000);
    prevT = now;
    uniforms.uTime.value = (now - start) * 0.001;

    if (interactive && !dragging && !picking) {
      state.spin += spinVel * dt;
      spinVel *= Math.pow(params.damping, dt * 60);

      let off = 0;

      if (params.snap) {
        const slot = TAU / Math.round(params.count);
        const decay = Math.max(0.01, -Math.log(params.damping) * 60);
        const engage = Math.max(params.snapFrom, decay * slot * 0.5);
        const rate = 4.8 / Math.max(0.05, params.snapTime);

        if (!settling && Math.abs(spinVel) < engage) {
          const coast = state.spin + spinVel / decay;
          const phase = params.seed * DEG - frontAngle;
          snapTo = Math.round((coast + phase) / slot) * slot - phase;
          snapCap = Math.max(Math.abs(spinVel), slot * 0.5 * rate);
          settling = true;
        }

        if (settling) {
          off = snapTo - state.spin;
          const aim = Math.max(-snapCap, Math.min(snapCap, off * rate));
          spinVel += (aim - spinVel) * clamp01(rate * dt);
        }
      } else {
        settling = false;
      }

      // Parked: put it down exactly on the slot.
      if (Math.abs(spinVel) < 0.0015 && Math.abs(off) < 0.0008) {
        spinVel = 0;
        state.spin += off;
      }
    }

    tickLoader(dt);
    updatePointer(dt);
    layout(dt);

    // The name leans with the ring's speed, as the honey does.
    const want = Math.max(
      -params.titleLeanMax,
      Math.min(params.titleLeanMax, spinVel * params.titleLean),
    );
    leanNow += (want - leanNow) * chase(dt, 0.18);
    meta.lean(leanNow);

    // The name arrives with the card, not while one flicks past.
    if (
      interactive &&
      !dragging &&
      !picking &&
      spinVel === 0 &&
      shown >= 0 &&
      shown !== announced
    ) {
      announced = shown;
      meta.show(shown);
    }

    for (const glyph of glyphs()) {
      const gu = glyph.material.uniforms;
      glyph.visible = gu.uReveal.value > 0.001 && gu.uOpacity.value > 0.001;
    }
    const timed = uniforms.uWobble.value > 0.001 || uniforms.uMelt.value.y > 0.001;
    if (changed() || timed || needsRender) {
      renderer.render(scene, camera);
      shot.last.set(shot.cur.subarray(0, shotN));
      lastN = shotN;
      needsRender = false;
    }
  };

  const turnTo = (cell: number, open: boolean) => {
    if (!interactive || disposed) return;
    const plane = planeOf(cell);
    if (plane >= 0) pick(plane, open);
  };

  return {
    resize: (width, height, dpr) => {
      viewW = Math.max(1, width);
      viewH = Math.max(1, height);
      renderer.setPixelRatio(dpr);
      resize();
      styleMeta();
      needsRender = true;
    },
    frame,
    step: (by) => {
      const n = Math.round(params.count);
      const from = pickCell >= 0 ? pickCell : shown;
      if (from < 0 || n < 1) return;
      turnTo((((from + by) % n) + n) % n, false);
    },
    goTo: (index) => turnTo(index, false),
    activate: () => {
      const cell = pickCell >= 0 ? pickCell : shown;
      if (cell >= 0) turnTo(cell, true);
    },
    dispose: () => {
      disposed = true;
      clearTimeout(holdTimer);
      clearTimeout(fontFallback);

      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointercancel", onPointerUp);
      container.removeEventListener("pointerleave", onPointerLeave);
      container.removeEventListener("click", onClick);
      canvas.style.cursor = "";

      tl?.kill();
      meta.dispose();
      tw.dispose();
      wordSheet.dispose();
      splitText.dispose();

      mesh.geometry.dispose();
      mesh.material.dispose();
      uniforms.uAtlas.value?.dispose();
      moreBlank.dispose();
      textBlank.dispose();
      heroBlank.dispose();
      liveBlank.dispose();
      // The loop owns the context and releases it; only three's state goes.
      renderer.dispose();
    },
  };
}
