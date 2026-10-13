"use client";

import { ShowMore } from "@/components/ui/show-more";

export default function ShowMoreDemo() {
  return (
    <div className="mx-auto w-full max-w-[440px] rounded-[14px] bg-[var(--show-more-surface,#fff)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.11)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]">
      <ShowMore lines={3} maxHeight={168} label="Release notes">
        <p>
          Gallery tiles now open into their component pages with a shared
          transition, so the preview you clicked grows into the page instead of
          being replaced by it. Every component page lists its sources, with the
          license and the commit each port was taken from. The registry serves
          one item per primitive and icon set, and the command line picks the
          same defaults as the page. Previews of pull requests show beta
          components with a label, so they can be checked on the real site
          before anything is published.
        </p>
      </ShowMore>
    </div>
  );
}
