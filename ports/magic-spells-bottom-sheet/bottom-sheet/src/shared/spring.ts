// ---- upstream: @magic-spells/physics-engine 1.0.0, dist/physics-engine.esm.js ----
// The spring the sheet settles on, rewritten in TypeScript from the published
// build that bottom-sheet bundles (its only runtime dependency). The
// arithmetic is unchanged; the generic event emitter it extends is reduced to
// the two listeners the sheet uses (change, complete).
//
// physics-engine carries its own notice, kept here with its logic:
//
//   MIT License
//
//   Copyright (c) 2026 Cory Schulz @ Magic Spells
//
//   Permission is hereby granted, free of charge, to any person obtaining a copy
//   of this software and associated documentation files (the "Software"), to deal
//   in the Software without restriction, including without limitation the rights
//   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//   copies of the Software, and to permit persons to whom the Software is
//   furnished to do so, subject to the following conditions:
//
//   The above copyright notice and this permission notice shall be included in all
//   copies or substantial portions of the Software.
//
//   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
//   SOFTWARE.

interface SpringOptions {
  /** Pull toward the target per 60fps frame, 0 < attraction < 1. */
  attraction?: number;
  /** Speed bled off per 60fps frame, 0 < friction < 1. */
  friction?: number;
}

interface SpringFrame {
  position: number;
  progress: number;
}

type SpringListener = (frame: SpringFrame) => void;

const inRange = (value: number) =>
  Number.isFinite(value) && value > 0 && value < 1;

/**
 * A damped spring integrated once per animation frame. `velocity` is in units
 * per 60fps frame (16.66 ms), not per millisecond.
 */
class SpringEngine {
  #attraction: number;
  #retain: number;
  #velocity = 0;
  #position = 0;
  #target = 0;
  #lastTime: number | null = null;
  #generation = 0;
  isAnimating = false;
  onChange: SpringListener | null = null;
  onComplete: SpringListener | null = null;

  constructor({ attraction = 0.026, friction = 0.28 }: SpringOptions = {}) {
    if (!inRange(attraction)) {
      throw new Error(
        "Attraction must be a number between 0 and 1 (exclusive).",
      );
    }
    if (!inRange(friction)) {
      throw new Error("Friction must be a number between 0 and 1 (exclusive).");
    }
    this.#attraction = attraction;
    this.#retain = 1 - friction;
  }

  /**
   * Animates from a start value to an end value.
   * @param start - The starting value.
   * @param end - The target value.
   * @param velocity - Initial velocity, in units per 60fps frame.
   */
  animateTo(start: number, end: number, velocity = 0) {
    if (!Number.isFinite(start))
      throw new Error("startValue must be a finite number.");
    if (!Number.isFinite(end))
      throw new Error("endValue must be a finite number.");
    if (!Number.isFinite(velocity))
      throw new Error("velocity must be a finite number.");
    // A new run supersedes the current one without announcing a stop
    if (this.isAnimating) this.isAnimating = false;
    if (start === end && velocity === 0) {
      this.onChange?.({ position: end, progress: 1 });
      this.onComplete?.({ position: end, progress: 1 });
      return;
    }
    this.#position = start;
    this.#target = end;
    this.#velocity = velocity;
    this.isAnimating = true;
    this.#lastTime = null;
    const generation = ++this.#generation;

    const frame = (time: number) => {
      if (generation !== this.#generation || !this.isAnimating) return;
      if (this.#lastTime === null) {
        this.#lastTime = time;
        requestAnimationFrame(frame);
        return;
      }
      // Frame-rate independent: one step per 60fps frame, capped so a
      // backgrounded tab does not jump the sheet in a single step.
      const steps = Math.min(time - this.#lastTime, 64) / 16.66;
      this.#lastTime = time;
      const pull = (this.#target - this.#position) * this.#attraction;
      this.#velocity += pull * steps;
      this.#velocity *= this.#retain ** steps;
      this.#position += this.#velocity * steps;
      const span = this.#target - start;
      const progress = span !== 0 ? (this.#position - start) / span : 0;
      this.onChange?.({ position: this.#position, progress });
      if (
        Math.abs(this.#position - this.#target) < 0.01 &&
        Math.abs(this.#velocity) < 0.01
      ) {
        this.isAnimating = false;
        this.onChange?.({ position: this.#target, progress: 1 });
        this.onComplete?.({ position: this.#target, progress: 1 });
        return;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /** Stops the ongoing animation without completing it. */
  stop() {
    if (!this.isAnimating) return;
    this.isAnimating = false;
    this.#generation++;
  }

  removeAllListeners() {
    this.onChange = null;
    this.onComplete = null;
  }
}

export { SpringEngine };
export type { SpringFrame, SpringOptions };
