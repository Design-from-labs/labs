"use client";

import * as React from "react";
import { NumberFlow, NumberFlowGroup } from "@/components/ui/number-flow";

// Illustrative balances for the demo (made up, not market data). The change
// shown beside each one is computed from the previous balance, so the sign
// and size always match the move.
const BALANCES = [1240.5, 1318.25, 986.1, 1502.75, 1124];

export default function NumberFlowDemo() {
  const [index, setIndex] = React.useState(0);
  const value = BALANCES[index];
  const previous = BALANCES[(index + BALANCES.length - 1) % BALANCES.length];
  const change = (value - previous) / previous;

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <NumberFlowGroup>
        <p className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
          <NumberFlow
            className="font-semibold text-5xl text-foreground tracking-tight"
            format={{ style: "currency", currency: "USD" }}
            locales="en-US"
            value={value}
          />
          <NumberFlow
            className={
              change >= 0
                ? "font-medium text-emerald-700 text-xl dark:text-emerald-400"
                : "font-medium text-red-700 text-xl dark:text-red-400"
            }
            format={{
              style: "percent",
              maximumFractionDigits: 1,
              signDisplay: "always",
            }}
            locales="en-US"
            value={change}
          />
        </p>
      </NumberFlowGroup>
      <button
        className="inline-flex h-9 items-center rounded-md border bg-background px-4 font-medium text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
        onClick={() => setIndex((current) => (current + 1) % BALANCES.length)}
        type="button"
      >
        Next balance
      </button>
    </div>
  );
}
