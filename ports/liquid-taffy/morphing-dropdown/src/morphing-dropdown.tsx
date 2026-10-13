"use client";

// ---- upstream: src/components/LiquidMorph/LiquidMorph.tsx ----
import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { taffyDropdownStyles } from "./taffy-dropdown-styles";
import { PlusIcon, type TaffyShape } from "./taffy-glyphs";
import { GOO_RIM_THRESHOLDS, gooThreshold, setGooBlur } from "@/lib/taffy-goo";
import { motifHue, neonGlow, SHAPE_HUES } from "@/lib/taffy-hues";
import { IconMorph } from "./taffy-icon-morph";
import {
  TaffyMenuCheckboxItem,
  TaffyMenuList,
  TaffyMenuRoot,
  TaffyMenuTrigger,
} from "./taffy-menu";
import { prefersReducedMotion } from "@/lib/taffy-motion";
import { RowHover } from "./taffy-row-hover";
import { rowSelectionStyle } from "@/lib/taffy-select";
import { SelectionBurst } from "./taffy-selection-burst";
import { type GooSound, gooSfx } from "@/lib/taffy-sfx";
import { HOUSE_SPRING, POP_SPRING } from "@/lib/taffy-springs";
import { squirclePath } from "@/lib/taffy-squircle";
import { createLiquidStretch, GRAB_CHAIN, type LiquidStretch } from "@/lib/taffy-stretch";
import { type LiquidTheme, useLiquidFrame, useLiquidThemeRef } from "@/lib/taffy-theme";
import {
  type TaffyTimeline,
  taffyBezier,
  taffyGetProperty,
  taffySet,
  taffyTicker,
  taffyTimeline,
  taffyTo,
} from "@/lib/taffy-tween";

const P = "morphing-dropdown";
const STYLES = taffyDropdownStyles(P, 0);

const SPRING = HOUSE_SPRING;
const POP = POP_SPRING;
const OUT_STRONG = taffyBezier(0.23, 1, 0.32, 1);
/* Anticipate — exit: wind up ~10% the wrong way, then collapse. */
const ANTICIPATE = taffyBezier(0.36, 0, 0.66, -0.56);
const BACK_OUT = taffyBezier(0.34, 1.6, 0.64, 1);

const BUTTON_SIZE = 32;

/* The dropdown IN THE BUTTON'S PLACE: centered on it, bottom edges aligned. */
const PANEL_WIDTH = 141;
const PANEL_PADDING = 7;
const ROW_HEIGHT = 30;
/* Button center in the panel's own coordinates — the panel pours out of it. */
const PANEL_ORIGIN_X = PANEL_WIDTH / 2; /* 70.5 */

const PANEL_RADIUS = 16;

/* Blur discipline. This variant is ONE mass throughout — the panel grows out
   of (and dives back into) the button it overlaps, so it never needs the big
   neck-bridging blur. σ4 gives the same smooth fillets at roughly half the
   Gaussian cost, which is what keeps the morph fluid. */
const GOO_BLUR_ACTIVE = 4;
const GOO_BLUR_REST = 1;
/* The grab runs at the speed dial's σ, because it is the speed dial's gesture:
   the chain overlaps geometrically, so it needs no more blur than this to read
   as liquid — and this is the blur whose rim is solved (taffy-goo.ts). */
const GOO_BLUR_GRAB = 5;

/* Goo canvas geometry — must mirror .goo in the stylesheet.
   Every side needs room for the longest thing the liquid can do: a finger
   pulled the full GRAB_MAX (44) plus its head's radius (11 × 0.85 ≈ 9) plus
   the blur's tail (three σ, 15px) ≈ 68px measured from the button's edge. The
   canvas is what the browser rasterizes into, so anything past it is cut off
   with a straight edge and no rim — which is exactly what a finger pulled
   downwards used to hit, 44px below the button. 72px, everywhere. */
const GOO_WIDTH = 320;
const TRIGGER_X = 144; /* button left edge in goo coords */
const TRIGGER_CX = TRIGGER_X + BUTTON_SIZE / 2;

export interface MorphingDropdownItem {
  /** Stable id, reported in `value`. */
  id: string;
  /** The row's label (and its accessible name). */
  label: string;
  /** The row's glyph; each has its own hue on the dark frame. */
  shape: TaffyShape;
}

/* The four glyphs — circle, cross, triangle, square — each wearing its own
   hue (taffy-hues.ts). This variant is ONE mass, so there is no seam to
   light: instead the neon catches the row the pulled finger's head is
   standing over, live through the grab. */
export const MORPHING_DROPDOWN_ITEMS: readonly MorphingDropdownItem[] = [
  { id: "circle", label: "Circle", shape: "circle" },
  { id: "cross", label: "Cross", shape: "cross" },
  { id: "triangle", label: "Triangle", shape: "triangle" },
  { id: "square", label: "Square", shape: "square" },
];

export interface MorphingDropdownProps {
  /** The rows (default: the four glyphs). Up to about eight fit. */
  items?: readonly MorphingDropdownItem[];
  /** Ticked rows, by id (controlled). */
  value?: readonly string[];
  /** Ticked rows on mount (uncontrolled). */
  defaultValue?: readonly string[];
  onValueChange?: (value: string[]) => void;
  /** Whether the panel is out (controlled). */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The trigger's accessible name. */
  label?: string;
  /** The menu's accessible name. */
  menuLabel?: string;
  /** The frame; by default the page's (a `.dark` ancestor makes it dark). */
  theme?: LiquidTheme;
  /** Synthesized liquid sounds on open, close, tick, grab and release. */
  sound?: boolean;
  className?: string;
}

