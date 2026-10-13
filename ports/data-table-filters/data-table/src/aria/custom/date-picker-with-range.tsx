"use client";

import type { DatePreset } from "../types";
import { Button } from "@/components/ui/button";
import { RangeCalendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { presets as defaultPresets } from "../constants/date-preset";
import { useDebounce } from "../hooks/use-debounce";
import { cn } from "@/lib/utils";
import {
  CalendarDate,
  getLocalTimeZone,
  type DateValue,
} from "@internationalized/date";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";
import type { RangeValue } from "react-aria-components";
import { FollowDirection } from "./follow-direction";

/**
 * A date range as the filter controls pass it around: JavaScript dates, the
 * end optional while a range is being picked. The same shape as
 * react-day-picker's `DateRange`, which the other variants use.
 */
export type DateRange = { from: Date | undefined; to?: Date | undefined };

/**
 * React Aria's `RangeCalendar` (what `aria-nova`'s `ui/calendar` builds on)
 * works in calendar dates from `@internationalized/date`. A picked day becomes
 * local midnight, as react-day-picker's days do; a preset keeps its time, and
 * the calendar only highlights its days.
 */
function toCalendarDate(date: Date) {
  return new CalendarDate(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
}

function toRangeValue(
  date: DateRange | undefined,
): RangeValue<DateValue> | null {
  if (!date?.from) return null;
  return {
    start: toCalendarDate(date.from),
    end: toCalendarDate(date.to ?? date.from),
  };
}

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  presets?: DatePreset[];
}

export function DatePickerWithRange({
  className,
  date,
  setDate,
  presets = defaultPresets,
}: DatePickerWithRangeProps) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!open) return;

      presets.map((preset) => {
        if (preset.shortcut === e.key) {
          setDate({ from: preset.from, to: preset.to });
        }
      });
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setDate, presets, open]);

  return (
    <div className={cn("grid gap-2", className)}>
      <PopoverTrigger isOpen={open} onOpenChange={setOpen}>
        <Button
          id="date"
          variant="outline"
          className={cn(
            "hover:bg-muted/50 max-w-full justify-start truncate text-start font-normal shadow-none",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          {date?.from ? (
            date.to ? (
              <span className="truncate">
                {format(date.from, "LLL dd, y")} -{" "}
                {format(date.to, "LLL dd, y")}
              </span>
            ) : (
              format(date.from, "LLL dd, y")
            )
          ) : (
            <span>Pick a date</span>
          )}
        </Button>
        <FollowDirection>
          <Popover placement="bottom start" className="w-auto p-0">
            <div className="flex flex-col justify-between sm:flex-row">
              <div className="hidden sm:block">
                <DatePresets
                  onSelect={setDate}
                  selected={date}
                  presets={presets}
                />
              </div>
              <div className="block p-3 sm:hidden">
                <DatePresetsSelect
                  onSelect={setDate}
                  selected={date}
                  presets={presets}
                />
              </div>
              <Separator orientation="vertical" className="h-auto w-px" />
              <RangeCalendar
                aria-label="Date range"
                autoFocus
                defaultFocusedValue={
                  date?.from ? toCalendarDate(date.from) : undefined
                }
                value={toRangeValue(date)}
                onChange={(range) => {
                  if (!range) return setDate(undefined);
                  const timeZone = getLocalTimeZone();
                  setDate({
                    from: range.start.toDate(timeZone),
                    to: range.end.toDate(timeZone),
                  });
                }}
                numberOfMonths={1}
              />
            </div>
            <Separator />
            <CustomDateRange onSelect={setDate} selected={date} />
          </Popover>
        </FollowDirection>
      </PopoverTrigger>
    </div>
  );
}

function DatePresets({
  selected,
  onSelect,
  presets,
}: {
  selected: DateRange | undefined;
  onSelect: (date: DateRange | undefined) => void;
  presets: DatePreset[];
}) {
  return (
    <div className="flex flex-col gap-2 p-3">
      <p className="text-muted-foreground mx-3 text-xs uppercase">Date Range</p>
      <div className="grid gap-1">
        {presets.map(({ label, shortcut, from, to }) => {
          const isActive = selected?.from === from && selected?.to === to;
          return (
            <Button
              key={label}
              variant={isActive ? "outline" : "ghost"}
              onPress={() => onSelect({ from, to })}
              className={cn(
                "flex items-center justify-between gap-6",
                !isActive && "border border-transparent!",
              )}
            >
              <span className="me-auto">{label}</span>
              <Kbd className="uppercase">{shortcut}</Kbd>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function DatePresetsSelect({
  selected,
  onSelect,
  presets,
}: {
  selected: DateRange | undefined;
  onSelect: (date: DateRange | undefined) => void;
  presets: DatePreset[];
}) {
  function findPreset(from?: Date, to?: Date) {
    return presets.find((p) => p.from === from && p.to === to)?.shortcut;
  }
  const [value, setValue] = React.useState<string | undefined>(
    findPreset(selected?.from, selected?.to),
  );

  React.useEffect(() => {
    const preset = findPreset(selected?.from, selected?.to);
    if (preset === value) return;
    setValue(preset);
  }, [selected, presets]);

  return (
    <Select
      aria-label="Date presets"
      selectedKey={value ?? null}
      onSelectionChange={(key) => {
        const preset = presets.find((p) => p.shortcut === key);
        if (preset) {
          onSelect({ from: preset.from, to: preset.to });
        }
      }}
    >
      {/* REMINDER: the label is rendered here rather than through
          `SelectValue`, as on the other variants, so the trigger reads the
          same everywhere; picking the muted colour by hand keeps the
          placeholder looking the same. */}
      <SelectTrigger className={cn(!value && "text-muted-foreground")}>
        {presets.find((preset) => preset.shortcut === value)?.label ??
          "Date Presets"}
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Date Presets</SelectLabel>
          {presets.map(({ label, shortcut }) => {
            return (
              <SelectItem
                key={label}
                id={shortcut}
                textValue={label}
                className="flex items-center justify-between [&>span:first-child]:w-full [&>span:first-child]:justify-between"
              >
                <span>{label}</span>
                <Kbd className="ms-2 uppercase">{shortcut}</Kbd>
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

// REMINDER: We can add min max date range validation https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/datetime-local#setting_maximum_and_minimum_dates_and_times
function CustomDateRange({
  selected,
  onSelect,
}: {
  selected: DateRange | undefined;
  onSelect: (date: DateRange | undefined) => void;
}) {
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(
    selected?.from,
  );
  const [dateTo, setDateTo] = React.useState<Date | undefined>(selected?.to);
  const debounceDateFrom = useDebounce(dateFrom, 1000);
  const debounceDateTo = useDebounce(dateTo, 1000);

  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return "";
    const utcDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return utcDate.toISOString().slice(0, 16);
  };

  React.useEffect(() => {
    onSelect({ from: debounceDateFrom, to: debounceDateTo });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounceDateFrom, debounceDateTo]);

  return (
    <div className="flex flex-col gap-2 p-3">
      <p className="text-muted-foreground text-xs uppercase">Custom Range</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid w-full gap-1.5">
          <Label htmlFor="from">Start</Label>
          <Input
            key={formatDateForInput(selected?.from)}
            type="datetime-local"
            id="from"
            name="from"
            defaultValue={formatDateForInput(selected?.from)}
            onChange={(e) => {
              const newDate = new Date(e.target.value);
              if (!Number.isNaN(newDate.getTime())) {
                setDateFrom(newDate);
              }
            }}
            disabled={!selected?.from}
          />
        </div>
        <div className="grid w-full gap-1.5">
          <Label htmlFor="to">End</Label>
          <Input
            key={formatDateForInput(selected?.to)}
            type="datetime-local"
            id="to"
            name="to"
            defaultValue={formatDateForInput(selected?.to)}
            onChange={(e) => {
              const newDate = new Date(e.target.value);
              if (!Number.isNaN(newDate.getTime())) {
                setDateTo(newDate);
              }
            }}
            disabled={!selected?.to}
          />
        </div>
      </div>
    </div>
  );
}
