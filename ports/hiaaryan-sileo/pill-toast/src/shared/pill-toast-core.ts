import type { ReactNode } from "react";

export type PillToastState = "success" | "loading" | "error" | "warning" | "info" | "action";

export interface PillToastStyles {
  title?: string;
  description?: string;
  badge?: string;
  button?: string;
}

export interface PillToastButton {
  title: string;
  onClick: () => void;
}

export const PILL_TOAST_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;

export type PillToastPosition = (typeof PILL_TOAST_POSITIONS)[number];

export interface PillToastOptions {
  title?: string;
  description?: ReactNode | string;
  type?: PillToastState;
  position?: PillToastPosition;
  duration?: number | null;
  icon?: ReactNode | null;
  styles?: PillToastStyles;
  fill?: string;
  roundness?: number;
  autopilot?: boolean | { expand?: number; collapse?: number };
  button?: PillToastButton;
}

/* --------------------------------- Layout --------------------------------- */

export const HEIGHT = 40;
export const WIDTH = 350;
export const DEFAULT_ROUNDNESS = 16;

/* --------------------------------- Timing --------------------------------- */

export const DURATION_MS = 600;
export const DURATION_S = DURATION_MS / 1000;

export const DEFAULT_TOAST_DURATION = 6000;
export const EXIT_DURATION = DEFAULT_TOAST_DURATION * 0.1;
export const AUTO_EXPAND_DELAY = DEFAULT_TOAST_DURATION * 0.025;
export const AUTO_COLLAPSE_DELAY = DEFAULT_TOAST_DURATION - 2000;

export const SPRING = {
  type: "spring" as const,
  bounce: 0.25,
  duration: DURATION_S,
};

/* --------------------------------- Render --------------------------------- */

export const BLUR_RATIO = 0.5;
export const PILL_PADDING = 10;
export const MIN_EXPAND_RATIO = 2.25;
export const SWAP_COLLAPSE_MS = 200;
export const HEADER_EXIT_MS = DURATION_MS * 0.7;
