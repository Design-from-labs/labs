import { cva, type VariantProps } from "class-variance-authority";
import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

// Subtle style: a light tint of the tone color with body-colored text, for
// dense tables and lists where solid badges would shout.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 font-medium text-xs [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-muted-foreground",
        info: "border-primary/20 bg-primary/10 text-foreground",
        success: "border-badge-success/30 bg-badge-success/10 text-foreground",
        warning: "border-badge-warning/40 bg-badge-warning/15 text-foreground",
        danger: "border-destructive/30 bg-destructive/10 text-foreground",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

// Each status tone pairs its color with an icon, so meaning never rests on
// color alone.
const toneIcons = {
  neutral: null,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleX,
} as const;

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  /** Shows the tone's status icon (not shown for neutral). */
  showIcon?: boolean;
}

function Badge({
  className,
  tone = "neutral",
  showIcon = true,
  children,
  ...props
}: BadgeProps) {
  const Icon = toneIcons[tone ?? "neutral"];
  return (
    <span
      data-slot="badge"
      data-tone={tone}
      className={cn(badgeVariants({ tone }), className)}
      {...props}
    >
      {showIcon && Icon ? <Icon aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
