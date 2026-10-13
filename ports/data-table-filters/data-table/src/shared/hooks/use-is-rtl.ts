"use client";

import * as React from "react";

/**
 * Whether the document reads right to left (`<html dir="rtl">`).
 *
 * Layout uses logical utilities (`ms-*`, `start-*`, `border-s`) and mirrors on
 * its own; this is only for the APIs that take a physical side, such as a
 * popover's `side="left"` or TanStack's `columnResizeDirection`. It starts
 * `false` (the server cannot know) and follows later changes of `dir`.
 */
export function useIsRtl() {
  const [isRtl, setIsRtl] = React.useState(false);

  React.useEffect(() => {
    const root = document.documentElement;
    const read = () => setIsRtl(getComputedStyle(root).direction === "rtl");
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["dir"] });
    return () => observer.disconnect();
  }, []);

  return isRtl;
}
