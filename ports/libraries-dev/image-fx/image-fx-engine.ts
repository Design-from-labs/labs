// ---- upstream: packages/img-fx/src/engine/tween.ts ----
/**
 * Easing function table — keys match the `EasingKey` type in `presets/index.ts`
 * and the dropdown options in `image.html` (lines 2343-2351).
 */
import type { EasingKey } from './image-fx-presets';

export type EaseFn = (t: number) => number;

export const EASING_FNS: Record<EasingKey, EaseFn> = {
  linear: (t) => t,
  smoothstep: (t) => t * t * (3 - 2 * t),
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeOutQuint: (t) => 1 - Math.pow(1 - t, 5),
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeOutBack: (t) => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  }
};

export function ease(key: EasingKey, t: number): number {
  const fn = EASING_FNS[key] ?? EASING_FNS.smoothstep;
  return fn(Math.max(0, Math.min(1, t)));
}

// ---- upstream: packages/img-fx/src/engine/renderer.ts ----
/**
 * Shared Three.js renderer driving every <ImageGeneration> on the page.
 *
 * Architecture:
 *   1. One module-scope SharedRenderer is lazily created on first card mount.
 *      It owns a single offscreen <canvas> + THREE.WebGLRenderer + ortho
 *      camera + ShaderMaterial + plane mesh.
 *   2. Each card registers an Instance: a visible 2D canvas + its own
 *      uniform cache + dirty flag + reveal/cycle state. Per frame the loop
 *      sizes the SHARED GL canvas to the largest active card (grow-only —
 *      never shrinks), then for each visible/unpaused instance: sets
 *      u_resolution to the instance's pixel size, sets the GL viewport +
 *      scissor to the bottom-left iw×ih sub-rect (the only sub-rect where
 *      `gl_FragCoord / u_resolution` lands in [0..1]), renders, and copies
 *      that sub-rect into the visible 2D canvas via drawImage.
 *      This avoids reallocating the GL drawing buffer every frame when
 *      multiple cards of different sizes share the renderer — the original
 *      "setSize per instance per frame" churn was exhausting Chrome's GPU
 *      memory budget over the course of a few minutes of continuous
 *      animation and crashing the WebGL context.
 *   3. IntersectionObserver pauses offscreen instances; when no instances
 *      are active the rAF loop is cancelled entirely (re-armed by the next
 *      visibility / pause / size change), so a fully-offscreen page costs
 *      essentially nothing.
 *   4. WebGL context loss is handled: on `webglcontextlost` the rAF is
 *      cancelled and uniforms marked dirty; on `webglcontextrestored` the
 *      renderer recovers and resumes.
 *   5. Last unmount disposes everything (geometry, material, renderer).
 *
 * This mirrors the metal-fx shared-renderer pattern but built around Three.js
 * (peer dep) so the GLSL from image.html drops in unchanged.
 */
import * as THREE from 'three';
import { parseCssColor, type EnginePresetMode, type PresetMode } from './image-fx-presets';
import { FRAG_SRC, VERT_SRC } from './image-fx-shaders';
// Labs: merged into this file: import type { RevealState } from './reveal';

/** Frame interval (ms). 10 fps cap is the sweet spot for the bundled presets
 *  — they drift at `speed` 0.3-0.9 rad/s, which is a phase delta of just
 *  0.03-0.09 rad per frame at 10 fps (well below the perceptual flicker
 *  threshold for smoothly varying fields). Drops shader + reveal work by
 *  ~33% vs. the previous 15 fps cap; for fast-moving custom presets the
 *  consumer can opt back up via `setFrameRate(15)` or higher. */
let frameIntervalMs = 1000 / 10;
/** Maximum device-pixel-ratio applied to the GL canvas (image.html line 952).
 *  At 1.25 (vs the original 1.5) fragment work drops by ~31% per render
 *  with essentially no visible difference on the cell-quantised mosaic
 *  presets bundled with the library. Mutable via `setMaxDpr()`. */
let maxDpr = 1.25;
/** Maximum device-pixel-ratio applied to the *visible* 2D canvas (the one
 *  the user actually sees) and, by extension, the reveal image drawn into
 *  it. Decoupled from `maxDpr` because:
 *
 *  - GL fragment work scales with `maxDpr²` and is the dominant per-frame
 *    cost — bumping it is expensive.
 *  - The visible canvas only receives ONE hardware-accelerated `drawImage`
 *    per frame (rect copy from the GL framebuffer) plus, briefly during
 *    reveal, the photographic image draw. Both are cheap even at 2× DPR.
 *
 *  Capping the *visible* canvas higher fixes the iOS-Safari / iOS-Firefox
 *  blur that 1.25× produced on `devicePixelRatio: 3` retina screens:
 *  the GL framebuffer (still rendered at `maxDpr`=1.25) is upscaled into
 *  the visible canvas with nearest-neighbour `drawImage`, so the cell
 *  mosaic stays crisp at no extra GL cost, while the reveal image —
 *  which `paintMaskedFrame` always draws with `imageSmoothingEnabled =
 *  true` at full quality — lands at the device's native pixel grid.
 *  2 is the standard "retina2x" cap; going to 3 on iPhone is below visual
 *  acuity for this content and would just chew CPU on the per-frame
 *  drawImage copy. */
const MAX_CANVAS_DPR = 2;

function resolveCanvasDpr(): number {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, MAX_CANVAS_DPR);
}

/** Instance handle returned by `createInstance`. Each <ImageGeneration> owns one. */
export interface Instance {
  /** Visible 2D canvas painted into the host wrapper. */
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** CSS-px size (synced from ResizeObserver). */
  cssWidth: number;
  cssHeight: number;
  /** GL render DPR cached at creation; refreshed on resize. Caps at
   *  `maxDpr` (default 1.25) — this is the cheap-fragment-shader knob. */
  dpr: number;
  /** Display DPR for the visible 2D canvas (and reveal image). Caps at
   *  `MAX_CANVAS_DPR` (default 2). May exceed `dpr`: when it does, the
   *  low-DPR GL framebuffer is upscaled into the visible canvas with
   *  `imageSmoothingEnabled = false` so the cell mosaic stays crisp at
   *  no extra GL cost, while the reveal image — drawn directly into
   *  this canvas with smoothing enabled — gets the device's full pixel
   *  density. Fixes blur on iOS Safari/Firefox where DPR=3. */
  canvasDpr: number;
  /** Active preset mode block (dark or light).
   *
   * Typed as `EnginePresetMode` (the wider engine-internal shape)
   * even though the public `setInstancePreset` accepts a narrower
   * `PresetMode` — the cast is sound because the runtime objects
   * exported via PRESETS always carry the dot-mode fields. */
  preset: EnginePresetMode;
  /** Optional override for `preset.cardBg` (#rrggbb). When set, this color is
   *  used as the shader's `u_cardBg` and forwarded to the reveal helper so
   *  background-derived shader logic stays in sync with the host card color. */
  cardBgOverride: string | null;
  /** Optional per-slot palette override (CSS colors, up to 7 entries). A slot
   *  with a value replaces the preset color verbatim (bypassing the card-bg
   *  linked remap); missing/undefined slots fall back to the preset palette.
   *  Lets consumers re-tint the running effect (e.g. from an image) without
   *  authoring a whole preset. */
  colorsOverride: (string | null | undefined)[] | null;
  /** Strength multiplier 0..1 (drives `canvas.style.opacity`). */
  strength: number;
  /** Animation-clock multiplier on top of the preset's baked speed. Scales
   *  the per-frame time delta, so drift, churn and flicker all speed up or
   *  slow down together. 1 = preset tempo. */
  speedMul: number;
  /** Pixel-cell on-screen size multiplier. 1 = preset default, 0.5 = cells at
   *  half size (finer / zoomed out), 2 = double size (chunkier / zoomed in).
   *  Applied by dividing the shader grid's base cell count so both the shader
   *  mosaic and the reveal dissolve share the same scaled grid. */
  pixelScale: number;
  /** True when in viewport. */
  visible: boolean;
  /** True when the user has paused this instance. */
  paused: boolean;
  /** Dirty flag - true until uniforms have been re-uploaded. */
  uniformsDirty: boolean;
  /** Reveal state (image overlay drawn on top of shader). Null when no overlay. */
  reveal: RevealState | null;
  /** Per-instance accumulated time so each card animates at its own preset.speed. */
  accumulatedTime: number;
  /** When created (ms) — used for first-tick init only. */
  startedAtMs: number;
  /** Labs: the frame clock, per instance (upstream kept one on the shared
   *  renderer): when the last frame was due and when the clock last ticked. */
  lastFrameMs: number;
  lastTickMs: number;
  /** Labs: asks this instance's render loop (`useRenderLoop`) for a frame. */
  wake: (() => void) | null;
}

interface SharedRenderer {
  glCanvas: HTMLCanvasElement;
  /** WebGL2 context if available, otherwise WebGL1. */
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  material: THREE.ShaderMaterial;
  geometry: THREE.PlaneGeometry;
  mesh: THREE.Mesh;
  uniforms: Record<string, THREE.IUniform>;
  instances: Set<Instance>;
  // Labs: no rAF loop here; each instance's render loop calls tickInstance()
  // (decision 0021), so `rafId`, `lastFrameMs` and `lastTickMs` moved to the
  // instance.
  /** Last instance whose uniforms were uploaded to `uniforms`. Used to skip
   *  re-uploading full uniform blocks when the same clean instance renders
   *  again back-to-back (e.g. single-card page, manual repaint). Null after
   *  destroy or when the next instance can't trust this cache. */
  lastInstance: Instance | null;
  /** WebGL context loss handlers — kept so we can detach on dispose. */
  onContextLost: ((e: Event) => void) | null;
  onContextRestored: (() => void) | null;
  contextLost: boolean;
}

let SHARED: SharedRenderer | null = null;

function createUniforms(): Record<string, THREE.IUniform> {
  return {
    u_resolution: { value: new THREE.Vector2(1, 1) },
    u_dpr: { value: 1 },
    u_time: { value: 0 },
    u_color1: { value: new THREE.Color(0x1a1a1a) },
    u_color2: { value: new THREE.Color(0x808080) },
    u_color3: { value: new THREE.Color(0xd9d9d9) },
    u_color4: { value: new THREE.Color(0x404040) },
    u_color5: { value: new THREE.Color(0xc0c0c0) },
    u_color6: { value: new THREE.Color(0x606060) },
    u_color7: { value: new THREE.Color(0xa0a0a0) },
    u_cardBg: { value: new THREE.Color(0x0f0f0f) },
    u_alpha1: { value: 1 },
    u_alpha2: { value: 1 },
    u_alpha3: { value: 1 },
    u_alpha4: { value: 1 },
    u_alpha5: { value: 1 },
    u_alpha6: { value: 1 },
    u_alpha7: { value: 1 },
    u_speed: { value: 1 },
    u_intensity: { value: 1 },
    u_scale: { value: 1.5 },
    u_direction: { value: 0 },
    u_softness: { value: 0.75 },
    u_distortion: { value: 0.3 },
    u_complexity: { value: 0.2 },
    u_shape: { value: 0.5 },
    u_flicker: { value: 0 },
    u_vignette: { value: 0.25 },
    u_vigOpacity: { value: 1 },
    u_blur: { value: 0 },
    u_highlight: { value: 0.4 },
    u_shaderOpacity: { value: 1 },
    u_cellSize: { value: 0.5 },
    u_gap: { value: 0.3 },
    u_dotSize: { value: 0.8 },
    u_dotSoftness: { value: 0.1 },
    u_dotOpacity: { value: 1 },
    u_hlScale: { value: 0 },
    u_fillOpacity: { value: 0 },
    u_edgeFade: { value: 16 },
    u_fadeStr: { value: 1 },
    u_dotMode: { value: 2 },
    u_effect: { value: 4 },
    u_sweepEase: { value: 0 }
  };
}

function ensureShared(): SharedRenderer {
  if (SHARED) return SHARED;

  const glCanvas = document.createElement('canvas');
  glCanvas.width = 8;
  glCanvas.height = 8;

  // `preserveDrawingBuffer: false` is the default and the right choice here:
  // we drawImage() the GL canvas into the visible 2D canvas IMMEDIATELY after
  // every renderer.render() in the same JS tick, so we never need the swap
  // chain to preserve back-buffer contents between frames. Preserving it was
  // forcing extra GPU memory retention which compounded the GL-buffer churn
  // issue and contributed to multi-minute crashes in Chrome.
  const renderer = new THREE.WebGLRenderer({
    canvas: glCanvas,
    alpha: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    antialias: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, maxDpr));
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = true;

  const gl = renderer.getContext();

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = createUniforms();
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT_SRC,
    fragmentShader: FRAG_SRC,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NormalBlending
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  SHARED = {
    glCanvas,
    gl,
    renderer,
    scene,
    camera,
    material,
    geometry,
    mesh,
    uniforms,
    instances: new Set(),
    lastInstance: null,
    onContextLost: null,
    onContextRestored: null,
    contextLost: false
  };

  // WebGL context loss recovery. Without this, a transient GPU hiccup (driver
  // reset, tab backgrounded too long, GPU OOM, etc.) would permanently freeze
  // every <ImageGeneration> on the page. `preventDefault()` on `lost` tells
  // the browser we'd like a restored context; on `restored` we re-arm the
  // loop and force every instance to re-upload its uniforms.
  const onLost = (e: Event): void => {
    e.preventDefault();
    if (!SHARED) return;
    SHARED.contextLost = true;
    // Labs: the render loops keep running but tickInstance() skips the paint;
    // components show their static fallback while the context is lost.
    for (const listener of contextListeners) listener(true);
  };
  const onRestored = (): void => {
    if (!SHARED) return;
    SHARED.contextLost = false;
    SHARED.lastInstance = null;
    for (const inst of SHARED.instances) inst.uniformsDirty = true;
    wakeLoop();
    for (const listener of contextListeners) listener(false);
  };
  glCanvas.addEventListener('webglcontextlost', onLost as EventListener, false);
  glCanvas.addEventListener('webglcontextrestored', onRestored, false);
  SHARED.onContextLost = onLost;
  SHARED.onContextRestored = onRestored;

  wakeLoop();
  return SHARED;
}

function destroyShared(): void {
  if (!SHARED) return;
  if (SHARED.onContextLost) {
    SHARED.glCanvas.removeEventListener('webglcontextlost', SHARED.onContextLost as EventListener, false);
  }
  if (SHARED.onContextRestored) {
    SHARED.glCanvas.removeEventListener('webglcontextrestored', SHARED.onContextRestored, false);
  }
  SHARED.geometry.dispose();
  SHARED.material.dispose();
  SHARED.renderer.dispose();
  SHARED = null;
}

