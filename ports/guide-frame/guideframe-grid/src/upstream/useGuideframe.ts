"use client";

import { useEffect, useRef, useState } from "react";
import { createGuideframe } from "./core";
import type { Guide, GuideframeInstance, GuideframeOptions } from "./core";

/**
 * Imperative escape hatch for apps that want to drive the overlay from their
 * own UI (a settings panel, a toolbar button) instead of rendering
 * `<GuideframeGrid />`. Returns live visibility and guide state.
 */
export function useGuideframe(options: GuideframeOptions = {}) {
  const instanceRef = useRef<GuideframeInstance | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [visible, setVisibleState] = useState(options.visible ?? options.defaultVisible ?? true);
  const [guides, setGuidesState] = useState<Guide[]>(options.defaultGuides ?? []);
  // Design From Labs port: the control panel's open state, so your own UI can
  // offer a button for it (useful with `shortcut: false`).
  const [panelOpen, setPanelOpenState] = useState(options.defaultPanelOpen ?? false);

  // Design From Labs port: rebuilt when `enabled` or `container` changes (see
  // GuideframeGrid.tsx); upstream mounted once with the first render's options.
  const { enabled, container } = options;
  useEffect(() => {
    const instance = createGuideframe({
      ...optionsRef.current,
      onVisibleChange: (next) => {
        setVisibleState(next);
        optionsRef.current.onVisibleChange?.(next);
      },
      onGuidesChange: (next) => {
        setGuidesState(next);
        optionsRef.current.onGuidesChange?.(next);
      },
      onPanelOpenChange: (next) => {
        setPanelOpenState(next);
        optionsRef.current.onPanelOpenChange?.(next);
      },
    });
    instanceRef.current = instance;
    setVisibleState(instance.isVisible());
    setGuidesState(instance.getGuides());
    setPanelOpenState(instance.isPanelOpen());

    return () => {
      instance.destroy();
      instanceRef.current = null;
    };
  }, [enabled, container]);

  return {
    visible,
    guides,
    panelOpen,
    setVisible: (next: boolean) => instanceRef.current?.setVisible(next),
    setGuides: (next: Guide[]) => instanceRef.current?.setGuides(next),
    clearGuides: () => instanceRef.current?.clearGuides(),
    setPanelOpen: (next: boolean) => instanceRef.current?.setPanelOpen(next),
  };
}
