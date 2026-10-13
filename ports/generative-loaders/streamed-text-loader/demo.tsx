"use client";

import * as React from "react";
import {
  StreamedTextLoader,
  type StreamedTextLoaderVariant,
} from "@/components/ui/streamed-text-loader";

const REPLY =
  "Here is a plan: outline the sections, draft each one, then tighten the wording until it reads cleanly.";

const VARIANTS: StreamedTextLoaderVariant[] = [
  "focus",
  "decode",
  "typewriter",
  "skeleton",
  "cascade",
  "wipe",
  "flip",
  "redact",
  "line",
  "terminal",
  "wave",
  "dissolve",
  "slice",
  "tracking",
  "coalesce",
  "fragments",
];

/** Where each received chunk ends: one word (and its space) at a time. */
const CHUNK_ENDS = [...REPLY.matchAll(/\S+\s*/g)].map(
  (match) => (match.index ?? 0) + match[0].length,
);

export default function StreamedTextLoaderDemo() {
  const id = React.useId();
  const root = React.useRef<HTMLDivElement>(null);
  const [variant, setVariant] =
    React.useState<StreamedTextLoaderVariant>("focus");
  // The server renders the whole reply, still, so the tile reads well;
  // the client replays it as a model would stream it.
  const [length, setLength] = React.useState(REPLY.length);
  const [streaming, setStreaming] = React.useState(false);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    let chunk = 0;
    let timer = 0;
    const tick = () => {
      // On the gallery wall the tile pauses offscreen, in a hidden tab, under
      // reduced motion and when the visitor pauses animations.
      if (root.current?.closest("[data-loop-paused]")) {
        timer = window.setTimeout(tick, 250);
        return;
      }
      if (chunk < CHUNK_ENDS.length) {
        setLength(CHUNK_ENDS[chunk]);
        chunk += 1;
        timer = window.setTimeout(tick, 120);
        return;
      }
      timer = window.setTimeout(() => {
        chunk = 0;
        setLength(0);
        timer = window.setTimeout(tick, 500);
      }, 2400);
    };
    setStreaming(true);
    setLength(0);
    timer = window.setTimeout(tick, 400);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div ref={root} className="flex w-full max-w-md flex-col gap-4">
      <label
        htmlFor={id}
        className="flex items-center gap-2 text-muted-foreground text-sm"
      >
        Variant
        <select
          id={id}
          value={variant}
          onChange={(event) =>
            setVariant(event.target.value as StreamedTextLoaderVariant)
          }
          className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
        >
          {VARIANTS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <div className="min-h-28 rounded-xl border border-border bg-card p-5 text-card-foreground text-base leading-relaxed">
        <StreamedTextLoader
          text={REPLY.slice(0, length)}
          variant={variant}
          color="currentColor"
          paused={!streaming}
          aria-label="Assistant reply"
        />
      </div>
    </div>
  );
}
