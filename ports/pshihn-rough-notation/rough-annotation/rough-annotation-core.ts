import type { OpSet, ResolvedOptions } from 'roughjs/bin/core';
import type { Point } from 'roughjs/bin/geometry';
import { randomSeed } from 'roughjs/bin/math';
import { ellipse, line, linearPath, rectangle } from 'roughjs/bin/renderer';

// ---- upstream: src/model.ts ----
export const SVG_NS = 'http://www.w3.org/2000/svg';

export const DEFAULT_ANIMATION_DURATION = 800;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type RoughAnnotationType = 'underline' | 'box' | 'circle' | 'highlight' | 'strike-through' | 'crossed-off' | 'bracket';
export type FullPadding = [number, number, number, number];
export type RoughPadding = number | [number, number] | FullPadding;
export type BracketType = 'left' | 'right' | 'top' | 'bottom';

export interface RoughAnnotationConfig extends RoughAnnotationConfigBase {
  type: RoughAnnotationType;
  multiline?: boolean;
  rtl?: boolean;
}

export interface RoughAnnotationConfigBase {
  animate?: boolean; // defaults to true
  animationDuration?: number; // defaulst to 1000ms
  color?: string; // defaults to currentColor
  strokeWidth?: number; // default based on type
  padding?: RoughPadding; // defaults to 5px
  iterations?: number; // defaults to 2
  brackets?: BracketType | BracketType[]; // defaults to 'right'
}

export interface RoughAnnotation extends RoughAnnotationConfigBase {
  isShowing(): boolean;
  show(): void;
  hide(): void;
  remove(): void;
}

export interface RoughAnnotationGroup {
  show(): void;
  hide(): void;
}

// ---- upstream: src/keyframes.ts ----
export function ensureKeyframes() {
  if (!(window as any).__rno_kf_s) {
    const style = (window as any).__rno_kf_s = document.createElement('style');
    style.textContent = `@keyframes rough-annotation-dash { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) { svg.rough-annotation path { animation: none !important; stroke-dashoffset: 0 !important; } }`; // Labs: keyframes named for the component, and a reduced-motion fallback that shows the finished mark
    document.head.appendChild(style);
  }
}

// ---- upstream: src/render.ts ----
type RoughOptionsType = 'highlight' | 'single' | 'double';

function getOptions(type: RoughOptionsType, seed: number): ResolvedOptions {
  return {
    maxRandomnessOffset: 2,
    roughness: type === 'highlight' ? 3 : 1.5,
    bowing: 1,
    stroke: '#000',
    strokeWidth: 1.5,
    curveTightness: 0,
    curveFitting: 0.95,
    curveStepCount: 9,
    fillStyle: 'hachure',
    fillWeight: -1,
    hachureAngle: -41,
    hachureGap: -1,
    dashOffset: -1,
    dashGap: -1,
    zigzagOffset: -1,
    combineNestedSvgPaths: false,
    disableMultiStroke: type !== 'double',
    disableMultiStrokeFill: false,
    seed
  };
}

function parsePadding(config: RoughAnnotationConfig): FullPadding {
  const p = config.padding;
  if (p || (p === 0)) {
    if (typeof p === 'number') {
      return [p, p, p, p];
    } else if (Array.isArray(p)) {
      const pa = p as number[];
      if (pa.length) {
        switch (pa.length) {
          case 4:
            return [...pa] as FullPadding;
          case 1:
            return [pa[0], pa[0], pa[0], pa[0]];
          case 2:
            return [...pa, ...pa] as FullPadding;
          case 3:
            return [...pa, pa[1]] as FullPadding;
          default:
            return [pa[0], pa[1], pa[2], pa[3]];
        }
      }
    }
  }
  return [5, 5, 5, 5];
}

