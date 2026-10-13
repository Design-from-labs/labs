/*
 * Ported from bnpne/page-transitions-with-webgpu-vanilla-js (src/carousel.js)
 * at commit 70e5c0eafb14. Changes: the wheel listener and the viewport are the
 * component's box (`host`), not the window; listeners are removed with the
 * same options they were added with.
 *
 * Copyright (c) 2009 - 2025 Codrops. MIT License; the full notice ends this file.
 */

const LERP = 0.1;
const GAP_PX = 48;

export class Carousel {
  slots: HTMLElement[];
  host: HTMLElement;
  scrollX = 0;
  targetScrollX = 0;
  cellW = 0;
  stepX = 0;
  periodX = 0;
  velocity = 0; // signed px/frame the carousel moved this tick

  constructor(rootEl: Element, host: HTMLElement) {
    this.slots = Array.from(rootEl.querySelectorAll<HTMLElement>(".slot"));
    this.host = host;
    this.onWheel = this.onWheel.bind(this);
  }

  prepare() {
    this.measure();
    void this.slots[0]?.offsetHeight;
    this.applyTransforms();
  }

  start() {
    this.prepare();
    this.host.addEventListener("wheel", this.onWheel, {
      capture: true,
      passive: false,
    });
  }

  stop() {
    this.host.removeEventListener("wheel", this.onWheel, { capture: true });
  }

  measure() {
    this.cellW = this.slots[0]?.offsetWidth ?? 0;
    this.stepX = this.cellW + GAP_PX;
    this.periodX = this.slots.length * this.stepX;
  }

  onWheel(e: WheelEvent) {
    e.preventDefault();
    e.stopImmediatePropagation();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    this.targetScrollX += delta;
  }

  /** Moves by whole slots (the keyboard's way to scroll the carousel). */
  nudge(slots: number) {
    this.targetScrollX += slots * this.stepX;
  }

  applyTransforms() {
    const vw = this.host.clientWidth;
    const vh = this.host.clientHeight;
    const half = this.periodX / 2;
    const c = Math.floor(this.slots.length / 2);
    for (let i = 0; i < this.slots.length; i++) {
      let relX = (i - c) * this.stepX - this.scrollX;
      relX = ((relX % this.periodX) + this.periodX) % this.periodX;
      if (relX >= half) relX -= this.periodX;
      const cellH = this.slots[i].offsetHeight;
      const x = vw / 2 + relX - this.cellW / 2;
      const y = vh / 2 - cellH / 2;
      this.slots[i].style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  tick() {
    const prev = this.scrollX;
    this.scrollX += (this.targetScrollX - this.scrollX) * LERP;
    this.velocity = this.scrollX - prev;
    this.applyTransforms();
  }
}
