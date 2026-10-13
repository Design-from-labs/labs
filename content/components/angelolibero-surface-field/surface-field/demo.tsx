"use client";

import * as React from "react";

import {
  createSurfaceFieldController,
  SurfaceField,
  type SurfaceFieldRect,
} from "@/components/ui/surface-field";
import { cn } from "@/lib/utils";

// The upstream demo's playground: three surfaces (a note, a tilted label and a
// round one) on a field of dots and lines. Click one to select it, then drag,
// resize or turn it; the field clears around it and bends as it moves. The
// presets are the upstream demo's four, with its values.

type ObjectId = "note" | "label" | "swatch";
// x and y are fractions of the stage's border box; width and height are CSS
// pixels; rotation is degrees, clockwise.
type Geometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};
type Layout = Record<ObjectId, Geometry>;
// What the hand holds: the body moves, a corner or an edge resizes (sx and sy
// say which sides of the box follow it), a turn zone rotates.
type Grip =
  | { kind: "move" }
  | { kind: "resize"; sx: -1 | 0 | 1; sy: -1 | 0 | 1 }
  | { kind: "rotate" };
// Pointer coordinates are viewport CSS pixels; the box is in layout pixels with
// the page position and the scale between them; origin uses Geometry.
type Gesture = {
  id: ObjectId;
  grip: Grip;
  pointerId: number;
  clientX: number;
  clientY: number;
  origin: Geometry;
  box: Box;
  moved: boolean;
};

const INITIAL_LAYOUT: Layout = {
  note: { x: 0.44, y: 0.22, width: 254, height: 174, rotation: 0 },
  label: { x: 0.66, y: 0.1, width: 174, height: 90, rotation: -6 },
  swatch: { x: 0.6, y: 0.62, width: 136, height: 136, rotation: 0 },
};
// The surfaces were drawn for a tall canvas; on a short stage (the gallery's)
// their sizes shrink to fit, and from 640px up they are upstream's.
const fitScale = (height: number) => Math.min(1, Math.max(0.5, height / 640));
const DEMO_STAGE_HEIGHT = 340;
const scaledLayout = (scale: number): Layout => {
  const next = structuredClone(INITIAL_LAYOUT);
  for (const id of Object.keys(next) as ObjectId[]) {
    next[id].width = Math.round(next[id].width * scale);
    next[id].height = Math.round(next[id].height * scale);
  }
  return next;
};
// What each surface is besides its box and its turn. The field is told the same
// shape the card wears, so a round card clears a round hole.
const LOOKS: Record<ObjectId, Pick<SurfaceFieldRect, "shape">> = {
  note: {},
  label: {},
  swatch: { shape: "ellipse" },
};
const NAMES: Record<ObjectId, string> = {
  note: "Note",
  label: "Label",
  swatch: "Round",
};
const OBJECT_IDS: ObjectId[] = ["note", "label", "swatch"];
const MIN_SIZE = { width: 72, height: 56 };
const INSET = 12;
// A press that travels less than this is a click that selects, not a drag.
const DRAG_SLOP = 3;
const CORNERS = [
  ["nw", -1, -1],
  ["ne", 1, -1],
  ["se", 1, 1],
  ["sw", -1, 1],
] as const;
const EDGES = [
  ["n", 0, -1],
  ["e", 1, 0],
  ["s", 0, 1],
  ["w", -1, 0],
] as const;

export type SurfaceFieldDemoConfig = {
  gap: number;
  focusRadius: number;
  lineRadius: number;
  baseOpacity: number;
  maxOpacity: number;
  connected: boolean;
  cursorPush: number;
  ripplePush: number;
  surfacePadding: number;
  tint: number;
  breathe: number;
  breatheRate: number;
  wander: boolean;
  still: boolean;
};

