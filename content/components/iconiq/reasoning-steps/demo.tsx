"use client";

import { useEffect, useRef, useState } from "react";
import {
  ReasoningStep,
  ReasoningStepDetails,
  ReasoningStepSource,
  ReasoningStepSources,
  type ReasoningStepStatus,
  ReasoningSteps,
  ReasoningStepsContent,
  ReasoningStepsTrigger,
} from "@/components/ui/reasoning-steps";

// The upstream demo: a simulated trace that cycles through its steps.
const PREVIEW_STEPS: { id: string; label: string; description: string }[] = [
  {
    id: "read",
    label: "Reading the request",
    description: "Parsing the question and pulling out the actual constraints.",
  },
  {
    id: "recall",
    label: "Recalling relevant context",
    description: "Checking the deploy config mentioned earlier in the thread.",
  },
  {
    id: "compare",
    label: "Weighing two approaches",
    description: "A quick rollback versus a targeted env-var fix.",
  },
  {
    id: "draft",
    label: "Drafting the answer",
    description: "Writing the fix as a short, ordered checklist.",
  },
];

const CYCLE_INTERVAL_MS = 1700;

export default function ReasoningStepsDemo() {
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      // On the /ui wall a paused specimen skips its step.
      if (ref.current?.closest("[data-loop-paused]")) return;
      setActiveIndex((current) => (current + 1) % (PREVIEW_STEPS.length + 1));
    }, CYCLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex w-full max-w-md flex-col gap-6 py-10" ref={ref}>
      <div className="self-end rounded-2xl rounded-ee-md bg-muted px-4 py-2.5 text-[13px] text-foreground">
        Why did my staging deploy fail?
      </div>
      <ReasoningSteps>
        <ReasoningStepsTrigger>Reasoning</ReasoningStepsTrigger>
        <ReasoningStepsContent>
          {PREVIEW_STEPS.map((step, index) => {
            const status: ReasoningStepStatus =
              index < activeIndex
                ? "done"
                : index === activeIndex
                  ? "active"
                  : "pending";

            return (
              <ReasoningStep
                description={step.description}
                key={step.id}
                label={step.label}
                status={status}
              >
                {status === "done" && step.id === "compare" ? (
                  <>
                    <ReasoningStepDetails summary="See the tradeoffs">
                      A rollback restores service in under a minute but loses
                      the config fix for the next deploy. The env-var patch
                      takes longer to verify but fixes it at the source.
                    </ReasoningStepDetails>
                    <ReasoningStepSources>
                      <ReasoningStepSource>docs/deploys.md</ReasoningStepSource>
                      <ReasoningStepSource>runbook.md</ReasoningStepSource>
                    </ReasoningStepSources>
                  </>
                ) : null}
              </ReasoningStep>
            );
          })}
        </ReasoningStepsContent>
      </ReasoningSteps>
    </div>
  );
}
