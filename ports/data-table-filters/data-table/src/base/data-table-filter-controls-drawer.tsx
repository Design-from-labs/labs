"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHotKey } from "./hooks/use-hot-key";
import { useIsRtl } from "./hooks/use-is-rtl";
import { useMediaQuery } from "./hooks/use-media-query";
import { FilterIcon } from "lucide-react";
import React from "react";
import { DataTableFilterControls } from "./data-table-filter-controls";
import { TOOLTIP_DELAY } from "./ui-compat";

export function DataTableFilterControlsDrawer() {
  const triggerButtonRef = React.useRef<HTMLButtonElement>(null);
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isRtl = useIsRtl();

  useHotKey(() => {
    triggerButtonRef.current?.click();
  }, "b");

  return (
    // shadcn's Base UI drawer hides its swipe handle by default; show it, as
    // the Radix (Vaul) drawer does.
    <Drawer showSwipeHandle>
      <TooltipProvider {...TOOLTIP_DELAY}>
        <Tooltip>
          <TooltipTrigger
            render={
              <DrawerTrigger
                render={
                  <Button
                    ref={isMobile ? triggerButtonRef : null}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    aria-label="Toggle filters"
                  />
                }
              />
            }
          >
            <FilterIcon className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent side={isRtl ? "left" : "right"}>
            <p className="text-nowrap">
              Toggle controls with{" "}
              <Kbd className="text-muted-foreground group-hover:text-accent-foreground ms-1">
                <span className="me-1">⌘</span>
                <span>B</span>
              </Kbd>
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DrawerContent className="max-h-[calc(100dvh-4rem)]">
        {/* Visually hidden, still named and described for screen readers. */}
        <DrawerHeader className="sr-only">
          <DrawerTitle>Filters</DrawerTitle>
          <DrawerDescription>Adjust your table filters</DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4">
          <DataTableFilterControls />
        </div>
        <DrawerFooter>
          <DrawerClose render={<Button variant="outline" className="w-full" />}>
            Close
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
