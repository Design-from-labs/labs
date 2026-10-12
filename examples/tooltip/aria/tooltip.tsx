"use client";

import * as React from "react";
import {
  Focusable,
  OverlayArrow,
  Tooltip as TooltipPrimitive,
  TooltipTrigger as TooltipTriggerPrimitive,
} from "react-aria-components";

import { cn } from "@/lib/utils";

// React Aria pairs the trigger and the tooltip inside TooltipTrigger:
// <TooltipTrigger><button>...</button><Tooltip>...</Tooltip></TooltipTrigger>.
// Focusable gives a plain focusable child the trigger behaviour.
function TooltipTrigger({
  delay = 300,
  children,
  ...props
}: React.ComponentProps<typeof TooltipTriggerPrimitive>) {
  const [trigger, tooltip] = React.Children.toArray(children);
  return (
    <TooltipTriggerPrimitive
      data-slot="tooltip-trigger"
      delay={delay}
      {...props}
    >
      <Focusable>
        {trigger as React.ComponentProps<typeof Focusable>["children"]}
      </Focusable>
      {tooltip}
    </TooltipTriggerPrimitive>
  );
}

function Tooltip({
  className,
  placement = "top",
  offset = 8,
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof TooltipPrimitive>,
  "children" | "className"
> & {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <TooltipPrimitive
      data-slot="tooltip-content"
      placement={placement}
      offset={offset}
      className={cn(
        // React Aria marks entering and exiting frames, so a plain opacity
        // transition animates both open and close.
        "z-50 w-fit max-w-xs rounded-md bg-foreground px-3 py-1.5 text-background text-xs leading-snug shadow-md transition-opacity duration-150 data-entering:opacity-0 data-exiting:opacity-0 motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <OverlayArrow>
        <svg
          width={10}
          height={5}
          viewBox="0 0 10 5"
          aria-hidden="true"
          className="block fill-foreground in-data-[placement=bottom]:rotate-180"
        >
          <path d="M0 0 L5 5 L10 0" />
        </svg>
      </OverlayArrow>
      {children}
    </TooltipPrimitive>
  );
}

export { Tooltip, TooltipTrigger };
