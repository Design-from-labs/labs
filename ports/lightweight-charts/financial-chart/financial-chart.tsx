"use client";

import {
  AreaSeries,
  type AreaStyleOptions,
  type AutoscaleInfo,
  CandlestickSeries,
  type CandlestickStyleOptions,
  type ChartOptions,
  ColorType,
  type CustomColorParser,
  createChart,
  type DeepPartial,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  LineSeries,
  type LineStyleOptions,
  type Rgba,
  type SeriesOptionsCommon,
  type SeriesType,
  type Time,
} from "lightweight-charts";
import * as React from "react";
import { cn } from "@/lib/utils";

/** One period: its time, prices and (optionally) traded volume. */
type FinancialChartDatum = {
  /** A `"YYYY-MM-DD"` string, a UNIX timestamp in seconds, or a business day. */
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  /** Units traded in the period; drawn as a histogram under the price. */
  volume?: number;
};

type FinancialChartSeries = "candlestick" | "area" | "line";

type FinancialChartSeriesOptions = DeepPartial<
  CandlestickStyleOptions &
    AreaStyleOptions &
    LineStyleOptions &
    SeriesOptionsCommon
>;

/** What the `ref` exposes: the library's own objects, once mounted. */
type FinancialChartHandle = {
  getChart: () => IChartApi | null;
  getSeries: () => ISeriesApi<SeriesType> | null;
  getVolumeSeries: () => ISeriesApi<"Histogram"> | null;
  /** Shows the crosshair on a data point (by index); `null` hides it. */
  showPoint: (index: number | null) => void;
};

type FinancialChartProps = Omit<
  React.ComponentProps<"figure">,
  "children" | "ref"
> & {
  data: FinancialChartDatum[];
  /** How the price is drawn. Area and line follow the close. */
  series?: FinancialChartSeries;
  /** Draws volume under the price. Defaults to true when any datum has one. */
  volume?: boolean;
  /**
   * The volume scale. `"auto"` (lightweight-charts' default) fits the bars'
   * own range, so small differences look large; `"zero"` starts it at zero,
   * so bar heights are proportional to volume.
   */
  volumeScale?: "auto" | "zero";
  /** The chart's height in pixels; the width follows the container. */
  height?: number;
  /** The chart's accessible name, for example "Sample asset, daily prices". */
  label: string;
  /**
   * The chart's description for screen readers. By default a summary is
   * generated from the data (range, first and last close, high and low);
   * pass a string to replace it.
   */
  summary?: string;
  /** Also renders every point in a visually hidden table. */
  dataTable?: boolean;
  /**
   * Chart options (`createChart` options of lightweight-charts), applied over
   * the token colors. Keep `layout.attributionLogo` on: the library's license
   * notice asks for a visible link to its author.
   */
  options?: DeepPartial<ChartOptions>;
  /** Style options for the price series, applied over the token colors. */
  seriesOptions?: FinancialChartSeriesOptions;
  ref?: React.Ref<FinancialChartHandle>;
};

// The library's own defaults (lightweight-charts 5.2.1), used when a token is
// not defined, so the chart looks like upstream without the cssVars.
const DEFAULTS = {
  background: "#FFFFFF",
  foreground: "#191919",
  grid: "#D6DCDE",
  border: "#2B2B43",
  crosshair: "#9598A1",
  "crosshair-label": "#131722",
  up: "#26a69a",
  down: "#ef5350",
  line: "#2196f3",
  "area-line": "#33D778",
  "area-top": "rgba(46, 220, 135, 0.4)",
  "area-bottom": "rgba(40, 221, 100, 0)",
  "volume-up": "#26a69a",
  "volume-down": "#ef5350",
};
type Token = keyof typeof DEFAULTS;
type Colors = Record<Token, string>;

/** Reads the `--financial-chart-*` tokens where the chart sits. */
function readColors(el: HTMLElement): Colors {
  const style = getComputedStyle(el);
  const colors = { ...DEFAULTS };
  for (const token of Object.keys(DEFAULTS) as Token[]) {
    const value = style.getPropertyValue(`--financial-chart-${token}`).trim();
    if (value) {
      colors[token] = value;
    }
  }
  return colors;
}

/**
 * The library parses hex, rgb(), hsl(), hwb() and named colors itself. For
 * anything else a token may hold (oklch(), color-mix(), lab()), the browser
 * paints one pixel and the color is read back.
 */
