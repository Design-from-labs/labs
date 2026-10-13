import type {
  LifecycleListener,
  SheetLifecycleEvent,
  SheetPanel,
  SheetState,
} from "./sheet-controller";

// ---- upstream: dialog-panel src/dialog-panel.js (2.0.3, commit 07c81f7d) ----
// The native <dialog> layer the sheet sits on: a state machine
// (hidden -> showing -> shown -> hiding -> hidden) mirrored as
// `data-sheet-state` on the dialog, showModal() for the top layer, focus
// trapping and Escape, focus return, close buttons, backdrop taps and a
// transitionend wait with a fallback. Kept line for line from the
// <dialog-panel> custom element, minus its optional morph-engine transport,
// which the bottom sheet never uses.
//
// dialog-panel carries its own notice, kept here with its logic:
//
//   MIT License
//
//   Copyright (c) 2024 Magic Spells (Cory Schulz)
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

/**
 * DialogPanel: a lightweight controller for a native <dialog> element with
 * state-driven animations.
 */
class DialogPanel implements SheetPanel {
  // Private fields
  #state: SheetState = "hidden";
  #triggerElement: HTMLElement | null = null;
  #dialog: HTMLDialogElement;
  #result: string | null = null;
  #listener: LifecycleListener;
  #onState: (state: SheetState) => void;
  #connected = false;

  // Animation cleanup references
  #pendingRAF: number | null = null;
  #pendingTimeout: ReturnType<typeof setTimeout> | null = null;

  // Fallback timeout for transitionend (in ms)
  static TRANSITION_FALLBACK_TIMEOUT = 700;

  constructor(
    dialog: HTMLDialogElement,
    listener: LifecycleListener,
    onState: (state: SheetState) => void = () => {},
  ) {
    this.#dialog = dialog;
    this.#listener = listener;
    this.#onState = onState;
  }

