import { Check, Minus } from "lucide-react";

export function DataTableCellBoolean({
  value,
  color,
}: {
  value: boolean;
  color?: string;
}) {
  if (value) {
    return (
      <Check
        className={`ms-auto h-4 w-4 ${color ? "" : "text-foreground"}`}
        style={color ? { color } : undefined}
      />
    );
  }
  return (
    <Minus
      className={`ms-auto h-4 w-4 ${color ? "" : "text-muted-foreground/50"}`}
      style={color ? { color } : undefined}
    />
  );
}
