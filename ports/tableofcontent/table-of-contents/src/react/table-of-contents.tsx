"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

// A React port of project-toc.js and project-toc.css. The behavior is the
// upstream script's, function for function (setPreviewIndex, startPreview,
// setHoveredLink, the magnetic lines, updateActiveFromScroll); the stylesheet
// became Tailwind utilities with the same values, and its customization
// variables keep working under the --table-of-contents-* prefix.
//
// Contrast: the default colors are upstream's. Under prefers-contrast: more
// the description and the inactive lines use the *-contrast variables
// (at least 4.5:1 and 3:1), and the tooltip gets an outline; under
// forced-colors the lines and dots use system colors (GrayText, Highlight)
// and the tooltip a border, so nothing relies on a color the system drops.

export type TableOfContentsSoundLayer = {
  type: OscillatorType;
  start: number;
  end: number;
  gain?: number;
};

export type TableOfContentsSound = {
  gain: number;
  duration: number;
  layers: TableOfContentsSoundLayer[];
};

export type TableOfContentsSounds = {
  hover: TableOfContentsSound;
  press: TableOfContentsSound;
};

const defaultSounds: TableOfContentsSounds = {
  hover: {
    gain: 0.024,
    duration: 0.055,
    layers: [
      { type: "sine", start: 520, end: 720 },
      { type: "triangle", start: 980, end: 1220, gain: 0.34 },
    ],
  },
  press: {
    gain: 0.032,
    duration: 0.075,
    layers: [
      { type: "sine", start: 360, end: 230 },
      { type: "triangle", start: 620, end: 420, gain: 0.38 },
    ],
  },
};

let audioContext: AudioContext | undefined;
let audioUnlocked = false;
let lastHoverSoundAt = 0;

// Upstream creates the AudioContext on the first hover. Here it is created
// only inside a user gesture (a press on a link) or once the page has had
// one (navigator.userActivation), so no context ever starts suspended.
function hasUserActivation() {
  return (
    typeof navigator !== "undefined" &&
    navigator.userActivation?.hasBeenActive === true
  );
}

function getAudioContext(create: boolean) {
  if (typeof window === "undefined") {
    return null;
  }

  if (!audioContext && create) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    audioContext = new AudioContextClass();
  }

  return audioContext ?? null;
}

function primeAudio() {
  const context = getAudioContext(false);

  if (!context || audioUnlocked) {
    return;
  }

  const buffer = context.createBuffer(1, 1, 22050);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start(0);
  audioUnlocked = true;
}

async function unlockAudio() {
  const context = getAudioContext(false);

  if (!context) {
    return false;
  }

  if (context.state === "suspended") {
    await context.resume();
  }

  primeAudio();
  return context.state === "running";
}

async function playSound(
  name: keyof TableOfContentsSounds,
  sounds: TableOfContentsSounds,
  inGesture: boolean,
) {
  const context = getAudioContext(inGesture || hasUserActivation());
  const sound = sounds[name];

  if (!context || !sound) {
    return;
  }

  if (context.state !== "running") {
    const unlocked = await unlockAudio();

    if (!unlocked) {
      return;
    }
  }

  const now = context.currentTime;
  const output = context.createGain();
  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(sound.gain, now + 0.006);
  output.gain.exponentialRampToValueAtTime(0.0001, now + sound.duration);
  output.connect(context.destination);

  sound.layers.forEach((layer) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = layer.type;
    oscillator.frequency.setValueAtTime(layer.start, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      layer.end,
      now + sound.duration,
    );
    gain.gain.setValueAtTime(layer.gain ?? 1, now);
    oscillator.connect(gain);
    gain.connect(output);
    oscillator.start(now);
    oscillator.stop(now + sound.duration + 0.01);
  });
}

function playHoverSound(
  name: keyof TableOfContentsSounds,
  sounds: TableOfContentsSounds,
) {
  const now = performance.now();

  if (now - lastHoverSoundAt < 90) {
    return;
  }

  lastHoverSoundAt = now;
  playSound(name, sounds, false);
}

export type TableOfContentsImage =
  | string
  | {
      src: string;
      /** Intrinsic width; with `height`, sets the preview's aspect ratio before the image loads. */
      width?: number;
      height?: number;
    };

