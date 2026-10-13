"use client";

import { useId } from "react";
import { useSoundControls } from "@/components/ui/ui-sounds";
import { cn } from "@/lib/utils";

export type SoundControlsProps = {
  /** Accessible name of the group. */
  label?: string;
  /** Called by the "Play anyway" button shown while reduced motion keeps sounds silent. Omit it to hide the button. */
  onOverride?: () => void;
  className?: string;
};

/**
 * A sound switch and a volume slider for the nearest `SoundProvider` (a Labs
 * addition; upstream leaves the controls to the app). The provider is
 * controlled, so keep `enabled` and `volume` in your own state and pass the
 * change callbacks to it.
 *
 * While the user's reduced-motion setting keeps sounds silent, it says so, so
 * a button that plays nothing is explained, and `onOverride` lets the user
 * choose sound anyway.
 */
export function SoundControls({
  label = "Sound settings",
  onOverride,
  className,
}: SoundControlsProps) {
  const { enabled, volume, setEnabled, setVolume, silenced } =
    useSoundControls();
  const volumeId = useId();

  return (
    <fieldset className={cn("m-0 grid min-w-0 gap-2 border-0 p-0", className)}>
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled(!enabled)}
          className="group inline-flex min-h-9 items-center gap-2 rounded-md px-1 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden="true"
            className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-input p-0.5 group-aria-checked:bg-primary motion-safe:transition-colors"
          >
            <span className="size-4 rounded-full bg-background shadow-sm group-aria-checked:translate-x-4 motion-safe:transition-transform rtl:group-aria-checked:-translate-x-4" />
          </span>
          Sound
        </button>
        <div className="flex min-h-9 items-center gap-2">
          <label htmlFor={volumeId} className="font-medium">
            Volume
          </label>
          <input
            id={volumeId}
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            disabled={!enabled}
            aria-valuetext={`${Math.round(volume * 100)}%`}
            onChange={(event) => setVolume(Number(event.target.value))}
            className="h-5 w-28 accent-primary focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
          />
        </div>
      </div>
      {silenced ? (
        <p
          role="status"
          className="text-muted-foreground text-xs leading-relaxed"
        >
          Sounds are silent because your system asks for reduced motion.
          {onOverride ? (
            <>
              {" "}
              <button
                type="button"
                onClick={onOverride}
                className="rounded-sm font-medium text-foreground underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Play anyway
              </button>
            </>
          ) : null}
        </p>
      ) : null}
    </fieldset>
  );
}
