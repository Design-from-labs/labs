"use client";

import {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  type Ref,
  type RefCallback,
  type RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { cn } from "@/lib/utils";
import {
  VideoPlayerController,
  type VideoPlayerOptions,
  type VideoPlayerParts,
} from "./video-player-controller";
import {
  VideoPlayerEnterFullscreenIcon,
  VideoPlayerExitFullscreenIcon,
  VideoPlayerMutedIcon,
  VideoPlayerPauseIcon,
  VideoPlayerPictureInPictureIcon,
  VideoPlayerPlayIcon,
  VideoPlayerSoundIcon,
} from "./video-player-icons";
import {
  DEFAULT_ASPECT_RATIO,
  DEFAULT_PRELOAD_MARGIN,
} from "./video-player-media";
import { videoPlayerStyles } from "./video-player-styles";

export type VideoPlayerProps = Omit<ComponentProps<"div">, "children"> & {
  /** The video URL. Loaded lazily, when the player nears the viewport. */
  src: string;
  /** CSS aspect ratio of the player. */
  aspectRatio?: string;
  /** Root margin of the lazy-load observer. */
  preloadMargin?: string;
  /** Muted autoplay (browsers allow it muted). Skipped under reduced motion. */
  autoPlay?: boolean;
  /** Desktop: a click on the video surface plays or pauses. */
  pauseOnOverlayClick?: boolean;
  /** The control tray: volume, Picture-in-Picture and fullscreen. */
  controls?: boolean;
  /** With `controls`, a pinned time button; without, a time tooltip over the scrubber. */
  showTime?: boolean;
  /** The mute button and volume slider (in the tray; hidden when the video has no audio). */
  volume?: boolean;
  /** The volume slider over the mute button. */
  volumeSlider?: boolean;
  /** The Picture-in-Picture button (in the tray). */
  pictureInPicture?: boolean;
  /** The fullscreen button (in the tray). */
  fullscreen?: boolean;
  /** The underlying <video>, for playback control from outside. */
  videoRef?: Ref<HTMLVideoElement>;
  /** <track> elements (captions, subtitles), passed to the <video>. */
  children?: ReactNode;
};

/** Points the component's own ref and the caller's `ref` at one node. */
function useHostRef<T>(
  own: RefObject<T | null>,
  ref: Ref<T> | undefined,
): RefCallback<T> {
  return useCallback(
    (node: T | null) => {
      own.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [own, ref],
  );
}

/**
 * A video player with overlay controls: play and pause, a scrubber with a
 * hover preview, time, volume, Picture-in-Picture and fullscreen, lazy
 * loading and muted autoplay. The markup is rendered here; the behavior is
 * upstream's, in VideoPlayerController.
 */
export function VideoPlayer({
  src,
  aspectRatio = DEFAULT_ASPECT_RATIO,
  preloadMargin = DEFAULT_PRELOAD_MARGIN,
  autoPlay = true,
  pauseOnOverlayClick = false,
  controls = false,
  showTime = false,
  volume = true,
  volumeSlider = true,
  pictureInPicture = true,
  fullscreen = true,
  videoRef,
  children,
  className,
  style,
  ref,
  "aria-label": ariaLabel = "Video player",
  ...props
}: VideoPlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const innerVideoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const controlTrayRef = useRef<HTMLSpanElement>(null);
  const controlTraySlotsRef = useRef<HTMLSpanElement>(null);
  const trayTimeRef = useRef<HTMLSpanElement>(null);
  const trayTimeTextRef = useRef<HTMLButtonElement>(null);
  const scrubTimeRef = useRef<HTMLSpanElement>(null);
  const scrubTimeTextRef = useRef<HTMLSpanElement>(null);
  const volumeSlotRef = useRef<HTMLSpanElement>(null);
  const volumeControlRef = useRef<HTMLButtonElement>(null);
  const volumePopoverRef = useRef<HTMLSpanElement>(null);
  const volumeTrackRef = useRef<HTMLSpanElement>(null);
  const pictureInPictureRef = useRef<HTMLButtonElement>(null);
  const fullscreenRef = useRef<HTMLButtonElement>(null);
  const controllerRef = useRef<VideoPlayerController | null>(null);

  const hostRefs = useHostRef(hostRef, ref);
  useImperativeHandle(
    videoRef,
    () => innerVideoRef.current as HTMLVideoElement,
    [],
  );

  const options = useMemo<VideoPlayerOptions>(
    () => ({
      src,
      aspectRatio,
      preloadMargin,
      autoPlay,
      pauseOnOverlayClick,
      controls,
      showTime,
      volume,
      volumeSlider,
      pictureInPicture,
      fullscreen,
    }),
    [
      src,
      aspectRatio,
      preloadMargin,
      autoPlay,
      pauseOnOverlayClick,
      controls,
      showTime,
      volume,
      volumeSlider,
      pictureInPicture,
      fullscreen,
    ],
  );
  const optionsRef = useRef(options);

  // Declared first: on later renders it forwards changed options, as
  // upstream's attributeChangedCallback did.
  useEffect(() => {
    optionsRef.current = options;
    controllerRef.current?.update(options);
  }, [options]);

  // upstream: connectedCallback / disconnectedCallback.
  useEffect(() => {
    if (!controllerRef.current) {
      const parts = {
        player: playerRef.current,
        video: innerVideoRef.current,
        overlay: overlayRef.current,
        button: buttonRef.current,
        progressTrack: progressTrackRef.current,
        controlTray: controlTrayRef.current,
        controlTraySlots: controlTraySlotsRef.current,
        trayTime: trayTimeRef.current,
        trayTimeText: trayTimeTextRef.current,
        scrubTime: scrubTimeRef.current,
        scrubTimeText: scrubTimeTextRef.current,
        volumeSlot: volumeSlotRef.current,
        volumeControl: volumeControlRef.current,
        volumePopover: volumePopoverRef.current,
        volumeTrack: volumeTrackRef.current,
        pictureInPictureControl: pictureInPictureRef.current,
        fullscreenControl: fullscreenRef.current,
      };
      const host = hostRef.current;
      if (!host || Object.values(parts).some((part) => !part)) {
        return;
      }
      controllerRef.current = new VideoPlayerController(
        host,
        parts as VideoPlayerParts,
        optionsRef.current,
      );
    }
    const controller = controllerRef.current;
    controller.connect();
    return () => controller.disconnect();
  }, []);

  return (
    <div
      {...props}
      ref={hostRefs}
      className={cn(
        "video-player relative isolate block aspect-(--video-player--aspect-ratio) w-full overflow-hidden bg-[var(--video-player-background,#1E1E1E)] [contain:paint]",
        className,
      )}
      style={{ "--video-player--aspect-ratio": aspectRatio, ...style } as CSSProperties}
      data-pause-on-overlay-click={pauseOnOverlayClick ? "" : undefined}
    >
      <style href="designfrom-video-player" precedence="default">
        {videoPlayerStyles}
      </style>
      {/* biome-ignore lint/a11y/useSemanticElements: a fieldset is for form controls; this groups a video and its controls */}
      <div
        ref={playerRef}
        className="video-player-player is-loading"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: upstream's player is a focusable group (Space, Enter and K play or pause)
        tabIndex={0}
        role="group"
        aria-label={ariaLabel}
      >
        <video
          ref={innerVideoRef}
          className="video-player-video video-player-asset"
          autoPlay
          muted
          playsInline
          loop
          preload="none"
          controlsList="nodownload nofullscreen noremoteplayback"
          disableRemotePlayback
        >
          {children}
        </video>
        <span
          ref={overlayRef}
          className="video-player-overlay"
          aria-hidden="true"
        />
        <button
          ref={buttonRef}
          className="video-player-button"
          type="button"
          aria-label="Play video"
        >
          <VideoPlayerPlayIcon
            className="video-player-icon video-player-icon--play"
            aria-hidden="true"
          />
          <VideoPlayerPauseIcon
            className="video-player-icon video-player-icon--pause"
            aria-hidden="true"
          />
        </button>
        <div className="video-player-progress-cluster">
          <div
            ref={progressTrackRef}
            className="video-player-progress"
            aria-label="Video progress"
            role="slider"
            tabIndex={0}
            aria-valuemin={0}
            aria-valuemax={0}
            aria-valuenow={0}
            aria-valuetext="Loading video"
          >
            <span
              className="video-player-progress-surface"
              aria-hidden="true"
            />
            <span
              ref={scrubTimeRef}
              className="video-player-time"
              aria-hidden="true"
            >
              <span className="video-player-time-surface" aria-hidden="true" />
              <span ref={scrubTimeTextRef} className="video-player-time-text">
                0:00
              </span>
            </span>
            <span className="video-player-progress-fill" />
            <span
              className="video-player-progress-hover-fill"
              aria-hidden="true"
            />
            <span className="video-player-progress-marker" aria-hidden="true" />
          </div>
          <span ref={trayTimeRef} className="video-player-tray-time">
            <span className="video-player-control-tray video-player-tray-time-holder">
              <span className="video-player-control-tray-slots">
                <button
                  ref={trayTimeTextRef}
                  className="video-player-control-button video-player-tray-time-text"
                  type="button"
                  aria-label="Show remaining time"
                >
                  0:00
                </button>
              </span>
            </span>
          </span>
          <span ref={controlTrayRef} className="video-player-control-tray">
            <span
              ref={controlTraySlotsRef}
              className="video-player-control-tray-slots"
            >
              <span
                ref={volumeSlotRef}
                className="video-player-volume-slot"
                data-video-player-volume-control=""
              >
                <button
                  ref={volumeControlRef}
                  className="video-player-control-button"
                  type="button"
                  aria-label="Toggle sound"
                >
                  <VideoPlayerSoundIcon
                    className="video-player-control-icon video-player-volume-icon video-player-volume-icon--sound"
                    aria-hidden="true"
                  />
                  <VideoPlayerMutedIcon
                    className="video-player-control-icon video-player-volume-icon video-player-volume-icon--muted"
                    aria-hidden="true"
                  />
                </button>
                <span
                  ref={volumePopoverRef}
                  className="video-player-volume-popover"
                >
                  <span
                    ref={volumeTrackRef}
                    className="video-player-volume-track"
                    role="slider"
                    aria-label="Volume"
                    aria-orientation="vertical"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={100}
                    aria-valuetext="100%"
                    tabIndex={0}
                  >
                    <span className="video-player-volume-fill" />
                  </span>
                </span>
              </span>
              <button
                ref={pictureInPictureRef}
                className="video-player-control-button"
                type="button"
                aria-label="Picture in picture"
                data-video-player-picture-in-picture-control=""
              >
                <VideoPlayerPictureInPictureIcon
                  className="video-player-control-icon"
                  aria-hidden="true"
                />
              </button>
              <button
                ref={fullscreenRef}
                className="video-player-control-button"
                type="button"
                aria-label="Enter fullscreen"
                data-video-player-fullscreen-control=""
              >
                <VideoPlayerEnterFullscreenIcon
                  className="video-player-control-icon video-player-fullscreen-icon video-player-fullscreen-icon--enter"
                  aria-hidden="true"
                />
                <VideoPlayerExitFullscreenIcon
                  className="video-player-control-icon video-player-fullscreen-icon video-player-fullscreen-icon--exit"
                  aria-hidden="true"
                />
              </button>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
