"use client";

import { useDataTable } from "../data-table-provider";
import { buttonVariants } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { useHotKey } from "../hooks/use-hot-key";
import { useLocalStorage } from "../hooks/use-local-storage";
import { getCommandHistoryKey } from "../lib/constants/local-storage";
import { formatCompactNumber } from "../lib/format";
import type { SchemaDefinition } from "../lib/store/schema/types";
import { boxRadiusClassName } from "../lib/style";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { LoaderCircle, Search, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Input, TextField } from "react-aria-components";
import type { DataTableFilterField } from "../types";
import {
  columnFiltersParserFromSchema,
  getFieldOptions,
  getFilterValue,
  getWordByCaretPosition,
  replaceInputByFieldType,
} from "./utils";

/**
 * On `aria-nova`, `ui/command` is React Aria's `Autocomplete` around a `Menu`
 * rather than cmdk, so this variant drives it the React Aria way: the
 * autocomplete owns the field's value (`inputValue`/`onInputChange`), its
 * `filter` gets each item's key (the cmdk `value`) and runs upstream's
 * `getFilterValue` on the word at the caret, items run `onAction`, and the
 * arrow keys move a virtual focus through the menu while focus stays in the
 * field, as cmdk does. Item details that cmdk shows for its highlighted item
 * (keyboard or pointer) show for React Aria's `data-focused` or
 * `data-hovered` one.
 */
interface DataTableFilterCommandProps {
  // Schema definition for parsing/serializing filter values (BYOS)
  schema: SchemaDefinition;
  // Unique ID for this table (used to namespace localStorage)
  tableId?: string;
}

/**
 * Box chrome — radius, border, background, focus ring — comes from the
 * project's own `buttonVariants` rather than from hardcoded utilities: every
 * shadcn style keeps its box rhythm in that string, so a `rounded-lg border`
 * that looks right on the default style is wrong on `nova`, which rounds and
 * pads its boxes with other tokens. The closed trigger and the open command
 * box share the constant, which is what keeps the two states identical.
 */
const boxClassName = cn(
  buttonVariants({ variant: "outline" }),
  "h-11 w-full justify-start gap-2 px-3 text-sm font-normal",
);

