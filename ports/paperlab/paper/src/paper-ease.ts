/*
 * Ease names as GSAP 3.12 reads them ('power2.out', 'expo', 'back.out(1.7)',
 * 'none'...), as functions for Motion. Paperlab's state transitions and
 * presets name their eases this way (the schema's `transition.ease` is "GSAP
 * ease name"), so configs written for the upstream keep their timing.
 *
 * Written by Design From Labs for the port of NourMtir0722/Paperlab, after
 * GSAP's own definitions (gsap-core: _insertEase, _configElastic,
 * _configBack, the Bounce and Expo curves). A bare name is its `.out`, as in
 * GSAP.
 */

import { animate } from 'motion'

export type Ease = (t: number) => number

interface Family {
  in: Ease
  out: Ease
  inOut: Ease
}

const TAU = 2 * Math.PI

/** GSAP's default in-out, built from the in curve. */
const inOutFromIn = (easeIn: Ease): Ease => (t) =>
  t < 0.5 ? easeIn(2 * t) / 2 : 1 - easeIn(2 * (1 - t)) / 2

/** GSAP's in-out for elastic and back, built from the out curve. */
const inOutFromOut = (easeOut: Ease): Ease => (t) =>
  t < 0.5 ? (1 - easeOut(1 - 2 * t)) / 2 : 0.5 + easeOut(2 * (t - 0.5)) / 2

const family = (easeIn: Ease, easeOut?: Ease, easeInOut?: Ease): Family => ({
  in: easeIn,
  out: easeOut ?? ((t) => 1 - easeIn(1 - t)),
  inOut: easeInOut ?? inOutFromIn(easeIn),
})

const power = (p: number): Family =>
  family(
    p === 1 ? (t) => t : (t) => t ** p,
    (t) => 1 - (1 - t) ** p,
    (t) => (t < 0.5 ? (2 * t) ** p / 2 : 1 - (2 * (1 - t)) ** p / 2),
  )

function elastic(amplitude = 1, period?: number): Family {
  const make = (type: 'in' | 'out' | 'inOut'): Ease => {
    const p1 = amplitude >= 1 ? amplitude : 1
    let p2 = (period || (type === 'inOut' ? 0.45 : 0.3)) / (amplitude < 1 ? amplitude : 1)
    const p3 = (p2 / TAU) * (Math.asin(1 / p1) || 0)
    p2 = TAU / p2
    const out: Ease = (t) => (t === 1 ? 1 : p1 * 2 ** (-10 * t) * Math.sin((t - p3) * p2) + 1)
    return type === 'out' ? out : type === 'in' ? (t) => 1 - out(1 - t) : inOutFromOut(out)
  }
  return { in: make('in'), out: make('out'), inOut: make('inOut') }
}

function back(overshoot = 1.70158): Family {
  const out: Ease = (t) => {
    if (!t) return 0
    const u = t - 1
    return u * u * ((overshoot + 1) * u + overshoot) + 1
  }
  return { in: (t) => 1 - out(1 - t), out, inOut: inOutFromOut(out) }
}

const bounceOut: Ease = (t) => {
  const n = 7.5625
  if (t < 1 / 2.75) return n * t * t
  if (t < 0.7272727272727273) return n * (t - 1.5 / 2.75) ** 2 + 0.75
  if (t < 0.9090909090909092) {
    const u = t - 2.25 / 2.75
    return n * u * u + 0.9375
  }
  return n * (t - 2.625 / 2.75) ** 2 + 0.984375
}

const FAMILIES: Record<string, (...args: number[]) => Family> = {
  linear: () => power(1),
  none: () => power(1),
  power0: () => power(1),
  quad: () => power(2),
  power1: () => power(2),
  cubic: () => power(3),
  power2: () => power(3),
  quart: () => power(4),
  power3: () => power(4),
  quint: () => power(5),
  strong: () => power(5),
  power4: () => power(5),
  sine: () => family((t) => (t === 1 ? 1 : 1 - Math.cos(t * (Math.PI / 2)))),
  expo: () => family((t) => 2 ** (10 * (t - 1)) * t + t ** 6 * (1 - t)),
  circ: () => family((t) => -(Math.sqrt(1 - t * t) - 1)),
  bounce: () => family((t) => 1 - bounceOut(1 - t), bounceOut),
  elastic: (a, p) => elastic(a, p),
  back: (o) => back(o),
}

const cache = new Map<string, Ease>()

/**
 * A GSAP ease name as a function: 'power2.out', 'Power2.easeOut', 'expo' (the
 * out), 'back.out(2)', 'elastic.inOut(1, 0.4)', 'none'. Unknown names fall
 * back to GSAP's default, 'power1.out'.
 */
export function parseEase(name: string | undefined): Ease {
  const key = (name ?? 'power1.out').trim()
  const hit = cache.get(key)
  if (hit) return hit
  const match = /^([A-Za-z0-9]+)(?:\.(in|out|inOut|easeIn|easeOut|easeInOut))?(?:\(([^)]*)\))?$/.exec(key)
  let ease: Ease = power(2).out
  if (match) {
    const make = FAMILIES[match[1].toLowerCase()]
    if (make) {
      const args = (match[3] ?? '')
        .split(',')
        .map((a) => Number.parseFloat(a))
        .filter((a) => Number.isFinite(a))
      const f = make(...args)
      const type = (match[2] ?? 'out').replace(/^ease/, '')
      ease = type === 'In' || type === 'in' ? f.in : type === 'InOut' || type === 'inOut' ? f.inOut : f.out
      if (match[1].toLowerCase() === 'none' || match[1].toLowerCase() === 'linear') ease = f.in
    }
  }
  cache.set(key, ease)
  return ease
}

// ---- A tween on plain objects (the gsap.to calls the port replaces) ----


export interface PaperTween {
  kill(): void
  pause(): void
  play(): void
}

export interface PaperTweenOptions {
  duration: number
  /** A GSAP ease name or a function. */
  ease?: string | Ease
  delay?: number
  /** -1 repeats forever (GSAP's repeat). */
  repeat?: number
  /** Repeats play backwards in time, as GSAP's yoyo. */
  yoyo?: boolean
  onUpdate?: () => void
  onRepeat?: () => void
  onComplete?: () => void
}

/**
 * `gsap.to(target, { ...values, duration, ease, ... })` on Motion: numeric
 * properties of a plain object move from their current values to `values`,
 * driven by one Motion animation of 0 to 1 (repeat and yoyo included).
 */
export function tweenTo(
  target: Record<string, number>,
  values: Record<string, number>,
  options: PaperTweenOptions,
): PaperTween {
  const keys = Object.keys(values)
  const from: Record<string, number> = {}
  for (const k of keys) from[k] = target[k] ?? 0
  const ease = typeof options.ease === 'function' ? options.ease : parseEase(options.ease ?? 'power1.out')
  const controls = animate(0, 1, {
    duration: options.duration,
    ease,
    delay: options.delay ?? 0,
    repeat: options.repeat === -1 ? Number.POSITIVE_INFINITY : (options.repeat ?? 0),
    repeatType: options.yoyo ? 'reverse' : 'loop',
    onUpdate: (v: number) => {
      for (const k of keys) target[k] = from[k] + (values[k] - from[k]) * v
      options.onUpdate?.()
    },
    onRepeat: () => options.onRepeat?.(),
    onComplete: () => options.onComplete?.(),
  })
  return {
    kill: () => controls.stop(),
    pause: () => controls.pause(),
    play: () => controls.play(),
  }
}
