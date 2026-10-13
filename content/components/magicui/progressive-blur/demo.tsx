import { ProgressiveBlur } from "@/components/ui/progressive-blur";

export default function ProgressiveBlurDemo() {
  return (
    <div className="relative h-[400px] w-full max-w-md overflow-hidden rounded-xl border">
      <section
        aria-label="Twenty cards, scrollable"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll region must be reachable by keyboard
        tabIndex={0}
        className="h-full overflow-y-auto rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 20 }).map((_, index) => (
            <div
              key={index}
              className="flex h-20 w-full items-center justify-center rounded-xl border bg-card text-card-foreground"
            >
              {index}
            </div>
          ))}
        </div>
      </section>
      <ProgressiveBlur position="bottom" height="40%" />
    </div>
  );
}
