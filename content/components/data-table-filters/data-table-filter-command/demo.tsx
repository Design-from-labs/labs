"use client";

import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { flexRender, useTable } from "@tanstack/react-table";
import { format } from "date-fns";
import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/data-table/custom/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableFilterCommand } from "@/components/data-table/data-table-filter-command";
import { DataTableFilterControls } from "@/components/data-table/data-table-filter-controls";
import { DataTableProvider } from "@/components/data-table/data-table-provider";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { useMemoryAdapter } from "@/components/data-table/lib/store/adapters/memory";
import { DataTableStoreProvider } from "@/components/data-table/lib/store/provider/DataTableStoreProvider";
import { createSchema, field } from "@/components/data-table/lib/store/schema";
import {
  type DataTableFeatures,
  dataTableFeatures,
} from "@/components/data-table/lib/table/features";
import { useControls } from "@/components/data-table/providers/controls";
import type { DataTableFilterField } from "@/components/data-table/types";

// Neutral sample data, generated here: a list of uptime checks.
const REGIONS = ["ams", "fra", "iad", "sfo", "gru", "syd"] as const;
const STATUSES = ["up", "degraded", "down"] as const;
const TAGS = ["api", "web", "edge", "internal"] as const;
const NAMES = [
  "Orders API",
  "Catalog API",
  "Checkout",
  "Search",
  "Accounts",
  "Docs site",
  "Status page",
  "Media CDN",
  "Webhooks",
  "Auth service",
  "Billing worker",
  "Admin panel",
  "Reports",
  "Inbox sync",
  "Marketing site",
  "Image resizer",
];
// A fixed instant, so the server render and the hydrated client agree.
const NOW = Date.UTC(2026, 9, 1, 12, 0, 0);

type Check = {
  name: string;
  host: string;
  region: (typeof REGIONS)[number];
  status: (typeof STATUSES)[number];
  tags: (typeof TAGS)[number][];
  p95: number;
  public: boolean;
  date: Date;
};

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = seeded(7);
const data: Check[] = NAMES.map((name, index) => ({
  name,
  host: `${name.toLowerCase().replace(/\s+/g, "-")}.example.com`,
  region: REGIONS[Math.floor(random() * REGIONS.length)],
  status: random() < 0.75 ? "up" : random() < 0.6 ? "degraded" : "down",
  tags: TAGS.filter(() => random() < 0.4).slice(0, 2),
  p95: Math.round(40 + random() * 900),
  public: random() < 0.6,
  date: new Date(NOW - Math.round((index + random()) * 5 * 3600 * 1000)),
}));

const filterSchema = createSchema({
  name: field.string(),
  status: field.array(field.stringLiteral(STATUSES)).delimiter(","),
  region: field.array(field.stringLiteral(REGIONS)).delimiter(","),
  tags: field.array(field.stringLiteral(TAGS)).delimiter(","),
  p95: field.array(field.number()).delimiter("-"),
  public: field.array(field.boolean()).delimiter(","),
  date: field.array(field.timestamp()).delimiter("-"),
});

const filterFields: DataTableFilterField<Check>[] = [
  {
    label: "Time Range",
    value: "date",
    type: "timerange",
    defaultOpen: true,
    commandDisabled: true,
  },
  { label: "Name", value: "name", type: "input" },
  {
    label: "Status",
    value: "status",
    type: "checkbox",
    defaultOpen: true,
    options: STATUSES.map((status) => ({ label: status, value: status })),
  },
  {
    label: "P95",
    value: "p95",
    type: "slider",
    min: 0,
    max: 1000,
    unit: "ms",
  },
  {
    label: "Region",
    value: "region",
    type: "checkbox",
    options: REGIONS.map((region) => ({ label: region, value: region })),
  },
  {
    label: "Tags",
    value: "tags",
    type: "checkbox",
    options: TAGS.map((tag) => ({ label: tag, value: tag })),
  },
  {
    label: "Public",
    value: "public",
    type: "checkbox",
    options: [true, false].map((bool) => ({ label: `${bool}`, value: bool })),
  },
];

