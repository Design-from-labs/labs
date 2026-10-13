"use client";

import * as React from "react";
import { SegmentedPill } from "@/components/ui/segmented-pill";

const SECTIONS = [
  { value: "overview", label: "Overview" },
  { value: "activity", label: "Activity" },
  { value: "settings", label: "Settings" },
];

// Placeholder copy for the demo; nothing here is real data.
const COPY: Record<string, string> = {
  overview: "A summary of the sample workspace.",
  activity: "Recent changes in the sample workspace.",
  settings: "Preferences for the sample workspace.",
};

export default function SegmentedPillDemo() {
  const [value, setValue] = React.useState("overview");

  return (
    <div className="flex w-full flex-col items-center gap-4 text-center">
      <SegmentedPill
        aria-label="Section"
        items={SECTIONS}
        value={value}
        onValueChange={setValue}
        animated
      />
      <p className="min-h-5 text-muted-foreground text-sm">{COPY[value]}</p>
    </div>
  );
}
