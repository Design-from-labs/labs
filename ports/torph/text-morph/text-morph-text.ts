import { type Segment, type SegmentKind, cancelAnimations, fadeDuration, lcsIndices, moverOf, parseTranslate } from "./text-morph-core";

// ---- upstream: packages/torph/src/lib/text-morph/utils/number.ts ----

export type NumberSegment = Segment & { kind: SegmentKind };

// Numeric and text IDs share a namespace. A NULL prefix cannot occur in a text-derived
// ID, and the counter only climbs, so neither can collide with the other.
const MINTED_PREFIX = "\u0000n";
let nextNewId = 0;

function mintId(): string {
  return `${MINTED_PREFIX}${nextNewId++}`;
}

export function isDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

export function hasDigit(value: string): boolean {
  for (const char of value) {
    if (isDigit(char)) return true;
  }
  return false;
}

/** What is left of a token once its digits and separators go — "$", "%", "()". */
export function numericSkeleton(word: string): string {
  let out = "";
  for (const char of word) {
    if (!isDigit(char) && !CORE_SEPARATORS.includes(char)) out += char;
  }
  return out;
}

/** Separators that can appear *between* digits without ending the number. */
const CORE_SEPARATORS = ".,'\u00A0\u202F\u2009\u2007";
const PREFIX_CHARS = "+-\u2212(#";
const SUFFIX_CHARS = "%.,!?:;)\"'\u201D\u2019";
const CURRENCY = /\p{Sc}/u;

function isAffix(char: string, set: string): boolean {
  return set.includes(char) || CURRENCY.test(char);
}

/**
 * Whether a token is a quantity. Strict on purpose, and on by default: merely
 * containing a digit is not enough, or "COVID-19" and "2024-01-01" morph by place.
 */
export function isNumericWord(word: string): boolean {
  let start = 0;
  let end = word.length;

  while (start < end && isAffix(word[start]!, PREFIX_CHARS)) start++;
  while (end > start && isAffix(word[end - 1]!, SUFFIX_CHARS)) end--;

  if (start >= end) return false;
  if (!isDigit(word[start]!) || !isDigit(word[end - 1]!)) return false;

  for (let i = start; i < end; i++) {
    const char = word[i]!;
    if (!isDigit(char) && !CORE_SEPARATORS.includes(char)) return false;
  }

  return true;
}

export function classifyKind(char: string): SegmentKind {
  return isDigit(char) ? "digit" : "symbol";
}

const separators = new Map<string, string>();

/** The locale's decimal separator — the pivot every alignment is measured from. */
export function decimalSeparator(locale: Intl.LocalesArgument): string {
  const key = String(locale);
  const cached = separators.get(key);
  if (cached) return cached;

  let separator = ".";
  try {
    separator =
      new Intl.NumberFormat(locale)
        .formatToParts(1.1)
        .find((part) => part.type === "decimal")?.value ?? ".";
  } catch {
    // Invalid locale tag. `toLocaleString` surfaces it on the first number.
  }

  separators.set(key, separator);
  return separator;
}

/** Per-character segments, matched by caret where `cursorIndex` is given, else by place. */
export function segmentNumber(
  value: string,
  prevSegments?: NumberSegment[],
  cursorIndex?: number,
  decimalChar = ".",
): NumberSegment[] {
  const chars = value.split("");

  if (!prevSegments || prevSegments.length === 0) {
    return simpleSegment(chars);
  }

  const oldChars = prevSegments.map((s) =>
    s.string === "\u00A0" ? " " : s.string,
  );

  const matches =
    cursorIndex != null
      ? cursorMatch(oldChars, chars, cursorIndex, decimalChar)
      : placeMatch(oldChars, chars, decimalChar);

  const usedIds = new Set<string>();
  for (const [, oldIdx] of matches) {
    usedIds.add(prevSegments[oldIdx]!.id);
  }

  const result: NumberSegment[] = [];

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]!;
    const kind = classifyKind(char);
    const displayChar = char === " " ? "\u00A0" : char;

    if (matches.has(i)) {
      const oldIdx = matches.get(i)!;
      result.push({
        id: prevSegments[oldIdx]!.id,
        string: displayChar,
        kind,
      });
    } else {
      let id = mintId();
      while (usedIds.has(id)) {
        id = mintId();
      }
      usedIds.add(id);
      result.push({ id, string: displayChar, kind });
    }
  }

  return result;
}

/** Fresh segmentation for a number with nothing to carry over from. */
function simpleSegment(chars: string[]): NumberSegment[] {
  return chars.map((char) => ({
    id: mintId(),
    string: char === " " ? "\u00A0" : char,
    kind: classifyKind(char),
  }));
}

