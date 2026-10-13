"use client";

import * as React from "react";

import { BounceSidebar } from "@/components/ui/bounce-sidebar";

const destinations = [
  { id: "overview", label: "Overview" },
  { id: "components", label: "Components" },
  { id: "motion", label: "Motion" },
  { id: "templates", label: "Templates" },
  { id: "changelog", label: "Changelog" },
];

export default function BounceSidebarDemo() {
  const [active, setActive] = React.useState("components");

  return (
    <div className="w-full px-2 py-6 md:h-full md:w-56">
      <BounceSidebar
        items={destinations}
        value={active}
        onValueChange={setActive}
        ariaLabel="Documentation sections"
        className="w-full"
        listClassName="w-full"
        itemClassName="text-base"
      />
    </div>
  );
}
