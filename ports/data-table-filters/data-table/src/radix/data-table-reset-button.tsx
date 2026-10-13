"use client";

import { useDataTable } from "./data-table-provider";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHotKey } from "./hooks/use-hot-key";
import { useIsRtl } from "./hooks/use-is-rtl";
import { X } from "lucide-react";
import { TOOLTIP_DELAY } from "./ui-compat";

export function DataTableResetButton() {
  const { table } = useDataTable();
  useHotKey(table.resetColumnFilters, "Escape");
  const isRtl = useIsRtl();

  return (
    <TooltipProvider {...TOOLTIP_DELAY}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" onClick={() => table.resetColumnFilters()}>
            <X className="me-2 h-4 w-4" />
            Reset
          </Button>
        </TooltipTrigger>
        <TooltipContent side={isRtl ? "right" : "left"}>
          <p className="text-nowrap">
            Reset filters with{" "}
            <Kbd className="text-muted-foreground group-hover:text-accent-foreground ms-1">
              <span className="me-1">⌘</span>
              <span>Esc</span>
            </Kbd>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
