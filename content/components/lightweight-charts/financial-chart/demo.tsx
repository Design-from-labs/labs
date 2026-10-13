"use client";

import * as React from "react";
import {
  FinancialChart,
  type FinancialChartDatum,
  type FinancialChartHandle,
  type FinancialChartSeries,
} from "@/components/ui/financial-chart";

// SYNTHETIC data, not market prices: a seeded random walk (seed 7) over 90
// weekdays from 2026-01-05. Prices stay positive (each move is a percentage of
// the last close), every high and low brackets its open and close, and
// volumes are whole, non-negative unit counts.
const SEED = 7;
const DAYS = 90;

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

function syntheticCandles(seed: number, days: number): FinancialChartDatum[] {
  const random = mulberry32(seed);
  const out: FinancialChartDatum[] = [];
  const date = new Date(Date.UTC(2026, 0, 5));
  let close = 100;
  while (out.length < days) {
    const weekday = date.getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      // A gentle climb, a pullback in the middle third, then a recovery.
      const third = Math.floor((out.length * 3) / days);
      const drift = third === 1 ? -0.004 : 0.005;
      const open = round(close * (1 + (random() - 0.5) * 0.01));
      const next = round(open * (1 + drift + (random() - 0.5) * 0.04));
      const high = round(Math.max(open, next) * (1 + random() * 0.015));
      const low = round(Math.min(open, next) * (1 - random() * 0.015));
      const move = Math.abs(next - open) / open;
      out.push({
        time: date.toISOString().slice(0, 10),
        open,
        high,
        low,
        close: next,
        volume: Math.round(600_000 + random() * 400_000 + move * 20_000_000),
      });
      close = next;
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return out;
}

const DATA = syntheticCandles(SEED, DAYS);
const KINDS: { value: FinancialChartSeries; label: string }[] = [
  { value: "candlestick", label: "Candles" },
  { value: "area", label: "Area" },
  { value: "line", label: "Line" },
];

export default function FinancialChartDemo() {
  const [series, setSeries] =
    React.useState<FinancialChartSeries>("candlestick");
  const chart = React.useRef<FinancialChartHandle>(null);
  const root = React.useRef<HTMLDivElement>(null);

  // On the gallery wall only, the crosshair sweeps across the days. It holds
  // still while the wall pauses it (offscreen, in a hidden tab, under reduced
  // motion, or when the visitor pauses animations).
  React.useEffect(() => {
    let index = 0;
    const id = window.setInterval(() => {
      const el = root.current;
      if (!el?.closest("[data-specimen]") || el.closest("[data-loop-paused]")) {
        return;
      }
      index = (index + 1) % (DATA.length + 12);
      chart.current?.showPoint(index < DATA.length ? index : null);
    }, 140);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="w-full max-w-3xl overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm"
      ref={root}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <p className="font-semibold text-sm">Sample asset</p>
          <p className="text-muted-foreground text-xs">
            Synthetic data (seeded random walk), not market prices
          </p>
        </div>
        <fieldset className="flex gap-1 rounded-md border p-0.5">
          <legend className="sr-only">Chart type</legend>
          {KINDS.map((kind) => (
            <button
              aria-pressed={series === kind.value}
              className="h-7 rounded-sm px-2.5 font-medium text-muted-foreground text-xs hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-secondary aria-pressed:text-secondary-foreground"
              key={kind.value}
              onClick={() => setSeries(kind.value)}
              type="button"
            >
              {kind.label}
            </button>
          ))}
        </fieldset>
      </div>
      <FinancialChart
        data={DATA}
        height={320}
        label="Sample asset, synthetic daily prices and volume"
        ref={chart}
        series={series}
        volumeScale="zero"
      />
    </div>
  );
}
