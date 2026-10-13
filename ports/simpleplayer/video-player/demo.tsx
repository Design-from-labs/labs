"use client";

import { type RefObject, useEffect, useRef } from "react";
import { VideoPlayer } from "@/components/ui/video-player";

// A generated test pattern with a sine tone (no third-party media), and an
// original captions track to show that <track> children reach the video.
const SRC = "/demo-media/video-player/test-pattern.mp4";
const CAPTIONS = "/demo-media/video-player/test-pattern.en.vtt";
const STEP_MS = 1500;

/**
 * On the specimen wall only, the demo moves a scripted pointer over the
 * paused player: over the frame (the controls appear), along the scrubber
 * (the hover preview follows), then away (the controls hide). It never plays
 * the video, and it skips its step while the wall pauses the loop.
 */
function useWallLoop(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const host = ref.current;
    if (!host?.closest("[data-specimen]")) {
      return;
    }
    const pointer = (target: Element, type: string, x: number, y: number) =>
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: type !== "pointerenter",
          clientX: x,
          clientY: y,
          pointerType: "mouse",
        }),
      );
    let step = 0;
    const timer = window.setInterval(() => {
      if (host.closest("[data-loop-paused]")) {
        return;
      }
      const frame = host.getBoundingClientRect();
      const track = host.querySelector('[aria-label="Video progress"]');
      if (!track || frame.width === 0) {
        return;
      }
      const bar = track.getBoundingClientRect();
      const barY = bar.bottom - bar.height / 3;
      switch (step % 4) {
        case 0:
          pointer(
            host,
            "pointerenter",
            frame.x + frame.width / 2,
            frame.y + frame.height / 2,
          );
          pointer(
            host,
            "pointermove",
            frame.x + frame.width / 2,
            frame.y + frame.height / 2,
          );
          break;
        case 1:
          pointer(track, "pointerenter", bar.x + bar.width * 0.3, barY);
          pointer(track, "pointermove", bar.x + bar.width * 0.3, barY);
          break;
        case 2:
          pointer(track, "pointermove", bar.x + bar.width * 0.7, barY);
          break;
        default:
          pointer(track, "pointerleave", frame.x - 8, frame.y - 8);
          pointer(host, "pointerleave", frame.x - 8, frame.y - 8);
          break;
      }
      step += 1;
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [ref]);
}

export default function VideoPlayerDemo() {
  const ref = useRef<HTMLDivElement>(null);
  useWallLoop(ref);
  return (
    <div className="w-full max-w-3xl">
      <VideoPlayer
        ref={ref}
        src={SRC}
        autoPlay={false}
        controls
        showTime
        aria-label="Test pattern video"
        className="rounded-lg"
      >
        <track
          kind="captions"
          src={CAPTIONS}
          srcLang="en"
          label="English"
          default
        />
      </VideoPlayer>
    </div>
  );
}
