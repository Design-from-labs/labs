import {
  type Direction,
  playSweep,
  type ShaderController,
  type SweepHandle,
  type SweepOptions,
} from "./glimm-core";
import {
  type CommitFn,
  type CoveredHandle,
  nextPaint,
  waitForWork,
} from "./glimm-sweeps";

/*
 * Labs additions around the upstream sweep (not in the upstream package):
 * a sweep scoped to one element, a crossfade for reduced motion, a shader
 * stand-in for when WebGL cannot draw, logical directions and the focus
 * handoff after a transition.
 */

/** A direction in reading order: it follows `dir`, where `ltr` and `rtl` do not. */
export type GlimmDirection = Direction | "inline-start" | "inline-end";

/** Where focus goes once the new view is in place. */
export type GlimmFocusTarget =
  | string
  | HTMLElement
  | null
  | (() => HTMLElement | null);

/**
 * Resolves a direction in reading order against the element's `direction`:
 * "inline-end" is left to right in LTR and right to left in RTL. A physical
 * direction (upstream's four) is returned as given.
 */
export function resolveDirection(
  direction: GlimmDirection | undefined,
  element: Element | null,
): Direction | undefined {
  if (direction !== "inline-start" && direction !== "inline-end") {
    return direction;
  }
  const rtl = element ? getComputedStyle(element).direction === "rtl" : false;
  const toEnd = direction === "inline-end";
  return rtl === toEnd ? "rtl" : "ltr";
}

/**
 * A shader controller that draws nothing. The sweep still runs its phases and
 * masks, so without WebGL the view is wiped away and revealed without the band.
 */
export function createNullShader(): ShaderController {
  const state = { progress: 0, alpha: 0 };
  const noop = () => {};
  return {
    canvas: document.createElement("canvas"),
    setProgress: (p) => {
      state.progress = Math.max(0, Math.min(1, p));
    },
    setAlpha: (a) => {
      state.alpha = Math.max(0, Math.min(1.5, a));
    },
    setPalette: noop,
    setBandTight: noop,
    setDirection: noop,
    setWaveAmount: noop,
    setRippleAmount: noop,
    setWaveSpeed: noop,
    setBrightness: noop,
    setSwellAmount: noop,
    getProgress: () => state.progress,
    getAlpha: () => state.alpha,
    destroy: noop,
    draw: noop,
    resize: noop,
  };
}

// ---- focus ---------------------------------------------------------------

/**
 * Moves focus to the target, found inside `scope` (so the frozen picture of
 * the outgoing view is never matched). A target that is not focusable, such
 * as a heading, becomes focusable with tabindex -1 first.
 */
export function focusTarget(
  target: GlimmFocusTarget | undefined,
  scope: ParentNode = document,
): boolean {
  if (!target) {
    return false;
  }
  let element: HTMLElement | null;
  if (typeof target === "string") {
    element = scope.querySelector<HTMLElement>(target);
  } else if (typeof target === "function") {
    element = target();
  } else {
    element = target;
  }
  if (!element?.isConnected) {
    return false;
  }
  if (!element.hasAttribute("tabindex") && element.tabIndex < 0) {
    element.setAttribute("tabindex", "-1");
  }
  element.focus({ preventScroll: true });
  return document.activeElement === element;
}

// ---- the frozen picture of the outgoing view --------------------------------

function copyFormState(from: Element, to: Element) {
  const sources = from.querySelectorAll("input, textarea, select, canvas");
  const targets = to.querySelectorAll("input, textarea, select, canvas");
  sources.forEach((source, index) => {
    const target = targets[index];
    if (!target) {
      return;
    }
    if (source instanceof HTMLCanvasElement) {
      if (target instanceof HTMLCanvasElement) {
        try {
          target.getContext("2d")?.drawImage(source, 0, 0);
        } catch {
          // A tainted or lost canvas stays blank in the picture.
        }
      }
    } else if (
      (source instanceof HTMLInputElement ||
        source instanceof HTMLTextAreaElement ||
        source instanceof HTMLSelectElement) &&
      (target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement)
    ) {
      target.value = source.value;
      if (
        source instanceof HTMLInputElement &&
        target instanceof HTMLInputElement
      ) {
        target.checked = source.checked;
      }
    }
  });
}

/**
 * A copy of the view as it is now, laid over it: the outgoing side of the
 * boundary. It is inert, hidden from assistive technology and blocks pointer
 * input until the transition ends. Ids are dropped so none repeat.
 */
function takeSnapshot(content: HTMLElement): HTMLElement {
  const clone = content.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  for (const element of clone.querySelectorAll("[id]")) {
    element.removeAttribute("id");
  }
  copyFormState(content, clone);
  clone.dataset.slot = "glimm-snapshot";
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("inert", "");
  Object.assign(clone.style, {
    position: "absolute",
    insetBlockStart: "0",
    insetInlineStart: "0",
    margin: "0",
    width: `${content.offsetWidth}px`,
    height: `${content.offsetHeight}px`,
    zIndex: "1",
    pointerEvents: "auto",
    userSelect: "none",
  });
  return clone;
}

/** The upstream mask: the band's edge as the outgoing view's clip. */
function clipFor(direction: Direction, p: number) {
  const edge = Math.max(0, Math.min(100, (-0.2 + p * 1.4) * 100));
  return {
    ltr: `inset(0 0 0 ${edge}%)`,
    rtl: `inset(0 ${edge}% 0 0)`,
    ttb: `inset(${edge}% 0 0 0)`,
    btt: `inset(0 0 ${edge}% 0)`,
  }[direction];
}

const COMMIT_TIMEOUT = 8000;