export function renderAnnotation(svg: SVGSVGElement, rect: Rect, config: RoughAnnotationConfig, animationGroupDelay: number, animationDuration: number, seed: number) {
  const opList: OpSet[] = [];
  let strokeWidth = config.strokeWidth || 2;
  const padding = parsePadding(config);
  const animate = (config.animate === undefined) ? true : (!!config.animate);
  const iterations = config.iterations || 2;
  const rtl = config.rtl ? 1 : 0;
  const o = getOptions('single', seed);

  switch (config.type) {
    case 'underline': {
      const y = rect.y + rect.h + padding[2];
      for (let i = rtl; i < iterations + rtl; i++) {
        if (i % 2) {
          opList.push(line(rect.x + rect.w, y, rect.x, y, o));
        } else {
          opList.push(line(rect.x, y, rect.x + rect.w, y, o));
        }
      }
      break;
    }
    case 'strike-through': {
      const y = rect.y + (rect.h / 2);
      for (let i = rtl; i < iterations + rtl; i++) {
        if (i % 2) {
          opList.push(line(rect.x + rect.w, y, rect.x, y, o));
        } else {
          opList.push(line(rect.x, y, rect.x + rect.w, y, o));
        }
      }
      break;
    }
    case 'box': {
      const x = rect.x - padding[3];
      const y = rect.y - padding[0];
      const width = rect.w + (padding[1] + padding[3]);
      const height = rect.h + (padding[0] + padding[2]);
      for (let i = 0; i < iterations; i++) {
        opList.push(rectangle(x, y, width, height, o));
      }
      break;
    }
    case 'bracket': {
      const brackets: BracketType[] = Array.isArray(config.brackets) ? config.brackets : (config.brackets ? [config.brackets] : ['right']);
      const lx = rect.x - padding[3] * 2;
      const rx = rect.x + rect.w + padding[1] * 2;
      const ty = rect.y - padding[0] * 2;
      const by = rect.y + rect.h + padding[2] * 2;
      for (const br of brackets) {
        let points: Point[];
        switch (br) {
          case 'bottom':
            points = [
              [lx, rect.y + rect.h],
              [lx, by],
              [rx, by],
              [rx, rect.y + rect.h]
            ];
            break;
          case 'top':
            points = [
              [lx, rect.y],
              [lx, ty],
              [rx, ty],
              [rx, rect.y]
            ];
            break;
          case 'left':
            points = [
              [rect.x, ty],
              [lx, ty],
              [lx, by],
              [rect.x, by]
            ];
            break;
          case 'right':
            points = [
              [rect.x + rect.w, ty],
              [rx, ty],
              [rx, by],
              [rect.x + rect.w, by]
            ];
            break;
        }
        if (points) {
          opList.push(linearPath(points, false, o));
        }
      }
      break;
    }
    case 'crossed-off': {
      const x = rect.x;
      const y = rect.y;
      const x2 = x + rect.w;
      const y2 = y + rect.h;
      for (let i = rtl; i < iterations + rtl; i++) {
        if (i % 2) {
          opList.push(line(x2, y2, x, y, o));
        } else {
          opList.push(line(x, y, x2, y2, o));
        }
      }
      for (let i = rtl; i < iterations + rtl; i++) {
        if (i % 2) {
          opList.push(line(x, y2, x2, y, o));
        } else {
          opList.push(line(x2, y, x, y2, o));
        }
      }
      break;
    }
    case 'circle': {
      const doubleO = getOptions('double', seed);
      const width = rect.w + (padding[1] + padding[3]);
      const height = rect.h + (padding[0] + padding[2]);
      const x = rect.x - padding[3] + (width / 2);
      const y = rect.y - padding[0] + (height / 2);
      const fullItr = Math.floor(iterations / 2);
      const singleItr = iterations - (fullItr * 2);
      for (let i = 0; i < fullItr; i++) {
        opList.push(ellipse(x, y, width, height, doubleO));
      }
      for (let i = 0; i < singleItr; i++) {
        opList.push(ellipse(x, y, width, height, o));
      }
      break;
    }
    case 'highlight': {
      const o = getOptions('highlight', seed);
      strokeWidth = rect.h * 0.95;
      const y = rect.y + (rect.h / 2);
      for (let i = rtl; i < iterations + rtl; i++) {
        if (i % 2) {
          opList.push(line(rect.x + rect.w, y, rect.x, y, o));
        } else {
          opList.push(line(rect.x, y, rect.x + rect.w, y, o));
        }
      }
      break;
    }
  }

  if (opList.length) {
    const pathStrings = opsToPath(opList);
    const lengths: number[] = [];
    const pathElements: SVGPathElement[] = [];
    let totalLength = 0;
    const setAttr = (p: SVGPathElement, an: string, av: string) => p.setAttribute(an, av);

    for (const d of pathStrings) {
      const path = document.createElementNS(SVG_NS, 'path');
      setAttr(path, 'd', d);
      setAttr(path, 'fill', 'none');
      setAttr(path, 'stroke', config.color || 'currentColor');
      setAttr(path, 'stroke-width', `${strokeWidth}`);
      if (animate) {
        const length = path.getTotalLength();
        lengths.push(length);
        totalLength += length;
      }
      svg.appendChild(path);
      pathElements.push(path);
    }

    if (animate) {
      let durationOffset = 0;
      for (let i = 0; i < pathElements.length; i++) {
        const path = pathElements[i];
        const length = lengths[i];
        const duration = totalLength ? (animationDuration * (length / totalLength)) : 0;
        const delay = animationGroupDelay + durationOffset;
        const style = path.style;
        style.strokeDashoffset = `${length}`;
        style.strokeDasharray = `${length}`;
        style.animation = `rough-annotation-dash ${duration}ms ease-out ${delay}ms forwards`;
        durationOffset += duration;
      }
    }
  }
}

