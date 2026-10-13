"use client";

import type { HTMLAttributes } from "react";
import { useRef } from "react";
import {
  I18nProvider,
  Radio,
  RadioGroup,
  type RadioGroupProps,
  useLocale,
} from "react-aria-components";
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
 * Segmented Pill on React Aria RadioGroup: a horizontal radio group whose
 * radios are the segments (each a label around a visually hidden native
 * radio). As upstream, the selection follows the arrow keys (in the reading
 * direction), and Tab leaves the group from the selected item.
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
  const { direction } = useLocale();
  const classes = ["segmented-pill", animated && "is-animated", className]
    .filter(Boolean)
    .join(" ");

  const group = (
    <RadioGroup
      // The DOM attributes React Aria passes through (id, aria-*, data-*,
      // style and the global attributes); its own event types differ from
      // React's, hence the cast.
      {...(attributes as Omit<RadioGroupProps, "children">)}
      ref={rootRef}
      orientation="horizontal"
      value={current ?? null}
      onChange={select}
      className={classes}
    >
      <span
        ref={indicatorRef}
        className="segmented-pill__indicator"
        aria-hidden="true"
      />
      {items.map((item) => (
        <Radio
          key={item.value}
          value={item.value}
          data-value={item.value}
          isDisabled={item.disabled}
          className={item.value === current ? "is-active" : ""}
        >
          {item.label}
        </Radio>
      ))}
    </RadioGroup>
  );

  return (
    <>
      <style href="designfrom-segmented-pill" precedence="default">
        {segmentedPillCss}
      </style>
      {/* React Aria takes the reading direction from its locale; follow the
          page's direction when the two disagree. */}
      {(direction === "rtl") === rtl ? (
        group
      ) : (
        <I18nProvider locale={rtl ? "ar" : "en-US"}>{group}</I18nProvider>
      )}
    </>
  );
}
