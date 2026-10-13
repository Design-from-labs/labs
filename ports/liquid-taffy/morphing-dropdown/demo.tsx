"use client";

import { MorphingDropdown } from "@/components/ui/morphing-dropdown";

/**
 * The button sits at the foot of a fixed stage and becomes the panel, which
 * grows upward out of it; the liquid needs room below and around it for the
 * press-and-drag finger. Dark inside a `.dark` ancestor, light elsewhere.
 */
export default function MorphingDropdownDemo() {
  return (
    <div className="flex h-72 w-60 items-end justify-center pb-20">
      <MorphingDropdown />
    </div>
  );
}
