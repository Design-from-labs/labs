// ---- upstream: src/index.js ----
// The framework-free core, line for line, typed. Labs changes (each listed in
// the fidelity record): the indicator class is `segmented-pill__indicator`
// (upstream: `segmented-control__indicator`); the arrow keys follow the
// reading direction (in right to left, ArrowLeft moves to the next item); and
// the pill is re-measured when a `dir` attribute changes, since a direction
// switch moves the items without resizing the row; the pill is placed in the
// control's own pixels, so a scaled ancestor does not resize it.

/**
 * Labs: the pill is placed in the control's own (layout) pixels. Bounding
 * rects are in screen pixels, so under a scaled ancestor (a transform, as on
 * the wall's tiles and the gallery stills) they would size and place the pill
 * wrongly. The scale is the control's rect against its layout box (read from
 * its computed size, which a transform does not touch); without a transform
 * it is exactly 1 and the values are upstream's.
 */
function layoutScale(root: Element, rootRect: DOMRect) {
  const style = getComputedStyle(root);
  let width = Number.parseFloat(style.width);
  let height = Number.parseFloat(style.height);
  if (style.boxSizing !== "border-box") {
    width +=
      Number.parseFloat(style.paddingLeft) +
      Number.parseFloat(style.paddingRight) +
      Number.parseFloat(style.borderLeftWidth) +
      Number.parseFloat(style.borderRightWidth);
    height +=
      Number.parseFloat(style.paddingTop) +
      Number.parseFloat(style.paddingBottom) +
      Number.parseFloat(style.borderTopWidth) +
      Number.parseFloat(style.borderBottomWidth);
  }
  const x = rootRect.width / width;
  const y = rootRect.height / height;
  const valid = (scale: number) =>
    Number.isFinite(scale) && scale > 0 && Math.abs(scale - 1) > 0.001;
  return { x: valid(x) ? x : 1, y: valid(y) ? y : 1 };
}

export interface SegmentedControlOptions {
  value?: string;
  animated?: boolean;
  onChange?: (value: string) => void;
}

export interface SegmentedControl {
  readonly value: string;
  set(value: string): void;
  destroy(): void;
}

const itemSelector = "button";