/**
 * The caret in the new string says where the edit was; both sides of it map across.
 *
 * The walk is over everything *but* the grouping separators. A comma reflows with the
 * magnitude rather than with the keystroke, so counting it into the edit would shear
 * every match past the caret — typing a digit that carries "123" to "1,234" is a
 * two-character delta of which the user typed one, and they are not adjacent.
 */
function cursorMatch(
  oldChars: string[],
  newChars: string[],
  cursor: number,
  decimalChar: string,
): Map<number, number> {
  const matches = new Map<number, number>();

  const oldKept = keptIndices(oldChars, decimalChar);
  const newKept = keptIndices(newChars, decimalChar);
  const pair = (ni: number, oi: number) =>
    matches.set(newKept[ni]!, oldKept[oi]!);

  let keptCursor = 0;
  while (keptCursor < newKept.length && newKept[keptCursor]! < cursor)
    keptCursor++;

  const lenDiff = newKept.length - oldKept.length;

  if (lenDiff > 0) {
    const editStart = keptCursor - lenDiff;
    for (let i = 0; i < editStart && i < oldKept.length; i++) {
      pair(i, i);
    }
    for (let i = keptCursor; i < newKept.length; i++) {
      const oldIdx = i - lenDiff;
      if (oldIdx >= 0 && oldIdx < oldKept.length) {
        pair(i, oldIdx);
      }
    }
  } else if (lenDiff < 0) {
    for (let i = 0; i < keptCursor && i < newKept.length; i++) {
      pair(i, i);
    }
    for (let i = keptCursor; i < newKept.length; i++) {
      const oldIdx = i - lenDiff;
      if (oldIdx >= 0 && oldIdx < oldKept.length) {
        pair(i, oldIdx);
      }
    }
  } else {
    for (let i = 0; i < newKept.length; i++) {
      if (newChars[newKept[i]!] === oldChars[oldKept[i]!]) {
        pair(i, i);
      }
    }
  }

  // Paired from the units end, so the thousands comma stays the thousands comma.
  const oldSeps = groupingIndices(oldChars, decimalChar);
  const newSeps = groupingIndices(newChars, decimalChar);
  for (let k = 1; k <= oldSeps.length && k <= newSeps.length; k++) {
    const oldIdx = oldSeps[oldSeps.length - k]!;
    const newIdx = newSeps[newSeps.length - k]!;
    if (oldChars[oldIdx] === newChars[newIdx]) matches.set(newIdx, oldIdx);
  }

  return matches;
}

function isGrouping(char: string, decimalChar: string): boolean {
  return char !== decimalChar && CORE_SEPARATORS.includes(char);
}

function keptIndices(chars: string[], decimalChar: string): number[] {
  const indices: number[] = [];
  for (let i = 0; i < chars.length; i++) {
    if (!isGrouping(chars[i]!, decimalChar)) indices.push(i);
  }
  return indices;
}

function groupingIndices(chars: string[], decimalChar: string): number[] {
  const indices: number[] = [];
  for (let i = 0; i < chars.length; i++) {
    if (isGrouping(chars[i]!, decimalChar)) indices.push(i);
  }
  return indices;
}

/**
 * Pairs characters by distance from the decimal separator, not left to right — a
 * digit's identity is its column. Both walks skip mismatches rather than stopping.
 */