function uploadInstanceUniforms(s: SharedRenderer, inst: Instance): void {
  const p = inst.preset;
  const u = s.uniforms;
  u.u_effect.value = p.effectIndex;
  u.u_speed.value = p.speed;
  // Strength above 1 boosts the shader's palette intensity and highlight
  // (canvas opacity is already at 1 there), so the top of the strength
  // range reads as a markedly more prominent effect rather than saturating
  // early. The 2.2 slope makes strength=2 roughly a 3× intensity push.
  const boost = 1 + Math.max(0, inst.strength - 1) * 2.2;
  u.u_intensity.value = p.intensity * boost;
  u.u_scale.value = p.scale;
  u.u_direction.value = (p.direction * Math.PI) / 180;
  u.u_softness.value = p.softness;
  u.u_distortion.value = p.distortion;
  u.u_complexity.value = p.complexity;
  u.u_shape.value = p.shape;
  u.u_flicker.value = p.flicker ?? 0;
  u.u_vignette.value = p.vignette;
  u.u_vigOpacity.value = p.vigOpacity;
  u.u_blur.value = p.blur;
  u.u_highlight.value = p.highlight * boost;
  u.u_shaderOpacity.value = p.shaderOpacity;
  u.u_dotMode.value = p.dotMode;
  u.u_sweepEase.value = p.sweepEase != null ? Math.floor(p.sweepEase) : 0;

  const mosaic = p.dotMode === 1 ? p.pixelConfig : p.dotConfig;
  u.u_cellSize.value = effectiveCellSize(mosaic.cellSize, inst.pixelScale);
  u.u_gap.value = mosaic.gap;
  u.u_dotSize.value = mosaic.dotSize;
  u.u_dotSoftness.value = mosaic.dotSoftness;
  u.u_dotOpacity.value = mosaic.dotOpacity;
  u.u_hlScale.value = mosaic.hlScale;
  u.u_fillOpacity.value = mosaic.fillOpacity;
  u.u_edgeFade.value = mosaic.edgeFade;
  u.u_fadeStr.value = mosaic.fadeStr;

  // `cardBgOverride` comes straight from the consumer's `cardBg` prop and is
  // documented as accepting any CSS colour, so route through parseCssColor
  // (alpha is dropped — see the parseCssColor JSDoc for why). The bundled
  // preset's own `cardBg` is always hex and hits the fast path.
  const [br, bg, bb] = parseCssColor(inst.cardBgOverride ?? p.cardBg);

  for (let i = 0; i < 7; i++) {
    const override = inst.colorsOverride?.[i];
    const [r, g, b] = override != null ? parseCssColor(override) : effectivePaletteColor(inst, i);
    (u[`u_color${i + 1}`].value as THREE.Color).setRGB(r, g, b);
    u[`u_alpha${i + 1}`].value = p.alphas[i];
  }
  (u.u_cardBg.value as THREE.Color).setRGB(br, bg, bb);

  inst.uniformsDirty = false;
}

/** Hex (#rrggbb) currently in effect for this instance, accounting for override. */
export function effectiveCardBg(inst: Instance): string {
  return inst.cardBgOverride ?? inst.preset.cardBg;
}

/**
 * Palette colour `index` (0–6) as [r,g,b] in 0–1, after the card-linked remap
 * (port of image.html's card-variable behaviour).
 *
 * Any preset colour authored to equal the preset's OWN canonical `cardBg` is
 * treated as a "card variable": when the consumer overrides `cardBg`, those
 * colours follow the new surface instead of staying at the preset default
 * (otherwise e.g. sweep-gradient's #0f0f0f swatches read as dark blocks on a
 * #1B1B1B demo card). With no override the effective bg equals the preset bg,
 * so the comparison is a no-op and the raw colour is returned unchanged.
 *
 * Shared by the shader uniform upload and the reveal mask so the effect and
 * its reveal silhouette stay in lockstep.
 */
export function effectivePaletteColor(inst: Instance, index: number): [number, number, number] {
  const p = inst.preset;
  const [r, g, b] = parseCssColor(p.colors[index]);
  if (inst.cardBgOverride == null) return [r, g, b];
  const [pbr, pbg, pbb] = parseCssColor(p.cardBg);
  const chan = (v: number): number => Math.round(v * 255);
  if (chan(r) === chan(pbr) && chan(g) === chan(pbg) && chan(b) === chan(pbb)) {
    return parseCssColor(inst.cardBgOverride);
  }
  return [r, g, b];
}

/** Compute the pixel-space size an instance currently needs from the GL
 *  framebuffer (CSS px × DPR, floored, min 1). Used by both the grow-only
 *  canvas sizer and per-paint viewport setup so the two stay in lockstep. */
function instancePixelSize(inst: Instance): { iw: number; ih: number } {
  return {
    iw: Math.max(1, Math.floor(inst.cssWidth * inst.dpr)),
    ih: Math.max(1, Math.floor(inst.cssHeight * inst.dpr))
  };
}

/** Grow the shared GL canvas if any active instance now needs more pixels
 *  than it currently provides. NEVER SHRINKS — frequent shrink/grow cycles
 *  reallocate the GL drawing buffer (each call is 1-10 MB of GPU memory
 *  churn) and that was the primary cause of multi-minute Chrome crashes.
 *
 *  Called once at the top of each frame (before iterating instances) so the
 *  canvas size is stable for the entire tick. */
function maybeGrowGlCanvas(s: SharedRenderer): void {
  let needCssW = 0;
  let needCssH = 0;
  for (const inst of s.instances) {
    if (!inst.visible || inst.paused) continue;
    if (inst.cssWidth > needCssW) needCssW = inst.cssWidth;
    if (inst.cssHeight > needCssH) needCssH = inst.cssHeight;
  }
  if (needCssW <= 0 || needCssH <= 0) return;
  const dpr = s.renderer.getPixelRatio();
  const needPxW = Math.max(1, Math.floor(needCssW * dpr));
  const needPxH = Math.max(1, Math.floor(needCssH * dpr));
  const curW = s.glCanvas.width;
  const curH = s.glCanvas.height;
  if (needPxW <= curW && needPxH <= curH) return;
  // Pass CSS px (setSize multiplies by pixel ratio internally). Pick the max
  // of the current and required dimensions so neither axis ever contracts.
  const targetCssW = Math.max(needCssW, curW / Math.max(dpr, 0.0001));
  const targetCssH = Math.max(needCssH, curH / Math.max(dpr, 0.0001));
  s.renderer.setSize(targetCssW, targetCssH, false);
}

/** Inner render — assumes the caller has already gated on visibility / size /
 *  pause where appropriate AND has called `maybeGrowGlCanvas` for the frame.
 *
 *  Renders the instance into the BOTTOM-LEFT iw×ih sub-rect of the shared GL
 *  canvas. That sub-rect is the only one where the shader's
 *  `uv = gl_FragCoord.xy / u_resolution` lands in `[0..1]² ` (because
 *  gl_FragCoord is window-relative in WebGL with origin at the bottom-left,
 *  and we set u_resolution to the instance's pixel size). After rendering,
 *  we drawImage() that sub-rect into the visible 2D canvas — the source
 *  rect's image-space y is `glCanvas.height - ih` because image-space coords
 *  have origin at the top-left while the framebuffer's origin is at the
 *  bottom-left.
 *
 *  Uniform block re-upload is skipped when the same clean instance just
 *  rendered AND its `uniformsDirty` flag is clear (only `u_time` and
 *  `u_resolution` need refreshing in that case). For multi-card pages
 *  instances rotate so this always re-uploads, but it removes the cost
 *  for single-card pages, manual `renderInstanceOnce` repaints, and
 *  reveal sampling re-renders that don't switch instance. */
function paintInstance(s: SharedRenderer, inst: Instance, nowMs: number): void {
  if (s.contextLost) return;
  const { iw, ih } = instancePixelSize(inst);

  // Constrain rendering to the instance-sized bottom-left sub-rect. setViewport
  // and setScissor on the WebGLRenderer accept CSS pixels and multiply by the
  // renderer's pixel ratio internally, so pass the CSS dims to keep math simple.
  const cssW = Math.max(1, inst.cssWidth);
  const cssH = Math.max(1, inst.cssHeight);
  s.renderer.setViewport(0, 0, cssW, cssH);
  s.renderer.setScissor(0, 0, cssW, cssH);
  s.renderer.setScissorTest(true);

  // u_resolution drives the shader's cell sizes, vignette, edge fade etc.
  // It MUST match the viewport size so `gl_FragCoord / u_resolution` produces
  // sensible UVs inside the rendered sub-rect.
  (s.uniforms.u_resolution.value as THREE.Vector2).set(iw, ih);
  s.uniforms.u_dpr.value = inst.dpr || 1;

  // Reuse uniforms when the same clean instance is rendering again.
  const canReuseUniforms = s.lastInstance === inst && !inst.uniformsDirty;
  if (!canReuseUniforms) {
    uploadInstanceUniforms(s, inst);
    s.lastInstance = inst;
  }
  s.uniforms.u_time.value = inst.accumulatedTime;

  s.renderer.render(s.scene, s.camera);

  // Resize the visible canvas to the instance's pixel size — at the
  // *display* DPR cap (`canvasDpr`, default 2), not the GL DPR (`dpr`,
  // default 1.25). Sizing this canvas higher than the GL framebuffer is
  // what gives iOS Safari/Firefox a sharp reveal image: `paintMaskedFrame`
  // draws the photograph directly into this canvas with
  // `imageSmoothingEnabled = true`, so the image lands at the device's
  // native pixel grid (DPR 3 on iPhone, DPR 2 on iPad) instead of getting
  // CSS-upscaled from 1.25× by the browser.
  //
  // The reallocation cost is the same as before — the canvas only
  // triggers a buffer alloc when the instance itself resizes — and the
  // per-frame compositing cost adds one hardware-accelerated rect copy
  // at (`dispW × dispH`) which is sub-ms on any GPU-backed 2D context.
  const dispW = Math.max(1, Math.floor(inst.cssWidth * inst.canvasDpr));
  const dispH = Math.max(1, Math.floor(inst.cssHeight * inst.canvasDpr));
  if (inst.canvas.width !== dispW || inst.canvas.height !== dispH) {
    inst.canvas.width = dispW;
    inst.canvas.height = dispH;
  }
  inst.ctx.clearRect(0, 0, dispW, dispH);
  // Source rect is the bottom-left iw×ih of the framebuffer. In image-space
  // (top-left origin) that lives at sy = glCanvas.height - ih.
  const sy = s.glCanvas.height - ih;
  // Disable smoothing for the GL → visible upscale: the shader output is a
  // sharp cell mosaic and nearest-neighbour preserves block edges (bilinear
  // would melt them into a mushy gradient — the exact iOS blur we're
  // fixing for the reveal image, but inverted for the shader). The reveal
  // pipeline (`paintMaskedFrame` and friends) explicitly re-enables
  // smoothing before drawing the photographic image, so this setting only
  // affects this single drawImage call.
  inst.ctx.imageSmoothingEnabled = false;
  inst.ctx.drawImage(s.glCanvas, 0, sy, iw, ih, 0, 0, dispW, dispH);

  // Reveal pipeline (defined in reveal.ts) — paints overlay image into its
  // own mask canvas; we just notify it that the shader frame just finished.
  // Sampling inside `afterShaderFrame` mutates u_dotMode/u_fillOpacity, so
  // invalidate the uniform cache after the hook runs.
  inst.reveal?.afterShaderFrame(s, inst, nowMs);
  if (inst.reveal && inst.reveal.isActive()) {
    s.lastInstance = null;
  }
}

/** Render a single instance into its visible canvas (rAF tick path).
 *  Skips paused / offscreen / zero-size instances so the loop stays cheap. */
function renderInstance(s: SharedRenderer, inst: Instance, nowMs: number): void {
  if (!inst.visible || inst.paused) return;
  if (inst.cssWidth < 1 || inst.cssHeight < 1) return;
  paintInstance(s, inst, nowMs);
}

/**
 * Force a single repaint of an instance regardless of its pause state.
 * Used by React sync effects (preset / cardBg changes etc.) so paused cards
 * still reflect prop edits live in the playground without resuming the
 * animation loop. Skips if the instance is offscreen or zero-sized.
 */
export function renderInstanceOnce(inst: Instance): void {
  if (!SHARED) return;
  if (SHARED.contextLost) return;
  if (!inst.visible) return;
  if (inst.cssWidth < 1 || inst.cssHeight < 1) return;
  // Make sure the GL canvas is big enough for this one-shot repaint even if
  // the loop is currently asleep (no auto-render instance is keeping it
  // sized).
  maybeGrowGlCanvas(SHARED);
  paintInstance(SHARED, inst, performance.now());
}

let onAfterTick: (() => void) | null = null;
/** Hook for cycle scheduler so it can advance phase timers in lockstep. */
export function setAfterTick(cb: (() => void) | null): void {
  onAfterTick = cb;
}

/** Labs: listeners told when the shared WebGL context is lost (true) and
 *  restored (false), so each component can show its static fallback. */
const contextListeners = new Set<(lost: boolean) => void>();

/** Labs: subscribe to shared-context loss; returns the unsubscribe. */
export function subscribeSharedContext(listener: (lost: boolean) => void): () => void {
  contextListeners.add(listener);
  return () => {
    contextListeners.delete(listener);
  };
}

/** Labs: true while the shared WebGL context is lost. */
export function isSharedContextLost(): boolean {
  return SHARED?.contextLost ?? false;
}

/**
 * Labs: one instance's frame. Upstream ran a single requestAnimationFrame
 * loop for every instance (`tick`); decision 0021 hands the loop, with its
 * off-screen and hidden-tab pauses, to each instance's `useRenderLoop`,
 * which calls this on every animation frame. The body is upstream's tick for
 * one instance: the same frame cap, clock and grow-only resize. `resumed`
 * restarts the clock after a pause, as upstream's `wakeLoop` did when the
 * loop had been asleep.
 */
export function tickInstance(inst: Instance, now: number, resumed: boolean): void {
  if (!SHARED) return;
  if (SHARED.contextLost) return;
  if (!inst.visible || inst.paused) return;
  if (resumed) {
    inst.lastTickMs = now;
    inst.lastFrameMs = now;
  }

  const elapsed = now - inst.lastFrameMs;
  if (elapsed < frameIntervalMs) return;
  inst.lastFrameMs = now - (elapsed % frameIntervalMs);

  const deltaSec = (now - inst.lastTickMs) / 1000;
  inst.lastTickMs = now;

  inst.accumulatedTime += deltaSec * inst.speedMul;

  // Grow-only resize (see maybeGrowGlCanvas) before painting.
  maybeGrowGlCanvas(SHARED);

  renderInstance(SHARED, inst, now);

  onAfterTick?.();
}

/** Labs: asks every instance's render loop for a frame (upstream re-armed
 *  its shared rAF loop here). Safe to call repeatedly. */
function wakeLoop(): void {
  if (!SHARED) return;
  if (SHARED.contextLost) return;
  for (const inst of SHARED.instances) inst.wake?.();
}

/** Public API */

export interface CreateInstanceOptions {
  canvas: HTMLCanvasElement;
  cssWidth: number;
  cssHeight: number;
  preset: PresetMode;
  strength?: number;
  /** Animation-clock multiplier (see `Instance.speedMul`). @default 1 */
  speed?: number;
  cardBg?: string | null;
  /** Pixel-cell size multiplier (see `Instance.pixelScale`). @default 1 */
  pixelScale?: number;
}

/**
 * Resolve the effective `cellSize` (0..1 preset value) for an instance's
 * `pixelScale`. The shader derives the mosaic grid from
 * `gridCounts(6 + cellSize * 74)`, so scaling the on-screen cell *size* by
 * `pixelScale` means dividing that base count by `pixelScale` (smaller cells
 * = more of them). Returning a re-derived `cellSize` keeps the shader and the
 * reveal dissolve — which both compute `6 + cellSize * 74` independently —
 * perfectly in lockstep without threading an extra uniform.
 *
 * The result can fall below 0 (very chunky) or above 1 (very fine); the
 * shader's `gridCounts` floor of 2 cells keeps that safe.
 */
export function effectiveCellSize(cellSize: number, pixelScale: number): number {
  if (!(pixelScale > 0) || pixelScale === 1) return cellSize;
  const baseCount = (6 + cellSize * 74) / pixelScale;
  return (baseCount - 6) / 74;
}

export function createInstance(opts: CreateInstanceOptions): Instance {
  const s = ensureShared();
  const ctx = opts.canvas.getContext('2d');
  if (!ctx) throw new Error('img-fx: 2D context unavailable');
  const inst: Instance = {
    canvas: opts.canvas,
    ctx,
    cssWidth: opts.cssWidth,
    cssHeight: opts.cssHeight,
    dpr: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, maxDpr),
    canvasDpr: resolveCanvasDpr(),
    // Public `PresetMode` widens to `EnginePresetMode` at the
    // boundary — see `Instance.preset` for the rationale.
    preset: opts.preset as EnginePresetMode,
    cardBgOverride: opts.cardBg ?? null,
    colorsOverride: null,
    strength: Math.max(0, Math.min(2, opts.strength ?? 1)),
    speedMul: opts.speed != null && opts.speed > 0 ? opts.speed : 1,
    pixelScale: opts.pixelScale != null && opts.pixelScale > 0 ? opts.pixelScale : 1,
    visible: true,
    paused: false,
    uniformsDirty: true,
    reveal: null,
    accumulatedTime: Math.random() * 1000,
    startedAtMs: performance.now(),
    // Labs: the clock starts at creation, as upstream's wakeLoop() did.
    lastFrameMs: performance.now(),
    lastTickMs: performance.now(),
    wake: null
  };
  s.instances.add(inst);
  wakeLoop();
  return inst;
}

