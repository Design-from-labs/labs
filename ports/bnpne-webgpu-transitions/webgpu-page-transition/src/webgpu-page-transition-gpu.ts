import { Fn, uniform, uv, vec2 } from "three/tsl";
import * as THREE from "three/webgpu";

/*
 * Ported from bnpne/page-transitions-with-webgpu-vanilla-js (src/gpu.js) at
 * commit 70e5c0eafb14: https://github.com/bnpne/page-transitions-with-webgpu-vanilla-js.
 *
 * Changes from upstream (docs/evidence/ports/webgpu-page-transition/fidelity.md):
 * the scene draws into a canvas the component owns and sizes it to the
 * component's box (not the window); images come in as a prop; plane bounds
 * are relative to the component's box; the renderer reports which backend it
 * runs on (three.js picks WebGPU, else WebGL 2).
 *
 * Copyright (c) 2009 - 2025 Codrops. MIT License; the full notice ends this file.
 */

// Corner radius in CSS pixels, kept subtle.
const CORNER_RADIUS = 8;

// Camera distance from the z=0 plane. The perspective FOV is matched to this so
// the z=0 plane maps 1:1 to CSS pixels (identical framing to an ortho camera);
// smaller values = stronger perspective for out-of-plane tilts.
const CAMERA_DISTANCE = 1000;

// Builds an opacity node that masks the quad into a rounded rectangle using a
// rounded-box SDF. `sizeUniform` is the plane's pixel size (so the radius is a
// constant pixel value regardless of the plane's dimensions) and the result is
// multiplied by `opacityUniform`, the plane's fade value.
// biome-ignore lint/suspicious/noExplicitAny: TSL node types are loose upstream.
function roundedRectOpacityNode(sizeUniform: any, radiusUniform: any, opacityUniform: any) {
  // The node chain is typed loosely: @types/three cannot follow it (upstream
  // is plain JavaScript).
  // biome-ignore lint/suspicious/noExplicitAny: see above.
  const mask = Fn((): any => {
    // biome-ignore lint/suspicious/noExplicitAny: see above.
    const half: any = sizeUniform.mul(0.5);
    // biome-ignore lint/suspicious/noExplicitAny: see above.
    const r: any = radiusUniform.min(half.x).min(half.y);
    // biome-ignore lint/suspicious/noExplicitAny: see above.
    const p: any = (uv() as any).sub(0.5).mul(sizeUniform);
    // biome-ignore lint/suspicious/noExplicitAny: see above.
    const q: any = p.abs().sub(half).add(r);
    const dist = q.max(vec2(0.0)).length().add(q.x.max(q.y).min(0.0)).sub(r);
    // ~2px feather for antialiased edges; 1 inside, 0 outside.
    return dist.smoothstep(-1.0, 1.0).oneMinus();
  })();
  return mask.mul(opacityUniform);
}

export const SATELLITES_PER_IMAGE = 4; // 4 satellites per image

export interface PlaneBounds {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
}

export interface Plane {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicNodeMaterial;
  // biome-ignore lint/suspicious/noExplicitAny: a TSL uniform node.
  sizeUniform: any;
  // biome-ignore lint/suspicious/noExplicitAny: a TSL uniform node.
  opacityUniform: any;
  bounds: PlaneBounds;
  opacity: number;
  tilt: number;
  tiltX: number;
  trackedEl: Element | null;
  kind: "main" | "satellite";
  image: number;
  j?: number;
  introVisible?: boolean;
}

export class GPU {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGPURenderer | null = null;
  scene: THREE.Scene | null = null;
  camera: THREE.PerspectiveCamera | null = null;
  geometry: THREE.PlaneGeometry | null = null;
  textures: THREE.Texture[] = [];
  aspects: number[] = [];
  planes: Plane[] = [];
  // biome-ignore lint/suspicious/noExplicitAny: a TSL uniform node.
  radiusUniform: any = uniform(CORNER_RADIUS);
  /** The box the scene fills, in CSS pixels (upstream: the window). */
  width = 1;
  height = 1;
  /** "webgpu" or "webgl2", once initialized. */
  backend: "webgpu" | "webgl2" | null = null;
  ready = false;
  disposed = false;
  /** Set when initialization failed (no WebGPU and no WebGL 2). */
  error: unknown = null;
  readonly count: number;