function placeMatch(
  oldChars: string[],
  newChars: string[],
  decimalChar: string,
): Map<number, number> {
  const matches = new Map<number, number>();

  let start = 0;
  while (
    start < oldChars.length &&
    start < newChars.length &&
    oldChars[start] === newChars[start] &&
    !isDigit(oldChars[start]!)
  ) {
    matches.set(start, start);
    start++;
  }

  let oldEnd = oldChars.length;
  let newEnd = newChars.length;
  while (
    oldEnd > start &&
    newEnd > start &&
    oldChars[oldEnd - 1] === newChars[newEnd - 1] &&
    !isDigit(oldChars[oldEnd - 1]!)
  ) {
    matches.set(newEnd - 1, oldEnd - 1);
    oldEnd--;
    newEnd--;
  }

  const oldPivot = findPivot(oldChars, start, oldEnd, decimalChar);
  const newPivot = findPivot(newChars, start, newEnd, decimalChar);

  const oldDigits = integerDigits(oldChars, start, oldPivot);
  const newDigits = integerDigits(newChars, start, newPivot);

  // A side with no digits is a field being typed into or emptied, not a magnitude.
  if (
    oldDigits > 0 &&
    newDigits > 0 &&
    Math.abs(oldDigits - newDigits) >= MAGNITUDE_JUMP
  ) {
    return matches;
  }

  // A separator holds its distance from the pivot — what slides the comma one group
  // along on 999,999 → 1,000,000. After a reshape it would have to cross the digits
  // that carried, the two passing in opposite directions, so it leaves instead.
  const reshaped = matchDigits(start, oldPivot, start, newPivot, true);
  if (!reshaped) {
    for (let k = 1; oldPivot - k >= start && newPivot - k >= start; k++) {
      matchSeparator(oldPivot - k, newPivot - k);
    }
  }

  // Absent from either value, the pivot is that value's end.
  if (oldPivot < oldEnd && newPivot < newEnd) {
    matches.set(newPivot, oldPivot);

    for (let k = 1; oldPivot + k < oldEnd && newPivot + k < newEnd; k++) {
      matchSeparator(oldPivot + k, newPivot + k);
    }
    matchDigits(oldPivot + 1, oldEnd, newPivot + 1, newEnd, false);
  }

  function matchSeparator(oldIndex: number, newIndex: number) {
    const char = oldChars[oldIndex]!;
    if (isDigit(char)) return;
    if (char === newChars[newIndex]) matches.set(newIndex, oldIndex);
  }

  /**
   * Pairs the digits on one side of the pivot, by column where the count matches and by
   * subsequence where it changed. Reshaping is integer-side only — a fraction's columns
   * are fixed by the decimal point, so 1.5 → 1.25 gains a hundredths rather than sliding
   * the 5. `towardsPivot` breaks ties on repeated digits towards the units column.
   * Returns whether digits survived a reshape.
   */
  function matchDigits(
    oldFrom: number,
    oldTo: number,
    newFrom: number,
    newTo: number,
    towardsPivot: boolean,
  ): boolean {
    const oldIndices = digitIndices(oldChars, oldFrom, oldTo);
    const newIndices = digitIndices(newChars, newFrom, newTo);

    if (oldIndices.length === newIndices.length || !towardsPivot) {
      const pairs = Math.min(oldIndices.length, newIndices.length);
      for (let k = 0; k < pairs; k++) {
        const oi = oldIndices[k]!;
        const ni = newIndices[k]!;
        if (oldChars[oi] === newChars[ni]) matches.set(ni, oi);
      }
      return false;
    }

    // Reversed, so the subsequence walk resolves its ties from the units end.
    const oldRun = oldIndices.map((i) => oldChars[i]!).reverse();
    const newRun = newIndices.map((i) => newChars[i]!).reverse();
    const [ai, bi] = lcsIndices(oldRun, newRun);

    for (let k = 0; k < ai.length; k++) {
      const oi = oldIndices[oldIndices.length - 1 - ai[k]!]!;
      const ni = newIndices[newIndices.length - 1 - bi[k]!]!;
      matches.set(ni, oi);
    }

    return ai.length > 0;
  }

  return matches;
}

function digitIndices(chars: string[], from: number, to: number): number[] {
  const indices: number[] = [];
  for (let i = from; i < to; i++) if (isDigit(chars[i]!)) indices.push(i);
  return indices;
}

// Past this the digits overlap into a smear and nothing should carry across. Three is
// where the corpus divides: cases needing their slide sit at 0-1, replacements at 3+.
const MAGNITUDE_JUMP = 3;

function integerDigits(chars: string[], start: number, pivot: number): number {
  let count = 0;
  for (let i = start; i < pivot; i++) if (isDigit(chars[i]!)) count++;
  return count;
}

/** Last decimal separator within the affix-trimmed range, else the range end. */
function findPivot(
  chars: string[],
  start: number,
  end: number,
  decimalChar: string,
): number {
  for (let i = end - 1; i >= start; i--) {
    if (chars[i] === decimalChar) return i;
  }
  return end;
}

// ---- upstream: packages/torph/src/lib/text-morph/utils/segment.ts ----

// A collision makes two segments fight over one element and one silently loses its
// text, so uniqueness has to hold across the whole value, not per line.
export function createIdAllocator() {
  const used = new Set<string>();

  return {
    reserve(id: string) {
      used.add(id);
    },
    has(id: string) {
      return used.has(id);
    },
    take(base: string): string {
      if (!used.has(base)) {
        used.add(base);
        return base;
      }
      let i = 1;
      while (used.has(`${base}~${i}`)) i++;
      const id = `${base}~${i}`;
      used.add(id);
      return id;
    },
  };
}

export type IdAllocator = ReturnType<typeof createIdAllocator>;