export const SURFACE_FIELD_PRESETS = {
  workspace: {
    gap: 22,
    focusRadius: 250,
    lineRadius: 200,
    baseOpacity: 0.02,
    maxOpacity: 0.2,
    connected: true,
    cursorPush: 2,
    ripplePush: 6,
    surfacePadding: 0,
    tint: 0,
    breathe: 0,
    breatheRate: 1,
    wander: false,
    still: false,
  },
  ambient: {
    gap: 25,
    focusRadius: 360,
    lineRadius: 100,
    baseOpacity: 0.04,
    maxOpacity: 0.3,
    connected: false,
    cursorPush: 0,
    ripplePush: 4,
    surfacePadding: 0,
    tint: 0.35,
    breathe: 0.4,
    breatheRate: 0.8,
    wander: true,
    still: false,
  },
  mesh: {
    gap: 19,
    focusRadius: 460,
    lineRadius: 180,
    baseOpacity: 0.03,
    maxOpacity: 0.25,
    connected: true,
    cursorPush: 7,
    ripplePush: 9,
    surfacePadding: 0,
    tint: 0.22,
    breathe: 0.18,
    breatheRate: 1.2,
    wander: false,
    still: false,
  },
  still: {
    gap: 28,
    focusRadius: 440,
    lineRadius: 140,
    baseOpacity: 0.03,
    maxOpacity: 0.13,
    connected: true,
    cursorPush: 0,
    ripplePush: 0,
    surfacePadding: 0,
    tint: 0.12,
    breathe: 0,
    breatheRate: 1,
    wander: false,
    still: true,
  },
} satisfies Record<string, SurfaceFieldDemoConfig>;

type PresetName = keyof typeof SURFACE_FIELD_PRESETS;
const PRESET_LABELS: Record<PresetName, string> = {
  workspace: "Workspace",
  ambient: "Ambient",
  mesh: "Mesh",
  still: "Still",
};

// A turn kept in (-180, 180], so a card spun twice reads -6 and not 714.
const wrap = (deg: number) => {
  const d = ((deg % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
};
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));
// The stage's layout size (what the cards are placed in) and where and how
// large it is on screen: a gallery tile scales the whole demo down, and the
// field wants screen pixels while the cards live in layout pixels.
type Box = {
  left: number;
  top: number;
  width: number;
  height: number;
  k: number;
};
const measure = (element: HTMLElement): Box => {
  const rect = element.getBoundingClientRect();
  const width = element.offsetWidth || rect.width;
  return {
    left: rect.left,
    top: rect.top,
    width,
    height: element.offsetHeight || rect.height,
    k: width > 0 ? rect.width / width : 1,
  };
};
const rectFor = (geometry: Geometry, box: Box) => {
  const width = Math.min(geometry.width, Math.max(1, box.width - INSET * 2));
  const height = Math.min(geometry.height, Math.max(1, box.height - INSET * 2));
  return {
    left: clamp(geometry.x * box.width, INSET, box.width - width - INSET),
    top: clamp(geometry.y * box.height, INSET, box.height - height - INSET),
    width,
    height,
  };
};
const place = (
  element: HTMLElement,
  rect: ReturnType<typeof rectFor>,
  rotation: number,
) => {
  element.style.left = `${rect.left}px`;
  element.style.top = `${rect.top}px`;
  element.style.width = `${rect.width}px`;
  element.style.height = `${rect.height}px`;
  element.style.transform = rotation ? `rotate(${rotation}deg)` : "";
};

// A resting plate: flat paper, a hairline ring and a soft cast.
const CARD =
  "absolute z-[2] select-none touch-none cursor-default rounded-2xl border border-foreground/10 bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_22px_rgb(0_0_0/0.06)] outline-none transition-shadow duration-150 hover:shadow-[0_3px_8px_rgb(0_0_0/0.05),0_14px_32px_rgb(0_0_0/0.09)] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none dark:shadow-[0_1px_3px_rgb(0_0_0/0.18),0_12px_44px_rgb(0_0_0/0.22)]";
const SELECTION_INK = "color-mix(in oklab, var(--foreground) 62%, transparent)";

