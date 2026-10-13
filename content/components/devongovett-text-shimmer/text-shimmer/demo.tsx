import { TextShimmer } from "@/components/ui/text-shimmer";

export default function TextShimmerDemo() {
  return (
    <div className="flex max-w-xs flex-col items-start gap-4 p-6">
      <TextShimmer>Thinking in progress</TextShimmer>
      <TextShimmer className="font-medium text-lg" duration={3.5}>
        Reading three files
      </TextShimmer>
      <p className="text-sm leading-relaxed">
        <TextShimmer>
          It works on <strong className="font-semibold">any</strong> text, even
          when it wraps onto a second line.
        </TextShimmer>
      </p>
    </div>
  );
}
