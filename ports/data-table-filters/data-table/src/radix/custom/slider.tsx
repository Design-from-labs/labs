// Props to https://github.com/shadcn-ui/ui/issues/885#issuecomment-2059600641

"use client";

import { cn } from "@/lib/utils";
import { Slider as SliderPrimitive } from "radix-ui";
import * as React from "react";
import { useIsRtl } from "../hooks/use-is-rtl";

function Slider({
  className,
  dir,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const initialValue = Array.isArray(props.value)
    ? props.value
    : [props.min, props.max];
  // Radix reads the direction from its provider, not the DOM; follow `dir`
  // on <html> unless a direction is passed.
  const isRtl = useIsRtl();

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      dir={dir ?? (isRtl ? "rtl" : "ltr")}
      className={cn(
        "relative flex w-full touch-none items-center select-none",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="bg-secondary relative h-2 w-full grow overflow-hidden rounded-full">
        <SliderPrimitive.Range className="bg-primary absolute h-full" />
      </SliderPrimitive.Track>
      {initialValue.map((_, index) => (
        <React.Fragment key={index}>
          <SliderPrimitive.Thumb className="border-primary bg-background focus-visible:border-ring focus-visible:ring-ring/50 block h-4 w-4 rounded-full border-2 transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50" />
        </React.Fragment>
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
