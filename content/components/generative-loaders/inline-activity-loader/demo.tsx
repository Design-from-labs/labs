import {
  InlineActivityLoader,
  type InlineActivityLoaderVariant,
} from "@/components/ui/inline-activity-loader";

const STEPS: { variant: InlineActivityLoaderVariant; text: string }[] = [
  { variant: "orbit", text: "Searching the web" },
  { variant: "signal", text: "Reading 12 sources" },
  { variant: "glyph", text: "Writing the answer" },
];

const VARIANTS: InlineActivityLoaderVariant[] = [
  "glyph",
  "matrix",
  "orbit",
  "ripple",
  "signal",
  "spark",
  "rotor",
  "pixel-drift",
  "chomp",
  "snake",
  "fold",
  "gravity",
  "domino",
  "aperture",
  "dot-pulse",
  "vortex",
  "halo",
  "count-up",
];

export default function InlineActivityLoaderDemo() {
  return (
    <div className="flex w-full max-w-lg flex-col gap-6 text-foreground">
      <ul className="flex flex-col gap-2 text-sm">
        {STEPS.map((step) => (
          <li key={step.text} className="flex items-center gap-2">
            {/* No label: the text next to it names the activity. */}
            <InlineActivityLoader variant={step.variant} />
            <span>{step.text}</span>
          </li>
        ))}
        <li className="flex items-center gap-2 text-muted-foreground">
          <InlineActivityLoader
            variant="dot-pulse"
            label="Assistant is thinking"
          />
        </li>
      </ul>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {VARIANTS.map((variant) => (
          <li
            key={variant}
            className="flex flex-col items-center gap-2 rounded-lg border border-border px-1 py-3"
          >
            <InlineActivityLoader variant={variant} size={28} />
            <span className="text-muted-foreground text-xs">{variant}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
