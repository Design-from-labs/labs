'use client'

import { createContext, useContext } from 'react'
import type { ImageMeltRegistry } from './liquid-gooey-image-melt'
import type { ObserveEngine } from './liquid-gooey-observer'

/*
 * Ported from Jakubantalik/Libraries.dev, packages/liquid-gooey/src/context.ts,
 * at commit bcaf88f8a16a: https://github.com/Jakubantalik/Libraries.dev
 * (liquid-gooey 0.2.2).
 *
 * Unchanged apart from the file names of its imports.
 */

export interface GooeyContextValue {
  portal: SVGGElement | null
  /** Portal target inside the melt-overlay svg (above the content layer). */
  meltPortal: SVGGElement | null
  /** The group's liquid fill — default colour of the intruding mix liquid. */
  fill: string
  getGroup: () => HTMLDivElement | null
  engine: ObserveEngine
  /** Pairwise image-melt items (effect="melt") register here. */
  imageMelt: ImageMeltRegistry
}

export const GooeyContext = createContext<GooeyContextValue | null>(null)

export function useGooeyContext(): GooeyContextValue {
  const ctx = useContext(GooeyContext)
  if (!ctx) throw new Error('<Gooey.Item> must be rendered inside a <Gooey> group.')
  return ctx
}
