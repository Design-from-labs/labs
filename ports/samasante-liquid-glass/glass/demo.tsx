"use client";

import * as React from "react";

import { Glass } from "@/components/ui/glass";

// An asset-free backdrop: stripes and a bold word bend visibly through a lens.
function Scene() {
  return (
    <div className="grid h-64 w-full place-items-center bg-[repeating-linear-gradient(90deg,#1d4ed8_0_18px,#f8fafc_18px_36px)]">
      <span className="bg-yellow-300 px-4 py-1 font-extrabold text-5xl text-neutral-900 tracking-tight">
        Liquid
      </span>
    </div>
  );
}

export default function GlassDemo() {
  const [center, setCenter] = React.useState({ x: 0.32, y: 0.5 });
  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      {/* The lens bends its own children in place, in every browser. */}
      <div
        className="w-full overflow-hidden rounded-xl"
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setCenter({
            x: (event.clientX - rect.left) / rect.width,
            y: (event.clientY - rect.top) / rect.height,
          });
        }}
      >
        <Glass size={150} center={center} className="w-full">
          <Scene />
        </Glass>
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-[linear-gradient(135deg,#b24bd8,#f0793b)] p-6">
        {/* A plain wrap is a glass material: frost, tint and a bright edge. */}
        <Glass className="rounded-full bg-white/25 px-5 py-2 font-semibold text-sm text-white">
          Glass material
        </Glass>
        <p className="text-sm text-white/90">
          Move the pointer over the stripes.
        </p>
      </div>
    </div>
  );
}
