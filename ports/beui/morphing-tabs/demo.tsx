"use client";

import * as React from "react";

import {
  MorphingTabs,
  type MorphingTabsItem,
} from "@/components/ui/morphing-tabs";

const ROOMS: Record<
  string,
  { eyebrow: string; title: string; detail: string; accent: string }
> = {
  draft: {
    eyebrow: "in progress",
    title: "Draft",
    detail:
      "Components that are still being shaped, before anyone reviews them.",
    accent: "#db5b2f",
  },
  beta: {
    eyebrow: "on preview",
    title: "Beta",
    detail:
      "Beta ports, checked on the preview deployment before they are promoted.",
    accent: "#1bb273",
  },
  live: {
    eyebrow: "published",
    title: "Live",
    detail:
      "Ready components, in the registry, the command line and the library.",
    accent: "#7a6de2",
  },
};

function RoomPanel({ id }: { id: string }) {
  const room = ROOMS[id];
  return (
    <div className="relative min-h-64 overflow-hidden bg-[radial-gradient(circle_at_1px_1px,#dfe2e3_1px,transparent_1.5px)] bg-[size:4.8rem_4.8rem] px-7 py-8 md:px-12 md:py-10">
      <div className="relative max-w-xl">
        <p className="font-semibold text-[0.68rem] text-black/55 uppercase tracking-[0.24em]">
          {room.eyebrow}
        </p>
        <p className="mt-3 font-light text-3xl text-[#151515] tracking-[-0.055em] md:text-5xl">
          {room.title}
        </p>
        <p className="mt-4 max-w-md text-black/65 text-sm leading-6 md:text-base">
          {room.detail}
        </p>
        <div className="mt-8 flex items-center gap-3 font-medium text-black/60 text-xs">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: room.accent }}
          />
          Drag a tab, or press Alt and an arrow key, to reorder
        </div>
      </div>
    </div>
  );
}

export default function MorphingTabsDemo() {
  const initial = React.useMemo<MorphingTabsItem[]>(
    () =>
      Object.keys(ROOMS).map((id) => ({
        id,
        label: ROOMS[id].title,
        content: <RoomPanel id={id} />,
      })),
    [],
  );
  const [items, setItems] = React.useState(initial);
  const [value, setValue] = React.useState<string | null>("draft");

  return (
    <div className="flex w-full min-w-0 items-center justify-center rounded-xl bg-[#242424] p-3 md:p-8">
      <MorphingTabs
        items={items}
        value={value}
        onValueChange={setValue}
        onOrderChange={(ids) => {
          setItems((current) => {
            const byId = new Map(current.map((item) => [item.id, item]));
            return ids.flatMap((id) => {
              const item = byId.get(id);
              return item ? [item] : [];
            });
          });
        }}
        onClose={(id) => {
          setItems((current) => {
            const next = current.filter((item) => item.id !== id);
            if (id === value) setValue(next[0]?.id ?? null);
            return next.length ? next : initial;
          });
        }}
        ariaLabel="Component stages"
        className="w-full max-w-5xl"
      />
    </div>
  );
}