  constructor(canvas: HTMLCanvasElement, count: number) {
    this.canvas = canvas;
    this.count = count;
  }

  mainIdx(image: number) {
    return image;
  }

  satIdx(image: number, j: number) {
    return this.count + image * SATELLITES_PER_IMAGE + j;
  }

  _createPlaneMaterial(texture: THREE.Texture) {
    // NodeMaterial (not the classic MeshBasicMaterial) is required for
    // `opacityNode`; the classic material silently ignores node properties.
    const material = new THREE.MeshBasicNodeMaterial({
      map: texture,
      transparent: true,
    });
    const sizeUniform = uniform(new THREE.Vector2(1, 1));
    const opacityUniform = uniform(0);
    material.opacityNode = roundedRectOpacityNode(
      sizeUniform,
      this.radiusUniform,
      opacityUniform,
    );
    return { material, sizeUniform, opacityUniform };
  }

  async init(
    images: string[],
    size: { width: number; height: number; dpr: number },
    forceWebGL = false,
  ) {
    this.renderer = new THREE.WebGPURenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      forceWebGL,
    });
    this.renderer.setPixelRatio(size.dpr);
    this.width = size.width;
    this.height = size.height;
    this.renderer.setSize(size.width, size.height, false);
    await this.renderer.init();
    if (this.disposed) {
      return;
    }
    // biome-ignore lint/suspicious/noExplicitAny: the backend flag is not typed.
    this.backend = (this.renderer.backend as any).isWebGPUBackend
      ? "webgpu"
      : "webgl2";

    this.scene = new THREE.Scene();
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.setupCamera();

    await this.loadTextures(images);
    if (this.disposed) {
      return;
    }
    this.createPlanes();
    await this.warmup();
    this.ready = !this.disposed;
  }

  // Compile every plane's pipeline and upload its texture to the GPU up front.
  // Without this, the work happens on the first frame the planes turn
  // visible, exactly when the intro plays, and the animation hitches. The
  // planes start at opacity 0, so the warm render draws nothing.
  async warmup() {
    if (!this.renderer || !this.scene || !this.camera) {
      return;
    }
    await this.renderer.compileAsync(this.scene, this.camera);
    this.renderer.render(this.scene, this.camera);
  }

  setupCamera() {
    const w = this.width;
    const h = this.height;
    const fov = 2 * Math.atan(h / 2 / CAMERA_DISTANCE) * (180 / Math.PI);
    this.camera = new THREE.PerspectiveCamera(
      fov,
      w / h,
      0.1,
      CAMERA_DISTANCE * 2,
    );
    this.camera.position.z = CAMERA_DISTANCE;
  }

  async loadTextures(images: string[]) {
    const loader = new THREE.TextureLoader();
    await Promise.all(
      images.map(
        (src, i) =>
          new Promise<void>((resolve, reject) =>
            loader.load(
              src,
              (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                this.textures[i] = tex;
                const image = tex.image as HTMLImageElement;
                this.aspects[i] = image.naturalWidth / image.naturalHeight;
                resolve();
              },
              undefined,
              reject,
            ),
          ),
      ),
    );
  }

  createPlanes() {
    if (!this.scene || !this.geometry) {
      return;
    }
    for (let i = 0; i < this.count; i++) {
      const { material, sizeUniform, opacityUniform } =
        this._createPlaneMaterial(this.textures[i]);
      const mesh = new THREE.Mesh(this.geometry, material);
      this.scene.add(mesh);
      this.planes.push({
        mesh,
        material,
        sizeUniform,
        opacityUniform,
        bounds: { x: 0, y: 0, w: 0, h: 0, z: 0 },
        opacity: 0,
        tilt: 0,
        tiltX: 0,
        trackedEl: null,
        kind: "main",
        image: i,
      });
    }
    // 4 satellite planes per image
    for (let i = 0; i < this.count; i++) {
      for (let j = 0; j < SATELLITES_PER_IMAGE; j++) {
        const { material, sizeUniform, opacityUniform } =
          this._createPlaneMaterial(this.textures[i]);
        const mesh = new THREE.Mesh(this.geometry, material);
        this.scene.add(mesh);
        this.planes.push({
          mesh,
          material,
          sizeUniform,
          opacityUniform,
          bounds: { x: 0, y: 0, w: 0, h: 0, z: 0 },
          opacity: 0,
          tilt: 0,
          tiltX: 0,
          trackedEl: null,
          kind: "satellite",
          image: i,
          j,
        });
      }
    }
  }

  syncMesh(plane: Plane) {
    const { mesh, bounds, opacity } = plane;
    const w = this.width;
    const h = this.height;
    const pw = Math.max(bounds.w, 0.001);
    const ph = Math.max(bounds.h, 0.001);
    mesh.scale.set(pw, ph, 1);
    mesh.position.x = bounds.x + bounds.w / 2 - w / 2;
    mesh.position.y = -(bounds.y + bounds.h / 2 - h / 2);
    mesh.rotation.x = plane.tiltX ?? 0;
    mesh.rotation.y = plane.tilt ?? 0;
    mesh.renderOrder = -(bounds.z ?? 0);
    plane.sizeUniform.value.set(pw, ph);
    plane.opacityUniform.value = opacity;
    mesh.visible = opacity > 0.001 && bounds.w > 0;
  }

  applyMainLayout() {
    for (let i = 0; i < this.count; i++) {
      this.planes[this.mainIdx(i)].opacity = 1;
      for (let j = 0; j < SATELLITES_PER_IMAGE; j++) {
        this.planes[this.satIdx(i, j)].opacity = 0;
      }
    }
  }

  applyInnerLayout(image: number) {
    for (let i = 0; i < this.count; i++) {
      this.planes[this.mainIdx(i)].opacity = i === image ? 1 : 0;
      for (let j = 0; j < SATELLITES_PER_IMAGE; j++) {
        this.planes[this.satIdx(i, j)].opacity = i === image ? 1 : 0;
      }
    }
  }

  applyIndexLayout() {
    for (let i = 0; i < this.count; i++) {
      this.planes[this.mainIdx(i)].opacity = 1;
      // Satellites are not part of the float constellation, hidden on /index.
      for (let j = 0; j < SATELLITES_PER_IMAGE; j++) {
        this.planes[this.satIdx(i, j)].opacity = 0;
      }
    }
  }

  /** The box changed size (upstream: the window's resize event). */
  resize(width: number, height: number, dpr: number) {
    this.width = width;
    this.height = height;
    if (!this.camera || !this.renderer) {
      return;
    }
    this.camera.fov =
      2 * Math.atan(height / 2 / CAMERA_DISTANCE) * (180 / Math.PI);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
  }

  /** Follows tracked elements (relative to `origin`) and draws a frame. */
  update(origin: { left: number; top: number }) {
    if (!this.renderer || !this.scene || !this.camera) {
      return;
    }
    for (const p of this.planes) {
      if (p.trackedEl) {
        const rect = p.trackedEl.getBoundingClientRect();
        p.bounds.x = rect.left - origin.left;
        p.bounds.y = rect.top - origin.top;
        p.bounds.w = rect.width;
        p.bounds.h = rect.height;
      }
      this.syncMesh(p);
    }
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this.disposed = true;
    for (const texture of this.textures) {
      texture.dispose();
    }
    for (const plane of this.planes) {
      plane.material.dispose();
    }
    this.geometry?.dispose();
    this.renderer?.dispose();
  }
}