export function DataTableFilterCommand({
  schema,
  tableId = "default",
}: DataTableFilterCommandProps) {
  const {
    table,
    isLoading,
    filterFields: _filterFields,
    getFacetedUniqueValues,
  } = useDataTable();
  const columnFilters = table.state.columnFilters;
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState<boolean>(false);
  const [currentWord, setCurrentWord] = useState<string>("");
  // Guard to prevent effect cycle when serializing
  const isSerializingRef = useRef(false);
  const filterFields = useMemo(
    () => _filterFields?.filter((i) => !i.commandDisabled),
    [_filterFields],
  );
  const columnParser = useMemo(
    () => columnFiltersParserFromSchema({ schema, filterFields }),
    [schema, filterFields],
  );
  const [inputValue, setInputValue] = useState<string>(
    columnParser.serialize(columnFilters),
  );
  const [lastSearches, setLastSearches] = useLocalStorage<
    {
      search: string;
      timestamp: number;
    }[]
  >(getCommandHistoryKey(tableId), []);

  useEffect(() => {
    // Skip if this update came from serialization (prevents infinite loop)
    if (isSerializingRef.current) {
      isSerializingRef.current = false;
      return;
    }
    // TODO: we could check for ARRAY_DELIMITER or SLIDER_DELIMITER to auto-set filter when typing
    if (currentWord !== "" && open) return;
    // reset
    if (currentWord !== "" && !open) setCurrentWord("");
    // avoid recursion
    if (inputValue.trim() === "" && !open) return;

    const searchParams = columnParser.parse(inputValue);

    const currentFilters = table.state.columnFilters;
    const currentEnabledFilters = currentFilters.filter((filter) => {
      const field = _filterFields?.find((field) => field.value === filter.id);
      return !field?.commandDisabled;
    });
    const currentDisabledFilters = currentFilters.filter((filter) => {
      const field = _filterFields?.find((field) => field.value === filter.id);
      return field?.commandDisabled;
    });

    const commandDisabledFilterKeys = currentDisabledFilters.reduce(
      (prev, curr) => {
        prev[curr.id] = curr.value;
        return prev;
      },
      {} as Record<string, unknown>,
    );

    for (const key of Object.keys(searchParams)) {
      const value = searchParams[key as keyof typeof searchParams];
      table.getColumn(key)?.setFilterValue(value);
    }
    const currentFiltersToReset = currentEnabledFilters.filter((filter) => {
      return !(filter.id in searchParams);
    });
    for (const filter of currentFiltersToReset) {
      table.getColumn(filter.id)?.setFilterValue(undefined);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, open, currentWord]);

  useEffect(() => {
    // REMINDER: only update the input value if the command is closed (avoids jumps while open)
    if (!open) {
      // Set flag to prevent the parse effect from running after serialization
      isSerializingRef.current = true;
      setInputValue(columnParser.serialize(columnFilters));
    }
  }, [columnFilters, filterFields, open]);

  useHotKey(() => setOpen((open) => !open), "k");

  useEffect(() => {
    if (open) {
      inputRef?.current?.focus();
    }
  }, [open]);

  return (
    <div>
      {/* REMINDER: the closed trigger and the open command box draw the same
          `boxClassName`, so toggling the command can never change the box's
          height, radius or padding, and the dropdown borrows its radius from
          the same place. Keep the height on the boxes, not on their children —
          a taller child (kbd, spinner, browser extension node) must not grow
          one state only. */}
      <button
        type="button"
        className={cn(
          boxClassName,
          "text-muted-foreground",
          open ? "hidden" : "visible",
        )}
        onClick={() => setOpen(true)}
      >
        {isLoading ? (
          <LoaderCircle className="size-4 shrink-0 opacity-50 motion-safe:animate-spin" />
        ) : (
          <Search className="size-4 shrink-0 opacity-50" />
        )}
        <span className="w-full max-w-sm truncate text-start md:max-w-xl lg:max-w-4xl xl:max-w-5xl">
          {inputValue.trim() ? (
            <span className="text-foreground">{inputValue}</span>
          ) : (
            <span>Search data table...</span>
          )}
        </span>
        <Kbd className="text-muted-foreground ms-auto">
          <span className="me-1">⌘</span>
          <span>K</span>
        </Kbd>
      </button>
      <Command
        className={cn(
          // The root only lays the box and the dropdown out: every visible
          // edge below is drawn by them, so strip the surface a style may put
          // here (nova ships `bg-popover p-1`, whose padding inset the
          // dropdown by 4px and whose radius disagreed with the trigger). Its
          // size is left alone: styles use `size-full`, which `h-*`/`w-*` do
          // not replace in `cn`, and a full height resolves to auto here.
          "overflow-visible border-none bg-transparent p-0 shadow-none",
          open ? "visible" : "hidden",
        )}
        inputValue={inputValue}
        onInputChange={setInputValue}
        filter={(_textValue, search, node) =>
          getFilterValue({ value: String(node.key), search, currentWord }) > 0
        }
      >
        <div
          className={cn(
            boxClassName,
            "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
          )}
        >
          <Search className="size-4 shrink-0 opacity-50" />
          {/* A text field, not a search field: Escape blurs (and closes)
              rather than clearing the query. */}
          <TextField
            aria-label="Search data table"
            className="flex h-full w-full"
          >
            <Input
              ref={inputRef}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Escape") inputRef?.current?.blur();
              }}
              onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                // React Aria moves its virtual focus into the menu by
                // dispatching a blur on the field while the field keeps the
                // real focus; only a real blur closes the command.
                if (
                  e.currentTarget.ownerDocument.activeElement ===
                  e.currentTarget
                )
                  return;
                setOpen(false);
                // FIXME: doesnt reflect the jumps
                // FIXME: will save non-existing searches
                // TODO: extract into function
                const search = inputValue.trim();
                if (!search) return;
                const timestamp = Date.now();
                const searchIndex = lastSearches.findIndex(
                  (item) => item.search === search,
                );
                if (searchIndex !== -1) {
                  lastSearches[searchIndex].timestamp = timestamp;
                  setLastSearches(lastSearches);
                  return;
                }
                setLastSearches([...lastSearches, { search, timestamp }]);
                return;
              }}
              onInput={(e: React.FormEvent<HTMLInputElement>) => {
                const caretPosition = e.currentTarget?.selectionStart || -1;
                const value = e.currentTarget?.value || "";
                const word = getWordByCaretPosition({ value, caretPosition });
                setCurrentWord(word);
              }}
              placeholder="Search data table..."
              className="text-foreground placeholder:text-muted-foreground flex h-full w-full bg-transparent text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
            />
          </TextField>
        </div>
        <div className="relative">
          <div
            className={cn(
              "bg-popover text-popover-foreground animate-in motion-reduce:animate-none absolute top-2 z-10 w-full overflow-hidden border shadow-md outline-hidden",
              boxRadiusClassName,
            )}
          >
            {/* default height is 300px but in case of more, we'd like to tease the user */}
            <CommandList
              aria-label="Filters"
              className="max-h-[310px]"
              renderEmptyState={() => (
                <CommandEmpty>No results found.</CommandEmpty>
              )}
            >
              <CommandGroup heading="Filter">
                {filterFields.map((field) => {
                  if (typeof field.value !== "string") return null;
                  if (inputValue.includes(`${field.value}:`)) return null;
                  // TBD: should we handle this in the component?
                  return (
                    <CommandItem
                      key={field.value}
                      id={field.value}
                      textValue={field.value}
                      onAction={() => {
                        const value = field.value as string;
                        setInputValue((prev) => {
                          if (currentWord.trim() === "") {
                            const input = `${prev}${value}`;
                            return `${input}:`;
                          }
                          // lots of cheat
                          const isStarting = currentWord === prev;
                          const prefix = isStarting ? "" : " ";
                          const input = prev.replace(
                            `${prefix}${currentWord}`,
                            `${prefix}${value}`,
                          );
                          return `${input}:`;
                        });
                        setCurrentWord(`${value}:`);
                      }}
                      className="group"
                    >
                      {field.value}
                      <CommandItemSuggestions field={field} />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Query">
                {filterFields?.map((field) => {
                  if (typeof field.value !== "string") return null;
                  if (!currentWord.includes(`${field.value}:`)) return null;

                  const column = table.getColumn(field.value);
                  const facetedValue =
                    getFacetedUniqueValues?.(table, field.value) ||
                    column?.getFacetedUniqueValues();

                  const options = getFieldOptions({ field, facetedValue });

                  return options.map((optionValue) => {
                    return (
                      <CommandItem
                        key={`${String(field.value)}:${optionValue}`}
                        id={`${String(field.value)}:${optionValue}`}
                        textValue={`${optionValue}`}
                        onAction={() => {
                          const value = `${String(field.value)}:${optionValue}`;
                          setInputValue((prev) =>
                            replaceInputByFieldType({
                              prev,
                              currentWord,
                              optionValue,
                              value,
                              field,
                            }),
                          );
                          setCurrentWord("");
                        }}
                      >
                        {`${optionValue}`}
                        {/* data-slot="command-shortcut" hides the check icon the shadcn nova
                            presets append to every item - a second ms-auto child would
                            otherwise split the row and leave the count mid-way */}
                        {facetedValue?.has(optionValue) ? (
                          <span
                            data-slot="command-shortcut"
                            className="text-muted-foreground ms-auto font-mono"
                          >
                            {formatCompactNumber(
                              facetedValue.get(optionValue) || 0,
                            )}
                          </span>
                        ) : null}
                      </CommandItem>
                    );
                  });
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Suggestions">
                {lastSearches
                  ?.sort((a, b) => b.timestamp - a.timestamp)
                  .slice(0, 5)
                  .map((item) => {
                    return (
                      <CommandItem
                        key={`suggestion:${item.search}`}
                        id={`suggestion:${item.search}`}
                        textValue={item.search}
                        onAction={() => {
                          const value = `suggestion:${item.search}`;
                          const search = value.replace("suggestion:", "");
                          setInputValue(`${search} `);
                          setCurrentWord("");
                        }}
                        className="group"
                      >
                        {item.search}
                        <span
                          data-slot="command-shortcut"
                          className="text-muted-foreground ms-auto truncate group-data-focused:block group-data-hovered:block"
                        >
                          {formatDistanceToNow(item.timestamp, {
                            addSuffix: true,
                          })}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${item.search} from suggestions`}
                          // A menu item acts on pointer down and on pointer
                          // up; stopping both here (and keeping focus in the
                          // field) leaves only the removal.
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onPointerUp={(e) => e.stopPropagation()}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // TODO: extract into function
                            setLastSearches(
                              lastSearches.filter(
                                (i) => i.search !== item.search,
                              ),
                            );
                          }}
                          className={cn(
                            "hover:bg-background ms-1 hidden p-0.5 group-data-focused:block group-data-hovered:block",
                            boxRadiusClassName,
                          )}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            </CommandList>
            <div
              className="bg-accent/50 text-accent-foreground flex flex-wrap justify-between gap-3 border-t px-2 py-1.5 text-sm"
              cmdk-footer=""
            >
              <div className="flex flex-wrap gap-3">
                <span>
                  Use <Kbd>↑</Kbd> <Kbd>↓</Kbd> to navigate
                </span>
                <span>
                  <Kbd>Enter</Kbd> to query
                </span>
                <span>
                  <Kbd>Esc</Kbd> to close
                </span>
                <Separator
                  orientation="vertical"
                  className="my-auto aria-[orientation=vertical]:h-3"
                />
                <span>
                  Union: <Kbd>regions:a,b</Kbd>
                </span>
                <span>
                  Range: <Kbd>p95:59-340</Kbd>
                </span>
                <span>
                  Spaces: <Kbd>name:&quot;a b&quot;</Kbd>
                </span>
              </div>
              {lastSearches.length ? (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-accent-foreground"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => setLastSearches([])}
                >
                  Clear suggestions
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </Command>
    </div>
  );
}

// function CommandItemType<TData>

function CommandItemSuggestions<TData>({
  field,
}: {
  field: DataTableFilterField<TData>;
}) {
  const { table, getFacetedMinMaxValues, getFacetedUniqueValues } =
    useDataTable();
  const value = field.value as string;
  switch (field.type) {
    case "checkbox": {
      return (
        <span className="text-muted-foreground ms-1 hidden truncate group-data-focused:block group-data-hovered:block">
          {getFacetedUniqueValues
            ? Array.from(getFacetedUniqueValues(table, value)?.keys() || [])
                .map((value) => `[${value}]`)
                .join(" ")
            : field.options?.map(({ value }) => `[${value}]`).join(" ")}
        </span>
      );
    }
    case "slider": {
      const [min, max] = getFacetedMinMaxValues?.(table, value) || [
        field.min,
        field.max,
      ];
      return (
        <span className="text-muted-foreground ms-1 hidden truncate group-data-focused:block group-data-hovered:block">
          [{min} - {max}]
        </span>
      );
    }
    case "input": {
      return (
        <span className="text-muted-foreground ms-1 hidden truncate group-data-focused:block group-data-hovered:block">
          [{`${String(field.value)}`} input]
        </span>
      );
    }
    default: {
      return null;
    }
  }
}
