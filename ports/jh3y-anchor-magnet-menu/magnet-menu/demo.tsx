"use client";

import { useState } from "react";

import { MagnetMenu, MagnetMenuLink } from "@/components/ui/magnet-menu";

const LINKS = ["Home", "Craft", "Posts", "Snippets", "Subscribe"];

export default function MagnetMenuDemo() {
  const [current, setCurrent] = useState("Home");
  return (
    <div className="flex min-h-14 items-center justify-center border-b px-2 py-1">
      <MagnetMenu aria-label="Example sections">
        {LINKS.map((label) => (
          <MagnetMenuLink
            key={label}
            href={`#${label.toLowerCase()}`}
            active={current === label}
            onClick={(event) => {
              event.preventDefault();
              setCurrent(label);
            }}
          >
            {label}
          </MagnetMenuLink>
        ))}
      </MagnetMenu>
    </div>
  );
}