/**
 * Commits the new view while the outgoing one is frozen on top, then runs the
 * upstream masked sweep inside one element: the band is a real boundary, with
 * the outgoing view ahead of it and the incoming view behind it. This is the
 * masked sweep of the provider (document View Transitions) applied to a
 * frozen copy of `content`, so it needs no browser support and no full-page
 * snapshot.
 */
export function playContainedSweep(
  ctrl: ShaderController,
  container: HTMLElement,
  content: HTMLElement,
  commit: CommitFn,
  opts: SweepOptions,
): CoveredHandle {
  const abort = new AbortController();
  const direction = opts.direction ?? "ltr";
  const snapshot = takeSnapshot(content);
  let cancelled = false;
  let animation: SweepHandle | undefined;
  let resolveMidpoint!: () => void;
  let resolveDone!: () => void;
  const midpoint = new Promise<void>((resolve) => {
    resolveMidpoint = resolve;
  });
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  snapshot.style.clipPath = clipFor(direction, 0);
  container.append(snapshot);

  const cancel = () => {
    if (cancelled) {
      return;
    }
    cancelled = true;
    abort.abort();
    animation?.cancel();
    ctrl.setAlpha(0);
    snapshot.remove();
    resolveMidpoint();
    resolveDone();
  };

  void (async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        waitForWork(commit(abort.signal), abort.signal),
        new Promise<void>((resolve) => {
          timer = setTimeout(() => {
            console.warn("[glimm] content commit timed out; ending the sweep");
            cancel();
            resolve();
          }, COMMIT_TIMEOUT);
        }),
      ]);
    } catch (error) {
      console.error("[glimm] content commit failed:", error);
    } finally {
      clearTimeout(timer);
    }
    if (cancelled) {
      return;
    }
    // One paint with the new view committed under the picture, so the first
    // reveal shows the final content rather than the previous state.
    await nextPaint(abort.signal);
    if (cancelled) {
      return;
    }
    const maskedCtrl: ShaderController = {
      ...ctrl,
      setProgress: (p: number) => {
        snapshot.style.clipPath = clipFor(direction, p);
        ctrl.setProgress(p);
      },
    };
    animation = playSweep(maskedCtrl, { ...opts, onComplete: undefined });
    void animation.midpoint.then(resolveMidpoint);
    await animation.done;
    if (cancelled) {
      return;
    }
    snapshot.remove();
    opts.onComplete?.();
  })()
    .catch((error) => {
      console.error("[glimm] contained sweep failed:", error);
      cancel();
    })
    .finally(() => {
      resolveMidpoint();
      resolveDone();
    });

  return { midpoint, done, cancel, interrupt: cancel };
}

/**
 * The reduced-motion alternative to a sweep: the new view fades in over the
 * frozen outgoing one in `FADE_MS`, with nothing travelling across the view.
 */
const FADE_MS = 180;

export function playCrossfade(
  container: HTMLElement,
  content: HTMLElement,
  commit: CommitFn,
  opts: Pick<SweepOptions, "onComplete">,
): CoveredHandle {
  const abort = new AbortController();
  const snapshot = takeSnapshot(content);
  let cancelled = false;
  let fade: Animation | undefined;
  let resolveMidpoint!: () => void;
  let resolveDone!: () => void;
  const midpoint = new Promise<void>((resolve) => {
    resolveMidpoint = resolve;
  });
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  container.append(snapshot);

  const cancel = () => {
    if (cancelled) {
      return;
    }
    cancelled = true;
    abort.abort();
    fade?.cancel();
    snapshot.remove();
    resolveMidpoint();
    resolveDone();
  };

  void (async () => {
    try {
      await waitForWork(commit(abort.signal), abort.signal);
    } catch (error) {
      console.error("[glimm] content commit failed:", error);
    }
    if (cancelled) {
      return;
    }
    resolveMidpoint();
    fade = snapshot.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: FADE_MS,
      easing: "ease-out",
      fill: "forwards",
    });
    await fade.finished.catch(() => {});
    if (cancelled) {
      return;
    }
    snapshot.remove();
    opts.onComplete?.();
  })()
    .catch((error) => {
      console.error("[glimm] crossfade failed:", error);
      cancel();
    })
    .finally(() => {
      resolveMidpoint();
      resolveDone();
    });

  return { midpoint, done, cancel, interrupt: cancel };
}

/**
 * The page-wide reduced-motion alternative: the browser's own View
 * Transition crossfade, which upstream's masked sweep switches off. Returns
 * null where View Transitions do not exist, so the caller swaps at once.
 */
export function playPageCrossfade(
  commit: CommitFn,
  opts: Pick<SweepOptions, "onComplete">,
): CoveredHandle | null {
  if (typeof document.startViewTransition !== "function") {
    return null;
  }
  const abort = new AbortController();
  let resolveMidpoint!: () => void;
  let resolveDone!: () => void;
  const midpoint = new Promise<void>((resolve) => {
    resolveMidpoint = resolve;
  });
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  const transition = document.startViewTransition(async () => {
    try {
      await waitForWork(commit(abort.signal), abort.signal);
    } catch (error) {
      console.error("[glimm] content commit failed:", error);
    }
  });
  void transition.updateCallbackDone.then(resolveMidpoint, resolveMidpoint);
  void transition.finished
    .then(
      () => {
        if (!abort.signal.aborted) {
          opts.onComplete?.();
        }
      },
      () => {},
    )
    .finally(() => {
      resolveMidpoint();
      resolveDone();
    });
  const cancel = () => {
    abort.abort();
    transition.skipTransition();
    resolveMidpoint();
    resolveDone();
  };
  return { midpoint, done, cancel, interrupt: cancel };
}
