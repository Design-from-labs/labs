// Labs port of upstream's icons.tsx. Upstream drew Lucide's geometry as its
// own inline SVGs at a 1.125 px stroke; this file renders the Lucide icons
// themselves at that stroke (the Phosphor item swaps the imports, and this is
// the only file that differs between the icon variants). Upstream's smile
// and reply arrow had extra parts for their animations; message-actions-
// styles.ts gives Lucide's own parts the same moves.
import {
  Check,
  Copy,
  Ellipsis,
  Flag,
  GitFork,
  Reply,
  Search,
  Smile,
  SmilePlus,
  ThumbsDown,
  ThumbsUp,
  Volume2,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { messageActionsClassNames as styles } from "./message-actions-styles";

export type MessageActionIconProps = {
  className?: string;
  size?: number;
};

/** Render function so a set can be Lucide, Heroicons, or plain SVG. */
export type MessageActionIcon = (props: MessageActionIconProps) => ReactNode;

export type MessageActionIcons = {
  good: MessageActionIcon;
  bad: MessageActionIcon;
  copy: MessageActionIcon;
  copied: MessageActionIcon;
  smile: MessageActionIcon;
  reply: MessageActionIcon;
  more: MessageActionIcon;
  aloud: MessageActionIcon;
  fork: MessageActionIcon;
  report: MessageActionIcon;
  search: MessageActionIcon;
  addEmoji: MessageActionIcon;
};

type IconComponent = ComponentType<{
  "aria-hidden"?: boolean | "true" | "false";
  className?: string;
  size?: number;
  strokeWidth?: number;
}>;

export function MessageActionGlyph({
  className,
  icon: Icon,
  size = 12,
  strokeWidth = 1.125,
}: MessageActionIconProps & { icon: IconComponent; strokeWidth?: number }) {
  return (
    <Icon
      aria-hidden="true"
      className={[styles.icon, className].filter(Boolean).join(" ")}
      size={size}
      strokeWidth={strokeWidth}
    />
  );
}

function good({ className, size }: MessageActionIconProps) {
  return (
    <MessageActionGlyph className={className} icon={ThumbsUp} size={size} />
  );
}

function bad({ className, size }: MessageActionIconProps) {
  return (
    <MessageActionGlyph className={className} icon={ThumbsDown} size={size} />
  );
}

function copy({ className, size }: MessageActionIconProps) {
  return <MessageActionGlyph className={className} icon={Copy} size={size} />;
}

function copied({ className, size }: MessageActionIconProps) {
  return <MessageActionGlyph className={className} icon={Check} size={size} />;
}

function smile({ className, size }: MessageActionIconProps) {
  return <MessageActionGlyph className={className} icon={Smile} size={size} />;
}

function reply({ className, size }: MessageActionIconProps) {
  return <MessageActionGlyph className={className} icon={Reply} size={size} />;
}

function more({ className, size }: MessageActionIconProps) {
  return (
    <MessageActionGlyph className={className} icon={Ellipsis} size={size} />
  );
}

function aloud({ className, size }: MessageActionIconProps) {
  return (
    <MessageActionGlyph className={className} icon={Volume2} size={size} />
  );
}

function fork({ className, size }: MessageActionIconProps) {
  return (
    <MessageActionGlyph className={className} icon={GitFork} size={size} />
  );
}

function report({ className, size }: MessageActionIconProps) {
  return <MessageActionGlyph className={className} icon={Flag} size={size} />;
}

function search({ className, size }: MessageActionIconProps) {
  return <MessageActionGlyph className={className} icon={Search} size={size} />;
}

function addEmoji({ className, size }: MessageActionIconProps) {
  return (
    <MessageActionGlyph className={className} icon={SmilePlus} size={size} />
  );
}

/** Lucide stroke set. Replace any key via the `icons` prop. */
export const messageActionIcons: MessageActionIcons = {
  good,
  bad,
  copy,
  copied,
  smile,
  reply,
  more,
  aloud,
  fork,
  report,
  search,
  addEmoji,
};
