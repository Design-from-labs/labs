import * as THREE from 'three';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BAKED_POSE, bakedSheet, computeCavity, type FoilSheet } from './holo-foil-pose';

/*
 * Ported from dmitrykurash/holocloth (src/holoMaterial.ts, src/textures.ts, src/decals.ts, src/scene.ts and the presets in src/App.tsx), at commit a6078ba698a5:
 * https://github.com/dmitrykurash/holocloth. The holographic material only:
 * the Verlet cloth simulation, its grab and poke tools, the depth of field
 * pass and the control panel are left out; the sheet keeps the captured pose.
 *
 * Copyright (c) 2026 Dmitry Kurash. MIT License; the full notice ends this file.
 */

/* ------------------------------------------------------------------ */
/* textures (upstream src/textures.ts)                                 */
/* ------------------------------------------------------------------ */
/** Deterministic pseudo-random for texture generation */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Height field of a fine fabric weave: interleaved warp/weft threads,
 * per-thread thickness variation and micro grain.
 */
function weaveHeight(size: number, threads: number, rand: () => number): Float32Array {
  const h = new Float32Array(size * size);
  // per-thread random thickness so the weave doesn't look machine-perfect
  const warpVar = new Float32Array(threads + 1);
  const weftVar = new Float32Array(threads + 1);
  for (let i = 0; i <= threads; i++) {
    warpVar[i] = 0.85 + rand() * 0.3;
    weftVar[i] = 0.85 + rand() * 0.3;
  }
  const grain = new Float32Array(size * size);
  for (let i = 0; i < grain.length; i++) grain[i] = rand();

  for (let y = 0; y < size; y++) {
    const v = (y / size) * threads;
    const vi = Math.floor(v);
    const vf = v - vi;
    for (let x = 0; x < size; x++) {
      const u = (x / size) * threads;
      const ui = Math.floor(u);
      const uf = u - ui;
      // thread cross-section profile (half-sine bump per thread)
      const warp = Math.sin(uf * Math.PI) * warpVar[ui % (threads + 1)];
      const weft = Math.sin(vf * Math.PI) * weftVar[vi % (threads + 1)];
      // plain weave: alternate which thread lies on top
      const over = (ui + vi) % 2 === 0;
      const height = over
        ? warp * 0.62 + weft * 0.38
        : weft * 0.62 + warp * 0.38;
      const g = grain[y * size + x];
      h[y * size + x] = height * 0.85 + g * 0.15;
    }
  }
  return h;
}