export function destroyInstance(inst: Instance): void {
  if (!SHARED) return;
  SHARED.instances.delete(inst);
  // Drop the uniform-cache pointer if it referenced the dead instance, so the
  // next render of any other instance won't trust stale per-instance uniforms.
  if (SHARED.lastInstance === inst) SHARED.lastInstance = null;
  inst.reveal?.dispose();
  inst.reveal = null;
  if (SHARED.instances.size === 0) destroyShared();
}

export function updateInstanceSize(inst: Instance, cssWidth: number, cssHeight: number): void {
  inst.cssWidth = cssWidth;
  inst.cssHeight = cssHeight;
  if (typeof window !== 'undefined') {
    inst.dpr = Math.min(window.devicePixelRatio, maxDpr);
    // Refresh visible-canvas DPR too — covers monitor swaps and OS
    // zoom changes that move `devicePixelRatio` while the page is open.
    inst.canvasDpr = resolveCanvasDpr();
  }
}

export function setInstancePreset(inst: Instance, preset: PresetMode): void {
  // Same widening cast as `createInstance` — see `Instance.preset`.
  inst.preset = preset as EnginePresetMode;
  inst.uniformsDirty = true;
}

export function setInstanceCardBg(inst: Instance, cardBg: string | null): void {
  inst.cardBgOverride = cardBg;
  inst.uniformsDirty = true;
}

/** Per-slot palette override (see `Instance.colorsOverride`). Pass null to
 *  restore the preset palette. */
export function setInstanceColors(inst: Instance, colors: (string | null | undefined)[] | null): void {
  inst.colorsOverride = colors && colors.length > 0 ? colors.slice(0, 7) : null;
  inst.uniformsDirty = true;
}

export function setInstanceVisible(inst: Instance, visible: boolean): void {
  inst.visible = visible;
  if (visible) wakeLoop();
}

export function setInstancePaused(inst: Instance, paused: boolean): void {
  inst.paused = paused;
  if (!paused) wakeLoop();
}

export function setInstanceStrength(inst: Instance, strength: number): void {
  inst.strength = Math.max(0, Math.min(2, strength));
  // The boost region (>1) feeds u_intensity, which is baked into the cached
  // uniform block — invalidate so the change paints on the next frame.
  inst.uniformsDirty = true;
}

export function setInstanceSpeed(inst: Instance, speed: number): void {
  inst.speedMul = speed > 0 ? speed : 1;
}

export function setInstancePixelScale(inst: Instance, pixelScale: number): void {
  inst.pixelScale = pixelScale > 0 ? pixelScale : 1;
  // Cell count is derived from pixelScale at uniform-upload time, so a change
  // must invalidate the cached uniform block.
  inst.uniformsDirty = true;
}

/**
 * Cap the rAF tick rate (frames per second). Applies globally to every
 * instance sharing the renderer. Values are clamped to a sensible range so
 * a callsite can't accidentally starve the loop or burn CPU at >60.
 *
 * @example setFrameRate(10) // default — best for slow-drift presets
 * @example setFrameRate(15) // smoother for faster custom presets
 * @example setFrameRate(30) // restore the original cap
 */
export function setFrameRate(fps: number): void {
  const safe = Math.max(1, Math.min(60, fps));
  frameIntervalMs = 1000 / safe;
}

/**
 * Cap the device-pixel-ratio used by the GL canvas. Lower values mean
 * fewer fragments to shade per frame (~quadratic GPU saving). Updates the
 * shared `THREE.WebGLRenderer.setPixelRatio` AND every live instance's
 * cached `inst.dpr` so the next render uses the new ratio. Existing
 * instances are forced to re-upload uniforms because the change invalidates
 * the per-instance `u_dpr` value used by the shader's CSS-px calculations.
 *
 * Values are clamped to [1, 4]. Pass `1` for the strongest GPU saving on
 * retina displays; the default is `1.25`.
 */
export function setMaxDpr(dpr: number): void {
  maxDpr = Math.max(1, Math.min(4, dpr));
  if (!SHARED) return;
  const next = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, maxDpr);
  SHARED.renderer.setPixelRatio(next);
  // Force every instance to re-pick its DPR + re-upload uniforms next paint
  // so `u_dpr`, `u_resolution`, and the GL canvas size all stay coherent.
  for (const inst of SHARED.instances) {
    inst.dpr = next;
    inst.uniformsDirty = true;
  }
  // Invalidate the uniform cache so the next paint re-uploads rather than
  // rolling forward with stale per-instance values.
  SHARED.lastInstance = null;
}

/** Read the current cap (frames per second). */
export function getFrameRate(): number {
  return 1000 / frameIntervalMs;
}

/** Read the current MAX_DPR cap. */
export function getMaxDpr(): number {
  return maxDpr;
}

/** Internal helper for the reveal sampler — exposes the shared renderer to
 *  reveal.ts so it can momentarily re-render with a different dotMode and read
 *  pixels back via gl.readPixels. */
/** Swap the fragment stage every instance renders with, or `null` for the
 *  bundled one. The material is shared, so this is page-wide. Compile
 *  errors surface from three.js on the next render — validate the source
 *  on a scratch context first if it comes from somewhere untrusted. */
export function setSharedFragmentShader(src: string | null): void {
  const s = ensureShared();
  const next = src ?? FRAG_SRC;
  if (s.material.fragmentShader === next) return;
  s.material.fragmentShader = next;
  s.material.needsUpdate = true;
  for (const inst of s.instances) inst.uniformsDirty = true;
  wakeLoop();
}

export function withSharedRenderer<T>(fn: (s: SharedRenderer) => T): T {
  return fn(ensureShared());
}

export type { SharedRenderer };

// ---- upstream: packages/img-fx/src/engine/reveal.ts ----
/**
 * Per-instance reveal pipeline.
 *
 * Direct port of image.html `drawMaskedImage` (lines 2481–2703) and the
 * `getMaskValue` geometric mask helper (line 2367), reorganised so each
 * <ImageGeneration> card has its own private scratch canvases and overlay
 * state. The reveal canvas sits on top of the shader canvas and is gradually
 * filled with the source image; the shader canvas underneath fades to 0 over
 * the same duration, producing the same crossfade as the original demo.
 *
 * The shader luminance / shader-color sampling renders the live shader into a
 * small `MASK_SIZE` × `MASK_SIZE` buffer (image.html's `MASK_SIZE` was 100; we
 * use 64 — visually indistinguishable after the upscale-with-smoothing step
 * but ~60% cheaper to allocate and iterate). The dotMode is temporarily
 * forced to 0 / 1 so the mask reads from the raw / pixel-rendered shader
 * colour field rather than the dot mosaic.
 */
// Labs: parseCssColor and EnginePresetMode are imported above; tween and the
// renderer are merged into this file.
import type { MaskShape } from './image-fx-presets';
// import { ease } from './tween';
// import {
//   effectiveCardBg,
//   effectiveCellSize,
//   effectivePaletteColor,
//   type Instance,
//   type SharedRenderer
// } from './renderer';

/** Side length of the square buffer used to evaluate the reveal mask shape
 *  (and to sample the live shader field for the `shaderColor*` / `shaderHighlight`
 *  mask shapes). The buffer is upscaled to the visible canvas size with
 *  image-smoothing on, so dropping below ~50 still produces a clean edge.
 *  64 (vs the original 100) cuts the per-frame JS pixel loop and the
 *  `getImageData` allocation by ~59% with no perceptible visual change. */
const MASK_SIZE = 64;
const DOT_MASK_SIZE = 96;
/** Reference card edge length (CSS px) used by the shader's `gridCounts` for
 *  scale-invariant cell sizing. The pixel-mode reveal dissolve mirrors that
 *  same constant so its chunky cells line up visually with the shader's. */
const REVEAL_REF_DIM = 320;

/** Fraction of the source rect trimmed off every edge before drawing. Guards
 *  against a 1–3px solid border row baked into the source image (extremely
 *  common in screenshots, which capture a black window-chrome / letterbox edge)
 *  landing flush against the card edge and reading as a thin dark line. Cover
 *  already crops the overflow axis, so trimming an extra ~0.6% is an
 *  imperceptible zoom on the fit axis while reliably clearing typical borders. */
const COVER_EDGE_INSET_FRAC = 0.006;

/** Source rect for a cover-fit draw of `img` into a target of `targetW × targetH`.
 *  Mirrors CSS `object-fit: cover`: image aspect is preserved, the overflowing
 *  axis is centre-cropped. Never squashes / stretches. */
function computeCoverSourceRect(
  img: HTMLImageElement,
  targetW: number,
  targetH: number
): { sx: number; sy: number; sw: number; sh: number } {
  const targetAspect = targetW / Math.max(1, targetH);
  const imgAspect = img.width / Math.max(1, img.height);
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (imgAspect > targetAspect) {
    // Image is wider than target — crop left/right.
    sw = img.height * targetAspect;
    sx = (img.width - sw) / 2;
  } else {
    // Image is taller than target — crop top/bottom.
    sh = img.width / targetAspect;
    sy = (img.height - sh) / 2;
  }
  // Trim a thin margin off all four edges so a solid border row baked into the
  // source never sits flush at the card edge. Clamped so it can never invert
  // the rect for tiny source images.
  const inset = Math.min(sw, sh) * COVER_EDGE_INSET_FRAC;
  if (sw - 2 * inset > 1 && sh - 2 * inset > 1) {
    sx += inset;
    sy += inset;
    sw -= 2 * inset;
    sh -= 2 * inset;
  }
  return { sx, sy, sw, sh };
}

/** Cache decoded <img> elements globally so repeat URLs only decode once. */
const IMAGE_CACHE = new Map<string, Promise<HTMLImageElement>>();

/**
 * Load (and cache) an image. Resolves once the bitmap is decoded and ready.
 *
 * Note: we do NOT set `img.crossOrigin` — for same-origin assets that would
 * trigger an unnecessary CORS preflight that most static dev servers don't
 * satisfy. Drawing images into a 2D canvas does not taint the canvas if the
 * image is same-origin. Consumers serving cross-origin images should set
 * proper CORS headers on their CDN.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  let entry = IMAGE_CACHE.get(src);
  if (entry) return entry;
  entry = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const done = (): void => resolve(img);
    img.onerror = (e) => {
      IMAGE_CACHE.delete(src);
      reject(e);
    };
    // Prefer `decode()`: it resolves once the bitmap is decoded off the main
    // thread. With plain `onload` the first `drawImage` of a multi-megapixel
    // photo triggers a synchronous decode on the main thread (tens to
    // hundreds of ms per image) — one visible hitch per new image, on every
    // card, which read as the page "freezing" during auto-cycles.
    if (typeof img.decode === 'function') {
      img.src = src;
      img.decode().then(done, () => {
        // `decode()` can reject for reasons other than a load failure (e.g.
        // the browser dropped the decoded bitmap under memory pressure). Fall
        // back to the classic onload path; a real load failure still rejects
        // via `onerror` above.
        if (img.complete && img.naturalWidth > 0) done();
        else img.onload = done;
      });
    } else {
      img.onload = done;
      img.src = src;
    }
  });
  IMAGE_CACHE.set(src, entry);
  return entry;
}

export interface RevealStartOptions {
  /** Image to reveal. */
  image: HTMLImageElement;
  /** Output canvas size (CSS px). Reveal canvas matches the shader canvas. */
  cssWidth: number;
  cssHeight: number;
  /** Phase scheduler hooks. */
  onRevealComplete?: () => void;
}

export interface RevealState {
  /** The DOM canvas painted on top of the shader canvas. */
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** Per-frame hook invoked after the shader has rendered. Decides what to do
   *  with the overlay this frame (paint mask, hold, fade out, idle). */
  afterShaderFrame: (s: SharedRenderer, inst: Instance, nowMs: number) => void;
  /** Begin a new reveal animation. */
  startReveal: (opts: RevealStartOptions) => void;
  /** Begin the fade-out (hide) phase. */
  startHide: (durationMs?: number) => void;
  /**
   * Dissolve the currently held image into a sustained "generating" state:
   * the image is broken into the effect's pixel-cell grid and the cells churn
   * (pop in/out with the preset's flicker clock) indefinitely while the
   * shader effect plays through the gaps. No-op unless an image is currently
   * revealed/held. Ends when `startReveal` (next image) or `startHide` runs.
   */
  startBoil: () => void;
  /** Force-clear the overlay back to idle. */
  clear: () => void;
  /** True while a reveal/hold/hide is in progress. */
  isActive: () => boolean;
  dispose: () => void;
}

interface RevealInternals {
  // Animation state
  active: boolean;
  phase: 'idle' | 'reveal' | 'hold' | 'hide' | 'boil';
  revealStartMs: number;
  hideStartMs: number;
  hideDurationMs: number;
  /** When the boil (sustained pixel-churn) phase started. */
  boilStartMs: number;
  /** Persistent per-cell random thresholds for the boil churn. Unlike
   *  `pixDropPattern` (reseeded per reveal) this survives for the whole boil
   *  so settled cells stay settled and only edge cells flicker. */
  boilPattern: Float32Array | null;
  boilPatternW: number;
  boilPatternH: number;
  /** Pooled per-cell shader-field luminance for the boil (drives which image
   *  cells drop, so the churn follows the live img-fx animation). */
  boilField: Float32Array | null;
  /** When a reveal was requested during a boil: starts the BLEND → RESOLVE
   *  handoff (see paintBoilFrame) — the churning cells morph their colours
   *  to the incoming image, then the smooth photo fades in while the chunky
   *  cells melt into it in parallel. No hard cut from churn to reveal. */
  boilHandoffStartMs: number;
  pendingReveal: RevealStartOptions | null;
  image: HTMLImageElement | null;
  onRevealComplete?: () => void;

  // Output dims (CSS px)
  cssWidth: number;
  cssHeight: number;

  // Mask scratch (geometric / shader-luminance)
  sampleCanvas: HTMLCanvasElement | null;
  sampleCtx: CanvasRenderingContext2D | null;
  /** Pooled image-data for `getImageData` reads from `sampleCanvas`. Allocated
   *  once and reused every frame — without this the reveal hot path allocates
   *  a fresh Uint8ClampedArray per frame per active card, putting heavy
   *  GC pressure on Chrome over long sessions. */
  sampleImgData: ImageData | null;
  /** Last-read sample buffer (the `.data` view of `sampleImgData`). Cached
   *  so we can skip the expensive `renderer.render()` + `getImageData`
   *  round-trip on every other reveal frame — the shader colour field drifts
   *  slowly enough (~0.3-0.9 rad/s) that a 1-frame-stale sample is
   *  imperceptible at the soft-banded mask threshold. */
  sampleDataCache: Uint8ClampedArray | null;
  /** Monotonically increasing reveal-frame counter used to decide when to
   *  re-sample. Even values trigger a fresh sample, odd values reuse the
   *  cache. Reset to 0 on every new `startReveal()`. */
  sampleFrameCounter: number;
  maskGrad: HTMLCanvasElement | null;
  maskGradCtx: CanvasRenderingContext2D | null;
  /** Pooled image-data for the mask gradient. Allocated lazily on first paint
   *  and reused thereafter; MASK_SIZE is a compile-time constant so the
   *  buffer dimensions never need to change. */
  maskImgData: ImageData | null;
  /** Pooled per-cell flicker offsets for the gradientSweep mask. Recomputed
   *  every frame (values change with the flicker clock) but only reallocated
   *  when the cell grid size changes. */
  gsFlickerTable: Float32Array | null;

  // Pixel-mode + dot-mode pixelation scratch. The same canvases are reused
  // by both code paths because `preset.dotMode` is fixed per-instance, so
  // only one of the two ever runs against a given reveal state. The drop
  // pattern is the per-cell random threshold used to gradually transition
  // cells from chunky-pixelated to smooth as `fadeT` increases.
  pixCanvas: HTMLCanvasElement | null;
  pixCtx: CanvasRenderingContext2D | null;
  pixDrop: HTMLCanvasElement | null;
  pixDropCtx: CanvasRenderingContext2D | null;
  pixDropImgData: ImageData | null;
  pixDropPattern: Float32Array | null;
  pixDropPatternW: number;
  pixDropPatternH: number;
  pixDropRevealStart: number;

