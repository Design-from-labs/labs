"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { useHotKey } from "./hooks/use-hot-key";
import { useIsRtl } from "./hooks/use-is-rtl";
import { useMediaQuery } from "./hooks/use-media-query";
import { FilterIcon } from "lucide-react";
import React from "react";
import { DataTableFilterControls } from "./data-table-filter-controls";
import { TOOLTIP_DELAY } from "./ui-compat";

/**
 * The filter drawer for small screens.
 *
 * The drawer is the project's `ui/drawer`; shadcn's `aria-nova` style builds
 * it on Base UI's drawer, since React Aria has no swipeable drawer. It is
 * opened and closed from state rather than through its own trigger and close
 * parts, which render Base UI buttons: the toggle and the close button stay
 * the project's React Aria `Button`, and the drawer returns focus to the
 * toggle when it closes.
 */
export function DataTableFilterControlsDrawer() {
  const triggerButtonRef = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isRtl = useIsRtl();

  useHotKey(() => {
    triggerButtonRef.current?.click();
  }, "b");

  return (
    // `showSwipeHandle` keeps the grab handle the Radix variant's Vaul drawer draws.
    <Drawer
      open={open}
      onOpenChange={(next) => setOpen(next)}
      showSwipeHandle
    >
      <TooltipTrigger {...TOOLTIP_DELAY}>
        <Button
          ref={isMobile ? triggerButtonRef : null}
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="Toggle filters"
          aria-haspopup="dialog"
          aria-expanded={open}
          onPress={() => setOpen((prev) => !prev)}
        >
          <FilterIcon className="h-4 w-4" />
        </Button>
        <Tooltip placement={isRtl ? "left" : "right"}>
          <p className="text-nowrap">
            Toggle controls with{" "}
            <Kbd className="text-muted-foreground group-hover:text-accent-foreground ms-1">
              <span className="me-1">⌘</span>
              <span>B</span>
            </Kbd>
          </p>
        </Tooltip>
      </TooltipTrigger>
      <DrawerContent className="max-h-[calc(100dvh-4rem)]">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Filters</DrawerTitle>
          <DrawerDescription>Adjust your table filters</DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4">
          <DataTableFilterControls />
        </div>
        <DrawerFooter>
          <Button
            variant="outline"
            className="w-full"
            onPress={() => setOpen(false)}
          >
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