const columns: ColumnDef<DataTableFeatures, Check>[] = [
  { accessorKey: "name", header: "Name", enableHiding: false },
  {
    accessorKey: "host",
    header: "Host",
    cell: ({ row }) => (
      <div className="max-w-[180px] truncate">{row.original.host}</div>
    ),
  },
  { accessorKey: "status", header: "Status", filterFn: "arrSome" },
  {
    accessorKey: "region",
    header: "Region",
    filterFn: "arrSome",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.region}</span>
    ),
  },
  {
    accessorKey: "tags",
    header: "Tags",
    filterFn: "arrIncludesSome",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.tags.map((tag) => (
          <span key={tag} className="rounded-md border px-1.5 text-xs">
            {tag}
          </span>
        ))}
      </div>
    ),
  },
  {
    accessorKey: "p95",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="P95" />
    ),
    filterFn: "inNumberRange",
    cell: ({ row }) => (
      <div>
        <span className="font-mono">{row.original.p95}</span> ms
      </div>
    ),
  },
  {
    accessorKey: "public",
    header: "Public",
    filterFn: "arrSome",
    cell: ({ row }) => (row.original.public ? "Yes" : "No"),
  },
  {
    accessorKey: "date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Checked" />
    ),
    filterFn: "inDateRange",
    cell: ({ row }) => (
      <div className="text-muted-foreground text-xs" suppressHydrationWarning>
        {format(row.original.date, "LLL dd, HH:mm")}
      </div>
    ),
  },
];

function ChecksTable({ wall = false }: { wall?: boolean }) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const tableOptions = React.useMemo(
    () => ({
      features: dataTableFeatures,
      data,
      columns,
      state: { columnFilters, sorting, pagination },
      onColumnFiltersChange: setColumnFilters,
      onSortingChange: setSorting,
      onPaginationChange: setPagination,
      enableFilters: true,
      enableColumnFilters: true,
    }),
    [columnFilters, sorting, pagination],
  );
  const table = useTable(tableOptions);

  return (
    <DataTableProvider
      table={table}
      columns={columns}
      filterFields={filterFields}
      columnFilters={columnFilters}
      sorting={sorting}
      pagination={pagination}
    >
      <div className="flex w-full flex-col sm:flex-row sm:[--controls-width:13rem] md:[--controls-width:16rem]">
        {/* On the /ui wall the specimen carries no text of its own, so the
            filter column (whose section headers are headings) is left out. */}
        {wall ? null : (
          <FilterPanel>
            <DataTableFilterControls />
          </FilterPanel>
        )}
        <div className="flex max-w-full flex-1 flex-col gap-4 overflow-hidden p-1 sm:group-data-[expanded=true]/controls:ms-3">
          <DataTableFilterCommand
            schema={filterSchema.definition}
            tableId="demo-command"
          />
          <DataTableToolbar />
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="hover:bg-transparent"
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </DataTableProvider>
  );
}

/** The filter column; collapsed, it is `w-0` and `inert`, like upstream's. */
function FilterPanel({ children }: { children: React.ReactNode }) {
  const { open } = useControls();
  return (
    <div
      inert={!open}
      className="hidden w-full overflow-hidden transition-[width] duration-200 ease-linear motion-reduce:transition-none sm:block sm:w-(--controls-width) sm:shrink-0 sm:self-start sm:group-data-[expanded=false]/controls:w-0"
    >
      <div className="w-full p-1 sm:w-(--controls-width)">{children}</div>
    </div>
  );
}

/** `wall`: the /ui wall's specimen (no headings); the page demo omits it. */
export default function DataTableFilterCommandDemo({
  wall = false,
}: {
  wall?: boolean;
} = {}) {
  const adapter = useMemoryAdapter(filterSchema.definition, {
    id: "demo-command",
  });
  return (
    <div className="w-full max-w-5xl text-sm">
      {wall ? null : <h2 className="sr-only">Uptime checks</h2>}
      <DataTableStoreProvider adapter={adapter}>
        <ChecksTable wall={wall} />
      </DataTableStoreProvider>
    </div>
  );
}
