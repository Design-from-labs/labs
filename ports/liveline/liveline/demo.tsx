"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  type CandlePoint,
  Liveline,
  type LivelinePoint,
} from "@/components/liveline";

const WINDOWS = [
  { label: "15s", secs: 15 },
  { label: "30s", secs: 30 },
  { label: "1m", secs: 60 },
];
const TICK_MS = 400;
const CANDLE_SECS = 2;

// Follows the page: a `dark` class on <html> or the system setting.
const DARK_QUERY = "(prefers-color-scheme: dark)";
function subscribeTheme(onChange: () => void) {
  const mql = window.matchMedia(DARK_QUERY);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  mql.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    mql.removeEventListener("change", onChange);
  };
}
function useIsDark() {
  return useSyncExternalStore(
    subscribeTheme,
    () =>
      document.documentElement.classList.contains("dark") ||
      window.matchMedia(DARK_QUERY).matches,
    () => false,
  );
}

function step(prev: number) {
  return prev + (Math.random() - 0.48) * 0.8;
}

function toCandles(points: LivelinePoint[]) {
  const candles: CandlePoint[] = [];
  let live: CandlePoint | undefined;
  for (const p of points) {
    const slot = Math.floor(p.time / CANDLE_SECS) * CANDLE_SECS;
    if (!live || live.time !== slot) {
      if (live) {
        candles.push(live);
      }
      live = {
        time: slot,
        open: p.value,
        high: p.value,
        low: p.value,
        close: p.value,
      };
    } else {
      live.close = p.value;
      live.high = Math.max(live.high, p.value);
      live.low = Math.min(live.low, p.value);
    }
  }
  return { candles, live };
}

export default function LivelineDemo() {
  const isDark = useIsDark();
  const [points, setPoints] = useState<LivelinePoint[]>([]);
  const [lineMode, setLineMode] = useState(true);
  const last = useRef(100);
  const root = useRef<HTMLDivElement>(null);

  // Sample data is generated on the client only, so the server render
  // (the loading state) matches the first client render.
  useEffect(() => {
    const now = Date.now() / 1000;
    const seed: LivelinePoint[] = [];
    let v = 100;
    for (let i = 150; i >= 0; i--) {
      v = step(v);
      seed.push({ time: now - i * (TICK_MS / 1000), value: v });
    }
    last.current = v;
    setPoints(seed);
    const id = window.setInterval(() => {
      // On the gallery wall the tile pauses offscreen, in a hidden tab, under
      // reduced motion and when the visitor pauses animations.
      if (root.current?.closest("[data-loop-paused]")) {
        return;
      }
      last.current = step(last.current);
      const point = { time: Date.now() / 1000, value: last.current };
      setPoints((prev) => [...prev.slice(-400), point]);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const { candles, live } = toCandles(points);
  const value = points.at(-1)?.value ?? 100;

  return (
    // A flex column lets the chart fill the space below its controls.
    <div
      ref={root}
      className="flex h-72 w-full flex-col overflow-hidden rounded-xl border bg-card p-2"
    >
      <Liveline
        aria-label="Sample live value"
        mode="candle"
        theme={isDark ? "dark" : "light"}
        loading={points.length === 0}
        data={points}
        value={value}
        candles={candles}
        candleWidth={CANDLE_SECS}
        liveCandle={live}
        lineMode={lineMode}
        lineData={points}
        lineValue={value}
        onModeChange={(mode) => setLineMode(mode === "line")}
        windows={WINDOWS}
        className="min-h-0 flex-1"
        style={{ height: "auto" }}
      />
    </div>
  );
}
