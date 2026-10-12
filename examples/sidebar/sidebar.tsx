"use client";

import { Menu } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

// A navigation sidebar for an app shell. From the md breakpoint (768px) it is
// a full-height rail at the inline start; below it, a top bar whose menu
// button shows or hides the same links (a disclosure: no overlay, no focus
// trap). Start and end are logical, so the rail sits on the right in
// right-to-left layouts.
function Sidebar({
  title,
  label = "Main",
  footer,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  /** The product or workspace name at the top. */
  title: React.ReactNode;
  /** Accessible name of the navigation landmark. */
  label?: string;
  /** Content pinned to the bottom of the rail (account, settings). */
  footer?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const navId = React.useId();
  return (
    <div
      data-slot="sidebar"
      data-state={open ? "open" : "closed"}
      className={cn(
        "flex flex-col border-b bg-muted/40 text-foreground md:h-full md:w-60 md:border-e md:border-b-0",
        className,
      )}
      {...props}
    >
      <div className="flex h-14 shrink-0 items-center gap-2 px-4">
        <div className="min-w-0 flex-1 truncate font-medium">{title}</div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={navId}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring md:hidden"
        >
          <Menu aria-hidden="true" className="size-4" />
          <span className="sr-only">Menu</span>
        </button>
      </div>
      <div
        id={navId}
        className={cn(
          "min-h-0 flex-1 flex-col md:flex",
          open ? "flex" : "hidden",
        )}
      >
        <nav
          aria-label={label}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 pb-4"
        >
          {children}
        </nav>
        {footer && <div className="shrink-0 border-t px-2 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// A group of links. With a label, it is a named group, announced with it.
function SidebarGroup({
  label,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & { label?: string }) {
  const labelId = React.useId();
  const classes = cn("flex flex-col gap-0.5", className);
  if (!label) {
    return (
      <div data-slot="sidebar-group" className={classes} {...props}>
        {children}
      </div>
    );
  }
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset groups form controls; a named group of links is role="group" (WAI-ARIA)
    <div
      data-slot="sidebar-group"
      role="group"
      aria-labelledby={labelId}
      className={classes}
      {...props}
    >
      <div
        id={labelId}
        className="px-3 pb-1 font-medium text-muted-foreground text-xs"
      >
        {label}
      </div>
      {children}
    </div>
  );
}

// A link in the sidebar. `active` marks the current page (aria-current).
function SidebarItem({
  active = false,
  icon,
  children,
  className,
  ...props
}: React.ComponentProps<"a"> & {
  active?: boolean;
  /** An icon element, decorative; the text is the accessible name. */
  icon?: React.ReactNode;
}) {
  return (
    <a
      data-slot="sidebar-item"
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 items-center gap-2 rounded-md px-3 text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-foreground",
        className,
      )}
      {...props}
    >
      {icon && (
        <span
          aria-hidden="true"
          className="flex size-4 shrink-0 items-center justify-center [&>svg]:size-4"
        >
          {icon}
        </span>
      )}
      <span className="truncate">{children}</span>
    </a>
  );
}

export { Sidebar, SidebarGroup, SidebarItem };
