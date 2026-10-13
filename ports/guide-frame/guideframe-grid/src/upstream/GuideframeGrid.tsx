"use client";

import { useEffect, useRef } from "react";
import { createGuideframe } from "./core";
import type { GuideframeInstance } from "./core";
import type { GuideframeGridProps } from "./types";

/**
 * Renders nothing on the server and nothing into the React tree. The overlay is
 * mounted imperatively onto <body> by `@guideframe/core`, which means:
 *
 *  - no hydration mismatch when persisted visibility disagrees with the
 *    server-rendered default (a real bug in 0.1.x),
 *  - `position: fixed` can't be broken by a transformed ancestor,
 *  - the host app's layout never reflows around the overlay.
 */
export function GuideframeGrid(props: GuideframeGridProps) {
  const instanceRef = useRef<GuideframeInstance | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  /*
   * Design From Labs port: the overlay is rebuilt when `enabled` or
   * `container` changes. Upstream mounted once, so a container that arrived
   * after the first render (a ref filled in later) or an `enabled` flag that
   * flipped at runtime was silently ignored.
   */
  const { enabled, container } = props;
  useEffect(() => {
    const instance = createGuideframe(propsRef.current);
    instanceRef.current = instance;
    return () => {
      instance.destroy();
      instanceRef.current = null;
    };
  }, [enabled, container]);

  // Options are plain data plus callbacks; pushing them on every render keeps
  // the overlay in sync without asking callers to memoise object literals.
  useEffect(() => {
    instanceRef.current?.update(propsRef.current);
  });

  return null;
}
