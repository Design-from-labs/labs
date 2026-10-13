import type { GPU, PlaneBounds } from "./webgpu-page-transition-gpu";

/*
 * Ported from bnpne/page-transitions-with-webgpu-vanilla-js
 * (src/pages/index-page.js, IndexFloat) at commit 70e5c0eafb14. Changes: the
 * viewport and the pointer listeners are the component's box (`host`), not
 * the window; the keyboard can rotate the float (`nudge`).
 *
 * Copyright (c) 2009 - 2025 Codrops. MIT License; the full notice ends this file.
 */

const BASE_HEIGHT_VH = 0.22;
const VIEWPORT_PADDING = 0.3;
const FOCAL_LENGTH = 600;
const Z_SPREAD = 350;
const NEAR_CLIP = 50;
const DRAG_SENSITIVITY = 0.003;
const MOMENTUM_DECAY = 0.95;
const MOMENTUM_MIN = 0.00005;

export function seededRandom(seed: number) {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export interface FloatHost {
  host: HTMLElement;
  /** Main planes: image index and aspect (width / height). */
  aspects: number[];
}

export class IndexFloat {
  gpu: GPU | null;
  source: FloatHost;
  worldPositions: { x: number; y: number; z: number }[] = [];
  baseSizes: { w: number; h: number }[] = [];
  targets: PlaneBounds[] = []; // rects in plane-index order, captured by prepare()

  rotX = 0;
  rotY = 0;
  velX = 0;
  velY = 0;
  isDragging = false;
  lastX = 0;
  lastY = 0;
  _running = false;

  constructor(gpu: GPU | null, source: FloatHost) {
    this.gpu = gpu;
    this.source = source;
    this._onDown = this._onDown.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onUp = this._onUp.bind(this);
  }

  prepare() {
    this.computeLayout();
    this.targets = this._project();
  }

  computeLayout() {
    const vw = this.source.host.clientWidth;
    const vh = this.source.host.clientHeight;
    this.worldPositions = [];
    this.baseSizes = [];
    // Plane i is main plane i (upstream walks gpu.planes and skips satellites).
    for (let i = 0; i < this.source.aspects.length; i++) {
      const aspect = this.source.aspects[i] ?? 4 / 5;
      const zNorm = seededRandom(i * 31 + 7);
      const zWorld = (zNorm - 0.5) * 2 * Z_SPREAD;
      const baseH = vh * BASE_HEIGHT_VH;
      const baseW = baseH * aspect;
      const xRange = vw * (1 - 2 * VIEWPORT_PADDING);
      const yRange = vh * (1 - 2 * VIEWPORT_PADDING);
      const xWorld = -xRange / 2 + seededRandom(i * 17 + 3) * xRange;
      const yWorld = -yRange / 2 + seededRandom(i * 23 + 11) * yRange;
      this.worldPositions[i] = { x: xWorld, y: yWorld, z: zWorld };
      this.baseSizes[i] = { w: baseW, h: baseH };
    }
  }

  _project() {
    const vw = this.source.host.clientWidth;
    const vh = this.source.host.clientHeight;
    const cosX = Math.cos(this.rotX);
    const sinX = Math.sin(this.rotX);
    const cosY = Math.cos(this.rotY);
    const sinY = Math.sin(this.rotY);
    const rects: PlaneBounds[] = [];
    for (let i = 0; i < this.worldPositions.length; i++) {
      const pos = this.worldPositions[i];
      const size = this.baseSizes[i];
      if (!pos || !size) continue;

      const rx = pos.x * cosY + pos.z * sinY;
      let ry = pos.y;
      let rz = -pos.x * sinY + pos.z * cosY;
      const ry2 = ry * cosX - rz * sinX;
      const rz2 = ry * sinX + rz * cosX;
      ry = ry2;
      rz = rz2;

      const depth = FOCAL_LENGTH + rz;
      if (depth < NEAR_CLIP) {
        rects[i] = { x: -9999, y: -9999, w: 0, h: 0, z: rz };
        continue;
      }

      const f = FOCAL_LENGTH / depth;
      const w = size.w * f;
      const h = size.h * f;
      const cx = rx * f + vw / 2;
      const cy = ry * f + vh / 2;
      rects[i] = { x: cx - w / 2, y: cy - h / 2, w, h, z: rz };
    }
    return rects;
  }

  /** The projected rects, for planes (GPU) or positioned images (CSS tier). */
  current() {
    return this._project();
  }

  applyProjection() {
    if (!this.gpu) return;
    const rects = this._project();
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (!r) continue;
      const plane = this.gpu.planes[i];
      plane.bounds.x = r.x;
      plane.bounds.y = r.y;
      plane.bounds.w = r.w;
      plane.bounds.h = r.h;
      plane.bounds.z = r.z;
    }
  }

  start() {
    this._running = true;
    this.applyProjection();
    const host = this.source.host;
    host.addEventListener("pointerdown", this._onDown);
    host.addEventListener("pointermove", this._onMove);
    host.addEventListener("pointerup", this._onUp);
    host.addEventListener("pointercancel", this._onUp);
  }

  stop() {
    this._running = false;
    const host = this.source.host;
    host.removeEventListener("pointerdown", this._onDown);
    host.removeEventListener("pointermove", this._onMove);
    host.removeEventListener("pointerup", this._onUp);
    host.removeEventListener("pointercancel", this._onUp);
    this.isDragging = false;
    this.velX = 0;
    this.velY = 0;
  }

  measure() {
    this.rotX = 0;
    this.rotY = 0;
    this.velX = 0;
    this.velY = 0;
    this.computeLayout();
    this.targets = this._project();
    this.applyProjection();
  }

  getTargets() {
    return this.targets;
  }

  /** Spins the float as a drag of (dx, dy) pixels would (keyboard). */
  nudge(dx: number, dy: number) {
    this.velY = dx * DRAG_SENSITIVITY;
    this.velX = dy * DRAG_SENSITIVITY;
  }

  tick() {
    if (!this._running) return;
    if (this.isDragging) return;
    if (Math.abs(this.velX) < MOMENTUM_MIN && Math.abs(this.velY) < MOMENTUM_MIN) {
      this.velX = 0;
      this.velY = 0;
      return;
    }
    this.rotX += this.velX;
    this.rotY += this.velY;
    this.velX *= MOMENTUM_DECAY;
    this.velY *= MOMENTUM_DECAY;
    this.applyProjection();
  }

  _onDown(e: PointerEvent) {
    if ((e.target as Element | null)?.closest?.("a, button")) return;
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.velX = 0;
    this.velY = 0;
  }

  _onMove(e: PointerEvent) {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.rotY += dx * DRAG_SENSITIVITY;
    this.rotX += dy * DRAG_SENSITIVITY;
    this.velY = dx * DRAG_SENSITIVITY;
    this.velX = dy * DRAG_SENSITIVITY;
    this.applyProjection();
  }

  _onUp() {
    this.isDragging = false;
  }
}