  /** Cover-fit copies of the reveal image(s) at the output canvas size,
   *  resampled ONCE (high quality) per image × size instead of on every
   *  frame. Every per-frame `drawImage` of the photo now reads from one of
   *  these instead of the multi-megapixel source, so the browser's
   *  multi-pass "high" downsample runs once per reveal, not 10×/s × 2-3
   *  draws × cards. Slot `a` is the current image, slot `b` the incoming
   *  (pending) image during a boil handoff. */
  coverA: CoverBitmap | null;
  coverB: CoverBitmap | null;
  /** What the `hold` phase last painted, so the fully-revealed image is
   *  drawn once and then left alone (it was repainted every tick). */
  holdPaintedImg: HTMLImageElement | null;
  holdPaintedW: number;
  holdPaintedH: number;
  /** GPU-backed maskSize×maskSize intermediate for the shader sample: the
   *  WebGL frame is downscaled into this (stays on the GPU) and only this
   *  small canvas is read back into the CPU-side `sampleCanvas`. Drawing the
   *  GL canvas straight into a `willReadFrequently` (CPU) canvas forced a
   *  full iw×ih GPU→CPU readback per sample. */
  sampleGpuCanvas: HTMLCanvasElement | null;
  sampleGpuCtx: CanvasRenderingContext2D | null;
}

interface CoverBitmap {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  img: HTMLImageElement | null;
  w: number;
  h: number;
}

/** Return `img` cover-fitted into a `w × h` canvas, resampling only when the
 *  image or the size changed since the last call for that slot. */
function getCoverBitmap(
  state: RevealInternals,
  slot: 'a' | 'b',
  img: HTMLImageElement,
  w: number,
  h: number
): HTMLCanvasElement {
  let cb = slot === 'a' ? state.coverA : state.coverB;
  if (!cb) {
    const canvas = document.createElement('canvas');
    const c = canvas.getContext('2d');
    if (!c) throw new Error('img-fx: 2D context unavailable for cover bitmap');
    cb = { canvas, ctx: c, img: null, w: 0, h: 0 };
    if (slot === 'a') state.coverA = cb;
    else state.coverB = cb;
  }
  if (cb.img !== img || cb.w !== w || cb.h !== h) {
    cb.canvas.width = w;
    cb.canvas.height = h;
    cb.w = w;
    cb.h = h;
    cb.img = img;
    const { sx, sy, sw, sh } = computeCoverSourceRect(img, w, h);
    cb.ctx.clearRect(0, 0, w, h);
    cb.ctx.imageSmoothingEnabled = true;
    cb.ctx.imageSmoothingQuality = 'high';
    cb.ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  }
  return cb.canvas;
}

function getMaskSize(p: EnginePresetMode): number {
  return p.dotMode === 2 ? DOT_MASK_SIZE : MASK_SIZE;
}

function getActiveRevealTiming(
  p: EnginePresetMode
): { duration: number; easingKey: EnginePresetMode['revealConfig']['easing'] } {
  // Mode-aware: dot uses dotDuration/dotEasing, everything else uses duration/easing.
  // Mirrors image.html `getActiveRevealTiming` (line 2353).
  const r = p.revealConfig;
  if (p.dotMode === 2) {
    return { duration: Math.max(0.05, r.dotDuration), easingKey: r.dotEasing };
  }
  return { duration: Math.max(0.05, r.duration), easingKey: r.easing };
}

function getMaskValue(shape: MaskShape, r: number, c: number, size: number): number {
  const nx = c / (size - 1);
  const ny = r / (size - 1);
  const cx = nx - 0.5;
  const cy = ny - 0.5;
  switch (shape) {
    case 'radialCenter':
      return 1 - Math.sqrt(cx * cx + cy * cy) * 2;
    case 'radialCorner':
      return 1 - Math.sqrt(nx * nx + ny * ny) / 1.414;
    case 'linearTop':
      return 1 - ny;
    case 'linearBottom':
      return ny;
    case 'linearLeft':
      return 1 - nx;
    case 'linearRight':
      return nx;
    case 'diagonalTL':
      return 1 - (nx + ny) / 2;
    case 'diagonalBR':
      return (nx + ny) / 2;
    case 'diamond':
      return 1 - (Math.abs(cx) + Math.abs(cy));
    case 'blindsH':
      return 1 - ((ny * 8) % 1);
    case 'blindsV':
      return 1 - ((nx * 8) % 1);
    default:
      return -1;
  }
}

/** Sample the current shader frame into an N×N RGBA buffer for the reveal
 *  mask. Mirrors the original `image.html` (line 2530) sampling rule so each
 *  preset gets its authentic mask character:
 *
 *    presetDotMode === 1 (PIXELS) → sample at u_dotMode = 0 (RAW smooth
 *      shader field), so the reveal silhouette never inherits the chunky
 *      pixel cells from the foreground render. The pixel-cell dissolve is
 *      a separate effect handled in paintPixelMasked().
 *
 *    presetDotMode === 2 (DOTS)  → sample at u_dotMode = 1 (PIXEL-rendered
 *      shader field). The dot foreground would leave huge gaps if sampled
 *      directly; pixel-rendered sampling produces a solid, cell-stepped
 *      field whose chunks line up with the shader's mosaic grid, giving the
 *      dots presets their distinctive cell-quantised mask edge.
 *
 *  Restores the original dotMode / fillOpacity before returning so the
 *  next regular tick is unaffected.
 */
function sampleShaderField(
  state: RevealInternals,
  s: SharedRenderer,
  inst: Instance,
  scratchCtx: CanvasRenderingContext2D,
  maskSize: number
): Uint8ClampedArray {
  const origDotMode = s.uniforms.u_dotMode.value as number;
  const origFillOpacity = s.uniforms.u_fillOpacity.value as number;
  const presetDotMode = inst.preset.dotMode;
  const sampleDotMode = presetDotMode < 1.5 ? 0 : 1;
  s.uniforms.u_dotMode.value = sampleDotMode;
  // When sampling as pixel-rendering (dots presets), preserve the active
  // mosaic's fillOpacity so colour-target masks (`shaderColorN`) read the
  // same colour distribution the user sees. When sampling raw (pixels
  // presets), zero it out so pixel fills don't bleed into the mask field.
  s.uniforms.u_fillOpacity.value =
    sampleDotMode > 0.5
      ? presetDotMode === 1
        ? inst.preset.pixelConfig.fillOpacity
        : inst.preset.dotConfig.fillOpacity
      : 0;
  s.renderer.render(s.scene, s.camera);

  // The instance's pixels live in the BOTTOM-LEFT iw×ih sub-rect of the
  // shared GL canvas (paintInstance sets the viewport accordingly). In
  // image-space coords (top-left origin used by drawImage source rects) that
  // sub-rect starts at y = glCanvas.height - ih.
  const iw = Math.max(1, Math.floor(inst.cssWidth * inst.dpr));
  const ih = Math.max(1, Math.floor(inst.cssHeight * inst.dpr));
  const sy = Math.max(0, s.glCanvas.height - ih);
  // Two-stage copy: GL → small GPU-backed canvas (stays on the GPU), then
  // that maskSize² canvas → the CPU-side scratch. Only the tiny intermediate
  // is read back, instead of the full iw×ih framebuffer sub-rect.
  if (!state.sampleGpuCanvas) {
    state.sampleGpuCanvas = document.createElement('canvas');
    state.sampleGpuCtx = state.sampleGpuCanvas.getContext('2d');
  }
  const gpuCanvas = state.sampleGpuCanvas;
  const gpuCtx = state.sampleGpuCtx as CanvasRenderingContext2D;
  if (gpuCanvas.width !== maskSize || gpuCanvas.height !== maskSize) {
    gpuCanvas.width = maskSize;
    gpuCanvas.height = maskSize;
  }
  gpuCtx.clearRect(0, 0, maskSize, maskSize);
  gpuCtx.drawImage(s.glCanvas, 0, sy, iw, ih, 0, 0, maskSize, maskSize);
  scratchCtx.clearRect(0, 0, maskSize, maskSize);
  scratchCtx.drawImage(gpuCanvas, 0, 0);
  // Restore uniforms; the next instance / tick re-uploads its own values
  // before rendering so we don't need to re-render the GL canvas here.
  s.uniforms.u_dotMode.value = origDotMode;
  s.uniforms.u_fillOpacity.value = origFillOpacity;
  // Hold the latest ImageData on the state so the typed array isn't
  // immediately collected — keeps the buffer alive for the rest of the
  // current frame's mask paint without depending on JS engine GC timing.
  // (Canvas 2D's `getImageData` has no zero-alloc variant, so we can't
  // truly pool here; this just minimises pressure for the active call.)
  state.sampleImgData = scratchCtx.getImageData(0, 0, maskSize, maskSize);
  state.sampleDataCache = state.sampleImgData.data;
  return state.sampleDataCache;
}

