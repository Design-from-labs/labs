"use client";

import * as React from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { ScrollCarouselStyles } from "./scroll-carousel-styles";

export interface ScrollCarouselImage {
  /** The image URL. */
  src: string;
  /** What the image shows. Use an empty string for a purely decorative one. */
  alt: string;
}

export interface ScrollCarouselProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  /** The pictures on the ring, 3 or more (the pen used 10 to 50). */
  images: ScrollCarouselImage[];
  /** The accessible name of the scroll region. */
  label?: string;
  /** Turn the ring with the scroller (the pen's "Scroll Drive"). Off, it turns by itself. */
  scrollDriven?: boolean;
  /** Off, the ring stands still (the pen's "Animate"). */
  animate?: boolean;
  /** Scroll up and down instead of across. */
  vertical?: boolean;
  /** Wrap around at either end of the scroller. */
  infinite?: boolean;
  /** Scroll distance per image, as a multiple of the image width (the pen's "Ratio"). */
  ratio?: number;
  /** Space between images, as a fraction of the image width (the pen's "Gap"). */
  gap?: number;
  /** Perspective of the ring, in px. */
  perspective?: number;
  /** Where the edge mask is fully opaque, in image widths from the centre. */
  maskLower?: number;
  /** Where the edge mask is fully transparent, in image widths from the centre. */
  maskUpper?: number;
  /** Tilt the ring forwards, in degrees. */
  rotateX?: number;
  /** Roll the ring, in degrees. */
  rotateZ?: number;
  /** Show the back of the pictures on the far side of the ring. */
  backface?: boolean;
  /** The color scheme of the system colors it draws with. */
  scheme?: "dark" | "light" | "auto";
  /** The word at the corner while the ring is scroll-driven; null hides it. */
  hint?: React.ReactNode;
  /**
   * "auto" drives the ring with a CSS scroll timeline where the browser has
   * one and with a scroll listener elsewhere; "script" always uses the
   * listener.
   */
  scrollDriver?: "auto" | "script";
}

const NATIVE = "animation-timeline: scroll()";

/**
 * A ring of pictures that turns as you scroll: the pen's CSS scroll-driven
 * animation, with a scroll-listener fallback and a flat strip under reduced
 * motion.
 */
export function ScrollCarousel({
  images,
  label = "Image carousel",
  scrollDriven = true,
  animate = true,
  vertical = false,
  infinite = false,
  ratio = 2,
  gap = 0.1,
  perspective = 320,
  maskLower = 0.9,
  maskUpper = 1.8,
  rotateX = 0,
  rotateZ = 0,
  backface = false,
  scheme = "dark",
  hint = "scroll.",
  scrollDriver = "auto",
  className,
  style,
  ref,
  ...props
}: ScrollCarouselProps) {
  const reduced = useReducedMotion();
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const scrollerRef = React.useRef<HTMLElement | null>(null);
  const [script, setScript] = React.useState(scrollDriver === "script");
  const driven = animate && scrollDriven && !reduced;

  // Without a CSS scroll timeline the ring turns from a scroll listener.
  React.useEffect(() => {
    setScript(
      scrollDriver === "script" ||
        (typeof CSS !== "undefined" &&
          typeof CSS.supports === "function" &&
          !CSS.supports(NATIVE)),
    );
  }, [scrollDriver]);

  React.useEffect(() => {
    const root = rootRef.current;
    const scroller = scrollerRef.current;
    if (!(root && scroller && driven)) {
      return;
    }
    // The pen's wrap-around: jump from one end to the other. Offsets are
    // measured from the inline start, so right to left works too.
    const wrap = () => {
      const sign =
        !vertical && getComputedStyle(scroller).direction === "rtl" ? -1 : 1;
      const at = Math.abs(vertical ? scroller.scrollTop : scroller.scrollLeft);
      const size = vertical ? scroller.clientHeight : scroller.clientWidth;
      const full = vertical ? scroller.scrollHeight : scroller.scrollWidth;
      let to: number | null = null;
      if (at + size > full - 2) {
        to = 2;
      } else if (at < 2) {
        to = full - 2;
      }
      if (to === null) {
        return;
      }
      if (vertical) {
        scroller.scrollTop = to;
      } else {
        scroller.scrollLeft = to * sign;
      }
    };
    // Without a CSS scroll timeline the ring turns with the scroller's progress.
    const sync = () => {
      if (!script) {
        return;
      }
      const max = vertical
        ? scroller.scrollHeight - scroller.clientHeight
        : scroller.scrollWidth - scroller.clientWidth;
      const at = Math.abs(vertical ? scroller.scrollTop : scroller.scrollLeft);
      root.style.setProperty(
        "--scroll-carousel--progress",
        String(max > 0 ? Math.min(1, at / max) : 0),
      );
    };
    const onScroll = () => {
      if (infinite) {
        wrap();
      }
      sync();
    };
    sync();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      root.style.removeProperty("--scroll-carousel--progress");
    };
  }, [driven, infinite, script, vertical]);

  const total = images.length;
  const vars = {
    "--scroll-carousel--total": total,
    "--scroll-carousel--gap": gap,
    "--scroll-carousel--ratio": ratio,
    "--scroll-carousel--perspective": perspective,
    "--scroll-carousel--mask-lower": maskLower,
    "--scroll-carousel--mask-upper": maskUpper,
    "--scroll-carousel--rotate-x": rotateX,
    "--scroll-carousel--rotate-z": rotateZ,
  } as React.CSSProperties;

  return (
    <div
      data-slot="scroll-carousel"
      data-scheme={scheme}
      data-animate={animate}
      data-scroll-driven={scrollDriven}
      data-vertical={vertical}
      data-infinite={infinite}
      data-backface={backface}
      data-script-driver={driven && script ? "" : undefined}
      className={cn("scroll-carousel", className)}
      style={{ ...vars, ...style }}
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}
      {...props}
    >
      <ScrollCarouselStyles />
      {reduced && animate ? (
        <section
          aria-label={label}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll region must be reachable by keyboard
          tabIndex={0}
          data-slot="scroll-carousel-strip"
        >
          <ul>
            {images.map((image, index) => (
              <li key={index}>
                <img src={image.src} alt={image.alt} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <div data-slot="scroll-carousel-stage">
            <ul
              data-slot="scroll-carousel-ring"
              aria-label={driven ? undefined : label}
            >
              {images.map((image, index) => (
                <li
                  key={index}
                  style={
                    { "--scroll-carousel--index": index } as React.CSSProperties
                  }
                >
                  <img src={image.src} alt={image.alt} />
                </li>
              ))}
            </ul>
          </div>
          {driven ? (
            <section
              ref={scrollerRef}
              aria-label={label}
              // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll region must be reachable by keyboard
              tabIndex={0}
              data-slot="scroll-carousel-scroller"
            >
              {/* One step more than there are images, as in the pen. */}
              {Array.from({ length: total + 1 }, (_, index) => (
                <span
                  key={index}
                  aria-hidden="true"
                  data-slot="scroll-carousel-step"
                />
              ))}
            </section>
          ) : null}
          {driven && hint ? (
            <p aria-hidden="true" data-slot="scroll-carousel-hint">
              {hint}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
