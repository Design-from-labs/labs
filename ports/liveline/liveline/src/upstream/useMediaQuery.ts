"use client"

import { useSyncExternalStore } from 'react'

// Design From addition: user preferences for the DOM parts. The canvas
// engine reads prefers-reduced-motion itself.

function subscribeTo(query: string) {
  return (onChange: () => void) => {
    const mql = window.matchMedia(query)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }
}

const subscriptions = new Map<string, (onChange: () => void) => () => void>()

/** Whether a media query matches; false on the server and before hydration. */
export function useMediaQuery(query: string): boolean {
  let subscribe = subscriptions.get(query)
  if (!subscribe) {
    subscribe = subscribeTo(query)
    subscriptions.set(query, subscribe)
  }
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Sliding indicators, color fades and the cross-fade switch off. */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

/** The user asked for more contrast. */
export function usePrefersMoreContrast(): boolean {
  return useMediaQuery('(prefers-contrast: more)')
}

/** Forced colors (for example Windows high contrast) are active. */
export function useForcedColors(): boolean {
  return useMediaQuery('(forced-colors: active)')
}
