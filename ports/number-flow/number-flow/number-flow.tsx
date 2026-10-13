"use client";

import NumberFlowBase, {
  continuous,
  type Format,
  type NumberFlowProps as NumberFlowBaseProps,
  type NumberFlowElement,
  NumberFlowGroup,
  type Trend,
  useCanAnimate,
  type Value,
} from "@number-flow/react";
import * as React from "react";

type NumberFlowProps = NumberFlowBaseProps & {
  /**
   * Also announces each new value to screen readers, through a polite live
   * region next to the number. Off by default: the number is always named by
   * its formatted value (role `img`), but a change to that name is not read
   * out. Turn it on for a value the reader should hear change (a counter, a
   * total); leave it off for numbers that tick often.
   */
  announce?: boolean;
  ref?: React.Ref<NumberFlowElement>;
};

const formatters = new Map<string, Intl.NumberFormat>();

/** One cached Intl.NumberFormat per locales and format, as NumberFlow does. */
function formatterFor(locales: Intl.LocalesArgument, format?: Format) {
  const key = `${JSON.stringify(locales ?? "")}:${JSON.stringify(format ?? "")}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locales, format);
    formatters.set(key, formatter);
  }
  return formatter;
}

/**
 * An animated number: digits roll, symbols fade and the width eases when the
 * value changes. A thin wrapper over NumberFlow (`@number-flow/react`), whose
 * props, defaults and look are unchanged. Additions: `announce`, and plain
 * text for numbering systems NumberFlow cannot draw (below).
 */
function NumberFlow({ announce = false, ref, ...props }: NumberFlowProps) {
  const { value, locales, format, prefix, suffix } = props;
  const formatter = formatterFor(locales, format);
  // The text NumberFlow uses as its accessible name: prefix, value, suffix.
  // Intl.NumberFormat formats decimal strings exactly; the cast covers lib
  // typings that only list number and bigint.
  const text = `${prefix ?? ""}${formatter.format(value as number)}${suffix ?? ""}`;
  const [message, setMessage] = React.useState("");
  const first = React.useRef(true);

  React.useEffect(() => {
    // The first value is the number's name already; only changes are news.
    if (first.current) {
      first.current = false;
      return;
    }
    if (announce) {
      setMessage(text);
    }
  }, [announce, text]);

  // NumberFlow draws only the digits 0 to 9: with another numbering system
  // (ar-EG and fa-IR default to their own digits) the digits came out blank.
  // Those numbers show as plain, correctly ordered text instead, without the
  // animation; pass `format={{ numberingSystem: "latn" }}` to animate them.
  const latin = formatter.resolvedOptions().numberingSystem === "latn";
  let flow: React.ReactElement;
  if (latin) {
    flow = <NumberFlowBase ref={ref} {...props} />;
  } else {
    const passthrough = Object.fromEntries(
      Object.entries(props).filter(
        ([key]) => key.startsWith("aria-") || key.startsWith("data-"),
      ),
    );
    flow = (
      <span
        {...passthrough}
        className={props.className}
        id={props.id}
        style={props.style}
        title={props.title}
      >
        {text}
      </span>
    );
  }
  if (!announce) {
    return flow;
  }
  return (
    <>
      {flow}
      <span aria-atomic="true" aria-live="polite" className="sr-only">
        {message}
      </span>
    </>
  );
}

export {
  continuous,
  type Format,
  NumberFlow,
  type NumberFlowElement,
  NumberFlowGroup,
  type NumberFlowProps,
  type Trend,
  useCanAnimate,
  type Value,
};
