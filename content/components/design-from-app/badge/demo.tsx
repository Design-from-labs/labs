import { Badge } from "@/components/ui/badge";

const TONES = [
  "neutral",
  "accent",
  "success",
  "warning",
  "info",
  "destructive",
] as const;

const VARIANTS = ["solid", "soft", "outline", "ghost"] as const;

export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      {VARIANTS.map((variant) => (
        <div className="flex items-center gap-2" key={variant}>
          <span className="w-16 text-muted-foreground text-xs">{variant}</span>
          {TONES.map((tone) => (
            <Badge key={tone} tone={tone} variant={variant}>
              {tone}
            </Badge>
          ))}
        </div>
      ))}
    </div>
  );
}
