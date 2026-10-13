"use client";

import { SpeedDial } from "@/components/ui/speed-dial";

/**
 * The button sits at the foot of a fixed stage; its three droplets fan out
 * above it, and the liquid needs room below and around it for the
 * press-and-drag finger. Dark inside a `.dark` ancestor, light elsewhere.
 */
export default function SpeedDialDemo() {
  return (
    <div className="flex h-52 w-60 items-end justify-center pb-[72px]">
      <SpeedDial />
    </div>
  );
}
