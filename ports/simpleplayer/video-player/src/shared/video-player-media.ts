// Helpers of the video player: upstream's constants, fullscreen, media,
// progress and types modules, merged into one file (line for line; only the
// imports between them were removed, and getFullscreenElement takes no
// shadow root, since the port renders into the document).

// ---- upstream: src/player/constants.ts ----
export const DEFAULT_ASPECT_RATIO = '16 / 9';
export const DEFAULT_PRELOAD_MARGIN = '360px 0px';

// ---- upstream: src/player/types.ts ----
export type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
  mozFullScreenElement?: Element | null;
  mozFullScreenEnabled?: boolean;
  mozCancelFullScreen?: () => Promise<void> | void;
  msFullscreenElement?: Element | null;
  msFullscreenEnabled?: boolean;
  msExitFullscreen?: () => Promise<void> | void;
};

export type FullscreenPlayer = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

export type FullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitEnterFullScreen?: () => void;
  webkitSupportsFullscreen?: boolean;
  webkitDisplayingFullscreen?: boolean;
};

export type Cleanup = () => void;
export type PlaybackState = 'playing' | 'paused' | null;

export type ProgressMetrics = {
  rect: DOMRect;
  sideInset: number;
  innerWidth: number;
};

export type ScrubPoint = {
  percent: number;
  targetTime: number;
};

// ---- upstream: src/player/fullscreen.ts ----
export function getFullscreenElement(): Element | null {
  const fullscreenDocument = document as FullscreenDocument;

  return (
    document.fullscreenElement ||
    fullscreenDocument.webkitFullscreenElement ||
    fullscreenDocument.mozFullScreenElement ||
    fullscreenDocument.msFullscreenElement ||
    null
  );
}

export function isFullscreenSupported(
  fullscreenEnabled: boolean,
  player: HTMLElement,
  video: HTMLVideoElement,
): boolean {
  const fullscreenDocument = document as FullscreenDocument;
  const fullscreenPlayer = player as FullscreenPlayer;
  const fullscreenVideo = video as FullscreenVideo;
  const canFullscreenPlayer = !!(
    (
      document.fullscreenEnabled ??
      fullscreenDocument.webkitFullscreenEnabled ??
      fullscreenDocument.mozFullScreenEnabled ??
      fullscreenDocument.msFullscreenEnabled ??
      false
    ) &&
    (
      fullscreenPlayer.requestFullscreen ||
      fullscreenPlayer.webkitRequestFullscreen ||
      fullscreenPlayer.mozRequestFullScreen ||
      fullscreenPlayer.msRequestFullscreen
    )
  );
  const canFullscreenVideo = !!(
    fullscreenVideo.webkitSupportsFullscreen ||
    fullscreenVideo.webkitEnterFullscreen ||
    fullscreenVideo.webkitEnterFullScreen
  );

  return !!(fullscreenEnabled && (canFullscreenPlayer || canFullscreenVideo));
}

export function requestPlayerFullscreen(player: HTMLElement): Promise<void> {
  const fullscreenPlayer = player as FullscreenPlayer;
  const requestFullscreen = (
    fullscreenPlayer.requestFullscreen ||
    fullscreenPlayer.webkitRequestFullscreen ||
    fullscreenPlayer.mozRequestFullScreen ||
    fullscreenPlayer.msRequestFullscreen
  );

  return Promise.resolve(requestFullscreen?.call(fullscreenPlayer));
}

export function canRequestPlayerFullscreen(player: HTMLElement): boolean {
  const fullscreenPlayer = player as FullscreenPlayer;

  return (
    typeof fullscreenPlayer.requestFullscreen === 'function' ||
    typeof fullscreenPlayer.webkitRequestFullscreen === 'function' ||
    typeof fullscreenPlayer.mozRequestFullScreen === 'function' ||
    typeof fullscreenPlayer.msRequestFullscreen === 'function'
  );
}

export function requestVideoFullscreen(video: HTMLVideoElement): void {
  const fullscreenVideo = video as FullscreenVideo;
  const requestFullscreen = fullscreenVideo.webkitEnterFullscreen || fullscreenVideo.webkitEnterFullScreen;

  requestFullscreen?.call(fullscreenVideo);
}

