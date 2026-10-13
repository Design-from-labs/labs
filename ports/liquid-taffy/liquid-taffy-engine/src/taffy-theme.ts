"use client";

// ---- upstream: src/components/liquid/theme.ts ----
/* THE FRAME — one type, one value, for the whole family.

   The value travels by CONTEXT — the frame is a property of the stage, not
   of any one drop standing on it — and the colours travel by custom property
   (each component's `--<component>-*` tokens). A component reads both; it
   owns neither.

   Standing something on the other frame is one line, anywhere in the tree:

     <LiquidThemeProvider value="dark"><SpeedDial /></LiquidThemeProvider>

   Labs: with no provider and no `theme` prop, a surface follows the page: it
   is dark inside an element with the `dark` class (the shadcn convention, and
   the wall's dark tiles), light otherwise. */

import {
  createContext,
  type RefObject,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export type LiquidTheme = "light" | "dark";

const LiquidThemeContext = createContext<LiquidTheme | null>(null);

export const LiquidThemeProvider = LiquidThemeContext.Provider;

/* The frame this subtree is standing on, when a provider says so. */
export function useLiquidTheme(): LiquidTheme | null {
  return useContext(LiquidThemeContext);
}

/* Labs: the frame a surface stands on — its own `theme` prop, else the
   provider's, else the page's (a `.dark` ancestor), followed live. */
export function useLiquidFrame(
  rootRef: RefObject<HTMLElement | null>,
  theme?: LiquidTheme,
): LiquidTheme {
  const provided = useLiquidTheme();
  const [page, setPage] = useState<LiquidTheme>("light");

  /* A layout effect, so a surface mounting inside a dark page is dark before
     the first paint (no light frame for one tick). */
  useLayoutEffect(() => {
    if (theme || provided) {
      return;
    }
    const read = () => {
      setPage(rootRef.current?.closest(".dark") ? "dark" : "light");
    };
    read();
    /* A theme switch flips the class on the root element (or the body). */
    const observer = new MutationObserver(read);
    for (const node of [document.documentElement, document.body]) {
      observer.observe(node, { attributes: true, attributeFilter: ["class"] });
    }
    return () => observer.disconnect();
  }, [provided, rootRef, theme]);

  return theme ?? provided ?? page;
}

/* The same frame, as a ref — for the engines. They are created ONCE and live
   in refs of their own, so anything handed to them directly is frozen at the
   first render and stale the moment the frame changes; the voice asking which
   room it is speaking in has to read through something that is reassigned
   every render. This is that something. */
export function useLiquidThemeRef(frame: LiquidTheme) {
  const ref = useRef(frame);
  ref.current = frame;
  return ref;
}
