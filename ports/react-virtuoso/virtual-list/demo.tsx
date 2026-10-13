"use client";

import * as React from "react";
import { VirtualList, type VirtuosoHandle } from "@/components/ui/virtual-list";

const VERBS = ["Review", "Update", "Draft", "Archive", "Publish", "Plan"];
const SUBJECTS = [
  "pricing page",
  "release notes",
  "onboarding email",
  "team roadmap",
  "brand guide",
  "support macros",
  "changelog",
];
const STATUSES = ["Done", "In progress", "Queued"];
const COUNT = 10_000;

// Made-up tasks, derived from the index so every render (server and client)
// agrees.
function task(index: number) {
  return {
    title: `${VERBS[index % VERBS.length]} ${SUBJECTS[(index * 3) % SUBJECTS.length]}`,
    status: STATUSES[(index * 7) % STATUSES.length],
  };
}

export default function VirtualListDemo() {
  const list = React.useRef<VirtuosoHandle>(null);
  const root = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();

  // On the gallery wall only, the list scrolls itself a few rows at a time.
  // It holds still while the wall pauses it (offscreen, in a hidden tab,
  // under reduced motion, or when the visitor pauses animations).
  React.useEffect(() => {
    let index = 0;
    const id = window.setInterval(() => {
      const el = root.current;
      if (!el?.closest("[data-specimen]") || el.closest("[data-loop-paused]")) {
        return;
      }
      index = index >= 60 ? 0 : index + 4;
      list.current?.scrollToIndex({
        index,
        behavior: index === 0 ? "auto" : "smooth",
      });
    }, 1400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="w-full max-w-sm overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm"
      ref={root}
    >
      <div className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
        <p className="font-semibold text-sm" id={titleId}>
          Tasks
        </p>
        <p className="text-muted-foreground text-xs tabular-nums">
          {COUNT.toLocaleString("en-US")} items
        </p>
      </div>
      <VirtualList
        aria-labelledby={titleId}
        initialItemCount={8}
        itemContent={(index) => {
          const { title, status } = task(index);
          return (
            <div className="flex items-center gap-3 border-b px-4 py-2.5 text-sm">
              <span className="w-10 shrink-0 font-mono text-muted-foreground text-xs tabular-nums">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">{title}</span>
              <span className="shrink-0 rounded-full border px-2 py-0.5 text-muted-foreground text-xs">
                {status}
              </span>
            </div>
          );
        }}
        ref={list}
        style={{ height: 320 }}
        totalCount={COUNT}
      />
    </div>
  );
}
