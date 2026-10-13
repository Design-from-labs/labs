// The /ui specimen wall: tile sizes and loops (docs/contract.md section 4.2,
// docs/decisions/0019-specimen-wall.md and 0020-specimen-loops.md).
import type { Entry } from "./data";

export interface TileMeta {
  span?: 1 | 2;
  rows?: 1 | 2 | 3;
  surface?: "light" | "dark";
}

export interface LoopMeta {
  script?: string;
  duration?: number;
  hydrate?: boolean;
}

export interface Tile {
  span: 1 | 2;
  rows: 1 | 2 | 3;
  surface: "light" | "dark";
}

/** The entry's tile, with the defaults filled in. */
export function tileOf(entry: Entry): Tile {
  const staged = Boolean(entry.stage);
  return {
    span: entry.tile?.span ?? (staged ? 2 : 1),
    rows: entry.tile?.rows ?? (staged ? 2 : 1),
    surface: entry.tile?.surface ?? "light",
  };
}

/** What the loop driver (src/scripts/specimens.ts) reads from a tile. */
export function loopAttr(entry: Entry): string {
  return JSON.stringify({
    script: entry.loop?.script ?? null,
    duration: entry.loop?.duration ?? 4000,
  });
}

/** A short accessible name for a tile that shows no text of its own. */
export function tileLabel(entry: Entry): string {
  const first = entry.description.split(/(?<=[.!?])\s/)[0] ?? "";
  const brief = first.length > 140 ? `${first.slice(0, 137)}...` : first;
  return `${entry.title}${entry.status === "beta" ? " (beta)" : ""}: ${brief}`;
}
