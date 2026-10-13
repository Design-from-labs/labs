"use client";

import {
  BottomSheet,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDialog,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
  useBottomSheet,
} from "@/components/bottom-sheet/bottom-sheet";

const places = [
  ["Corner bakery", "Bakery", "0.2 mi"],
  ["The reading room", "Library", "0.3 mi"],
  ["Harbour market", "Grocer", "0.4 mi"],
  ["Morning glass", "Coffee", "0.6 mi"],
  ["Tin shed", "Bikes", "0.7 mi"],
  ["Quiet street", "Framing", "0.9 mi"],
  ["Long room", "Records", "1.1 mi"],
  ["Verge", "Plants", "1.2 mi"],
  ["Bellwether", "Cheese", "1.3 mi"],
  ["The aviary", "Tea", "1.5 mi"],
] as const;

const heights = [
  [40, "Peek"],
  [70, "Half"],
  [100, "Full"],
] as const;

/** Moves the sheet between its snap points (a keyboard path for the drag). */
function Heights() {
  const sheet = useBottomSheet();
  return (
    <fieldset
      aria-label="Sheet height"
      className="m-0 flex min-w-0 gap-2 border-0 p-0 pb-3"
    >
      {heights.map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => sheet.snapTo(value)}
          className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          {label}
        </button>
      ))}
    </fieldset>
  );
}

export default function BottomSheetDemo() {
  return (
    <BottomSheet snapPoints={[40, 70, 100]} defaultOpen>
      <div className="flex justify-center p-4">
        <BottomSheetTrigger className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Show nearby
        </BottomSheetTrigger>
      </div>
      <BottomSheetDialog className="[--bottom-sheet-panel-max-width:36rem]">
        <BottomSheetHeader>
          <div className="flex items-start justify-between gap-4 pt-7 pb-3">
            <BottomSheetTitle className="text-lg font-semibold">
              Nearby
            </BottomSheetTitle>
            <BottomSheetClose
              aria-label="Close"
              className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-lg leading-none hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              ×
            </BottomSheetClose>
          </div>
          <Heights />
        </BottomSheetHeader>
        <BottomSheetContent>
          <ul className="divide-y divide-border border-t border-border">
            {places.map(([name, kind, distance]) => (
              <li
                key={name}
                className="flex items-baseline justify-between gap-4 py-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="block font-medium">{name}</span>
                  <span className="block text-muted-foreground">{kind}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {distance}
                </span>
              </li>
            ))}
          </ul>
        </BottomSheetContent>
      </BottomSheetDialog>
    </BottomSheet>
  );
}
