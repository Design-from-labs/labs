// Props to https://github.com/shadcn-ui/ui/issues/885#issuecomment-2059600641

"use client";

import { cn } from "@/lib/utils";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import * as React from "react";
import { useIsRtl } from "../hooks/use-is-rtl";

/**
 * The block's range slider on Base UI. It keeps the Radix-flavored props the
 * filter controls use (`value: number[]`, `onValueChange(values)`,
 * `onValueCommit`, `dir`) and maps them onto Base UI's root.
 */
type SliderProps = Omit<
  SliderPrimitive.Root.Props<number[]>,
  | "className"
  | "value"
  | "defaultValue"
  | "onValueChange"
  | "onValueCommitted"
> & {
  className?: string;
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  dir?: "ltr" | "rtl";
};

const toArray = (value: number | readonly number[]) =>
  Array.isArray(value) ? [...value] : [value as number];

function Slider({
  className,
  dir,
  onValueChange,
  onValueCommit,
  ...props
}: SliderProps) {
  const initialValue = Array.isArray(props.value)
    ? props.value
    : [props.min, props.max];
  // Base UI reads the direction from its provider, not the DOM; follow `dir`
  // on <html> unless a direction is passed.
  const isRtl = useIsRtl();

  return (
    <DirectionProvider direction={dir ?? (isRtl ? "rtl" : "ltr")}>
      <SliderPrimitive.Root
        data-slot="slider"
        className={cn("relative w-full", className)}
        // Keep the thumbs inside the track at the extremes, as Radix does.
        thumbAlignment="edge"
        onValueChange={(value) => onValueChange?.(toArray(value))}
        onValueCommitted={(value) => onValueCommit?.(toArray(value))}
        {...props}
      >
        <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none">
          <SliderPrimitive.Track className="bg-secondary relative h-2 w-full grow overflow-hidden rounded-full">
            <SliderPrimitive.Indicator className="bg-primary h-full" />
          </SliderPrimitive.Track>
          {initialValue.map((_, index) => (
            <React.Fragment key={index}>
              <SliderPrimitive.Thumb
                index={index}
                // A range's thumbs are range inputs; name them so each
                // reads as its bound.
                getAriaLabel={
                  initialValue.length === 2
                    ? (i) => (i === 0 ? "Minimum" : "Maximum")
                    : undefined
                }
                className="border-primary bg-background has-focus-visible:border-ring has-focus-visible:ring-ring/50 block h-4 w-4 rounded-full border-2 transition-[border-color,box-shadow] outline-none has-focus-visible:ring-[3px] data-disabled:pointer-events-none data-disabled:opacity-50"
              />
            </React.Fragment>
          ))}
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
    </DirectionProvider>
  );
}

export { Slider };