/** Whitespace-delimited words — the unit the diff aligns on, and so a number's bounds. */
export function groupIntoWords(segments: Segment[]): {
  word: string;
  segments: Segment[];
}[] {
  const groups: { word: string; segments: Segment[] }[] = [];
  let current: Segment[] = [];

  const flush = () => {
    if (current.length === 0) return;
    groups.push({
      word: current.map((s) => s.string).join(""),
      segments: current,
    });
    current = [];
  };

  for (const seg of segments) {
    if (seg.string === "\u00A0" || seg.string === "\n") flush();
    else current.push(seg);
  }
  flush();

  return groups;
}

/**
 * Re-cuts every numeric word into per-character segments carrying a kind. A pass over
 * the finished segmentation, not part of it: `Intl.Segmenter` splits "$1,234" on its
 * own terms, and regrouping on whitespace is what keeps this and the diff agreeing.
 */
function expandNumbers(segments: Segment[]): Segment[] {
  const out: Segment[] = [];
  let run: Segment[] = [];

  const flush = () => {
    if (run.length === 0) return;
    const word = run.map((s) => s.string).join("");
    if (isNumericWord(word)) out.push(...segmentNumber(word));
    else out.push(...run);
    run = [];
  };

  for (const seg of segments) {
    if (seg.string === "\u00A0" || seg.string === "\n") {
      flush();
      out.push(seg);
    } else {
      run.push(seg);
    }
  }
  flush();

  return out;
}

export function segmentText(
  value: string,
  locale: Intl.LocalesArgument,
  numbers = true,
): Segment[] {
  const hasNewlines = value.includes("\n");
  const byWord = value.includes(" ") || hasNewlines;
  const alloc = createIdAllocator();

  if (hasNewlines) {
    // `offset` indexes the full value, so IDs derived from it stay unique across lines.
    const lines = value.split("\n");
    const allSegments: Segment[] = [];
    let offset = 0;

    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        allSegments.push({
          id: alloc.take(`newline-${offset}`),
          string: "\n",
        });
        offset += 1;
      }
      if (line.length > 0) {
        allSegments.push(...segmentLine(line, locale, true, offset, alloc));
      }
      offset += line.length;
    });

    return numbers ? expandNumbers(allSegments) : allSegments;
  }

  const segments = segmentLine(value, locale, byWord, 0, alloc);
  return numbers ? expandNumbers(segments) : segments;
}

function segmentLine(
  line: string,
  locale: Intl.LocalesArgument,
  byWord: boolean,
  offset: number,
  alloc: IdAllocator,
): Segment[] {
  if (typeof Intl.Segmenter !== "undefined") {
    const segmenter = new Intl.Segmenter(locale, {
      granularity: byWord ? "word" : "grapheme",
    });
    return segmentsFromIntl(
      segmenter.segment(line)[Symbol.iterator](),
      offset,
      alloc,
    );
  }

  return segmentsFallback(line, byWord, offset, alloc);
}

function segmentsFromIntl(
  iterator: Intl.SegmentIterator<Intl.SegmentData>,
  offset: number,
  alloc: IdAllocator,
): Segment[] {
  const segments: Segment[] = [];

  for (const data of Array.from(iterator)) {
    const index = offset + data.index;
    if (data.segment === " ") {
      segments.push({ id: alloc.take(`space-${index}`), string: "\u00A0" });
    } else {
      segments.push({
        id: allocSegmentId(data.segment, index, alloc),
        string: data.segment,
      });
    }
  }

  return segments;
}

function allocSegmentId(
  part: string,
  index: number,
  alloc: IdAllocator,
): string {
  return alloc.has(part) ? alloc.take(`${part}-${index}`) : alloc.take(part);
}

function segmentsFallback(
  value: string,
  byWord: boolean,
  offset: number,
  alloc: IdAllocator,
): Segment[] {
  const parts = byWord ? value.split(" ") : value.split("");
  const segments: Segment[] = [];
  let index = offset;

  parts.forEach((part, i) => {
    if (byWord && i > 0) {
      segments.push({ id: alloc.take(`space-${index}`), string: "\u00A0" });
      index += 1;
    }
    segments.push({ id: allocSegmentId(part, index, alloc), string: part });
    index += part.length;
  });

  return segments;
}

// ---- upstream: packages/torph/src/lib/text-morph/utils/diff.ts ----

export type DiffResult = {
  segments: Segment[];
  splits: Map<string, Segment[]>;
};

export type DiffOptions = {
  /** Numeric words morph by place value. Off falls back to character LCS. */
  numbers?: boolean;
  /** Caret position, honoured only when the value holds a single number. */
  cursorIndex?: number;
};

// Numbers share too few characters to pair with each other, so they all collapse to one token.
const NUMBER_TOKEN = "\u0000#";