export type TableOfContentsItem = {
  /** The id of the section this entry jumps to (`href="#id"`). */
  id: string;
  title: string;
  description?: string;
  /** Up to ten images for the tooltip's preview slider. */
  images?: TableOfContentsImage[];
  /**
   * Aspect ratio of the preview box ("4 / 3" or 1.33). Defaults to the first
   * image's own ratio; upstream used the first image's box as laid out in
   * its section, which you can pass here to match a gallery's crop.
   */
  previewRatio?: string | number;
};

type PreviewImage = {
  src: string;
  ratio?: string;
  ready?: Promise<unknown>;
  preload?: HTMLImageElement;
};

type PreviewState = {
  dots: HTMLElement[];
  image: HTMLImageElement;
  images: PreviewImage[];
  index: number;
  preview: HTMLElement;
  standbyImage: HTMLImageElement;
  switchToken: number;
  timer: number | null;
};

function toPreviewImage(image: TableOfContentsImage): PreviewImage {
  if (typeof image === "string") {
    return { src: image };
  }

  return {
    src: image.src,
    ratio:
      image.width && image.height
        ? `${image.width} / ${image.height}`
        : undefined,
  };
}

function previewImagesOf(item: TableOfContentsItem) {
  return (item.images ?? [])
    .map(toPreviewImage)
    .filter((image) => image.src)
    .slice(0, 10);
}

function previewRatioOf(item: TableOfContentsItem, images: PreviewImage[]) {
  if (item.previewRatio !== undefined) {
    return String(item.previewRatio);
  }

  return images[0]?.ratio;
}

function preloadPreviewImage(image: PreviewImage) {
  if (image.ready) {
    return image.ready;
  }

  const preload = new Image();

  image.ready = new Promise((resolve) => {
    preload.addEventListener("load", resolve, { once: true });
    preload.addEventListener("error", resolve, { once: true });
  });

  preload.src = image.src;
  image.preload = preload;

  return image.ready;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION);
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

export type TableOfContentsProps = Omit<
  React.ComponentProps<"nav">,
  "children"
> & {
  items: TableOfContentsItem[];
  /** Fraction of the viewport height where a section becomes active. */
  activeMarkerRatio?: number;
  /** Milliseconds between preview slides while a tooltip is open. */
  previewInterval?: number;
  /** Scroll smoothly on click (instant when the user prefers reduced motion). */
  smoothScroll?: boolean;
  /** Opt-in Web Audio hover and press sounds. Off by default. */
  enableSound?: boolean;
  sounds?: TableOfContentsSounds;
  /** Called with the section id whenever the active section changes. */
  onActiveChange?: (id: string) => void;
  /**
   * Row height in pixels (each entry's target height and the spacing between
   * lines). Defaults to upstream's 20; WCAG 2.2 SC 2.5.8 needs 24px targets.
   * Sets --table-of-contents-item-height, which CSS can also set.
   */
  rowHeight?: number;
};

