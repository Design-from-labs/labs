import { GooeyText } from "@/components/ui/gooey-text";

export default function GooeyTextDemo() {
  return (
    <div className="flex h-[200px] items-center justify-center">
      <GooeyText
        texts={["Design", "Engineering", "Is", "Awesome"]}
        morphTime={1}
        cooldownTime={0.25}
        className="font-bold"
      />
    </div>
  );
}