/** Per-character segments of an old word, cutting it up first if it is still one span. */
function splitIfWhole(
  oldGroup: { word: string; segments: Segment[] },
  splits: Map<string, Segment[]>,
): Segment[] {
  // Cutting a one-character word mints a new ID for a character that never moved.
  if (oldGroup.segments.length !== 1 || oldGroup.word.length <= 1) {
    return oldGroup.segments;
  }

  const wordSeg = oldGroup.segments[0]!;
  const charSegs = oldGroup.word.split("").map((char, i) => ({
    id: `${wordSeg.id}:${i}`,
    string: char,
  }));
  splits.set(wordSeg.id, charSegs);

  return charSegs;
}

/** Fills in kinds an older, non-numeric segmentation of the same word lacked. */
function asNumberSegments(segments: Segment[]): NumberSegment[] {
  return segments.map((seg) => ({
    ...seg,
    kind: seg.kind ?? classifyKind(seg.string),
  }));
}

/** How a new word gets its segments — the ID pre-pass and the build loop must agree. */
type WordPlan =
  | { mode: "fresh" }
  | { mode: "reuse"; oi: number }
  | { mode: "morph"; oi: number }
  | { mode: "number"; oi: number };

function charSimilarity(a: string, b: string): number {
  if (a.length === 0 || b.length === 0) return 0;
  const [matched] = lcsIndices(a.split(""), b.split(""));
  return matched.length / Math.max(a.length, b.length);
}

/** How many LCS matches sit before each word — the index of the gap it occupies. */
function gapIndices(count: number, matched: Set<number>): number[] {
  const gaps: number[] = [];
  let anchors = 0;
  for (let i = 0; i < count; i++) {
    gaps.push(anchors);
    if (matched.has(i)) anchors++;
  }
  return gaps;
}

const MIN_SIMILARITY = 0.4;

/** An old word's claim on a new one. A matching numeric skeleton beats shared characters. */
function pairAffinity(a: string, b: string): number {
  if (
    (hasDigit(a) || hasDigit(b)) &&
    numericSkeleton(a) === numericSkeleton(b)
  ) {
    return 1;
  }
  return charSimilarity(a, b);
}

// The diff runs before the first frame, so past these it degrades rather than blocks.
const MAX_MORPH_PAIRINGS = 2_500;
const MAX_LCS_CELLS = 1_000_000;

