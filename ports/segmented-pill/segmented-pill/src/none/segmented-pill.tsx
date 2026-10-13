"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { useLayoutEffect, useRef } from "react";
import { type SegmentedControl, segmentedControl } from "./segmented-pill-core";
import { segmentedPillCss } from "./segmented-pill-styles";

// ---- upstream: src/react.d.ts ----
export interface SegmentedPillItem {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface SegmentedPillProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  items: readonly SegmentedPillItem[];
  value?: string;
  defaultValue?: string;
  animated?: boolean;
  onValueChange?: (value: string) => void;
}

// ---- upstream: src/react.js ----
// Line for line, in JSX. The core owns the roles, the selection state, the
// keyboard and the pill; React renders the buttons. Labs changes: the root
// class is `segmented-pill` (upstream: `segmented-control`), and the stylesheet
// ships in the component (the <style> below) instead of a CSS import.
export function SegmentedPill({
  items,
  value,
  defaultValue,
  animated = false,
  onValueChange,
  className = "",
  ...attributes
}: SegmentedPillProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<SegmentedControl | null>(null);
  const onValueChangeRef = useRef(onValueChange);
  const valueRef = useRef(value);
  const defaultValueRef = useRef(defaultValue);
  onValueChangeRef.current = onValueChange;
  valueRef.current = value;
  defaultValueRef.current = defaultValue;
  const itemSignature = JSON.stringify(
    items.map((item) => [item.value, Boolean(item.disabled)]),
  );

  // As upstream: the core is re-created only when the items or `animated`
  // change; the latest value and callback are read from refs.
  useLayoutEffect(() => {
    const control = segmentedControl(rootRef.current as HTMLDivElement, {
      value: valueRef.current ?? defaultValueRef.current,
      animated,
      onChange(nextValue) {
        onValueChangeRef.current?.(nextValue);
      },
    });
    controlRef.current = control;

    return () => {
      control.destroy();
      controlRef.current = null;
    };
  }, [itemSignature, animated]);

  // As upstream: the value is re-applied after the core is re-created.
  useLayoutEffect(() => {
    const control = controlRef.current;
    if (value !== undefined && control && control.value !== value) {
      control.set(value);
    }
  }, [value, itemSignature, animated]);

  const classes = ["segmented-pill", className].filter(Boolean).join(" ");

  return (
    <>
      <style href="designfrom-segmented-pill" precedence="default">
        {segmentedPillCss}
      </style>
      <div {...attributes} className={classes} ref={rootRef}>
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            data-value={item.value}
            disabled={item.disabled}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
