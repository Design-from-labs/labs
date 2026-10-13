import { GradientSpin } from "@/components/ui/gradient-spin";

const SPINNERS = [
  { pattern: "arrow-up", gradient: "sunrise" },
  { pattern: "diagonal", gradient: "bubble" },
  { pattern: "snake", gradient: "mint" },
  { pattern: "ripple", gradient: "twilight" },
] as const;

export default function GradientSpinDemo() {
  return (
    <div className="flex flex-col items-center gap-8 text-foreground">
      <div className="flex flex-wrap items-center justify-center gap-8">
        {SPINNERS.map(({ pattern, gradient }) => (
          <GradientSpin
            key={pattern}
            pattern={pattern}
            gradient={gradient}
            rows={5}
            cols={5}
            cellSize={8}
            cellGap={3}
            cellRadius={2}
            label={`Loading (${pattern})`}
          />
        ))}
      </div>
      <p className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm">
        <GradientSpin label="Saving changes" />
        <span aria-hidden="true">Saving changes</span>
      </p>
    </div>
  );
}
