// ---- upstream: src/player/styles.ts ----
// Upstream's shadow-root stylesheet, line for line. Renamed (fidelity.md):
// classes, keyframes and data attributes sp- -> video-player-, custom
// properties --sp- (and --space, --white, ...) -> --video-player--. The :host rule is
// the .video-player root; its box (position, size, aspect ratio, overflow,
// background) is Tailwind classes on the root element instead, so a className
// can override it. The themable values read the public --video-player-*
// tokens with upstream's values as fallbacks. Labs additions are marked.
import { DEFAULT_ASPECT_RATIO } from "./video-player-media";

export const videoPlayerStyles: string = `
  .video-player {
    --video-player--aspect-ratio: ${DEFAULT_ASPECT_RATIO};
    --video-player--space: 4px;
    --video-player--white: var(--video-player-foreground, #fff);
    --video-player--black: #000;
    --video-player--white-rgb: 255 255 255;
    --video-player--overlay-soft: var(--video-player-overlay, rgb(0 0 0 / 0.42));
    --video-player--overlay-blur: var(--video-player-overlay-blur, 0px);
    --video-player--glass-surface: var(--video-player-glass-surface, rgb(255 255 255 / 0.04));
    --video-player--glass-opacity: var(--video-player-glass-opacity, 0.28);
    --video-player--control-glass-surface: var(--video-player-control-glass-surface, rgb(255 255 255 / 0.12));
    --video-player--control-glass-opacity: var(--video-player-control-glass-opacity, 0.62);
    --video-player--control-hover-surface: var(--video-player-control-hover-surface, rgb(255 255 255 / 0.14));
    --video-player--glass-filter: var(--video-player-glass-filter, invert(1) grayscale(1));
    --video-player--shimmer-highlight: var(--video-player-shimmer-highlight, rgb(255 255 255 / 0.42));
    /* Labs: the focus ring color, a token. */
    --video-player--focus-ring: var(--video-player-focus-ring, rgb(255 255 255 / 0.92));
    --video-player--control-tray-display: block;
    --video-player--enabled-controls-count: 3;
    --video-player--control-tray-width: 0px;
    --video-player--control-tray-expanded-width: calc((var(--video-player--control-slot-size) * var(--video-player--enabled-controls-count)) + (var(--video-player--control-tray-padding) * 2));
    --video-player--control-tray-gap: 0px;
    --video-player--control-icon-size: 20px;
    --video-player--control-icon-render-size: 20px;
    --video-player--control-icon-opacity: 0.82;
    --video-player--control-icon-hidden-opacity: 0;
    --video-player--control-icon-hidden-transform: translateY(2px) scale(0.84);
    --video-player--control-icon-hover-opacity: 0.96;
    --video-player--control-icon-stroke-width: 1.6;
    --video-player--control-icon-delay-1: 30ms;
    --video-player--control-icon-delay-2: 55ms;
    --video-player--control-icon-delay-3: 80ms;
    --video-player--control-hover-opacity: 1;
    --video-player--control-slot-hover-surface: transparent;
    --video-player--control-tray-padding: 2px;
    --video-player--control-slot-size: calc(var(--video-player--control-icon-size) + 4px);
    --video-player--touch-control-hover-offset: -9999px;
    --video-player--volume-level: 100%;

    /* position, display, width, aspect-ratio, isolation, overflow, contain
       and background: Tailwind classes on the root (video-player.tsx). */
  }

  .video-player *,
  .video-player *::before,
  .video-player *::after {
    box-sizing: border-box;
  }

  .video-player-video {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    object-fit: cover;
  }

  .video-player-asset {
    pointer-events: none;
    opacity: 0;
    transition: opacity 160ms ease;
    user-select: none;
    -webkit-user-select: none;
    -webkit-user-drag: none;
    -webkit-touch-callout: none;
  }

  .video-player-player.has-visible-frame .video-player-asset {
    opacity: 1;
  }

  .video-player-player {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    min-width: 100%;
    min-height: 100%;
    overflow: hidden;
    --video-player--progress-inset: 100%;
    --video-player--hover-fill-inset: 100%;
    --video-player--scrub-preview-left: 0px;
    --video-player--return-marker-left: 0px;
    --video-player--return-marker-base-opacity: 1;
    --video-player--return-marker-hole-left: -9999px;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
    font-variant-numeric: tabular-nums;
  }

  .video-player-player:fullscreen {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    min-width: 100vw;
    min-height: 100vh;
    background: var(--video-player-background, #1E1E1E);
  }

  .video-player-player:-webkit-full-screen {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    min-width: 100vw;
    min-height: 100vh;
    background: var(--video-player-background, #1E1E1E);
  }

  .video-player-overlay {
    position: absolute;
    inset: 0;
    z-index: 2;
    width: 100%;
    height: 100%;
    pointer-events: none;
    background-color: var(--video-player--overlay-soft);
    backdrop-filter: blur(var(--video-player--overlay-blur));
    -webkit-backdrop-filter: blur(var(--video-player--overlay-blur));
    opacity: 0;
    transition: opacity 260ms ease;
    transform: translateZ(0);
  }

  @media (hover: hover) and (pointer: fine) {
    .video-player[data-pause-on-overlay-click] .video-player-overlay {
      pointer-events: auto;
      cursor: pointer;
    }
  }

  .video-player-player.is-pointer-active .video-player-overlay,
  .video-player-player.is-controls-visible .video-player-overlay {
    opacity: 1;
  }

  .video-player-player.is-loading:not(.has-loaded-once).is-pointer-active .video-player-overlay,
  .video-player-player.is-loading:not(.has-loaded-once).is-controls-visible .video-player-overlay {
    opacity: 0;
  }

  .video-player-player.is-loading:not(.has-loaded-once) .video-player-button {
    opacity: 0;
    pointer-events: none;
  }

  .video-player-button {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 3;
    display: grid;
    place-items: center;
    width: 60px;
    height: 60px;
    padding: 0;
    border: 0;
    border-radius: 0;
    color: var(--video-player--white);
    background: transparent;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transform: translate(-50%, -50%) scale(0.96);
    transition: opacity 260ms ease, transform 260ms cubic-bezier(0.23, 1, 0.32, 1);
    -webkit-tap-highlight-color: transparent;
  }

  .video-player-player.is-pointer-active .video-player-button,
  .video-player-player.is-controls-visible .video-player-button,
  .video-player-player.is-playback-pulsing .video-player-button {
    opacity: 1;
    pointer-events: auto;
    transform: translate(-50%, -50%) scale(1);
  }

  .video-player-player.is-playback-pulsing .video-player-button {
    pointer-events: none;
  }

  .video-player-player.is-scrubbing .video-player-button,
  .video-player-player.is-loading:not(.has-loaded-once).is-pointer-active .video-player-button,
  .video-player-player.is-loading:not(.has-loaded-once).is-controls-visible .video-player-button {
    opacity: 0;
    pointer-events: none;
  }

  .video-player-button:focus {
    outline: 0;
  }

  .video-player-player:focus {
    outline: 0;
  }

  .video-player-icon {
    grid-area: 1 / 1;
    position: relative;
    z-index: 1;
    display: block;
    overflow: visible;
    transition: opacity 160ms ease, transform 220ms cubic-bezier(0.23, 1, 0.32, 1);
  }

  .video-player-icon--play {
    width: 54px;
    height: 60px;
    opacity: 1;
    transform: translate(4px, 0) rotate(0deg) scale(1);
  }

  .video-player-icon--pause {
    width: 54px;
    height: 60px;
    opacity: 0;
    transform: translate(0, 0) rotate(-70deg) scale(0.72);
  }

  .video-player-player.is-playing .video-player-icon--play {
    opacity: 0;
    transform: translate(4px, 0) rotate(70deg) scale(0.72);
  }

  .video-player-player.is-playing .video-player-icon--pause {
    opacity: 1;
    transform: translate(0, 0) rotate(0deg) scale(1);
  }

  .video-player-progress-cluster {
    position: absolute;
    top: calc(100% - 28px);
    left: 50%;
    z-index: 4;
    display: block;
    width: calc(100% - (var(--video-player--space) * 8));
    height: 28px;
    --video-player--progress-height: 4px;
    transform: translateX(-50%);
    transition:
      top 360ms cubic-bezier(0.23, 1, 0.32, 1),
      width 360ms cubic-bezier(0.23, 1, 0.32, 1),
      height 360ms cubic-bezier(0.23, 1, 0.32, 1),
      transform 360ms cubic-bezier(0.23, 1, 0.32, 1);
  }

  .video-player-progress {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
    height: 28px;
    cursor: pointer;
    touch-action: none;
  }

  .video-player-player.is-loading:not(.has-loaded-once) .video-player-progress-cluster {
    top: 50%;
    left: 50%;
    width: min(148px, calc(100% - (var(--video-player--space) * 12)));
    height: 20px;
    --video-player--progress-height: 4px;
    transform: translate(-50%, -50%);
  }

  .video-player-progress-surface,
  .video-player-progress-fill {
    position: absolute;
    bottom: calc(var(--video-player--space) * 2);
    left: 0;
    height: var(--video-player--progress-height);
    border-radius: 3px;
    transition: height 180ms ease, opacity 120ms ease;
  }

  .video-player-progress-surface {
    right: 0;
    bottom: calc((var(--video-player--space) * 2) - 2px);
    z-index: 0;
    height: calc(var(--video-player--progress-height) + 4px);
    border-radius: 5px;
    background: var(--video-player--glass-surface);
    opacity: var(--video-player--glass-opacity);
    overflow: hidden;
    backdrop-filter: var(--video-player--glass-filter);
    -webkit-backdrop-filter: var(--video-player--glass-filter);
    transform: translateZ(0);
  }

  .video-player-progress-surface::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    border-radius: inherit;
    background: linear-gradient(90deg, transparent 0%, var(--video-player--shimmer-highlight) 46%, transparent 100%);
    transform: translateX(-120%);
  }

  .video-player-player.is-loading .video-player-progress-surface::after {
    opacity: 1;
    animation: video-player-progress-shimmer 1.35s ease-in-out infinite;
  }

  .video-player-player.is-loading.has-loaded-once .video-player-progress-surface {
    opacity: 0.48;
  }

  .video-player-player.is-loading:not(.has-loaded-once) .video-player-progress-surface {
    background: rgb(255 255 255 / 0.08);
    opacity: 1;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .video-player-player.is-loading:not(.has-loaded-once) .video-player-progress-fill,
  .video-player-player.is-progress-settling .video-player-progress-fill {
    opacity: 0;
  }

  .video-player-progress-cluster:has(.video-player-progress:hover),
  .video-player-player.is-scrubbing .video-player-progress-cluster {
    --video-player--progress-height: 14px;
  }

  .video-player-player.is-loading:not(.has-loaded-once) .video-player-progress-cluster:has(.video-player-progress:hover) {
    --video-player--progress-height: 4px;
  }

  .video-player-control-tray {
    position: absolute;
    display: var(--video-player--control-tray-display);
    inset-inline-end: 0;
    bottom: calc(((var(--video-player--space) * 2) - 2px) + var(--video-player--progress-height) + 8px);
    z-index: 3;
    width: var(--video-player--control-tray-expanded-width);
    height: calc(var(--video-player--control-slot-size) + (var(--video-player--control-tray-padding) * 2));
    opacity: 0;
    pointer-events: none;
    filter: blur(0.8px);
    transform: translateY(4px) scale(0.96);
    transform-origin: right bottom;
    transition:
      bottom 180ms ease,
      width 360ms cubic-bezier(0.23, 1, 0.32, 1),
      height 360ms cubic-bezier(0.23, 1, 0.32, 1),
      opacity 220ms ease,
      filter 260ms ease,
      transform 300ms cubic-bezier(0.18, 0.9, 0.22, 1);
  }

  .video-player-player.is-pointer-active .video-player-control-tray,
  .video-player-player.is-controls-visible .video-player-control-tray {
    opacity: 1;
    pointer-events: auto;
    filter: blur(0);
    transform: translateY(0) scale(1);
  }

  .video-player-control-tray::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 5px;
    background: var(--video-player--control-glass-surface);
    opacity: var(--video-player--control-glass-opacity);
    overflow: hidden;
    backdrop-filter: var(--video-player--glass-filter);
    -webkit-backdrop-filter: var(--video-player--glass-filter);
    box-shadow: inset 0 0 0 1px rgb(var(--video-player--white-rgb) / 0.08);
    transform: translateZ(0);
    transition: height 180ms ease, opacity 120ms ease;
  }

  .video-player-control-tray-slots {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 0;
    height: 100%;
    box-sizing: border-box;
    padding: var(--video-player--control-tray-padding);
    border-radius: 5px;
    overflow: visible;
    opacity: 1;
    transition: height 180ms ease;
  }

  .video-player-control-tray-slots::before {
    content: '';
    position: absolute;
    top: var(--video-player--control-tray-padding);
    inset-inline-start: var(--video-player--control-tray-padding);
    z-index: 0;
    width: var(--video-player--control-slot-size);
    height: var(--video-player--control-slot-size);
    border-radius: 3px;
    background: var(--video-player--control-hover-surface);
    opacity: 0;
    pointer-events: none;
    transform: translateX(var(--video-player--control-hover-offset, 0px));
    transition:
      opacity 120ms ease,
      transform 240ms cubic-bezier(0.18, 0.9, 0.22, 1);
  }

  @media (hover: hover) and (pointer: fine) {
  .video-player-player:not(.is-hover-disabled) .video-player-control-tray-slots:has(.video-player-control-button:hover, .video-player-volume-slot:hover)::before {
      opacity: var(--video-player--control-hover-opacity);
      transition:
        opacity 80ms ease 120ms,
        transform 160ms cubic-bezier(0.18, 0.9, 0.22, 1);
    }
}

  .video-player-control-tray-slots:has(.video-player-control-button.is-control-tap-active)::before {
    opacity: var(--video-player--control-hover-opacity);
    transform: translateX(var(--video-player--touch-control-hover-offset));
    transition:
      opacity 80ms ease,
      transform 160ms cubic-bezier(0.18, 0.9, 0.22, 1);
  }

  @media (hover: hover) and (pointer: fine) {
  .video-player-control-tray-slots:not(:has(.video-player-control-button:hover, .video-player-volume-slot:hover))::before {
      transition:
        opacity 100ms ease,
        transform 0ms linear 100ms;
    }
}

  .video-player-control-button {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    aspect-ratio: 1 / 1;
    width: var(--video-player--control-slot-size);
    min-width: 0;
    height: var(--video-player--control-slot-size);
    border: 0;
    border-radius: 3px;
    color: var(--video-player--white);
    background: transparent;
    padding: 0;
    cursor: pointer;
    transition: background-color 150ms ease, color 150ms ease;
  }

  .video-player-control-button:focus {
    outline: 0;
  }

  .video-player-control-button:disabled {
    opacity: 1;
  }

  @media (hover: hover) and (pointer: fine) {
  .video-player-player:not(.is-hover-disabled) :is(.video-player-control-button:hover, .video-player-volume-slot:hover > .video-player-control-button) {
      background: var(--video-player--control-slot-hover-surface);
    }
}

  .video-player-player:not(.has-volume-control) [data-video-player-volume-control],
  .video-player-player:not(.has-picture-in-picture-control) [data-video-player-picture-in-picture-control],
  .video-player-player:not(.has-fullscreen-control) [data-video-player-fullscreen-control] {
    display: none;
  }

  .video-player-player.is-volume-unavailable [data-video-player-volume-control],
  .video-player-player.is-volume-unavailable [data-video-player-volume-control] > .video-player-control-button {
    cursor: default;
    pointer-events: auto;
  }

  .video-player-player.is-volume-unavailable .video-player-volume-icon {
    transition: none;
  }

  .video-player-player.is-volume-unavailable [data-video-player-volume-control]:hover > .video-player-control-button {
    background: transparent;
  }

  .video-player-player.is-volume-unavailable [data-video-player-volume-control]:hover .video-player-control-icon,
  .video-player-player.is-volume-unavailable [data-video-player-volume-control] > .video-player-control-button.is-control-tap-active .video-player-control-icon {
    opacity: var(--video-player--control-icon-opacity);
    transform: translateY(0) scale(1);
  }

  .video-player-player.is-volume-unavailable .video-player-control-tray-slots:has([data-video-player-volume-control]:hover)::before,
  .video-player-player.is-volume-unavailable .video-player-control-tray-slots:has([data-video-player-volume-control] > .video-player-control-button.is-control-tap-active)::before {
    opacity: 0;
  }

  @media (hover: hover) and (pointer: fine) {
  .video-player-player:not(.is-hover-disabled) :is(.video-player-control-button:hover, .video-player-volume-slot:hover > .video-player-control-button) .video-player-control-icon {
      opacity: var(--video-player--control-icon-hover-opacity);
      transform: translateY(0) scale(1);
    }
}

  .video-player-control-button.is-control-tap-active .video-player-control-icon {
    opacity: var(--video-player--control-icon-hover-opacity);
    transform: translateY(0) scale(1);
  }

  .video-player-control-icon {
    display: block;
    width: var(--video-player--control-icon-render-size);
    height: var(--video-player--control-icon-render-size);
    color: currentColor;
    overflow: visible;
    opacity: var(--video-player--control-icon-hidden-opacity);
    transform: var(--video-player--control-icon-hidden-transform);
    transition:
      opacity 180ms ease,
      transform 280ms cubic-bezier(0.18, 0.9, 0.22, 1);
    transition-delay: 0ms;
  }

  .video-player-control-icon [stroke] {
    stroke-width: var(--video-player--control-icon-stroke-width);
  }

  .video-player-volume-icon,
  .video-player-player.is-volume-muted .video-player-volume-icon--muted {
    display: none;
  }

  .video-player-player.is-volume-sound .video-player-volume-icon--sound,
  .video-player-player.is-volume-muted .video-player-volume-icon--muted {
    display: block;
  }

  .video-player-player.is-volume-icon-animating .video-player-volume-icon {
    animation: video-player-volume-icon-swap 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .video-player-volume-popover {
    position: absolute;
    inset-inline-start: 0;
    bottom: calc(var(--video-player--control-slot-size) + var(--video-player--control-tray-padding) + 4px);
    z-index: -1;
    display: grid;
    place-items: center;
    width: var(--video-player--control-slot-size);
    height: 76px;
    border-radius: 5px;
    opacity: 0;
    pointer-events: none;
    filter: blur(0.8px);
    transform: translateY(8px) scale(0.98);
    transform-origin: center bottom;
    transition:
      opacity 140ms ease,
      filter 180ms ease,
      transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  /* Labs: the volume slot wraps the button and its popover (a slider must
     not sit inside a button); it takes the button's slot box. */
  .video-player-volume-slot {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    width: var(--video-player--control-slot-size);
    height: var(--video-player--control-slot-size);
  }

  .video-player-volume-slot::after {
    content: '';
    position: absolute;
    right: 0;
    bottom: 100%;
    left: 0;
    height: calc(var(--video-player--control-tray-padding) + 4px);
    z-index: 5;
    pointer-events: auto;
  }

  .video-player-volume-slot.is-volume-open .video-player-volume-popover,
  .video-player-volume-popover.is-scrubbing-volume {
    z-index: 4;
    opacity: 1;
    pointer-events: auto;
    filter: blur(0);
    transform: translateY(0) scale(1);
    transition:
      opacity 150ms ease,
      filter 220ms ease,
      transform 260ms cubic-bezier(0.18, 0.9, 0.22, 1);
  }

  .video-player-player.is-volume-unavailable .video-player-volume-slot.is-volume-open .video-player-volume-popover,
  .video-player-player:not(.has-volume-slider-control) .video-player-volume-slot.is-volume-open .video-player-volume-popover,
  .video-player-player.is-volume-unavailable .video-player-volume-popover.is-scrubbing-volume {
    opacity: 0;
    pointer-events: none;
  }

  .video-player-volume-track {
    position: relative;
    z-index: 1;
    width: var(--video-player--control-slot-size);
    height: 76px;
    border-radius: 5px;
    background: var(--video-player--control-glass-surface);
    overflow: hidden;
    touch-action: none;
    cursor: ns-resize;
    backdrop-filter: var(--video-player--glass-filter);
    -webkit-backdrop-filter: var(--video-player--glass-filter);
    box-shadow: inset 0 0 0 1px rgb(var(--video-player--white-rgb) / 0.08);
    transform: translateZ(0);
  }

  .video-player-volume-fill {
    position: absolute;
    right: 2px;
    bottom: 2px;
    left: 2px;
    height: max(0px, calc(var(--video-player--volume-level) - 4px));
    min-height: 0;
    border-radius: 3px;
    background: var(--video-player--white);
    opacity: 1;
    transition: height 220ms cubic-bezier(0.23, 1, 0.32, 1);
  }

  .video-player-fullscreen-icon,
  .video-player-player.is-fullscreen .video-player-fullscreen-icon--enter,
  .video-player-player:not(.is-fullscreen) .video-player-fullscreen-icon--exit {
    display: none;
  }

  .video-player-player:not(.is-fullscreen) .video-player-fullscreen-icon--enter,
  .video-player-player.is-fullscreen .video-player-fullscreen-icon--exit {
    display: block;
  }

  .video-player-player.is-pointer-active .video-player-control-icon,
  .video-player-player.is-controls-visible .video-player-control-icon {
    opacity: var(--video-player--control-icon-opacity);
    transform: translateY(0) scale(1);
  }

  .video-player-player.is-pointer-active .video-player-control-button:nth-child(1) .video-player-control-icon,
  .video-player-player.is-controls-visible .video-player-control-button:nth-child(1) .video-player-control-icon {
    transition-delay: var(--video-player--control-icon-delay-1);
  }

  .video-player-player.is-pointer-active .video-player-control-button:nth-child(2) .video-player-control-icon,
  .video-player-player.is-controls-visible .video-player-control-button:nth-child(2) .video-player-control-icon {
    transition-delay: var(--video-player--control-icon-delay-2);
  }

  .video-player-player.is-pointer-active .video-player-control-button:nth-child(3) .video-player-control-icon,
  .video-player-player.is-controls-visible .video-player-control-button:nth-child(3) .video-player-control-icon {
    transition-delay: var(--video-player--control-icon-delay-3);
  }

  .video-player-player.is-loading:not(.has-loaded-once) .video-player-control-tray,
  .video-player-player.is-progress-settling .video-player-control-tray {
    opacity: 0;
    pointer-events: none;
    filter: blur(0.8px);
    transform: translateY(4px) scale(0.96);
  }

  .video-player-player.has-controls-collision .video-player-control-tray {
    opacity: 0;
    pointer-events: none;
    filter: blur(1.4px);
    transform: translateY(-2px) scale(0.985);
  }

  .video-player-progress-fill {
    display: block;
    z-index: 1;
    left: 2px;
    right: 2px;
    background: var(--video-player--white);
    border-radius: 3px;
    clip-path: inset(0 var(--video-player--progress-inset) 0 0 round 3px);
    -webkit-mask:
      linear-gradient(var(--video-player--black) 0 0),
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2 14' preserveAspectRatio='none'%3E%3Crect width='2' height='14' rx='1' fill='black'/%3E%3C/svg%3E") var(--video-player--return-marker-hole-left) 50% / 2px max(1px, calc(var(--video-player--progress-height) - 3px)) no-repeat;
    -webkit-mask-composite: xor;
    mask:
      linear-gradient(var(--video-player--black) 0 0),
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2 14' preserveAspectRatio='none'%3E%3Crect width='2' height='14' rx='1' fill='black'/%3E%3C/svg%3E") var(--video-player--return-marker-hole-left) 50% / 2px max(1px, calc(var(--video-player--progress-height) - 3px)) no-repeat;
    mask-composite: exclude;
    transform: translateZ(0);
    will-change: clip-path;
  }

  .video-player-progress-hover-fill {
    position: absolute;
    bottom: calc(var(--video-player--space) * 2);
    left: 2px;
    right: 2px;
    z-index: 0;
    height: var(--video-player--progress-height);
    border-radius: 3px;
    background: var(--video-player--white);
    opacity: 0;
    pointer-events: none;
    clip-path: inset(0 var(--video-player--hover-fill-inset) 0 0 round 3px);
    transform: translateZ(0);
    transition: height 180ms ease, opacity 120ms ease;
  }

  .video-player-progress:hover .video-player-progress-hover-fill,
  .video-player-player.is-progress-hovering .video-player-progress-hover-fill,
  .video-player-player.is-scrubbing .video-player-progress-hover-fill {
    opacity: 0.2;
  }

  .video-player-progress-marker {
    position: absolute;
    bottom: calc((var(--video-player--space) * 2) + 1.5px);
    left: clamp(1px, var(--video-player--return-marker-left), calc(100% - 1px));
    z-index: 2;
    width: 2px;
    height: max(1px, calc(var(--video-player--progress-height) - 3px));
    border-radius: 2px;
    background: rgb(var(--video-player--white-rgb) / calc(var(--video-player--return-marker-base-opacity) * 0.58));
    opacity: 0;
    overflow: hidden;
    pointer-events: none;
    transform: translateX(-50%) translateZ(0);
    transition: height 180ms ease, opacity 120ms ease;
  }

  .video-player-player.is-scrubbing.has-return-marker .video-player-progress-marker {
    opacity: 1;
  }

  .video-player-time {
    position: absolute;
    display: block;
    bottom: calc(100% + var(--video-player--space));
    left: var(--video-player--scrub-preview-left);
    z-index: 2;
    padding: 2px calc(var(--video-player--space) * 1.5);
    color: var(--video-player--white);
    background: transparent;
    border-radius: 4px;
    isolation: isolate;
    overflow: hidden;
    pointer-events: none;
    opacity: 0;
    transition: transform 120ms ease;
    transform: translateX(-50%) translateY(2px);
    white-space: nowrap;
    font: 500 12px/1.35 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-variant-numeric: tabular-nums;
  }

  .video-player-time-surface {
    position: absolute;
    inset: 0;
    z-index: 0;
    border-radius: inherit;
    background: var(--video-player--glass-surface);
    opacity: var(--video-player--glass-opacity);
    backdrop-filter: var(--video-player--glass-filter);
    -webkit-backdrop-filter: var(--video-player--glass-filter);
    transform: translateZ(0);
    will-change: backdrop-filter, opacity;
  }

  .video-player-time-text {
    position: relative;
    z-index: 1;
  }

  .video-player-progress:hover .video-player-time,
  .video-player-player.is-progress-hovering .video-player-time,
  .video-player-player.is-scrubbing .video-player-time {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  .video-player-player.has-pinned-time .video-player-time {
    display: none !important;
  }

  .video-player-player.is-loading:not(.has-loaded-once) .video-player-time,
  .video-player-player.is-loading:not(.has-loaded-once) .video-player-progress-hover-fill {
    display: none;
  }

  .video-player-tray-time {
    position: absolute;
    display: none;
    bottom: calc(((var(--video-player--space) * 2) - 2px) + var(--video-player--progress-height) + 8px);
    inset-inline-start: 0;
    z-index: 3;
    color: var(--video-player--white);
    isolation: isolate;
    overflow: visible;
    pointer-events: none;
    white-space: nowrap;
    opacity: 0;
    filter: blur(0.8px);
    transform: translateY(4px) scale(0.96);
    transform-origin: left bottom;
    transition:
      bottom 180ms ease,
      opacity 220ms ease,
      filter 260ms ease,
      transform 300ms cubic-bezier(0.18, 0.9, 0.22, 1);
  }

  .video-player-player.has-pinned-time .video-player-tray-time {
    display: block;
  }

  .video-player-player.has-pinned-time.is-pointer-active .video-player-tray-time,
  .video-player-player.has-pinned-time.is-controls-visible .video-player-tray-time {
    opacity: 1;
    pointer-events: auto;
    filter: blur(0);
    transform: translateY(0) scale(1);
  }

  .video-player-tray-time-holder {
    position: relative;
    right: auto;
    bottom: auto;
    width: calc(var(--video-player--tray-time-width, max-content) + (var(--video-player--control-tray-padding) * 2));
    height: calc(var(--video-player--control-slot-size) + (var(--video-player--control-tray-padding) * 2));
    transition: width 240ms cubic-bezier(0.23, 1, 0.32, 1);
    overflow: hidden;
  }

  .video-player-tray-time-holder .video-player-control-tray-slots {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .video-player-tray-time-holder .video-player-control-tray-slots::before {
    width: calc(100% - (var(--video-player--control-tray-padding) * 2));
  }

  .video-player-tray-time-holder .video-player-tray-time-text {
    aspect-ratio: auto;
    width: 100%;
    height: var(--video-player--control-slot-size);
    max-height: var(--video-player--control-slot-size);
    padding: 0 8px;
    font: 600 13px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-variant-numeric: tabular-nums;
    color: var(--video-player--white);
    border-radius: 3px;
  }

  .video-player-tray-time-text {
    pointer-events: auto;
    cursor: pointer;
  }

  .video-player-tray-time-text.is-time-animating {
    animation: video-player-volume-icon-swap 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .video-player-player.is-loading:not(.has-loaded-once) .video-player-tray-time {
    opacity: 0;
  }

  .video-player-progress:focus-visible,
  .video-player-control-button:focus-visible,
  .video-player-volume-track:focus-visible {
    outline: 2px solid var(--video-player--focus-ring);
    outline-offset: 3px;
    box-shadow: 0 0 0 5px rgb(0 0 0 / 0.32);
  }

  @media (max-width: 768px) and (hover: none) and (pointer: coarse) {
    .video-player-overlay,
    .video-player-button {
      transition-duration: 340ms;
    }

    .video-player-player.is-pointer-active .video-player-overlay,
    .video-player-player.is-loading:not(.has-loaded-once).is-pointer-active .video-player-overlay,
    .video-player-player.is-pointer-active .video-player-button,
    .video-player-player.is-loading:not(.has-loaded-once).is-pointer-active .video-player-button,
    .video-player-player.is-pointer-active .video-player-control-tray,
    .video-player-player.has-pinned-time.is-pointer-active .video-player-tray-time {
      opacity: 0;
    }

    .video-player-player.is-pointer-active .video-player-button,
    .video-player-player.is-loading:not(.has-loaded-once).is-pointer-active .video-player-button {
      transform: translate(-50%, -50%) scale(0.96);
    }

    .video-player-player.is-controls-visible .video-player-overlay {
      opacity: 1;
    }

    .video-player-player.is-controls-visible .video-player-button {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }

    .video-player-player.is-loading:not(.has-loaded-once).is-controls-visible .video-player-overlay,
    .video-player-player.is-loading:not(.has-loaded-once).is-controls-visible .video-player-button,
    .video-player-player.is-scrubbing .video-player-button {
      opacity: 0;
      pointer-events: none;
    }

    .video-player-progress-cluster:has(.video-player-progress:hover) {
      --video-player--progress-height: 4px;
    }

    .video-player-player.has-pinned-time.is-controls-visible .video-player-tray-time {
      opacity: 1;
      filter: blur(0);
      transform: translateY(0) scale(1);
    }

    .video-player-player.is-scrubbing .video-player-progress-cluster {
      --video-player--progress-height: 14px;
    }


    .video-player-player.is-controls-visible .video-player-overlay,
    .video-player-player.is-controls-visible .video-player-button,
    .video-player-player.is-controls-visible .video-player-control-tray {
      opacity: 1;
    }

    .video-player-player.is-controls-visible .video-player-button,
    .video-player-player.is-controls-visible .video-player-control-tray {
      pointer-events: auto;
    }

    .video-player-player.is-controls-visible .video-player-control-icon {
      opacity: var(--video-player--control-icon-opacity);
      transform: translateY(0) scale(1);
    }

    .video-player-control-tray-slots:has(.video-player-control-button:hover, .video-player-volume-slot:hover)::before {
      opacity: 0;
    }

    :is(.video-player-control-button:hover, .video-player-volume-slot:hover > .video-player-control-button) .video-player-control-icon {
      opacity: var(--video-player--control-icon-opacity);
      transform: translateY(0) scale(1);
    }

    .video-player-control-tray-slots:has(.video-player-control-button.is-control-tap-active)::before {
      opacity: var(--video-player--control-hover-opacity);
    }

    .video-player-control-button.is-control-tap-active .video-player-control-icon {
      opacity: var(--video-player--control-icon-hover-opacity);
      transform: translateY(0) scale(1);
    }
  }

  @keyframes video-player-progress-shimmer {
    0% {
      transform: translateX(-120%);
    }

    58%,
    100% {
      transform: translateX(120%);
    }
  }

  @keyframes video-player-volume-icon-swap {
    0% {
      filter: blur(0);
      transform: translateY(0) scale(1);
    }

    42% {
      filter: blur(1.2px);
      transform: translateY(0) scale(0.9);
    }

    100% {
      filter: blur(0);
      transform: translateY(0) scale(1);
    }
  }
  /* ---- Labs additions (not upstream) ---- */

  /* Icon-library glyphs (the "Icon library" style) draw with a stroke on the
     root svg: fill the play and pause icons, and thin the control icons as
     upstream thins its own. No effect on upstream's glyphs. */
  .video-player-icon {
    fill: currentColor;
  }

  .video-player-icon[stroke] {
    stroke-width: 1.5;
  }

  .video-player-control-icon[stroke] {
    stroke-width: var(--video-player--control-icon-stroke-width);
  }

  /* Keyboard focus on the play button and on the player itself was not
     visible upstream (outline: 0); focus-visible only, so pointer use is
     unchanged. */
  .video-player-button:focus-visible {
    outline: 2px solid var(--video-player--focus-ring);
    outline-offset: 3px;
    box-shadow: 0 0 0 5px rgb(0 0 0 / 0.32);
  }

  .video-player-player:focus-visible {
    outline: 2px solid var(--video-player--focus-ring);
    outline-offset: -2px;
  }

  /* The volume slider opens while it has keyboard focus (upstream opened it
     on hover only, so a focused slider was invisible). */
  .video-player-player.has-volume-slider-control:not(.is-volume-unavailable) .video-player-volume-slot:has(.video-player-volume-track:focus-visible) .video-player-volume-popover {
    z-index: 4;
    opacity: 1;
    pointer-events: auto;
    filter: blur(0);
    transform: translateY(0) scale(1);
  }

  /* Right to left: the control tray and the pinned time swap sides and the
     tray's slots run right to left (logical insets above); the timeline and
     the media glyphs stay left to right, as in native players. */
  .video-player:dir(rtl) .video-player-control-tray {
    transform-origin: left bottom;
  }

  .video-player:dir(rtl) .video-player-tray-time {
    transform-origin: right bottom;
  }

  .video-player:dir(rtl) .video-player-control-tray-slots::before {
    transform: translateX(calc(var(--video-player--control-hover-offset, 0px) * -1));
  }

  .video-player:dir(rtl) .video-player-control-tray-slots:has(.video-player-control-button.is-control-tap-active)::before {
    transform: translateX(calc(var(--video-player--touch-control-hover-offset) * -1));
  }

  .video-player-time-text,
  .video-player-tray-time-text {
    direction: ltr;
    unicode-bidi: isolate;
  }

  /* Reduced motion: controls appear and disappear without fades, slides or
     the loading shimmer. */
  @media (prefers-reduced-motion: reduce) {
    .video-player *,
    .video-player *::before,
    .video-player *::after {
      transition: none !important;
      animation: none !important;
    }
  }

  /* Contrast on request (fidelity default): opaque dark glass behind text
     and controls. */
  @media (prefers-contrast: more) {
    .video-player {
      --video-player--overlay-soft: rgb(0 0 0 / 0.6);
    }

    .video-player .video-player-time-surface,
    .video-player .video-player-control-tray::before,
    .video-player .video-player-volume-track,
    .video-player .video-player-progress-surface {
      background: rgb(0 0 0 / 0.75);
      opacity: 1;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }
  }

  @media (forced-colors: active) {
    .video-player .video-player-progress-fill,
    .video-player .video-player-progress-hover-fill,
    .video-player .video-player-volume-fill {
      forced-color-adjust: none;
      background: Highlight;
    }

    .video-player .video-player-progress-surface,
    .video-player .video-player-volume-track,
    .video-player .video-player-control-tray::before,
    .video-player .video-player-time-surface {
      forced-color-adjust: none;
      background: Canvas;
      opacity: 1;
      box-shadow: inset 0 0 0 1px CanvasText;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }

    .video-player .video-player-button:focus-visible,
    .video-player .video-player-player:focus-visible,
    .video-player .video-player-progress:focus-visible,
    .video-player .video-player-control-button:focus-visible,
    .video-player .video-player-volume-track:focus-visible {
      outline-color: Highlight;
    }
  }
`;