function ensureScratch(state: RevealInternals, maskSize: number): void {
  if (!state.sampleCanvas) {
    state.sampleCanvas = document.createElement('canvas');
    state.sampleCtx = state.sampleCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (state.sampleCanvas.width !== maskSize || state.sampleCanvas.height !== maskSize) {
    state.sampleCanvas.width = maskSize;
    state.sampleCanvas.height = maskSize;
    state.sampleImgData = null;
    state.sampleDataCache = null;
    state.sampleFrameCounter = 0;
  }
  if (!state.maskGrad) {
    state.maskGrad = document.createElement('canvas');
    state.maskGradCtx = state.maskGrad.getContext('2d');
  }
  if (state.maskGrad.width !== maskSize || state.maskGrad.height !== maskSize) {
    state.maskGrad.width = maskSize;
    state.maskGrad.height = maskSize;
    state.maskImgData = null;
  }
  if (!state.maskImgData && state.maskGradCtx) {
    // Pool the mask-gradient buffer and only resize when mask resolution changes.
    // The original code called `createImageData(MASK_SIZE, MASK_SIZE)` every frame,
    // allocating 40 KB per card per frame.
    state.maskImgData = state.maskGradCtx.createImageData(maskSize, maskSize);
  }
}

function paintMaskedFrame(
  state: RevealInternals,
  s: SharedRenderer,
  inst: Instance,
  ctx: CanvasRenderingContext2D
): void {
  if (!state.image) return;
  const preset = inst.preset;
  // Resize visible canvas to match shader canvas pixel size.
  const targetW = inst.canvas.width;
  const targetH = inst.canvas.height;
  if (ctx.canvas.width !== targetW || ctx.canvas.height !== targetH) {
    ctx.canvas.width = targetW;
    ctx.canvas.height = targetH;
  }
  ctx.clearRect(0, 0, targetW, targetH);

  const { duration, easingKey } = getActiveRevealTiming(preset);
  const elapsed = (performance.now() - state.revealStartMs) / 1000;
  const progress = Math.min(elapsed / duration, 1);
  const eased = ease(easingKey, progress);

  // Cover-fit crop (CSS object-fit: cover) — preserves image aspect ratio,
  // centre-crops the overflowing axis. Never squashes the image.
  const img = state.image;
  const { sx, sy, sw, sh } = computeCoverSourceRect(img, targetW, targetH);

  // CSS blur fade
  const maxBlur = preset.revealConfig.blur;
  if (progress < 1 && maxBlur > 0) {
    const b = maxBlur * (1 - eased);
    ctx.canvas.style.filter = b > 0.1 ? `blur(${b.toFixed(1)}px)` : 'none';
  } else {
    ctx.canvas.style.filter = 'none';
  }

  if (progress >= 1) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(getCoverBitmap(state, 'a', img, targetW, targetH), 0, 0);
    return;
  }

  const maskSize = getMaskSize(preset);
  ensureScratch(state, maskSize);
  const sampleCtx = state.sampleCtx as CanvasRenderingContext2D;
  const maskGrad = state.maskGrad as HTMLCanvasElement;
  const maskGradCtx = state.maskGradCtx as CanvasRenderingContext2D;

  const maskShape = preset.revealConfig.maskShape;
  const softBand = preset.revealConfig.softness;
  const useShader = maskShape.startsWith('shader');

  let sampleData: Uint8ClampedArray | null = null;
  let targetColor: [number, number, number] | null = null;
  let highlightColors: Array<[number, number, number]> | null = null;

  if (useShader) {
    // Throttle the shader re-sample to every 2nd reveal frame. The shader's
    // colour field drifts at speed 0.3-0.9 rad/s and the mask's soft-band
    // threshold (~0.07) easily absorbs a 100-200 ms staleness in the sample
    // — far below the perceptual flicker threshold — while halving both the
    // extra `renderer.render()` calls and the `getImageData` allocations.
    // Frame 0 always samples so the very first reveal frame is fresh.
    const counter = state.sampleFrameCounter++;
    const shouldSample = state.sampleDataCache == null || (counter & 1) === 0;
    if (shouldSample) {
      sampleData = sampleShaderField(state, s, inst, sampleCtx, maskSize);
    } else {
      sampleData = state.sampleDataCache;
    }
    const colorMap: Record<string, number> = {
      shaderColor1: 0,
      shaderColor2: 1,
      shaderColor3: 2,
      shaderColor4: 3,
      shaderColor5: 4
    };
    if (colorMap[maskShape] != null) {
      targetColor = effectivePaletteColor(inst, colorMap[maskShape]);
    }
    if (maskShape === 'shaderHighlight') {
      // `effectiveCardBg` may return any CSS colour the consumer passed via
      // the `cardBg` prop (rgba, hsl, named, …). parseCssColor handles all
      // of it; alpha is dropped so the proximity test below stays in RGB
      // space against the same opaque tint the shader uniform sees.
      const bg = parseCssColor(effectiveCardBg(inst));
      highlightColors = [];
      for (let i = 0; i < 5; i++) {
        // Use the effective (card-linked-remapped) colour so any swatch that
        // followed an overridden card bg is correctly excluded here (it now
        // equals the bg, so distC ≈ 0) instead of lingering as a highlight.
        const c = effectivePaletteColor(inst, i);
        const dr = c[0] - bg[0];
        const dg = c[1] - bg[1];
        const db = c[2] - bg[2];
        const distC = Math.sqrt(dr * dr + dg * dg + db * db);
        if (distC > 0.15) highlightColors.push(c);
      }
      if (highlightColors.length === 0) highlightColors = [effectivePaletteColor(inst, 0)];
    }
  }

  const threshold = 1 - eased * (1 + softBand);
  const isGradientSweep = maskShape === 'gradientSweep';
  let gsW = 0;
  let gsPos = 0;
  let gsGrid = 2;
  // Per-cell flicker on the mask's transition edge: cells mid-transition pop
  // in and out with the shader's flicker clock/hash, so the image
  // materializes cell-by-cell instead of wiping in cleanly. Shared by EVERY
  // mask shape (gradientSweep band or shader-sampled masks like the pixel
  // presets') and driven by `preset.flicker`.
  const gsAmp = preset.flicker ?? 0;
  let gsTable: Float32Array | null = null;
  // Also exposed for the pixel-dissolve flicker below (paintPixelMasked),
  // which indexes cells by its own anisotropic grid rather than `gsTable`.
  let gsHashFn: ((i: number, s: number) => number) | null = null;
  let gsStep = 0;
  let gsStep1 = 0;
  let gsFz = 0;
  if (gsAmp > 0.003) {
    gsGrid = Math.max(2, Math.floor(6 + effectiveCellSize(preset.pixelConfig.cellSize, inst.pixelScale) * 74));
    // Clamp the flicker clock to at least the Sweep Gradient preset's
    // cadence (speed ~2) so slower presets like Pixel Mechanic (speed ~0.6)
    // still re-roll their cells fast enough to read as "generating".
    const gsT = inst.accumulatedTime * Math.max(preset.speed, 2) * 1.6;
    // Wrap the stepped clock (mirrors the shader's mod-1024 wrap) so the
    // hash inputs stay small however long the session has been running,
    // and so the mask flicker stays phase-aligned with the shader's.
    const rawStep = Math.floor(gsT);
    gsStep = rawStep % 1024;
    gsStep1 = (gsStep + 1) % 1024;
    gsFz = gsT - rawStep;
    gsFz = gsFz * gsFz * (3 - 2 * gsFz);
    const gsHash = (i: number, s: number): number => {
      const x = Math.sin(i * 127.1 + s * 17.23) * 43758.5453;
      return x - Math.floor(x);
    };
    gsHashFn = gsHash;
    // Precompute the per-cell flicker offsets ONCE per frame (gsGrid² cells,
    // typically ~500) instead of hashing per mask pixel (maskSize² pixels ×
    // 2 sin calls ≈ 8k/frame). The pixel loop just indexes this table and
    // scales by its edge factor — output is bit-identical to the inline
    // version. The buffer is pooled on the reveal state and only
    // reallocated when the cell grid size changes.
    const cellCount = gsGrid * gsGrid;
    if (!state.gsFlickerTable || state.gsFlickerTable.length !== cellCount) {
      state.gsFlickerTable = new Float32Array(cellCount);
    }
    gsTable = state.gsFlickerTable;
    for (let i = 0; i < cellCount; i++) {
      const rnd = gsHash(i, gsStep) * (1 - gsFz) + gsHash(i, gsStep1) * gsFz;
      gsTable[i] = (rnd - 0.5) * gsAmp * 1.6;
    }
  }
  if (isGradientSweep) {
    gsW = 0.9 / Math.max(preset.scale, 0.25);
    gsPos = -gsW + eased * (1 + 2 * gsW);
  }

  // Reuse the pooled buffer initialised by ensureScratch above.
  const maskImgData = state.maskImgData as ImageData;
  const md = maskImgData.data;
  for (let r = 0; r < maskSize; r++) {
    for (let c = 0; c < maskSize; c++) {
      let val: number;
      if (useShader && sampleData) {
        const i = (r * maskSize + c) * 4;
        const pr = sampleData[i] / 255;
        const pg = sampleData[i + 1] / 255;
        const pb = sampleData[i + 2] / 255;
        if (highlightColors) {
          let maxProx = 0;
          for (const hc of highlightColors) {
            const dr = pr - hc[0];
            const dg = pg - hc[1];
            const db = pb - hc[2];
            const prox = Math.exp(-10 * (dr * dr + dg * dg + db * db));
            if (prox > maxProx) maxProx = prox;
          }
          val = maxProx;
        } else if (targetColor) {
          const dr = pr - targetColor[0];
          const dg = pg - targetColor[1];
          const db = pb - targetColor[2];
          val = Math.exp(-8 * (dr * dr + dg * dg + db * db));
        } else {
          val = (sampleData[i] * 0.299 + sampleData[i + 1] * 0.587 + sampleData[i + 2] * 0.114) / 255;
        }
      } else if (!isGradientSweep) {
        val = getMaskValue(maskShape, r, c, maskSize);
      } else {
        val = 0;
      }
      let a: number;
      if (isGradientSweep) {
        const nx = c / (maskSize - 1);
        const ny = r / (maskSize - 1);
        const dd = (nx + ny) * 0.5;
        a = (gsPos + gsW - dd) / (2 * gsW);
      } else {
        a = (val - threshold) / softBand;
      }
      if (gsTable && a > -0.5 && a < 1.5) {
        // Edge-localized jitter: strongest mid-transition, zero in fully
        // hidden/revealed areas so the settled image never flickers.
        const at = a < 0 ? 0 : a > 1 ? 1 : a;
        const edge = at * (1 - at) * 4;
        if (edge > 0.001) {
          const nx = c / (maskSize - 1);
          const ny = r / (maskSize - 1);
          const ci = Math.floor(ny * gsGrid) * gsGrid + Math.floor(nx * gsGrid);
          a += gsTable[ci] * edge;
        }
      }
      if (a < 0) a = 0;
      else if (a > 1) a = 1;
      a = a * a * (3 - 2 * a);
      const idx = (r * maskSize + c) * 4;
      md[idx] = 255;
      md[idx + 1] = 255;
      md[idx + 2] = 255;
      md[idx + 3] = (a * 255 + 0.5) | 0;
    }
  }
  maskGradCtx.putImageData(maskImgData, 0, 0);

  if (preset.dotMode === 1) {
    paintPixelMasked(
      state,
      ctx,
      img,
      sx,
      sy,
      sw,
      sh,
      preset,
      elapsed,
      targetW,
      targetH,
      inst,
      // The gradientSweep mask already flickers along its band edge (via
      // gsTable above); skip the dissolve flicker there to avoid doubling up
      // and keep that preset's approved look unchanged.
      isGradientSweep ? 0 : gsAmp,
      gsHashFn,
      gsStep,
      gsStep1,
      gsFz
    );
  } else {
    if (preset.dotMode === 2) {
      // Dot presets reveal the image through TWO independent layers:
      //   1. A pixel-mode-style per-cell dropout: every cell starts as a
      //      chunky pixel (downsampled image) and individually transitions
      //      to smooth photo as `fadeT` crosses its random per-cell
      //      threshold. Driven by `pixDuration` / `pixEasing` so it feels
      //      identical to the pixel presets the user is familiar with.
      //   2. The shader-luminance mask (applied below) which gates which
      //      AREAS of the card are visible at all at any given moment —
      //      so the chunky pixels only appear inside the area the shader
      //      mask has currently uncovered, not across the whole card.
      //
      // Composite order inside this branch: smooth base + pixelated/dropped
      // overlay. The shader mask is applied via destination-in AFTER this
      // branch (see further down), cutting the combined image down to the
      // revealed area.
      //
      // PERF: this matches `paintPixelMasked` exactly — same per-frame
      // downsample to a small ~38x38 grid (browser-accelerated, ~0.3 ms),
      // same cached random drop pattern (one `Float32Array` per reveal),
      // same pooled `pixDropImgData` for the per-frame alpha update. Total
      // per-frame overhead is in line with pixel-mode presets, which we
      // already validated at ~4.4% CPU in the prior perf pass.
      // Cell size is sourced from `pixelConfig.cellSize` (NOT `dotConfig`)
      // so it matches the pixel-mode pipeline byte-for-byte and produces
      // visibly chunky blocks. dot-mode presets' `pixelConfig` is otherwise
      // unused by the shader (which switches to `dotConfig` when
      // `dotMode === 2` — see `renderer.ts` mosaic switch), so the preset
      // is free to tune this field purely for the reveal look.
      paintPixelatedDropLayer(state, ctx, img, sx, sy, sw, sh, effectiveCellSize(preset.pixelConfig.cellSize, inst.pixelScale), elapsed, preset.revealConfig.pixDuration, preset.revealConfig.pixEasing, inst, targetW, targetH);
    } else {
      // Non-dot, non-pixel modes (custom presets) keep the original smooth
      // photo for the revealed region.
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(getCoverBitmap(state, 'a', img, targetW, targetH), 0, 0);
    }
    ctx.globalCompositeOperation = 'destination-in';
    // Mask upscale strategy depends on the sampling source:
    //   - Dots presets (dotMode === 2) sample from the PIXEL-RENDERED shader,
    //     so `maskGrad` is naturally cell-stepped. Upscaling 64 -> ~280 with
    //     smoothing on blurs those cells into a mushy gradient (the very
    //     issue introduced when MASK_SIZE shrank from 100 to 64 in the perf
    //     pass). Switch to nearest-neighbour so the cells stay crisp — that
    //     also matches the dotty character of these presets.
    //   - Pixel presets (dotMode === 1) take the paintPixelMasked branch above.
    //   - Geometric masks (useShader === false) compute analytical smooth
    //     values, so smoothing stays on for them even in dot mode.
    const sharpMask = preset.dotMode === 2 && useShader;
    if (sharpMask) ctx.imageSmoothingEnabled = false;
    ctx.drawImage(maskGrad, 0, 0, targetW, targetH);
    if (sharpMask) ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = 'source-over';
  }
}

/** Paints the pixel-mode-style "downsampled image with per-cell random
 *  drop-out" effect at an arbitrary cell-size scale, then leaves the
 *  caller to compose any additional masks on top. Used by dot-mode
 *  reveal so the gradual pixel-to-smooth transition matches the pixel
 *  presets — but at the dot grid's denser cell count, and with the shader
 *  mask applied AFTER this function returns to gate visible areas.
 *
 *  Shares scratch state (`pixCanvas`, `pixDrop`, `pixDropPattern`) with
 *  `paintPixelMasked`; safe because `preset.dotMode` is fixed per-instance,
 *  so only one of the two paths ever touches these for a given reveal state. */
function paintPixelatedDropLayer(
  state: RevealInternals,
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  cellSize: number,
  elapsed: number,
  pixDuration: number,
  pixEasing: EnginePresetMode['revealConfig']['pixEasing'],
  inst: Instance,
  targetW: number,
  targetH: number
): void {
  const baseCount = 6 + cellSize * 74;
  const cssW = Math.max(1, inst.cssWidth);
  const cssH = Math.max(1, inst.cssHeight);
  const gridX = Math.max(2, Math.floor((baseCount * cssW) / REVEAL_REF_DIM));
  const gridY = Math.max(2, Math.floor((baseCount * cssH) / REVEAL_REF_DIM));
  const cellCount = gridX * gridY;

  const pixDur = Math.max(0.05, pixDuration);
  const fadeRaw = Math.max(0, Math.min(1, elapsed / pixDur));
  const fadeT = ease(pixEasing, fadeRaw);

  if (!state.pixCanvas) {
    state.pixCanvas = document.createElement('canvas');
    state.pixCtx = state.pixCanvas.getContext('2d');
  }
  const pixCanvas = state.pixCanvas as HTMLCanvasElement;
  const pixCtx = state.pixCtx as CanvasRenderingContext2D;
  if (pixCanvas.width !== gridX || pixCanvas.height !== gridY) {
    pixCanvas.width = gridX;
    pixCanvas.height = gridY;
  }

  if (!state.pixDrop) {
    state.pixDrop = document.createElement('canvas');
    state.pixDropCtx = state.pixDrop.getContext('2d');
  }
  const pixDrop = state.pixDrop as HTMLCanvasElement;
  const pixDropCtx = state.pixDropCtx as CanvasRenderingContext2D;
  if (pixDrop.width !== gridX || pixDrop.height !== gridY) {
    pixDrop.width = gridX;
    pixDrop.height = gridY;
    state.pixDropImgData = pixDropCtx.createImageData(gridX, gridY);
    const dd0 = state.pixDropImgData.data;
    for (let i = 0; i < dd0.length; i += 4) {
      dd0[i] = 255;
      dd0[i + 1] = 255;
      dd0[i + 2] = 255;
    }
  }

  // Per-cell random drop thresholds — one Float32Array per reveal, reused
  // every frame. Keeps GC pressure flat over long auto-cycle sessions.
  const softBand = 0.07;
  const invBand2 = 1 / (2 * softBand);
  if (
    !state.pixDropPattern ||
    state.pixDropPatternW !== gridX ||
    state.pixDropPatternH !== gridY ||
    state.pixDropRevealStart !== state.revealStartMs
  ) {
    state.pixDropPattern = new Float32Array(cellCount);
    const lo = softBand;
    const span = 1 - 2 * softBand;
    for (let i = 0; i < state.pixDropPattern.length; i++) {
      state.pixDropPattern[i] = lo + Math.random() * span;
    }
    state.pixDropPatternW = gridX;
    state.pixDropPatternH = gridY;
    state.pixDropRevealStart = state.revealStartMs;
  }
  const dd = (state.pixDropImgData as ImageData).data;
  const pattern = state.pixDropPattern;
  for (let i = 0; i < pattern.length; i++) {
    const dt = pattern[i];
    let a = 0.5 + (dt - fadeT) * invBand2;
    if (a < 0) a = 0;
    else if (a > 1) a = 1;
    dd[i * 4 + 3] = (a * 255 + 0.5) | 0;
  }
  pixDropCtx.putImageData(state.pixDropImgData as ImageData, 0, 0);

  // 1. Downsample the source image into the pixelated grid (per frame —
  //    the drop mask below is destructive, so we can't cache between frames
  //    without an extra work canvas. The downsample is GPU-accelerated on
  //    a ~38x38 target so the cost is in the 0.1-0.3 ms range).
  pixCtx.globalCompositeOperation = 'source-over';
  pixCtx.clearRect(0, 0, gridX, gridY);
  pixCtx.imageSmoothingEnabled = true;
  pixCtx.imageSmoothingQuality = 'high';
  pixCtx.drawImage(getCoverBitmap(state, 'a', img, targetW, targetH), 0, 0, targetW, targetH, 0, 0, gridX, gridY);
  // 2. Drop cells whose random threshold has fallen below `fadeT` — those
  //    cells go transparent and the smooth base painted at step 3 shows
  //    through.
  pixCtx.globalCompositeOperation = 'destination-in';
  pixCtx.imageSmoothingEnabled = false;
  pixCtx.drawImage(pixDrop, 0, 0);
  pixCtx.globalCompositeOperation = 'source-over';

  // 3. Smooth full-res image as the base layer — visible wherever a cell
  //    has already dropped out.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(getCoverBitmap(state, 'a', img, targetW, targetH), 0, 0);
  // 4. Chunky pixelated cells (with drops applied) composited on top.
  //    Nearest-neighbour upscale keeps the dot grid blocks crisp.
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(pixCanvas, 0, 0, gridX, gridY, 0, 0, targetW, targetH);
  ctx.imageSmoothingEnabled = true;
}

