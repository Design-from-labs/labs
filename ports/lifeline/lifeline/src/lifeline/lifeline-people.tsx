"use client"

import { createContext, useContext } from "react"
import type { LifelineLegendItem, LifelineMarker } from "./types"

const DEFAULT_PEOPLE_LABELS: Record<LifelineLegendItem["type"], string> = {
  mentor: "Mentors",
  met: "Met in person",
}

/**
 * Screen-reader names for the two people slots. The dots that tell a
 * mentor from someone met are color only, so each row also carries
 * its slot's label as visually hidden text.
 */
export const LifelinePeopleLabelsContext = createContext(DEFAULT_PEOPLE_LABELS)

export function getLifelinePeopleLabels(legend?: LifelineLegendItem[]) {
  const labels = { ...DEFAULT_PEOPLE_LABELS }
  for (const item of legend ?? []) labels[item.type] = item.label
  return labels
}

export interface AggregatedLifelinePerson {
  name: string
  mentor: boolean
  met: boolean
  photo?: string
}

export function aggregateLifelinePeople(
  marker: LifelineMarker,
): AggregatedLifelinePerson[] {
  const map = new Map<string, AggregatedLifelinePerson>()

  const add = (
    name: string,
    type: "mentor" | "met",
    photo?: string,
  ) => {
    const person = map.get(name) ?? { name, mentor: false, met: false }
    person[type] = true
    person.photo = person.photo ?? photo
    map.set(name, person)
  }

  marker.mentors?.forEach((person) =>
    add(person.name, "mentor", person.photo),
  )
  marker.met?.forEach((person) => add(person.name, "met", person.photo))

  return [...map.values()]
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
}

interface LifelinePeopleProps {
  people: AggregatedLifelinePerson[]
  allowWrap?: boolean
}

export function LifelinePeople({
  people,
  allowWrap = false,
}: LifelinePeopleProps) {
  const labels = useContext(LifelinePeopleLabelsContext)

  if (people.length === 0) return null

  return (
    <div className="w-full space-y-3">
      {people.map((person) => (
        <div key={person.name} className="flex w-full items-center gap-2.5">
          <div className="flex w-3 shrink-0 items-center justify-center gap-0.5">
            {person.mentor && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-lifeline-mentor"
                aria-hidden="true"
              />
            )}
            {person.met && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-lifeline-met"
                aria-hidden="true"
              />
            )}
          </div>
          {/* The name follows as text, so the portrait is decorative. */}
          {person.photo ? (
            <img
              src={person.photo}
              alt=""
              width={28}
              height={28}
              loading="lazy"
              decoding="async"
              className="h-7 w-7 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lifeline-foreground text-[10px] font-medium text-lifeline-surface transition-colors duration-300"
            >
              {getInitials(person.name)}
            </span>
          )}
          <p
            dir="auto"
            className={
              allowWrap
                ? "text-start text-[13px] leading-snug text-lifeline-text transition-colors duration-300"
                : "whitespace-nowrap text-start text-[13px] text-lifeline-text transition-colors duration-300 group-hover:text-lifeline-name-hover"
            }
          >
            {person.name}
            <span className="sr-only">
              {" ("}
              {[
                person.mentor ? labels.mentor : null,
                person.met ? labels.met : null,
              ]
                .filter(Boolean)
                .join(", ")}
              {")"}
            </span>
          </p>
        </div>
      ))}
    </div>
  )
}