"use client"

import { forwardRef, type CSSProperties } from "react"
import { Film, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { CompanyIcon } from "./company-icon"
import {
  getLifelineEventEffect,
  getLifelineEventImage,
  getLifelineEventKey,
  LifelineEventText,
  onLifelineButtonKeyDown,
  useLifelineEventLightbox,
} from "./lifeline-event"
import { useLifelineFireworks } from "./lifeline-fireworks"
import { useLifelineHoverImage } from "./lifeline-hover-image"
import { aggregateLifelinePeople, LifelinePeople } from "./lifeline-people"
import { useLifelineReducedMotion } from "./use-lifeline-reduced-motion"
import type { LifelineEvent, LifelineMarker } from "./types"

/**
 * Screen readers get the year and the age as one phrase ("1993, age 7"):
 * the visible age sits in its own row under a column label that is
 * hidden from them, so on its own it would read as a bare number.
 */
export function LifelineMarkerAgeText({ age }: { age: number | string }) {
  return (
    <span className="sr-only">
      {typeof age === "number" ? `, age ${age}` : `, ${age}`}
    </span>
  )
}

/**
 * One event line on the desktop rail. Hovering an event with media shows
 * it at the cursor; a click (or Enter, for keyboard users who have no
 * pointer to hover with) expands it into the lightbox. An event with an
 * effect plays it on click, unless the reader prefers reduced motion.
 */
function LifelineMarkerEvent({ event }: { event: LifelineEvent }) {
  const image = getLifelineEventImage(event)
  const effect = getLifelineEventEffect(event)
  const hoverImage = useLifelineHoverImage()
  const fireworks = useLifelineFireworks()
  const reduceMotion = useLifelineReducedMotion()
  const { textRef, openMedia, lightbox } = useLifelineEventLightbox(image)

  const activate = image
    ? () => {
        hoverImage?.hide()
        openMedia()
      }
    : effect && fireworks && !reduceMotion
      ? () => fireworks.launch(effect)
      : undefined

  return (
    <>
      <p
        ref={textRef}
        dir="auto"
        className={cn(
          "max-w-[18rem] text-start text-[14px] leading-[1.55] tracking-[-0.01em]",
          activate &&
            "cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
        data-lifeline-interactive={activate ? "" : undefined}
        role={activate ? "button" : undefined}
        tabIndex={activate ? 0 : undefined}
        aria-haspopup={image ? "dialog" : undefined}
        onMouseEnter={
          image && hoverImage ? () => hoverImage.show(image) : undefined
        }
        onMouseLeave={image && hoverImage ? hoverImage.hide : undefined}
        onClick={activate}
        onKeyDown={activate ? onLifelineButtonKeyDown(activate) : undefined}
      >
        <LifelineEventText event={event} />
        {image && (
          // Glued to the last word with a no-break space so
          // the icon can never wrap onto a line of its own.
          <span className="whitespace-nowrap">
            {" "}
            {image.video ? (
              <Film
                className="ms-0.5 inline-block h-3 w-3 -translate-y-px text-lifeline-icon transition-colors duration-300"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            ) : (
              <ImageIcon
                className="ms-0.5 inline-block h-3 w-3 -translate-y-px text-lifeline-icon transition-colors duration-300"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            )}
            <span className="sr-only">
              {image.video ? " (video: " : " (image: "}
              {image.alt})
            </span>
          </span>
        )}
      </p>
      {lightbox}
    </>
  )
}

interface LifelineMarkerColumnProps {
  marker: LifelineMarker
  birthYear: number
  minWidth: number
  animateIntro?: boolean
  introDelay?: number
  introDuration?: number
}

export const LifelineMarkerColumn = forwardRef<
  HTMLLIElement,
  LifelineMarkerColumnProps
>(function LifelineMarkerColumn(
  {
    marker,
    birthYear,
    minWidth,
    animateIntro = false,
    introDelay = 0,
    introDuration = 420,
  },
  ref,
) {
  const age = marker.age ?? marker.year - birthYear
  const people = aggregateLifelinePeople(marker)

  return (
    <li
      ref={ref}
      className="group relative shrink-0 pe-8 transition-opacity duration-300 ease-out will-change-opacity"
      style={{ width: minWidth }}
    >
      <div
        className={cn("relative", animateIntro && "lifeline-marker-intro")}
        style={{
          animationDelay: animateIntro ? `${introDelay}ms` : undefined,
          ...(animateIntro
            ? ({
                "--lifeline-marker-fade-ms": `${introDuration}ms`,
              } as CSSProperties)
            : {}),
        }}
      >
        <span
          className="absolute start-0 top-[var(--lifeline-rail)] z-10 h-[10px] w-px -translate-y-1/2 bg-lifeline-tick transition-colors duration-300 group-hover:bg-lifeline-tick-hover"
          aria-hidden="true"
        />

        <div className="flex w-full flex-col items-start text-start">
          <p
            aria-hidden="true"
            className="mb-5 h-4 text-[11px] font-medium leading-4 tabular-nums text-lifeline-label transition-colors duration-300 group-hover:text-lifeline-label-hover"
          >
            {age}
          </p>

          <p className="mb-6 h-5 whitespace-nowrap text-[15px] font-medium leading-5 tabular-nums text-lifeline-text transition-colors duration-300 group-hover:text-lifeline-foreground">
            {marker.label ?? marker.year}
            <LifelineMarkerAgeText age={age} />
          </p>

          <div className="relative w-full pb-10 text-lifeline-text transition-colors duration-300 group-hover:text-lifeline-text-hover">
            {/* When this column carries people, the content block reserves
                the band's height as a floor: short and average columns put
                their portraits on the same line as every other column, and
                a column whose events run past the floor pushes its own
                portraits below them instead of under them. pb-6 is the gap
                in the overflow case — absorbed by the floor otherwise. */}
            <div
              className={cn(
                "flex w-full flex-col items-start pt-6",
                people.length > 0 &&
                  "min-h-[var(--lifeline-people-top)] pb-6",
              )}
            >
              {marker.badges && marker.badges.length > 0 && (
                <div className="mb-3 flex items-center justify-start gap-2">
                  {marker.badges.map((badge) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={badge.src}
                      src={badge.src}
                      alt={badge.alt}
                      className="h-6 w-6 object-contain opacity-80 transition-opacity duration-300 group-hover:opacity-100"
                    />
                  ))}
                </div>
              )}

              {marker.companies && marker.companies.length > 0 && (
                <div className="mb-2 flex items-center justify-start gap-1.5">
                  {marker.companies.map((company) => (
                    <CompanyIcon
                      key={company.id}
                      id={company.id}
                      label={company.name}
                      className="opacity-70 transition-opacity duration-300 group-hover:opacity-100"
                    />
                  ))}
                </div>
              )}

              <div className="min-h-[3.25rem] space-y-4">
                {marker.events.map((event, index) => (
                  <LifelineMarkerEvent
                    key={getLifelineEventKey(event, index)}
                    event={event}
                  />
                ))}
              </div>
            </div>

            {people.length > 0 && (
              <div className="w-full">
                <LifelinePeople people={people} />
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  )
})