export function exitFullscreen(): Promise<void> {
  const fullscreenDocument = document as FullscreenDocument;
  const exitFullscreen = (
    document.exitFullscreen ||
    fullscreenDocument.webkitExitFullscreen ||
    fullscreenDocument.mozCancelFullScreen ||
    fullscreenDocument.msExitFullscreen
  );

  return Promise.resolve(exitFullscreen?.call(fullscreenDocument));
}

// ---- upstream: src/player/media.ts ----
export function formatVideoTime(time: number): string {
  if (!Number.isFinite(time) || time < 0) return '0:00';

  const totalSeconds = Math.floor(time);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  if (hours > 0) {
    return hours + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
  }

  return minutes + ':' + String(seconds).padStart(2, '0');
}

export type AudioAvailability = 'available' | 'unavailable' | 'unknown';

export function detectAudioAvailability(video: HTMLVideoElement): AudioAvailability {
  const audioTrackVideo = video as HTMLVideoElement & { audioTracks?: { length: number } };
  const webkitVideo = video as HTMLVideoElement & { webkitAudioDecodedByteCount?: number };
  const isWebKit = typeof webkitVideo.webkitAudioDecodedByteCount === 'number';
  if (audioTrackVideo.audioTracks && typeof audioTrackVideo.audioTracks.length === 'number') {
    if (audioTrackVideo.audioTracks.length > 0) return 'available';
    // iOS Safari reports audioTracks.length === 0 at HAVE_METADATA even when
    // audio is present. On WebKit, fall through to webkitAudioDecodedByteCount
    // for a reliable answer after playback starts.
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA && !isWebKit) return 'unavailable';
  }

  const firefoxVideo = video as HTMLVideoElement & { mozHasAudio?: boolean };
  if (typeof firefoxVideo.mozHasAudio === 'boolean') {
    return firefoxVideo.mozHasAudio ? 'available' : 'unavailable';
  }

  const streamVideo = video as HTMLVideoElement & {
    captureStream?: () => MediaStream;
    mozCaptureStream?: () => MediaStream;
  };
  const captureStream = streamVideo.captureStream ?? streamVideo.mozCaptureStream;
  if (captureStream && video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    try {
      if (captureStream.call(video).getAudioTracks().length > 0) return 'available';
    } catch {
      // Cross-origin media can block captureStream; keep probing with other browser hints.
    }
  }

  if (
    isWebKit &&
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.currentTime > 0.25
  ) {
    if (webkitVideo.webkitAudioDecodedByteCount! > 0) return 'available';
    // Safari skips audio decoding for muted playback, so 0 decoded bytes
    // does not prove absence of audio. Only trust it when unmuted.
    if (!video.muted) return 'unavailable';
  }

  return 'unknown';
}

export function isAudioAvailabilityPending(video: HTMLVideoElement): boolean {
  const webkitVideo = video as HTMLVideoElement & { webkitAudioDecodedByteCount?: number };
  if (typeof webkitVideo.webkitAudioDecodedByteCount !== 'number') return false;
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return true;
  return video.currentTime <= 0.25;
}

// ---- upstream: src/player/progress.ts ----
export function getProgressMetrics(rect: DOMRect): ProgressMetrics {
  const sideInset = Math.min(2, Math.max(0, rect.width / 2));
  const innerWidth = Math.max(1, rect.width - (sideInset * 2));

  return { rect, sideInset, innerWidth };
}

export function getProgressXFromPercent(percent: number, rect: DOMRect): number {
  const { sideInset, innerWidth } = getProgressMetrics(rect);
  const clampedPercent = Math.min(1, Math.max(0, percent));

  return sideInset + (clampedPercent * innerWidth);
}

export function getProgressPercentFromClientX(clientX: number, rect: DOMRect): number {
  const { sideInset, innerWidth } = getProgressMetrics(rect);

  return Math.min(1, Math.max(0, (clientX - rect.left - sideInset) / innerWidth));
}
