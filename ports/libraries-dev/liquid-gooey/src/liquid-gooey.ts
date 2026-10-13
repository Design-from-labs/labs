'use client'

import { GooeyRoot } from './liquid-gooey-root'
import { LiquidItem } from './liquid-gooey-liquid-item'

/*
 * Ported from Jakubantalik/Libraries.dev, packages/liquid-gooey/src/index.ts,
 * at commit bcaf88f8a16a: https://github.com/Jakubantalik/Libraries.dev
 * (liquid-gooey 0.2.2).
 *
 * The package entry. Changes across the port: file names are prefixed
 * (liquid-gooey-*), "use client" marks the client files, and the default fill
 * is --liquid-gooey-fill. The effects, physics and filters are upstream.
 *
 * The package's own LICENSE reads "Copyright (c) 2026 Jakub" (the same
 * author as the repository LICENSE appended below); both are MIT.
 */

/** The liquid group: renders the merged silhouette (goo + real shadows) behind
 *  your crisp content. Put `Liquid.Item`s inside. */
export const Liquid = Object.assign(GooeyRoot, { Item: LiquidItem })

export type { GooeyProps as LiquidProps } from './liquid-gooey-root'
export type {
  BendTuning,
  LiquidEffect,
  LiquidItemProps,
  MorphTuning,
  MoveTuning,
} from './liquid-gooey-liquid-item'
export { IMAGE_MELT_DEFAULTS } from './liquid-gooey-image-melt'
export type { ImageMeltOptions } from './liquid-gooey-image-melt'

// ---- advanced escape hatch (raw engine options + defaults) ----
export type { DissolveOptions } from './liquid-gooey-item'
export { EVOLVE_DEFAULTS, MOVE_DEFAULTS } from './liquid-gooey-observer'
export type { EvolveOptions, MoveOptions } from './liquid-gooey-observer'
export { easingFunction, presets } from './liquid-gooey-spring'
export type { SpringConfig, Transition, TransitionPreset } from './liquid-gooey-spring'
export type { CornerRadii } from './liquid-gooey-geometry'
