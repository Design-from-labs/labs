"use client"

import { useState, useEffect, useRef, type ReactElement, type CSSProperties } from 'react'
import { useReducedMotion } from './useMediaQuery'

export interface LivelineTransitionProps {
  /** Key of the active child to display. Must match a child's `key` prop. */
  active: string
  /** Chart elements with unique `key` props */
  children: ReactElement | ReactElement[]
  /** Cross-fade duration in ms (default 300) */
  duration?: number
  className?: string
  style?: CSSProperties
}

/**
 * Cross-fade between chart components (e.g. line ↔ candlestick).
 * Children must have unique `key` props matching possible `active` values.
 *
 * @example
 * ```tsx
 * <LivelineTransition active={chartType}>
 *   <Liveline key="line" data={data} value={value} />
 *   <Liveline key="candle" mode="candle" candles={candles} candleWidth={5} data={data} value={value} />
 * </LivelineTransition>
 * ```
 */
export function LivelineTransition({
  active,
  children,
  duration = 300,
  className,
  style,
}: LivelineTransitionProps) {
  const childArray = Array.isArray(children) ? children : [children]
  // Design From: swap without a cross-fade when the user prefers reduced motion
  const reducedMotion = useReducedMotion()

  const [mounted, setMounted] = useState<Set<string>>(() => new Set([active]))
  const [visible, setVisible] = useState(active)
  const prevRef = useRef(active)

  useEffect(() => {
    if (active === prevRef.current) return () => {}
    const oldKey = prevRef.current
    prevRef.current = active

    // Mount the incoming child
    setMounted(prev => new Set([...prev, active]))

    // Double rAF ensures the browser paints the opacity:0 state
    // before we flip to opacity:1, so the CSS transition fires
    let raf1 = requestAnimationFrame(() => {
      raf1 = requestAnimationFrame(() => setVisible(active))
    })

    // Unmount the outgoing child after transition completes
    const timer = setTimeout(() => {
      setMounted(prev => {
        const next = new Set(prev)
        next.delete(oldKey)
        return next
      })
    }, duration + 50)

    return () => {
      cancelAnimationFrame(raf1)
      clearTimeout(timer)
    }
  }, [active, duration])

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
      {childArray.map(child => {
        const key = String(child.key ?? '')
        if (!mounted.has(key)) return null
        const isActive = key === visible
        return (
          <div
            key={key}
            // Design From: the outgoing chart is hidden from assistive
            // technology and the tab order while it fades out
            aria-hidden={isActive ? undefined : true}
            ref={(el) => { el?.toggleAttribute('inert', !isActive) }}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: isActive ? 1 : 0,
              transition: reducedMotion ? 'none' : `opacity ${duration}ms ease`,
              pointerEvents: isActive ? 'auto' : 'none',
            }}
          >
            {child}
          </div>
        )
      })}
    </div>
  )
}
