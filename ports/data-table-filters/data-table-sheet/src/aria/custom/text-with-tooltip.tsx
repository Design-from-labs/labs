"use client";

import { TOOLTIP_DELAY } from "../ui-compat";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";

interface TextWithTooltipProps {
  text: string | number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Truncated text that shows its full value in a tooltip on hover.
 *
 * React Aria's `TooltipTrigger` makes its trigger focusable, but this text
 * usually sits inside another control (the sheet's field buttons), where a
 * focusable descendant is invalid. So the project's tooltip is opened from
 * hover alone, through its `triggerRef` and `isOpen`, which is what the Radix
 * variant's tooltip on a non-focusable `div` does too. The full text is always
 * in the DOM, so assistive technology reads it whole.
 */
export function TextWithTooltip({
  text,
  className,
  style,
}: TextWithTooltipProps) {
  const [isTruncated, setIsTruncated] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const textRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        const { scrollWidth, clientWidth } = textRef.current;
        setIsTruncated(scrollWidth > clientWidth);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      checkTruncation();
    });

    if (textRef.current) {
      resizeObserver.observe(textRef.current);
    }

    checkTruncation();

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer.current);
    };
  }, []);

  return (
    <>
      <div
        ref={textRef}
        className={cn(
          "truncate",
          !isTruncated && "pointer-events-none",
          className,
        )}
        style={style}
        onPointerEnter={(event) => {
          if (!isTruncated || event.pointerType === "touch") return;
          clearTimeout(timer.current);
          timer.current = setTimeout(
            () => setIsOpen(true),
            TOOLTIP_DELAY.delay,
          );
        }}
        onPointerLeave={() => {
          clearTimeout(timer.current);
          setIsOpen(false);
        }}
      >
        {text}
      </div>
      <Tooltip
        triggerRef={textRef}
        isOpen={isOpen && isTruncated}
        onOpenChange={setIsOpen}
      >
        {text}
      </Tooltip>
    </>
  );
}
