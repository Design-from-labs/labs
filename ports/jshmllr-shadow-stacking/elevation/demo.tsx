import { Elevation, type ElevationLevel } from "@/components/ui/elevation";

// The pen's two scales as its page shows them: the dark scale (levels 0 to 7)
// paints light on a dark surface, the light scale (levels 0 to 6) stacks soft
// shadows on a white one. Each card is the pen's 1.5rem-radius square at a
// smaller size, labelled with its level; the layers per level are in the
// props and the pen's source.
const DARK: ElevationLevel[] = [0, 1, 2, 3, 4, 5, 6, 7];
const LIGHT: ElevationLevel[] = [0, 1, 2, 3, 4, 5, 6];

function Scale({
  mode,
  levels,
}: {
  mode: "light" | "dark";
  levels: ElevationLevel[];
}) {
  const dark = mode === "dark";
  return (
    <ul className="flex list-none flex-wrap gap-x-4 gap-y-8">
      {levels.map((level) => (
        <li key={level} className="flex flex-col items-center gap-3">
          <Elevation
            level={level}
            mode={mode}
            className={
              dark
                ? "size-16 shrink-0 rounded-2xl bg-[#262626]"
                : "size-16 shrink-0 rounded-2xl bg-white"
            }
          />
          <span
            className={
              dark
                ? "text-[#9a9a9a] text-[0.65rem] uppercase tracking-[0.08em]"
                : "text-[#666] text-[0.65rem] uppercase tracking-[0.08em]"
            }
          >
            level {level}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function ElevationDemo() {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-4 font-mono">
      <section
        aria-label="Dark mode scale"
        className="flex flex-col gap-5 rounded-3xl bg-[#1a1a1a] p-6 text-[#e0e0e0]"
      >
        <div className="flex flex-col gap-1.5">
          <p className="font-bold text-sm text-white">
            Dark mode: inset light illusion
          </p>
          <p className="text-[#9a9a9a] text-[0.7rem] leading-snug">
            Raised surfaces catch light: an inset highlight and ring strengthen
            with each level.
          </p>
        </div>
        <Scale mode="dark" levels={DARK} />
      </section>
      <section
        aria-label="Light mode scale"
        className="flex flex-col gap-5 rounded-3xl bg-[#f5f5f4] p-6 text-[#333]"
      >
        <div className="flex flex-col gap-1.5">
          <p className="font-bold text-[#555] text-[0.7rem] uppercase tracking-[0.1em]">
            Light mode: stacked elevation
          </p>
          <p className="text-[#6b6b6b] text-[0.7rem] leading-snug">
            One more soft layer per level, on a 1, 3, 6, 12, 24, 48 doubling
            sequence.
          </p>
        </div>
        <Scale mode="light" levels={LIGHT} />
      </section>
    </div>
  );
}
