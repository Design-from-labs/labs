// ---- upstream: the pen's CSS panel (nav, list, items and indicators) ----
// The pen's rules for its nav, line for line, scoped under `.magnet-menu`.
// Renamed (fidelity.md): the current page is `a:is([aria-current], :target)`
// (upstream: `a:target`, the URL hash; `aria-current` is added so a router
// can say it with a prop); the anchor names `--anchor` and `--target` ->
// per-instance names read from `--magnet-menu--hover-anchor` and
// `--magnet-menu--current-anchor`, so two menus on a page never share an
// anchor; `--intent` and `--transition` -> `--magnet-menu--intent` and
// `--magnet-menu--transition`; the no-anchor fallback's `--item-active-*`
// and `--target-*` -> `--magnet-menu--hover-*` and `--magnet-menu--current-*`.
// Upstream's `canvasText` and `canvas` are read through the public
// `--magnet-menu-ink` and `--magnet-menu-paper` tokens, which fall back to
// them. Labs additions are marked.

const HOVER = ":is(:focus-visible, :hover, [data-loop~='hover'], [data-loop~='focus'])";
const CURRENT = ":is([aria-current], :target)";

export const magnetMenuStyles: string = `
  /* Labs: the pen's page set line-height 1.15 (normalize.css); the menu
     keeps it so it measures the same in any host. The nav isolates its
     indicators (z-index -1) so a host background never covers them. */
  .magnet-menu {
    line-height: 1.15;
    isolation: isolate;
    --magnet-menu--ink: var(--magnet-menu-ink, canvasText);
    --magnet-menu--paper: var(--magnet-menu-paper, canvas);
  }

  .magnet-menu ul {
    display: flex;
    margin: 0;
    padding: 0;
    list-style: none;
    position: relative;
    flex-wrap: wrap;
    color: color-mix(in lch, var(--magnet-menu--ink) 50%, var(--magnet-menu--paper));
    transition: color 0.2s;
  }

  /* upstream: :root:has(.direction-handler[aria-pressed='true']) ul */
  .magnet-menu[data-orientation='vertical'] ul {
    flex-direction: column;
  }

  .magnet-menu li {
    display: grid;
    place-items: center;
    font-weight: 400;
  }

  .magnet-menu li a {
    display: inline-block;
    padding: 0.5rem 1.25rem;
    width: 100%;
    height: 100%;
    color: currentColor;
    text-decoration: none;
  }

  .magnet-menu a {
    outline-color: color-mix(in lch, var(--magnet-menu--ink), transparent 50%);
  }

  /* Labs: the browser's own focus ring (Chromium's default for a link is
     auto, 1px, offset 1px), stated so a host's :focus-visible rule cannot
     restyle it (only the color above was upstream's). */
  .magnet-menu a:focus-visible {
    outline-style: auto;
    outline-width: 1px;
    outline-offset: 1px;
  }

  .magnet-menu a${HOVER},
  .magnet-menu ul:has(a${CURRENT}${HOVER})::after {
    color: var(--magnet-menu--ink);
  }

  .magnet-menu ul:has(a${HOVER}) {
    --magnet-menu--intent: 1;
  }

  .magnet-menu ul::before,
  .magnet-menu ul::after {
    --magnet-menu--transition: 0.18s;
    content: '';
    position: absolute;
    pointer-events: none;
    opacity: var(--magnet-menu--intent, 0);
    z-index: -1;
    border-radius: 6px;
    background: var(--magnet-menu-indicator, color-mix(in lch, var(--magnet-menu--ink), var(--magnet-menu--paper) 85%));
    transition: inset var(--magnet-menu--transition), top var(--magnet-menu--transition), left var(--magnet-menu--transition),
      height var(--magnet-menu--transition), opacity var(--magnet-menu--transition), color var(--magnet-menu--transition),
      width var(--magnet-menu--transition);
    transition-timing-function: linear(
      0 0%,
      0.2342 12.49%,
      0.4374 24.99%,
      0.6093 37.49%,
      0.6835 43.74%,
      0.7499 49.99%,
      0.8086 56.25%,
      0.8593 62.5%,
      0.9023 68.75%,
      0.9375 75%,
      0.9648 81.25%,
      0.9844 87.5%,
      0.9961 93.75%,
      1 100%
    );
  }

  .magnet-menu ul::after {
    top: calc(var(--magnet-menu--current-y) * 1px);
    left: calc((var(--magnet-menu--current-x) * 1px) + 1.25rem);
    height: calc(var(--magnet-menu--current-height) * 1px);
    width: calc((var(--magnet-menu--current-width) * 1px) - 2.5rem);
    opacity: 1;
    background: transparent;
    border-radius: 0;
    border-bottom: 2px solid currentColor;
  }

  /* Targeting */
  @supports (anchor-name: --a) {
    .magnet-menu a${CURRENT} {
      anchor-name: var(--magnet-menu--current-anchor);
    }
    .magnet-menu li:has(a${HOVER}) {
      anchor-name: var(--magnet-menu--hover-anchor);
    }

    .magnet-menu ul::before {
      position-anchor: var(--magnet-menu--hover-anchor);
      inset: anchor(inside);
    }

    .magnet-menu ul::after {
      position-anchor: var(--magnet-menu--current-anchor);
      left: calc(anchor(left) + 1.25rem);
      top: anchor(top);
      width: calc(anchor-size(width) - 2.5rem);
      height: anchor-size(height);
    }
  }

  /* upstream: [data-no-anchor] ul::before. Labs: positioned in the list
     (absolute, from offsets the script measures) instead of the viewport
     (fixed), so it follows the menu when the page scrolls. */
  .magnet-menu[data-magnet-menu-fallback] ul::before {
    top: calc(var(--magnet-menu--hover-y) * 1px);
    left: calc(var(--magnet-menu--hover-x) * 1px);
    height: calc(var(--magnet-menu--hover-height) * 1px);
    width: calc(var(--magnet-menu--hover-width) * 1px);
  }

  /* Labs: reduced motion moves and fades the indicators at once. */
  @media (prefers-reduced-motion: reduce) {
    .magnet-menu ul,
    .magnet-menu ul::before,
    .magnet-menu ul::after {
      transition: none;
    }
  }

  /* Labs: contrast on request (ports/README.md). The default label color
     is upstream's 50% mix of ink over paper; more contrast raises it to 75%. */
  @media (prefers-contrast: more) {
    .magnet-menu ul {
      color: color-mix(in lch, var(--magnet-menu--ink) 75%, var(--magnet-menu--paper));
    }
  }

  /* Labs: forced colors drop the pill's background, so it is drawn as a
     Highlight outline and the links use system link colors. */
  @media (forced-colors: active) {
    .magnet-menu ul {
      color: LinkText;
    }
    .magnet-menu a${HOVER} {
      color: CanvasText;
    }
    .magnet-menu ul::before {
      forced-color-adjust: none;
      background: transparent;
      outline: 2px solid Highlight;
      outline-offset: -2px;
    }
  }
`;

/** The stylesheet, hoisted and deduplicated by React 19. */
export function MagnetMenuStyles() {
  return (
    <style href="designfrom-magnet-menu" precedence="default">
      {magnetMenuStyles}
    </style>
  );
}
