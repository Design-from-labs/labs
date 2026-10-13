// ---- upstream: src/drag-gesture.js ----
interface Sample {
  y: number;
  t: number;
}

class VelocityTracker {
  #samples: Sample[] = [];
  #windowMs: number;

  constructor(windowMs = 100) {
    this.#windowMs = windowMs;
  }

  add(y: number, t: number) {
    const _ = this;
    _.#samples.push({ y, t });

    const cutoff = t - _.#windowMs;
    while (_.#samples.length > 2 && _.#samples[0].t < cutoff) {
      _.#samples.shift();
    }
  }

  get velocity(): number {
    const samples = this.#samples;
    if (samples.length < 2) return 0;

    const last = samples[samples.length - 1];

    // Walk back from the newest sample and stop at the first reversal.
    // Averaging the whole window instead would keep reporting the direction
    // a gesture came from: pull a fast upward drag back down and lift, and
    // the window still reads upward, so the sheet leaves in the opposite
    // direction to the finger that released it. Zero-length steps are
    // skipped rather than treated as a turn — a slow drag quantises to
    // them constantly.
    let direction = 0;
    let start = samples.length - 1;
    while (start > 0) {
      const step = Math.sign(samples[start].y - samples[start - 1].y);
      if (step !== 0) {
        if (direction === 0) direction = step;
        else if (step !== direction) break;
      }
      start--;
    }

    const first = samples[start];
    const deltaTime = last.t - first.t;

    return deltaTime === 0 ? 0 : (last.y - first.y) / deltaTime;
  }

  reset() {
    this.#samples = [];
  }
}

// Movement, in pixels, that separates a tap from a drag. Below this the
// pointer stays uncaptured so clicks compose on whatever the user pressed.
const SLOP = 5;

interface DragStartInfo {
  event: PointerEvent;
  y: number;
}

interface DragMoveInfo {
  event: PointerEvent;
  deltaY: number;
  moveY: number;
  direction: "up" | "down";
  velocityY: number;
}

interface DragEndInfo {
  event: PointerEvent;
  deltaY: number;
  velocityY: number;
  duration: number;
  cancelled: boolean;
}

interface DragCallbacks {
  onStart?: (info: DragStartInfo) => void;
  onMove?: (info: DragMoveInfo) => void;
  onEnd?: (info: DragEndInfo) => void;
}

type PointerHandler = (event: PointerEvent) => void;

class DragGesture {
  #active = false;
  #captured = false;
  #el: HTMLElement;
  #handlers: Record<
    "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
    PointerHandler
  >;
  #onStart?: DragCallbacks["onStart"];
  #onMove?: DragCallbacks["onMove"];
  #onEnd?: DragCallbacks["onEnd"];
  #pointerId: number | null = null;
  #startY = 0;
  #lastY = 0;
  #startTime = 0;
  #tracker = new VelocityTracker();

  constructor(el: HTMLElement, { onStart, onMove, onEnd }: DragCallbacks = {}) {
    const _ = this;
    this.#el = el;
    _.#onStart = onStart;
    _.#onMove = onMove;
    _.#onEnd = onEnd;
    this.#handlers = {
      pointerdown: _.#handlePointerDown.bind(_),
      pointermove: _.#handlePointerMove.bind(_),
      pointerup: (event) => _.#handlePointerEnd(event, false),
      pointercancel: (event) => _.#handlePointerEnd(event, true),
    };

    for (const [type, handler] of Object.entries(_.#handlers)) {
      el.addEventListener(type, handler as EventListener);
    }
  }

  #handlePointerDown(event: PointerEvent) {
    const _ = this;
    // A captured gesture is guaranteed its own pointerup, so never let a
    // second pointer interrupt it. An uncaptured one may have been
    // abandoned outside the element, so allow it to be restarted.
    if (!event.isPrimary || (_.#active && _.#captured)) return;

    _.#active = true;
    _.#captured = false;
    _.#pointerId = event.pointerId;
    _.#startY = event.clientY;
    _.#lastY = event.clientY;
    _.#startTime = event.timeStamp;
    _.#tracker.reset();
    _.#tracker.add(event.clientY, event.timeStamp);
    // Deliberately no setPointerCapture here. Capturing on pointerdown
    // retargets pointerup to this element, so the browser composes the
    // click on it instead of the button the user pressed — which silently
    // breaks every interactive child of a drag surface.
    _.#onStart?.({ event, y: event.clientY });
  }

  #handlePointerMove(event: PointerEvent) {
    const _ = this;
    if (!_.#active || event.pointerId !== _.#pointerId) return;

    const deltaY = event.clientY - _.#startY;
    // deltaY is cumulative, so its sign only ever reports where the pointer
    // sits relative to where it started. moveY reports which way it is
    // travelling right now, which is what a mid-gesture handoff needs.
    const moveY = event.clientY - _.#lastY;
    _.#lastY = event.clientY;

    // Once the pointer has clearly moved this is a drag, not a tap, so
    // capture to keep receiving events if it leaves the element.
    if (!_.#captured && Math.abs(deltaY) > SLOP) {
      _.#captured = true;
      _.#el.setPointerCapture?.(event.pointerId);
    }

    _.#tracker.add(event.clientY, event.timeStamp);
    _.#onMove?.({
      event,
      deltaY,
      moveY,
      direction: deltaY < 0 ? "up" : "down",
      velocityY: _.#tracker.velocity,
    });
  }

  #handlePointerEnd(event: PointerEvent, cancelled: boolean) {
    const _ = this;
    if (!_.#active || event.pointerId !== _.#pointerId) return;

    _.#active = false;
    _.#captured = false;
    // The release is itself a sample. A stationary pointer fires no
    // pointermove, so without this the window never ages past the last
    // motion and a finger that stopped dead still reports a full flick.
    _.#tracker.add(event.clientY, event.timeStamp);
    _.#onEnd?.({
      event,
      deltaY: event.clientY - _.#startY,
      velocityY: cancelled ? 0 : _.#tracker.velocity,
      duration: event.timeStamp - _.#startTime,
      cancelled,
    });
    _.#pointerId = null;
  }

  /**
   * Abandons a gesture in place, leaving the element ready for a fresh one.
   *
   * Deliberately silent: onEnd is never fired. This exists for a teardown the
   * user did not ask for — the surface is being closed out from under a finger
   * that has not lifted — and every release rule downstream would otherwise act
   * on a lift that never happened.
   */
  cancel() {
    const _ = this;

    // An uncaptured pointer never took capture, and a released one may
    // already have had it taken away, so this can legitimately throw
    if (_.#captured && _.#pointerId !== null) {
      try {
        _.#el.releasePointerCapture?.(_.#pointerId);
      } catch {
        // nothing left to release
      }
    }

    _.#active = false;
    _.#captured = false;
    _.#pointerId = null;
    _.#tracker.reset();
  }

  destroy() {
    const _ = this;
    for (const [type, handler] of Object.entries(_.#handlers)) {
      _.#el.removeEventListener(type, handler as EventListener);
    }
    _.cancel();
  }
}

export { DragGesture, VelocityTracker };
export type { DragCallbacks, DragEndInfo, DragMoveInfo, DragStartInfo };
