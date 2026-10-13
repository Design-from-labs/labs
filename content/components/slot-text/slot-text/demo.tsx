"use client";

import * as React from "react";
import { SlotText } from "@/components/ui/slot-text";
import { chromatic } from "@/lib/slot-text-engine";

// The upstream React example: Copy rolls up to Copied in a hue sweep, then
// rolls back down 1.4 seconds later.
export default function SlotTextDemo() {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        className="min-h-11 min-w-28 cursor-pointer rounded-xl bg-foreground px-[18px] py-3 font-semibold text-background shadow-sm transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.96]"
        onClick={() => {
          navigator.clipboard?.writeText("slot-text").catch(() => {});
          setCopied(true);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setCopied(false), 1400);
        }}
      >
        <SlotText
          text={copied ? "Copied" : "Copy"}
          options={{
            direction: copied ? "up" : "down",
            skipUnchanged: false,
            color: copied ? chromatic({ from: 190 }) : undefined,
          }}
        />
      </button>
      <span role="status" className="sr-only">
        {copied ? "Copied to the clipboard" : ""}
      </span>
    </div>
  );
}