export function segmentedControl(
  root: Element,
  options: SegmentedControlOptions = {},
): SegmentedControl {
  if (!(root instanceof Element)) {
    throw new TypeError("Segmented control root must be an Element.");
  }

  const items = [...root.querySelectorAll<HTMLButtonElement>(itemSelector)];
  if (items.length === 0) {
    throw new Error("Segmented control requires at least one button.");
  }

  const values = new Set<string>();
  for (const item of items) {
    const value = item.dataset.value;
    if (!value) {
      throw new Error("Every segmented control button requires a data-value.");
    }
    if (values.has(value)) {
      throw new Error("Segmented control data-value attributes must be unique.");
    }
    values.add(value);
  }

  const enabledItems = items.filter((item) => !item.disabled);
  if (enabledItems.length === 0) {
    throw new Error("Segmented control requires at least one enabled button.");
  }

  if (options.onChange !== undefined && typeof options.onChange !== "function") {
    throw new TypeError("Segmented control onChange must be a function.");
  }
  if (options.animated !== undefined && typeof options.animated !== "boolean") {
    throw new TypeError("Segmented control animated must be a boolean.");
  }

  const rootRole = root.getAttribute("role");
  const rootWasAnimated = root.classList.contains("is-animated");
  const itemState = items.map((item) => ({
    role: item.getAttribute("role"),
    selected: item.getAttribute("aria-selected"),
    tabindex: item.getAttribute("tabindex"),
    active: item.classList.contains("is-active"),
  }));

  let activeItem = enabledItems[0];
  let squashAnimation: Animation | undefined;
  if (options.value !== undefined) {
    const requestedItem = items.find((item) => item.dataset.value === options.value);
    if (!requestedItem) {
      throw new Error(`Unknown segmented control value "${options.value}".`);
    }
    if (requestedItem.disabled) {
      throw new Error(`Cannot select disabled value "${options.value}".`);
    }
    activeItem = requestedItem;
  }

  function renderSelection() {
    for (const item of items) {
      const isActive = item === activeItem;
      item.setAttribute("role", "tab");
      item.setAttribute("aria-selected", String(isActive));
      item.tabIndex = isActive ? 0 : -1;
      item.classList.toggle("is-active", isActive);
    }
  }

  function itemForValue(value: string) {
    const item = items.find((candidate) => candidate.dataset.value === value);
    if (!item) {
      throw new Error(`Unknown segmented control value "${value}".`);
    }
    if (item.disabled) {
      throw new Error(`Cannot select disabled value "${value}".`);
    }
    return item;
  }

  function select(item: HTMLButtonElement, notify = false) {
    if (item === activeItem) return;
    activeItem = item;
    renderSelection();
    positionIndicator();
    squashIndicator();
    if (notify) options.onChange?.(activeItem.dataset.value as string);
  }

  function onClick(event: Event) {
    const item = (event.target as Element).closest<HTMLButtonElement>(itemSelector);
    if (!item || !root.contains(item) || item.disabled) return;
    select(item, true);
  }

  function onKeyDown(event: Event) {
    const { key } = event as KeyboardEvent;
    const item = (event.target as Element).closest<HTMLButtonElement>(itemSelector);
    if (!item || !root.contains(item) || item.disabled) return;

    // Labs: in a right-to-left row the next item is on the left.
    const rtl = getComputedStyle(root).direction === "rtl";
    const nextKey = rtl ? "ArrowLeft" : "ArrowRight";
    const previousKey = rtl ? "ArrowRight" : "ArrowLeft";

    let nextItem: HTMLButtonElement | undefined;
    const currentIndex = enabledItems.indexOf(item);
    if (key === nextKey) {
      nextItem = enabledItems[(currentIndex + 1) % enabledItems.length];
    } else if (key === previousKey) {
      nextItem = enabledItems[(currentIndex - 1 + enabledItems.length) % enabledItems.length];
    } else if (key === "Home") {
      nextItem = enabledItems[0];
    } else if (key === "End") {
      nextItem = enabledItems.at(-1);
    } else if (key === "Enter" || key === " ") {
      nextItem = item;
    } else {
      return;
    }
    if (!nextItem) return;

    event.preventDefault();
    select(nextItem, true);
    nextItem.focus();
  }

  const indicator = document.createElement("span");
  indicator.className = "segmented-pill__indicator";
  indicator.setAttribute("aria-hidden", "true");

  // Physical on purpose: the offset is measured from the two boxes' left
  // edges, so the pill lands on the selected item in either direction.
  function positionIndicator() {
    const rootRect = root.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const scale = layoutScale(root, rootRect);
    indicator.style.width = `${itemRect.width / scale.x}px`;
    indicator.style.height = `${itemRect.height / scale.y}px`;
    indicator.style.transform = `translate3d(${(itemRect.left - rootRect.left) / scale.x}px, ${(itemRect.top - rootRect.top) / scale.y}px, 0)`;
  }

  function squashIndicator() {
    const reduceMotion = typeof globalThis.matchMedia === "function"
      && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!options.animated || reduceMotion || typeof indicator.animate !== "function") return;

    squashAnimation?.cancel();
    squashAnimation = indicator.animate(
      [
        { scale: "1 1" },
        { scale: "1.07 0.93", offset: 0.55 },
        { scale: "1 1" },
      ],
      {
        duration: 260,
        easing: "cubic-bezier(0.2, 0, 0, 1)",
      },
    );
  }

  root.setAttribute("role", "tablist");
  root.classList.toggle("is-animated", options.animated === true);
  root.prepend(indicator);
  renderSelection();
  positionIndicator();
  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeyDown);

  let resizeObserver: ResizeObserver | undefined;
  if (typeof globalThis.ResizeObserver === "function") {
    resizeObserver = new ResizeObserver(positionIndicator);
    resizeObserver.observe(root);
  } else {
    window.addEventListener("resize", positionIndicator);
  }

  // Labs: a direction switch reorders the items without resizing the row.
  let directionObserver: MutationObserver | undefined;
  if (typeof globalThis.MutationObserver === "function") {
    directionObserver = new MutationObserver(positionIndicator);
    directionObserver.observe(root.ownerDocument.documentElement, {
      subtree: true,
      attributeFilter: ["dir"],
    });
  }

  let destroyed = false;

  function restoreAttribute(element: Element, name: string, value: string | null) {
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  }

  return {
    get value() {
      return activeItem.dataset.value as string;
    },
    set(value: string) {
      select(itemForValue(value));
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeyDown);
      resizeObserver?.disconnect();
      directionObserver?.disconnect();
      squashAnimation?.cancel();
      window.removeEventListener("resize", positionIndicator);
      indicator.remove();
      restoreAttribute(root, "role", rootRole);
      root.classList.toggle("is-animated", rootWasAnimated);

      items.forEach((item, index) => {
        const state = itemState[index];
        restoreAttribute(item, "role", state.role);
        restoreAttribute(item, "aria-selected", state.selected);
        restoreAttribute(item, "tabindex", state.tabindex);
        item.classList.toggle("is-active", state.active);
      });
    },
  };
}
