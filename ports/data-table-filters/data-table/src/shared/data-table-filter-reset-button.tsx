"use client";

import { useDataTable } from "./data-table-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { DataTableFilterField } from "./types";

type DataTableFilterResetButtonProps<TData> = DataTableFilterField<TData> & {
  /**
   * Renders an invisible, hidden copy of the chip that only reserves its
   * space inside the accordion trigger, so the header lays out as before.
   */
  placeholder?: boolean;
  className?: string;
};

export function DataTableFilterResetButton<TData>({
  value: _value,
  label,
  placeholder,
  className,
}: DataTableFilterResetButtonProps<TData>) {
  const { columnFilters, table } = useDataTable();
  const value = _value as string;
  const column = table.getColumn(value);
  const filterValue = columnFilters.find((f) => f.id === value)?.value;

  // TODO: check if we could useMemo
  const filters = filterValue
    ? Array.isArray(filterValue)
      ? filterValue
      : [filterValue]
    : [];

  if (filters.length === 0) return null;

  // The chip keeps the project's outline button look.
  const chip = (
    <span
      data-slot="button"
      aria-hidden={placeholder || undefined}
      className={cn(
        buttonVariants({ variant: "outline" }),
        "h-5 gap-1 px-1.5! py-1! font-mono text-[10px] shadow-none",
        placeholder
          ? "invisible"
          : "group-focus-visible/filter-reset:border-ring group-focus-visible/filter-reset:ring-[3px] group-focus-visible/filter-reset:ring-ring/50",
      )}
    >
      <span>{filters.length}</span>
      <X className="text-muted-foreground ms-1! size-2.5!" />
    </span>
  );

  if (placeholder) return chip;

  // REMINDER: `AccordionTrigger` is a button, so the chip is not rendered in
  // it (a button inside a button is invalid and hides the chip from assistive
  // technology). The filter controls render this real button next to the
  // trigger, over the placeholder's spot. Its 2px transparent padding around
  // the 20px chip makes a 24px target (WCAG 2.5.8) without moving any pixel.
  // `text-sm` gives the chip the line height it inherited from the trigger.
  return (
    <button
      type="button"
      aria-label={`Reset ${label}`}
      className={cn(
        "group/filter-reset flex p-0.5 text-sm outline-none",
        className,
      )}
      onClick={(event) => {
        // The chip unmounts once its filter is reset; keep focus on the
        // section's header button instead of dropping it to the page.
        const trigger = event.currentTarget.parentElement?.querySelector<HTMLElement>(
          '[data-slot="accordion-trigger"]',
        );
        column?.setFilterValue(undefined);
        trigger?.focus();
      }}
    >
      {chip}
    </button>
  );
}
