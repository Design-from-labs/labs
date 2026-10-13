"use client";

import { useDataTable } from "./data-table-provider";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { useHotKey } from "./hooks/use-hot-key";
import { useIsRtl } from "./hooks/use-is-rtl";
import { X } from "lucide-react";
import { TOOLTIP_DELAY } from "./ui-compat";

export function DataTableResetButton() {
  const { table } = useDataTable();
  useHotKey(table.resetColumnFilters, "Escape");
  const isRtl = useIsRtl();

  return (
    <TooltipTrigger {...TOOLTIP_DELAY}>
      <Button variant="ghost" onPress={() => table.resetColumnFilters()}>
        <X className="me-2 h-4 w-4" />
        Reset
      </Button>
      <Tooltip placement={isRtl ? "right" : "left"}>
        <p className="text-nowrap">
          Reset filters with{" "}
          <Kbd className="text-muted-foreground group-hover:text-accent-foreground ms-1">
            <span className="me-1">⌘</span>
            <span>Esc</span>
          </Kbd>
        </p>
      </Tooltip>
    </TooltipTrigger>
  );
}
