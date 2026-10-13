'use client'

import { useEffect, useLayoutEffect, useState } from 'react'

/*
 * Ported from Jakubantalik/Libraries.dev, packages/liquid-gooey/src/hooks.ts,
 * at commit bcaf88f8a16a: https://github.com/Jakubantalik/Libraries.dev
 * (liquid-gooey 0.2.2).
 *
 * Unchanged apart from the file names of its imports.
 */

export const useIsoLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}
