"use client";

import { useEffect, useRef, useState } from "react";
import { SoundProvider, usePatch } from "@/components/ui/ui-sounds";
import { SoundControls } from "@/components/ui/ui-sounds-controls";
import { type AudioAnalyser, createMasterAnalyser } from "@/lib/ui-sounds-api";
import { corePatch } from "@/lib/ui-sounds-core-patch";

const GROUPS = [
  {
    name: "Interface",
    sounds: [
      ["click", "Click"],
      ["tap", "Tap"],
      ["toggle-on", "Toggle on"],
      ["toggle-off", "Toggle off"],
      ["checkbox", "Checkbox"],
      ["select", "Select"],
    ],
  },
  {
    name: "Feedback",
    sounds: [
      ["success", "Success"],
      ["error", "Error"],
      ["warning", "Warning"],
      ["notification", "Notification"],
      ["ding", "Ding"],
      ["level-up", "Level up"],
    ],
  },
  {
    name: "Motion",
    sounds: [
      ["swoosh", "Swoosh"],
      ["modal-open", "Modal open"],
      ["modal-close", "Modal close"],
      ["drawer-open", "Drawer open"],
      ["expand", "Expand"],
      ["pop", "Pop"],
    ],
  },
] as const;

/** The master output as a waveform; drawn only while a sound is playing. */
function Scope({
  analyser,
  pulse,
}: {
  analyser: AudioAnalyser | null;
  pulse: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const context = el?.getContext("2d");
    if (!el || !context) return;
    const dpr = window.devicePixelRatio || 1;
    const width = el.clientWidth;
    const height = el.clientHeight;
    el.width = Math.round(width * dpr);
    el.height = Math.round(height * dpr);
    context.scale(dpr, dpr);
    const color = getComputedStyle(el).color;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // The idle baseline is a CSS line under the canvas, so a server-rendered
    // tile shows it too; the canvas only draws the waveform on top.
    const line = (samples: ArrayLike<number> | null) => {
      context.clearRect(0, 0, width, height);
      if (!samples) return;
      context.strokeStyle = color;
      context.lineWidth = 1.5;
      context.beginPath();
      const count = samples.length;
      for (let i = 0; i < count; i++) {
        const x = (i / (count - 1)) * width;
        const v = (samples[i] - 128) / 128;
        const y = height / 2 + v * (height / 2 - 2);
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    };

    line(null);
    if (!analyser || reduced || pulse === 0) return;
    let frame = 0;
    let quiet = 0;
    const draw = () => {
      const data = analyser.getTimeDomainData();
      let peak = 0;
      for (let i = 0; i < data.length; i++) {
        peak = Math.max(peak, Math.abs(data[i] - 128));
      }
      line(peak > 1 ? data : null);
      quiet = peak > 1 ? 0 : quiet + 1;
      // Stop once the output has been silent for about a third of a second.
      frame = quiet < 20 ? requestAnimationFrame(draw) : 0;
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [analyser, pulse]);

  return (
    <div aria-hidden="true" className="relative h-10">
      <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
      <canvas
        ref={canvas}
        className="absolute inset-0 size-full text-foreground"
      />
    </div>
  );
}

function Board() {
  const patch = usePatch(corePatch);
  const [analyser, setAnalyser] = useState<AudioAnalyser | null>(null);
  const analyserRef = useRef<AudioAnalyser | null>(null);
  const [pulse, setPulse] = useState(0);

  useEffect(() => () => analyserRef.current?.dispose(), []);

  const play = (name: string) => {
    // Created on the first press, so the audio context starts from a user
    // gesture and never during rendering.
    if (!analyserRef.current) {
      analyserRef.current = createMasterAnalyser({ fftSize: 512 });
      setAnalyser(analyserRef.current);
    }
    patch.play(name);
    setPulse((count) => count + 1);
  };

  return (
    <div className="grid gap-4">
      <Scope analyser={analyser} pulse={pulse} />
      <div className="grid gap-4 sm:grid-cols-3">
        {GROUPS.map((group) => (
          <fieldset
            key={group.name}
            className="m-0 grid min-w-0 gap-2 border-0 p-0"
          >
            <legend className="mb-2 p-0 font-medium text-muted-foreground text-xs uppercase tracking-wide">
              {group.name}
            </legend>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-1">
              {group.sounds.map(([name, label]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => play(name)}
                  className="min-h-9 rounded-md border bg-background px-3 py-1.5 text-start font-medium text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:bg-accent motion-safe:transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}

export default function UiSoundsDemo() {
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [override, setOverride] = useState(false);

  return (
    <SoundProvider
      enabled={enabled}
      volume={volume}
      respectReducedMotion={!override}
      onEnabledChange={setEnabled}
      onVolumeChange={setVolume}
    >
      <div className="mx-auto grid w-full max-w-2xl gap-4 p-4 text-foreground">
        <SoundControls onOverride={() => setOverride(true)} />
        <Board />
        <p className="text-muted-foreground text-xs">
          Press a button to hear it. Nothing plays on its own.
        </p>
      </div>
    </SoundProvider>
  );
}