export function diffSegments(
  oldSegments: Segment[],
  newText: string,
  locale: Intl.LocalesArgument,
  options: DiffOptions = {},
): DiffResult {
  const newHasSpaces = newText.includes(" ");
  const newHasNewlines = newText.includes("\n");
  const oldWords = groupIntoWords(oldSegments);

  const numbersOn = options.numbers !== false;
  const isNum = (word: string) => numbersOn && isNumericWord(word);
  const token = (word: string) => (isNum(word) ? NUMBER_TOKEN : word);

  // Text IDs are derived from the text and survive re-segmentation; minted numeric IDs don't.
  const digitsInvolved =
    numbersOn && (hasDigit(newText) || oldWords.some((g) => hasDigit(g.word)));

  if (
    oldWords.length <= 1 &&
    !newHasSpaces &&
    !newHasNewlines &&
    !digitsInvolved
  ) {
    return {
      segments: segmentText(newText, locale, numbersOn),
      splits: new Map(),
    };
  }

  const newWordStrings: string[] = [];
  const newSeparators: string[][] = []; // separators BEFORE each word
  const parts = newText.split(/( |\n)/);
  let pendingSeps: string[] = [];
  for (const part of parts) {
    if (part === " " || part === "\n") {
      pendingSeps.push(part);
    } else if (part.length > 0) {
      newSeparators.push(pendingSeps);
      newWordStrings.push(part);
      pendingSeps = [];
    }
  }
  const trailingSeparators = pendingSeps;

  const oldWordStrings = oldWords.map((g) => g.word);

  if (oldWordStrings.length * newWordStrings.length > MAX_LCS_CELLS) {
    return {
      segments: segmentText(newText, locale, numbersOn),
      splits: new Map(),
    };
  }

  const [oldLcsIdx, newLcsIdx] = lcsIndices(
    oldWordStrings.map(token),
    newWordStrings.map(token),
  );
  const oldMatchedSet = new Set(oldLcsIdx);
  const newMatchedSet = new Set(newLcsIdx);

  const newToOldWord = new Map<number, number>();
  for (let k = 0; k < newLcsIdx.length; k++) {
    newToOldWord.set(newLcsIdx[k]!, oldLcsIdx[k]!);
  }

  let oldUnmatched = oldWordStrings
    .map((_, i) => i)
    .filter((i) => !oldMatchedSet.has(i));
  let newUnmatched = newWordStrings
    .map((_, i) => i)
    .filter((i) => !newMatchedSet.has(i));

  // Exact-match reordered words that LCS couldn't capture (order-preserving)
  const exactUsed = new Set<number>();
  for (const ni of newUnmatched) {
    for (const oi of oldUnmatched) {
      if (exactUsed.has(oi)) continue;
      if (token(newWordStrings[ni]!) === token(oldWordStrings[oi]!)) {
        newToOldWord.set(ni, oi);
        exactUsed.add(oi);
        break;
      }
    }
  }
  if (exactUsed.size > 0) {
    oldUnmatched = oldUnmatched.filter((i) => !exactUsed.has(i));
    newUnmatched = newUnmatched.filter((i) => !newToOldWord.has(i));
  }

  const morphPairs = new Map<number, number>();
  const usedOld = new Set<number>();

  // From the LCS alone: the exact-match pass reorders, so its pairs anchor nothing.
  const oldGaps = gapIndices(oldWordStrings.length, oldMatchedSet);
  const newGaps = gapIndices(newWordStrings.length, newMatchedSet);

  if (oldUnmatched.length * newUnmatched.length <= MAX_MORPH_PAIRINGS) {
    for (const ni of newUnmatched) {
      let bestOi = -1;
      let bestSim = MIN_SIMILARITY;

      for (const oi of oldUnmatched) {
        if (usedOld.has(oi)) continue;
        // A pairing that crosses a surviving word drags its characters the width of the value.
        if (oldGaps[oi] !== newGaps[ni]) continue;
        // Numbers and words pair freely; MIN_SIMILARITY keeps a number off a real word.
        const sim = pairAffinity(oldWordStrings[oi]!, newWordStrings[ni]!);
        if (sim > bestSim) {
          bestSim = sim;
          bestOi = oi;
        }
      }

      if (bestOi >= 0) {
        morphPairs.set(ni, bestOi);
        usedOld.add(bestOi);
      }
    }
  }

  // Keyed on what the word is becoming, not on what it was.
  const plans: WordPlan[] = newWordStrings.map((newWord, ni): WordPlan => {
    const lcsOi = newToOldWord.get(ni);
    const oi = lcsOi ?? morphPairs.get(ni);
    if (oi === undefined) return { mode: "fresh" };
    if (isNum(newWord)) return { mode: "number", oi };
    return lcsOi !== undefined ? { mode: "reuse", oi } : { mode: "morph", oi };
  });

  // Meaningless once a value holds several figures.
  const cursorIndex =
    plans.filter((plan) => plan.mode === "number").length === 1
      ? options.cursorIndex
      : undefined;
  const decimalChar = decimalSeparator(locale);

  const alloc = createIdAllocator();

  // Reserved up front: an ID inherited later would otherwise go to an earlier segment.
  for (const plan of plans) {
    if (plan.mode === "fresh") continue;
    const oldGroup = oldWords[plan.oi]!;

    if (plan.mode !== "reuse" && oldGroup.segments.length === 1) {
      // About to be split into per-character spans
      const wordSeg = oldGroup.segments[0]!;
      for (let i = 0; i < oldGroup.word.length; i++) {
        alloc.reserve(`${wordSeg.id}:${i}`);
      }
    } else {
      for (const seg of oldGroup.segments) alloc.reserve(seg.id);
    }
  }

  const segments: Segment[] = [];
  const splits = new Map<string, Segment[]>();
  let charOffset = 0;

  // Includes the edges — segmentText keeps leading and trailing whitespace on first render.
  function pushSeparators(seps: string[]) {
    for (const sep of seps) {
      if (sep === "\n") {
        segments.push({
          id: alloc.take(`newline-${charOffset}`),
          string: "\n",
        });
      } else {
        segments.push({
          id: alloc.take(`space-${charOffset}`),
          string: "\u00A0",
        });
      }
      charOffset++;
    }
  }

  for (let ni = 0; ni < newWordStrings.length; ni++) {
    pushSeparators(newSeparators[ni] ?? (ni > 0 ? [" "] : []));

    const plan = plans[ni]!;
    const newWord = newWordStrings[ni]!;

    if (plan.mode === "reuse") {
      for (const seg of oldWords[plan.oi]!.segments) segments.push(seg);
    } else if (plan.mode === "number") {
      const oldGroup = oldWords[plan.oi]!;

      segments.push(
        ...segmentNumber(
          newWord,
          asNumberSegments(splitIfWhole(oldGroup, splits)),
          cursorIndex === undefined ? undefined : cursorIndex - charOffset,
          decimalChar,
        ),
      );
    } else if (plan.mode === "morph") {
      const oldGroup = oldWords[plan.oi]!;
      const oldWord = oldGroup.word;
      const oldCharSegs = splitIfWhole(oldGroup, splits);

      const oldChars = oldWord.split("");
      const newChars = newWord.split("");
      const [oldCharLcs, newCharLcs] = lcsIndices(oldChars, newChars);

      const newCharToOldSeg = new Map<number, Segment>();
      for (let k = 0; k < newCharLcs.length; k++) {
        const oldSeg = oldCharSegs[oldCharLcs[k]!];
        if (oldSeg) {
          newCharToOldSeg.set(newCharLcs[k]!, oldSeg);
        }
      }

      for (let ci = 0; ci < newChars.length; ci++) {
        if (newCharToOldSeg.has(ci)) {
          const oldSeg = newCharToOldSeg.get(ci)!;
          segments.push({ id: oldSeg.id, string: newChars[ci]! });
        } else {
          segments.push({
            id: alloc.take(`${newWord}~${ci}`),
            string: newChars[ci]!,
          });
        }
      }
    } else if (isNum(newWord)) {
      segments.push(...segmentNumber(newWord));
    } else {
      segments.push({ id: alloc.take(newWord), string: newWord });
    }

    charOffset += newWord.length;
  }

  pushSeparators(trailingSeparators);

  return { segments, splits };
}