function paintPixelMasked(
  state: RevealInternals,
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  preset: EnginePresetMode,
  elapsed: number,
  targetW: number,
  targetH: number,
  inst: Instance,
  flickerAmp: number,
  flickerHash: ((i: number, s: number) => number) | null,
  flickerStep: number,
  flickerStep1: number,
  flickerFz: number
): void {
  // Per-cell random dissolve mask (port of image.html lines 2598-2695), with
  // an anisotropic grid so cells are SQUARE in screen space — matches the
  // shader's `gridCounts(...)` so the pixel-mode dissolve and the underlying
  // pixel mosaic share the same cell grid.
  const cellSize = effectiveCellSize(preset.pixelConfig.cellSize, inst.pixelScale);
  const baseCount = 6 + cellSize * 74;
  const cssW = Math.max(1, inst.cssWidth);
  const cssH = Math.max(1, inst.cssHeight);
  const gridX = Math.max(2, Math.floor((baseCount * cssW) / REVEAL_REF_DIM));
  const gridY = Math.max(2, Math.floor((baseCount * cssH) / REVEAL_REF_DIM));
  const cellCount = gridX * gridY;

  const pixDur = Math.max(0.05, preset.revealConfig.pixDuration);
  const fadeRaw = Math.max(0, Math.min(1, elapsed / pixDur));
  const fadeT = ease(preset.revealConfig.pixEasing, fadeRaw);

  if (!state.pixCanvas) {
    state.pixCanvas = document.createElement('canvas');
    state.pixCtx = state.pixCanvas.getContext('2d');
  }
  const pixCanvas = state.pixCanvas as HTMLCanvasElement;
  const pixCtx = state.pixCtx as CanvasRenderingContext2D;
  if (pixCanvas.width !== gridX || pixCanvas.height !== gridY) {
    pixCanvas.width = gridX;
    pixCanvas.height = gridY;
  }
  if (!state.pixDrop) {
    state.pixDrop = document.createElement('canvas');
    state.pixDropCtx = state.pixDrop.getContext('2d');
  }
  const pixDrop = state.pixDrop as HTMLCanvasElement;
  const pixDropCtx = state.pixDropCtx as CanvasRenderingContext2D;
  if (pixDrop.width !== gridX || pixDrop.height !== gridY) {
    pixDrop.width = gridX;
    pixDrop.height = gridY;
    state.pixDropImgData = pixDropCtx.createImageData(gridX, gridY);
    const dd0 = state.pixDropImgData.data;
    for (let i = 0; i < dd0.length; i += 4) {
      dd0[i] = 255;
      dd0[i + 1] = 255;
      dd0[i + 2] = 255;
    }
  }

  const softBand = 0.07;
  const invBand2 = 1 / (2 * softBand);
  if (
    !state.pixDropPattern ||
    state.pixDropPatternW !== gridX ||
    state.pixDropPatternH !== gridY ||
    state.pixDropRevealStart !== state.revealStartMs
  ) {
    state.pixDropPattern = new Float32Array(cellCount);
    const lo = softBand;
    const span = 1 - 2 * softBand;
    for (let i = 0; i < state.pixDropPattern.length; i++) {
      state.pixDropPattern[i] = lo + Math.random() * span;
    }
    state.pixDropPatternW = gridX;
    state.pixDropPatternH = gridY;
    state.pixDropRevealStart = state.revealStartMs;
  }
  const dd = (state.pixDropImgData as ImageData).data;
  const pattern = state.pixDropPattern;
  const useFlicker = flickerAmp > 0.003 && flickerHash != null;
  for (let i = 0; i < pattern.length; i++) {
    const dt = pattern[i];
    let a = 0.5 + (dt - fadeT) * invBand2;
    if (a < 0) a = 0;
    else if (a > 1) a = 1;
    // Same flicker as the Gradient Sweep reveal mask: cells whose drop time
    // is near the current dissolve position pop in and out (driven by
    // `preset.flicker`) instead of fading monotonically, so pixel presets
    // get the "generating" look during the reveal too.
    if (useFlicker) {
      const prox = 1 - Math.abs(fadeT - dt) * 6.25;
      if (prox > 0) {
        const rnd = flickerHash!(i, flickerStep) * (1 - flickerFz) + flickerHash!(i, flickerStep1) * flickerFz;
        a += (rnd - 0.5) * flickerAmp * 1.6 * prox;
        if (a < 0) a = 0;
        else if (a > 1) a = 1;
      }
    }
    dd[i * 4 + 3] = (a * 255 + 0.5) | 0;
  }
  pixDropCtx.putImageData(state.pixDropImgData as ImageData, 0, 0);

  // 1. Downsample image into pixCanvas at the anisotropic grid (cover-fit
  //    crop already chosen by caller, aspect preserved).
  //    Mirrors image.html step 1 (line 2667).
  pixCtx.globalCompositeOperation = 'source-over';
  pixCtx.clearRect(0, 0, gridX, gridY);
  pixCtx.imageSmoothingEnabled = true;
  pixCtx.imageSmoothingQuality = 'high';
  pixCtx.drawImage(getCoverBitmap(state, 'a', img, targetW, targetH), 0, 0, targetW, targetH, 0, 0, gridX, gridY);
  // 2. Apply per-cell drop mask so dropped cells go transparent.
  //    Mirrors image.html step 2 (line 2671).
  pixCtx.globalCompositeOperation = 'destination-in';
  pixCtx.imageSmoothingEnabled = false;
  pixCtx.drawImage(pixDrop, 0, 0);
  pixCtx.globalCompositeOperation = 'source-over';

  // 3. Draw smooth image as the base layer — shows through any cell that
  //    has already dropped out.
  //    Mirrors image.html step 3 (line 2678).
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(getCoverBitmap(state, 'a', img, targetW, targetH), 0, 0);
  // 4. Composite the still-present pixelated cells on top with crisp blocks
  //    (nearest-neighbour upscale → chunky cells).
  //    Mirrors image.html step 4 (line 2681).
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(pixCanvas, 0, 0, gridX, gridY, 0, 0, targetW, targetH);
  ctx.imageSmoothingEnabled = true;

  // 5. Quantise the reveal mask to the same anisotropic gridX×gridY so the
  //    mask shape's edge follows the cell boundaries — i.e. the reveal
  //    silhouette is cell-stepped, aligned with the shader's pixel mosaic.
  //    This is what gives the pixel presets (Chromium Flow / Nebula) their
  //    distinctive blocky reveal edge in image.html (step 5, lines 2686-2695).
  //    The pixCanvas scratch is reused: it currently holds the per-cell
  //    dissolved image from steps 1-2, but we overwrite it with the
  //    downsampled maskGrad here before using it as a destination-in clip.
  pixCtx.globalCompositeOperation = 'source-over';
  pixCtx.clearRect(0, 0, gridX, gridY);
  pixCtx.imageSmoothingEnabled = true;
  pixCtx.imageSmoothingQuality = 'high';
  pixCtx.drawImage(state.maskGrad as HTMLCanvasElement, 0, 0, gridX, gridY);
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(pixCanvas, 0, 0, gridX, gridY, 0, 0, targetW, targetH);
  ctx.imageSmoothingEnabled = true;
  ctx.globalCompositeOperation = 'source-over';
}

/** Boil ("regenerating") tuning. The boil opens with PIXELATE-IN: the sharp
 *  held image turns chunky cell-by-cell (each cell pops to its mosaic block
 *  with the flicker clock, over the smooth photo base) — no instant snap.
 *  Then the churn ramps in over BOIL_RAMP_S seconds, settling at BOIL_LEVEL
 *  dropped fraction. Which cells drop is driven primarily by the LIVE
 *  shader colour field, so the churn moves in the same organic waves as the
 *  img-fx animation. */
const BOIL_PIX_IN_MS = 800;
/** How early the churn ramp starts before PIXELATE-IN completes — the tail
 *  of the image pixelation overlaps the head of the shader churn, so the
 *  two pixelation phases read as one continuous motion. */
const BOIL_PIX_OVERLAP_MS = 300;
const BOIL_RAMP_S = 1.0;
const BOIL_LEVEL = 0.5;
/** Half-width of the alpha soft band — small so cells read as chunky
 *  blocks that flip on/off rather than a translucent blend. */
const BOIL_BAND = 0.03;
/** How much of each cell's keep/drop threshold comes from the animated
 *  shader field vs. the persistent random pattern. The field contributes the
 *  organic wave structure; the flicker jitter (below) contributes the
 *  per-cell popping — mirroring how the shader itself pairs its slow noise
 *  field with u_flicker's cell jitter. */
const BOIL_FIELD_W = 0.6;
/** Reveal handoff out of the boil (~2 s total), one continuous pipeline:
 *    1. BLEND   — the churning cells smoothly morph their colours from the
 *                 outgoing image to the incoming one (the mosaic downsample
 *                 cross-fades the two sources) while the churn keeps moving.
 *    2. RESOLVE — runs the reveal and the de-pixelation IN PARALLEL: the
 *                 smooth new image fades in underneath (through the churn
 *                 gaps) while the chunky cells melt into it with the pixel
 *                 reveal's per-cell dropout + flicker.
 *  No mask reset, no coverage jump — every stage starts where the previous
 *  one ended. */
const BOIL_BLEND_MS = 800;
/** Smooth-image base fade-in at the start of RESOLVE. */
const BOIL_BASE_MS = 400;
/** Per-cell chunky-to-smooth melt duration (whole RESOLVE stage). */
const BOIL_SHARPEN_MS = 1200;

/** Sustained "generating" churn (phase `boil`): the held image is broken
 *  into the SAME anisotropic cell grid as the pixel reveal dissolve. Each
 *  cell's keep/drop threshold blends the LIVE shader field luminance at the
 *  cell (re-sampled every other frame, so the churn tracks the img-fx
 *  animation's moving waves) with a persistent random pattern, plus the
 *  reveal mask's flicker-clock jitter for the popping cadence. Dropped
 *  cells are fully transparent so the shader plays through the gaps.
 *  When a reveal is pending, runs the BLEND → RESOLVE handoff above and
 *  finishes by switching the state to `hold` + firing onRevealComplete. */
