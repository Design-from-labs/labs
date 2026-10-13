"use client";

import * as React from "react";

// ---- upstream: the pen's JS panel (sync, calibrate, falloff) ----
// Without CSS anchor positioning the pen measures every link and writes
// their boxes into custom properties. Rewritten for a component: the nav
// gets `data-magnet-menu-fallback`, and the list's
// `--magnet-menu--hover-*` (the link last pointed at or focused) and
// `--magnet-menu--current-*` (the current link: `aria-current` or the URL
// hash) are offsets inside the list, re-measured on resize, on a hash change
// and when the current link changes. Like the pen's falloff, the hover box
// stays where it was while the pill fades out. Where anchor positioning
// works none of this runs and the pen's `falloff`/`deactivate` handlers
// (which only wrote a variable nothing reads) are not needed.

const BOX = ["x", "y", "width", "height"] as const;
const CURRENT = "a:is([aria-current], :target)";

function setBox(
  list: HTMLElement,
  prefix: "hover" | "current",
  item: HTMLElement | null,
) {
  if (!item) {
    return;
  }
  const values = [
    item.offsetLeft,
    item.offsetTop,
    item.offsetWidth,
    item.offsetHeight,
  ];
  BOX.forEach((key, index) => {
    list.style.setProperty(
      `--magnet-menu--${prefix}-${key}`,
      String(values[index]),
    );
  });
}

/** True where CSS anchor positioning is supported (or on the server). */
export function supportsAnchorPositioning(): boolean {
  return (
    typeof CSS === "undefined" ||
    typeof CSS.supports !== "function" ||
    CSS.supports("anchor-name: --a")
  );
}

/** Per-instance anchor names, so two menus never share an anchor. */
export function useMagnetMenuAnchors(): React.CSSProperties {
  const id = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return {
    "--magnet-menu--hover-anchor": `--magnet-menu-${id}-hover`,
    "--magnet-menu--current-anchor": `--magnet-menu-${id}-current`,
  } as React.CSSProperties;
}

/** Measures the links when the browser lacks anchor positioning. */
export function useMagnetMenuFallback(
  navRef: React.RefObject<HTMLElement | null>,
) {
  React.useEffect(() => {
    const nav = navRef.current;
    const list = nav?.querySelector<HTMLElement>(
      "[data-slot='magnet-menu-list']",
    );
    if (!nav || !list || supportsAnchorPositioning()) {
      return;
    }
    nav.setAttribute("data-magnet-menu-fallback", "");
    const itemOf = (target: EventTarget | null) =>
      target instanceof Element
        ? target.closest<HTMLElement>("[data-slot='magnet-menu-item']")
        : null;
    let hovered: HTMLElement | null = null;
    const calibrate = () => {
      // The wall's loop plays hover and focus as data-loop on a link.
      const played = list.querySelector<HTMLElement>(
        "a[data-loop~='hover'], a[data-loop~='focus']",
      );
      hovered = itemOf(played) ?? hovered;
      setBox(list, "hover", hovered);
      setBox(list, "current", itemOf(list.querySelector(CURRENT)));
    };
    const point = (event: Event) => {
      const item = itemOf(event.target);
      if (item && list.contains(item)) {
        hovered = item;
        setBox(list, "hover", item);
      }
    };
    calibrate();
    list.addEventListener("pointerover", point);
    list.addEventListener("focusin", point);
    window.addEventListener("hashchange", calibrate);
    const resize = new ResizeObserver(calibrate);
    resize.observe(list);
    const current = new MutationObserver(calibrate);
    current.observe(list, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-current", "data-loop"],
    });
    return () => {
      list.removeEventListener("pointerover", point);
      list.removeEventListener("focusin", point);
      window.removeEventListener("hashchange", calibrate);
      resize.disconnect();
      current.disconnect();
      nav.removeAttribute("data-magnet-menu-fallback");
    };
  }, [navRef]);
}

/**
 * The direction the menu inherits from the page, for primitives that map
 * arrow keys by direction. Read from the parent (a primitive may write its
 * own `dir`) and again whenever any `dir` attribute changes.
 */
export function useInheritedDirection(
  navRef: React.RefObject<HTMLElement | null>,
): "ltr" | "rtl" {
  const [dir, setDir] = React.useState<"ltr" | "rtl">("ltr");
  React.useEffect(() => {
    const read = () => {
      const parent = navRef.current?.parentElement;
      if (parent) {
        setDir(getComputedStyle(parent).direction === "rtl" ? "rtl" : "ltr");
      }
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: ["dir"],
    });
    return () => observer.disconnect();
  }, [navRef]);
  return dir;
}
