"use client";

import { DirectionProvider } from "@base-ui/react/direction-provider";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import type { HTMLAttributes } from "react";
import { useRef } from "react";
import {
  type SegmentedPillItem,
  useParentDirection,
  useSegmentedPillIndicator,
  useSegmentedPillValue,
} from "./segmented-pill-indicator";
import { segmentedPillCss } from "./segmented-pill-styles";

export type { SegmentedPillItem };

export interface SegmentedPillProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  items: readonly SegmentedPillItem[];
  value?: string;
  defaultValue?: string;
  animated?: boolean;
  onValueChange?: (value: string) => void;
}

/**
 * Segmented Pill on Base UI ToggleGroup (single): a group of toggle buttons
 * (aria-pressed). The arrow keys move focus in the reading direction
 * (wrapping), Home and End jump to the ends, and Space or Enter selects.
 * Pressing the selected item again keeps it selected.
 */
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
  const [current, select] = useSegmentedPillValue(
    items,
    value,
    defaultValue,
    onValueChange,
  );
  const rtl = useParentDirection(rootRef);
  const indicatorRef = useSegmentedPillIndicator(rootRef, current, animated, rtl);
  const classes = ["segmented-pill", animated && "is-animated", className]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <style href="designfrom-segmented-pill" precedence="default">
        {segmentedPillCss}
      </style>
      <DirectionProvider direction={rtl ? "rtl" : "ltr"}>
        <ToggleGroup
          {...attributes}
          ref={rootRef}
          value={current === undefined ? [] : [current]}
          onValueChange={(groupValue) => select(groupValue[0])}
          className={classes}
        >
          <span
            ref={indicatorRef}
            className="segmented-pill__indicator"
            aria-hidden="true"
          />
          {items.map((item) => (
            <Toggle
              key={item.value}
              value={item.value}
              data-value={item.value}
              disabled={item.disabled}
              className={item.value === current ? "is-active" : undefined}
            >
              {item.label}
            </Toggle>
          ))}
        </ToggleGroup>
      </DirectionProvider>
    </>
  );
}