const parseAnyColor: CustomColorParser = (color) => {
  if (typeof document === "undefined") {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return null;
  }
  ctx.fillStyle = "#000";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b, Math.round((a / 255) * 1000) / 1000] as unknown as Rgba;
};

function chartColors(colors: Colors): DeepPartial<ChartOptions> {
  const scale = { borderColor: colors.border };
  const line = {
    color: colors.crosshair,
    labelBackgroundColor: colors["crosshair-label"],
  };
  return {
    layout: {
      background: { type: ColorType.Solid, color: colors.background },
      textColor: colors.foreground,
    },
    grid: {
      vertLines: { color: colors.grid },
      horzLines: { color: colors.grid },
    },
    rightPriceScale: scale,
    leftPriceScale: scale,
    timeScale: scale,
    crosshair: { vertLine: line, horzLine: line },
  };
}

function seriesColors(
  series: FinancialChartSeries,
  colors: Colors,
): FinancialChartSeriesOptions {
  if (series === "area") {
    return {
      lineColor: colors["area-line"],
      topColor: colors["area-top"],
      bottomColor: colors["area-bottom"],
    };
  }
  if (series === "line") {
    return { color: colors.line };
  }
  return {
    upColor: colors.up,
    downColor: colors.down,
    borderUpColor: colors.up,
    borderDownColor: colors.down,
    wickUpColor: colors.up,
    wickDownColor: colors.down,
  };
}

function priceData(series: FinancialChartSeries, data: FinancialChartDatum[]) {
  return series === "candlestick"
    ? data.map(({ time, open, high, low, close }) => ({
        time,
        open,
        high,
        low,
        close,
      }))
    : data.map(({ time, close }) => ({ time, value: close }));
}

function volumeData(data: FinancialChartDatum[], colors: Colors) {
  return data
    .filter((d) => d.volume !== undefined)
    .map((d) => ({
      time: d.time,
      value: d.volume ?? 0,
      color: d.close >= d.open ? colors["volume-up"] : colors["volume-down"],
    }));
}

/** Identifies a dataset by its series and first time, to know when to refit. */
function datasetKey(series: FinancialChartSeries, data: FinancialChartDatum[]) {
  return data[0] ? `${series}:${timeText(data[0].time)}` : null;
}

