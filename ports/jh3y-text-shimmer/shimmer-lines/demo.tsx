"use client";

import * as React from "react";

import {
  ShimmerLines,
  type ShimmerLinesVariant,
} from "@/components/ui/shimmer-lines";

const LINES = ["CSS is awesome, right?", "CSS is awesome", "Right?!", "CSS"];
const VARIANTS: ShimmerLinesVariant[] = ["classic", "aurora", "flame"];

// The original sizes its type fluidly between 375 and 1500px wide, two steps
// up a scale (1.2 at the small end, 1.33 at the large one).
const fluid: React.CSSProperties = {
  "--font-size-min": 16,
  "--font-size-max": 20,
  "--font-ratio-min": 1.2,
  "--font-ratio-max": 1.33,
  "--font-width-min": 375,
  "--font-width-max": 1500,
  "--font-level": 2,
  "--fluid-min":
    "calc(var(--font-size-min) * pow(var(--font-ratio-min), var(--font-level)))",
  "--fluid-max":
    "calc(var(--font-size-max) * pow(var(--font-ratio-max), var(--font-level)))",
  "--fluid-preferred":
    "calc((var(--fluid-max) - var(--fluid-min)) / (var(--font-width-max) - var(--font-width-min)))",
  "--fluid-type":
    "clamp((var(--fluid-min) / 16) * 1rem, ((var(--fluid-min) / 16) * 1rem) - (((var(--fluid-preferred) * var(--font-width-min)) / 16) * 1rem) + (var(--fluid-preferred) * 100vi), (var(--fluid-max) / 16) * 1rem)",
  fontSize: "var(--fluid-type)",
} as React.CSSProperties;

/** A line you can edit; the sweep lasts longer for longer text. */
function EditableLine({
  text,
  variant,
}: {
  text: string;
  variant: ShimmerLinesVariant;
}) {
  const [length, setLength] = React.useState(text.length);
  return (
    <ShimmerLines
      variant={variant}
      length={length}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      aria-label={`Editable line: ${text}`}
      onInput={(event) =>
        setLength(Math.max(event.currentTarget.textContent?.length ?? 0, 1))
      }
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
        }
      }}
      className="outline-[hsl(280_90%_60%/0.5)] outline-offset-[0.1em]"
    >
      {text}
    </ShimmerLines>
  );
}

export default function ShimmerLinesDemo() {
  const [variant, setVariant] = React.useState<ShimmerLinesVariant>("classic");
  return (
    <div className="flex flex-col items-start gap-6 p-6" style={fluid}>
      <div className="flex flex-col items-start gap-4">
        {LINES.map((text) => (
          <EditableLine key={text} text={text} variant={variant} />
        ))}
      </div>
      <fieldset className="flex gap-1 border-0 p-0 text-sm">
        <legend className="sr-only">Style</legend>
        {VARIANTS.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={variant === name}
            onClick={() => setVariant(name)}
            className="rounded-full border border-border px-3 py-1 font-medium text-muted-foreground capitalize outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-foreground aria-pressed:text-background"
          >
            {name}
          </button>
        ))}
      </fieldset>
    </div>
  );
}
