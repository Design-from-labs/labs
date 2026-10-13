import type { AnyOptions } from './paper-deformers-types'
import type { Behavior } from './paper-behaviors-types'
import { peel } from './paper-behaviors-peel'
import { unroll } from './paper-behaviors-unroll'
import { flip } from './paper-behaviors-flip'
import { letterFold } from './paper-behaviors-letter-fold'
import { hang } from './paper-behaviors-hang'
import { fly } from './paper-behaviors-fly'
import { fall } from './paper-behaviors-fall'
import { carry } from './paper-behaviors-carry'
import { flight } from './paper-behaviors-flight'
import { crumpleBehavior } from './paper-behaviors-crumple'
import { settle } from './paper-behaviors-settle'
import { ribbon } from './paper-behaviors-ribbon'
import { sticker } from './paper-behaviors-sticker'

const registry = new Map<string, Behavior<AnyOptions>>()

/** Community behaviors register here; built-ins are pre-registered. */
export function registerBehavior(behavior: Behavior<AnyOptions>): void {
  registry.set(behavior.id, behavior)
}

export function getBehavior(id: string): Behavior<AnyOptions> {
  const b = registry.get(id)
  if (!b) {
    throw new Error(`[paperlab] Unknown behavior "${id}". Registered: ${[...registry.keys()].join(', ')}`)
  }
  return b
}

export function listBehaviors(): string[] {
  return [...registry.keys()]
}

registerBehavior(peel)
registerBehavior(unroll)
registerBehavior(flip)
registerBehavior(letterFold)
registerBehavior(hang)
registerBehavior(fly)
registerBehavior(fall)
registerBehavior(carry)
registerBehavior(flight)
registerBehavior(crumpleBehavior)
registerBehavior(settle)
registerBehavior(ribbon)
registerBehavior(sticker)