// ---- upstream: packages/torph/src/lib/text-morph/utils/animate.ts ----

export function animateExit(
  child: HTMLElement,
  options: {
    dx: number;
    dy: number;
    duration: number;
    ease: string;
    scale: boolean;
  },
) {
  const { dx, dy, duration, ease, scale } = options;

  child.animate(
    {
      transform: scale
        ? `translate(${dx}px, ${dy}px) scale(0.95)`
        : `translate(${dx}px, ${dy}px)`,
      offset: 1,
    },
    {
      duration,
      easing: ease,
      fill: "both",
    },
  );

  const fadeAnimation = child.animate(
    {
      opacity: 0,
      offset: 1,
    },
    {
      duration: fadeDuration(duration, 0.25),
      easing: "linear",
      fill: "both",
    },
  );

  fadeAnimation.onfinish = () => child.remove();
}

export function animateEnterOrPersist(
  child: HTMLElement,
  options: {
    deltaX: number;
    deltaY: number;
    isNew: boolean;
    duration: number;
    ease: string;
  },
) {
  const { deltaX, deltaY, isNew, duration, ease } = options;

  const prev = cancelAnimations(child);

  const startX = deltaX + prev.tx;
  const startY = deltaY + prev.ty;
  const startOpacity = isNew && prev.opacity >= 1 ? 0 : prev.opacity;

  child.animate(
    [
      {
        transform: `translate(${startX}px, ${startY}px) scale(${isNew ? 0.95 : 1})`,
      },
      { transform: "none" },
    ],
    {
      duration,
      easing: ease,
      fill: "both",
    },
  );

  if (startOpacity < 1) {
    child.animate([{ opacity: startOpacity }, { opacity: 1 }], {
      duration: fadeDuration(duration, isNew ? 0.5 : 0.25),
      delay: isNew ? fadeDuration(duration, 0.25) : 0,
      easing: "linear",
      fill: "both",
    });
  }
}

// ---- upstream: packages/torph/src/lib/text-morph/utils/number-animate.ts ----

// Shares of the morph, not fixed lengths. The outgoing share is larger because a
// digit that has already left is a hole in the number.
const EXIT_FADE = 0.45;
const ENTER_FADE = 0.25;

/**
 * The slot takes the FLIP correction, the character inside it takes the slide and
 * fade. Keeping the slide off the slot is what lets a digit cross a whole line box
 * without the next morph measuring it as moved.
 */
export function animateNumberExit(
  slot: HTMLElement,
  options: {
    dx: number;
    dy: number;
    slideDistance: number;
    duration: number;
    ease: string;
  },
) {
  const { dx, dy, slideDistance, duration, ease } = options;
  const mover = moverOf(slot);

  slot.animate(
    { transform: `translate(${dx}px, ${dy}px)`, offset: 1 },
    { duration, easing: ease, fill: "both" },
  );

  mover.animate(
    { transform: `translate(0px, ${slideDistance}px)`, offset: 1 },
    { duration, easing: ease, fill: "both" },
  );

  const fadeAnimation = mover.animate(
    { opacity: 0, offset: 1 },
    { duration: duration * EXIT_FADE, easing: "linear", fill: "both" },
  );

  // The slot goes, not just its contents.
  fadeAnimation.onfinish = () => slot.remove();
}