/** The playground: three surfaces on a full-bleed field. */
export function SurfaceFieldStage({
  config,
  linkRow = false,
  resetKey = 0,
  className,
}: {
  config: SurfaceFieldDemoConfig;
  linkRow?: boolean;
  /** Changing it puts the surfaces back where they started. */
  resetKey?: number;
  className?: string;
}) {
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const selectionRef = React.useRef<HTMLDivElement>(null);
  const controller = React.useMemo(createSurfaceFieldController, []);
  const layout = React.useRef<Layout>(
    scaledLayout(fitScale(DEMO_STAGE_HEIGHT)),
  );
  // Whether the layout has been sized to the stage yet (see fitScale).
  const fitted = React.useRef(false);
  const gesture = React.useRef<Gesture | null>(null);
  const [selected, setSelected] = React.useState<ObjectId | null>(null);
  // Read once per card: the radius is a token and does not move while a card does.
  const radii = React.useRef(new Map<ObjectId, number>());
  const shapeOf = (id: ObjectId, element?: HTMLElement | null, k = 1) => {
    let radius = radii.current.get(id);
    if (radius === undefined && element) {
      radius = Number.parseFloat(getComputedStyle(element).borderTopLeftRadius);
      radius = Number.isNaN(radius) ? 0 : radius;
      radii.current.set(id, radius);
    }
    return {
      radius: radius === undefined ? undefined : radius * k,
      ...LOOKS[id],
      rotation: layout.current[id].rotation || undefined,
    };
  };

  const paintLayout = (known?: Box) => {
    const root = canvasRef.current;
    if (!root) {
      return;
    }
    const box = known ?? measure(root);
    if (!fitted.current) {
      fitted.current = true;
      layout.current = scaledLayout(fitScale(box.height));
    }
    const rects = OBJECT_IDS.flatMap((id) => {
      const element = root.querySelector<HTMLElement>(
        `[data-field-object="${id}"]`,
      );
      if (!element) {
        return [];
      }
      const rect = rectFor(layout.current[id], box);
      place(element, rect, layout.current[id].rotation);
      return [
        {
          id,
          parent: null,
          left: rect.left * box.k,
          top: rect.top * box.k,
          right: (rect.left + rect.width) * box.k,
          bottom: (rect.top + rect.height) * box.k,
          ...shapeOf(id, element, box.k),
        },
      ];
    });
    const frame = selectionRef.current;
    const held = frame?.dataset.id as ObjectId | undefined;
    if (frame && held) {
      place(
        frame,
        rectFor(layout.current[held], box),
        layout.current[held].rotation,
      );
    }
    controller.setScene({ root, rects });
  };

  // The reset puts the surfaces back where they started.
  const lastReset = React.useRef(resetKey);
  // biome-ignore lint/correctness/useExhaustiveDependencies: paintLayout is recreated every render and reads refs; only the key triggers a reset
  React.useEffect(() => {
    if (lastReset.current === resetKey) {
      return;
    }
    lastReset.current = resetKey;
    fitted.current = false;
    setSelected(null);
    paintLayout();
  }, [resetKey]);

  // The three surfaces in a row, label to note to the round one, routed by id so
  // the links follow their surfaces. One sequence: a single wave runs the row.
  React.useEffect(() => {
    if (!linkRow) {
      controller.setLinks(null);
      return;
    }
    const wave = {
      motion: "loop",
      speed: 220,
      strength: 1.5,
      width: 56,
      sequence: "row",
    } as const;
    controller.setLinks([
      { from: "label", to: "note", ...wave },
      { from: "note", to: "swatch", ...wave },
    ]);
    return () => controller.setLinks(null);
  }, [controller, linkRow]);

  React.useLayoutEffect(() => {
    paintLayout();
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: paintLayout reads refs and is recreated each render; the observer is made once
  React.useEffect(() => {
    const root = canvasRef.current;
    if (!root) {
      return;
    }
    const observer = new ResizeObserver(() => paintLayout());
    observer.observe(root);
    return () => {
      observer.disconnect();
      controller.setScene(null);
    };
  }, [controller]);

  const sendFootprint = (
    id: ObjectId,
    pointerId: number,
    box: Box,
    initial = false,
  ) => {
    const rect = rectFor(layout.current[id], box);
    controller.setFootprint({
      pointerId,
      ids: [id],
      initial: initial || undefined,
      suppressRipple: true,
      rects: [
        {
          left: box.left + rect.left * box.k,
          top: box.top + rect.top * box.k,
          right: box.left + (rect.left + rect.width) * box.k,
          bottom: box.top + (rect.top + rect.height) * box.k,
          ...shapeOf(id, undefined, box.k),
        },
      ],
    });
  };

  const begin = (
    id: ObjectId,
    grip: Grip,
    event: React.PointerEvent<HTMLElement>,
  ) => {
    if (event.button !== 0 || gesture.current) {
      return;
    }
    if (!canvasRef.current) {
      return;
    }
    const box = measure(canvasRef.current);
    event.preventDefault();
    event.stopPropagation();
    setSelected(id);
    // Kept from the stage's own press, which would let go of the selection; the
    // field still hears the press, it listens on the window.
    gesture.current = {
      id,
      grip,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      origin: { ...layout.current[id] },
      box,
      moved: grip.kind !== "move",
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    sendFootprint(id, event.pointerId, box, true);
  };
  const drag = (event: React.PointerEvent<HTMLElement>) => {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) {
      return;
    }
    // The hand moves in screen pixels, the cards in layout pixels.
    const dx = (event.clientX - active.clientX) / active.box.k;
    const dy = (event.clientY - active.clientY) / active.box.k;
    if (!active.moved) {
      if (Math.hypot(dx, dy) < DRAG_SLOP) {
        return;
      }
      active.moved = true;
    }
    const { box, origin, grip } = active;
    const next = layout.current[active.id];
    const from = rectFor(origin, box);
    const cx = from.left + from.width / 2;
    const cy = from.top + from.height / 2;
    if (grip.kind === "move") {
      next.x =
        clamp(from.left + dx, INSET, box.width - next.width - INSET) /
        box.width;
      next.y =
        clamp(from.top + dy, INSET, box.height - next.height - INSET) /
        box.height;
    } else if (grip.kind === "rotate") {
      // The turn is the angle the hand sweeps about the card's centre, added to
      // the one it started at; Shift lands on 15 degree steps.
      const px = box.left + cx * box.k;
      const py = box.top + cy * box.k;
      const swept =
        Math.atan2(event.clientY - py, event.clientX - px) -
        Math.atan2(active.clientY - py, active.clientX - px);
      const turn = origin.rotation + (swept * 180) / Math.PI;
      next.rotation = wrap(event.shiftKey ? Math.round(turn / 15) * 15 : turn);
    } else {
      // A resize is read in the card's own frame: the hand's travel is turned
      // back by the card's angle, the sides the grip owns follow it, and the
      // centre moves by half of what they gained, turned forward again.
      const a = (origin.rotation * Math.PI) / 180;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const du = cos * dx + sin * dy;
      const dv = cos * dy - sin * dx;
      const width = grip.sx
        ? Math.max(MIN_SIZE.width, from.width + grip.sx * du)
        : from.width;
      const height = grip.sy
        ? Math.max(MIN_SIZE.height, from.height + grip.sy * dv)
        : from.height;
      const lx = (grip.sx * (width - from.width)) / 2;
      const ly = (grip.sy * (height - from.height)) / 2;
      const nx = cx + cos * lx - sin * ly;
      const ny = cy + sin * lx + cos * ly;
      next.width = width;
      next.height = height;
      next.x = (nx - width / 2) / box.width;
      next.y = (ny - height / 2) / box.height;
    }
    paintLayout(box);
    sendFootprint(active.id, event.pointerId, box);
  };
  const end = (event: React.PointerEvent<HTMLElement>) => {
    if (gesture.current?.pointerId === event.pointerId) {
      gesture.current = null;
    }
  };
  // A press on the bare field lets go of the selection; the field still answers
  // it with its ring.
  const onStageDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !(event.target as Element).closest(
        "[data-field-object], [data-selection]",
      )
    ) {
      setSelected(null);
    }
  };
  // The keyboard holds a card the way the hand does: focus selects it, the
  // arrows move it 12px (1px with Shift), Escape lets go. The arrows are
  // physical directions, like the surfaces' coordinates.
  const onCardKey = (id: ObjectId, event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      setSelected(null);
      event.currentTarget.blur();
      return;
    }
    const delta = (
      {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      } as Record<string, [number, number]>
    )[event.key];
    if (!delta) {
      return;
    }
    event.preventDefault();
    if (!canvasRef.current) {
      return;
    }
    const box = measure(canvasRef.current);
    const step = event.shiftKey ? 1 : 12;
    const item = layout.current[id];
    const rect = rectFor(item, box);
    item.x =
      clamp(
        rect.left + delta[0] * step,
        INSET,
        box.width - rect.width - INSET,
      ) / box.width;
    item.y =
      clamp(
        rect.top + delta[1] * step,
        INSET,
        box.height - rect.height - INSET,
      ) / box.height;
    paintLayout(box);
  };
  const grip = (id: ObjectId, value: Grip) => ({
    onPointerDown: (event: React.PointerEvent<HTMLElement>) =>
      begin(id, value, event),
    onPointerMove: drag,
    onPointerUp: end,
    onPointerCancel: end,
  });

  return (
    <div
      ref={canvasRef}
      data-slot="surface-field-stage"
      // Neutral by default, as upstream's demo: the light blends toward the
      // dots' own ink, so a tint above 0 adds no hue.
      style={
        {
          "--surface-field-tint": "var(--surface-field-ink)",
        } as React.CSSProperties
      }
      className={cn(
        "relative isolate h-[340px] w-full overflow-hidden rounded-xl border bg-background",
        className,
      )}
      onPointerDown={onStageDown}
    >
      <SurfaceField
        {...config}
        controller={controller}
        interactionRoot={canvasRef}
        style={{ position: "absolute", inset: 0 }}
      />
      {OBJECT_IDS.map((id) => (
        <button
          type="button"
          key={id}
          data-field-object={id}
          // The server render and the first paint, before the layout effect
          // places the card in pixels.
          style={{
            left: `${INITIAL_LAYOUT[id].x * 100}%`,
            top: `${INITIAL_LAYOUT[id].y * 100}%`,
            width: Math.round(
              INITIAL_LAYOUT[id].width * fitScale(DEMO_STAGE_HEIGHT),
            ),
            height: Math.round(
              INITIAL_LAYOUT[id].height * fitScale(DEMO_STAGE_HEIGHT),
            ),
            transform: INITIAL_LAYOUT[id].rotation
              ? `rotate(${INITIAL_LAYOUT[id].rotation}deg)`
              : undefined,
          }}
          aria-label={`${NAMES[id]} surface. Arrow keys move it.`}
          aria-pressed={selected === id}
          className={cn(CARD, LOOKS[id].shape === "ellipse" && "rounded-full")}
          onFocus={() => setSelected(id)}
          onKeyDown={(event) => onCardKey(id, event)}
          {...grip(id, { kind: "move" })}
        />
      ))}
      {selected ? (
        <div
          ref={selectionRef}
          data-selection=""
          data-id={selected}
          aria-hidden="true"
          className="pointer-events-none absolute z-[3]"
          style={{ boxShadow: `0 0 0 1.5px ${SELECTION_INK}` }}
        >
          {EDGES.map(([side, sx, sy]) => (
            <span
              key={side}
              className="pointer-events-auto absolute touch-none"
              style={{
                ...(sx
                  ? {
                      top: 6,
                      bottom: 6,
                      width: 10,
                      left: sx < 0 ? 0 : "100%",
                      marginLeft: -5,
                      cursor: "ew-resize",
                    }
                  : {
                      left: 6,
                      right: 6,
                      height: 10,
                      top: sy < 0 ? 0 : "100%",
                      marginTop: -5,
                      cursor: "ns-resize",
                    }),
              }}
              {...grip(selected, { kind: "resize", sx, sy })}
            />
          ))}
          {CORNERS.map(([side, sx, sy]) => (
            <span
              key={`turn-${side}`}
              className="pointer-events-auto absolute size-5 touch-none"
              style={{
                left: sx < 0 ? -22 : "calc(100% + 2px)",
                top: sy < 0 ? -22 : "calc(100% + 2px)",
                cursor: "grab",
              }}
              {...grip(selected, { kind: "rotate" })}
            />
          ))}
          {CORNERS.map(([side, sx, sy]) => (
            <span
              key={side}
              className="pointer-events-auto absolute box-border touch-none rounded-[2px] border-[1.5px] bg-card"
              style={{
                width: 9,
                height: 9,
                margin: "-4.5px 0 0 -4.5px",
                borderColor: SELECTION_INK,
                left: sx < 0 ? 0 : "100%",
                top: sy < 0 ? 0 : "100%",
                cursor: sx === sy ? "nwse-resize" : "nesw-resize",
              }}
              {...grip(selected, { kind: "resize", sx, sy })}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const BUTTON =
  "rounded-full border border-border bg-background px-4 py-2 text-foreground text-sm outline-none transition-[background-color,border-color,transform] duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background motion-reduce:transition-none";

export default function SurfaceFieldDemo() {
  const [preset, setPreset] = React.useState<PresetName>("workspace");
  const [linkRow, setLinkRow] = React.useState(false);
  const [resetKey, setResetKey] = React.useState(0);
  return (
    <div className="flex w-full flex-col gap-4 p-4">
      <fieldset
        aria-label="Field presets"
        className="m-0 flex min-w-0 flex-wrap items-center justify-center gap-2 border-0 p-0"
      >
        {(Object.keys(SURFACE_FIELD_PRESETS) as PresetName[]).map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={preset === name}
            onClick={() => setPreset(name)}
            className={BUTTON}
          >
            {PRESET_LABELS[name]}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={linkRow}
          onClick={() => setLinkRow((on) => !on)}
          className={BUTTON}
        >
          Linked surfaces
        </button>
        <button
          type="button"
          onClick={() => setResetKey((key) => key + 1)}
          className={BUTTON}
        >
          Reset
        </button>
      </fieldset>
      <SurfaceFieldStage
        config={SURFACE_FIELD_PRESETS[preset]}
        linkRow={linkRow}
        resetKey={resetKey}
      />
      <p className="text-center text-muted-foreground text-xs">
        Click a surface to select it, then drag, resize or turn it. Arrow keys
        move it.
      </p>
    </div>
  );
}
