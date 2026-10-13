"use client";

import * as React from "react";

/*
 * The masked word and line splits the upstream makes with GSAP's SplitText
 * (`type: "words"` or `"lines"`, `mask`), as React markup: the same nested
 * divs (an outer mask with `overflow: clip`, an inner element that moves),
 * with the pieces aria-hidden. SplitText also puts the text in an aria-label
 * on the parent, which ARIA forbids on generic elements; here a visually
 * hidden copy carries it. Lines are found after layout, by grouping words on
 * their line box, as SplitText does.
 *
 * Ported from bnpne/page-transitions-with-webgpu-vanilla-js (the SplitText
 * calls in src/controller.js) at commit 70e5c0eafb14.
 *
 * Copyright (c) 2009 - 2025 Codrops. MIT License; the full notice ends this file.
 */

type Tag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "div" | "span";

export interface SplitProps extends React.HTMLAttributes<HTMLElement> {
  text: string;
  type: "words" | "lines";
  as?: Tag;
  /** Receives the moving pieces (words or lines) whenever they change. */
  register?: (pieces: HTMLElement[]) => void;
}

const VISUALLY_HIDDEN: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};
const MASK_WORD: React.CSSProperties = {
  position: "relative",
  display: "inline-block",
  overflow: "clip",
};
const PIECE_WORD: React.CSSProperties = {
  position: "relative",
  display: "inline-block",
};
const MASK_LINE: React.CSSProperties = {
  position: "relative",
  display: "block",
  textAlign: "start",
  overflow: "clip",
};
const PIECE_LINE: React.CSSProperties = {
  position: "relative",
  display: "block",
  textAlign: "start",
};

export function Split({
  text,
  type,
  as = "div",
  register,
  ...props
}: SplitProps) {
  const Component = as;
  const root = React.useRef<HTMLElement>(null);
  const words = React.useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const [lines, setLines] = React.useState<string[] | null>(null);
  const width = React.useRef(-1);

  // Lines: measure the words where the browser wraps them, then group.
  React.useLayoutEffect(() => {
    if (type !== "lines" || lines !== null) {
      return;
    }
    const el = root.current;
    if (!el) {
      return;
    }
    const spans = Array.from(el.querySelectorAll<HTMLElement>("[data-word]"));
    const grouped: string[][] = [];
    let top = Number.NaN;
    for (const span of spans) {
      if (span.offsetTop !== top) {
        grouped.push([]);
        top = span.offsetTop;
      }
      grouped[grouped.length - 1].push(span.textContent ?? "");
    }
    width.current = el.clientWidth;
    setLines(grouped.map((g) => g.join(" ")));
  }, [type, lines]);

  // Re-split lines when the width changes (SplitText's autoSplit).
  React.useEffect(() => {
    if (type !== "lines") {
      return;
    }
    const el = root.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(() => {
      if (el.clientWidth !== width.current && width.current >= 0) {
        setLines(null);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [type]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: hand the pieces over after each split.
  React.useLayoutEffect(() => {
    const el = root.current;
    if (!el || !register) {
      return;
    }
    register(Array.from(el.querySelectorAll<HTMLElement>("[data-piece]")));
  }, [lines, words, register]);

  let children: React.ReactNode;
  if (type === "words") {
    children = words.map((word, i) => (
      <React.Fragment key={`${word}-${i}`}>
        {i > 0 ? " " : null}
        <div aria-hidden="true" style={MASK_WORD}>
          <div aria-hidden="true" data-piece="" style={PIECE_WORD}>
            {word}
          </div>
        </div>
      </React.Fragment>
    ));
  } else if (lines === null) {
    // The measuring pass: plain words that wrap as the text would.
    children = words.map((word, i) => (
      <React.Fragment key={`${word}-${i}`}>
        {i > 0 ? " " : null}
        <span data-word="">{word}</span>
      </React.Fragment>
    ));
  } else {
    children = lines.map((line, i) => (
      <div key={`${line}-${i}`} aria-hidden="true" style={MASK_LINE}>
        <div aria-hidden="true" data-piece="" style={PIECE_LINE}>
          {line}
        </div>
      </div>
    ));
  }

  return (
    <Component ref={root as React.Ref<never>} {...props}>
      <span style={VISUALLY_HIDDEN}>{text}</span>
      {children}
    </Component>
  );
}