function TableOfContents({
  items,
  activeMarkerRatio = 0.38,
  previewInterval = 1500,
  smoothScroll = true,
  enableSound = false,
  sounds = defaultSounds,
  onActiveChange,
  rowHeight,
  className,
  style,
  "aria-label": ariaLabel = "Table of contents",
  ...props
}: TableOfContentsProps) {
  const tocRef = React.useRef<HTMLElement>(null);
  const baseId = React.useId();
  const prefersReducedMotion = usePrefersReducedMotion();
  const latest = React.useRef({ items, sounds, onActiveChange });
  latest.current = { items, sounds, onActiveChange };
  // Re-initialize only when the entries themselves change, not on every
  // render with a fresh but equal items array.
  const itemsKey = JSON.stringify(items);

  // biome-ignore lint/correctness/useExhaustiveDependencies: itemsKey stands for items (read through the ref).
  React.useEffect(() => {
    const toc = tocRef.current;

    if (!toc) {
      return;
    }

    const links = Array.from(
      toc.querySelectorAll<HTMLAnchorElement>("a[data-toc-link]"),
    );

    if (!links.length) {
      return;
    }

    const sections = links
      .map((link, index) => {
        const id = decodeURIComponent(link.hash.slice(1));
        const section = document.getElementById(id);
        return section
          ? { id, link, section, item: latest.current.items[index] }
          : null;
      })
      .filter((entry) => entry !== null);

    if (!sections.length) {
      return;
    }

    let activeId = "";
    let hoveredLink: HTMLAnchorElement | null = null;
    let hoverClearTimeout: number | null = null;
    let magnetFrame = 0;
    let pendingMagnetY: number | null = null;
    const previewStates = new Map<HTMLAnchorElement, PreviewState>();
    const cleanups: Array<() => void> = [];

    function setPreviewIndex(
      link: HTMLAnchorElement,
      index: number,
      animate = true,
    ) {
      const state = previewStates.get(link);

      if (!state || !state.images.length) {
        return;
      }

      const nextIndex =
        ((index % state.images.length) + state.images.length) %
        state.images.length;
      const nextImage = state.images[nextIndex];

      state.index = nextIndex;
      state.switchToken += 1;
      const switchToken = state.switchToken;

      state.dots.forEach((dot, dotIndex) => {
        dot.toggleAttribute("data-active", dotIndex === nextIndex);
      });

      const updateImage = () => {
        if (state.switchToken !== switchToken) {
          return;
        }

        if (!animate || prefersReducedMotion) {
          state.image.src = nextImage.src;
          state.image.alt = "";
          state.image.setAttribute("data-visible", "");
          state.standbyImage.removeAttribute("data-visible");
          state.standbyImage.removeAttribute("src");
          return;
        }

        const incomingImage = state.standbyImage;
        const outgoingImage = state.image;

        incomingImage.src = nextImage.src;
        incomingImage.alt = "";
        incomingImage.removeAttribute("data-visible");

        window.requestAnimationFrame(() => {
          if (state.switchToken !== switchToken) {
            return;
          }

          incomingImage.setAttribute("data-visible", "");
          outgoingImage.removeAttribute("data-visible");
        });

        window.setTimeout(() => {
          if (state.switchToken !== switchToken) {
            return;
          }

          state.image = incomingImage;
          state.standbyImage = outgoingImage;
          state.standbyImage.removeAttribute("src");
        }, 340);
      };

      if (animate && !prefersReducedMotion) {
        preloadPreviewImage(nextImage).then(updateImage);
      } else {
        updateImage();
      }
    }

    function stopPreview(link: HTMLAnchorElement) {
      const state = previewStates.get(link);

      if (!state?.timer) {
        return;
      }

      window.clearInterval(state.timer);
      state.timer = null;
    }

    function startPreview(link: HTMLAnchorElement) {
      const state = previewStates.get(link);

      if (!state || state.images.length < 2 || prefersReducedMotion) {
        return;
      }

      stopPreview(link);
      state.timer = window.setInterval(() => {
        setPreviewIndex(link, state.index + 1);
      }, previewInterval);
    }

    function buildPreview(
      link: HTMLAnchorElement,
      item: TableOfContentsItem | undefined,
    ) {
      const preview = link.querySelector<HTMLElement>("[data-toc-preview]");

      if (!preview || !item) {
        return;
      }

      const images = previewImagesOf(item);

      if (!images.length) {
        return;
      }

      images.forEach(preloadPreviewImage);

      // Upstream measures the first image as laid out in its section; here
      // the ratio comes from the image's own size (given, or once loaded).
      const first = images[0];
      const ratio = previewRatioOf(item, images);
      if (ratio) {
        preview.style.setProperty("--table-of-contents-preview-ratio", ratio);
      } else {
        first.ready?.then(() => {
          const { naturalWidth, naturalHeight } = first.preload ?? {};
          if (naturalWidth && naturalHeight) {
            preview.style.setProperty(
              "--table-of-contents-preview-ratio",
              `${naturalWidth} / ${naturalHeight}`,
            );
          }
        });
      }

      const [previewImage, standbyImage] = Array.from(
        preview.querySelectorAll<HTMLImageElement>("img"),
      );
      const dotElements = Array.from(
        preview.querySelectorAll<HTMLElement>("[data-toc-preview-dot]"),
      );

      previewStates.set(link, {
        dots: dotElements,
        image: previewImage,
        images,
        index: 0,
        preview,
        standbyImage,
        switchToken: 0,
        timer: null,
      });

      setPreviewIndex(link, 0, false);
    }

    function setHoveredLink(link: HTMLAnchorElement | null) {
      if (hoverClearTimeout) {
        window.clearTimeout(hoverClearTimeout);
        hoverClearTimeout = null;
      }

      if (hoveredLink === link) {
        return;
      }

      if (hoveredLink) {
        stopPreview(hoveredLink);
        hoveredLink.removeAttribute("data-hovered");
      }

      hoveredLink = link;

      if (hoveredLink) {
        hoveredLink.setAttribute("data-hovered", "");
        updateMagnetFromLink(hoveredLink);
        setPreviewIndex(hoveredLink, 0, false);
        startPreview(hoveredLink);
      }
    }

    function setMagnetStrength(link: HTMLAnchorElement, strength: number) {
      const nextStrength = Math.max(0, Math.min(1, strength));

      if (nextStrength <= 0.01) {
        link.style.removeProperty("--table-of-contents-magnet");
        return;
      }

      link.style.setProperty(
        "--table-of-contents-magnet",
        nextStrength.toFixed(3),
      );
    }

    function updateMagnetFromY(pointerY: number) {
      const influence = 112;

      sections.forEach(({ link }) => {
        const rect = link.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const distance = Math.abs(pointerY - centerY);
        const strength = Math.max(0, 1 - distance / influence) ** 1.7;

        setMagnetStrength(link, strength);
      });
    }

    function updateMagnetFromLink(link: HTMLAnchorElement) {
      const rect = link.getBoundingClientRect();
      updateMagnetFromY(rect.top + rect.height / 2);
    }

    function requestMagnetUpdate(pointerY: number) {
      pendingMagnetY = pointerY;

      if (magnetFrame) {
        return;
      }

      magnetFrame = window.requestAnimationFrame(() => {
        magnetFrame = 0;

        if (pendingMagnetY !== null) {
          updateMagnetFromY(pendingMagnetY);
        }
      });
    }

    function clearMagnet() {
      pendingMagnetY = null;

      if (magnetFrame) {
        window.cancelAnimationFrame(magnetFrame);
        magnetFrame = 0;
      }

      sections.forEach(({ link }) => {
        link.style.removeProperty("--table-of-contents-magnet");
      });
    }

    function shouldUpdateMagnet(event: Event) {
      return !(
        event.target instanceof Element &&
        event.target.closest("[data-toc-tooltip]")
      );
    }

    function clearHoveredLink(link: HTMLAnchorElement, delay = 90) {
      if (hoverClearTimeout) {
        window.clearTimeout(hoverClearTimeout);
      }

      hoverClearTimeout = window.setTimeout(() => {
        if (hoveredLink === link) {
          stopPreview(link);
          setHoveredLink(null);
        }
      }, delay);
    }

    function setActive(id: string) {
      if (activeId === id) {
        return;
      }

      activeId = id;

      sections.forEach(({ id: sectionId, link }) => {
        const isActive = sectionId === id;
        link.toggleAttribute("data-active", isActive);

        if (isActive) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      });

      latest.current.onActiveChange?.(id);
    }

    function updateActiveFromScroll() {
      const marker = window.innerHeight * activeMarkerRatio;
      const current = sections.reduce((candidate, item) => {
        const rect = item.section.getBoundingClientRect();
        return rect.top <= marker ? item : candidate;
      }, sections[0]);

      setActive(current.id);
    }

    function addListener<E extends Event>(
      target: EventTarget,
      eventName: string,
      callback: (event: E) => void,
      listenerOptions?: AddEventListenerOptions,
    ) {
      const listener = callback as EventListener;
      target.addEventListener(eventName, listener, listenerOptions);
      cleanups.push(() =>
        target.removeEventListener(eventName, listener, listenerOptions),
      );
    }

    sections.forEach(({ link, item }) => {
      buildPreview(link, item);

      addListener<PointerEvent>(link, "pointerenter", (event) => {
        if (shouldUpdateMagnet(event)) {
          requestMagnetUpdate(event.clientY);
        }

        setHoveredLink(link);

        if (enableSound) {
          playHoverSound("hover", latest.current.sounds);
        }
      });

      addListener<PointerEvent>(link, "pointermove", (event) => {
        if (!shouldUpdateMagnet(event)) {
          return;
        }

        requestMagnetUpdate(event.clientY);
      });

      addListener<PointerEvent>(link, "pointerleave", (event) => {
        if (
          event.relatedTarget instanceof Node &&
          link.contains(event.relatedTarget)
        ) {
          return;
        }

        clearHoveredLink(link);
      });

      addListener(link, "focus", () => {
        updateMagnetFromLink(link);
        setHoveredLink(link);

        if (enableSound) {
          playHoverSound("hover", latest.current.sounds);
        }
      });

      addListener(link, "blur", () => {
        clearHoveredLink(link, 0);
        clearMagnet();
      });

      // Escape dismisses the open tooltip without moving focus (WCAG 1.4.13).
      addListener<KeyboardEvent>(link, "keydown", (event) => {
        if (event.key === "Escape" && hoveredLink === link) {
          setHoveredLink(null);
          clearMagnet();
        }
      });

      addListener(link, "pointerdown", () => {
        if (enableSound) {
          playSound("press", latest.current.sounds, true);
        }
      });

      addListener<MouseEvent>(link, "click", (event) => {
        if (!smoothScroll) {
          return;
        }

        event.preventDefault();

        const id = decodeURIComponent(link.hash.slice(1));
        const target = document.getElementById(id);

        if (!target) {
          return;
        }

        target.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
        });

        window.history.pushState(null, "", `#${encodeURIComponent(id)}`);
        setActive(id);
      });
    });

    addListener<PointerEvent>(toc, "pointermove", (event) => {
      if (!shouldUpdateMagnet(event)) {
        return;
      }

      requestMagnetUpdate(event.clientY);
    });

    addListener<PointerEvent>(toc, "pointerleave", (event) => {
      if (
        event.relatedTarget instanceof Node &&
        toc.contains(event.relatedTarget)
      ) {
        return;
      }

      clearMagnet();
    });

    addListener(window, "scroll", updateActiveFromScroll, { passive: true });
    addListener(window, "resize", updateActiveFromScroll);
    updateActiveFromScroll();

    return () => {
      if (hoverClearTimeout) {
        window.clearTimeout(hoverClearTimeout);
      }

      clearMagnet();
      previewStates.forEach((state, link) => {
        stopPreview(link);
        state.switchToken += 1;
      });
      if (hoveredLink) {
        hoveredLink.removeAttribute("data-hovered");
      }
      cleanups.forEach((cleanup) => {
        cleanup();
      });
    };
  }, [
    itemsKey,
    activeMarkerRatio,
    previewInterval,
    smoothScroll,
    enableSound,
    prefersReducedMotion,
  ]);

  return (
    <nav
      ref={tocRef}
      aria-label={ariaLabel}
      data-slot="table-of-contents"
      className={cn(
        "pointer-events-none fixed start-[var(--table-of-contents-left,34px)] top-[var(--table-of-contents-top,max(160px,30.6vh))] z-40 flex w-[var(--table-of-contents-width,366px)] flex-col gap-0 max-md:hidden",
        className,
      )}
      style={
        rowHeight === undefined
          ? style
          : ({
              "--table-of-contents-item-height": `${rowHeight}px`,
              ...style,
            } as React.CSSProperties)
      }
      {...props}
    >
      {items.map((item, index) => {
        const images = previewImagesOf(item);
        const previewRatio = previewRatioOf(item, images);
        const descriptionId = `${baseId}-${index}-description`;

        return (
          <a
            key={item.id}
            href={`#${encodeURIComponent(item.id)}`}
            aria-label={item.title}
            aria-describedby={item.description ? descriptionId : undefined}
            data-toc-link=""
            className="group pointer-events-auto relative block h-[var(--table-of-contents-item-height,20px)] w-[var(--table-of-contents-item-width,64px)] text-table-of-contents-line-active outline-none before:absolute before:start-0 before:-end-[18px] before:top-[3px] before:bottom-[3px] before:content-[''] data-[hovered]:z-2"
          >
            <span
              aria-hidden="true"
              className="absolute start-0 top-1/2 block h-[var(--table-of-contents-line-height,2px)] w-[calc(var(--table-of-contents-line-width,12px)_+_(var(--table-of-contents-line-magnetic-delta,20px)_*_var(--table-of-contents-magnet,0)))] origin-[left_center] rounded-[999px] bg-table-of-contents-line will-change-[width,background,transform] [transform:translateY(-50%)] [transition:width_260ms_cubic-bezier(0.16,1,0.3,1),background_180ms_ease,opacity_180ms_ease,transform_260ms_cubic-bezier(0.16,1,0.3,1)] group-active:[transform:translateY(-50%)_scaleX(0.92)] group-data-[active]:w-[var(--table-of-contents-line-active-width,32px)] group-data-[hovered]:w-[var(--table-of-contents-line-active-width,32px)] group-data-[active]:bg-table-of-contents-line-active group-data-[hovered]:bg-table-of-contents-line-active motion-reduce:transition-none contrast-more:bg-table-of-contents-line-contrast forced-colors:bg-[color:GrayText] forced-colors:forced-color-adjust-none forced-colors:group-data-[active]:bg-[color:Highlight] forced-colors:group-data-[hovered]:bg-[color:Highlight] rtl:origin-[right_center]"
            />
            <span
              role="tooltip"
              data-toc-tooltip=""
              className="pointer-events-none absolute start-[var(--table-of-contents-tooltip-left,72px)] top-1/2 flex min-h-[174px] w-[var(--table-of-contents-tooltip-width,286px)] origin-top-left flex-col gap-[10px] rounded-[8px] bg-table-of-contents-tooltip p-[10px] text-table-of-contents-tooltip-foreground opacity-0 [transform:translate3d(-10px,-50%,0)_scale(0.985)] [transition:opacity_160ms_ease_30ms,transform_220ms_cubic-bezier(0.2,0,0,1)_30ms] group-data-[hovered]:pointer-events-auto group-data-[hovered]:opacity-100 group-data-[hovered]:[transform:translate3d(0,-50%,0)_scale(1)] group-data-[hovered]:[transition-delay:0ms] motion-reduce:transition-none contrast-more:outline-1 contrast-more:outline-table-of-contents-line-contrast contrast-more:outline-solid forced-colors:border rtl:origin-top-right rtl:[transform:translate3d(10px,-50%,0)_scale(0.985)]"
            >
              {images.length ? (
                <span
                  aria-hidden="true"
                  data-toc-preview=""
                  className="relative block w-full overflow-hidden rounded-[5px] bg-transparent [aspect-ratio:var(--table-of-contents-preview-ratio,1340/946)]"
                  style={
                    previewRatio
                      ? ({
                          "--table-of-contents-preview-ratio": previewRatio,
                        } as React.CSSProperties)
                      : undefined
                  }
                >
                  {[0, 1].map((slot) => (
                    <img
                      key={slot}
                      alt=""
                      src={slot === 0 ? images[0].src : undefined}
                      decoding="async"
                      loading="lazy"
                      data-visible={slot === 0 ? "" : undefined}
                      className="absolute inset-0 block size-full object-contain opacity-0 will-change-[opacity,transform] [backface-visibility:hidden] [transform:scale(1.006)] [transition:opacity_280ms_ease,transform_620ms_cubic-bezier(0.2,0,0,1)] data-[visible]:opacity-92 data-[visible]:[transform:scale(1)] motion-reduce:transition-none"
                    />
                  ))}
                  <span className="pointer-events-none absolute start-2 end-2 bottom-2 flex items-center justify-center gap-1">
                    {images.map((image, dot) => (
                      <span
                        key={`${dot}-${image.src}`}
                        data-toc-preview-dot=""
                        data-active={dot === 0 ? "" : undefined}
                        className="block h-1 w-1 rounded-[999px] bg-[rgba(255,255,255,0.32)] [transition:width_180ms_cubic-bezier(0.2,0,0,1),background_180ms_ease] data-[active]:w-3 data-[active]:bg-[rgba(255,255,255,0.86)] motion-reduce:transition-none forced-colors:bg-[color:GrayText] forced-colors:forced-color-adjust-none forced-colors:data-[active]:bg-[color:Highlight]"
                      />
                    ))}
                  </span>
                </span>
              ) : null}
              <span className="flex min-w-0 flex-col gap-[2px]">
                <strong className="block font-normal text-[14px] leading-[18px] tracking-[-0.13px]">
                  {item.title}
                </strong>
                {item.description ? (
                  <span
                    id={descriptionId}
                    className="block font-normal text-[14px] text-table-of-contents-tooltip-muted leading-[18px] tracking-[-0.13px] contrast-more:text-table-of-contents-tooltip-muted-contrast"
                  >
                    {item.description}
                  </span>
                ) : null}
              </span>
            </span>
          </a>
        );
      })}
    </nav>
  );
}

export { TableOfContents };
