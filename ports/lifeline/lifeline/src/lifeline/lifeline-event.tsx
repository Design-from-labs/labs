"use client"

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import {
  LifelineLightbox,
  type LifelineLightboxStart,
} from "./lifeline-lightbox"
import { useLifelineReducedMotion } from "./use-lifeline-reduced-motion"
import type {
  LifelineEvent,
  LifelineEventEffect,
  LifelineEventImage,
  LifelineEventSegment,
} from "./types"

function getEventContent(
  event: LifelineEvent,
): string | LifelineEventSegment[] {
  if (typeof event === "object" && !Array.isArray(event) && "text" in event) {
    return event.text
  }

  return event
}

export function getLifelineEventImage(
  event: LifelineEvent,
): LifelineEventImage | undefined {
  if (typeof event === "object" && !Array.isArray(event) && "image" in event) {
    return event.image
  }

  return undefined
}

export function getLifelineEventEffect(
  event: LifelineEvent,
): LifelineEventEffect | undefined {
  if (typeof event === "object" && !Array.isArray(event) && "effect" in event) {
    return event.effect
  }

  return undefined
}

export function LifelineEventText({
  event,
  className,
}: {
  event: LifelineEvent
  className?: string
}) {
  const content = getEventContent(event)

  if (typeof content === "string") {
    return <span className={className}>{content}</span>
  }

  return (
    <span className={className}>
      {content.map((segment, index) =>
        segment.type === "link" ? (
          <a
            key={index}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-lifeline-link underline-offset-2 transition-colors duration-300 group-hover:text-lifeline-foreground group-hover:decoration-lifeline-link-hover"
          >
            {segment.value}
          </a>
        ) : (
          <span key={index}>{segment.value}</span>
        ),
      )}
    </span>
  )
}

/** Always-visible media embedded in the timeline (image.inline). */
export function LifelineEventMedia({
  media,
  className,
}: {
  media: LifelineEventImage
  className?: string
}) {
  // A looping clip is motion; under reduced motion it rests on its poster.
  const reduceMotion = useLifelineReducedMotion()

  if (media.video) {
    return (
      <video
        src={media.video}
        poster={media.src}
        autoPlay={!reduceMotion}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={media.alt}
        className={className}
      />
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={media.src} alt={media.alt} loading="lazy" className={className} />
  )
}

export function getLifelineEventKey(event: LifelineEvent, index: number) {
  const content = getEventContent(event)

  if (typeof content === "string") return `${index}-${content}`

  return `${index}-${content.map((segment) => segment.value).join("")}`
}

/** Enter and Space activate an element that plays the role of a button. */
export function onLifelineButtonKeyDown(activate: () => void) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    activate()
  }
}

/**
 * Expands an event's attached media into the lightbox from the event's
 * own text: touch layouts have no hover reveal, and keyboard users have
 * no pointer to hover with, so both open the media this way. The text
 * has no card geometry, so the seed is a small frame centered on it,
 * carrying the poster's real aspect so the lightbox lands in the right
 * shape.
 */
export function useLifelineEventLightbox(image: LifelineEventImage | undefined) {
  const textRef = useRef<HTMLParagraphElement>(null)
  const aspectRef = useRef(3 / 4)
  const [lightboxStart, setLightboxStart] =
    useState<LifelineLightboxStart | null>(null)

  const measureText = useCallback((): LifelineLightboxStart | null => {
    const el = textRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const w = 96
    return {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      w,
      h: w * aspectRef.current,
    }
  }, [])

  const openMedia = () => {
    if (!image || lightboxStart) return
    // The poster sets the frame; for videos it shares the clip's aspect.
    const probe = new window.Image()
    probe.src = image.src
    const open = () => {
      if (probe.naturalWidth > 0) {
        aspectRef.current = probe.naturalHeight / probe.naturalWidth
      }
      setLightboxStart(measureText())
    }
    if (probe.complete) {
      open()
    } else {
      probe.onload = open
      probe.onerror = open
    }
  }

  const lightbox: ReactNode =
    lightboxStart && image ? (
      <LifelineLightbox
        photo={image}
        rotate={0}
        start={lightboxStart}
        getHome={measureText}
        onClosed={() => setLightboxStart(null)}
      />
    ) : null

  return { textRef, openMedia, lightbox }
}
