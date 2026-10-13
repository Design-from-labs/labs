"use client";

import * as React from "react";
import { Shimmer } from "@/components/ui/shimmer-trace";

function ProfileCard() {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground">
      <span
        aria-hidden="true"
        className="size-12 shrink-0 rounded-full bg-linear-to-br from-sky-400 to-indigo-500"
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-base">Ada Lovelace</p>
        <p className="text-muted-foreground text-sm">Analyst, Engines</p>
        <p className="mt-2 text-sm leading-relaxed">
          Wrote the first published program, for a machine that was never
          finished.
        </p>
      </div>
    </div>
  );
}

export default function ShimmerTraceDemo() {
  // The server renders the loaded card (a skeleton needs the browser to
  // measure); the client shows the traced skeleton once, then on Reload.
  const [loading, setLoading] = React.useState(false);
  const root = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setLoading(true);
  }, []);

  React.useEffect(() => {
    if (!loading) {
      return;
    }
    let timer = 0;
    const finish = () => {
      // On the gallery wall the tile pauses offscreen, in a hidden tab, under
      // reduced motion and when the visitor pauses animations.
      if (root.current?.closest("[data-loop-paused]")) {
        timer = window.setTimeout(finish, 250);
        return;
      }
      setLoading(false);
    };
    timer = window.setTimeout(finish, 2400);
    return () => window.clearTimeout(timer);
  }, [loading]);

  return (
    <div ref={root} className="flex w-full max-w-md flex-col gap-4">
      <Shimmer
        loading={loading}
        baseColor="var(--accent, #e0e0e0)"
        highlightColor="var(--card, #f5f5f5)"
        loadingLabel="Loading profile"
      >
        <ProfileCard />
      </Shimmer>
      <button
        type="button"
        onClick={() => setLoading(true)}
        disabled={loading}
        className="self-start rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        Reload
      </button>
    </div>
  );
}
