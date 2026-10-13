"use client";

import { GooeyToaster, gooeyToast } from "@/components/ui/gooey-toast";

const button =
  "inline-flex h-9 items-center rounded-full border border-border bg-background px-4 font-medium text-foreground text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function GooeyToastDemo() {
  return (
    <div className="flex max-w-md flex-wrap items-center justify-center gap-2">
      <GooeyToaster position="bottom-right" />
      <button
        type="button"
        className={button}
        onClick={() => gooeyToast.success("Changes saved")}
      >
        Success
      </button>
      <button
        type="button"
        className={button}
        onClick={() =>
          gooeyToast.error("Connection lost", {
            description:
              "Unable to reach the server. Check your connection and try again.",
          })
        }
      >
        Error with description
      </button>
      <button
        type="button"
        className={button}
        onClick={() =>
          gooeyToast.info("Share link ready", {
            description: "Your link is ready to copy.",
            action: {
              label: "Copy link",
              onClick: () => {},
              successLabel: "Copied",
            },
          })
        }
      >
        With action
      </button>
      <button
        type="button"
        className={button}
        onClick={() =>
          gooeyToast.promise(wait(2000), {
            loading: "Saving...",
            success: "Saved",
            error: "Something went wrong",
          })
        }
      >
        Promise
      </button>
    </div>
  );
}
