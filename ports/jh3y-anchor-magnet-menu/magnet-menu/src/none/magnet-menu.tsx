"use client";

import * as React from "react";

import { composeRefs } from "@/lib/compose-refs";
import { cn } from "@/lib/utils";
import {
  useMagnetMenuAnchors,
  useMagnetMenuFallback,
} from "./magnet-menu-fallback";
import { MagnetMenuStyles } from "./magnet-menu-styles";

/*
 * A nav whose hover pill slides between links and whose underline marks the
 * current page, both placed with CSS anchor positioning (a measured fallback
 * elsewhere).
 *
 * Changes from upstream: the pen's page chrome (orientation and theme
 * buttons, author link, grid backdrop) is left out; the orientation is a
 * prop; the current page can also be `active` (aria-current="page"), not
 * only the link the URL hash targets. Every change is listed in the
 * component's fidelity notes.
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
  ref,
  ...props
}: MagnetMenuProps) {
  const navRef = React.useRef<HTMLElement | null>(null);
  const anchors = useMagnetMenuAnchors();
  useMagnetMenuFallback(navRef);
  return (
    <nav
      aria-label={ariaLabel}
      data-slot="magnet-menu"
      data-orientation={orientation}
      className={cn("magnet-menu", className)}
      style={{ ...anchors, ...style }}
      ref={composeRefs(navRef, ref)}
      {...props}
    >
      <MagnetMenuStyles />
      <ul data-slot="magnet-menu-list">{children}</ul>
    </nav>
  );
}

export interface MagnetMenuLinkProps extends React.ComponentProps<"a"> {
  /** The current page: underlined, and announced as aria-current="page". */
  active?: boolean;
}

export function MagnetMenuLink({ active = false, ...props }: MagnetMenuLinkProps) {
  return (
    <li data-slot="magnet-menu-item">
      <a
        data-slot="magnet-menu-link"
        aria-current={active ? "page" : undefined}
        {...props}
      />
    </li>
  );
}
