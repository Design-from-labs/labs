"use client";

import { UTCDate } from "@date-fns/utc";
import { HOVER_CARD_DELAY } from "../ui-compat";
import { HoverCard } from "@/components/ui/hover-card";
import { useCopyToClipboard } from "../hooks/use-copy-to-clipboard";
import { useIsRtl } from "../hooks/use-is-rtl";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Check, Copy } from "lucide-react";
import * as React from "react";

type Side = "top" | "right" | "bottom" | "left";
type Align = "start" | "center" | "end";

interface HoverCardTimestampProps {
  date: Date;
  side?: Side;
  sideOffset?: number;
  align?: Align;
  alignOffset?: number;
  className?: string;
}

/**
 * React Aria placement from the Radix side and align props: the cross axis of
 * a left or right card runs top to bottom, of a top or bottom card left to
 * right (mirrored under `dir="rtl"`, as Radix's `start` is).
 */
type Placement = NonNullable<
  React.ComponentProps<typeof HoverCard>["placement"]
>;

function toPlacement(side: Side, align: Align, isRtl: boolean): Placement {
  if (align === "center") return side;
  const atStart = align === "start";
  if (side === "left" || side === "right") {
    return `${side} ${atStart ? "top" : "bottom"}`;
  }
  // The start of a horizontal edge is the left, or the right under `dir="rtl"`.
  return `${side} ${atStart !== isRtl ? "left" : "right"}`;
}

/**
 * The timestamp with its UTC, local, epoch and relative forms in a card on
 * hover.
 *
 * `aria-nova`'s `ui/hover-card` is React Aria's `PreviewTrigger` around a
 * popover, and `PreviewTrigger` makes its trigger focusable. The timestamp
 * usually sits inside another control (a sheet field button, a clickable
 * row), where a focusable descendant is invalid, so the card's popover is
 * opened from hover alone, through its `triggerRef` and `isOpen`: what the
 * Radix variant's hover card on a non-focusable `div` does. The pointer can
 * move into the card (its rows copy their value on click); it closes when the
 * pointer leaves both.
 */
export function HoverCardTimestamp({
  date,
  side: sideProp,
  align = "start",
  alignOffset = -4,
  sideOffset = 4,
  className,
}: HoverCardTimestampProps) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // Defaults to the inline-end side: right, or left under `dir="rtl"`.
  const isRtl = useIsRtl();
  const side = sideProp ?? (isRtl ? "left" : "right");
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  React.useEffect(() => () => clearTimeout(timer.current), []);

  const show = (event: React.PointerEvent) => {
    if (event.pointerType === "touch") return;
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => setIsOpen(true),
      HOVER_CARD_DELAY.openDelay,
    );
  };
  const hide = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => setIsOpen(false),
      HOVER_CARD_DELAY.closeDelay,
    );
  };

  return (
    <>
      <div
        ref={triggerRef}
        className={cn("font-mono whitespace-nowrap", className)}
        onPointerEnter={show}
        onPointerLeave={hide}
      >
        {format(date, "LLL dd, y HH:mm:ss")}
      </div>
      <HoverCard
        triggerRef={triggerRef}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        isNonModal
        placement={toPlacement(side, align, isRtl)}
        offset={sideOffset}
        crossOffset={alignOffset}
        className="z-10 w-auto p-2"
        onPointerEnter={show}
        onPointerLeave={hide}
      >
        <dl className="flex flex-col gap-1">
          <Row value={String(date.getTime())} label="Timestamp" />
          <Row
            value={format(new UTCDate(date), "LLL dd, y HH:mm:ss")}
            label="UTC"
          />
          <Row value={format(date, "LLL dd, y HH:mm:ss")} label={timezone} />
          <Row
            value={formatDistanceToNowStrict(date, { addSuffix: true })}
            label="Relative"
          />
        </dl>
      </HoverCard>
    </>
  );
}

function Row({ value, label }: { value: string; label: string }) {
  const { copy, isCopied } = useCopyToClipboard();

  return (
    <div
      className="group flex items-center justify-between gap-4 text-sm"
      onClick={(e) => {
        e.stopPropagation();
        copy(value);
      }}
    >
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-1 truncate font-mono">
        <span className="invisible group-hover:visible">
          {!isCopied ? (
            <Copy className="h-3 w-3" />
          ) : (
            <Check className="h-3 w-3" />
          )}
        </span>
        {value}
      </dd>
    </div>
  );
}