function timeText(time: Time) {
  if (typeof time === "string") {
    return time;
  }
  if (typeof time === "number") {
    return new Date(time * 1000).toISOString().slice(0, 10);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${time.year}-${pad(time.month)}-${pad(time.day)}`;
}

const price = (n: number) => n.toFixed(2);
const units = (n: number) => Math.round(n).toLocaleString("en-US");

function pointText(d: FinancialChartDatum) {
  const volume = d.volume === undefined ? "" : `, volume ${units(d.volume)}`;
  return `${timeText(d.time)}: open ${price(d.open)}, high ${price(d.high)}, low ${price(d.low)}, close ${price(d.close)}${volume}`;
}

const SERIES_NAMES: Record<FinancialChartSeries, string> = {
  candlestick: "Candlestick",
  area: "Area",
  line: "Line",
};

function summarize(series: FinancialChartSeries, data: FinancialChartDatum[]) {
  if (data.length === 0) {
    return "No data.";
  }
  const first = data[0];
  const last = data[data.length - 1];
  let high = first;
  let low = first;
  for (const d of data) {
    if (d.high > high.high) {
      high = d;
    }
    if (d.low < low.low) {
      low = d;
    }
  }
  const change =
    first.close === 0 ? 0 : ((last.close - first.close) / first.close) * 100;
  const sign = change > 0 ? "+" : "";
  return [
    `${SERIES_NAMES[series]} chart of ${data.length} points from ${timeText(first.time)} to ${timeText(last.time)}.`,
    `The close moved from ${price(first.close)} to ${price(last.close)} (${sign}${change.toFixed(1)}%).`,
    `Highest ${price(high.high)} on ${timeText(high.time)}; lowest ${price(low.low)} on ${timeText(low.time)}.`,
    "Use the left and right arrow keys to read each point.",
  ].join(" ");
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const DARK = "(prefers-color-scheme: dark)";

/**
 * A financial chart (candlesticks, area or line, with volume) drawn on canvas
 * by lightweight-charts. Colors come from the `--financial-chart-*` tokens and
 * follow light and dark; the chart resizes with its container. Keyboard and
 * screen reader users get a generated summary and a point-by-point cursor.
 */
function FinancialChart({
  data,
  series = "candlestick",
  volume,
  volumeScale = "auto",
  height = 300,
  label,
  summary,
  dataTable = false,
  options,
  seriesOptions,
  className,
  style,
  ref,
  ...props
}: FinancialChartProps) {
  const host = React.useRef<HTMLDivElement>(null);
  const chart = React.useRef<IChartApi | null>(null);
  const main = React.useRef<ISeriesApi<SeriesType> | null>(null);
  const bars = React.useRef<ISeriesApi<"Histogram"> | null>(null);
  const colors = React.useRef<Colors>(DEFAULTS);
  const fitted = React.useRef<string | null>(null);
  const latest = React.useRef({ data, options, seriesOptions });
  latest.current = { data, options, seriesOptions };
  const [cursor, setCursor] = React.useState(Math.max(0, data.length - 1));
  const summaryId = React.useId();
  const showVolume = volume ?? data.some((d) => d.volume !== undefined);

  const showPoint = React.useCallback((index: number | null) => {
    const api = chart.current;
    const priceSeries = main.current;
    const points = latest.current.data;
    if (!api || !priceSeries) {
      return;
    }
    if (index === null || !points[index]) {
      api.clearCrosshairPosition();
      return;
    }
    api.setCrosshairPosition(
      points[index].close,
      points[index].time,
      priceSeries,
    );
  }, []);

  React.useImperativeHandle(
    ref,
    () => ({
      getChart: () => chart.current,
      getSeries: () => main.current,
      getVolumeSeries: () => bars.current,
      showPoint,
    }),
    [showPoint],
  );

  // Create the chart once per series type and volume choice; data, options
  // and colors are applied to it in place below.
  React.useEffect(() => {
    const el = host.current;
    if (!el) {
      return;
    }
    const reduced = window.matchMedia(REDUCED_MOTION).matches;
    colors.current = readColors(el);
    const api = createChart(el, {
      autoSize: true,
      kineticScroll: { touch: !reduced, mouse: false },
      layout: { attributionLogo: true, colorParsers: [parseAnyColor] },
      // A resize keeps the visible time range (upstream keeps the bar
      // spacing, so a container that grows after mount shows a blank strip).
      timeScale: { lockVisibleTimeRangeOnResize: true },
    });
    api.applyOptions(chartColors(colors.current));
    if (latest.current.options) {
      api.applyOptions(latest.current.options);
    }
    const definition =
      series === "area"
        ? AreaSeries
        : series === "line"
          ? LineSeries
          : CandlestickSeries;
    const priceSeries = api.addSeries(definition, {
      ...seriesColors(series, colors.current),
      ...latest.current.seriesOptions,
    }) as ISeriesApi<SeriesType>;
    let volumeSeries: ISeriesApi<"Histogram"> | null = null;
    if (showVolume) {
      // Price in the top 60%, volume in the bottom 30%, overlaid
      // (lightweight-charts' price-and-volume example).
      priceSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.1, bottom: 0.4 },
      });
      volumeSeries = api.addSeries(HistogramSeries, {
        color: colors.current["volume-up"],
        priceFormat: { type: "volume" },
        priceScaleId: "",
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.7, bottom: 0 },
      });
      if (volumeScale === "zero") {
        volumeSeries.applyOptions({
          autoscaleInfoProvider: (original: () => AutoscaleInfo | null) => {
            const info = original();
            return info?.priceRange
              ? {
                  ...info,
                  priceRange: { ...info.priceRange, minValue: 0 },
                }
              : info;
          },
        });
      }
    }
    // The library lays its panes out in a table; it is layout, not data.
    el.querySelector("table")?.setAttribute("role", "presentation");
    chart.current = api;
    main.current = priceSeries;
    bars.current = volumeSeries;
    // A new chart starts with the current data, fitted to the view.
    const points = latest.current.data;
    priceSeries.setData(priceData(series, points));
    volumeSeries?.setData(volumeData(points, colors.current));
    api.timeScale().fitContent();
    fitted.current = datasetKey(series, points);
    return () => {
      chart.current = null;
      main.current = null;
      bars.current = null;
      api.remove();
    };
  }, [series, showVolume, volumeScale]);

  // Data: replaced in place; the view refits when a different dataset (a new
  // first time) arrives, and keeps the visitor's zoom when points are added.
  React.useEffect(() => {
    const priceSeries = main.current;
    if (!priceSeries) {
      return;
    }
    priceSeries.setData(priceData(series, data));
    bars.current?.setData(volumeData(data, colors.current));
    const key = datasetKey(series, data);
    if (key !== fitted.current) {
      fitted.current = key;
      chart.current?.timeScale().fitContent();
    }
    setCursor((current) => Math.min(current, Math.max(0, data.length - 1)));
  }, [data, series]);

  // Options passed later are applied over the token colors.
  React.useEffect(() => {
    if (options) {
      chart.current?.applyOptions(options);
    }
  }, [options]);
  React.useEffect(() => {
    if (seriesOptions) {
      main.current?.applyOptions(seriesOptions);
    }
  }, [seriesOptions]);

  // Colors: read again when the page's theme or color scheme changes.
  React.useEffect(() => {
    const el = host.current;
    if (!el) {
      return;
    }
    const update = () => {
      const next = readColors(el);
      const same = (Object.keys(next) as Token[]).every(
        (token) => next[token] === colors.current[token],
      );
      if (same) {
        return;
      }
      colors.current = next;
      const current = latest.current;
      chart.current?.applyOptions(chartColors(next));
      if (current.options) {
        chart.current?.applyOptions(current.options);
      }
      main.current?.applyOptions({
        ...seriesColors(series, next),
        ...current.seriesOptions,
      });
      bars.current?.setData(volumeData(current.data, next));
    };
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });
    const scheme = window.matchMedia(DARK);
    scheme.addEventListener("change", update);
    return () => {
      observer.disconnect();
      scheme.removeEventListener("change", update);
    };
  }, [series]);

  const move = (event: React.KeyboardEvent) => {
    const last = data.length - 1;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? Math.min(cursor + 1, last)
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? Math.max(cursor - 1, 0)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : event.key === "PageUp"
                ? Math.min(cursor + 10, last)
                : event.key === "PageDown"
                  ? Math.max(cursor - 10, 0)
                  : null;
    if (next === null || last < 0) {
      return;
    }
    event.preventDefault();
    setCursor(next);
    showPoint(next);
  };

  const point = data[cursor];

  return (
    <figure
      {...props}
      aria-describedby={summaryId}
      aria-label={label}
      className={cn("relative m-0 w-full", className)}
      style={{ height, ...style }}
    >
      {/* Canvas charts draw left to right in every language. */}
      <div className="absolute inset-0" dir="ltr" ref={host} />
      {/* A cursor over the chart for the keyboard: it moves the crosshair
          from point to point and reads each one out. Pointer input goes
          straight through to the chart. */}
      <div
        aria-label={label}
        aria-valuemax={data.length}
        aria-valuemin={data.length > 0 ? 1 : 0}
        aria-valuenow={data.length > 0 ? cursor + 1 : 0}
        aria-valuetext={point ? pointText(point) : "No data"}
        className="pointer-events-none absolute inset-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        onBlur={() => showPoint(null)}
        onFocus={() => showPoint(cursor)}
        onKeyDown={move}
        role="slider"
        tabIndex={0}
      />
      <p className="sr-only" id={summaryId}>
        {summary ?? summarize(series, data)}
      </p>
      {dataTable ? (
        <table className="sr-only">
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Open</th>
              <th scope="col">High</th>
              <th scope="col">Low</th>
              <th scope="col">Close</th>
              {showVolume ? <th scope="col">Volume</th> : null}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={timeText(d.time)}>
                <th scope="row">{timeText(d.time)}</th>
                <td>{price(d.open)}</td>
                <td>{price(d.high)}</td>
                <td>{price(d.low)}</td>
                <td>{price(d.close)}</td>
                {showVolume ? (
                  <td>{d.volume === undefined ? "" : units(d.volume)}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </figure>
  );
}

export {
  FinancialChart,
  type FinancialChartDatum,
  type FinancialChartHandle,
  type FinancialChartProps,
  type FinancialChartSeries,
};