function paintBoilFrame(
  state: RevealInternals,
  s: SharedRenderer,
  inst: Instance,
  ctx: CanvasRenderingContext2D,
  shaderCanvas: HTMLCanvasElement,
  nowMs: number
): void {
  const img = state.image;
  if (!img) return;
  const preset = inst.preset;
  const targetW = inst.canvas.width;
  const targetH = inst.canvas.height;
  if (ctx.canvas.width !== targetW || ctx.canvas.height !== targetH) {
    ctx.canvas.width = targetW;
    ctx.canvas.height = targetH;
  }
  ctx.canvas.style.filter = 'none';

  // Same grid math as paintPixelMasked so boil cells align with the shader
  // mosaic and the reveal dissolve.
  const cellSize = effectiveCellSize(preset.pixelConfig.cellSize, inst.pixelScale);
  const baseCount = 6 + cellSize * 74;
  const cssW = Math.max(1, inst.cssWidth);
  const cssH = Math.max(1, inst.cssHeight);
  const gridX = Math.max(2, Math.floor((baseCount * cssW) / REVEAL_REF_DIM));
  const gridY = Math.max(2, Math.floor((baseCount * cssH) / REVEAL_REF_DIM));
  const cellCount = gridX * gridY;

  // Handoff timeline (only ticks once a reveal is pending).
  const pending = state.pendingReveal;
  const hand = pending && state.boilHandoffStartMs > 0 ? nowMs - state.boilHandoffStartMs : -1;
  const smooth = (t: number): number => t * t * (3 - 2 * t);
  const blendT = hand < 0 ? 0 : smooth(Math.min(1, hand / BOIL_BLEND_MS));
  // RESOLVE stage clock: smooth base fades in over BOIL_BASE_MS while the
  // per-cell melt runs the full BOIL_SHARPEN_MS — in parallel, so the
  // de-pixelation starts the moment the new image begins to show.
  const rt = hand < 0 ? -1 : hand - BOIL_BLEND_MS;
  const baseT = rt <= 0 ? 0 : smooth(Math.min(1, rt / BOIL_BASE_MS));
  const sharpRaw = rt <= 0 ? 0 : Math.min(1, rt / BOIL_SHARPEN_MS);
  const resolving = pending != null && rt > 0;

  // PIXELATE-IN: over the first BOIL_PIX_IN_MS the sharp image turns chunky
  // cell-by-cell (flicker-clocked), drawn over the smooth photo base — so
  // the pixelation materialises instead of snapping in one frame. The churn
  // ramp starts only after it, when the mosaic fully covers the card.
  const sinceStart = nowMs - state.boilStartMs;
  const inRaw = Math.min(1, sinceStart / BOIL_PIX_IN_MS);
  const inT = inRaw * inRaw * (3 - 2 * inRaw);
  const pixelatingIn = inRaw < 1;
  // The smooth-photo base fades out across the overlap window, so churn
  // holes opening during the overlap cross-fade from photo to shader
  // instead of popping when the base is dropped.
  const baseOutRaw = Math.min(
    1,
    Math.max(0, sinceStart - (BOIL_PIX_IN_MS - BOIL_PIX_OVERLAP_MS)) / BOIL_PIX_OVERLAP_MS
  );
  const pixInBaseAlpha = 1 - baseOutRaw * baseOutRaw * (3 - 2 * baseOutRaw);

  // Ramp-in: the pixelated image dissolves into the churn while the shader
  // fades up through the dropped cells. Starts BOIL_PIX_OVERLAP_MS before
  // pixelate-in ends so the two phases overlap. During RESOLVE the shader
  // stays put — the smooth base drawn into the overlay at `baseT` alpha is
  // what cross-fades it away.
  const rampRaw = Math.min(
    1,
    Math.max(0, sinceStart - (BOIL_PIX_IN_MS - BOIL_PIX_OVERLAP_MS)) / (BOIL_RAMP_S * 1000)
  );
  const ramp = rampRaw * rampRaw * (3 - 2 * rampRaw);
  const boilT = ramp * BOIL_LEVEL;
  shaderCanvas.style.opacity = String(ramp);

  // Shared scratch with the reveal pixel path (safe: only one phase runs at
  // a time per reveal state).
  if (!state.pixCanvas) {
    state.pixCanvas = document.createElement('canvas');
    state.pixCtx = state.pixCanvas.getContext('2d');
  }
  const pixCanvas = state.pixCanvas as HTMLCanvasElement;
  const pixCtx = state.pixCtx as CanvasRenderingContext2D;
  if (pixCanvas.width !== gridX || pixCanvas.height !== gridY) {
    pixCanvas.width = gridX;
    pixCanvas.height = gridY;
  }
  if (!state.pixDrop) {
    state.pixDrop = document.createElement('canvas');
    state.pixDropCtx = state.pixDrop.getContext('2d');
  }
  const pixDrop = state.pixDrop as HTMLCanvasElement;
  const pixDropCtx = state.pixDropCtx as CanvasRenderingContext2D;
  if (pixDrop.width !== gridX || pixDrop.height !== gridY || !state.pixDropImgData) {
    pixDrop.width = gridX;
    pixDrop.height = gridY;
    state.pixDropImgData = pixDropCtx.createImageData(gridX, gridY);
    const dd0 = state.pixDropImgData.data;
    for (let i = 0; i < dd0.length; i += 4) {
      dd0[i] = 255;
      dd0[i + 1] = 255;
      dd0[i + 2] = 255;
    }
  }

  // Persistent per-cell thresholds: seeded once per boil so settled cells
  // stay settled and only band cells churn.
  if (!state.boilPattern || state.boilPatternW !== gridX || state.boilPatternH !== gridY) {
    state.boilPattern = new Float32Array(cellCount);
    for (let i = 0; i < cellCount; i++) state.boilPattern[i] = Math.random();
    state.boilPatternW = gridX;
    state.boilPatternH = gridY;
  }

  // Same flicker clock/hash as the reveal mask; clamped like there so slow
  // presets still churn at a "generating" cadence. A floor on the amplitude
  // keeps the boil alive even for presets authored with flicker: 0.
  const amp = Math.max(preset.flicker ?? 0, 0.5);
  const gsT = inst.accumulatedTime * Math.max(preset.speed, 2) * 1.6;
  const rawStep = Math.floor(gsT);
  const step = rawStep % 1024;
  const step1 = (step + 1) % 1024;
  let fz = gsT - rawStep;
  fz = fz * fz * (3 - 2 * fz);
  const hash = (i: number, st: number): number => {
    const x = Math.sin(i * 127.1 + st * 17.23) * 43758.5453;
    return x - Math.floor(x);
  };

  const dd = (state.pixDropImgData as ImageData).data;
  const pattern = state.boilPattern;

  // Live shader field, sampled into the small mask buffer exactly like the
  // reveal's shader-driven masks. Per-cell luminance of this field is what
  // makes the churn follow the effect's animation instead of reading as
  // static. Throttled to every 3rd frame (vs every 2nd for reveal masks):
  // profiling shows the GPU→CPU `getImageData` readback is the boil's
  // dominant JS cost, and the churn tolerates a slightly staler field than
  // a reveal mask edge — the per-frame flicker jitter (below) keeps the
  // popping cadence at full rate, while the wave structure drifts slowly
  // (speed 0.3–2 rad/s), so a ~300 ms-stale field is imperceptible.
  const maskSize = getMaskSize(preset);
  ensureScratch(state, maskSize);
  const counter = state.sampleFrameCounter++;
  const shouldSample = state.sampleDataCache == null || counter % 3 === 0;
  const fieldStale = !state.boilField || state.boilField.length !== cellCount;
  const sampleData = shouldSample
    ? sampleShaderField(state, s, inst, state.sampleCtx as CanvasRenderingContext2D, maskSize)
    : (state.sampleDataCache as Uint8ClampedArray);

  // Per-cell field luminance is derived from the sample buffer, so it only
  // changes when a fresh sample was taken (or the grid was resized). Values
  // are stored PRE-NORMALISED (0..1 across the frame's min/max) so the
  // per-frame threshold loop below is a plain array read. Normalising keeps
  // every preset's field spanning the full threshold range — otherwise
  // mostly-bright/mostly-dark palettes would pin the churn.
  if (shouldSample || fieldStale) {
    if (fieldStale) state.boilField = new Float32Array(cellCount);
    const f = state.boilField as Float32Array;
    let fMin = 1;
    let fMax = 0;
    for (let cy = 0; cy < gridY; cy++) {
      const my = Math.min(maskSize - 1, ((cy + 0.5) * maskSize / gridY) | 0);
      for (let cx = 0; cx < gridX; cx++) {
        const mx = Math.min(maskSize - 1, ((cx + 0.5) * maskSize / gridX) | 0);
        const si = (my * maskSize + mx) * 4;
        const lum =
          (sampleData[si] * 0.299 + sampleData[si + 1] * 0.587 + sampleData[si + 2] * 0.114) / 255;
        f[cy * gridX + cx] = lum;
        if (lum < fMin) fMin = lum;
        if (lum > fMax) fMax = lum;
      }
    }
    const fSpan = fMax - fMin > 0.001 ? 1 / (fMax - fMin) : 0;
    for (let i = 0; i < cellCount; i++) {
      f[i] = fSpan > 0 ? (f[i] - fMin) * fSpan : 0.5;
    }
  }
  const field = state.boilField as Float32Array;

  const invBand2 = 1 / (2 * BOIL_BAND);
  // Flicker jitter span on top of the field: the raw field sample excludes
  // the shader's own u_flicker cell jitter (it samples dotMode 0), so this
  // reinstates that popping cadence — cells along the field's wave edges
  // flip crisply on every flicker-clock step. Damped as the melt progresses
  // so the resolving image settles.
  const churn = amp * 0.6 * (1 - sharpRaw);
  const patW = 1 - BOIL_FIELD_W;
  // RESOLVE melt: per-cell chunky-to-smooth dropout, same mechanics as
  // paintPixelMasked, reusing the boil pattern as the drop order. Runs in
  // parallel with the churn — a cell is visible only while BOTH keep it.
  const fadeT = resolving ? ease(preset.revealConfig.pixEasing, sharpRaw) : 0;
  const softBand = 0.07;
  const invBandS = 1 / (2 * softBand);
  const sAmp = preset.flicker ?? 0;
  for (let i = 0; i < cellCount; i++) {
    const rnd = hash(i, step) * (1 - fz) + hash(i, step1) * fz;
    // Threshold = animated field (waves) + stable random grain + flicker pop.
    const dtEff = field[i] * BOIL_FIELD_W + pattern[i] * patW + (rnd - 0.5) * churn;
    let a = 0.5 + (dtEff - boilT) * invBand2;
    if (a < 0) a = 0;
    else if (a > 1) a = 1;
    if (pixelatingIn) {
      // PIXELATE-IN appear mask: a cell turns chunky once `inT` passes its
      // threshold; cells riding the edge pop in/out with the flicker clock,
      // flashing between the smooth base and their mosaic block. Reverse of
      // the RESOLVE melt below, same soft band and jitter mechanics.
      const dt = pattern[i];
      let aIn = 0.5 + (inT - dt) * invBandS;
      if (aIn < 0) aIn = 0;
      else if (aIn > 1) aIn = 1;
      const prox = 1 - Math.abs(inT - dt) * 6.25;
      if (prox > 0) {
        aIn += (rnd - 0.5) * amp * 1.6 * prox;
        if (aIn < 0) aIn = 0;
        else if (aIn > 1) aIn = 1;
      }
      if (aIn < a) a = aIn;
    }
    if (resolving) {
      const dt = pattern[i];
      let a2 = 0.5 + (dt - fadeT) * invBandS;
      if (a2 < 0) a2 = 0;
      else if (a2 > 1) a2 = 1;
      if (sAmp > 0.003) {
        const prox = 1 - Math.abs(fadeT - dt) * 6.25;
        if (prox > 0) {
          a2 += (rnd - 0.5) * sAmp * 1.6 * prox;
          if (a2 < 0) a2 = 0;
          else if (a2 > 1) a2 = 1;
        }
      }
      if (a2 < a) a = a2;
    }
    dd[i * 4 + 3] = (a * 255 + 0.5) | 0;
  }
  pixDropCtx.putImageData(state.pixDropImgData as ImageData, 0, 0);

  // Mosaic source: the outgoing image, cross-faded toward the incoming one
  // during BLEND. The blend happens in the downsampled grid BEFORE the
  // nearest-neighbour upscale, so each chunky cell's colour morphs smoothly
  // to the new image's colour at that spot. No smooth base during the churn
  // stages — dropped cells stay transparent so the shader shows through.
  const { sx, sy, sw, sh } = computeCoverSourceRect(img, targetW, targetH);
  pixCtx.globalCompositeOperation = 'source-over';
  pixCtx.clearRect(0, 0, gridX, gridY);
  pixCtx.imageSmoothingEnabled = true;
  pixCtx.imageSmoothingQuality = 'high';
  if (blendT < 1) {
    pixCtx.drawImage(getCoverBitmap(state, 'a', img, targetW, targetH), 0, 0, targetW, targetH, 0, 0, gridX, gridY);
  }
  if (pending && blendT > 0) {
    pixCtx.globalAlpha = blendT;
    pixCtx.drawImage(getCoverBitmap(state, 'b', pending.image, targetW, targetH), 0, 0, targetW, targetH, 0, 0, gridX, gridY);
    pixCtx.globalAlpha = 1;
  }
  pixCtx.globalCompositeOperation = 'destination-in';
  pixCtx.imageSmoothingEnabled = false;
  pixCtx.drawImage(pixDrop, 0, 0);
  pixCtx.globalCompositeOperation = 'source-over';

  ctx.clearRect(0, 0, targetW, targetH);
  if (pixelatingIn && pixInBaseAlpha > 0) {
    // PIXELATE-IN base: the sharp outgoing photo stays underneath while the
    // chunky cells pop in over it — cells not yet (or flicker-momentarily
    // not) pixelated show the smooth image, so the transition materialises
    // instead of snapping. Fades out over the churn-overlap window so holes
    // opened by the early churn cross-fade from photo to shader.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = pixInBaseAlpha;
    ctx.drawImage(getCoverBitmap(state, 'a', img, targetW, targetH), 0, 0);
    ctx.globalAlpha = 1;
  } else if (resolving && pending && baseT > 0) {
    // Smooth base of the incoming image fades in underneath — visible
    // immediately through the churn gaps (cross-fading the shader away) and
    // wherever a chunky cell has already melted.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = baseT;
    ctx.drawImage(getCoverBitmap(state, 'b', pending.image, targetW, targetH), 0, 0);
    ctx.globalAlpha = 1;
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(pixCanvas, 0, 0, gridX, gridY, 0, 0, targetW, targetH);
  ctx.imageSmoothingEnabled = true;

  // Handoff complete: the new image is fully sharp. Settle into `hold`
  // exactly like a finished reveal.
  if (resolving && pending && sharpRaw >= 1 && baseT >= 1) {
    state.image = pending.image;
    state.pendingReveal = null;
    state.boilHandoffStartMs = 0;
    state.holdPaintedImg = null;
    state.phase = 'hold';
    shaderCanvas.style.opacity = '0';
    state.onRevealComplete?.();
  }
}

export interface CreateRevealOptions {
  /** The DOM canvas overlay (sibling of the shader canvas). */
  canvas: HTMLCanvasElement;
  cssWidth: number;
  cssHeight: number;
  /** Shader canvas — its opacity is driven by the reveal so the image
   *  cross-fades over it. */
  shaderCanvas: HTMLCanvasElement;
}

export function createReveal(opts: CreateRevealOptions): RevealState {
  const ctx = opts.canvas.getContext('2d');
  if (!ctx) throw new Error('img-fx: 2D context unavailable for reveal canvas');

  const state: RevealInternals = {
    active: false,
    phase: 'idle',
    revealStartMs: 0,
    hideStartMs: 0,
    hideDurationMs: 300,
    boilStartMs: 0,
    boilPattern: null,
    boilPatternW: 0,
    boilPatternH: 0,
    boilField: null,
    boilHandoffStartMs: 0,
    pendingReveal: null,
    image: null,
    cssWidth: opts.cssWidth,
    cssHeight: opts.cssHeight,
    sampleCanvas: null,
    sampleCtx: null,
    sampleImgData: null,
    sampleDataCache: null,
    sampleFrameCounter: 0,
    maskGrad: null,
    maskGradCtx: null,
    maskImgData: null,
    gsFlickerTable: null,
    pixCanvas: null,
    pixCtx: null,
    pixDrop: null,
    pixDropCtx: null,
    pixDropImgData: null,
    pixDropPattern: null,
    pixDropPatternW: 0,
    pixDropPatternH: 0,
    pixDropRevealStart: -1,
    coverA: null,
    coverB: null,
    holdPaintedImg: null,
    holdPaintedW: 0,
    holdPaintedH: 0,
    sampleGpuCanvas: null,
    sampleGpuCtx: null
  };

  const shaderCanvas = opts.shaderCanvas;

  /** Shared by `startReveal` and the boil-out completion path. */
  function beginReveal(revealOpts: RevealStartOptions): void {
    state.image = revealOpts.image;
    state.cssWidth = revealOpts.cssWidth;
    state.cssHeight = revealOpts.cssHeight;
    state.onRevealComplete = revealOpts.onRevealComplete;
    state.revealStartMs = performance.now();
    state.phase = 'reveal';
    state.active = true;
    state.boilHandoffStartMs = 0;
    state.pendingReveal = null;
    // Reset the sample throttle so the very first frame of this reveal
    // always does a fresh shader read; the cached buffer (if any) is from
    // a previous reveal/boil and would be visually misaligned.
    state.sampleFrameCounter = 0;
    state.sampleDataCache = null;
    state.holdPaintedImg = null;
    ctx!.canvas.style.opacity = '1';
  }

  const handle: RevealState = {
    canvas: opts.canvas,
    ctx,
    afterShaderFrame(s, inst, nowMs) {
      // Keep canvas dims in sync with the dynamic CSS dims.
      state.cssWidth = inst.cssWidth;
      state.cssHeight = inst.cssHeight;

      if (!state.active) {
        // Idle - nothing to paint, leave overlay clear.
        ctx.canvas.style.filter = 'none';
        return;
      }

      const { duration, easingKey } = getActiveRevealTiming(inst.preset);

      if (state.phase === 'reveal' && state.image) {
        const elapsed = (nowMs - state.revealStartMs) / 1000;
        const t = Math.min(elapsed / duration, 1);
        const eased = ease(easingKey, t);
        // Cross-fade: shader opacity drops as overlay fills in.
        shaderCanvas.style.opacity = String(1 - eased);
        paintMaskedFrame(state, s, inst, ctx);
        if (t >= 1) {
          state.phase = 'hold';
          shaderCanvas.style.opacity = '0';
          state.onRevealComplete?.();
        }
      } else if (state.phase === 'hold' && state.image) {
        // Image fully visible. Re-paint a final stable frame so resizes are
        // honored without re-running the dissolve.
        ctx.canvas.style.filter = 'none';
        const img = state.image;
        const w = inst.canvas.width;
        const h = inst.canvas.height;
        if (ctx.canvas.width !== w || ctx.canvas.height !== h) {
          ctx.canvas.width = w;
          ctx.canvas.height = h;
          state.holdPaintedImg = null;
        }
        // Paint once per image × size; the held frame is static, so
        // repainting it every tick was pure waste (a full-canvas
        // high-quality resample per card, 10×/s, for the whole hold).
        if (state.holdPaintedImg !== img || state.holdPaintedW !== w || state.holdPaintedH !== h) {
          ctx.clearRect(0, 0, w, h);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(getCoverBitmap(state, 'a', img, w, h), 0, 0);
          state.holdPaintedImg = img;
          state.holdPaintedW = w;
          state.holdPaintedH = h;
        }
        shaderCanvas.style.opacity = '0';
      } else if (state.phase === 'boil' && state.image) {
        // Handles the whole regeneration lifecycle including the pending
        // reveal handoff (BLEND → RESOLVE) — transitions itself to
        // `hold` and fires onRevealComplete when the new image is sharp.
        paintBoilFrame(state, s, inst, ctx, shaderCanvas, nowMs);
      } else if (state.phase === 'hide') {
        const elapsed = nowMs - state.hideStartMs;
        const t = Math.min(elapsed / Math.max(1, state.hideDurationMs), 1);
        const overlayAlpha = 1 - t;
        ctx.canvas.style.opacity = String(overlayAlpha);
        shaderCanvas.style.opacity = String(t);
        if (t >= 1) {
          // Done - reset.
          state.active = false;
          state.phase = 'idle';
          ctx.canvas.style.opacity = '1';
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          shaderCanvas.style.opacity = '1';
          state.image = null;
        }
      }
    },
    startReveal(opts) {
      if (state.phase === 'boil' && state.active) {
        // Don't cut the churn off — hand the incoming image to the boil,
        // which morphs the churning cells' colours to it, closes the mosaic,
        // and sharpens (see paintBoilFrame). It fires onRevealComplete and
        // settles into `hold` itself, exactly like a regular reveal.
        state.pendingReveal = opts;
        state.onRevealComplete = opts.onRevealComplete;
        state.cssWidth = opts.cssWidth;
        state.cssHeight = opts.cssHeight;
        if (state.boilHandoffStartMs === 0) state.boilHandoffStartMs = performance.now();
        return;
      }
      beginReveal(opts);
    },
    startHide(durationMs = 300) {
      if (!state.active || state.phase === 'hide') return;
      state.phase = 'hide';
      state.hideStartMs = performance.now();
      state.hideDurationMs = durationMs;
    },
    startBoil() {
      // Needs a held/revealing image to churn; no-op otherwise.
      if (!state.active || !state.image) return;
      if (state.phase !== 'hold' && state.phase !== 'reveal') return;
      state.phase = 'boil';
      state.boilStartMs = performance.now();
      state.boilHandoffStartMs = 0;
      state.pendingReveal = null;
      // Reseed so every regeneration churns a fresh cell pattern, and force
      // a fresh shader-field sample on the first boil frame.
      state.boilPattern = null;
      state.sampleFrameCounter = 0;
      state.sampleDataCache = null;
      state.holdPaintedImg = null;
      ctx.canvas.style.opacity = '1';
    },
    clear() {
      // Only undo the cross-fade styles if a reveal actually touched them.
      // `cycle.stop()` calls clear() even when nothing ever ran (e.g. the
      // autoReveal=false effect on mount), and unconditionally forcing the
      // shader canvas back to opacity 1 would stomp the consumer's
      // `strength`-driven opacity set moments earlier.
      const wasActive = state.active;
      state.active = false;
      state.phase = 'idle';
      state.image = null;
      state.boilHandoffStartMs = 0;
      state.pendingReveal = null;
      state.holdPaintedImg = null;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      if (wasActive) {
        ctx.canvas.style.filter = 'none';
        ctx.canvas.style.opacity = '1';
        shaderCanvas.style.opacity = '1';
      }
    },
    isActive() {
      return state.active;
    },
    dispose() {
      state.image = null;
      state.sampleCanvas = null;
      state.sampleCtx = null;
      state.sampleImgData = null;
      state.sampleDataCache = null;
      state.sampleFrameCounter = 0;
      state.maskGrad = null;
      state.maskGradCtx = null;
      state.maskImgData = null;
      state.gsFlickerTable = null;
      state.pixCanvas = null;
      state.pixCtx = null;
      state.pixDrop = null;
      state.pixDropCtx = null;
      state.pixDropImgData = null;
      state.pixDropPattern = null;
      state.boilPattern = null;
      state.boilField = null;
      state.pendingReveal = null;
      state.coverA = null;
      state.coverB = null;
      state.holdPaintedImg = null;
      state.sampleGpuCanvas = null;
      state.sampleGpuCtx = null;
    }
  };

  return handle;
}

/** Pull a random image from `pool`, never repeating the previous index. */
export function pickRandomImage(pool: string[], lastIdx: number): { src: string; idx: number } | null {
  if (pool.length === 0) return null;
  if (pool.length === 1) return { src: pool[0], idx: 0 };
  let idx: number;
  do {
    idx = Math.floor(Math.random() * pool.length);
  } while (idx === lastIdx);
  return { src: pool[idx], idx };
}


// ---- upstream: packages/img-fx/src/engine/cycle.ts ----
/**
 * Auto-loop reveal scheduler.
 *
 * Each <ImageGeneration autoReveal> mounts a Cycle that drives the four
 * phases:
 *
 *   idle    -> wait random(min..max) seconds (just shader running)
 *   reveal  -> trigger reveal animation in reveal.ts (preset.revealConfig.duration)
 *   visible -> hold image visible for `revealHoldMs`
 *   hide    -> 300 ms cross-fade back to shader
 *   -> idle
 *
 * `paused` clears the pending timer; resuming re-enters the same phase with a
 * fresh delay. `onCycle` fires on every phase change so consumers can wire
 * analytics or sync external state.
 */
// Labs: merged into this file: import { loadImage, pickRandomImage, type RevealState } from './reveal';

export type CyclePhase = 'idle' | 'reveal' | 'visible' | 'hide';

export interface CycleEvent {
  phase: CyclePhase;
  src: string | null;
}

export interface CycleOptions {
  reveal: RevealState;
  /** Image pool. Random pick per cycle, never same as previous. */
  images: string[];
  /** Random seconds in `idle` phase (shader-only). */
  delayRange: [number, number];
  /**
   * Time the image stays visible after the reveal completes.
   * - `number` — fixed ms.
   * - `[min, max]` — random ms per cycle, re-rolled each reveal.
   */
  holdMs: number | [number, number];
  /** ms cross-fade back to shader. */
  fadeOutMs: number;
  /** Random initial delay seed so multiple cycles don't sync. */
  initialDelayMs?: number;
  /** Cycle event hook. */
  onPhase?: (event: CycleEvent) => void;
  /**
   * Optional callback invoked just before each pick that returns a list of
   * src strings the cycle MUST avoid this round (in addition to its own
   * "no immediate repeat" rule). Use this to coordinate multiple cycles so
   * they never display the same image at the same time. If every candidate
   * is excluded the cycle falls back to the standard random pick.
   */
  excludeSrcs?: () => string[] | Set<string> | null | undefined;
}

export interface Cycle {
  start: () => void;
  stop: () => void;
  /** Replace the `excludeSrcs` callback (or clear it by passing `null`). */
  setExcludeSrcs: (fn: CycleOptions['excludeSrcs'] | null) => void;
  /**
   * Fire a single reveal pass *now*, regardless of whether the cycle is
   * currently auto-running. No-op if a reveal is already in progress
   * (`reveal`/`visible`/`hide` phases).
   *
   * `hold: 'auto'` (default) — runs reveal -> hold (`holdMs`) -> hide
   * automatically. When auto-running this re-enters the auto-loop afterwards;
   * otherwise the cycle returns to a stopped idle state.
   *
   * `hold: 'manual'` — runs reveal then stays in the `visible` phase
   * indefinitely. Call `triggerHide()` to fade out.
   */
  triggerOnce: (opts?: { hold?: 'auto' | 'manual' }) => void;
  /**
   * Manually trigger the hide fade if currently in `reveal` or `visible`
   * phase. No-op otherwise. Useful for "Hide image" buttons that complement
   * a `triggerOnce({ hold: 'manual' })` call.
   */
  triggerHide: () => void;
  /**
   * Dissolve the currently revealed image into a sustained "regenerating"
   * pixel churn: the image breaks into the effect's cell grid, cells pop
   * in/out with the preset's flicker clock, and the shader plays through the
   * gaps (see `RevealState.startBoil`). The cycle returns to a stopped
   * `idle` state so the consumer can end the churn with `triggerOnce()`
   * (reveals the next image over it) or `stop()`. No-op unless currently in
   * `reveal`/`visible`.
   *
   * `autoRevealAfterMs` — when set, the churn ends by itself: after that many
   * ms the cycle fires `triggerOnce({ hold: 'manual' })`, dissolving the next
   * image in over the churn. Any manual `triggerOnce()` / `stop()` before the
   * timer fires cancels it.
   */
  triggerBoil: (opts?: { autoRevealAfterMs?: number }) => void;
  /** Current phase of the cycle. Useful for syncing UI button state. */
  getPhase: () => CyclePhase;
  setPaused: (paused: boolean) => void;
  setImages: (images: string[]) => void;
  setOptions: (opts: Partial<Pick<CycleOptions, 'delayRange' | 'holdMs' | 'fadeOutMs' | 'onPhase'>>) => void;
  isRunning: () => boolean;
  dispose: () => void;
}

export function createCycle(opts: CycleOptions): Cycle {
  let images = opts.images.slice();
  let delayRange = opts.delayRange;
  let holdMs = opts.holdMs;
  let fadeOutMs = opts.fadeOutMs;
  let onPhase = opts.onPhase;
  let excludeSrcs = opts.excludeSrcs;

  let phase: CyclePhase = 'idle';
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastIdx = -1;
  let running = false;
  let paused = false;
  let currentSrc: string | null = null;
  // Captured at the start of each reveal so that the hide tail can decide
  // whether to re-enter the auto-loop (`scheduleIdle()`) or come to a stopped
  // idle. Avoids needing to inspect mutable state at the moment of hide.
  let activeReschedule = false;
  // Hold mode for the currently-active reveal. `manual` means we stay in the
  // `visible` phase indefinitely until `triggerHide()` is called — so resume
  // from pause must NOT re-arm the auto-hide timer.
  let activeHoldMode: 'auto' | 'manual' = 'auto';

  function emit(p: CyclePhase): void {
    phase = p;
    onPhase?.({ phase: p, src: currentSrc });
  }

  function clearTimer(): void {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  /** Resolve `holdMs` to a concrete millisecond value. Tuples re-roll on
   *  every reveal so consecutive cycles never hold for the same duration. */
  function pickHoldMs(): number {
    if (typeof holdMs === 'number') return Math.max(0, holdMs);
    const [min, max] = holdMs;
    const lo = Math.max(0, Math.min(min, max));
    const hi = Math.max(0, Math.max(min, max));
    return lo + Math.random() * (hi - lo);
  }

  function scheduleIdle(initialMs?: number): void {
    if (!running || paused) return;
    emit('idle');
    const [min, max] = delayRange;
    const delaySec = min + Math.random() * Math.max(0, max - min);
    const ms = initialMs ?? delaySec * 1000;
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      runReveal(true, 'auto');
    }, ms);
  }

  function performHide(): void {
    if (paused) return;
    emit('hide');
    opts.reveal.startHide(fadeOutMs);
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      if (paused) return;
      currentSrc = null;
      if (activeReschedule) {
        scheduleIdle();
      } else {
        running = false;
        emit('idle');
      }
    }, fadeOutMs);
  }

  function pickAvoidingExcluded(): { src: string; idx: number } | null {
    if (images.length === 0) return null;
    const raw = excludeSrcs?.();
    const exclSet =
      raw == null
        ? null
        : raw instanceof Set
          ? raw
          : new Set(raw);
    if (!exclSet || exclSet.size === 0) {
      return pickRandomImage(images, lastIdx);
    }
    // Build a candidate list: exclude srcs in `exclSet` AND the immediately
    // previous pick (so the same card never repeats consecutively either).
    const lastSrc = lastIdx >= 0 && lastIdx < images.length ? images[lastIdx] : null;
    const candidates: number[] = [];
    for (let i = 0; i < images.length; i++) {
      const src = images[i];
      if (exclSet.has(src)) continue;
      if (src === lastSrc && images.length > exclSet.size + 1) continue;
      candidates.push(i);
    }
    if (candidates.length === 0) {
      // Pool fully exhausted by exclusions — fall back to a regular random
      // pick so we never deadlock the auto-loop.
      return pickRandomImage(images, lastIdx);
    }
    const idx = candidates[Math.floor(Math.random() * candidates.length)];
    return { src: images[idx], idx };
  }

  function runReveal(reschedule: boolean, holdMode: 'auto' | 'manual'): void {
    if (!running || paused) return;
    if (images.length === 0) {
      if (reschedule) scheduleIdle(500);
      else running = false;
      return;
    }
    const pick = pickAvoidingExcluded();
    if (!pick) {
      if (reschedule) scheduleIdle(500);
      else running = false;
      return;
    }
    lastIdx = pick.idx;
    currentSrc = pick.src;
    activeReschedule = reschedule;
    activeHoldMode = holdMode;
    loadImage(pick.src)
      .then((img) => {
        if (!running || paused) return;
        emit('reveal');
        opts.reveal.startReveal({
          image: img,
          cssWidth: opts.reveal.canvas.clientWidth || opts.reveal.canvas.width,
          cssHeight: opts.reveal.canvas.clientHeight || opts.reveal.canvas.height,
          onRevealComplete: () => {
            if (!running || paused) return;
            emit('visible');
            if (holdMode === 'manual') {
              // Stay in `visible` indefinitely; consumer will call triggerHide()
              // to fade back to the shader.
              clearTimer();
              return;
            }
            clearTimer();
            const thisHoldMs = pickHoldMs();
            timer = setTimeout(() => {
              timer = null;
              if (!running || paused) return;
              performHide();
            }, thisHoldMs);
          }
        });
      })
      .catch(() => {
        currentSrc = null;
        if (reschedule) scheduleIdle(500);
        else running = false;
      });
  }

  function triggerOnceImpl(triggerOpts?: { hold?: 'auto' | 'manual' }): void {
    if (paused) return;
    // Don't interrupt an in-flight reveal/hold/hide.
    if (phase === 'reveal' || phase === 'visible' || phase === 'hide') return;
    const wasRunning = running;
    clearTimer();
    if (!wasRunning) {
      // Spin up just enough state for runReveal to proceed; mark as running
      // so the bail guards inside runReveal pass. `reschedule=false` makes
      // runReveal return us to a stopped idle state once hide completes.
      running = true;
    }
    runReveal(wasRunning, triggerOpts?.hold ?? 'auto');
  }

  return {
    start() {
      if (running) return;
      running = true;
      paused = false;
      const initial = opts.initialDelayMs ?? Math.random() * 1500;
      scheduleIdle(initial);
    },
    stop() {
      running = false;
      clearTimer();
      opts.reveal.clear();
      currentSrc = null;
      phase = 'idle';
    },
    triggerOnce(triggerOpts) {
      triggerOnceImpl(triggerOpts);
    },
    triggerHide() {
      if (paused) return;
      if (phase !== 'reveal' && phase !== 'visible') return;
      performHide();
    },
    triggerBoil(boilOpts) {
      if (paused) return;
      if (phase !== 'reveal' && phase !== 'visible') return;
      clearTimer();
      opts.reveal.startBoil();
      currentSrc = null;
      // Come to a stopped idle (like a completed manual hide) so a later
      // triggerOnce() runs a single non-rescheduling reveal over the churn.
      running = false;
      emit('idle');
      // Optional self-ending churn: reveal the next image over the boil
      // after the requested duration. Uses the shared timer slot, so any
      // manual triggerOnce()/stop() in the meantime cancels it.
      const afterMs = boilOpts?.autoRevealAfterMs;
      if (afterMs != null && Number.isFinite(afterMs)) {
        timer = setTimeout(() => {
          timer = null;
          triggerOnceImpl({ hold: 'manual' });
        }, Math.max(0, afterMs));
      }
    },
    getPhase() {
      return phase;
    },
    setPaused(p) {
      if (paused === p) return;
      paused = p;
      if (paused) {
        clearTimer();
      } else if (running) {
        // Resume — re-enter idle with a small randomised delay so we don't
        // immediately fire a reveal mid-hold/hide.
        if (phase === 'visible') {
          if (activeHoldMode === 'manual') {
            // Manual hold: stay visible indefinitely; `triggerHide()` will
            // fade it out on demand. Don't re-arm any auto-hide timer.
            return;
          }
          // Re-arm hold timer with a short cap (max 500 ms) so a resume
          // doesn't tack a fresh full hold onto whatever was already shown.
          clearTimer();
          timer = setTimeout(() => {
            timer = null;
            performHide();
          }, Math.min(pickHoldMs(), 500));
        } else if (phase === 'hide') {
          // Already animating; let it complete.
          clearTimer();
          timer = setTimeout(() => {
            timer = null;
            currentSrc = null;
            scheduleIdle();
          }, fadeOutMs);
        } else {
          scheduleIdle();
        }
      }
    },
    setImages(next) {
      images = next.slice();
      lastIdx = -1;
    },
    setExcludeSrcs(fn) {
      excludeSrcs = fn ?? undefined;
    },
    setOptions(next) {
      if (next.delayRange) delayRange = next.delayRange;
      if (next.holdMs != null) holdMs = next.holdMs;
      if (next.fadeOutMs != null) fadeOutMs = next.fadeOutMs;
      if (next.onPhase) onPhase = next.onPhase;
    },
    isRunning() {
      return running && !paused;
    },
    dispose() {
      running = false;
      clearTimer();
    }
  };
}

