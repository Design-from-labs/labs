"use client"

import { useRef, useState, useLayoutEffect, useMemo, useCallback, useId, type CSSProperties } from 'react'
import type { LivelineProps, Momentum, DegenOptions } from './types'
import { resolveTheme, resolveSeriesPalettes, SERIES_COLORS } from './theme'
import { useLivelineEngine } from './useLivelineEngine'
import { useReducedMotion, usePrefersMoreContrast, useForcedColors } from './useMediaQuery'
import { describeLiveline } from './a11y'

const defaultFormatValue = (v: number) => v.toFixed(2)

// Design From: visually hidden, still read by assistive technology
const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

// Design From: keyboard focus, drawn with the theme's ring token
const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring'

const defaultFormatTime = (t: number) => {
  const d = new Date(t * 1000)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  const s = d.getSeconds().toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function Liveline({
  data,
  value,
  series: seriesProp,
  theme = 'dark',
  color = '#3b82f6',
  window: windowSecs = 30,
  grid = true,
  badge = true,
  momentum = true,
  fill = true,
  scrub = true,
  loading = false,
  paused = false,
  emptyText,
  exaggerate = false,
  degen: degenProp,
  badgeTail = true,
  badgeVariant = 'default',
  showValue = false,
  valueMomentumColor = false,
  windows,
  onWindowChange,
  windowStyle,
  tooltipY = 14,
  tooltipOutline = true,
  orderbook,
  referenceLine,
  formatValue = defaultFormatValue,
  formatTime = defaultFormatTime,
  lerpSpeed = 0.08,
  padding: paddingOverride,
  onHover,
  cursor = 'crosshair',
  pulse = true,
  mode = 'line',
  candles,
  candleWidth,
  liveCandle,
  lineMode,
  lineData,
  lineValue,
  onModeChange,
  onSeriesToggle,
  seriesToggleCompact = false,
  lineWidth,
  className,
  style,
  'aria-label': ariaLabel,
}: LivelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const valueDisplayRef = useRef<HTMLSpanElement>(null)
  const windowBarRef = useRef<HTMLDivElement>(null)
  const windowBtnRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number } | null>(null)
  const modeBarRef = useRef<HTMLDivElement>(null)
  const modeBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [modeIndicatorStyle, setModeIndicatorStyle] = useState<{ left: number; width: number } | null>(null)
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set())
  const lastSeriesPropRef = useRef(seriesProp)
  if (seriesProp && seriesProp.length > 0) lastSeriesPropRef.current = seriesProp
  const announceRef = useRef<HTMLSpanElement>(null)
  const summaryId = useId()
  const reducedMotion = useReducedMotion()
  // Design From: upstream's unselected labels (0.22-0.25 alpha) are below
  // 4.5:1; when the user asks for more contrast (or forced colors are on)
  // both states are raised to at least 4.5:1 on the theme's surface.
  const moreContrast = usePrefersMoreContrast()
  const forcedColors = useForcedColors()
  const highContrast = moreContrast || forcedColors
  const slide = reducedMotion
    ? 'none'
    : 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1)'

  const palette = useMemo(() => {
    const p = resolveTheme(color, theme)
    if (lineWidth != null) p.lineWidth = lineWidth
    return p
  }, [color, theme, lineWidth])
  const isDark = theme === 'dark'
  const isMultiSeries = seriesProp != null && seriesProp.length > 0
  const showSeriesToggle = (lastSeriesPropRef.current?.length ?? 0) > 1

  // Per-series palettes (memoized on series ids + colors + theme)
  const seriesPalettes = useMemo(() => {
    if (!seriesProp || seriesProp.length === 0) return null
    return resolveSeriesPalettes(seriesProp, theme)
  }, [seriesProp, theme])

  // Normalized multi-series config for the engine
  const multiSeries = useMemo(() => {
    if (!seriesProp || !seriesPalettes) return undefined
    return seriesProp.map((s, i) => ({
      id: s.id,
      data: s.data,
      value: s.value,
      palette: seriesPalettes.get(s.id) ?? resolveTheme(s.color || SERIES_COLORS[i % SERIES_COLORS.length], theme),
      label: s.label,
    }))
  }, [seriesProp, seriesPalettes, theme])

  // Resolve momentum prop: boolean enables auto-detect, string overrides
  const showMomentum = momentum !== false
  const momentumOverride: Momentum | undefined =
    typeof momentum === 'string' ? momentum : undefined

  const defaultRight = badge ? 80 : grid ? 54 : 12
  const pad = {
    top: paddingOverride?.top ?? 12,
    right: paddingOverride?.right ?? defaultRight,
    bottom: paddingOverride?.bottom ?? 28,
    left: paddingOverride?.left ?? 12,
  }

  // Degen mode: explicit prop wins
  const degenEnabled = degenProp != null
    ? degenProp !== false
    : false
  const degenOptions: DegenOptions | undefined = degenEnabled
    ? (typeof degenProp === 'object' ? degenProp : {})
    : undefined

  // Window buttons state
  const [activeWindowSecs, setActiveWindowSecs] = useState(
    windows && windows.length > 0 ? windows[0].secs : windowSecs
  )
  const effectiveWindowSecs = windows ? activeWindowSecs : windowSecs

  // Measure active window button for sliding indicator
  useLayoutEffect(() => {
    if (!windows || windows.length === 0) return
    const btn = windowBtnRefs.current.get(activeWindowSecs)
    const bar = windowBarRef.current
    if (btn && bar) {
      const barRect = bar.getBoundingClientRect()
      const btnRect = btn.getBoundingClientRect()
      setIndicatorStyle({
        left: btnRect.left - barRect.left,
        width: btnRect.width,
      })
    }
  }, [activeWindowSecs, windows])

  // Measure active mode button for sliding indicator
  const activeMode = lineMode ? 'line' : 'candle'
  useLayoutEffect(() => {
    if (!onModeChange) return
    const btn = modeBtnRefs.current.get(activeMode)
    const bar = modeBarRef.current
    if (btn && bar) {
      const barRect = bar.getBoundingClientRect()
      const btnRect = btn.getBoundingClientRect()
      setModeIndicatorStyle({
        left: btnRect.left - barRect.left,
        width: btnRect.width,
      })
    }
  }, [activeMode, onModeChange])

  // Series toggle handler — prevent hiding the last visible series
  const handleSeriesToggle = useCallback((id: string) => {
    setHiddenSeries(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        onSeriesToggle?.(id, true)
      } else {
        // Count visible series — don't hide last one
        const totalSeries = seriesProp?.length ?? 0
        const visibleCount = totalSeries - next.size
        if (visibleCount <= 1) return prev
        next.add(id)
        onSeriesToggle?.(id, false)
      }
      return next
    })
  }, [seriesProp?.length, onSeriesToggle])

  const ws = windowStyle ?? 'default'

  useLivelineEngine(canvasRef, containerRef, {
    data,
    value,
    palette,
    windowSecs: effectiveWindowSecs,
    lerpSpeed,
    showGrid: grid,
    showBadge: isMultiSeries ? false : badge,
    showMomentum: isMultiSeries ? false : showMomentum,
    momentumOverride,
    showFill: isMultiSeries ? false : fill,
    referenceLine,
    formatValue,
    formatTime,
    padding: pad,
    onHover,
    showPulse: pulse,
    scrub,
    exaggerate,
    degenOptions: isMultiSeries ? undefined : degenOptions,
    badgeTail,
    badgeVariant,
    tooltipY,
    tooltipOutline,
    valueMomentumColor,
    valueDisplayRef: showValue ? valueDisplayRef : undefined,
    orderbookData: orderbook,
    loading,
    paused,
    emptyText,
    mode,
    candles,
    candleWidth,
    liveCandle,
    lineMode,
    lineData,
    lineValue,
    multiSeries,
    isMultiSeries,
    hiddenSeriesIds: hiddenSeries,
    announceRef,
  })

  // Design From: plain-language summary of what the canvas shows
  const summary = describeLiveline({
    loading,
    emptyText,
    mode,
    data,
    value,
    candles,
    liveCandle,
    lineMode,
    lineValue,
    series: seriesProp,
    hiddenSeries,
    momentum,
    windowSecs: effectiveWindowSecs,
    formatValue,
  })

  const cursorStyle = scrub ? cursor : 'default'

  const activeColor = highContrast
    ? (isDark ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.9)')
    : (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)')
  const inactiveColor = highContrast
    ? (isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)')
    : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.22)')

  return (
    <>
      {/* Live value display — above the chart */}
      {showValue && (
        <span
          ref={valueDisplayRef}
          style={{
            display: 'block',
            fontSize: 20,
            fontWeight: 500,
            fontFamily: '"SF Mono", Menlo, monospace',
            color: isDark ? 'rgba(255,255,255,0.85)' : '#111',
            transition: reducedMotion ? 'none' : 'color 0.3s',
            letterSpacing: '-0.01em',
            marginBottom: 8,
            paddingTop: 4,
            paddingInlineStart: pad.left,
          }}
        />
      )}

      {/* Control bars row — window pills + mode toggle + series chips side by side */}
      {((windows && windows.length > 0) || onModeChange || showSeriesToggle) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, marginInlineStart: pad.left }}>
          {/* Time window controls */}
          {windows && windows.length > 0 && (
            <div
              ref={windowBarRef}
              role="group"
              aria-label="Time window"
              style={{
                position: 'relative',
                display: 'inline-flex',
                gap: ws === 'text' ? 4 : 2,
                background: ws === 'text' ? 'transparent'
                  : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderRadius: ws === 'rounded' ? 999 : 6,
                padding: ws === 'text' ? 0 : ws === 'rounded' ? 3 : 2,
              }}
            >
              {/* Sliding indicator (default + rounded) */}
              {ws !== 'text' && indicatorStyle && (
                <div style={{
                  position: 'absolute',
                  top: ws === 'rounded' ? 3 : 2,
                  left: indicatorStyle.left,
                  width: indicatorStyle.width,
                  height: ws === 'rounded' ? 'calc(100% - 6px)' : 'calc(100% - 4px)',
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)',
                  borderRadius: ws === 'rounded' ? 999 : 4,
                  transition: slide,
                  pointerEvents: 'none' as const,
                }} />
              )}
              {windows.map((w) => {
                const isActive = w.secs === activeWindowSecs
                return (
                  <button
                    key={w.secs}
                    type="button"
                    aria-pressed={isActive}
                    className={focusRing}
                    ref={(el) => {
                      if (el) windowBtnRefs.current.set(w.secs, el)
                      else windowBtnRefs.current.delete(w.secs)
                    }}
                    onClick={() => {
                      setActiveWindowSecs(w.secs)
                      onWindowChange?.(w.secs)
                    }}
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      fontSize: 11,
                      padding: ws === 'text' ? '2px 6px' : '3px 10px',
                      borderRadius: ws === 'rounded' ? 999 : 4,
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      fontWeight: isActive ? 600 : 400,
                      background: 'transparent',
                      color: isActive ? activeColor : inactiveColor,
                      // forced colors drop the indicator, so mark the selection
                      textDecoration: forcedColors && isActive ? 'underline' : undefined,
                      transition: reducedMotion ? 'none' : 'color 0.2s, background 0.15s',
                      lineHeight: '16px',
                    }}
                  >
                    {w.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Mode toggle — separate bar with its own sliding indicator */}
          {onModeChange && (
            <div
              ref={modeBarRef}
              role="group"
              aria-label="Chart type"
              style={{
                position: 'relative',
                display: 'inline-flex',
                gap: ws === 'text' ? 4 : 2,
                background: ws === 'text' ? 'transparent'
                  : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderRadius: ws === 'rounded' ? 999 : 6,
                padding: ws === 'text' ? 0 : ws === 'rounded' ? 3 : 2,
              }}
            >
              {/* Sliding indicator */}
              {ws !== 'text' && modeIndicatorStyle && (
                <div style={{
                  position: 'absolute',
                  top: ws === 'rounded' ? 3 : 2,
                  left: modeIndicatorStyle.left,
                  width: modeIndicatorStyle.width,
                  height: ws === 'rounded' ? 'calc(100% - 6px)' : 'calc(100% - 4px)',
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)',
                  borderRadius: ws === 'rounded' ? 999 : 4,
                  transition: slide,
                  pointerEvents: 'none' as const,
                }} />
              )}
              {/* Line icon */}
              <button
                ref={(el) => {
                  if (el) modeBtnRefs.current.set('line', el)
                  else modeBtnRefs.current.delete('line')
                }}
                type="button"
                aria-label="Line"
                aria-pressed={activeMode === 'line'}
                className={focusRing}
                onClick={() => onModeChange('line')}
                style={{
                  position: 'relative',
                  zIndex: 1,
                  padding: '5px 7px',
                  borderRadius: ws === 'rounded' ? 999 : 4,
                  border: 'none',
                  cursor: 'pointer',
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path
                    d="M1 8.5C2.5 8.5 3 4 5.5 4S7.5 7 8.5 7C9.5 7 10 3.5 11 3.5"
                    stroke={activeMode === 'line' ? activeColor : inactiveColor}
                    strokeWidth={activeMode === 'line' ? 1.5 : 1.2}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </button>
              {/* Candle icon */}
              <button
                ref={(el) => {
                  if (el) modeBtnRefs.current.set('candle', el)
                  else modeBtnRefs.current.delete('candle')
                }}
                type="button"
                aria-label="Candlestick"
                aria-pressed={activeMode === 'candle'}
                className={focusRing}
                onClick={() => onModeChange('candle')}
                style={{
                  position: 'relative',
                  zIndex: 1,
                  padding: '5px 7px',
                  borderRadius: ws === 'rounded' ? 999 : 4,
                  border: 'none',
                  cursor: 'pointer',
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <line x1="3.5" y1="1" x2="3.5" y2="11"
                    stroke={activeMode === 'candle' ? activeColor : inactiveColor} strokeWidth="1" />
                  <rect x="2" y="3" width="3" height="5" rx="0.5"
                    fill={activeMode === 'candle' ? activeColor : inactiveColor} />
                  <line x1="8.5" y1="2" x2="8.5" y2="10"
                    stroke={activeMode === 'candle' ? activeColor : inactiveColor} strokeWidth="1" />
                  <rect x="7" y="4" width="3" height="4" rx="0.5"
                    fill={activeMode === 'candle' ? activeColor : inactiveColor} />
                </svg>
              </button>
            </div>
          )}

          {/* Series toggle chips */}
          {showSeriesToggle && (
            <div role="group" aria-label="Series" aria-hidden={isMultiSeries ? undefined : true} style={{
              display: 'inline-flex',
              gap: ws === 'text' ? 4 : 2,
              background: ws === 'text' ? 'transparent'
                : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              borderRadius: ws === 'rounded' ? 999 : 6,
              padding: ws === 'text' ? 0 : ws === 'rounded' ? 3 : 2,
              opacity: isMultiSeries ? 1 : 0,
              transition: reducedMotion ? 'none' : 'opacity 0.4s',
              pointerEvents: isMultiSeries ? 'auto' : 'none',
            }}>
              {(lastSeriesPropRef.current ?? []).map((s, si) => {
                const isHidden = hiddenSeries.has(s.id)
                const seriesColor = s.color || SERIES_COLORS[si % SERIES_COLORS.length]
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={!isHidden}
                    aria-label={seriesToggleCompact ? (s.label ?? s.id) : undefined}
                    tabIndex={isMultiSeries ? undefined : -1}
                    className={focusRing}
                    onClick={() => handleSeriesToggle(s.id)}
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      fontSize: 11,
                      padding: seriesToggleCompact
                        ? (ws === 'text' ? '2px 4px' : '5px 7px')
                        : (ws === 'text' ? '2px 6px' : '3px 8px'),
                      borderRadius: ws === 'rounded' ? 999 : 4,
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      fontWeight: 500,
                      background: isHidden ? 'transparent' : (ws === 'text' ? 'transparent' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)')),
                      color: isHidden ? inactiveColor : activeColor,
                      opacity: isHidden ? 0.4 : 1,
                      transition: reducedMotion ? 'none' : 'opacity 0.2s, background 0.15s, color 0.2s',
                      lineHeight: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: seriesToggleCompact ? 0 : 4,
                    }}
                  >
                    <span aria-hidden="true" style={{
                      width: seriesToggleCompact ? 8 : 6,
                      height: seriesToggleCompact ? 8 : 6,
                      borderRadius: '50%',
                      background: seriesColor,
                      flexShrink: 0,
                      opacity: isHidden ? 0.4 : 1,
                      transition: reducedMotion ? 'none' : 'opacity 0.2s',
                    }} />
                    {!seriesToggleCompact && (s.label ?? s.id)}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        className={className}
        // Design From: the plot is a time axis and never mirrors in RTL
        dir="ltr"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          ...style,
        }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={ariaLabel ?? (mode === 'candle' && !lineMode ? 'Live candlestick chart' : 'Live chart')}
          aria-describedby={summaryId}
          tabIndex={scrub ? 0 : undefined}
          aria-keyshortcuts={scrub ? 'ArrowLeft ArrowRight Home End Escape' : undefined}
          className={scrub ? 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring' : undefined}
          style={{ display: 'block', cursor: cursorStyle }}
        />
        <span id={summaryId} style={visuallyHidden}>{summary}</span>
        <span ref={announceRef} aria-live="polite" style={visuallyHidden} />
      </div>
    </>
  )
}
