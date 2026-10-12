"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import type * as React from "react";
import {
  Button as ButtonPrimitive,
  type ButtonProps as ButtonPrimitiveProps,
} from "react-aria-components";

import { cn } from "@/lib/utils";

// Every color comes from the shared token layer (primary, accent, ring...),
// so the button follows whatever theme the host project defines.
const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm outline-none transition-[color,background-color,box-shadow] duration-150 data-focus-visible:ring-2 data-focus-visible:ring-ring data-focus-visible:ring-offset-2 data-focus-visible:ring-offset-background data-disabled:pointer-events-none data-disabled:opacity-50 data-pending:cursor-progress motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4",
        lg: "h-10 px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends Omit<ButtonPrimitiveProps, "className" | "children">,
    VariantProps<typeof buttonVariants> {
  className?: string;
  children?: React.ReactNode;
  /**
   * Shows a spinner while true. Maps to React Aria's isPending, which keeps
   * focus, ignores presses and announces the pending state.
   */
  loading?: boolean;
}

function Button({
  className,
  variant,
  size,
  loading = false,
  isPending,
  children,
  ...props
}: ButtonProps) {
  const pending = loading || isPending;
  return (
    <ButtonPrimitive
      data-slot="button"
      isPending={pending}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />
      ) : null}
      {children}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
