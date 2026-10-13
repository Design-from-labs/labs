"use client";

import * as React from "react";
import {
  type Components,
  type FollowOutput,
  type ItemProps,
  type ListProps,
  Virtuoso,
  type VirtuosoHandle,
  type VirtuosoProps,
} from "react-virtuoso";
import { cn } from "@/lib/utils";

type VirtualListProps<Data = unknown, Context = unknown> = VirtuosoProps<
  Data,
  Context
> & {
  ref?: React.Ref<VirtuosoHandle>;
};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(REDUCED_MOTION).matches
  );
}

/** `behavior: "smooth"` becomes `"auto"` (a jump) under reduced motion. */
function calm<T extends { behavior?: ScrollBehavior | "auto" | "smooth" }>(
  location: T,
): T {
  return location.behavior === "smooth" && prefersReducedMotion()
    ? { ...location, behavior: "auto" }
    : location;
}

function calmFollowOutput(followOutput: FollowOutput | undefined) {
  if (typeof followOutput === "function") {
    return (isAtBottom: boolean) => {
      const value = followOutput(isAtBottom);
      return value === "smooth" && prefersReducedMotion() ? "auto" : value;
    };
  }
  return followOutput === "smooth" && prefersReducedMotion()
    ? "auto"
    : followOutput;
}

// The list's size, so each rendered row can say where it sits in the whole
// list (aria-setsize, aria-posinset): only a window of rows is in the DOM.
const SizeContext = React.createContext(-1);

// Upstream renders the list and its rows as plain divs; these are a list and
// its items instead, reset to the same box (no margin, padding or marker), so
// the look is unchanged. Kept at module scope so Virtuoso never remounts them.
const LIST_RESET: React.CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: "none",
};

const List = React.forwardRef<HTMLUListElement, ListProps<HTMLUListElement>>(
  function VirtualListList({ style, ...props }, ref) {
    return <ul {...props} ref={ref} style={{ ...LIST_RESET, ...style }} />;
  },
);

function Item({
  item: _item,
  context: _context,
  ...props
}: ItemProps<unknown> & { context?: unknown }) {
  const size = React.useContext(SizeContext);
  return (
    <li
      {...props}
      aria-posinset={props["data-index"] + 1}
      aria-setsize={size}
    />
  );
}

/**
 * A virtualized list: only the rows in view (plus a margin) are rendered, so
 * it stays fast with thousands of items of any height. A thin wrapper over
 * Virtuoso (`react-virtuoso`): every Virtuoso prop and handle method works,
 * the look is unchanged, and it adds list semantics, a named and focus-ringed
 * scroll region, and reduced-motion scrolling.
 */
function VirtualList<Data = unknown, Context = unknown>({
  ref,
  className,
  components,
  ...props
}: VirtualListProps<Data, Context>) {
  const inner = React.useRef<VirtuosoHandle>(null);

  // Smooth scrolls requested through the handle jump instead under reduced
  // motion; everything else is Virtuoso's own handle.
  React.useImperativeHandle(
    ref,
    (): VirtuosoHandle => ({
      autoscrollToBottom: () => inner.current?.autoscrollToBottom(),
      getState: (callback) => inner.current?.getState(callback),
      scrollBy: (location) => inner.current?.scrollBy(calm(location)),
      scrollIntoView: (location) =>
        inner.current?.scrollIntoView(
          typeof location === "number" ? location : calm(location),
        ),
      scrollTo: (location) => inner.current?.scrollTo(calm(location)),
      scrollToIndex: (location) =>
        inner.current?.scrollToIndex(
          typeof location === "number" ? location : calm(location),
        ),
    }),
    [],
  );

  const named =
    props["aria-label"] !== undefined || props["aria-labelledby"] !== undefined;
  const size = props.totalCount ?? props.data?.length ?? 0;
  // Virtuoso publishes every prop that is present, even when undefined, so
  // followOutput is only passed on when it was given.
  const follow =
    "followOutput" in props
      ? { followOutput: calmFollowOutput(props.followOutput) }
      : {};

  return (
    <SizeContext.Provider value={size}>
      <Virtuoso<Data, Context>
        // A named scroll region is a labelled region (P-075): keyboard users
        // reach it with Tab (Virtuoso makes it focusable) and scroll it with
        // the arrow keys; the ring shows where focus is, since Virtuoso
        // removes the outline.
        role={named ? "region" : undefined}
        {...props}
        className={cn(
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          className,
        )}
        components={
          {
            List,
            Item,
            ...components,
          } as Components<Data, Context>
        }
        {...follow}
        ref={inner}
      />
    </SizeContext.Provider>
  );
}

export { VirtualList, type VirtualListProps, type VirtuosoHandle };
