"use client";

import { AnchoredDropdown } from "@/components/ui/anchored-dropdown";

/**
 * The button sits at the foot of a fixed stage: the panel hangs above it, and
 * the liquid needs room below and around it for the press-and-drag finger.
 * Dark inside a `.dark` ancestor (the wall's dark tiles), light elsewhere.
 */
export default function AnchoredDropdownDemo() {
  return (
    <div className="flex h-80 w-60 items-end justify-center pb-20">
      <AnchoredDropdown />
    </div>
  );
}
