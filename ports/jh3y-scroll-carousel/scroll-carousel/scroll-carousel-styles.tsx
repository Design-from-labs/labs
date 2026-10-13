// ---- upstream: the pen's CSS panel (container, carousel, controller) ----
// The pen's rules, scoped under `.scroll-carousel` and renamed so nothing
// leaks: its page-wide `ul`, `li`, `img` and `h1` rules become part
// selectors; `main`, `body` and the page backdrop belong to the host; the
// custom properties the pen set on `html` (`--gap-efficient`,
// `--rotate-x`, `--rotate-z`, `--mask-lower`, `--mask-upper`,
// `--scroll-ratio`, `--perspective`) and the ones it computed on
// `.container` (`--total`, `--inner-angle`, `--item-width`, `--scroll-buff`,
// `--gap`, `--radius`) are now `--scroll-carousel--*`; `--controller` is
// `--scroll-carousel-timeline`; the `carousel` keyframes are
// `scroll-carousel-turn`; `vmin`, `50vw` and `50svh` are `cqmin`, `50cqw`
// and `50cqh` of the component's own box, which is the viewport when it
// fills the page. The `data-*` switches of the pen's `html` sit on the root.
// Labs additions are marked.

export const scrollCarouselStyles: string = `
  .scroll-carousel {
    --scroll-carousel--scroll-padding: 0px;
    --scroll-carousel--inner-angle: calc((360 / var(--scroll-carousel--total)) * 1deg);
    --scroll-carousel--item-width: var(--scroll-carousel-item-size, clamp(120px, 20cqmin, 12rem));
    --scroll-carousel--scroll-buff: calc(var(--scroll-carousel--item-width) * var(--scroll-carousel--ratio));
    --scroll-carousel--gap-size: calc(var(--scroll-carousel--item-width) * var(--scroll-carousel--gap, 0.1));
    --scroll-carousel--radius: calc(((var(--scroll-carousel--item-width) + var(--scroll-carousel--gap-size)) / sin(var(--scroll-carousel--inner-angle))) * -1);
    /* Labs: the box the cq units above measure. */
    container-type: size;
    box-sizing: border-box;
    position: relative;
    width: 100%;
    height: 100%;
    overflow: auto;
    timeline-scope: --scroll-carousel-timeline;
    /* Labs: the pen's page set line-height 1.15 (normalize.css). */
    line-height: 1.15;
  }

  .scroll-carousel *,
  .scroll-carousel *::before,
  .scroll-carousel *::after {
    box-sizing: border-box;
  }

  .scroll-carousel[data-scheme='dark'] {
    color-scheme: dark only;
  }

  .scroll-carousel[data-scheme='light'] {
    color-scheme: light only;
  }

  .scroll-carousel[data-infinite='true'] {
    --scroll-carousel--scroll-padding: 5px;
  }

  .scroll-carousel ul {
    list-style-type: none;
    padding: 0;
    margin: 0;
    display: grid;
  }

  .scroll-carousel img {
    border-radius: 12px;
    width: 100%;
    height: 100%;
    background-color: color-mix(in lch, canvasText 25%, canvas);
  }

  .scroll-carousel [data-slot='scroll-carousel-hint'] {
    position: absolute;
    inset-block-end: 1rem;
    inset-inline-end: 1rem;
    margin: 0.67em 0;
    font-size: 2em;
    font-weight: bold;
    line-height: 1.15;
    color: color-mix(in lch, canvasText, transparent);
    pointer-events: none;
  }

  .scroll-carousel [data-slot='scroll-carousel-ring'] {
    padding: 0;
    display: flex;
    width: 100%;
    height: 100%;
    position: absolute;
    left: 50%;
    top: 50%;
    translate: -50% -50%;
    transform-style: preserve-3d;
    transform: translate3d(0, 0, var(--scroll-carousel--radius)) rotateX(calc(var(--scroll-carousel--rotate-x) * 1deg)) rotateZ(calc(var(--scroll-carousel--rotate-z) * 1deg)) rotateY(0deg);
  }

  .scroll-carousel [data-slot='scroll-carousel-stage'] {
    height: 100%;
    width: 100%;
    -webkit-mask: linear-gradient(
      calc(90deg + (var(--scroll-carousel--rotate-z) * 1deg)),
      transparent 0 calc(50% - (var(--scroll-carousel--item-width) * var(--scroll-carousel--mask-upper))),
      white calc(50% - (var(--scroll-carousel--mask-lower) * var(--scroll-carousel--item-width))) calc(50% + (var(--scroll-carousel--mask-lower) * var(--scroll-carousel--item-width))),
      transparent calc(50% + (var(--scroll-carousel--mask-upper) * var(--scroll-carousel--item-width))) 100%
    );
            mask: linear-gradient(
      calc(90deg + (var(--scroll-carousel--rotate-z) * 1deg)),
      transparent 0 calc(50% - (var(--scroll-carousel--item-width) * var(--scroll-carousel--mask-upper))),
      white calc(50% - (var(--scroll-carousel--mask-lower) * var(--scroll-carousel--item-width))) calc(50% + (var(--scroll-carousel--mask-lower) * var(--scroll-carousel--item-width))),
      transparent calc(50% + (var(--scroll-carousel--mask-upper) * var(--scroll-carousel--item-width))) 100%
    );
    pointer-events: none;
    position: absolute;
    display: grid;
    place-items: center;
    inset: 0;
    transform-style: preserve-3d;
    perspective: calc(var(--scroll-carousel--perspective) * 1px);
    overflow: hidden;
  }

  /* upstream: [data-animate="true"] .carousel (no scroll drive: it turns by itself) */
  .scroll-carousel[data-animate='true'][data-scroll-driven='false'] [data-slot='scroll-carousel-ring'] {
    animation: scroll-carousel-turn calc(var(--scroll-carousel--total) * 0.5s) infinite linear;
  }

  @keyframes scroll-carousel-turn {
    to {
      transform: translate3d(0, 0, var(--scroll-carousel--radius)) rotateX(calc(var(--scroll-carousel--rotate-x) * 1deg)) rotateZ(calc(var(--scroll-carousel--rotate-z) * 1deg)) rotateY(-360deg);
    }
  }

  /* upstream: [data-scroll="true"] .carousel inside @supports (animation-timeline: scroll()) */
  @supports (animation-timeline: scroll()) {
    .scroll-carousel[data-animate='true'][data-scroll-driven='true']:not([data-script-driver]) [data-slot='scroll-carousel-ring'] {
      animation-name: scroll-carousel-turn;
      animation-duration: auto;
      animation-timing-function: linear;
      animation-iteration-count: 1;
      animation-fill-mode: both;
      animation-timeline: --scroll-carousel-timeline;
    }
  }

  /* Labs: where the browser lacks scroll-driven animations the pen turned
     the ring with a GSAP ScrollTrigger tween. Here a scroll listener writes
     the scroller's progress and the ring turns with it, the same rotation
     the keyframes make. */
  .scroll-carousel[data-script-driver] [data-slot='scroll-carousel-ring'] {
    will-change: transform;
    transform: translate3d(0, 0, var(--scroll-carousel--radius)) rotateX(calc(var(--scroll-carousel--rotate-x) * 1deg)) rotateZ(calc(var(--scroll-carousel--rotate-z) * 1deg)) rotateY(calc(var(--scroll-carousel--progress, 0) * -360deg));
  }

  .scroll-carousel [data-slot='scroll-carousel-ring'] li {
    height: var(--scroll-carousel--item-width);
    width: var(--scroll-carousel--item-width);
    outline-offset: 2px;
    position: absolute;
    top: 50%;
    left: 50%;
    -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
    transform:
      translate(-50%, -50%)
      rotateY(calc((var(--scroll-carousel--inner-angle) * var(--scroll-carousel--index))))
      translate3d(0, 0, calc(var(--scroll-carousel--radius) * -1));
  }

  .scroll-carousel[data-backface='true'] [data-slot='scroll-carousel-ring'] li {
    -webkit-backface-visibility: visible;
            backface-visibility: visible;
  }

  .scroll-carousel [data-slot='scroll-carousel-scroller'] {
    display: flex;
    overflow: auto;
    width: 100%;
    height: 100%;
    -ms-scroll-snap-type: x mandatory;
        scroll-snap-type: x mandatory;
    scroll-timeline: --scroll-carousel-timeline inline;
    align-items: center;
    padding-inline: calc((50cqw + var(--scroll-carousel--scroll-padding)) - (var(--scroll-carousel--scroll-buff) * 0.5));
  }

  .scroll-carousel[data-vertical='true'] [data-slot='scroll-carousel-scroller'] {
    flex-direction: column;
    -ms-scroll-snap-type: y mandatory;
        scroll-snap-type: y mandatory;
    scroll-timeline: --scroll-carousel-timeline;
    padding-inline: 0;
    padding-block: calc((50cqh + var(--scroll-carousel--scroll-padding)) - (var(--scroll-carousel--scroll-buff) * 0.5));
  }

  .scroll-carousel [data-slot='scroll-carousel-step'] {
    height: var(--scroll-carousel--scroll-buff);
    width: var(--scroll-carousel--scroll-buff);
    aspect-ratio: 1;
    flex: 1 0 auto;
    scroll-snap-align: center;
  }

  /* Labs: a visible focus ring for the keyboard-reachable scroller. */
  .scroll-carousel [data-slot='scroll-carousel-scroller']:focus-visible,
  .scroll-carousel [data-slot='scroll-carousel-strip']:focus-visible {
    outline: 2px solid color-mix(in lch, canvasText 70%, transparent);
    outline-offset: -4px;
  }

  /* Labs: reduced motion. The ring does not turn; the component renders a
     flat strip of the same images that scrolls natively instead
     (nothing is linked to the scroll position). This rule covers the first
     paint, before the preference is read. */
  @media (prefers-reduced-motion: reduce) {
    .scroll-carousel [data-slot='scroll-carousel-ring'] {
      animation: none;
    }
  }

  .scroll-carousel [data-slot='scroll-carousel-strip'] {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    overflow: auto;
    scroll-snap-type: x mandatory;
    padding-inline: calc(50cqw - (var(--scroll-carousel--item-width) / 2));
  }

  .scroll-carousel[data-vertical='true'] [data-slot='scroll-carousel-strip'] {
    flex-direction: column;
    justify-content: flex-start;
    scroll-snap-type: y mandatory;
    padding-inline: 0;
    padding-block: calc(50cqh - (var(--scroll-carousel--item-width) / 2));
  }

  .scroll-carousel [data-slot='scroll-carousel-strip'] ul {
    display: flex;
    flex-direction: inherit;
    gap: var(--scroll-carousel--gap-size);
  }

  .scroll-carousel[data-vertical='true'] [data-slot='scroll-carousel-strip'] ul {
    flex-direction: column;
  }

  .scroll-carousel [data-slot='scroll-carousel-strip'] li {
    flex: none;
    width: var(--scroll-carousel--item-width);
    height: var(--scroll-carousel--item-width);
    scroll-snap-align: center;
  }
`;

/** The stylesheet, hoisted and deduplicated by React 19. */
export function ScrollCarouselStyles() {
  return (
    <style href="designfrom-scroll-carousel" precedence="default">
      {scrollCarouselStyles}
    </style>
  );
}
