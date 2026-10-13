"use client";

import { boxRadiusClassName } from "../lib/style";
import { cn } from "@/lib/utils";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDownIcon } from "lucide-react";
import * as React from "react";

/**
 * The shadcn accordion, shipped with the block instead of resolved from the
 * project's `ui/accordion`, rebuilt on Base UI's accordion.
 *
 * It keeps the Radix-flavored surface the filter controls are written
 * against, so they stay identical across variants: the root accepts
 * `type="multiple"` (Base UI: `multiple`), and the item, trigger and panel
 * publish `data-state="open" | "closed"` next to Base UI's own `data-open` /
 * `data-panel-open`, which is what the filter controls style against.
 */
type AccordionProps = Omit<AccordionPrimitive.Root.Props, "className"> & {
  className?: string;
  /** Radix spelling; `"multiple"` lets several panels stay open. */
  type?: "single" | "multiple";
  /** Accepted for API parity with Radix; Base UI items always collapse. */
  collapsible?: boolean;
};

const openState = (open: boolean) => (open ? "open" : "closed");

function Accordion({
  type,
  multiple,
  collapsible: _collapsible,
  ...props
}: AccordionProps) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      multiple={multiple ?? type === "multiple"}
      {...props}
    />
  );
}

function AccordionItem({
  className,
  ...props
}: Omit<AccordionPrimitive.Item.Props, "className"> & { className?: string }) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b last:border-b-0", className)}
      render={(itemProps, state) => (
        <div {...itemProps} data-state={openState(state.open)} />
      )}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: Omit<AccordionPrimitive.Trigger.Props, "className"> & {
  className?: string;
}) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 py-4 text-start text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
          boxRadiusClassName,
          className,
        )}
        render={(triggerProps, state) => (
          <button {...triggerProps} data-state={openState(state.open)} />
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200 motion-reduce:transition-none" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

/**
 * The item-level keyframes read `--radix-accordion-content-height`; Base UI
 * measures the panel into `--accordion-panel-height`, so the panel aliases
 * one to the other and the same CSS animates every variant.
 */
const panelHeightAlias = {
  "--radix-accordion-content-height": "var(--accordion-panel-height)",
} as React.CSSProperties;

function AccordionContent({
  className,
  children,
  style,
  ...props
}: Omit<AccordionPrimitive.Panel.Props, "className" | "style"> & {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="data-[state=closed]:animate-data-table-accordion-up data-[state=open]:animate-data-table-accordion-down motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none overflow-hidden text-sm"
      style={{ ...panelHeightAlias, ...style }}
      render={(panelProps, state) => (
        <div {...panelProps} data-state={openState(state.open)} />
      )}
      {...props}
    >
      <div className={cn("pt-0 pb-4", className)}>{children}</div>
    </AccordionPrimitive.Panel>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