export function animateNumberEnter(
  slot: HTMLElement,
  options: {
    deltaX: number;
    deltaY: number;
    slideDistance: number;
    kind: "digit" | "symbol";
    duration: number;
    ease: string;
  },
) {
  const { deltaX, deltaY, slideDistance, kind, duration, ease } = options;

  animateNumberPersist(slot, { deltaX, deltaY, duration, ease });

  const mover = moverOf(slot);
  const prev = cancelAnimations(mover);

  // Digits arrive from above, separators from below, so each reads as its own event.
  const from = kind === "digit" ? -slideDistance : slideDistance;

  mover.animate(
    { transform: `translate(0px, ${prev.ty + from}px)`, offset: 0 },
    { duration, easing: ease, fill: "both" },
  );

  const startOpacity = prev.opacity >= 1 ? 0 : prev.opacity;
  if (startOpacity < 1) {
    mover.animate([{ opacity: startOpacity }, { opacity: 1 }], {
      duration: duration * ENTER_FADE,
      easing: "linear",
      fill: "both",
    });
  }
}

export function animateNumberPersist(
  slot: HTMLElement,
  options: {
    deltaX: number;
    deltaY: number;
    duration: number;
    ease: string;
  },
) {
  const { deltaX, deltaY, duration, ease } = options;

  const { tx, ty } = parseTranslate(slot);
  slot.getAnimations().forEach((a) => a.cancel());

  const startX = deltaX + tx;
  const startY = deltaY + ty;

  if (startX === 0 && startY === 0) return;

  slot.animate(
    { transform: `translate(${startX}px, ${startY}px)`, offset: 0 },
    { duration, easing: ease, fill: "both" },
  );
}

// ---- upstream: packages/torph/src/lib/text-morph/utils/replace-animate.ts ----

// Where characters moving becomes one thing swapped for another. Past this, nothing
// that survived is near enough to animate from, and the run smears.
export const GROUP_MIN = 6;

// Deeper than a character's 0.95, so the run reads as receding, not as a glyph settling.
const GROUP_SCALE = 0.8;

const GROUP_EXIT_FADE = 0.45;
const GROUP_ENTER_FADE = 0.35;

/** A run's centre, restated per member — `transform-origin` is relative to each box. */
function originsFor(elements: HTMLElement[]): string[] {
  const rects = elements.map((element) => element.getBoundingClientRect());
  const left = Math.min(...rects.map((r) => r.left));
  const right = Math.max(...rects.map((r) => r.right));
  const top = Math.min(...rects.map((r) => r.top));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  const centreX = (left + right) / 2;
  const centreY = (top + bottom) / 2;

  return rects.map((r) => `${centreX - r.left}px ${centreY - r.top}px`);
}

/** Collapses a wholly-replaced run towards its own centre and fades it out. */
export function animateGroupExit(
  elements: HTMLElement[],
  options: { duration: number; ease: string },
) {
  const { duration, ease } = options;
  const origins = originsFor(elements);

  elements.forEach((element, i) => {
    element.getAnimations().forEach((animation) => animation.cancel());
    element.style.transformOrigin = origins[i]!;

    element.animate(
      { transform: `scale(${GROUP_SCALE})`, offset: 1 },
      { duration, easing: ease, fill: "both" },
    );

    const fade = element.animate(
      { opacity: 0, offset: 1 },
      { duration: duration * GROUP_EXIT_FADE, easing: "linear", fill: "both" },
    );
    fade.onfinish = () => element.remove();
  });
}

/** The same gesture in reverse, for the run arriving in its place. */
export function animateGroupEnter(
  elements: HTMLElement[],
  options: { duration: number; ease: string },
) {
  const { duration, ease } = options;
  const origins = originsFor(elements);

  elements.forEach((element, i) => {
    const prev = cancelAnimations(element);
    element.style.transformOrigin = origins[i]!;

    element.animate(
      { transform: `scale(${GROUP_SCALE})`, offset: 0 },
      { duration, easing: ease, fill: "both" },
    );

    const startOpacity = prev.opacity >= 1 ? 0 : prev.opacity;
    element.animate([{ opacity: startOpacity }, { opacity: 1 }], {
      duration: duration * GROUP_ENTER_FADE,
      easing: "linear",
      fill: "both",
    });
  });
}

/**
 * Maximal stretches of `members` adjacent in `all`. A run broken by a survivor is no
 * replacement — that survivor is right there to move relative to.
 */
export function replacedRuns(
  all: HTMLElement[],
  members: Set<HTMLElement>,
): HTMLElement[][] {
  const runs: HTMLElement[][] = [];
  let run: HTMLElement[] = [];

  const flush = () => {
    if (run.length >= GROUP_MIN) runs.push(run);
    run = [];
  };

  for (const element of all) {
    if (members.has(element)) run.push(element);
    else flush();
  }
  flush();

  return runs;
}
