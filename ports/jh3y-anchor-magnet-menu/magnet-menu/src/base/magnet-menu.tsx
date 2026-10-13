"use client";

import { DirectionProvider } from "@base-ui/react/direction-provider";
import { NavigationMenu } from "@base-ui/react/navigation-menu";
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
 * Base UI NavigationMenu adds arrow-key movement between the links (the
 * pill follows focus), and its `active` sets aria-current="page". It renders
 * the nav and the list as they are, with no wrapper element. It maps the
 * arrow keys by the direction its provider says (left to right by default),
 * so the page's direction is read after mount and handed to it.
 */

export interface MagnetMenuProps
  extends Omit<React.ComponentProps<"nav">, "dir"> {
  /** Lay the links out in a row (default) or a column. */
  orientation?: "horizontal" | "vertical";
}

export function MagnetMenu({
  orientation = "horizontal",
  className,
  style,
  children,
  "aria-label": ariaLabel,
  ref,
  ...props
}: MagnetMenuProps) {
  const navRef = React.useRef<HTMLElement | null>(null);
  const anchors = useMagnetMenuAnchors();
  const direction = useInheritedDirection(navRef);
  useMagnetMenuFallback(navRef);
  return (
    <DirectionProvider direction={direction}>
      <NavigationMenu.Root
        orientation={orientation}
        aria-label={ariaLabel}
        data-slot="magnet-menu"
        data-orientation={orientation}
        className={cn("magnet-menu", className)}
        style={{ ...anchors, ...style }}
        ref={composeRefs(navRef, ref)}
        {...props}
      >
        <MagnetMenuStyles />
        <NavigationMenu.List data-slot="magnet-menu-list">
          {children}
        </NavigationMenu.List>
      </NavigationMenu.Root>
    </DirectionProvider>
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