export function MorphingDropdown({
  items = MORPHING_DROPDOWN_ITEMS,
  value,
  defaultValue,
  onValueChange,
  open,
  defaultOpen = false,
  onOpenChange,
  label = "Add shape",
  menuLabel = "Shapes menu",
  theme: themeProp,
  sound = false,
  className,
}: MorphingDropdownProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  /* The frame this drop is standing on. It only swaps which colours the
     palette hands over; every spring, blur and threshold is the same one on
     both frames. */
  const theme = useLiquidFrame(rootRef, themeProp);

  /* Labs: the geometry follows the number of rows (upstream: four). */
  const rows = items.length;
  const PANEL_HEIGHT = 2 * PANEL_PADDING + rows * ROW_HEIGHT; /* 134 */
  const PANEL_ORIGIN_Y = PANEL_HEIGHT - BUTTON_SIZE / 2; /* 118 */
  /* Resting scale: the shrunk panel must hide inside the 16px-radius circle.
     Farthest corner ≈ √(70.5² + 118²) ≈ 138px from the origin → 138 × 0.11 ≈ 15. */
  const PANEL_REST_SCALE =
    rows === 4 ? 0.11 : Math.round((15 / Math.hypot(PANEL_ORIGIN_X, PANEL_ORIGIN_Y)) * 1000) / 1000;
  const GOO_HEIGHT = 174 + PANEL_HEIGHT; /* 308 */
  const TRIGGER_Y = GOO_HEIGHT - 72 - BUTTON_SIZE; /* 204: button top edge */
  const TRIGGER_CY = TRIGGER_Y + BUTTON_SIZE / 2;
  /* The open panel's rect in goo-canvas coordinates, and its row band — the
     finger's head is measured against these. The panel only ever TRANSLATES
     while a grab is live, and its lean tops out around 6px, so the resting
     geometry is close enough to name the row without chasing the transform. */
  const PANEL_GOO_X = TRIGGER_CX - PANEL_WIDTH / 2;
  const PANEL_GOO_Y = TRIGGER_Y + BUTTON_SIZE - PANEL_HEIGHT;
  const geometry = useRef({ PANEL_GOO_X, PANEL_GOO_Y, PANEL_HEIGHT, rows });
  geometry.current = { PANEL_GOO_X, PANEL_GOO_Y, PANEL_HEIGHT, rows };

  /* Which row the head is standing over — or none: unlike the anchored
     dropdown's seam (which lights the NEAREST row of a real joint), a head
     outside the rows lights nothing, because here there is no joint to speak
     of, only position. */
  const rowUnderHead = useCallback((x: number, y: number): number | null => {
    const { PANEL_GOO_X: left, PANEL_GOO_Y: top, rows: count } = geometry.current;
    if (x < left + PANEL_PADDING || x > left + PANEL_WIDTH - PANEL_PADDING) {
      return null;
    }
    const index = Math.floor((y - (top + PANEL_PADDING)) / ROW_HEIGHT);
    return index >= 0 && index < count ? index : null;
  }, []);

  const gooId = `${P}-goo-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const gooRef = useRef<SVGSVGElement>(null);
  const bodiesRef = useRef<HTMLDivElement>(null);
  const blobTriggerRef = useRef<SVGCircleElement>(null);
  const blobPanelRef = useRef<SVGPathElement>(null);
  const grabChainRefs = useRef<(SVGCircleElement | null)[]>([]);
  const triggerBodyRef = useRef<HTMLDivElement>(null);
  const panelBodyRef = useRef<SVGSVGElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  /* The rows' CONTENT (icon + label), animated separately from the rows: the
     entry stagger rides these, while the buttons — and the selection washes
     drawn on them — stay put inside the panel and scale with it as ONE mass.
     Staggering the buttons themselves tore a full-height selection run into
     four pieces with gaps between them for the length of every bounce. */
  const itemInnerRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const blurRef = useRef<SVGFEGaussianBlurElement>(null);
  const rimEdgeRef = useRef<SVGFEColorMatrixElement>(null);
  const innerEdgeRef = useRef<SVGFEColorMatrixElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const timelineRef = useRef<TaffyTimeline | null>(null);
  const stretchRef = useRef<LiquidStretch | null>(null);
  /* The row-press squish, kept on a handle. It tweens the SAME property the
     open and close runs do (the panel's scale) and rings for half a second,
     so left loose it can still be writing while a toggle is trying to pour
     or collapse — two owners, one property, and whichever ticks last wins
     the frame. */
  const pressTweenRef = useRef<TaffyTimeline | null>(null);
  /* Which row's glyph is lit — so styles are written only on a change. */
  const litRowRef = useRef<number | null>(null);
  /* Same reason: the voice asks which frame it is speaking in, and the host
     callbacks outlive the render that made them. */
  const themeRef = useLiquidThemeRef(theme);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const play = useCallback(
    (name: GooSound) => {
      if (soundRef.current) {
        gooSfx.play(name, { frame: themeRef.current });
      }
    },
    [themeRef],
  );

  const [openState, setOpenState] = useState(open ?? defaultOpen);
  const isOpen = openState;
  /* Mirrors isOpen for the stretch engine's host callbacks, which are created
     once and must not close over a stale render's state. */
  const isOpenRef = useRef(isOpen);
  /* Multi-select: which rows are ticked. Persists across open/close — a
     selection is a state, not a gesture. */
  const [valueState, setValueState] = useState<readonly string[]>(defaultValue ?? []);
  const currentValue = value ?? valueState;
  const selected = items.map((item) => currentValue.includes(item.id));
  /* Which row the pointer is on — the travelling hover's only input. Labs:
     else the row with keyboard focus. */
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [focusedRow, setFocusedRow] = useState<number | null>(null);
  /* Each row's motif hue on the frame we are standing on — null on the
     light frame, which carries no motif colour. */
  const rowHues = items.map((item) => motifHue(SHAPE_HUES[item.shape], theme));
  const itemsRef = useRef(items);
  itemsRef.current = items;

  /* Labs: the resting picture is in the server markup too (it used to be
     placed only after mount), so the first paint is already right. */
  const [initial] = useState(() => {
    const out = !!(open ?? defaultOpen);
    const hidden: CSSProperties = out ? {} : { opacity: 0, visibility: "hidden" };
    return {
      panel: hidden,
      inner: hidden,
      icon: out ? ({ opacity: 0, visibility: "hidden" } as CSSProperties) : {},
      triggerBody: out ? ({ opacity: 0, visibility: "hidden" } as CSSProperties) : {},
      goo: { opacity: 0, visibility: "hidden" } as CSSProperties,
    };
  });

  const getTriggerBits = useCallback(
    () => [blobTriggerRef.current, triggerBodyRef.current, iconRef.current],
    [],
  );

  const getPanelTrio = useCallback(
    () => [blobPanelRef.current, panelBodyRef.current, panelRef.current],
    [],
  );

  /* Blur + rim thresholds are ONE setting — see taffy-goo.ts. */
  const applyGooBlur = useCallback(
    (blur: number, tl?: TaffyTimeline, at = 0) =>
      setGooBlur(
        { blur: blurRef.current, rim: rimEdgeRef.current, inner: innerEdgeRef.current },
        blur,
        tl,
        at,
      ),
    [],
  );

  /* Exactly ONE shadow at any moment — the speed dial's rule. The goo casts
     its own while it owns the picture; the crisp bodies carry theirs on their
     container. At a handoff the bodies snap visible UNDER the still-opaque
     goo, so for the goo's fade both would cast — a doubled shadow that pulses
     dark. The goo's shadow switches off in the SAME frame the bodies snap on. */
  const setGooShadow = useCallback((on: boolean) => {
    if (gooRef.current) {
      gooRef.current.style.filter = on ? GOO_SHADOW : "none";
    }
  }, []);

  const liquidOn = useCallback(
    (blur: number) => {
      setGooShadow(true);
      taffySet(gooRef.current, { autoAlpha: 1 });
      taffySet(bodiesRef.current, { autoAlpha: 0 });
      applyGooBlur(blur);
      rootRef.current?.setAttribute("data-liquid", "");
    },
    [applyGooBlur, setGooShadow],
  );

  /* The neon catch, cleared: a row lit under the finger lets go the moment
     the picture is no longer the gesture's. */
  const clearRowNeon = useCallback(() => {
    litRowRef.current = null;
    itemRefs.current.forEach((item) => {
      if (item) {
        item.style.color = "";
        item.style.filter = "";
      }
    });
  }, []);

  /* The neon under the finger. Every tick of a live grab the head's position
     is read off its own matrix (same trick as the seam engine's) and the row
     it stands over catches its hue — glyph and label together, since a row IS
     its label. Reassigned every render so the hues follow the theme; the
     ticker calls through the ref. */
  const neonTickFnRef = useRef<() => void>(() => {});
  neonTickFnRef.current = () => {
    let lit: number | null = null;
    if (isOpenRef.current && rootRef.current?.hasAttribute("data-grab")) {
      const head = grabChainRefs.current[0];
      const matrix = head?.getCTM();
      if (head && matrix) {
        const cx = head.cx.baseVal.value;
        const cy = head.cy.baseVal.value;
        lit = rowUnderHead(
          matrix.a * cx + matrix.c * cy + matrix.e,
          matrix.b * cx + matrix.d * cy + matrix.f,
        );
      }
    }

    if (lit === litRowRef.current) {
      return;
    }
    litRowRef.current = lit;
    itemRefs.current.forEach((item, index) => {
      if (!item) {
        return;
      }
      /* No motif on the light frame: the pulled finger shows in the liquid
         alone, and the rows keep their own ink. */
      const shape = itemsRef.current[index]?.shape;
      const hue = shape ? motifHue(SHAPE_HUES[shape], theme) : null;
      const on = hue !== null && index === lit;
      item.style.color = on ? hue : "";
      item.style.filter = on && hue ? neonGlow(hue) : "";
    });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount only, see below
  useEffect(() => {
    taffySet(getPanelTrio(), {
      scale: PANEL_REST_SCALE,
      rotation: -2,
      transformOrigin: `${PANEL_ORIGIN_X}px ${PANEL_ORIGIN_Y}px`,
    });
    taffySet([panelBodyRef.current, panelRef.current], { autoAlpha: 0 });
    taffySet(itemInnerRefs.current, { autoAlpha: 0 });
    taffySet(blobTriggerRef.current, { transformOrigin: "50% 50%" });
    taffySet(grabChainRefs.current, { scale: 0, transformOrigin: "50% 50%" });
    taffySet(gooRef.current, { autoAlpha: 0 });
    taffySet(bodiesRef.current, { autoAlpha: 1 });
    /* Labs: a surface that mounts open (defaultOpen, or open) is placed open. */
    if (isOpenRef.current) {
      setStaticState(true);
    }

    const tick = () => neonTickFnRef.current();
    taffyTicker.add(tick);

    return () => {
      taffyTicker.remove(tick);
      timelineRef.current?.kill();
      pressTweenRef.current?.kill();
      stretchRef.current?.kill();
    };
    /* Mount only — see the speed dial: a re-run re-parks the panel at rest
       while `isOpen` still says open. Labs: re-placed when the row count
       changes the panel's size. */
  }, [getPanelTrio, rows]);

  const setStaticState = useCallback(
    (open: boolean) => {
      taffySet(getPanelTrio(), {
        scale: open ? 1 : PANEL_REST_SCALE,
        rotation: open ? 0 : -2,
        x: 0,
        y: 0,
      });
      taffySet([panelBodyRef.current, panelRef.current], { autoAlpha: open ? 1 : 0 });
      panelRef.current?.removeAttribute("data-wash");
      taffySet(panelRef.current, { [`--${P}--sel-alpha`]: 1 });
      taffySet(blobPanelRef.current, { autoAlpha: 1 });
      taffySet(itemInnerRefs.current, { autoAlpha: open ? 1 : 0, y: 0 });
      taffySet(getTriggerBits(), { scale: 1, x: 0, y: 0 });
      taffySet(triggerBodyRef.current, { autoAlpha: open ? 0 : 1 });
      taffySet(iconRef.current, { autoAlpha: open ? 0 : 1, filter: "blur(0px)" });
      taffySet(gooRef.current, { autoAlpha: 0 });
      taffySet(bodiesRef.current, { autoAlpha: 1 });
      clearRowNeon();
      rootRef.current?.removeAttribute("data-liquid");
      rootRef.current?.removeAttribute("data-grab");
    },
    [PANEL_REST_SCALE, clearRowNeon, getPanelTrio, getTriggerBits],
  );

  const clearInlineFills = useCallback(() => {
    [blobTriggerRef.current, blobPanelRef.current, ...grabChainRefs.current].forEach((blob) =>
      blob?.removeAttribute("fill"),
    );
  }, []);

  /* The grab is the family's ONE shared gesture (taffy-stretch.ts) — the
     speed dial's, verbatim. This component only tells the engine which pieces
     make up its picture and how to switch its goo on and hand it back off. */
  const restScaleRef = useRef(PANEL_REST_SCALE);
  restScaleRef.current = PANEL_REST_SCALE;
  if (stretchRef.current === null) {
    stretchRef.current = createLiquidStretch({
      buttonSize: BUTTON_SIZE,
      auxLean: 0.14,
      anchor: () => rootRef.current,
      triggerBits: getTriggerBits,
      triggerStretchBits: () => [blobTriggerRef.current, triggerBodyRef.current],
      triggerIcon: () => iconRef.current,
      chain: () => grabChainRefs.current,
      auxTrio: () => getPanelTrio(),
      liquidOn: (target) => {
        liquidOn(GOO_BLUR_GRAB);
        /* data-grab gates the neon ticker: this light is a gesture's
           feedback, not a state the component wears at rest. */
        rootRef.current?.setAttribute("data-grab", "");
        play("grab");

        /* A grab that lands MID-FLIGHT takes the picture over: the open/close
           run would otherwise hand the picture back to the crisp bodies a few
           hundred milliseconds into the gesture and take the liquid with it.
           Killed, then walked to wherever it was heading, so nothing is
           stranded half-open. */
        if (timelineRef.current?.isActive()) {
          timelineRef.current.kill();
          const settled = isOpenRef.current;
          /* ON the component's own timeline, not as loose tweens. openMenu and
             closeMenu begin by killing exactly this reference; tweens started
             outside it survive that kill and keep writing toward the state the
             interrupted run was heading for — which is how a click that
             reopened mid-close ended with the panel set visible and then
             dragged back to nothing a tenth of a second later. */
          const settle = taffyTimeline();
          timelineRef.current = settle;
          settle.to(
            getPanelTrio(),
            {
              scale: settled ? 1 : restScaleRef.current,
              rotation: settled ? 0 : -2,
              duration: 0.16,
              ease: OUT_STRONG,
              overwrite: "auto",
            },
            0,
          );
          settle.to(
            [panelBodyRef.current, panelRef.current],
            { autoAlpha: settled ? 1 : 0, duration: 0.12, ease: OUT_STRONG, overwrite: "auto" },
            0,
          );
          settle.to(
            itemInnerRefs.current,
            { autoAlpha: settled ? 1 : 0, y: 0, duration: 0.12, ease: OUT_STRONG, overwrite: "auto" },
            0,
          );
          settle.to(
            [iconRef.current, triggerBodyRef.current],
            { autoAlpha: settled ? 0 : 1, duration: 0.14, ease: OUT_STRONG, overwrite: "auto" },
            0,
          );
        }
        /* The shrunk panel parks INSIDE the circle while the menu is closed —
           and it must sit the grab out: it cannot ride the trigger's lean, so
           left in the goo it pokes out of the moving silhouette as a hump.
           That hump is what made this stretch look broken next to the speed
           dial's (whose hidden satellites are too small to surface).
           openMenu/closeMenu re-arm the alpha. */
        taffySet(blobPanelRef.current, {
          autoAlpha: target === "trigger" && !isOpenRef.current ? 0 : 1,
        });
      },
      handoff: (tl, at) => {
        play("release");
        /* The crisp bodies SNAP on underneath the still-opaque goo — the two
           pictures are identical, so nothing changes on screen — and only the
           goo fades. The goo's shadow hands over to the bodies' in the same
           frame, so the shadow never doubles during the fade. */
        tl.set(bodiesRef.current, { autoAlpha: 1 }, at);
        tl.call(() => setGooShadow(false), at);
        tl.to(gooRef.current, { autoAlpha: 0, duration: 0.15, ease: "power1.out" }, at);
        applyGooBlur(GOO_BLUR_REST, tl, at + 0.16);
        tl.call(() => setGooShadow(true), at + 0.16);
        tl.call(() => {
          rootRef.current?.removeAttribute("data-liquid");
          rootRef.current?.removeAttribute("data-grab");
          clearInlineFills();
          clearRowNeon();
        }, at + 0.15);
      },
    });
  }
  const stretch = stretchRef.current;

  /* A press on a row is felt by the WHOLE dropdown: the liquid mass gives a
     touch — sinking toward the button's spot it poured out of — and springs
     back to its own shape the moment the finger lets go. Crisp transforms, no goo:
     the deformation is a couple of percent, and the border under it never
     changes. */
  const pressPanel = useCallback(() => {
    if (prefersReducedMotion()) {
      return;
    }
    pressTweenRef.current?.kill();
    pressTweenRef.current = taffyTo(getPanelTrio(), {
      scaleX: 0.985,
      scaleY: 0.96,
      duration: 0.12,
      ease: OUT_STRONG,
      overwrite: "auto",
    });
  }, [getPanelTrio]);

  const releasePanelPress = useCallback(() => {
    if (prefersReducedMotion()) {
      return;
    }
    pressTweenRef.current?.kill();
    pressTweenRef.current = taffyTo(getPanelTrio(), {
      scaleX: 1,
      scaleY: 1,
      duration: 0.55,
      ease: SPRING,
      overwrite: "auto",
    });
  }, [getPanelTrio]);

  const handleItemPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }
      pressPanel();
      /* The window backstop, not the row: the release must land wherever the
         pointer lets go, even far outside the button. */
      window.addEventListener("pointerup", releasePanelPress, { once: true });
      window.addEventListener("pointercancel", releasePanelPress, { once: true });
    },
    [pressPanel, releasePanelPress],
  );

  const openMenu = useCallback(() => {
    timelineRef.current?.kill();
    pressTweenRef.current?.kill();
    stretch.kill();
    isOpenRef.current = true;
    setOpenState(true);

    if (prefersReducedMotion()) {
      setStaticState(true);
      return;
    }

    clearInlineFills();
    clearRowNeon();
    play("open");
    liquidOn(GOO_BLUR_ACTIVE);
    rootRef.current?.removeAttribute("data-grab");
    const triggerBits = getTriggerBits();
    const tl = taffyTimeline();
    timelineRef.current = tl;

    tl.set([panelBodyRef.current, panelRef.current], { autoAlpha: 1 }, 0);
    /* A run that was already ticked waits for its panel to ARRIVE. Lighting
       it from the first frame means the wash rides the whole pour — stretched
       and skewed with the shape it is painted on — and the panel appears to
       open already-used. It comes up once the shape has landed, so what you
       see is the dropdown, and then what is in it. */
    tl.call(() => panelRef.current?.setAttribute("data-wash", ""), 0);
    tl.set(panelRef.current, { [`--${P}--sel-alpha`]: 0 }, 0);
    tl.to(panelRef.current, { [`--${P}--sel-alpha`]: 1, duration: 0.22, ease: "power2.out" }, 0.22);
    tl.call(() => panelRef.current?.removeAttribute("data-wash"), 0.46);
    /* Re-arm the panel blob a closed-state grab may have hidden. */
    tl.set(blobPanelRef.current, { autoAlpha: 1 }, 0);
    tl.set(getPanelTrio(), { x: 0, y: 0 }, 0);
    tl.to(
      grabChainRefs.current,
      { x: 0, y: 0, scale: 0, duration: 0.12, ease: OUT_STRONG, overwrite: "auto" },
      0,
    );

    /* The button IS the drop, and the pour happens in two beats. First it
       stretches UPWARD — its mass visibly drawn into the pour, not a
       symmetric swell — while the glyph dissolves into the rising mass... */
    tl.to(
      triggerBits,
      { x: 0, y: -2, scaleX: 1.05, scaleY: 1.18, duration: 0.12, ease: OUT_STRONG },
      0,
    );
    tl.to(
      [blobTriggerRef.current, triggerBodyRef.current],
      { scale: 1, y: 0, duration: 0.34, ease: SPRING },
      0.14,
    );
    tl.to(
      iconRef.current,
      { autoAlpha: 0, filter: "blur(4px)", scaleX: 1, scaleY: 1, y: 0, duration: 0.14, ease: "power2.in" },
      0.04,
    );

    /* ...OOZE: the panel bulges heavily out of the circle — all surface
       tension, plainly readable — then LAUNCH: the pop spring fires it the
       rest of the way, height leading, width trailing by a jelly phase-lag,
       swinging upright from its resting tilt. */
    const trio = getPanelTrio();
    tl.to(trio, { scale: 0.38, duration: 0.13, ease: "power1.inOut" }, 0.02);
    tl.to(trio, { scaleY: 1, rotation: 0, duration: 0.32, ease: POP }, 0.15);
    tl.to(trio, { scaleX: 1, duration: 0.32, ease: POP }, 0.2);

    /* Rows condense bottom-up — the direction the panel grew. */
    /* The rows RISE only when they are actually away. A hard fromTo blanks
       them first, and on a reopen that interrupts a close — the rows still
       half on screen — that reads as the panel opening EMPTY and standing
       there until the entry beat comes round. Cold open: they are at nothing
       anyway, so the authored rise is unchanged. Warm: they simply finish
       coming up from wherever the interrupted close left them. */
    if (Number(taffyGetProperty(itemInnerRefs.current[0] ?? null, "opacity")) < 0.05) {
      tl.set(itemInnerRefs.current, { autoAlpha: 0, y: 10 }, 0);
    }
    tl.to(
      itemInnerRefs.current,
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.18,
        ease: BACK_OUT,
        stagger: { each: 0.03, from: "end" },
      },
      0.22,
    );

    /* The circle's crisp body retires (it lives INSIDE the panel now, but its
       shadow would peek below the panel's bottom edge). */
    tl.set(triggerBodyRef.current, { autoAlpha: 0 }, 0.34);

    /* Handoff at full blur, once the pour has mostly rung itself out. The
       bodies snap on UNDER the still-opaque goo; the shadow changes hands in
       the same frame (see setGooShadow). */
    tl.set(bodiesRef.current, { autoAlpha: 1 }, 0.5);
    tl.call(() => setGooShadow(false), 0.5);
    tl.to(gooRef.current, { autoAlpha: 0, duration: 0.14, ease: "power1.out" }, 0.5);
    applyGooBlur(GOO_BLUR_REST, tl, 0.66);
    tl.call(() => setGooShadow(true), 0.66);
    tl.call(() => rootRef.current?.removeAttribute("data-liquid"), 0.65);
  }, [applyGooBlur, clearInlineFills, clearRowNeon, getPanelTrio, getTriggerBits, liquidOn, play, setGooShadow, setStaticState, stretch]);

  const closeMenu = useCallback(
    (_fromTrigger: boolean) => {
      timelineRef.current?.kill();
      pressTweenRef.current?.kill();
      stretch.kill();
      isOpenRef.current = false;
      setOpenState(false);

      if (prefersReducedMotion()) {
        setStaticState(false);
        return;
      }

      clearInlineFills();
      clearRowNeon();
      play("close");
      liquidOn(GOO_BLUR_ACTIVE);
      rootRef.current?.removeAttribute("data-grab");
      const triggerBits = getTriggerBits();
      const tl = taffyTimeline();
      timelineRef.current = tl;

      tl.set(triggerBodyRef.current, { autoAlpha: 1 }, 0);
      /* Re-arm the panel blob a closed-state grab may have hidden. */
      tl.set(blobPanelRef.current, { autoAlpha: 1 }, 0);
      /* The selection wash goes out FIRST — the panel must be plain before it
         folds back into the circle. */
      tl.call(() => panelRef.current?.setAttribute("data-wash", ""), 0);
      tl.to(panelRef.current, { [`--${P}--sel-alpha`]: 0, duration: 0.11, ease: "power2.in" }, 0);
      tl.to(
        grabChainRefs.current,
        { x: 0, y: 0, scale: 0, duration: 0.1, ease: OUT_STRONG, overwrite: "auto" },
        0,
      );

      /* The exit takes a breath first: the panel GATHERS itself — the
         anticipate curve winds each axis ~7% outward, surface tension pulling
         the mass in — then necks and dives back into the button's spot, width
         leading, height trailing by the same jelly phase-lag the pour used. */
      const trio = getPanelTrio();
      tl.to(trio, { x: 0, y: 0, duration: 0.12, ease: OUT_STRONG }, 0);
      tl.to(trio, { scaleX: 0.32, duration: 0.16, ease: ANTICIPATE }, 0);
      tl.to(trio, { scaleY: 0.36, rotation: -2, duration: 0.16, ease: ANTICIPATE }, 0.045);
      /* The rows dissolve only once the dive is visibly under way — during the
         wind-up they ride the gathering panel, which is what sells it. */
      tl.to(
        itemInnerRefs.current,
        { autoAlpha: 0, y: 4, duration: 0.06, ease: "power1.in", stagger: 0.005 },
        0.05,
      );
      tl.to(
        trio,
        { scale: restScaleRef.current, duration: 0.07, ease: "power2.in", overwrite: "auto" },
        0.21,
      );
      tl.set([panelBodyRef.current, panelRef.current], { autoAlpha: 0 }, 0.28);

      /* ...the button re-forms out of the impact — the whole panel is a heavier
         drop than the dial's satellites, so the splat digs deeper: splat, slosh,
         ring, and the plus condenses back out of a blur. */
      tl.to(
        triggerBits,
        {
          keyframes: [
            { scaleX: 1.2, scaleY: 0.82, duration: 0.06, ease: "power2.out" },
            { scaleX: 0.94, scaleY: 1.07, duration: 0.08, ease: "power1.inOut" },
            { scaleX: 1, scaleY: 1, duration: 0.28, ease: SPRING },
          ],
          overwrite: "auto",
        },
        0.24,
      );
      tl.to(
        iconRef.current,
        { autoAlpha: 1, filter: "blur(0px)", duration: 0.18, ease: OUT_STRONG },
        0.26,
      );

      tl.set(bodiesRef.current, { autoAlpha: 1 }, 0.34);
      tl.call(() => setGooShadow(false), 0.34);
      tl.to(gooRef.current, { autoAlpha: 0, duration: 0.12, ease: "power1.out" }, 0.34);
      applyGooBlur(GOO_BLUR_REST, tl, 0.47);
      tl.call(() => setGooShadow(true), 0.47);
      tl.call(() => rootRef.current?.removeAttribute("data-liquid"), 0.46);
    },
    [applyGooBlur, clearInlineFills, clearRowNeon, getPanelTrio, getTriggerBits, liquidOn, play, setGooShadow, setStaticState, stretch],
  );

  /* Labs: one door for every way the panel opens or closes — the trigger,
     Escape, a press outside, the keyboard, or the `open` prop. */
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const fromTriggerRef = useRef(false);
  const requestOpen = useCallback(
    (next: boolean) => {
      if (next === isOpenRef.current) {
        return;
      }
      if (next) {
        openMenu();
      } else {
        closeMenu(fromTriggerRef.current);
      }
      fromTriggerRef.current = false;
      onOpenChangeRef.current?.(next);
    },
    [closeMenu, openMenu],
  );

  /* Labs: a controlled `open` plays the same choreography. */
  useEffect(() => {
    if (open === undefined || open === isOpenRef.current) {
      return;
    }
    if (open) {
      openMenu();
    } else {
      closeMenu(false);
    }
  }, [closeMenu, open, openMenu]);

  /* The click that ends a press-and-drag is swallowed (taffy-stretch.ts);
     a plain click toggles. */
  const handleTriggerClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (stretch.consumeClick()) {
        event.preventDefault();
        return;
      }
      fromTriggerRef.current = true;
    },
    [stretch],
  );

  /* The gesture itself lives in the shared engine — these are just the wires
     from React's pointer events into it. */
  const releasePress = useCallback(() => stretch.release(), [stretch]);

  const handleTriggerPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      stretch.beginGrab("trigger", event, { x: 0, y: 0 });
    },
    [stretch],
  );

  /* Grabbing the panel: same sponge, measured from the grab point itself.
     But NOT from a row — a press there is a selection gesture: the pointer
     capture a grab takes would retarget the click to the panel and the row
     would never hear it (which is exactly what made rows feel dead: press,
     a slight lean, release, nothing). Rows press; the panel's own padding
     grabs. */
  const handlePanelPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!isOpenRef.current) {
        return;
      }
      if ((event.target as Element).closest('[role="menuitemcheckbox"]')) {
        return;
      }
      const anchorRect = rootRef.current?.getBoundingClientRect();
      if (!anchorRect) {
        return;
      }
      stretch.beginGrab(0, event, {
        x: event.clientX - (anchorRect.left + BUTTON_SIZE / 2),
        y: event.clientY - (anchorRect.top + BUTTON_SIZE / 2),
      });
    },
    [stretch],
  );

  const handleGrabPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => stretch.pointerMove(event),
    [stretch],
  );

  /* A row click TOGGLES its tick — the menu stays up: multi-select means
     the conversation is not over after one answer. Outside click and Escape
     still close. */
  const handleItemClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (stretch.consumeClick()) {
        event.preventDefault();
      }
    },
    [stretch],
  );

  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;
  const valueRef = useRef(currentValue);
  valueRef.current = currentValue;
  const toggleItem = useCallback(
    (id: string, on: boolean) => {
      play("tick");
      const next = itemsRef.current
        .map((item) => item.id)
        .filter((itemId) => (itemId === id ? on : valueRef.current.includes(itemId)));
      valueRef.current = next;
      setValueState(next);
      onValueChangeRef.current?.(next);
    },
    [play],
  );

  /* A panel can open UNDER a cursor that never moves — no enter event is
     ever fired, so the travelling pill would sit dark under a row whose
     glyph is already lit by CSS :hover. The DOM knows who is hovered; ask
     it once, the moment the rows exist. */
  useEffect(() => {
    if (!isOpen) {
      setHoveredRow(null);
      setFocusedRow(null);
      return;
    }
    const row = panelRef.current?.querySelector<HTMLElement>('[role="menuitemcheckbox"]:hover');
    if (row?.dataset.rowIndex) {
      setHoveredRow(Number(row.dataset.rowIndex));
    }
  }, [isOpen]);

  return (
    <TaffyMenuRoot open={isOpen} onOpenChange={requestOpen} containerRef={rootRef}>
      <div
        ref={rootRef}
        className={className ? `${P}-anchor ${className}` : `${P}-anchor`}
        data-theme={theme}
        data-state={isOpen ? "open" : "closed"}
      >
        <style href={`designfrom-${P}`} precedence="default">
          {STYLES}
        </style>
        {/* Layer 0: the full-set burst — painted BEFORE every body, so its
            glyph pieces fly BEHIND the dropdown: the panel itself is the
            curtain they leap from and dive back behind. */}
        <SelectionBurst
          active={rows > 0 && selected.every(Boolean)}
          open={isOpen}
          panel={{
            left: -(PANEL_WIDTH - BUTTON_SIZE) / 2,
            bottom: 0,
            width: PANEL_WIDTH,
            height: PANEL_HEIGHT,
          }}
          theme={theme}
          prefix={P}
          onCheer={() => play("cheer")}
        />

        {/* Layer 1: crisp bodies — the resting picture. */}
        <div ref={bodiesRef} className={`${P}-bodies`} aria-hidden="true">
          <div ref={triggerBodyRef} className={`${P}-trigger-body`} style={initial.triggerBody} />
          <svg
            ref={panelBodyRef}
            className={`${P}-panel-body`}
            width={PANEL_WIDTH}
            height={PANEL_HEIGHT}
            viewBox={`0 0 ${PANEL_WIDTH} ${PANEL_HEIGHT}`}
            focusable="false"
            style={initial.panel}
          >
            <path
              className={`${P}-panel-body-shape`}
              d={squirclePath(0.5, 0.5, PANEL_WIDTH - 1, PANEL_HEIGHT - 1, PANEL_RADIUS)}
            />
          </svg>
        </div>

        {/* Layer 2: the liquid. */}
        <svg
          ref={gooRef}
          className={`${P}-goo`}
          width={GOO_WIDTH}
          height={GOO_HEIGHT}
          viewBox={`0 0 ${GOO_WIDTH} ${GOO_HEIGHT}`}
          style={{ filter: GOO_SHADOW, ...initial.goo }}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            {/* The filter region is the WHOLE canvas, in user units — not a
                percentage of the group's bounding box. A percentage region is
                measured off whatever the blobs currently occupy, and at rest
                that is one 32px circle: 15% of it is ~5px of margin, while the
                grab blur needs three σ — 15px — before its tail reaches zero.
                Everything past that margin was cut off, so a pulled finger lost
                the soft outside of its head and its rim died on a straight
                edge — the drop looked dented, and the button with it. It also
                moved: the box grows as the finger extends, so the crop crawled
                while you dragged. A fixed region does neither. */}
            <filter
              id={gooId}
              filterUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={GOO_WIDTH}
              height={GOO_HEIGHT}
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur
                ref={blurRef}
                in="SourceGraphic"
                stdDeviation={GOO_BLUR_REST}
                result="blur"
              />
              {/* The outer contour IS the border's outer edge; the inner one is
                  a hair inside it, and the sliver between them is the rim that
                  stands in for the 1px CSS border. Both offsets ride
                  GOO_THRESHOLDS — they are re-solved for every blur the liquid
                  runs at, so the border keeps its weight and its place whether
                  the button is resting, opening or being pulled. */}
              <feColorMatrix
                ref={rimEdgeRef}
                in="blur"
                type="matrix"
                values={gooThreshold(GOO_RIM_THRESHOLDS[GOO_BLUR_REST][0])}
                result="goo"
              />
              <feColorMatrix
                ref={innerEdgeRef}
                in="blur"
                type="matrix"
                values={gooThreshold(GOO_RIM_THRESHOLDS[GOO_BLUR_REST][1])}
                result="inner"
              />
              {/* The rim's colour is the theme's, read off the anchor: the
                  flood has to be the SAME solid the crisp CSS border wears, or
                  the two pictures the component crossfades between would not
                  match. */}
              <feFlood style={{ floodColor: RIM_COLOR }} result="rimColor" />
              <feComposite in="rimColor" in2="goo" operator="in" result="rimFull" />
              <feMerge>
                <feMergeNode in="rimFull" />
                <feMergeNode in="inner" />
              </feMerge>
            </filter>

          </defs>
          <g filter={`url(#${gooId})`}>
            <circle
              ref={blobTriggerRef}
              className={`${P}-blob`}
              cx={TRIGGER_CX}
              cy={TRIGGER_CY}
              r={BUTTON_SIZE / 2}
            />
            {GRAB_CHAIN.map((link, index) => (
              <circle
                key={link.follow}
                ref={(el) => {
                  grabChainRefs.current[index] = el;
                }}
                className={`${P}-blob`}
                cx={TRIGGER_CX}
                cy={TRIGGER_CY}
                r={11}
              />
            ))}
            <path
              ref={blobPanelRef}
              className={`${P}-blob`}
              d={squirclePath(PANEL_GOO_X, PANEL_GOO_Y, PANEL_WIDTH, PANEL_HEIGHT, PANEL_RADIUS)}
            />
          </g>

        </svg>

        {/* Layer 3: rows and hit areas above the liquid. */}
        <TaffyMenuList
          ref={panelRef}
          className={`${P}-panel`}
          label={menuLabel}
          style={{ height: PANEL_HEIGHT, ...initial.panel }}
          onPointerDown={handlePanelPointerDown}
          onPointerMove={handleGrabPointerMove}
          onPointerUp={releasePress}
          onPointerCancel={releasePress}
          onPointerLeave={() => setHoveredRow(null)}
        >
          {/* The hover travels UNDER the rows — one highlight for the list, not
              a state painted on each row. */}
          <RowHover
            index={hoveredRow ?? focusedRow}
            rowHeight={ROW_HEIGHT}
            inset={PANEL_PADDING}
            className={`${P}-hover`}
          />

          {items.map((item, index) => (
            <TaffyMenuCheckboxItem
              key={item.id}
              ref={(el: HTMLElement | null) => {
                itemRefs.current[index] = el;
              }}
              checked={selected[index]}
              onCheckedChange={(on) => toggleItem(item.id, on)}
              textValue={item.label}
              data-selected={selected[index] ? "" : undefined}
              className={`${P}-item`}
              style={rowSelectionStyle(P, selected, index, rowHues)}
              data-row-index={index}
              onClick={handleItemClick}
              onPointerDown={handleItemPointerDown}
              onPointerEnter={() => setHoveredRow(index)}
              /* Enter alone is not enough: a pointer that never crossed a
                 boundary (it was already here, or it came back from a drag)
                 fires none. Setting the same index again is free — React
                 bails on an unchanged value. */
              onPointerMove={() => setHoveredRow(index)}
              onFocus={(event) => {
                setFocusedRow(event.currentTarget.matches(":focus-visible") ? index : null);
              }}
              onBlur={() => setFocusedRow((row) => (row === index ? null : row))}
            >
              {/* The content rides its own wrapper: the entry stagger animates
                  THIS, never the button — the selection wash lives on the
                  button and must stay one piece with its neighbours. */}
              <span
                ref={(el) => {
                  itemInnerRefs.current[index] = el;
                }}
                className={`${P}-item-inner`}
                style={initial.inner}
              >
                <IconMorph shape={item.shape} checked={selected[index]} className={`${P}-item-icon`} />
                <span className={`${P}-item-label`}>{item.label}</span>
              </span>
            </TaffyMenuCheckboxItem>
          ))}
        </TaffyMenuList>

        <TaffyMenuTrigger
          className={`${P}-trigger`}
          aria-label={label}
          openOnly
          inert={isOpen}
          onClick={handleTriggerClick}
          onPointerDown={handleTriggerPointerDown}
          onPointerMove={handleGrabPointerMove}
          onPointerUp={releasePress}
          onPointerLeave={releasePress}
          onPointerCancel={releasePress}
        >
          <span ref={iconRef} className={`${P}-trigger-icon`} style={initial.icon}>
            <PlusIcon />
          </span>
        </TaffyMenuTrigger>
      </div>
    </TaffyMenuRoot>
  );
}

/* The palette, through the component's tokens (upstream's values as the
   fallbacks). */
const GOO_SHADOW = `var(--${P}-shadow, drop-shadow(0 3px 3.125px rgb(0 0 0 / 8%)))`;
const RIM_COLOR = `var(--${P}-rim, #dadada)`;
