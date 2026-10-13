// Props to https://github.com/shadcn-ui/ui/issues/885#issuecomment-2059600641

"use client";

import { cn } from "@/lib/utils";
import {
  Slider as SliderPrimitive,
  SliderFill,
  SliderThumb,
  SliderTrack,
  type SliderProps as SliderPrimitiveProps,
} from "react-aria-components";
import { FollowDirection } from "./follow-direction";

/**
 * The range slider of the filter sidebar on React Aria's `Slider`,
 * `SliderTrack`, `SliderFill` and `SliderThumb`, with the Radix wrapper's
 * props (`value`, `min`, `max`, `onValueChange`, `onValueCommit`,
 * `disabled`), so the filter controls are the same on every variant.
 *
 * Radix keeps a thumb inside the track at either end; React Aria centres it on
 * the value. The thumbs run on a track inset by half a thumb on each side, and
 * the bar and its fill span the full width, which puts the thumbs and the fill
 * exactly where the Radix slider draws them. Each thumb is a native range input
 * underneath, named "Minimum" and "Maximum" when there are two. React Aria
 * reads the direction from its locale; `FollowDirection` keeps it in step with
 * `dir` on `<html>`, so under `dir="rtl"` the minimum sits on the right and the
 * arrow keys follow.
 */
interface SliderProps extends Omit<
  SliderPrimitiveProps<number[]>,
  | "value"
  | "defaultValue"
  | "onChange"
  | "onChangeEnd"
  | "minValue"
  | "maxValue"
  | "isDisabled"
  | "className"
  | "children"
> {
  value?: number[];
  defaultValue?: number[];
  min?: number;
  max?: number;
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  disabled?: boolean;
  className?: string;
}

function Slider({
  className,
  value,
  defaultValue,
  min,
  max,
  onValueChange,
  onValueCommit,
  disabled,
  ...props
}: SliderProps) {
  const thumbs = value ?? defaultValue ?? [min ?? 0, max ?? 100];

  return (
    <FollowDirection>
      <SliderPrimitive
        data-slot="slider"
        value={value}
        defaultValue={defaultValue}
        minValue={min}
        maxValue={max}
        onChange={onValueChange}
        onChangeEnd={onValueCommit}
        isDisabled={disabled}
        className={cn(
          "relative flex w-full touch-none items-center select-none",
          className,
        )}
        {...props}
      >
        <SliderTrack className="relative mx-2 h-4 grow">
          <div className="bg-secondary absolute inset-y-0 -inset-x-2 my-auto h-2 overflow-hidden rounded-full">
            <SliderFill className="bg-primary" />
          </div>
          {thumbs.map((_, index) => (
            <SliderThumb
              key={index}
              index={index}
              aria-label={
                thumbs.length === 2
                  ? index === 0
                    ? "Minimum"
                    : "Maximum"
                  : undefined
              }
              className="border-primary bg-background data-focus-visible:border-ring data-focus-visible:ring-ring/50 top-1/2 block h-4 w-4 rounded-full border-2 transition-[color,box-shadow,border-color] outline-none data-disabled:pointer-events-none data-disabled:opacity-50 data-focus-visible:ring-[3px]"
            />
          ))}
        </SliderTrack>
      </SliderPrimitive>
    </FollowDirection>
  );
}

export { Slider };