  connect() {
    const _ = this;
    if (_.#connected) return;
    _.#connected = true;

    // Set initial state attribute (an open dialog from the server render
    // keeps the state it was rendered with; see adoptOpen)
    if (!_.#dialog.open) _.#setState("hidden");

    // Bind event handlers
    _.#bindEvents();
  }

  disconnect() {
    const _ = this;
    if (!_.#connected) return;
    _.#connected = false;

    // Cancel pending animations
    if (_.#pendingRAF) {
      cancelAnimationFrame(_.#pendingRAF);
      _.#pendingRAF = null;
    }
    if (_.#pendingTimeout) {
      clearTimeout(_.#pendingTimeout);
      _.#pendingTimeout = null;
    }

    _.#releaseDeferred?.();

    // Clean up event listeners
    _.#dialog.removeEventListener("click", _.#handleClick);
    _.#dialog.removeEventListener("click", _.#handleDialogClick);
    _.#dialog.removeEventListener("cancel", _.#handleCancel);
    _.#dialog.removeEventListener("close", _.#handleClose);
  }

  /**
   * Takes over a dialog the server rendered open (non-modal, so it paints
   * without JavaScript) as 'shown', and promotes it to the modal top layer
   * in the same task, so no frame shows the change (see #openModal for a
   * document without focus). The sheet is already where it rests: no
   * transition runs.
   */
  adoptOpen() {
    const _ = this;
    if (!_.#dialog.open || _.#dialog.matches(":modal")) return;
    _.#setState("shown");
    _.#openModal();
  }

  /**
   * showModal() for a sheet that is open from the first render, unless the
   * document has no focus. showModal() moves focus into the dialog, and from
   * an embedded frame (the gallery's live stage) that takes the embedding
   * page's focus on load. A document without focus (a frame, a background
   * tab) keeps the server-rendered sheet open non-modal and promotes it to
   * the modal top layer the first time it is used (a pointer down, a key, a
   * focus), so loading a page never moves anyone's focus.
   */
  #openModal() {
    const _ = this;
    const dialog = _.#dialog;
    const doc = dialog.ownerDocument;
    if (doc.hasFocus()) {
      if (dialog.open && !dialog.matches(":modal")) dialog.close();
      if (!dialog.open) dialog.showModal();
      return;
    }
    const events = ["pointerdown", "focusin", "keydown"] as const;
    const promote = () => {
      _.#releaseDeferred?.();
      if (!_.isOpen || !dialog.open || dialog.matches(":modal")) return;
      dialog.close();
      dialog.showModal();
    };
    _.#releaseDeferred?.();
    for (const type of events) doc.addEventListener(type, promote, true);
    _.#releaseDeferred = () => {
      for (const type of events) doc.removeEventListener(type, promote, true);
      _.#releaseDeferred = null;
    };
  }

  #releaseDeferred: (() => void) | null = null;

  // Close buttons: any element with data-action-hide-dialog
  #handleClick = (e: MouseEvent) => {
    const target = e.target as Element | null;
    const trigger = target?.closest?.("[data-action-hide-dialog]");
    if (trigger && this.#dialog.contains(trigger)) {
      e.stopPropagation();
      this.hide(trigger as HTMLElement);
    }
  };

  // Handle backdrop click - detect clicks outside dialog bounds.
  //
  // ::backdrop has no DOM node, so a click on it is dispatched on the
  // dialog element itself: e.target === dialog. That is the first
  // test. It is not sufficient on its own — a click on the dialog's
  // own padding or border also targets the dialog — so the click must
  // additionally land outside the dialog's box.
  //
  // The rect test is not sufficient on its own either. A descendant
  // can paint outside the dialog's box — a position: fixed child, a
  // nested full-viewport overlay, a popover anchored past the edge —
  // and its clicks bubble up here with coordinates in the viewport
  // margins. Judged by coordinates alone those read as backdrop
  // clicks and dismiss the host. A descendant target can never be a
  // backdrop click, whatever its coordinates.
  #handleDialogClick = (e: MouseEvent) => {
    const _ = this;
    if (e.target !== _.#dialog) return;
    const rect = _.#dialog.getBoundingClientRect();
    const clickedOutside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (clickedOutside) {
      e.stopPropagation();
      _.hide();
    }
  };

  // Handle escape key - intercept native cancel and animate close.
  //
  // Escape on a modal dialog fires `cancel` on the dialog element
  // itself: e.target === dialog, always. But `cancel` bubbles, and
  // descendants fire it too — an <input type="file"> when the user
  // dismisses the OS file picker (Chrome 113+, Safari 16.4+,
  // Firefox 91+), a nested <dialog> on its own Escape. Treated as
  // Escape those dismiss the host, so a descendant's cancel is left
  // alone: not swallowed, not stopped, and the panel stays open.
  #handleCancel = (e: Event) => {
    const _ = this;
    if (e.target !== _.#dialog) return;
    e.preventDefault();
    e.stopPropagation();
    _.hide();
  };

  // Cover force-close paths that bypass the cancel event: a
  // <form method="dialog"> submit, or app code calling dialog.close().
  //
  // Invariant: the panel must never read state='shown' while the dialog
  // is closed. The overlay opacity, the page scroll lock, and show()'s
  // own early return all key on that state, so a panel left there after
  // a native close is invisible, keeps the page locked, and can never be
  // reopened.
  //
  // The `close` event is queued rather than dispatched synchronously, so
  // every close this component drives itself has already moved the state
  // past 'shown' by the time this runs. Reaching here means something
  // else closed the dialog.
  #handleClose = () => {
    const _ = this;
    const forceClosedShown = _.#state === "shown" && !_.#dialog.open;

    // The same break one state earlier: a force-close landing
    // between showModal() and the frame that promotes to 'shown'.
    // Left alone that pending frame writes state='shown' onto a
    // closed dialog and re-creates the exact stuck panel the
    // 'shown' repair exists to prevent.
    //
    // #pendingRAF is what identifies a CSS open: it is armed in the
    // same task as showModal() and nulled by the frame that
    // promotes, so it is non-null for exactly as long as the panel
    // sits in a CSS 'showing'.
    const forceClosedShowing =
      _.#state === "showing" && _.#pendingRAF !== null && !_.#dialog.open;

    if (!forceClosedShown && !forceClosedShowing) return;

    // Cancel the promotion before repairing — #finalizeHidden below sets
    // 'hidden' and a surviving frame would overwrite it with 'shown'.
    if (_.#pendingRAF) {
      cancelAnimationFrame(_.#pendingRAF);
      _.#pendingRAF = null;
    }

    // Repair straight to 'hidden' instead of running hide(). The dialog is
    // already gone, so there is no exit transition left to play:
    // transitionend never fires on a display:none dialog, and hide() would
    // idle in 'hiding' — refusing every show() — until its 700ms fallback.
    // beforeHide is not offered either. It is cancelable, and cancelling
    // cannot reopen a dialog the browser has already closed; it would only
    // strand the panel in the broken state again.
    _.#result = _.#dialog.returnValue || _.#result;
    _.#finalizeHidden();
  };

  /**
   * Bind event listeners for close buttons, backdrop, and escape key
   */
  #bindEvents() {
    const _ = this;
    _.#dialog.addEventListener("click", _.#handleClick);
    _.#dialog.addEventListener("click", _.#handleDialogClick);
    _.#dialog.addEventListener("cancel", _.#handleCancel);
    _.#dialog.addEventListener("close", _.#handleClose);
  }

  /**
   * Close out to the hidden state without an exit animation — used by the
   * force-close repair, which arrives with nothing left to animate
   */
  #finalizeHidden() {
    const _ = this;

    _.#releaseDeferred?.();
    if (_.#dialog.open) _.#dialog.close();
    _.#setState("hidden");
    _.#emit("hidden", { result: _.#result });

    // Return focus to trigger element
    if (_.#triggerElement) _.#triggerElement.focus();

    // Clean up
    _.#triggerElement = null;
    _.#result = null;
  }

  /**
   * Show the dialog with animation
   * @param triggerEl - The element that triggered the show
   * @returns False if show was prevented via beforeShow
   */
  show(triggerEl: HTMLElement | null = null): boolean {
    const _ = this;

    // Check if already showing/shown
    if (_.#state === "showing" || _.#state === "shown") return true;

    // CSS transitions cannot reverse while hiding
    if (_.#state === "hiding") return false;

    // Store trigger element for focus return later
    _.#triggerElement = triggerEl || null;

    // Fire beforeShow (cancelable)
    if (!_.#emit("beforeShow", { cancelable: true })) return false;

    // Set state to 'showing'
    _.#setState("showing");

    // Open native dialog for the CSS transition path
    _.#dialog.showModal();

    // Double RAF ensures browser has painted the 'showing' state
    // before we transition to 'shown'
    _.#pendingRAF = requestAnimationFrame(() => {
      _.#pendingRAF = requestAnimationFrame(() => {
        _.#pendingRAF = null;
        _.#setState("shown");

        // Wait for transition to complete before firing 'shown' event
        _.#waitForTransition(() => {
          _.#emit("shown");
        });
      });
    });

    return true;
  }

