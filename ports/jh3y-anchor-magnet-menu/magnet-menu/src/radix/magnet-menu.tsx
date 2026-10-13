"use client";

import { NavigationMenu } from "radix-ui";
import * as React from "react";

import { composeRefs } from "@/lib/compose-refs";
import { cn } from "@/lib/utils";
import {
  useInheritedDirection,
  useMagnetMenuAnchors,
  useMagnetMenuFallback,
} from "./magnet-menu-fallback";
import { MagnetMenuStyles } from "./magnet-menu-styles";

/*
 * A nav whose hover pill slides between links and whose underline marks the
 * current page, both placed with CSS anchor positioning (a measured fallback
 * elsewhere).
 *
 * Radix NavigationMenu adds arrow-key, Home and End movement between the
 * links (the pill follows focus). Its Root and List would write their own `dir` ("ltr"
 * until told otherwise), which would hide a right-to-left page on the first
 * paint, so the elements keep the page's direction and the arrow keys read
 * it after mount.
 */

export interface MagnetMenuProps extends React.ComponentProps<"nav"> {
  /** Lay the links out in a row (default) or a column. */
  orientation?: "horizontal" | "vertical";
}

export function MagnetMenu({
  orientation = "horizontal",
  className,
  style,
  children,
  "aria-label": ariaLabel,
  dir,
  ref,
  ...props
}: MagnetMenuProps) {
  const navRef = React.useRef<HTMLElement | null>(null);
  const anchors = useMagnetMenuAnchors();
  const inherited = useInheritedDirection(navRef);
  useMagnetMenuFallback(navRef);
  return (
    <NavigationMenu.Root
      asChild
      orientation={orientation}
      dir={dir === "rtl" || dir === "ltr" ? dir : inherited}
    >
      <nav
        aria-label={ariaLabel}
        dir={dir}
        data-slot="magnet-menu"
        data-orientation={orientation}
        className={cn("magnet-menu", className)}
        style={{ ...anchors, ...style }}
        ref={composeRefs(navRef, ref)}
        {...props}
      >
        <MagnetMenuStyles />
        <NavigationMenu.List data-slot="magnet-menu-list" dir={undefined}>
          {children}
        </NavigationMenu.List>
      </nav>
    </NavigationMenu.Root>
  );
}

export interface MagnetMenuLinkProps
  extends React.ComponentProps<typeof NavigationMenu.Link> {
  /** The current page: underlined, and announced as aria-current="page". */
  active?: boolean;
}

export function MagnetMenuLink({ active = false, ...props }: MagnetMenuLinkProps) {
  return (
    <NavigationMenu.Item data-slot="magnet-menu-item">
      <NavigationMenu.Link
        data-slot="magnet-menu-link"
        active={active}
        {...props}
      />
    </NavigationMenu.Item>
  );
}
