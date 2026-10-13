// Labs port: upstream draws these as inline SVGs (src/icons/*.tsx and the
// close button's cross), with the same 24-unit, stroke-2 geometry as the
// Lucide set. This is the only file that differs between the icon variants.
import { Bell, CircleAlert, CircleCheck, CircleX, Info, LoaderCircle, X } from "lucide-react";

export const ToastDefaultIcon = Bell;
export const ToastSuccessIcon = CircleCheck;
export const ToastErrorIcon = CircleX;
export const ToastWarningIcon = CircleAlert;
export const ToastInfoIcon = Info;
export const ToastSpinnerIcon = LoaderCircle;
export const ToastCloseIcon = X;