  /**
   * Hide the dialog with animation
   * @param triggerEl - The element that triggered the hide
   * @returns False if hide was prevented via beforeHide
   */
  hide(triggerEl: HTMLElement | null = null): boolean {
    const _ = this;

    // Check if already hiding/hidden
    if (_.#state === "hiding" || _.#state === "hidden") return true;

    // CSS transitions cannot reverse while showing
    if (_.#state === "showing") return false;

    // Capture result from trigger element
    _.#result = triggerEl?.dataset?.result ?? null;

    // Fire beforeHide (cancelable)
    if (
      !_.#emit("beforeHide", {
        cancelable: true,
        result: _.#result,
        triggerElement: triggerEl,
      })
    ) {
      return false;
    }

    // Set state to 'hiding' - this triggers CSS exit animation
    _.#setState("hiding");

    // Wait for transition to complete
    _.#waitForTransition(() => {
      _.#releaseDeferred?.();
      _.#dialog.close();
      _.#setState("hidden");
      _.#emit("hidden", {
        result: _.#result,
        triggerElement: triggerEl,
      });

      // Return focus to trigger element
      if (_.#triggerElement) _.#triggerElement.focus();

      // Clean up
      _.#triggerElement = null;
      _.#result = null;
    });

    return true;
  }

  /**
   * Wait for CSS transition to complete with fallback timeout
   * @param callback - Called when transition completes
   */
  #waitForTransition(callback: () => void) {
    const _ = this;
    let called = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.target === _.#dialog) done();
    };

    const done = () => {
      if (called) return;
      called = true;
      _.#dialog.removeEventListener("transitionend", onTransitionEnd);
      // clear only our own timer — clearing the shared field would let an
      // earlier, still-pending wait cancel a later wait's fallback
      if (timerId) clearTimeout(timerId);
      if (_.#pendingTimeout === timerId) _.#pendingTimeout = null;
      callback();
    };

    _.#dialog.addEventListener("transitionend", onTransitionEnd);

    // Under reduced motion nothing transitions, so no transitionend will
    // come: finish on the next task instead of idling until the fallback.
    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    timerId = setTimeout(
      done,
      reduced ? 0 : DialogPanel.TRANSITION_FALLBACK_TIMEOUT,
    );
    _.#pendingTimeout = timerId;
  }

  /** Set the component state */
  #setState(newState: SheetState) {
    this.#state = newState;
    this.#dialog.setAttribute("data-sheet-state", newState);
    this.#onState(newState);
  }

  /**
   * Emit a lifecycle event
   * @returns False if the event was cancelled
   */
  #emit(
    type: SheetLifecycleEvent["type"],
    options: {
      cancelable?: boolean;
      result?: string | null;
      triggerElement?: HTMLElement | null;
    } = {},
  ): boolean {
    const _ = this;
    const { cancelable = false, ...detail } = options;
    const event: SheetLifecycleEvent = {
      type,
      cancelable,
      defaultPrevented: false,
      triggerElement: _.#triggerElement,
      result: _.#result,
      state: _.#state,
      ...detail,
      preventDefault() {
        if (cancelable) event.defaultPrevented = true;
      },
    };
    _.#listener(event);
    return !event.defaultPrevented;
  }

  // Read-only properties
  get state(): SheetState {
    return this.#state;
  }
  get dialog(): HTMLDialogElement {
    return this.#dialog;
  }
  get isOpen(): boolean {
    return this.#state === "showing" || this.#state === "shown";
  }
  get triggerElement(): HTMLElement | null {
    return this.#triggerElement;
  }
}

export { DialogPanel };
