// ---- upstream: the pen's CSS panel (section, .map, .info, .close-map, .expand-map) ----
// The pen's rules, scoped under `.scroll-map` and given data-slot hooks:
//   section   -> .scroll-map       (min-height 150vh; 150 of the box's own height in a container)
//   .map      -> the rail and pane (the pane is `sticky` where the pen pinned the svg with
//                ScrollTrigger; the rail is the absolutely positioned half that opens to 100%)
//   .info     -> the content slot  (left: 50% is inset-inline-start, so right to left works)
//   .close-map -> the close button (kept inside the pane: fixed to the box, not the window)
// The pen relied on the browser's own styles for headings, paragraphs, lists,
// buttons and svg (the buttons are Arial in the pen); a utility reset (Tailwind's) removes them, so they are
// written out here for the content slot, with the values Chromium resolved for
// the pen. The pen's `html` and `body` rules (overscroll, margin, face) belong
// to the page. Colours, the dot and the callout are `--scroll-map-*` variables.
// Labs additions are marked.

export const scrollMapStyles: string = `
  .scroll-map {
    /* Labs: the height the map pane is pinned to (the pen's 100vh): the box's
       own height when the map scrolls inside a container. */
    --scroll-map-viewport: 100vh;
    position: relative;
    left: 0;
    top: 0;
    width: 100%;
    min-height: calc(var(--scroll-map-viewport) * 1.5);
    /* Labs: contain the pen's z-indexes (999, 9999) inside the map. */
    isolation: isolate;
    box-sizing: border-box;
    color: var(--scroll-map-ink, #000);
    background: var(--scroll-map-surface, #fff);
    line-height: normal;
  }

  .scroll-map[data-scroller='container'] {
    --scroll-map-viewport: 100cqh;
  }

  .scroll-map *,
  .scroll-map *::before,
  .scroll-map *::after {
    box-sizing: border-box;
  }

  /* The pen's .map: a half-width pane, pinned while the section scrolls. */
  .scroll-map [data-slot='scroll-map-rail'] {
    position: absolute;
    z-index: 999;
    inset-block: 0;
    inset-inline-start: 0;
    width: calc(var(--scroll-map-split, 50) * 1%);
    max-width: 100%;
  }

  /* The pen pinned the map at a whole number of pixels (GSAP wrote the
     rounded width); round() does the same where the browser has it. */
  @supports (width: round(50%, 1px)) {
    .scroll-map [data-slot='scroll-map-rail'] {
      width: round(calc(var(--scroll-map-split, 50) * 1%), 1px);
    }
  }

  .scroll-map [data-slot='scroll-map-pane'] {
    position: sticky;
    top: 0;
    width: 100%;
    height: var(--scroll-map-viewport);
    overflow: hidden;
  }

  .scroll-map [data-slot='scroll-map-svg'] {
    display: block;
    width: 100%;
    height: 100%;
  }

  /* The pen's .close-map, at the pane's bottom corner. */
  .scroll-map [data-slot='scroll-map-close'] {
    position: absolute;
    z-index: 9999;
    inset-inline-end: 10px;
    bottom: 10px;
    opacity: 0;
    visibility: hidden;
    padding: 0;
    border: none;
    background: none;
    color: var(--scroll-map-close, #000);
    font: 400 13.3333px / normal Arial, Helvetica, sans-serif;
    cursor: pointer;
  }

  .scroll-map [data-slot='scroll-map-close'] svg {
    display: inline;
    width: 30px;
    height: 30px;
    vertical-align: baseline;
  }

  /* The pen's .info, shifted to the other half. */
  .scroll-map [data-slot='scroll-map-content'] {
    position: relative;
    inset-inline-start: 50%;
    box-sizing: content-box;
    padding: 5%;
    width: 40%;
    font-size: 1.2rem;
  }

  .scroll-map [data-slot='scroll-map-content'] h1 {
    display: block;
    margin-block: 0.67em;
    font-size: 2em;
    font-weight: 700;
  }

  .scroll-map [data-slot='scroll-map-content'] h3 {
    display: block;
    margin-block: 1em;
    font-size: 1.17em;
    font-weight: 700;
  }

  /* h2 is the same line for a page whose headings must not skip levels. */
  .scroll-map [data-slot='scroll-map-content'] h2,
  .scroll-map [data-slot='scroll-map-content'] h4 {
    display: block;
    margin-block: 1.33em;
    font-size: 1em;
    font-weight: 700;
  }

  .scroll-map [data-slot='scroll-map-content'] b {
    font-weight: 700;
  }

  .scroll-map [data-slot='scroll-map-content'] p {
    margin-block: 3rem 1em;
    line-height: 2rem;
  }

  .scroll-map [data-slot='scroll-map-content'] .shaded {
    margin-top: 3rem;
    line-height: 2rem;
    color: var(--scroll-map-callout-ink, #fff);
    background: var(--scroll-map-callout, #223e6b);
    padding: 5px 25px;
    border-radius: 10px;
  }

  .scroll-map [data-slot='scroll-map-content'] ul {
    list-style: none;
    margin-block: 1em;
    padding: 0;
  }

  .scroll-map [data-slot='scroll-map-content'] li {
    display: list-item;
    padding-bottom: 2rem;
  }

  .scroll-map [data-slot='scroll-map-content'] svg {
    display: inline;
    box-sizing: content-box;
    width: 15px;
    padding-inline-end: 4px;
    vertical-align: baseline;
    fill: currentColor;
  }

  .scroll-map [data-slot='scroll-map-expand'] {
    display: inline-block;
    border: none;
    background: none;
    margin-top: 10px;
    padding: 5px 15px;
    border-radius: 10px;
    color: inherit;
    font: 400 1.75rem / normal Arial, Helvetica, sans-serif;
    text-transform: uppercase;
    cursor: pointer;
  }

  .scroll-map [data-slot='scroll-map-expand'] svg {
    width: 20px;
  }

  /* The browser's own focus ring, restated so a host's global rule keeps the pen's look. */
  .scroll-map button:focus-visible {
    outline-style: auto;
    outline-width: 1px;
    outline-offset: 1px;
  }

  @media (forced-colors: active) {
    .scroll-map [data-slot='scroll-map-content'] .shaded {
      outline: 1px solid CanvasText;
    }
  }
`;

/** The stylesheet, hoisted and deduplicated by React 19. */
export function ScrollMapStyles() {
  return (
    <style href="designfrom-map" precedence="default">
      {scrollMapStyles}
    </style>
  );
}
