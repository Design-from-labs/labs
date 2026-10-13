"use client";

import { PillToaster, pillToast } from "@/components/ui/pill-toast";

const button =
  "inline-flex h-9 items-center rounded-full border border-border bg-background px-4 font-medium text-foreground text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function PillToastDemo() {
  return (
    <div className="flex max-w-md flex-wrap items-center justify-center gap-2">
      <PillToaster position="bottom-right" theme="system" />
      <button
        type="button"
        className={button}
        onClick={() =>
          pillToast.success({
            title: "Changes saved",
            description: "Your profile is up to date.",
          })
        }
      >
        Success
      </button>
      <button
        type="button"
        className={button}
        onClick={() =>
          pillToast.error({
            title: "Something went wrong",
            description:
              "We could not reach the server. Please try again in a few minutes.",
          })
        }
      >
        Error
      </button>
      <button
        type="button"
        className={button}
        onClick={() =>
          pillToast.action({
            title: "File uploaded",
            description: "Your file is ready. Share it with your team?",
            button: { title: "Share now", onClick: () => {} },
          })
        }
      >
        With action
      </button>
      <button
        type="button"
        className={button}
        onClick={() =>
          pillToast.promise(wait(2000), {
            loading: { title: "Booking flight" },
            success: {
              title: "Booking confirmed",
              description: "A receipt is on its way to your inbox.",
            },
            error: { title: "Booking failed" },
          })
        }
      >
        Promise
      </button>
    </div>
  );
}
