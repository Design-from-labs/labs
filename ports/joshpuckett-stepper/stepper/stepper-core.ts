// The stepper's framework-free core: its types, the windowing math, the
// enter and exit bookkeeping for a changing step count, and the autoplay step
// rule. The React component and hook live in ./stepper. Upstream paths in the
// markers are relative to the package's source root (meta.json source.path).

// ---- upstream: src/core/types.ts ----
export interface StepperProps {
  /** Total number of steps */
  count: number;
  /** Zero-based active step index */
  active: number;
  /** Optional click handler */
  onStepClick?: (index: number) => void;
  /** Layout direction */
  orientation?: "horizontal" | "vertical";
  /** Max visible steps (enables windowing) */
  maxVisible?: number;
  /** Transition duration in ms */
  transitionDuration?: number;
  /** CSS transition timing function */
  easing?: string;
  /** Additional CSS class for overrides */
  className?: string;
  /** Whether the active step is filling (autoplay mode) */
  filling?: boolean;
  /** Duration of the fill animation in ms */
  fillDuration?: number;
  /**
   * Labs: the accessible name of a step, for translations. Default:
   * "Step 2 of 5".
   */
  getStepLabel?: (index: number, count: number) => string;
}

export interface StepProps {
  index: number;
  isActive: boolean;
  phase: "entering" | "stable" | "exiting";
  transitionDuration: number;
  filling?: boolean;
  fillDuration?: number;
  onClick?: () => void;
  /** Labs: the step's accessible name ("Step 2 of 5"). */
  label: string;
}

export interface AnimatingStep {
  key: number;
  index: number;
  phase: "entering" | "stable" | "exiting";
}

export interface UseAutoPlayOptions {
  count: number;
  active: number;
  onStepChange: (index: number) => void;
  stepDuration?: number;
  loop?: boolean;
  /** When false, stops playback and resets playing state */
  enabled?: boolean;
  /**
   * Labs: start playing on mount, unless the user prefers reduced motion.
   * Offer a pause control next to anything that plays on its own for more
   * than five seconds (WCAG 2.2.2).
   */
  autoStart?: boolean;
  /**
   * Labs: hold playback without stopping it (no timer and no fill while
   * true; `playing` is unchanged), for example while the stepper is
   * offscreen. The step restarts its full duration when the hold ends.
   */
  paused?: boolean;
}

export interface UseAutoPlayReturn {
  playing: boolean;
  toggle: () => void;
  filling: boolean;
  fillDuration: number;
}

// ---- upstream: src/core/computeStepWindow.ts ----
const DOT_SIZE = 8;
const ACTIVE_WIDTH = 24;
const GAP = 6;
const SLOT_SIZE = DOT_SIZE + GAP;

export function computeStepWindow(
  count: number,
  active: number,
  maxVisible: number | undefined,
  orientation: "horizontal" | "vertical",
) {
  if (maxVisible == null || count <= maxVisible) {
    return {
      windowStart: 0,
      transformValue: "none",
      containerSize: undefined,
      // Labs: the window's offset in pixels. The stylesheet turns it into a
      // translate whose sign follows the writing direction.
      offset: 0,
    };
  }

  const half = Math.floor(maxVisible / 2);
  const windowStart = Math.max(0, Math.min(active - half, count - maxVisible));

  const offset = windowStart * SLOT_SIZE;
  const axis = orientation === "vertical" ? "Y" : "X";
  const transformValue = `translate${axis}(-${offset}px)`;

  // Container size: (maxVisible - 1) regular dots + 1 active pill + gaps
  const size =
    (maxVisible - 1) * DOT_SIZE + ACTIVE_WIDTH + (maxVisible - 1) * GAP;

  return { windowStart, transformValue, containerSize: size, offset };
}

// ---- upstream: src/core/StepAnimator.ts ----
export class StepAnimator {
  private keyGen: number;
  private steps: AnimatingStep[];

  constructor(count: number) {
    this.keyGen = count;
    this.steps = Array.from({ length: count }, (_, i) => ({
      key: i,
      index: i,
      phase: "stable" as const,
    }));
  }

  reconcile(newCount: number): { hasEntering: boolean; exitingCount: number } {
    const liveCount = this.steps.filter((s) => s.phase !== "exiting").length;
    if (liveCount === newCount) {
      return {
        hasEntering: this.steps.some((s) => s.phase === "entering"),
        exitingCount: this.steps.filter((s) => s.phase === "exiting").length,
      };
    }

    if (newCount < liveCount) {
      let seen = 0;
      this.steps = this.steps.map((s) => {
        if (s.phase === "exiting") return s;
        seen++;
        if (seen > newCount) return { ...s, phase: "exiting" as const };
        return s;
      });
    }

    if (newCount > liveCount) {
      for (let i = liveCount; i < newCount; i++) {
        this.keyGen++;
        this.steps.push({
          key: this.keyGen,
          index: i,
          phase: "entering" as const,
        });
      }
    }

    // Re-index live steps
    let idx = 0;
    this.steps = this.steps.map((s) =>
      s.phase === "exiting" ? s : { ...s, index: idx++ },
    );

    return {
      hasEntering: this.steps.some((s) => s.phase === "entering"),
      exitingCount: this.steps.filter((s) => s.phase === "exiting").length,
    };
  }

  promoteEntering(): void {
    this.steps = this.steps.map((s) =>
      s.phase === "entering" ? { ...s, phase: "stable" as const } : s,
    );
  }

  removeExiting(): void {
    this.steps = this.steps.filter((s) => s.phase !== "exiting");
  }

  getSteps(): AnimatingStep[] {
    return [...this.steps];
  }
}

// ---- upstream: src/core/AutoPlayController.ts ----
export class AutoPlayController {
  stepDuration: number;
  loop: boolean;

  constructor({
    stepDuration = 3000,
    loop = true,
  }: {
    stepDuration?: number;
    loop?: boolean;
  } = {}) {
    this.stepDuration = stepDuration;
    this.loop = loop;
  }

  computeNext(active: number, count: number): number | null {
    return active < count - 1 ? active + 1 : this.loop ? 0 : null;
  }
}
