"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import * as React from "react";

import { cn } from "@/lib/utils";

// Wrap the app (or a section) once; it shares the open delay between
// tooltips so moving across a toolbar does not wait again.
function TooltipProvider({
  delay = 300,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  );
}

// Base UI treats tooltips as visual only. To follow the WAI-ARIA tooltip
// pattern (role=tooltip, described by from the trigger), the root shares one
// id between the trigger and the popup.
const TooltipIdContext = React.createContext<string | undefined>(undefined);

function Tooltip(props: TooltipPrimitive.Root.Props) {
  const id = React.useId();
  return (
    <TooltipIdContext.Provider value={id}>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipIdContext.Provider>
  );
}

function TooltipTrigger(props: TooltipPrimitive.Trigger.Props) {
  const id = React.useContext(TooltipIdContext);
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      aria-describedby={id}
      {...props}
    />
  );
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 6,
  align = "center",
  children,
  ...props
}: Omit<TooltipPrimitive.Popup.Props, "className"> & {
  className?: string;
} & Pick<TooltipPrimitive.Positioner.Props, "side" | "sideOffset" | "align">) {
  const id = React.useContext(TooltipIdContext);
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          role="tooltip"
          id={id}
          className={cn(
            // Base UI marks the first and last frame with data attributes,
            // so a plain opacity transition animates both open and close.
            "w-fit max-w-xs rounded-md bg-foreground px-3 py-1.5 text-background text-xs leading-snug shadow-md transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none",
            className,
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className="size-2.5 rotate-45 rounded-[2px] bg-foreground data-[side=bottom]:-top-1 data-[side=top]:-bottom-1" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
