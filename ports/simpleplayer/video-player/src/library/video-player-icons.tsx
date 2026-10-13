// The player's icon slots filled from an icon library (the "Icon library"
// style). The default style draws upstream's own glyphs instead. Sizes come
// from the stylesheet; stroke widths of the control icons follow
// --video-player--control-icon-stroke-width.
import {
  Maximize2,
  Minimize2,
  Pause,
  PictureInPicture2,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";

export const VideoPlayerPlayIcon = Play;
export const VideoPlayerPauseIcon = Pause;
export const VideoPlayerSoundIcon = Volume2;
export const VideoPlayerMutedIcon = VolumeX;
export const VideoPlayerPictureInPictureIcon = PictureInPicture2;
export const VideoPlayerEnterFullscreenIcon = Maximize2;
export const VideoPlayerExitFullscreenIcon = Minimize2;
