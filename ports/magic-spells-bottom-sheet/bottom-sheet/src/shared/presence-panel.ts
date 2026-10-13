import type {
  LifecycleListener,
  SheetLifecycleEvent,
  SheetPanel,
  SheetState,
} from "./sheet-controller";

// The same lifecycle as the native-dialog layer (DialogPanel, after upstream
// dialog-panel 2.0.3: hidden -> showing -> shown -> hiding -> hidden, a
// double frame before 'shown', a transitionend wait with a 700 ms fallback,
// cancelable beforeShow and beforeHide, focus return), for dialog layers that
// render their own modal surface: Radix, Base UI and React Aria. Instead of
// showModal() and close() it mounts and unmounts the primitive's dialog
// (`mount(true)` keeps the primitive open through the whole exit, so its
// focus trap, inert outside and scroll lock last until the sheet has left).

interface PresenceHost {
  /** Mount (true) or unmount (false) the primitive's dialog, synchronously. */
  mount: (open: boolean) => void;
  /** Mirror the lifecycle state (rendered as data-sheet-state). Synchronous. */
  setState: (state: SheetState) => void;
  /** The moving surface, once mounted. */
  surface: () => HTMLElement | null;
}

const TRANSITION_FALLBACK_TIMEOUT = 700;

class PresencePanel implements SheetPanel {
  #state: SheetState = "hidden";
  #triggerElement: HTMLElement | null = null;
  #result: string | null = null;
  #host: PresenceHost;
  #listener: LifecycleListener;
  #pendingRAF: number | null = null;
  #pendingTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(host: PresenceHost, listener: LifecycleListener) {
    this.#host = host;
    this.#listener = listener;
  }

  get state(): SheetState {
    return this.#state;
  }

  get isOpen(): boolean {
    return this.#state === "showing" || this.#state === "shown";
  }

  /** A sheet rendered open from the start: already at rest, no transition. */
  adoptOpen() {
    this.#state = "shown";
  }

  dispose() {
    if (this.#pendingRAF) cancelAnimationFrame(this.#pendingRAF);
    if (this.#pendingTimeout) clearTimeout(this.#pendingTimeout);
    this.#pendingRAF = null;
    this.#pendingTimeout = null;
  }

  show(triggerEl: HTMLElement | null = null): boolean {
    const _ = this;
    if (_.#state === "showing" || _.#state === "shown") return true;
    // CSS transitions cannot reverse while hiding
    if (_.#state === "hiding") return false;

    _.#triggerElement = triggerEl || null;
    if (!_.#emit("beforeShow", { cancelable: true })) return false;

    // Mounted in the 'showing' pose (off-screen), painted, then moved to
    // 'shown' so the transition has a start to run from
    _.#setState("showing");
    _.#host.mount(true);
    _.#pendingRAF = requestAnimationFrame(() => {
      _.#pendingRAF = requestAnimationFrame(() => {
        _.#pendingRAF = null;
        if (_.#state !== "showing") return;
        _.#setState("shown");
        _.#waitForTransition(() => _.#emit("shown"));
      });
    });
    return true;
  }

  hide(triggerEl: HTMLElement | null = null): boolean {
    const _ = this;
    if (_.#state === "hiding" || _.#state === "hidden") return true;
    // CSS transitions cannot reverse while showing
    if (_.#state === "showing") return false;

    _.#result = triggerEl?.dataset?.result ?? null;
    if (
      !_.#emit("beforeHide", {
        cancelable: true,
        result: _.#result,
        triggerElement: triggerEl,
      })
    ) {
      return false;
    }

    _.#setState("hiding");
    _.#waitForTransition(() => {
      _.#setState("hidden");
      _.#host.mount(false);
      _.#emit("hidden", { result: _.#result, triggerElement: triggerEl });
      // Return focus to trigger element
      if (_.#triggerElement?.isConnected) _.#triggerElement.focus();
      _.#triggerElement = null;
      _.#result = null;
    });
    return true;
  }

  #waitForTransition(callback: () => void) {
    const _ = this;
    const surface = _.#host.surface();
    let called = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.target === surface) done();
    };
    const done = () => {
      if (called) return;
      called = true;
      surface?.removeEventListener("transitionend", onTransitionEnd);
      if (timerId) clearTimeout(timerId);
      if (_.#pendingTimeout === timerId) _.#pendingTimeout = null;
      callback();
    };
    surface?.addEventListener("transitionend", onTransitionEnd);
    // Under reduced motion nothing transitions: finish on the next task
    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    timerId = setTimeout(done, reduced ? 0 : TRANSITION_FALLBACK_TIMEOUT);
    _.#pendingTimeout = timerId;
  }

  #setState(state: SheetState) {
    this.#state = state;
    this.#host.setState(state);
  }

  #emit(
    type: SheetLifecycleEvent["type"],
    options: {
      cancelable?: boolean;
      result?: string | null;
      triggerElement?: HTMLElement | null;
    } = {},
  ): boolean {
    const { cancelable = false, ...detail } = options;
    const event: SheetLifecycleEvent = {
      type,
      cancelable,
      defaultPrevented: false,
      triggerElement: this.#triggerElement,
      result: this.#result,
      state: this.#state,
      ...detail,
      preventDefault() {
        if (cancelable) event.defaultPrevented = true;
      },
    };
    this.#listener(event);
    return !event.defaultPrevented;
  }
}

export { PresencePanel };
export type { PresenceHost };
