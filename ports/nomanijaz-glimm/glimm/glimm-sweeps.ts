import {
  type Direction,
  playSweep,
  type ShaderController,
  type SweepHandle,
  type SweepOptions,
} from "./glimm-core";

// ---- upstream: src/react/covered-sweep.ts (dist/chunk-IKX3GGU3.js) ----

type CurtainPhase = "idle" | "cover" | "hold" | "reveal";

/** The opaque layer that covers the view behind the band. */
export type Curtain = {
  element: HTMLDivElement;
  begin: (nextDirection: Direction) => number;
  update: (p: number, nextPhase: CurtainPhase) => void;
  hold: () => void;
  hide: () => void;
  destroy: () => void;
};

/** A sweep that can also be interrupted without clearing the shader. */
export type CoveredHandle = SweepHandle & { interrupt: () => void };

/** Runs the navigation; the sweep waits for it to commit. */
export type CommitFn = (signal: AbortSignal) => Promise<void>;

export function createCurtain(host: HTMLElement): Curtain {
  const element = document.createElement("div");
  element.dataset.glimmCurtain = "idle";
  element.setAttribute("aria-hidden", "true");
  Object.assign(element.style, {
    position: "absolute",
    inset: "0",
    display: "none",
    pointerEvents: "none"
  });
  host.prepend(element);
  let direction: Direction = "ltr";
  let progress = 0;
  let phase: CurtainPhase = "idle";
  const update = (p: number, nextPhase: CurtainPhase) => {
    progress = p;
    phase = nextPhase;
    element.dataset.glimmCurtain = phase;
    const edge = (-0.2 + 1.4 * p) * 100;
    const axis = { ltr: "right", rtl: "left", ttb: "bottom", btt: "top" }[direction];
    const before = phase === "cover" ? "#000" : "transparent";
    const after = phase === "cover" ? "transparent" : "#000";
    const mask = `linear-gradient(to ${axis}, ${before} ${edge - 3}%, ${after} ${edge + 3}%)`;
    element.style.maskImage = mask;
    element.style.webkitMaskImage = mask;
  };
  const hide = () => {
    phase = "idle";
    progress = 0;
    element.dataset.glimmCurtain = phase;
    element.style.display = "none";
  };
  return {
    element,
    begin(nextDirection: Direction) {
      const start = phase === "cover" && direction === nextDirection ? progress : 0;
      const wasCovered = phase === "hold" || phase === "reveal";
      direction = nextDirection;
      element.style.background = surfaceColor(host);
      element.style.display = "block";
      update(wasCovered ? 1 : start, "cover");
      return wasCovered ? 1 : start;
    },
    update,
    hold() {
      phase = "hold";
      progress = 1;
      element.dataset.glimmCurtain = phase;
      element.style.maskImage = "none";
      element.style.webkitMaskImage = "none";
    },
    hide,
    destroy() {
      element.remove();
    }
  };
}
function surfaceColor(host: HTMLElement) {
  for (let node = host.parentElement; node; node = node.parentElement) {
    const color = getComputedStyle(node).backgroundColor;
    if (!color || color === "transparent") continue;
    const alpha = color.startsWith("rgba(") || color.includes("/") ? color.match(/(?:,|\/)\s*([\d.]+%?)\s*\)$/)?.[1] : void 0;
    if (alpha && parseFloat(alpha) < (alpha.endsWith("%") ? 100 : 1)) continue;
    return color;
  }
  return getComputedStyle(document.documentElement).colorScheme === "dark" ? "#111" : "#fff";
}
export function playCoveredSweep(ctrl: ShaderController, curtain: Curtain, commit: CommitFn, opts: SweepOptions): CoveredHandle {
  const abort = new AbortController();
  let active: SweepHandle | undefined;
  let cancelled = false;
  let resolveMidpoint!: () => void;
  let resolveDone!: () => void;
  const midpoint = new Promise<void>((resolve) => {
    resolveMidpoint = resolve;
  });
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  const duration = Number.isFinite(opts.sweepMs) ? Math.max(0, opts.sweepMs as number) : 1100;
  const split = Number.isFinite(opts.midpoint) ? Math.max(0.1, Math.min(0.9, opts.midpoint as number)) : 0.56;
  const start = curtain.begin(opts.direction ?? "ltr");
  let locked = false;
  const cancel = (preserve: boolean) => {
    cancelled = true;
    abort.abort();
    active?.cancel();
    if (!preserve) {
      curtain.hide();
      ctrl.setAlpha(0);
      ctrl.setProgress(0);
    }
    resolveMidpoint();
    resolveDone();
  };
  void (async () => {
    const coverCtrl = {
      ...ctrl,
      getProgress: () => 0,
      setProgress: (p: number) => {
        if (!locked) {
          curtain.update(start + (1 - start) * p, "cover");
          ctrl.setProgress(start + (1 - start) * p);
        }
      }
    };
    active = playSweep(coverCtrl, {
      ...opts,
      sweepMs: start >= 1 ? 0 : duration * split,
      outroMs: 0,
      midpoint: 1,
      onComplete: void 0,
      onMidpoint: async () => {
        locked = true;
        curtain.hold();
        ctrl.setAlpha(0);
        await nextPaint(abort.signal);
        if (cancelled) return;
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            waitForWork(commit(abort.signal), abort.signal),
            new Promise<void>((resolve) => {
              timer = setTimeout(() => {
                console.warn("[glimm] content commit timed out; releasing the curtain");
                abort.abort();
                resolve();
              }, 8e3);
            })
          ]);
        } catch (error) {
          console.error("[glimm] content commit failed:", error);
        } finally {
          clearTimeout(timer);
        }
        if (!cancelled) await nextPaint(abort.signal);
        resolveMidpoint();
      }
    });
    await active.done;
    if (cancelled) return;
    const revealCtrl = {
      ...ctrl,
      getProgress: () => 0,
      setProgress: (p: number) => {
        curtain.update(p, "reveal");
        ctrl.setProgress(p);
      }
    };
    active = playSweep(revealCtrl, {
      ...opts,
      sweepMs: duration * (1 - split),
      midpoint: 1,
      onMidpoint: () => curtain.hide(),
      onComplete: void 0
    });
    await active.done;
    if (!cancelled) {
      curtain.hide();
      opts.onComplete?.();
    }
  })().catch((error) => {
    console.error("[glimm] covered sweep failed:", error);
    if (!cancelled) {
      curtain.hide();
      ctrl.setAlpha(0);
    }
  }).finally(() => {
    resolveMidpoint();
    resolveDone();
  });
  return { midpoint, done, cancel: () => cancel(false), interrupt: () => cancel(true) };
}
export function nextPaint(signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    let frame = 0;
    const finish = () => {
      cancelAnimationFrame(frame);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    signal.addEventListener("abort", finish, { once: true });
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(finish);
    });
  });
}
export function waitForWork(work: Promise<void>, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const finish = () => {
      signal.removeEventListener("abort", finish);
      resolve();
    };
    signal.addEventListener("abort", finish, { once: true });
    void work.then(finish, (error) => {
      signal.removeEventListener("abort", finish);
      reject(error);
    });
    if (signal.aborted) finish();
  });
}