// ---- upstream: packages/img-fx/src/engine/palette.ts ----
/**
 * Image-palette sampling for the regenerate flow.
 *
 * `samplePaletteFromCanvas` averages the source canvas down to a small grid,
 * sorts its pixels by luminance, and replaces each of the preset's 7 palette
 * slots with the image color at the same luminance RANK the slot has inside
 * the preset palette. The effect keeps its authored contrast structure (which
 * slots read dark / light) but wears the image's colors — same cells, same
 * animation, image-born pixelation.
 */
// Labs: imported above: import { parseCssColor } from '../presets';

export interface SampledPalette {
  /** One CSS hex color per shader palette slot (7 entries). */
  colors: string[];
  /** Average image color — used as the card surface behind the effect. */
  cardBg: string;
}

const lum = (r: number, g: number, b: number): number => 0.299 * r + 0.587 * g + 0.114 * b;
const hex = (r: number, g: number, b: number): string =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/** Downsample grid edge. 24x24 = 576 samples — plenty for a 7-color palette. */
const GRID = 24;

// One shared scratch canvas for all instances/calls (sampling is synchronous
// and single-threaded, so reuse is safe and avoids per-call allocations).
let scratch: HTMLCanvasElement | null = null;
let scratchCtx: CanvasRenderingContext2D | null = null;

function getScratchCtx(): CanvasRenderingContext2D | null {
  if (scratchCtx) return scratchCtx;
  if (typeof document === 'undefined') return null;
  scratch = document.createElement('canvas');
  scratch.width = GRID;
  scratch.height = GRID;
  scratchCtx = scratch.getContext('2d', { willReadFrequently: true });
  return scratchCtx;
}

/**
 * Sample an image-derived recolor for the running effect from `src` (any
 * drawable canvas — typically the reveal overlay showing the current image).
 *
 * `presetColors` is the active preset mode's 7-slot palette; the returned
 * `colors` array maps image colors onto those slots by luminance rank.
 * Returns null when sampling isn't possible (SSR, empty canvas).
 */
export function samplePaletteFromCanvas(
  src: HTMLCanvasElement,
  presetColors: readonly string[]
): SampledPalette | null {
  if (src.width === 0 || src.height === 0) return null;
  const ctx = getScratchCtx();
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, GRID, GRID);
  ctx.drawImage(src, 0, 0, GRID, GRID);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, GRID, GRID).data;
  } catch {
    // Tainted canvas (cross-origin image without CORS) — can't sample.
    return null;
  }

  const px: Array<{ r: number; g: number; b: number; lum: number }> = [];
  let ar = 0;
  let ag = 0;
  let ab = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue; // skip fully-transparent corners (radius)
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    px.push({ r, g, b, lum: lum(r, g, b) });
    ar += r;
    ag += g;
    ab += b;
  }
  if (px.length === 0) return null;
  px.sort((a, b) => a.lum - b.lum);
  const cardBg = hex(ar / px.length, ag / px.length, ab / px.length);

  // Preset slots ranked by luminance -> image luminance quantile per rank.
  const ranked = presetColors
    .map((color, slot) => {
      const [r, g, b] = parseCssColor(color);
      return { slot, lum: lum(r, g, b) };
    })
    .sort((a, b) => a.lum - b.lum);
  const colors: string[] = new Array(ranked.length);
  for (let rank = 0; rank < ranked.length; rank++) {
    // Spread ranks across the image's luminance range (5th..95th percentile).
    const q = 0.05 + (0.9 * rank) / Math.max(1, ranked.length - 1);
    const p = px[Math.min(px.length - 1, Math.round(q * (px.length - 1)))];
    colors[ranked[rank].slot] = hex(p.r, p.g, p.b);
  }
  return { colors, cardBg };
}

