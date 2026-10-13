import { DragGesture } from "./drag-gesture";
import { parseSnapPoints, resolveSnapTarget, SNAP_EPSILON } from "./snap-points";
import { SpringEngine } from "./spring";

// ---- upstream: src/bottom-sheet.js ----
// The gesture and snap logic of the <bottom-sheet> custom element, kept line
// for line as a plain class so every dialog layer (the native <dialog>, Radix,
// Base UI, React Aria) drives the same code. What the element read from its
// attributes arrives through setters; what it read from its parent
// <dialog-panel> arrives through the `SheetPanel` interface; its children are
// registered by the React parts (`setSurface`). Inline styles and the
// `data-transitioning` / `data-snapping` flags (upstream: the `transitioning`
// and `snapping` classes) are written straight to the DOM, never through React
// state, so a drag never re-renders.

// PhysicsEngine integrates once per 60fps frame — its `velocity` is units per
// frame, not per millisecond. DragGesture reports px/ms, so every release
// velocity handed to the spring has to cross this scale first. Getting it wrong
// is silent: the spring still runs, it just settles at ~17x the wrong speed.
const FRAME_MS = 16.66;

// The tracker measures the last stretch of a finger that is already slowing
// into its release, so the number it reports reads slightly slower than the
// throw felt. A small boost hands the spring the intent rather than the
// measurement. Kept separate from FRAME_MS: that one is a unit conversion and
// is not a matter of taste, this one is.
const VELOCITY_BOOST = 1.1;

/** The dialog layer's lifecycle, mirrored as `data-sheet-state`. */
type SheetState = "hidden" | "showing" | "shown" | "hiding";

/** What the sheet needs from the dialog layer (upstream: <dialog-panel>). */
interface SheetPanel {
  readonly state: SheetState;
  readonly isOpen: boolean;
  show(trigger?: HTMLElement | null): boolean;
  hide(trigger?: HTMLElement | null): boolean;
}

/** The detail of a lifecycle event (upstream: CustomEvent detail). */
interface SheetEventDetail {
  state: SheetState;
  triggerElement: HTMLElement | null;
  result: string | null;
}

/** A lifecycle event; `preventDefault()` cancels beforeShow and beforeHide. */
interface SheetLifecycleEvent extends SheetEventDetail {
  type: "beforeShow" | "shown" | "beforeHide" | "hidden";
  cancelable: boolean;
  defaultPrevented: boolean;
  preventDefault(): void;
}

type LifecycleListener = (event: SheetLifecycleEvent) => void;

type Surface = "header" | "content" | "footer";

interface SnapChangeDetail {
  from: number | null;
  to: number;
}

interface DragState {
  active: boolean;
  claimed?: boolean;
  claimOffset?: number;
  startHeight?: number;
  belowLowest?: number;
}

const IDENTITY = [
  "none",
  "matrix(1,0,0,1,0,0)",
  "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)",
];

const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

const flag = (el: HTMLElement | null, name: string, on: boolean) => {
  if (!el) return;
  if (on) el.setAttribute(`data-${name}`, "");
  else el.removeAttribute(`data-${name}`);
};

/**
 * Manages drag gestures and snap points, and delegates show and hide to the
 * dialog layer. `surface` returns the element that moves (upstream: the
 * <dialog>).
 */
