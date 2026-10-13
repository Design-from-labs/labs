"use client";

import { Sortable, SortableDragHandle, SortableItem } from "./custom/sortable";
import { useDataTable } from "./data-table-provider";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useIsRtl } from "./hooks/use-is-rtl";
import { boxRadiusClassName } from "./lib/style";
import { cn } from "@/lib/utils";
import {
  restrictToFirstScrollableAncestor,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import { Check, GripVertical, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";

/**
 * Column visibility and order.
 *
 * On `aria-nova`, `ui/command` is React Aria's `Autocomplete` around a `Menu`:
 * the search field filters the columns by id, the arrow keys move through
 * them while focus stays in the field, and Enter toggles one (the popover
 * stays open, as cmdk's does).
 *
 * The sortable context wraps the whole command, and each sortable item sits
 * inside its menu item rather than around it: React Aria renders a
 * collection's items apart from the components that wrap them, so neither a
 * ref nor a context from a wrapper reaches the rendered item. The sortable
 * row covers the item's padding box, so the whole row slides while it is
 * reordered; only the item's focus highlight stays in place.
 */
export function DataTableViewOptions() {
  const { table, enableColumnOrdering } = useDataTable();
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState(false);
  const [search, setSearch] = useState("");
  const isRtl = useIsRtl();

  const columnOrder = table.state.columnOrder;

  const sortedColumns = useMemo(
    () =>
      table.getAllColumns().sort((a, b) => {
        return columnOrder.indexOf(a.id) - columnOrder.indexOf(b.id);
      }),
    [columnOrder, table],
  );

  return (
    <PopoverTrigger isOpen={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="icon"
        aria-label="View"
        className="shadow-none"
      >
        <Settings2 className="h-4 w-4" />
      </Button>
      {/* `end` would follow React Aria's locale; the physical side follows
          `dir` on <html>, like the other variants. */}
      <Popover
        placement={isRtl ? "bottom left" : "bottom right"}
        className="w-[200px] p-0"
      >
        <Sortable
          value={sortedColumns.map((c) => ({ id: c.id }))}
          onValueChange={(items) =>
            table.setColumnOrder(items.map((c) => c.id))
          }
          overlay={
            <div className={cn("bg-muted/60 h-8 w-full", boxRadiusClassName)} />
          }
          // The sortable rows' parent is their menu item, so the default
          // "stay inside the parent" modifier would pin them; keep them in
          // the scrolling menu instead.
          modifiers={[
            restrictToVerticalAxis,
            restrictToFirstScrollableAncestor,
          ]}
          onDragStart={() => setDrag(true)}
          onDragEnd={() => setDrag(false)}
          onDragCancel={() => setDrag(false)}
        >
          <Command inputValue={search} onInputChange={setSearch}>
            <CommandInput placeholder="Search options..." />
            <CommandList
              aria-label="Columns"
              renderEmptyState={() => (
                <CommandEmpty>No option found.</CommandEmpty>
              )}
            >
              <CommandGroup aria-label="Columns">
                {sortedColumns
                  // `getCanHide()` is the single source of truth: columns that
                  // must always render (select) declare `enableHiding: false`
                  // instead of being special-cased here.
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <CommandItem
                      key={column.id}
                      id={column.id}
                      textValue={column.id}
                      onAction={() =>
                        column.toggleVisibility(!column.getIsVisible())
                      }
                      className={"capitalize"}
                      isDisabled={drag}
                      // Stay open to toggle several columns, as cmdk does.
                      shouldCloseOnSelect={false}
                    >
                      <SortableItem
                        value={column.id}
                        className="-mx-2 -my-1.5 flex flex-1 items-center gap-2 px-2 py-1.5"
                      >
                        <div
                          className={cn(
                            "border-input flex h-4 w-4 items-center justify-center rounded-sm border",
                            column.getIsVisible()
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible",
                          )}
                        >
                          <Check className={cn("text-background size-3")} />
                        </div>
                        <span>{column.columnDef.meta?.label || column.id}</span>
                        <span data-slot="command-shortcut" className="hidden" />
                        {enableColumnOrdering && !search ? (
                          <SortableDragHandle
                            variant="ghost"
                            size="icon"
                            aria-label={`Reorder ${column.columnDef.meta?.label || column.id}`}
                            className="text-muted-foreground hover:text-foreground focus:bg-muted focus:text-foreground ms-auto size-5"
                          >
                            <GripVertical
                              className="size-4"
                              aria-hidden="true"
                            />
                          </SortableDragHandle>
                        ) : null}
                      </SortableItem>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </Sortable>
      </Popover>
    </PopoverTrigger>
  );
}
