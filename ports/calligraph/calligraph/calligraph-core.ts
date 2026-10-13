import type { Transition } from "motion/react";

// ---- upstream: packages/calligraph/src/shared.ts ----
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
export const splitGraphemes = (s: string): string[] =>
  Array.from(segmenter.segment(s), (seg) => seg.segment);

export const isDigit = (c: string) => c >= "0" && c <= "9";

export function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

export const DIGIT_DISTANCE = 8;

export const animations = {
  default: { duration: 0.38, ease: [0.19, 1, 0.22, 1] },
  smooth: { type: "spring", duration: 0.4, bounce: 0 },
  snappy: { type: "spring", duration: 0.35, bounce: 0.15 },
  bouncy: { type: "spring", duration: 0.5, bounce: 0.3 },
} satisfies Record<string, Transition>;

export type Animation = keyof typeof animations;

// ---- upstream: packages/calligraph/src/reconcile.ts ----
function computeLCS(oldSegs: string[], newSegs: string[]): [number, number][] {
  const m = oldSegs.length;
  const n = newSegs.length;
  const dp: number[][] = [];

  for (let i = 0; i <= m; i++) {
    dp[i] = [];
    for (let j = 0; j <= n; j++) {
      if (i === 0 || j === 0) {
        dp[i][j] = 0;
      } else if (oldSegs[i - 1] === newSegs[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const pairs: [number, number][] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (oldSegs[i - 1] === newSegs[j - 1]) {
      pairs.push([i - 1, j - 1]);
      i--;
      j--;
    } else if (
      dp[i - 1][j] > dp[i][j - 1] ||
      (dp[i - 1][j] === dp[i][j - 1] && i >= j)
    ) {
      i--;
    } else {
      j--;
    }
  }

  pairs.reverse();
  return pairs;
}

export function reconcileTextKeys(
  prevText: string,
  newText: string,
  prevKeys: string[],
  nextId: number,
) {
  const prevSegs = splitGraphemes(prevText);
  const newSegs = splitGraphemes(newText);
  const matches = computeLCS(prevSegs, newSegs);
  const newKeys: string[] = new Array(newSegs.length).fill("");

  for (const [oldIdx, newIdx] of matches) {
    newKeys[newIdx] = prevKeys[oldIdx];
  }

  let id = nextId;
  let newCount = 0;
  for (let i = 0; i < newKeys.length; i++) {
    if (!newKeys[i]) {
      newKeys[i] = `c${id++}`;
      newCount++;
    }
  }

  const keptCount = newSegs.length - newCount;
  const removedCount = prevSegs.length - keptCount;
  const totalChange = newCount + removedCount;
  const maxLen = Math.max(newSegs.length, prevSegs.length);

  return {
    keys: newKeys,
    changeRatio: maxLen > 0 ? totalChange / maxLen : 1,
    nextId: id,
  };
}

export function reconcileDigitKeys(
  prevText: string,
  newText: string,
  prevKeys: number[],
  nextId: number,
) {
  const toNum = (s: string) => parseFloat(s.replace(/[^0-9.-]/g, "")) || 0;
  const direction = Math.sign(toNum(newText) - toNum(prevText));

  const oldChars = splitGraphemes(prevText);
  const newChars = splitGraphemes(newText);

  const firstDigitIndex = (arr: string[]) => {
    const idx = arr.findIndex((c) => isDigit(c));
    return idx === -1 ? arr.length : idx;
  };

  const newPrefixLen = firstDigitIndex(newChars);
  const oldPrefixLen = firstDigitIndex(oldChars);
  const minPrefix = Math.min(newPrefixLen, oldPrefixLen);

  const newKeys: number[] = new Array(newChars.length);
  let id = nextId;

  for (let i = 0; i < newPrefixLen; i++) {
    newKeys[i] =
      i < minPrefix && newChars[i] === oldChars[i] ? prevKeys[i] : id++;
  }

  const oldBody = oldChars.slice(oldPrefixLen);
  const newBody = newChars.slice(newPrefixLen);
  const oldBodyKeys = prevKeys.slice(oldPrefixLen);
  const maxBodyLen = Math.max(oldBody.length, newBody.length);

  const padOld = [
    ...Array<string>(Math.max(0, maxBodyLen - oldBody.length)).fill(""),
    ...oldBody,
  ];
  const padNew = [
    ...Array<string>(Math.max(0, maxBodyLen - newBody.length)).fill(""),
    ...newBody,
  ];
  const padKeys = [
    ...Array<number>(Math.max(0, maxBodyLen - oldBodyKeys.length)).fill(-1),
    ...oldBodyKeys,
  ];

  const bodyOffset = maxBodyLen - newBody.length;
  for (let i = 0; i < newBody.length; i++) {
    const pi = bodyOffset + i;
    newKeys[newPrefixLen + i] =
      padNew[pi] === padOld[pi] && padKeys[pi] >= 0 ? padKeys[pi] : id++;
  }

  return { keys: newKeys, direction, nextId: id };
}