class SheetController {
  #gestures = new Map<Surface, DragGesture>();
  #parts: Record<Surface, HTMLElement | null> = {
    header: null,
    content: null,
    footer: null,
  };
  #drag: DragState = { active: false };
  #scrollVeto: ((event: TouchEvent) => void) | null = null;
  #connected = false;

  // physics constants
  #overscrollResistance = 0.1;
  #dragThreshold = 100;
  #flickVelocity = 0.5;

  // private backing fields
  #maxDisplayWidth = Number.POSITIVE_INFINITY;
  #snapPoints: number[] = [];
  #snap: number | null = null;
  #spring: string | null = null;

  // Spring settling, on by default. Built on the first settle rather than at
  // construction, so a sheet that never snaps never makes one.
  #engine: SpringEngine | null = null;
  #springTarget: number | null = null;

  #surface: () => HTMLElement | null;
  #panel: SheetPanel;
  #onSnapChange: (detail: SnapChangeDetail) => void;

  constructor(options: {
    surface: () => HTMLElement | null;
    panel: SheetPanel;
    onSnapChange?: (detail: SnapChangeDetail) => void;
  }) {
    this.#surface = options.surface;
    this.#panel = options.panel;
    this.#onSnapChange = options.onSnapChange ?? (() => {});
  }

  get dialog(): HTMLElement | null {
    return this.#surface();
  }

  /** Whether connect() has bound the listeners (the surface is mounted). */
  get connected(): boolean {
    return this.#connected;
  }

  get panel(): SheetPanel {
    return this.#panel;
  }

  get content(): HTMLElement | null {
    return this.#parts.content;
  }

  // ---- attributes (upstream: observedAttributes) --------------------------

  /**
   * The maximum viewport width, in pixels, where the sheet is shown.
   * Infinity removes the limit.
   */
  get maxDisplayWidth(): number {
    return this.#maxDisplayWidth;
  }

  set maxDisplayWidth(value: number | null | undefined) {
    this.#maxDisplayWidth =
      value === null || value === undefined || !Number.isFinite(value)
        ? Number.POSITIVE_INFINITY
        : value;
  }

  /** The declared snap points: ascending dvh percentages; empty when binary. */
  get snapPoints(): number[] {
    return [...this.#snapPoints];
  }

  set snapPoints(value: string | readonly number[] | null | undefined) {
    const _ = this;
    const next = parseSnapPoints(value);
    if (next.join(",") === _.#snapPoints.join(",")) return;
    _.#snapPoints = next;
    // Never written internally, so any change here is the author's and
    // supersedes a settle — whose destination may not even be declared
    // any more.
    _.#supersedeSettle();
  }

  /**
   * The snap the sheet is currently resting at. Reflects only on commit,
   * so it holds the last settled value for the duration of a drag.
   */
  get snap(): number | null {
    return this.#activeSnap;
  }

  /** An author retargeting the sheet; wins over a settle in flight. */
  set snap(value: number | null | undefined) {
    const _ = this;
    const parsed = Number(value);
    const next =
      value !== null && value !== undefined && Number.isFinite(parsed)
        ? parsed
        : null;
    // The reflection of a committed snap arrives back here unchanged (a
    // controlled `snap` prop), and must not cancel the settle it started.
    if (next === _.#snap) return;
    _.#snap = next;
    _.#supersedeSettle();
  }

  /**
   * Spring tuning: null (default tuning), "none" (CSS settle) or
   * "attraction,friction".
   */
  set spring(value: string | null | undefined) {
    const _ = this;
    const next = value ?? null;
    if (next === _.#spring) return;
    _.#spring = next;
    // Drop the engine rather than rebuilding here. The next settle
    // reconstructs it with the new tuning, which keeps this setter out
    // of the business of knowing whether one is currently running.
    _.#supersedeSettle();
    _.#engine = null;
  }

  /**
   * Whether the sheet settles on a spring. On by default — "none"
   * is the opt-out, matching how `max-display-width` spells the same idea.
   */
  get #springEnabled(): boolean {
    // Reduced motion settles on the CSS clock, which that media query
    // turns into a jump: no travel, no bounce.
    return this.#spring !== "none" && !reducedMotion();
  }

  /**
   * The engine, built on first use and rebuilt whenever the tuning changes.
   * Lazy rather than eager because snap points can be set at any time, and
   * a sheet that never settles should never construct one.
   */
  #ensureEngine(): SpringEngine {
    const _ = this;
    if (_.#engine) return _.#engine;

    const [attraction, friction] = String(_.#spring ?? "")
      .split(/[\s,]+/)
      .map(Number);

    // Attraction pulls toward the snap; friction bleeds off the speed that
    // pull builds. Raising both together is not a wash — friction is applied
    // every frame and wins, so 0.065/0.30 damps harder than 0.034/0.22
    // despite the stronger pull. A snap-to-snap move reaches the snap in
    // ~270ms and overshoots ~2.4% of the gap it travelled, so the sheet
    // arrives with a small bounce rather than easing to a dead stop.
    const options = { attraction: 0.065, friction: 0.3 };
    if (Number.isFinite(attraction) && attraction > 0 && attraction < 1) {
      options.attraction = attraction;
    }
    if (Number.isFinite(friction) && friction > 0 && friction < 1) {
      options.friction = friction;
    }

    const engine = new SpringEngine(options);
    _.#engine = engine;

    engine.onChange = ({ position }) => {
      const dialog = _.dialog;
      // A gesture that starts mid-settle owns the height from then on
      if (dialog && !_.#drag.active) dialog.style.height = `${position}px`;
    };

    engine.onComplete = () => {
      // Cleared first: #applyRestingHeight refuses to write while a settle
      // is still marked as running, which is what keeps the attribute
      // reflection from clobbering the spring mid-flight.
      if (_.#springTarget === null) return;
      _.#springTarget = null;
      _.#applyRestingHeight();
    };

    return engine;
  }

  /** Halts a running settle without letting its completion write a height */
  #stopSpring() {
    this.#springTarget = null;
    this.#engine?.stop();
  }

  /**
   * Hands a settle back to the resting snap because external state has moved
   * out from under it.
   *
   * The engine emits `stop` rather than `complete` when it is halted, so
   * nothing restores the height on its own — stopping alone stranded the sheet
   * at whatever pixel the last frame happened to write, with `snap` reporting
   * a value the sheet was not at. Finishing on the CSS clock keeps the
   * interruption visible rather than teleporting.
   */
  #supersedeSettle() {
    const _ = this;
    const wasSettling = _.#springTarget !== null;

    _.#stopSpring();
    if (wasSettling) {
      flag(_.dialog, "transitioning", true);
      flag(_.dialog, "snapping", true);
    }
    _.#applyRestingHeight();
  }

  /**
   * Animates the sheet to a declared snap point. Undeclared values are ignored.
   * @param value - A snap in dvh percent
   */
  snapTo(value: number) {
    const _ = this;
    const target = Number(value);
    if (!_.#snapPoints.includes(target)) return;

    flag(_.dialog, "transitioning", true);
    _.#commitSnap(target);
  }

  /**
   * The snap currently in effect, falling back to the shortest declared snap
   * when the author has not pinned one
   */
  get #activeSnap(): number | null {
    const _ = this;
    if (!_.#snapPoints.length) return null;
    if (_.#snap !== null && _.#snapPoints.includes(_.#snap)) return _.#snap;

    return _.#snapPoints[0];
  }

  // ---- panel lifecycle (upstream: beforeShow / beforeHide listeners) -------

  /** Called by the dialog layer before it starts showing. */
  beforeShow() {
    const _ = this;
    // Restore the resting height before the transition is armed, so a
    // sheet reopened after a drag-dismiss opens at its snap rather
    // than animating out to it.
    _.#applyRestingHeight();
    // An open travels the full sheet height, so it keeps the shared
    // duration even if the last settle was interrupted by the hide.
    flag(_.dialog, "snapping", false);
    flag(_.dialog, "transitioning", true);
  }

  /**
   * Called by the dialog layer when a close is announced. Escape, a backdrop
   * tap and every close button close through the dialog layer and never
   * reach hide(), so this is the only place those closes can be cleaned up
   * after.
   *
   * The work cannot happen here. The announcement is cancelable, and a
   * refused close must leave a running settle alone — tearing one down on the
   * announcement rather than the verdict is the same bug hide() already
   * carries a note about. The dialog layer sets its state synchronously as
   * soon as the announcement returns, so a microtask is the earliest point
   * the verdict can be read.
   */
  beforeHide() {
    queueMicrotask(() => {
      if (!this.#connected || this.#panel.state !== "hiding") return;
      this.#teardownForClose();
    });
  }

  /**
   * Shows the bottom sheet via the dialog layer
   * @param triggerEl - The element that triggered the show
   */
  show(triggerEl?: HTMLElement | null): boolean {
    const _ = this;
    if (window.innerWidth > _.maxDisplayWidth) return false;
    return _.#panel.show(triggerEl ?? null);
  }

  /**
   * Hides the bottom sheet via the dialog layer.
   *
   * The panel is asked first, because it can refuse — a `beforeHide` handler
   * may cancel, and it also rejects a close that arrives while the sheet is
   * still opening. Tearing the settle down before asking left a refused close
   * with a dead spring and the drag's inline pixels still on the dialog, so
   * the sheet stayed frozen wherever the last frame had painted it.
   *
   * @returns False if the panel refused the close
   */
  hide(): boolean {
    const _ = this;
    const accepted = _.#panel.hide();
    const dialog = _.dialog;

    if (accepted === false) {
      // Refused. Undo the gesture rather than the settle: a spring that is
      // still running owns the height and will land on its own.
      if (dialog && _.#springTarget === null) {
        flag(dialog, "transitioning", true);
        dialog.style.transform = "";
      }
      if (_.#springTarget === null) _.#applyRestingHeight();
      return false;
    }

    // A close is a state transition, not a settle — let go of the height
    _.#stopSpring();
    // Clear any inline transform from drag gestures so CSS state transitions work.
    // The inline height stays put — the hiding transform is a percentage of it.
    if (dialog) {
      dialog.style.transform = "";
      // A dismiss is a close, not a settle. Left on, this would outrank
      // the hiding rule and close the sheet at the snap duration.
      flag(dialog, "snapping", false);
    }
    return true;
  }

  /**
   * Hands the sheet back to the panel for a close it did not start.
   *
   * Idempotent by construction — stopping a stopped spring, clearing a cleared
   * transform and removing an absent flag are all no-ops — because a close
   * that does come through hide() announces itself as well and runs this a
   * second time.
   *
   * `transitioning` is deliberately left alone: the hiding rule carries its
   * own transition, and removing the flag mid-close would strand a snap-back
   * that was already running under it.
   */
  #teardownForClose() {
    const _ = this;

    // A settle must not keep writing heights into a closing sheet
    _.#stopSpring();

    // An interrupted gesture never gets its pointerup, so nothing else would
    // ever clear it — and its inline transform sits on top of the exit.
    for (const gesture of _.#gestures.values()) {
      gesture.cancel();
    }
    _.#drag = { active: false };

    const dialog = _.dialog;
    if (dialog) {
      dialog.style.transform = "";
      // Left on, the snap pacing outranks the hiding rule and the close
      // silently runs at the settle's duration.
      flag(dialog, "snapping", false);
    }
  }

  // ---- connection (upstream: connectedCallback / disconnectedCallback) ----

  #windowResize = () => {
    if (window.innerWidth > this.maxDisplayWidth && this.#panel.isOpen) {
      this.hide();
    }
  };

  #transitionEnd = (e: TransitionEvent) => {
    const _ = this;
    const dialog = _.dialog;
    if (
      e.target === dialog &&
      (e.propertyName === "transform" || e.propertyName === "height")
    ) {
      // A settle's height event can arrive after hiding starts; its
      // cleanup must not cancel the close's transform transition.
      if (e.propertyName === "height" && _.#panel.state === "hiding") {
        return;
      }
      flag(dialog, "transitioning", false);
      flag(dialog, "snapping", false);
    }
  };

  #boundDialog: HTMLElement | null = null;

  /** Binds window and dialog listeners; call once the surface is mounted. */
  connect() {
    const _ = this;
    if (_.#connected) return;
    _.#connected = true;
    window.addEventListener("resize", _.#windowResize);
    _.#boundDialog = _.dialog;
    _.#boundDialog?.addEventListener(
      "transitionend",
      _.#transitionEnd as EventListener,
    );
    for (const surface of Object.keys(_.#parts) as Surface[]) {
      _.#bindSurface(surface);
    }
    // Attributes parsed before connection could not reach the dialog
    _.#applyRestingHeight();
  }

  disconnect() {
    const _ = this;
    if (!_.#connected) return;
    _.#connected = false;
    window.removeEventListener("resize", _.#windowResize);
    for (const surface of Object.keys(_.#parts) as Surface[]) {
      _.#unbindSurface(surface);
    }
    _.#drag = { active: false };
    // Leaves no rAF loop running against a detached dialog
    _.#stopSpring();
    _.#engine?.removeAllListeners();
    _.#engine = null;
    _.#boundDialog?.removeEventListener(
      "transitionend",
      _.#transitionEnd as EventListener,
    );
    _.#boundDialog = null;
  }

  /** Registers a header, content or footer element (null to remove it). */
  setSurface(surface: Surface, el: HTMLElement | null) {
    const _ = this;
    if (_.#parts[surface] === el) return;
    _.#unbindSurface(surface);
    _.#parts[surface] = el;
    if (_.#connected) _.#bindSurface(surface);
  }

  #bindSurface(surface: Surface) {
    const _ = this;
    const el = _.#parts[surface];
    if (!el || _.#gestures.has(surface)) return;
    _.#gestures.set(
      surface,
      new DragGesture(el, {
        onStart: () => _.#dragStart(),
        onMove: (info) => _.#dragMove(surface, info),
        onEnd: (info) => _.#dragEnd(surface, info),
      }),
    );
    if (surface === "content") {
      _.#scrollVeto = (event: TouchEvent) => {
        if (_.#drag.active && _.#drag.claimed && event.cancelable) {
          event.preventDefault();
        }
      };
      el.addEventListener("touchmove", _.#scrollVeto, { passive: false });
    }
  }

  #unbindSurface(surface: Surface) {
    const _ = this;
    _.#gestures.get(surface)?.destroy();
    _.#gestures.delete(surface);
    if (surface === "content" && _.#scrollVeto) {
      _.#parts.content?.removeEventListener("touchmove", _.#scrollVeto);
      _.#scrollVeto = null;
    }
  }

  /**
   * Writes the current snap to the dialog as a dvh height. Keeping the resting
   * value in dvh rather than pixels is what makes viewport resizes free.
   */
  #applyRestingHeight() {
    const _ = this;
    const dialog = _.dialog;
    if (!dialog) return;
    // A running settle owns the height frame by frame. Without this the
    // snap reflection fired by #commitSnap would immediately overwrite the
    // spring's first frame with the destination and skip the animation.
    if (_.#springTarget !== null) return;

    const snap = _.#activeSnap;
    dialog.style.height = snap === null ? "" : `${snap}dvh`;
  }

  /** Resolves the declared snaps to pixels against the current viewport */
  #snapsPx(): number[] {
    return this.#snapPoints.map((value) => (value / 100) * window.innerHeight);
  }

  #dragStart() {
    const _ = this;
    // A settle in flight loses the sheet to the finger, and must not keep
    // writing heights underneath the drag.
    _.#stopSpring();

    const dialog = _.dialog;
    // Measured while the transition is still armed. A settling sheet already
    // carries its destination in the inline height and is only painted part
    // way there, so this has to be read before that transition is dropped.
    const startHeight = dialog?.getBoundingClientRect().height ?? 0;

    if (dialog && _.#snapPoints.length) {
      // Pin the height the sheet is actually painted at. Dropping
      // `transitioning` below cancels a running settle, which renders the
      // inline destination immediately — so grabbing a moving sheet would
      // otherwise jump it to the target snap and then back to the finger
      // on the first move.
      dialog.style.height = `${startHeight}px`;
    }

    const computedTransform = dialog
      ? window.getComputedStyle(dialog).transform
      : "";
    const normalizedTransform = computedTransform?.replace(/\s+/g, "");
    if (
      dialog &&
      computedTransform &&
      !IDENTITY.includes(normalizedTransform)
    ) {
      dialog.style.transform = computedTransform;
    }

    _.#drag = {
      active: true,
      claimed: false,
      // Distance already travelled when the panel took the gesture over, so
      // a mid-gesture handoff starts from zero instead of jumping.
      claimOffset: 0,
      startHeight,
      belowLowest: 0,
    };
    flag(dialog, "transitioning", false);
    flag(dialog, "snapping", false);
  }

  /** Applies resistance to a drag value to create a rubber-band effect */
  #applyResistance(value: number): number {
    return Math.sqrt(value) * 10 * this.#overscrollResistance;
  }

  /**
   * Decides whether the panel takes a gesture over from the content scroller.
   * Re-evaluated on every move until it succeeds, so the handoff can happen
   * part way through a single continuous drag.
   * @param surface - The surface the gesture started on
   * @param moveY - Instantaneous travel, positive downward
   */
  #shouldClaim(surface: Surface, moveY: number): boolean {
    const _ = this;
    // Header and footer are dedicated drag surfaces
    if (surface !== "content") return true;
    if (moveY === 0) return false;

    // Downward: hand off exactly when the list runs out of scroll
    if (moveY > 0) return _.content?.scrollTop === 0;

    // Upward: below the tallest snap, growing the sheet beats scrolling a
    // sliver of content. At the tallest snap there is nowhere to grow, so
    // the gesture stays with the scroller — as does a sheet with no snaps.
    const snaps = _.#snapPoints;
    const active = _.#activeSnap;
    return snaps.length > 0 && active !== null && active < snaps[snaps.length - 1];
  }

  #dragMove(surface: Surface, { deltaY, moveY }: { deltaY: number; moveY: number }) {
    const _ = this;
    const drag = _.#drag;

    if (!drag.active) return;

    if (!drag.claimed) {
      if (!_.#shouldClaim(surface, moveY)) return;
      drag.claimed = true;
      drag.claimOffset = deltaY;
    }

    const travel = deltaY - (drag.claimOffset ?? 0);

    if (_.#snapPoints.length) {
      _.#moveBySnap(travel);
    } else {
      _.#moveByTransform(travel);
    }
  }

  /**
   * Drives a snapping sheet by its height, so the footer stays pinned and the
   * scroll region always matches what is actually on screen
   * @param travel - Claimed drag distance, positive downward
   */
  #moveBySnap(travel: number) {
    const _ = this;
    const dialog = _.dialog;
    if (!dialog) return;

    const snapsPx = _.#snapsPx();
    const minPx = snapsPx[0];
    const maxPx = snapsPx[snapsPx.length - 1];
    const height = (_.#drag.startHeight ?? 0) - travel;

    if (height > maxPx) {
      // Past the tallest snap the sheet stops tracking the pointer
      dialog.style.height = `${maxPx + _.#applyResistance(height - maxPx)}px`;
      dialog.style.transform = "";
      _.#drag.belowLowest = 0;
      return;
    }

    if (height < minPx) {
      // Below the shortest snap this stops being a resize and becomes the
      // dismiss gesture, on the same transform path a binary sheet uses.
      const below = minPx - height;
      dialog.style.height = `${minPx}px`;
      dialog.style.transform = `translate3d(0, ${below}px, 0)`;
      _.#drag.belowLowest = below;
      return;
    }

    dialog.style.height = `${height}px`;
    dialog.style.transform = "";
    _.#drag.belowLowest = 0;
  }

  /**
   * Drives a binary sheet by transform alone
   * @param travel - Claimed drag distance, positive downward
   */
  #moveByTransform(travel: number) {
    const _ = this;
    const dialog = _.dialog;
    if (!dialog) return;

    if (travel < 0) {
      const resisted = _.#applyResistance(-travel);
      dialog.style.transform = `translate3d(0, ${-resisted}px, 0)`;
    } else {
      dialog.style.transform = `translate3d(0, ${travel}px, 0)`;
    }
  }

  #dragEnd(
    _surface: Surface,
    {
      deltaY,
      velocityY,
      cancelled,
    }: { deltaY: number; velocityY: number; cancelled: boolean },
  ) {
    const _ = this;
    const drag = _.#drag;

    if (!drag.active) return;
    _.#drag = { active: false };

    flag(_.dialog, "transitioning", true);

    if (!drag.claimed) {
      // A press that never became a drag still pinned the painted height
      // and transform, so hand both back to their CSS destinations.
      if (_.dialog) _.dialog.style.transform = "";
      _.#applyRestingHeight();
      return;
    }

    if (_.#snapPoints.length) {
      _.#releaseToSnap(drag, velocityY, cancelled);
      return;
    }

    const travel = deltaY - (drag.claimOffset ?? 0);
    const flick = !cancelled && velocityY > _.#flickVelocity;
    const pastThreshold =
      !cancelled && travel > _.#dragThreshold && velocityY > -0.05;

    if (flick || pastThreshold) {
      _.hide();
    } else if (_.dialog) {
      _.dialog.style.transform = "";
    }
  }

  /**
   * Settles a snapping sheet after release
   * @param drag - The drag state as it stood at release
   * @param velocityY - Release velocity in px/ms, positive downward
   * @param cancelled - Whether the pointer was cancelled
   */
  #releaseToSnap(drag: DragState, velocityY: number, cancelled: boolean) {
    const _ = this;
    const active = _.#activeSnap;
    if (active === null) return;

    // A cancelled gesture never dismisses and never changes snap
    if (cancelled) {
      _.#commitSnap(active);
      return;
    }

    // Dragged below the shortest snap, so the binary dismissal rules apply
    if ((drag.belowLowest ?? 0) > 0) {
      const flick = velocityY > _.#flickVelocity;
      // Mirrors the binary path exactly: a distance dismissal must not fire
      // when the finger was already travelling back up at release. Without
      // this, pulling well below the shortest snap and then reversing still
      // closes the sheet, because belowLowest is a position rather than an
      // intent and can stay past the threshold through the whole reversal.
      const pastThreshold =
        (drag.belowLowest ?? 0) > _.#dragThreshold && velocityY > -0.05;

      if (flick || pastThreshold) {
        _.hide();
      } else {
        _.#commitSnap(_.#snapPoints[0], velocityY);
      }
      return;
    }

    const snapsPx = _.#snapsPx();
    const targetPx = resolveSnapTarget({
      currentPx: _.dialog?.getBoundingClientRect().height ?? 0,
      velocityY,
      snapsPx,
      flickVelocity: _.#flickVelocity,
    });

    if (targetPx === null) {
      _.hide();
      return;
    }

    _.#commitSnap(_.#snapPoints[snapsPx.indexOf(targetPx)], velocityY);
  }

  /**
   * Settles the sheet on a snap, reflects it, and announces the change
   * @param value - The snap in dvh percent
   */
  #commitSnap(value: number, velocityY = 0) {
    const _ = this;
    const from = _.#activeSnap;
    const dialog = _.dialog;
    const targetPx = (value / 100) * window.innerHeight;
    const startPx = dialog?.getBoundingClientRect().height ?? targetPx;

    // Below the shortest snap the sheet stops resizing: the height is pinned
    // at that snap and the travel is carried by the transform instead. The
    // spring drives height, so it has nothing to animate here — and its
    // branch drops `transitioning` and clears the transform with no
    // transition armed, which returns the sheet home in a single frame. A
    // settle with no height left to travel therefore takes the CSS clock,
    // the only one that can carry the transform back.
    const heightAtTarget = Math.abs(startPx - targetPx) <= SNAP_EPSILON;

    // Written explicitly rather than left to the snap reflection —
    // re-committing the same snap still has to clear the drag's inline pixels
    if (dialog && _.#springEnabled && !heightAtTarget) {
      const engine = _.#ensureEngine();

      // The spring writes the height every frame, so the CSS transition
      // has to be off or the two fight over the same property.
      flag(dialog, "transitioning", false);
      flag(dialog, "snapping", false);
      dialog.style.transform = "";
      _.#springTarget = targetPx;

      // velocityY is positive downward while height grows upward, so the
      // sign flips. This is the whole point of the spring path: the settle
      // leaves at the speed the finger was actually moving.
      const seed = -velocityY * FRAME_MS * VELOCITY_BOOST;

      engine.animateTo(startPx, targetPx, seed);
    } else if (dialog) {
      // Only a settle onto a snap is paced by the snap duration. Adding
      // this in #dragEnd instead would also catch the drag-dismiss, where
      // the extra flag would outrank and speed up the closing transition.
      flag(dialog, "snapping", true);
      dialog.style.transform = "";
      dialog.style.height = `${value}dvh`;
    }

    _.#snap = value;
    // Reflected for styling and tests; never read back as an author write.
    dialog?.setAttribute("data-snap", String(value));

    if (from !== value) {
      _.#onSnapChange({ from, to: value });
    }
  }
}

export { SheetController };
export type {
  LifecycleListener,
  SheetEventDetail,
  SheetLifecycleEvent,
  SheetPanel,
  SheetState,
  SnapChangeDetail,
  Surface,
};
