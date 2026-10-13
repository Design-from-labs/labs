// The player's own glyphs, drawn as upstream draws them (src/player/template.ts),
// so this default variant matches upstream pixel for pixel. Sizes come from the
// stylesheet (video-player-icon, video-player-control-icon). The icon-library
// style ships the same slots with Lucide or Phosphor icons instead.
import type { SVGProps } from "react";

type GlyphProps = SVGProps<SVGSVGElement>;

export function VideoPlayerPlayIcon(props: GlyphProps) {
  return (
    <svg viewBox="0 0 18 20" aria-hidden="true" {...props}>
      <path
        d="M3 3.5L15 10L3 16.5Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VideoPlayerPauseIcon(props: GlyphProps) {
  return (
    <svg viewBox="0 0 18 20" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="5" height="14" rx="1.5" fill="currentColor" />
      <rect x="10" y="3" width="5" height="14" rx="1.5" fill="currentColor" />
    </svg>
  );
}

export function VideoPlayerSoundIcon(props: GlyphProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        d="M8 7.00002H5C3.8954 7.00002 3 7.89542 3 9.00002V11C3 12.1046 3.8954 13 5 13H8L12.5227 16.7689C13.1093 17.2578 14 16.8406 14 16.077V3.92302C14 3.15942 13.1094 2.74222 12.5227 3.23112L8 7.00002Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.4141 8.58582C18.1951 9.36682 18.1951 10.6332 17.4141 11.4142"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VideoPlayerMutedIcon(props: GlyphProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        d="M3 17L17 3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 16.0773C14.9998 17.6883 13.1207 18.5686 11.8828 17.5372L9.8333 15.8303C9.38114 15.4538 9.35003 14.7702 9.76611 14.3541C10.132 13.9882 10.7165 13.9617 11.114 14.2929L13 15.8644V11.5354C13 11.2702 13.1054 11.0158 13.2929 10.8283C13.9229 10.1983 15 10.6445 15 11.5354V16.0773Z"
        fill="currentColor"
      />
      <path
        d="M12 2.37218C13.2358 1.48685 15 2.36173 15 3.92296V4.87902L13 6.87902V4.13488L8.64062 7.76867C8.46092 7.91841 8.23392 8.00011 8 8.00011H5C4.44768 8.00011 4 8.4478 4 9.00011V11.0001C4.00009 11.5524 4.44774 12.0001 5 12.0001H7.87891L5.87891 14.0001H5C3.34317 14.0001 2.00009 12.6569 2 11.0001V9.00011C2 7.34323 3.34312 6.00011 5 6.00011H7.63672L11.8828 2.463L12 2.37218Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function VideoPlayerPictureInPictureIcon(props: GlyphProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        d="m5.5,13c-1.381,0-2.5-1.119-2.5-2.5v-5c0-1.381,1.119-2.5,2.5-2.5h7c1.381,0,2.5,1.119,2.5,2.5v2.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <rect
        x="9"
        y="12"
        width="8"
        height="5"
        rx="1.5"
        ry="1.5"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <line
        x1="8"
        y1="8"
        x2="6"
        y2="6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <polygon
        points="9 6 9 9 6 9 9 6"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function VideoPlayerEnterFullscreenIcon(props: GlyphProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <polyline
        points="12.5 16 16 16 16 12.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="16"
        y1="16"
        x2="12"
        y2="12"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="7.5 4 4 4 4 7.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="4"
        y1="4"
        x2="8"
        y2="8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VideoPlayerExitFullscreenIcon(props: GlyphProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <polyline
        points="16 12.5 12.5 12.5 12.5 16"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="12"
        y1="12"
        x2="16"
        y2="16"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="4 7.5 7.5 7.5 7.5 4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="8"
        y1="8"
        x2="4"
        y2="4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
