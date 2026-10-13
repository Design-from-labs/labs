import { BorderShine, BorderShineGlyph } from "@/components/ui/border-shine";

// The pen's black page and its fading grid, drawn as one decorative layer.
const GRID_LINE = "color-mix(in hsl, white, transparent 80%)";
const grid = {
  background: `linear-gradient(90deg, ${GRID_LINE} 1px, transparent 1px 45px) calc(45px * 0.36) 50% / 45px 45px, linear-gradient(${GRID_LINE} 1px, transparent 1px 45px) 0% calc(45px * 0.32) / 45px 45px`,
  WebkitMask: "linear-gradient(-20deg, transparent 50%, white)",
  mask: "linear-gradient(-20deg, transparent 50%, white)",
};

export default function BorderShineDemo() {
  return (
    <div className="relative isolate flex min-h-[420px] w-full flex-col items-center justify-center gap-20 overflow-hidden bg-black p-12 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={grid}
      />
      <BorderShine
        as="button"
        type="button"
        aria-label="Weather: partly cloudy"
        className="size-16 scale-200 cursor-pointer transition-[translate,scale] duration-100 ease-[ease-out] [-webkit-tap-highlight-color:transparent] active:translate-y-px active:scale-[1.98] motion-reduce:transition-none"
      >
        <BorderShineGlyph />
      </BorderShine>
      <BorderShine
        as="article"
        squircle={false}
        className="w-60 rounded-2xl p-5"
      >
        <p className="text-sm font-medium">Any content</p>
        <p className="mt-1 text-sm text-white/70">
          The edge catches the light on the side your pointer is on. Focus the
          card's button and use the arrow keys.
        </p>
        <button
          type="button"
          className="mt-4 rounded-full bg-white/15 px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          Open
        </button>
      </BorderShine>
    </div>
  );
}