// ---- upstream: src/react/masked-sweep.ts (dist/chunk-IKX3GGU3.js) ----
let activeCancel: (() => void) | undefined;
export function playMaskedSweep(ctrl: ShaderController, curtain: Curtain, commit: CommitFn, opts: SweepOptions): CoveredHandle {
  activeCancel?.();
  const abort = new AbortController();
  const root = document.documentElement;
  const host = curtain.element.parentElement!;
  let cancelled = false;
  let transition: ViewTransition | undefined;
  let animation: SweepHandle | undefined;
  let resolveMidpoint!: () => void;
  let resolveDone!: () => void;
  const midpoint = new Promise<void>((resolve) => {
    resolveMidpoint = resolve;
  });
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  let commitTask: Promise<void> | undefined;
  const commitOnce = (signal: AbortSignal) => commitTask ?? (commitTask = commit(signal));
  const style = document.createElement("style");
  style.textContent = `
    html[data-glimm-transition] { view-transition-name: root !important; }
    html[data-glimm-transition] * { view-transition-name: none !important; }
    html[data-glimm-transition] [data-glimm-layer] { view-transition-name: glimm-layer !important; }
    @keyframes glimm-snapshot-hold { from { opacity: 1 } to { opacity: 1 } }
    html[data-glimm-transition]::view-transition { pointer-events: auto; }
    html[data-glimm-transition]::view-transition-group(*) {
      animation: glimm-snapshot-hold 86400s linear both;
    }
    html[data-glimm-transition]::view-transition-image-pair(*) { isolation: auto; }
    html[data-glimm-transition]::view-transition-old(*),
    html[data-glimm-transition]::view-transition-new(*) {
      animation: none; mix-blend-mode: normal; opacity: 1;
    }
    html[data-glimm-transition]::view-transition-old(root) {
      z-index: 2; clip-path: var(--glimm-old-clip, inset(0));
    }
    html[data-glimm-transition]::view-transition-new(root) {
      z-index: 1;
    }
    html[data-glimm-transition]::view-transition-group(glimm-layer) { z-index: 2147483647; }
    html[data-glimm-transition]::view-transition-old(glimm-layer) { display: none; }
  `;
  const updateClip = (p: number) => {
    const edge = Math.max(0, Math.min(100, (-0.2 + p * 1.4) * 100));
    const clip = {
      ltr: `inset(0 0 0 ${edge}%)`,
      rtl: `inset(0 ${edge}% 0 0)`,
      ttb: `inset(${edge}% 0 0 0)`,
      btt: `inset(0 0 ${edge}% 0)`
    }[opts.direction ?? "ltr"];
    root.style.setProperty("--glimm-old-clip", clip);
  };
  const cleanup = () => {
    style.remove();
    if (activeCancel !== cancel) return;
    activeCancel = void 0;
    root.removeAttribute("data-glimm-transition");
    root.style.removeProperty("--glimm-old-clip");
    host.removeAttribute("data-glimm-layer");
  };
  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    abort.abort();
    animation?.cancel();
    transition?.skipTransition();
    ctrl.setAlpha(0);
    curtain.hide();
    cleanup();
    resolveMidpoint();
    resolveDone();
  };
  activeCancel = cancel;
  curtain.hide();
  ctrl.setAlpha(0);
  ctrl.setProgress(0);
  root.setAttribute("data-glimm-transition", "");
  host.setAttribute("data-glimm-layer", "");
  updateClip(0);
  document.head.append(style);
  void (async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      transition = document.startViewTransition(async () => {
        if (cancelled) return;
        await Promise.race([
          waitForWork(commitOnce(abort.signal), abort.signal),
          new Promise<void>((resolve) => {
            timer = setTimeout(() => {
              console.warn("[glimm] content commit timed out; skipping the snapshot transition");
              cancel();
              resolve();
            }, 8e3);
          })
        ]);
        clearTimeout(timer);
      });
      void transition.updateCallbackDone.catch(() => {
      });
      void transition.finished.catch(() => {
      });
      await transition.ready;
    } catch (error) {
      clearTimeout(timer);
      transition?.skipTransition();
      if (cancelled) return;
      cleanup();
      animation = playCoveredSweep(ctrl, curtain, commitOnce, opts);
      void animation.midpoint.then(resolveMidpoint);
      await animation.done;
      return;
    }
    if (cancelled) return;
    let finishing = false;
    void transition.finished.then(() => {
      if (!finishing && !cancelled) cancel();
    });
    const maskedCtrl = {
      ...ctrl,
      setProgress: (p: number) => {
        updateClip(p);
        ctrl.setProgress(p);
      }
    };
    animation = playSweep(maskedCtrl, { ...opts, onComplete: void 0 });
    void animation.midpoint.then(resolveMidpoint);
    await animation.done;
    if (cancelled) return;
    updateClip(1);
    finishing = true;
    transition.skipTransition();
    await transition.finished;
    if (!cancelled) {
      cleanup();
      opts.onComplete?.();
    }
  })().catch((error) => {
    console.error("[glimm] masked sweep failed:", error);
    cancel();
  }).finally(() => {
    resolveMidpoint();
    resolveDone();
  });
  return { midpoint, done, cancel, interrupt: cancel };
}
