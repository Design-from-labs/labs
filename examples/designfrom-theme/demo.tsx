const swatches = [
  ["background", "bg-background"],
  ["foreground", "bg-foreground"],
  ["primary", "bg-primary"],
  ["secondary", "bg-secondary"],
  ["muted", "bg-muted"],
  ["accent", "bg-accent"],
  ["destructive", "bg-destructive"],
  ["border", "bg-border"],
] as const;

export default function ThemeDemo() {
  return (
    <ul className="grid grid-cols-4 gap-3" aria-label="Theme tokens">
      {swatches.map(([name, swatch]) => (
        <li key={name} className="flex flex-col items-center gap-1.5">
          <span
            className={`size-10 rounded-md border border-border ${swatch}`}
          />
          <span className="font-mono text-[11px] text-muted-foreground">
            {name}
          </span>
        </li>
      ))}
    </ul>
  );
}