/** Sobel a height field into a tangent-space normal map texture. */
function heightToNormalTexture(h: Float32Array, size: number, strength: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const data = img.data;
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const i = (y * size + x) * 4;
      data[i] = Math.round((-dx * inv * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round((dy * inv * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round((inv * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

export function makeWeaveNormalMap(size = 512, threads = 64, seed = 1337): THREE.CanvasTexture {
  const rand = mulberry32(seed);
  const h = weaveHeight(size, threads, rand);
  return heightToNormalTexture(h, size, 1.6);
}

/** Convert an uploaded grayscale height/bump image into a normal map. */
export function normalMapFromImage(img: CanvasImageSource, size = 512, strength = 1.6): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  const h = new Float32Array(size * size);
  for (let i = 0; i < h.length; i++) {
    // perceptual luminance as height
    h[i] = (data[i * 4] * 0.2126 + data[i * 4 + 1] * 0.7152 + data[i * 4 + 2] * 0.0722) / 255;
  }
  return heightToNormalTexture(h, size, strength);
}

/** Subtle grain map used as roughness variation — keeps the matte finish alive. */
export function makeGrainRoughnessMap(size = 256, seed = 4242): THREE.CanvasTexture {
  const rand = mulberry32(seed);
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const data = img.data;
  for (let i = 0; i < size * size; i++) {
    // mid-gray with mild noise; roughnessMap multiplies material.roughness
    const v = Math.round(215 + (rand() - 0.5) * 70);
    data[i * 4] = v; data[i * 4 + 1] = v; data[i * 4 + 2] = v; data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

/**
 * Port: a procedural stand-in for upstream's photographic scratch bump map
 * (public/bump-scratches.jpg, not redistributed here): faint light-gray
 * strokes on near-white, drawn from a seed. Feed it to normalMapFromImage.
 */
export function makeScratchBumpSource(size = 1024, seed = 7): HTMLCanvasElement {
  const rand = mulberry32(seed);
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, size, size);
  ctx.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const angle = (rand() - 0.5) * 1.6 + (rand() < 0.5 ? 0.6 : -0.9);
    const length = size * (0.04 + rand() * rand() * 0.45);
    const shade = Math.round(205 + rand() * 40);
    ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    ctx.lineWidth = 0.6 + rand() * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }
  return canvas;
}

/* ------------------------------------------------------------------ */
/* the material (upstream src/holoMaterial.ts)                         */
/* ------------------------------------------------------------------ */
export interface HoloUniforms {
  uHoloIntensity: THREE.IUniform<number>;
  uHoloScale: THREE.IUniform<number>;
  uBandFreq: THREE.IUniform<number>;
  uRadialFreq: THREE.IUniform<number>;
  uSaturation: THREE.IUniform<number>;
  uHueShift: THREE.IUniform<number>;
  uSparkle: THREE.IUniform<number>;
  uSpecTint: THREE.IUniform<number>;
  uSurfaceMap: THREE.IUniform<THREE.Texture>;
  uSurfaceOpacity: THREE.IUniform<number>;
  uCavityAmount: THREE.IUniform<number>;
  uCornerRound: THREE.IUniform<number>;
  uClothSize: THREE.IUniform<THREE.Vector2>;
}

export interface HoloMaterial {
  material: THREE.MeshPhysicalMaterial;
  uniforms: HoloUniforms;
}

/**
 * Holographic sticker fabric:
 *  - MeshPhysicalMaterial base: iridescence (thin-film), sheen (fabric),
 *    clearcoat (laminated sticker depth), matte roughness, woven normal map
 *  - injected diffraction layer: micro-flake cells whose hue sweeps with the
 *    view angle, like the diffraction grating on holo foil
 */
export function createHoloMaterial(surfaceTexture: THREE.Texture): HoloMaterial {
  // the bump/normal map is loaded asynchronously by the engine (default
  // scratch texture or a user upload) — none at creation time
  const roughnessMap = makeGrainRoughnessMap();

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#9aa1ad'),
    metalness: 0.95,
    roughness: 0.1,
    roughnessMap,
    normalScale: new THREE.Vector2(0.5, 0.5),
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    sheen: 0.35,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color('#cfd6ff'),
    iridescence: 1.0,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [120, 480],
    side: THREE.DoubleSide,
  });

  const uniforms: HoloUniforms = {
    uHoloIntensity: { value: 1.0 },
    uHoloScale: { value: 110 },
    uBandFreq: { value: 3.0 },
    uRadialFreq: { value: 1.6 },
    uSaturation: { value: 0.8 },
    uHueShift: { value: 0.0 },
    uSparkle: { value: 0.6 },
    uSpecTint: { value: 0.85 },
    uSurfaceMap: { value: surfaceTexture },
    uSurfaceOpacity: { value: 1.0 },
    uCavityAmount: { value: 0 },
    uCornerRound: { value: 0 },
    uClothSize: { value: new THREE.Vector2(3, 3) },
  };

  // rounded-corner cutout edges resolve smoothly under the MSAA target
  material.alphaToCoverage = true;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader =
      'varying vec2 vHoloUv;\nattribute float aCavity;\nvarying float vCavity;\n' +
      shader.vertexShader.replace(
        '#include <uv_vertex>',
        '#include <uv_vertex>\n\tvHoloUv = uv;\n\tvCavity = aCavity;',
      );

    shader.fragmentShader =
      /* glsl */ `
      varying vec2 vHoloUv;
      uniform float uHoloIntensity;
      uniform float uHoloScale;
      uniform float uBandFreq;
      uniform float uRadialFreq;
      uniform float uSaturation;
      uniform float uHueShift;
      uniform float uSparkle;
      uniform float uSpecTint;
      uniform sampler2D uSurfaceMap;
      uniform float uSurfaceOpacity;
      varying float vCavity;
      uniform float uCavityAmount;
      uniform float uCornerRound;
      uniform vec2 uClothSize;

      float holoHash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      vec3 holoHsv2rgb(vec3 c) {
        vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
        rgb = rgb * rgb * (3.0 - 2.0 * rgb); // smooth rainbow
        return c.z * mix(vec3(1.0), rgb, c.y);
      }
      ` +
      shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        {
          // rounded-corner cutout: rounded-rect SDF in cloth space; sharp at 0
          if (uCornerRound > 0.0) {
            vec2 cp = (vHoloUv - 0.5) * uClothSize;
            float cr = uCornerRound * 0.5 * min(uClothSize.x, uClothSize.y);
            vec2 cq = abs(cp) - (0.5 * uClothSize - vec2(cr));
            float cd = length(max(cq, vec2(0.0))) - cr;
            float cEdge = fwidth(cd) + 1e-4;
            float cMask = 1.0 - smoothstep(-cEdge, cEdge, cd);
            if (cMask <= 0.0) discard;
            diffuseColor.a *= cMask;
          }

          // uploaded graphics live in UV space, so they morph with the cloth;
          // ink reads as dielectric, so pull metalness down where it covers
          vec4 surf = texture2D(uSurfaceMap, vHoloUv);
          float surfA = surf.a * uSurfaceOpacity;
          diffuseColor.rgb = mix(diffuseColor.rgb, surf.rgb, surfA);
          metalnessFactor = mix(metalnessFactor, 0.05, surfA * 0.8);

          vec3 hView = normalize(vViewPosition);
          float facing = clamp(abs(dot(normal, hView)), 0.0, 1.0);
          float fres = pow(1.0 - facing, 1.5);

          // micro flake cells — each has a random phase so neighbouring
          // flakes catch different colors, like holo foil grain
          vec2 cellUv = vHoloUv * uHoloScale;
          vec2 cellId = floor(cellUv);
          float rnd = holoHash(cellId);
          float rnd2 = holoHash(cellId + 71.7);

          // diffraction sweep: broad smooth bands driven by view angle and
          // radial distance; flakes only nudge the phase slightly
          float radial = length(vHoloUv - 0.5) * uRadialFreq;
          float hue = fract(uHueShift + facing * uBandFreq + radial + rnd * 0.06);
          vec3 rainbow = holoHsv2rgb(vec3(hue, uSaturation, 1.0));

          // flake mask: soft variation so the foil reads as granular, not flat
          float flake = 0.82 + 0.18 * rnd2;

          // angle-gated glints: a sparse set of flakes flares at specific angles
          float gate = fract(rnd2 * 13.7 + facing * 6.0);
          float glint = smoothstep(1.0 - 0.012 * uSparkle, 1.0, gate) * 5.0;

          // rainbow brightest at grazing angles but present face-on too;
          // folds swallow the glow where cavity occlusion applies
          float energy = (0.22 + 0.78 * fres) * flake;
          float holoAO = 1.0 - uCavityAmount * vCavity * 0.8;
          totalEmissiveRadiance += rainbow * uHoloIntensity * (energy * 0.55 + glint * fres * 0.5) * holoAO;

          // tint the metallic F0 so specular reflections go iridescent —
          // this is what makes real holo foil flash color, not glow
          vec3 tinted = diffuseColor.rgb * (0.25 + rainbow * 1.9);
          diffuseColor.rgb = mix(diffuseColor.rgb, tinted, uSpecTint);
        }`,
      ).replace(
        '#include <aomap_fragment>',
        /* glsl */ `#include <aomap_fragment>
        {
          // cavity occlusion: deep folds see less of the environment.
          // Mirrors aomap_fragment's application points.
          float cavityAO = 1.0 - uCavityAmount * vCavity;
          reflectedLight.indirectDiffuse *= cavityAO;
          #if defined( USE_CLEARCOAT )
            clearcoatSpecularIndirect *= cavityAO;
          #endif
          #if defined( USE_SHEEN )
            sheenSpecularIndirect *= cavityAO;
          #endif
          #if defined( USE_ENVMAP ) && defined( STANDARD )
            float cavDotNV = saturate( dot( geometryNormal, geometryViewDir ) );
            reflectedLight.indirectSpecular *= computeSpecularOcclusion( cavDotNV, cavityAO, material.roughness );
          #endif
        }`,
      );
  };

  return { material, uniforms };
}

/* ------------------------------------------------------------------ */
/* the surface layer (upstream src/decals.ts)                          */
/* ------------------------------------------------------------------ */
export interface DecalItem {
  img: HTMLImageElement;
  /** center position in cloth UV space (u right, v up) */
  u: number;
  v: number;
  /** decal width as a fraction of cloth width */
  scale: number;
  /** degrees */
  rotation: number;
}

const LONG_SIDE = 2048;

/**
 * UV-space surface compositor: an optional full-bleed cloth image plus any
 * number of decal images, drawn into one canvas that the cloth material
 * samples. Because everything lives in UV space, graphics deform with the
 * cloth for free.
 */
export class SurfaceLayer {
  readonly canvas: HTMLCanvasElement;
  /** recreated when the canvas is resized — re-read after setAspect() */
  texture: THREE.CanvasTexture;
  decals: DecalItem[] = [];
  clothImage: HTMLImageElement | null = null;
  selected: DecalItem | null = null;

  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = LONG_SIDE;
    this.canvas.height = LONG_SIDE;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.redraw();
  }

  /**
   * Resize backing canvas to match the cloth aspect so texels stay square.
   * Returns true when the GPU texture had to be recreated (the old storage
   * cannot change dimensions) — the caller must re-bind `texture`.
   */
  setAspect(aspect: number): boolean {
    const w = aspect >= 1 ? LONG_SIDE : Math.round(LONG_SIDE * aspect);
    const h = aspect >= 1 ? Math.round(LONG_SIDE / aspect) : LONG_SIDE;
    if (this.canvas.width === w && this.canvas.height === h) {
      this.redraw();
      return false;
    }
    this.canvas.width = w;
    this.canvas.height = h;
    this.texture.dispose();
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.redraw();
    return true;
  }

  addDecal(img: HTMLImageElement): DecalItem {
    const item: DecalItem = { img, u: 0.5, v: 0.5, scale: 0.35, rotation: 0 };
    this.decals.push(item);
    this.selected = item;
    this.redraw();
    return item;
  }

  setClothImage(img: HTMLImageElement | null) {
    this.clothImage = img;
    this.redraw();
  }

  clear() {
    this.decals = [];
    this.clothImage = null;
    this.selected = null;
    this.redraw();
  }

  /** Topmost decal whose (rotated) rect contains the uv point, else null. */
  hitTest(u: number, v: number): DecalItem | null {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = u * W;
    const py = (1 - v) * H;
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i];
      const { w, h } = this.decalPixelSize(d);
      const cx = d.u * W;
      const cy = (1 - d.v) * H;
      const a = (-d.rotation * Math.PI) / 180;
      const dx = px - cx;
      const dy = py - cy;
      const lx = dx * Math.cos(a) - dy * Math.sin(a);
      const ly = dx * Math.sin(a) + dy * Math.cos(a);
      if (Math.abs(lx) <= w / 2 && Math.abs(ly) <= h / 2) return d;
    }
    return null;
  }

  private decalPixelSize(d: DecalItem) {
    const W = this.canvas.width;
    const iw = d.img.naturalWidth || d.img.width || 300;
    const ih = d.img.naturalHeight || d.img.height || 300;
    const w = d.scale * W;
    const h = (w * ih) / iw;
    return { w, h };
  }

  redraw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (this.clothImage) {
      ctx.drawImage(this.clothImage, 0, 0, canvas.width, canvas.height);
    }
    for (const d of this.decals) {
      const { w, h } = this.decalPixelSize(d);
      ctx.save();
      ctx.translate(d.u * canvas.width, (1 - d.v) * canvas.height);
      ctx.rotate((d.rotation * Math.PI) / 180);
      ctx.drawImage(d.img, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
  }
}

/* ------------------------------------------------------------------ */
/* looks (upstream src/App.tsx presets and src/scene.ts post chain)    */
/* ------------------------------------------------------------------ */
/** Shared renderer settings — identical across every preset. */
const RENDER_DEFAULTS = {
  background: '#0b0c12',
  exposure: 0.5,
  environment: 0.73,
  bloom: 0.05,
  bloomThreshold: 1.41,
  noise: 0.345,
  toneMapping: 'Neutral',
  occlusion: true,
  occlusionStrength: 1,
  dof: false,
  dofAperture: 40,
  dofBlur: 0.04,
  dofRange: 0.3,
};

/** finish → surface response; presets reference these by name */
const FINISH_VALUES: Record<string, { roughness: number; clearcoat: number; coatRoughness: number }> = {
  Glossy: { roughness: 0.1, clearcoat: 1.0, coatRoughness: 0.08 },
  Satin: { roughness: 0.3, clearcoat: 0.45, coatRoughness: 0.3 },
  Matte: { roughness: 0.62, clearcoat: 0.06, coatRoughness: 0.7 },
};

const PRESET_VALUES: Record<string, { material: Record<string, unknown>; render: Record<string, unknown> }> = {
  Holo: {
    material: {
      finish: 'Matte',
      baseColor: '#20242d',
      holoIntensity: 3.78,
      holoScale: 400,
      bandFreq: 1.1,
      saturation: 1.0,
      hueShift: 0.37,
      sparkle: 0.73,
      specTint: 0.33,
      iridescence: 0.81,
      metalness: 1.0,
      sheen: 0,
      bump: 3.0,
      bumpTiling: 3,
      ...FINISH_VALUES.Matte,
    },
    render: { ...RENDER_DEFAULTS },
  },
  Chrome: {
    material: {
      finish: 'Glossy',
      baseColor: '#dfe3e8',
      holoIntensity: 0,
      sparkle: 0.2,
      specTint: 0,
      iridescence: 0,
      metalness: 1,
      sheen: 0,
      bump: 0.05,
      ...FINISH_VALUES.Glossy,
      roughness: 0.04,
      coatRoughness: 0.04,
    },
    render: { ...RENDER_DEFAULTS },
  },
  'Black Cloth': {
    material: {
      finish: 'Satin',
      baseColor: '#101114',
      holoIntensity: 0.1,
      holoScale: 8,
      bandFreq: 0.2,
      saturation: 0,
      hueShift: 0,
      sparkle: 0,
      specTint: 0.82,
      iridescence: 0,
      metalness: 0.43,
      sheen: 0.08,
      bump: 0,
      ...FINISH_VALUES.Satin,
      roughness: 0.83,
      clearcoat: 0.22,
      coatRoughness: 0.32,
    },
    render: { ...RENDER_DEFAULTS },
  },
};

export type HoloFoilPreset = 'holo' | 'chrome' | 'black-cloth';
const PRESET_NAMES: Record<HoloFoilPreset, string> = {
  holo: 'Holo',
  chrome: 'Chrome',
  'black-cloth': 'Black Cloth',
};

/** The material dials (upstream HoloParams.material, minus the preset names). */
export interface HoloFoilMaterial {
  baseColor: string;
  holoIntensity: number;
  holoScale: number;
  bandFreq: number;
  saturation: number;
  hueShift: number;
  sparkle: number;
  specTint: number;
  iridescence: number;
  roughness: number;
  metalness: number;
  clearcoat: number;
  coatRoughness: number;
  sheen: number;
  bump: number;
  bumpTiling: number;
}

/** The camera look (upstream HoloParams.render, minus depth of field). */
export interface HoloFoilLook {
  background: string;
  exposure: number;
  environment: number;
  bloom: number;
  bloomThreshold: number;
  noise: number;
  toneMapping: 'AgX' | 'ACES' | 'Neutral';
  occlusion: boolean;
  occlusionStrength: number;
}

/** The Holo panel defaults, which are also upstream's startup values. */
const HOLO_DEFAULTS: HoloFoilMaterial = {
  baseColor: '#20242d',
  holoIntensity: 3.78,
  holoScale: 400,
  bandFreq: 1.1,
  saturation: 1,
  hueShift: 0.37,
  sparkle: 0.73,
  specTint: 0.33,
  iridescence: 0.81,
  roughness: 0.62,
  metalness: 1,
  clearcoat: 0.06,
  coatRoughness: 0.7,
  sheen: 0,
  bump: 3,
  bumpTiling: 3,
};

/** Resolve a preset plus overrides into the full set of dials. */
export function holoFoilParams(
  preset: HoloFoilPreset = 'holo',
  material?: Partial<HoloFoilMaterial>,
  look?: Partial<HoloFoilLook>,
): { material: HoloFoilMaterial; look: HoloFoilLook } {
  const bundle = PRESET_VALUES[PRESET_NAMES[preset]];
  const presetMaterial = { ...bundle.material } as Partial<HoloFoilMaterial> & { finish?: string };
  delete presetMaterial.finish;
  return {
    material: { ...HOLO_DEFAULTS, ...presetMaterial, ...material },
    look: { ...(RENDER_DEFAULTS as HoloFoilLook), ...(bundle.render as Partial<HoloFoilLook>), ...look },
  };
}

const TONE_MAPPINGS: Record<string, THREE.ToneMapping> = {
  AgX: THREE.AgXToneMapping,
  ACES: THREE.ACESFilmicToneMapping,
  Neutral: THREE.NeutralToneMapping,
};

const CLOTH_LONG_SIDE = 3;
const CLOTH_SEGMENTS = 48;
const WHITE = new THREE.Color(0xffffff);

const GrainShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uAmount: { value: 0.08 },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uAmount;
    uniform float uTime;
    varying vec2 vUv;
    // sinless hash (Dave Hoskins style): sin-based hashes lose precision at
    // large arguments on some ANGLE backends (Chrome on Windows/Metal) and
    // collapse into marching bands — this one stays white noise everywhere
    float gHash(vec3 p3) {
      p3 = fract(p3 * 0.1031);
      p3 += dot(p3, p3.zyx + 31.32);
      return fract((p3.x + p3.y) * p3.z);
    }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      // coords wrapped to keep magnitudes float32-safe; time is a hash
      // dimension, not an offset, so no pattern travels between frames
      vec2 p = mod(gl_FragCoord.xy, 1024.0);
      float n = gHash(vec3(p, mod(uTime * 120.0, 512.0))) - 0.5;
      c.rgb += n * uAmount;
      gl_FragColor = c;
    }
  `,
};

/**
 * The foil sheet scene (upstream HoloApp, without the simulation): the sheet
 * in its captured pose under a neutral studio room, two colored rims and a
 * key light, rendered through an 8x MSAA half-float chain with bloom, tone
 * mapping and film grain.
 */
export class HoloFoilScene {
  readonly renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private grainPass: ShaderPass;
  private cavityAttr!: THREE.BufferAttribute;
  private sheet!: FoilSheet;
  private clothMesh: THREE.Mesh;
  private clothGeometry!: THREE.BufferGeometry;
  private holoUniforms: HoloUniforms;
  private holoMaterial: THREE.MeshPhysicalMaterial;
  private surface: SurfaceLayer;
  private background = new THREE.Color('#0b0c12');
  private clothAspect = 0;
  private envTexture: THREE.Texture;
  private tilt = new THREE.Vector2(0, 0);
  private tiltTarget = new THREE.Vector2(0, 0);

  constructor(canvas: HTMLCanvasElement, context?: WebGL2RenderingContext) {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      context,
      antialias: false, // MSAA happens on the composer's render target
      powerPreference: 'high-performance',
      stencil: false,
      alpha: true, // transparent-background export
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height, false);
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.scene.background = this.background;
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 200);
    this.camera.position.set(...BAKED_POSE.camera);

    // image-based lighting from a neutral studio room
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTexture;
    pmrem.dispose();

    // accent rims for specular interest — cool one side, warm the other
    const rimA = new THREE.DirectionalLight(0x7fd4ff, 1.1);
    rimA.position.set(-4, 2.5, -3);
    const rimB = new THREE.DirectionalLight(0xff9ad5, 0.9);
    rimB.position.set(4.5, -1.5, -2.5);
    const key = new THREE.DirectionalLight(0xffffff, 0.7);
    key.position.set(1.5, 3, 4);
    this.scene.add(rimA, rimB, key);

    // surface layer (uploaded graphics) + cloth
    this.surface = new SurfaceLayer();
    const holo = createHoloMaterial(this.surface.texture);
    this.holoMaterial = holo.material;
    this.holoUniforms = holo.uniforms;
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    if (this.holoMaterial.roughnessMap) this.holoMaterial.roughnessMap.anisotropy = maxAniso;
    this.surface.texture.anisotropy = maxAniso;

    this.clothMesh = new THREE.Mesh(undefined, this.holoMaterial);
    this.clothMesh.frustumCulled = false;
    this.buildCloth(BAKED_POSE.width / BAKED_POSE.height);
    this.scene.add(this.clothMesh);

    // Port: the orbit controls only place the camera (no DOM element), so
    // the view matches upstream's captured pose exactly.
    this.controls = new OrbitControls(this.camera);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.6;
    this.controls.maxDistance = 30;
    this.controls.target.set(...BAKED_POSE.target);
    this.controls.update();

    // post: MSAA + half-float HDR chain, bloom, tonemap+sRGB, grain
    const rt = new THREE.WebGLRenderTarget(width, height, {
      samples: 8,
      type: THREE.HalfFloatType,
    });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.18, 0.85, 1.0);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
    this.grainPass = new ShaderPass(GrainShader);
    this.composer.addPass(this.grainPass);
  }

  /** (Re)build the sheet geometry for a given aspect ratio (w/h). */
  private buildCloth(aspect: number) {
    if (aspect === this.clothAspect) return;
    this.clothAspect = aspect;
    const w = aspect >= 1 ? CLOTH_LONG_SIDE : CLOTH_LONG_SIDE * aspect;
    const h = aspect >= 1 ? CLOTH_LONG_SIDE / aspect : CLOTH_LONG_SIDE;
    const segs = CLOTH_SEGMENTS;
    const segX = aspect >= 1 ? segs : Math.max(10, Math.round(segs * aspect));
    const segY = aspect >= 1 ? Math.max(10, Math.round(segs / aspect)) : segs;
    this.sheet = bakedSheet(w, h, segX, segY);
    const geo = new THREE.PlaneGeometry(w, h, segX, segY);
    const posAttr = new THREE.BufferAttribute(this.sheet.positions, 3);
    geo.setAttribute('position', posAttr);
    this.cavityAttr = new THREE.BufferAttribute(new Float32Array(this.sheet.count), 1);
    geo.setAttribute('aCavity', this.cavityAttr);
    geo.computeVertexNormals();
    computeCavity(this.sheet, geo.attributes.normal.array, this.cavityAttr.array as Float32Array);
    const old = this.clothMesh.geometry;
    this.clothMesh.geometry = geo;
    this.clothGeometry = geo;
    if (old) old.dispose();
    this.holoUniforms.uClothSize.value.set(w, h);
  }

  /** Apply a full set of dials (upstream HoloApp.applyParams). */
  applyParams(material: HoloFoilMaterial, look: HoloFoilLook) {
    const m = this.holoMaterial;
    m.color.set(material.baseColor);
    m.roughness = material.roughness;
    m.metalness = material.metalness;
    m.clearcoat = material.clearcoat;
    m.clearcoatRoughness = material.coatRoughness;
    m.sheen = material.sheen;
    // sheen fibers carry the dye color, halfway toward white at the rim
    m.sheenColor.set(material.baseColor).lerp(WHITE, 0.5);
    m.iridescence = material.iridescence;
    m.normalScale.set(material.bump, material.bump);
    if (m.normalMap) m.normalMap.repeat.set(material.bumpTiling, material.bumpTiling);
    // material.envMapIntensity is ignored when lighting comes from
    // scene.environment — the renderer reads scene.environmentIntensity
    this.scene.environmentIntensity = look.environment;

    const u = this.holoUniforms;
    u.uHoloIntensity.value = material.holoIntensity;
    u.uHoloScale.value = material.holoScale;
    u.uBandFreq.value = material.bandFreq;
    u.uSaturation.value = material.saturation;
    u.uHueShift.value = material.hueShift;
    u.uSparkle.value = material.sparkle;
    u.uSpecTint.value = material.specTint;
    u.uSurfaceOpacity.value = 1;
    u.uCornerRound.value = 0;

    this.background.set(look.background);
    this.renderer.toneMappingExposure = look.exposure;
    const tm = TONE_MAPPINGS[look.toneMapping] ?? THREE.AgXToneMapping;
    if (this.renderer.toneMapping !== tm) this.renderer.toneMapping = tm;
    this.bloomPass.strength = look.bloom;
    this.bloomPass.threshold = look.bloomThreshold;
    this.grainPass.uniforms.uAmount.value = look.noise;
    u.uCavityAmount.value = look.occlusion ? look.occlusionStrength : 0;
  }

  /** Swap the sheet's bump/normal map; null removes it entirely. */
  setBumpMap(img: CanvasImageSource | null, tiling = 3) {
    const old = this.holoMaterial.normalMap;
    let tex: THREE.Texture | null = null;
    if (img) {
      tex = normalMapFromImage(img);
      tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      tex.repeat.set(tiling, tiling);
    }
    this.holoMaterial.normalMap = tex;
    // map presence changes the shader program
    if (!!old !== !!tex) this.holoMaterial.needsUpdate = true;
    if (old) old.dispose();
  }

  /** A full-bleed image printed on the sheet; it also sets the sheet's aspect. */
  setClothImage(img: HTMLImageElement | null) {
    let aspect = BAKED_POSE.width / BAKED_POSE.height;
    if (img) {
      const iw = img.naturalWidth || img.width || 1;
      const ih = img.naturalHeight || img.height || 1;
      aspect = Math.min(3, Math.max(1 / 3, iw / ih));
    }
    this.surface.setClothImage(img);
    if (this.surface.setAspect(aspect)) this.rebindSurfaceTexture();
    this.buildCloth(aspect);
  }

  /** After SurfaceLayer recreates its texture, point the shader at it. */
  private rebindSurfaceTexture() {
    this.surface.texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.holoUniforms.uSurfaceMap.value = this.surface.texture;
  }

  /** Port: the sheet leans toward the pointer, x and y from -1 to 1. */
  setTilt(x: number, y: number) {
    this.tiltTarget.set(x, y);
  }

  /** Size the drawing buffer and the post chain (upstream onResize). */
  setSize(width: number, height: number, pixelRatio: number) {
    if (width === 0 || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
  }

  /** Draw one frame. `grainTime` seeds the film grain (seconds). */
  render(grainTime: number) {
    this.grainPass.uniforms.uTime.value = grainTime % 61.7;
    this.tilt.lerp(this.tiltTarget, 0.09);
    this.clothMesh.rotation.set(-this.tilt.y * 0.22, this.tilt.x * 0.3, 0);
    this.controls.update();
    this.composer.render();
  }

  dispose() {
    this.controls.dispose();
    this.composer.dispose();
    this.clothGeometry.dispose();
    this.holoMaterial.roughnessMap?.dispose();
    this.holoMaterial.normalMap?.dispose();
    this.holoMaterial.dispose();
    this.surface.dispose();
    this.envTexture.dispose();
    this.renderer.dispose();
  }
}
