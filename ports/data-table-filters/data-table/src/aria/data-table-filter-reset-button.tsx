"use client";

import { useDataTable } from "./data-table-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { DataTableFilterField } from "./types";

export function DataTableFilterResetButton<TData>({
  value: _value,
}: DataTableFilterField<TData>) {
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

  return (
    // REMINDER: `AccordionTrigger` is also a button(!) and we get Hydration error when rendering button within button
    // So this is the project's button look on a `div`, not its `Button`: on
    // `aria-nova` that is a React Aria `Button`, which cannot render as
    // another element. The accordion trigger around it is a React Aria button
    // too, whose press starts on `pointerdown` and whose keyboard press
    // listens on `keydown`; both stop here so resetting does not also
    // toggle the filter.
    <div
      role="button"
      tabIndex={0}
      data-slot="button"
      className={cn(
        buttonVariants({ variant: "outline" }),
        "h-5 gap-1 px-1.5! py-1! font-mono text-[10px] shadow-none",
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        column?.setFilterValue(undefined);
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.code === "Enter" || e.code === "Space") {
          e.preventDefault();
          column?.setFilterValue(undefined);
        }
      }}
    >
      <span>{filters.length}</span>
      <X className="text-muted-foreground ms-1! size-2.5!" />
    </div>
  );
}
