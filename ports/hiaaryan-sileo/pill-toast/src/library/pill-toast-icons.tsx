// The toast's icon slots filled from an icon library (the "Icon library"
// style). The default style draws upstream's own glyphs instead. Each slot is
// a 16px decorative icon, as upstream's are.
import {
  ArrowRight,
  Check,
  CircleAlert,
  LifeBuoy,
  LoaderCircle,
  X,
} from "lucide-react";
import type { ComponentProps } from "react";

type SlotProps = Omit<ComponentProps<typeof Check>, "size">;

export const PillToastArrowRightIcon = (props: SlotProps) => (
  <ArrowRight size={16} aria-hidden="true" {...props} />
);
export const PillToastLifeBuoyIcon = (props: SlotProps) => (
  <LifeBuoy size={16} aria-hidden="true" {...props} />
);
export const PillToastLoaderCircleIcon = (props: SlotProps) => (
  <LoaderCircle size={16} aria-hidden="true" {...props} />
);
export const PillToastXIcon = (props: SlotProps) => (
  <X size={16} aria-hidden="true" {...props} />
);
export const PillToastCircleAlertIcon = (props: SlotProps) => (
  <CircleAlert size={16} aria-hidden="true" {...props} />
);
export const PillToastCheckIcon = (props: SlotProps) => (
  <Check size={16} aria-hidden="true" {...props} />
);