function opsToPath(opList: OpSet[]): string[] {
  const paths: string[] = [];
  for (const drawing of opList) {
    let path = '';
    for (const item of drawing.ops) {
      const data = item.data;
      switch (item.op) {
        case 'move':
          if (path.trim()) {
            paths.push(path.trim());
          }
          path = `M${data[0]} ${data[1]} `;
          break;
        case 'bcurveTo':
          path += `C${data[0]} ${data[1]}, ${data[2]} ${data[3]}, ${data[4]} ${data[5]} `;
          break;
        case 'lineTo':
          path += `L${data[0]} ${data[1]} `;
          break;
      }
    }
    if (path.trim()) {
      paths.push(path.trim());
    }
  }
  return paths;
}

// ---- upstream: src/rough-notation.ts ----
type AnnotationState = 'unattached' | 'not-showing' | 'showing';

class RoughAnnotationImpl implements RoughAnnotation {
  private _state: AnnotationState = 'unattached';
  private _config: RoughAnnotationConfig;
  private _resizing = false;
  private _ro?: any; // ResizeObserver is not supported in typescript std lib yet
  private _seed = randomSeed();

  private _e: HTMLElement;
  private _svg?: SVGSVGElement;
  private _lastSizes: Rect[] = [];

  _animationDelay = 0;

  constructor(e: HTMLElement, config: RoughAnnotationConfig) {
    this._e = e;
    this._config = JSON.parse(JSON.stringify(config));
    this.attach();
  }

  get animate() { return this._config.animate; }
  set animate(value) { this._config.animate = value; }

  get animationDuration() { return this._config.animationDuration; }
  set animationDuration(value) { this._config.animationDuration = value; }

  get iterations() { return this._config.iterations; }
  set iterations(value) { this._config.iterations = value; }

  get color() { return this._config.color; }
  set color(value) {
    if (this._config.color !== value) {
      this._config.color = value;
      this.refresh();
    }
  }

  get strokeWidth() { return this._config.strokeWidth; }
  set strokeWidth(value) {
    if (this._config.strokeWidth !== value) {
      this._config.strokeWidth = value;
      this.refresh();
    }
  }

  get padding() { return this._config.padding; }
  set padding(value) {
    if (this._config.padding !== value) {
      this._config.padding = value;
      this.refresh();
    }
  }

  private _resizeListener = () => {
    if (!this._resizing) {
      this._resizing = true;
      setTimeout(() => {
        this._resizing = false;
        if (this._state === 'showing') {
          if (this.haveRectsChanged()) {
            this.show();
          }
        }
      }, 400);
    }
  }

  private attach() {
    if (this._state === 'unattached' && this._e.parentElement) {
      ensureKeyframes();
      const svg = this._svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('class', 'rough-annotation');
      svg.setAttribute('aria-hidden', 'true'); // Labs: the marks are decoration
      const style = svg.style;
      style.position = 'absolute';
      style.top = '0';
      style.left = '0';
      style.overflow = 'visible';
      style.pointerEvents = 'none';
      style.width = '100px';
      style.height = '100px';
      const prepend = this._config.type === 'highlight';
      this._e.insertAdjacentElement(prepend ? 'beforebegin' : 'afterend', svg);
      this._state = 'not-showing';

      // ensure e is positioned
      if (prepend) {
        const computedPos = window.getComputedStyle(this._e).position;
        const unpositioned = (!computedPos) || (computedPos === 'static');
        if (unpositioned) {
          this._e.style.position = 'relative';
        }
      }
      this.attachListeners();
    }
  }

  private detachListeners() {
    window.removeEventListener('resize', this._resizeListener);
    if (this._ro) {
      this._ro.unobserve(this._e);
    }
  }

  private attachListeners() {
    this.detachListeners();
    window.addEventListener('resize', this._resizeListener, { passive: true });
    if ((!this._ro) && ('ResizeObserver' in window)) {
      this._ro = new (window as any).ResizeObserver((entries: any) => {
        for (const entry of entries) {
          if (entry.contentRect) {
            this._resizeListener();
          }
        }
      });
    }
    if (this._ro) {
      this._ro.observe(this._e);
    }
  }

