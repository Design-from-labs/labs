"use client";

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCopyToClipboard } from "../hooks/use-copy-to-clipboard";
import { useIsRtl } from "../hooks/use-is-rtl";
import { boxRadiusClassName } from "../lib/style";
import type { DataTableFeatures } from "../lib/table/features";
import { cn } from "@/lib/utils";
import type { RowData, Table } from "@tanstack/react-table";
import { endOfDay, endOfHour, startOfDay, startOfHour } from "date-fns";
import {
  CalendarClock,
  CalendarDays,
  CalendarSearch,
  ChevronLeft,
  ChevronRight,
  Copy,
  Equal,
  Search,
} from "lucide-react";
import type * as React from "react";
import { Pressable } from "react-aria-components";
import type { DataTableFilterField } from "../types";

interface DataTableSheetRowActionProps<
  TData extends RowData,
  TFields extends DataTableFilterField<TData>,
> extends Omit<React.ComponentPropsWithRef<"button">, "value"> {
  fieldValue: TFields["value"];
  filterFields: TFields[];
  value: string | number | boolean;
  table: Table<DataTableFeatures, TData>;
}

export function DataTableSheetRowAction<
  TData extends RowData,
  TFields extends DataTableFilterField<TData>,
>({
  fieldValue,
  filterFields,
  value,
  children,
  className,
  table,
  onKeyDown,
  ...props
}: DataTableSheetRowActionProps<TData, TFields>) {
  const { copy, isCopied } = useCopyToClipboard();
  // The menu opens toward the table, which is on the inline-start side.
  const isRtl = useIsRtl();
  const field = filterFields.find((field) => field.value === fieldValue);
  const column = table.getColumn(fieldValue.toString());

  if (!field || !column) return null;

  function renderOptions() {
    if (!field) return null;
    switch (field.type) {
      case "checkbox":
        return (
          <DropdownMenuItem
            textValue="Include"
            onAction={() => {
              // FIXME:
              const filterValue = column?.getFilterValue() as
                undefined | Array<unknown>;
              const newValue = filterValue?.includes(value)
                ? filterValue
                : [...(filterValue || []), value];

              column?.setFilterValue(newValue);
            }}
          >
            <Search />
            Include
          </DropdownMenuItem>
        );
      case "input":
        return (
          <DropdownMenuItem
            textValue="Include"
            onAction={() => column?.setFilterValue(value)}
          >
            <Search />
            Include
          </DropdownMenuItem>
        );
      case "slider":
        return (
          <>
            <DropdownMenuItem
              textValue="Less or equal than"
              onAction={() => column?.setFilterValue([0, value])}
            >
              {/* FIXME: change icon as it is not clear */}
              <ChevronLeft />
              Less or equal than
            </DropdownMenuItem>
            <DropdownMenuItem
              textValue="Greater or equal than"
              onAction={() => column?.setFilterValue([value, 5000])}
            >
              {/* FIXME: change icon as it is not clear */}
              <ChevronRight />
              Greater or equal than
            </DropdownMenuItem>
            <DropdownMenuItem
              textValue="Equal to"
              onAction={() => column?.setFilterValue([value])}
            >
              <Equal />
              Equal to
            </DropdownMenuItem>
          </>
        );
      case "timerange":
        const date = new Date(value as string | number);
        return (
          <>
            <DropdownMenuItem
              textValue="Exact timestamp"
              onAction={() => column?.setFilterValue([date])}
            >
              <CalendarSearch />
              Exact timestamp
            </DropdownMenuItem>
            <DropdownMenuItem
              textValue="Same hour"
              onAction={() => {
                const start = startOfHour(date);
                const end = endOfHour(date);
                column?.setFilterValue([start, end]);
              }}
            >
              <CalendarClock />
              Same hour
            </DropdownMenuItem>
            <DropdownMenuItem
              textValue="Same day"
              onAction={() => {
                const start = startOfDay(date);
                const end = endOfDay(date);
                column?.setFilterValue([start, end]);
              }}
            >
              <CalendarDays />
              Same day
            </DropdownMenuItem>
          </>
        );
      default:
        return null;
    }
  }

  return (
    // On `aria-nova`, `DropdownMenuTrigger` is React Aria's `MenuTrigger`
    // (the trigger and the menu go inside it) and `DropdownMenu` is the
    // menu's popover. The field row stays a plain button, made the trigger by
    // `Pressable`.
    <DropdownMenuTrigger>
      <Pressable>
        <button
          type="button"
          className={cn(
            "focus-visible:border-ring focus-visible:ring-ring/50 transition-all outline-none focus-visible:ring-[3px]",
            boxRadiusClassName,
            "relative",
            className,
          )}
          onKeyDownCapture={(e) => {
            // REMINDER: default behavior is to open the dropdown menu
            // But because we use the arrow keys to navigate between rows, we
            // need to prevent it and only use "Enter" to select the option.
            // React Aria's menu trigger also opens on ArrowUp and skips an
            // event whose default was prevented, so both are cancelled here,
            // before its handler runs; the sheet still moves between rows.
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
            }
          }}
          onKeyDown={onKeyDown}
          {...props}
        >
          {children}
          {isCopied ? (
            <div className="bg-background/70 absolute inset-0 place-content-center">
              Value copied
            </div>
          ) : null}
        </button>
      </Pressable>
      <DropdownMenu
        placement={isRtl ? "right top" : "left top"}
        className="w-48"
      >
        {renderOptions()}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          textValue="Copy value"
          onAction={() => copy(String(value), { timeout: 1000 })}
        >
          <Copy />
          Copy value
        </DropdownMenuItem>
      </DropdownMenu>
    </DropdownMenuTrigger>
  );
}
