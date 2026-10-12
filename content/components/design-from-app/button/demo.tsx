import { Button } from "@/components/ui/button";

const VARIANTS = [
  "default",
  "accent",
  "destructive",
  "outline",
  "secondary",
  "ghost",
  "link",
] as const;

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {VARIANTS.map((variant) => (
        <Button key={variant} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  );
}