  private haveRectsChanged(): boolean {
    if (this._lastSizes.length) {
      const newRects = this.rects();
      if (newRects.length === this._lastSizes.length) {
        for (let i = 0; i < newRects.length; i++) {
          if (!this.isSameRect(newRects[i], this._lastSizes[i])) {
            return true;
          }
        }
      } else {
        return true;
      }
    }
    return false;
  }

  private isSameRect(rect1: Rect, rect2: Rect): boolean {
    const si = (a: number, b: number) => Math.round(a) === Math.round(b);
    return (
      si(rect1.x, rect2.x) &&
      si(rect1.y, rect2.y) &&
      si(rect1.w, rect2.w) &&
      si(rect1.h, rect2.h)
    );
  }

  isShowing(): boolean {
    return (this._state !== 'not-showing');
  }

  private pendingRefresh?: Promise<void>;
  private refresh() {
    if (this.isShowing() && (!this.pendingRefresh)) {
      this.pendingRefresh = Promise.resolve().then(() => {
        if (this.isShowing()) {
          this.show();
        }
        delete this.pendingRefresh;
      });
    }
  }

  show(): void {
    switch (this._state) {
      case 'unattached':
        break;
      case 'showing':
        this.hide();
        if (this._svg) {
          this.render(this._svg, true);
        }
        break;
      case 'not-showing':
        this.attach();
        if (this._svg) {
          this.render(this._svg, false);
        }
        break;
    }
  }

  hide(): void {
    if (this._svg) {
      while (this._svg.lastChild) {
        this._svg.removeChild(this._svg.lastChild);
      }
    }
    this._state = 'not-showing';
  }

  remove(): void {
    if (this._svg && this._svg.parentElement) {
      this._svg.parentElement.removeChild(this._svg);
    }
    this._svg = undefined;
    this._state = 'unattached';
    this.detachListeners();
  }

  private render(svg: SVGSVGElement, ensureNoAnimation: boolean) {
    let config = this._config;
    if (ensureNoAnimation) {
      config = JSON.parse(JSON.stringify(this._config));
      config.animate = false;
    }
    const rects = this.rects();
    let totalWidth = 0;
    rects.forEach((rect) => totalWidth += rect.w);
    const totalDuration = (config.animationDuration || DEFAULT_ANIMATION_DURATION);
    let delay = 0;
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      const ad = totalDuration * (rect.w / totalWidth);
      renderAnnotation(svg, rects[i], config, delay + this._animationDelay, ad, this._seed);
      delay += ad;
    }
    this._lastSizes = rects;
    this._state = 'showing';
  }

  private rects(): Rect[] {
    const ret: Rect[] = [];
    if (this._svg) {
      if (this._config.multiline) {
        const elementRects = this._e.getClientRects();
        for (let i = 0; i < elementRects.length; i++) {
          ret.push(this.svgRect(this._svg, elementRects[i]));
        }
      } else {
        ret.push(this.svgRect(this._svg, this._e.getBoundingClientRect()));
      }
    }
    return ret;
  }

  private svgRect(svg: SVGSVGElement, bounds: DOMRect | DOMRectReadOnly): Rect {
    const rect1 = svg.getBoundingClientRect();
    const rect2 = bounds;
    const k = 100 / (rect1.width || 100); // Labs: the svg is styled 100px wide, so this undoes a CSS scale on an ancestor
    return {
      x: ((rect2.x || rect2.left) - (rect1.x || rect1.left)) * k,
      y: ((rect2.y || rect2.top) - (rect1.y || rect1.top)) * k,
      w: rect2.width * k,
      h: rect2.height * k
    };
  }
}

export function annotate(element: HTMLElement, config: RoughAnnotationConfig): RoughAnnotation {
  return new RoughAnnotationImpl(element, config);
}

export function annotationGroup(annotations: RoughAnnotation[]): RoughAnnotationGroup {
  let delay = 0;
  for (const a of annotations) {
    const ai = a as RoughAnnotationImpl;
    ai._animationDelay = delay;
    const duration = ai.animationDuration === 0 ? 0 : (ai.animationDuration || DEFAULT_ANIMATION_DURATION);
    delay += duration;
  }
  const list = [...annotations];
  return {
    show() {
      for (const a of list) {
        a.show();
      }
    },
    hide() {
      for (const a of list) {
        a.hide();
      }
    }
  };
}
