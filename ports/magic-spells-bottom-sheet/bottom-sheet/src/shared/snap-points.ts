// ---- upstream: src/snap-points.js ----
// Sitting exactly on a snap leaves sub-pixel noise in the measured height, so
// "strictly past" needs a little room or a flick from a snap resolves to itself.
const SNAP_EPSILON = 1;

/**
 * Parses a snap-points value into a sorted list of dvh percentages
 * @param value - Comma or whitespace separated numbers, or a list of numbers
 * @returns Ascending, deduped percentages; empty when nothing parses
 */
const parseSnapPoints = (
  value: string | readonly number[] | null | undefined,
): number[] => {
  if (!value) return [];

  const seen = new Set<number>();
  const tokens = Array.isArray(value)
    ? value.map(String)
    : String(value).split(/[\s,]+/);
  for (const token of tokens) {
    if (token === "") continue;

    const parsed = Number(token);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) continue;

    seen.add(parsed);
  }

  return [...seen].sort((a, b) => a - b);
};

interface ResolveSnapOptions {
  /** Panel height at the moment of release */
  currentPx: number;
  /** Release velocity in px/ms, positive downward */
  velocityY: number;
  /** Ascending snap heights in pixels */
  snapsPx: number[];
  /** Speed that counts as a flick */
  flickVelocity: number;
}

/**
 * Chooses the snap a released gesture should land on. A flick steps exactly one
 * snap in its own direction; anything slower lands on whichever snap is nearest.
 * @returns Target height in pixels, or null to dismiss
 */
const resolveSnapTarget = ({
  currentPx,
  velocityY,
  snapsPx,
  flickVelocity,
}: ResolveSnapOptions): number | null => {
  if (!snapsPx.length) return null;

  // Stepping from the current position rather than from the snap the gesture
  // started at — otherwise dragging 40 past 90 and flicking up targets 70.
  if (velocityY > flickVelocity) {
    const below = snapsPx.filter((px) => px < currentPx - SNAP_EPSILON);
    // Running out of snaps below is what dismisses the sheet.
    return below.length ? below[below.length - 1] : null;
  }

  if (velocityY < -flickVelocity) {
    const above = snapsPx.find((px) => px > currentPx + SNAP_EPSILON);
    return above ?? snapsPx[snapsPx.length - 1];
  }

  return snapsPx.reduce((best, px) =>
    Math.abs(px - currentPx) < Math.abs(best - currentPx) ? px : best,
  );
};

export { parseSnapPoints, resolveSnapTarget, SNAP_EPSILON };
export type { ResolveSnapOptions };
