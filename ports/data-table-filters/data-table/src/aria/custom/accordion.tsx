"use client";

import { boxRadiusClassName } from "../lib/style";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import * as React from "react";
import {
  Button,
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  DisclosureStateContext,
  Heading,
  type Key,
} from "react-aria-components";

/**
 * The shadcn accordion API, built on React Aria's `DisclosureGroup`,
 * `Disclosure` and `DisclosurePanel`, and shipped with the block instead of
 * resolved from the project's `ui/accordion`.
 *
 * The props keep the Radix spelling the filter controls use (`type`,
 * `value`, `defaultValue`, `onValueChange` on the root, `value` on an item),
 * and the trigger and panel publish `data-state="open" | "closed"` as Radix
 * does, so the filter sidebar styles against the same attributes on every
 * variant. The panel animates its height with React Aria's
 * `--disclosure-panel-height` (a 200 ms ease-out transition, the length of the
 * Radix keyframes); closed panels are `hidden="until-found"`, so find in page
 * still opens them.
 *
 * Unlike Radix, React Aria has no non-collapsible single mode: with
 * `type="single"` the open item can always be closed again.
 */
type AccordionValueProps =
  | {
      type: "single";
      value?: string;
      defaultValue?: string;
      onValueChange?: (value: string) => void;
      collapsible?: boolean;
    }
  | {
      type?: "multiple";
      value?: string[];
      defaultValue?: string[];
      onValueChange?: (value: string[]) => void;
    };

type AccordionProps = Omit<
  React.ComponentProps<typeof DisclosureGroup>,
  | "allowsMultipleExpanded"
  | "expandedKeys"
  | "defaultExpandedKeys"
  | "onExpandedChange"
  | "className"
> & {
  className?: string;
} & AccordionValueProps;

function toKeys(value: string | string[] | undefined) {
  if (value === undefined) return undefined;
  return new Set<Key>(Array.isArray(value) ? value : value ? [value] : []);
}

function Accordion({
  type = "multiple",
  value,
  defaultValue,
  onValueChange,
  className,
  ...props
}: AccordionProps) {
  // `collapsible` only exists on the Radix single mode; see above.
  const { collapsible: _collapsible, ...rest } = props as typeof props & {
    collapsible?: boolean;
  };

  return (
    <DisclosureGroup
      data-slot="accordion"
      allowsMultipleExpanded={type === "multiple"}
      expandedKeys={toKeys(value)}
      defaultExpandedKeys={toKeys(defaultValue)}
      onExpandedChange={(keys) => {
        const next = [...keys].map(String);
        if (type === "multiple") {
          (onValueChange as ((value: string[]) => void) | undefined)?.(next);
        } else {
          (onValueChange as ((value: string) => void) | undefined)?.(
            next[0] ?? "",
          );
        }
      }}
      className={className}
      {...rest}
    />
  );
}

function AccordionItem({
  className,
  value,
  ...props
}: Omit<React.ComponentProps<typeof Disclosure>, "id" | "className"> & {
  value: string;
  className?: string;
}) {
  return (
    <Disclosure
      id={value}
      data-slot="accordion-item"
      className={cn("border-b last:border-b-0", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "className" | "children"> & {
  className?: string;
  children?: React.ReactNode;
}) {
  const state = React.useContext(DisclosureStateContext);

  return (
    <Heading className="flex">
      <Button
        slot="trigger"
        data-slot="accordion-trigger"
        data-state={state?.isExpanded ? "open" : "closed"}
        className={cn(
          "focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 py-4 text-start text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
          boxRadiusClassName,
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200 motion-reduce:transition-none" />
      </Button>
    </Heading>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof DisclosurePanel>,
  "className" | "children"
> & {
  className?: string;
  children?: React.ReactNode;
}) {
  const state = React.useContext(DisclosureStateContext);

  return (
    <DisclosurePanel
      data-slot="accordion-content"
      data-state={state?.isExpanded ? "open" : "closed"}
      className="h-(--disclosure-panel-height) overflow-hidden text-sm transition-[height] duration-200 ease-out motion-reduce:transition-none"
      {...props}
    >
      <div className={cn("pt-0 pb-4", className)}>{children}</div>
    </DisclosurePanel>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
