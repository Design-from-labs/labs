import type { CandlePoint, LivelinePoint, Momentum } from './types'
import { detectMomentum } from './math/momentum'

// Design From addition: the text alternative for the canvas. The chart is
// drawn every frame, so assistive technology gets a plain-language summary
// (latest value, trend, window) that follows the props, plus keyboard
// scrubbing announcements from the engine.

/** 30 -> "30 seconds", 300 -> "5 minutes", 3600 -> "1 hour". */
export function formatWindow(secs: number): string {
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  if (secs >= 3600 && secs % 3600 === 0) return unit(secs / 3600, 'hour')
  if (secs >= 60 && secs % 60 === 0) return unit(secs / 60, 'minute')
  return unit(Math.round(secs * 10) / 10, 'second')
}

export interface DescribeInput {
  loading: boolean
  emptyText?: string
  mode: 'line' | 'candle'
  data: LivelinePoint[]
  value: number
  candles?: CandlePoint[]
  liveCandle?: CandlePoint
  lineMode?: boolean
  lineValue?: number
  series?: { label?: string; id: string; data: LivelinePoint[]; value: number }[]
  hiddenSeries: Set<string>
  momentum: boolean | Momentum
  windowSecs: number
  formatValue: (v: number) => string
}

export function describeLiveline(input: DescribeInput): string {
  const { formatValue: fmt } = input
  const span = `Showing the last ${formatWindow(input.windowSecs)}.`
  if (input.loading) return 'Loading.'
  const empty = `${input.emptyText ?? 'No data to display'}.`

  if (input.series && input.series.length > 0) {
    const shown = input.series.filter(s => !input.hiddenSeries.has(s.id) && s.data.length >= 2)
    if (shown.length === 0) return empty
    const values = shown.map(s => `${s.label ?? s.id} ${fmt(s.value)}`).join(', ')
    return `Latest values: ${values}. ${span}`
  }

  if (input.mode === 'candle') {
    const candles = input.candles ?? []
    if (candles.length < 2) return empty
    const c = input.liveCandle ?? candles[candles.length - 1]
    if (input.lineMode) {
      return `Latest value ${fmt(input.lineValue ?? c.close)}. ${span}`
    }
    return `Latest candle: open ${fmt(c.open)}, high ${fmt(c.high)}, low ${fmt(c.low)}, close ${fmt(c.close)}. ${span}`
  }

  if (input.data.length < 2) return empty
  const trend = input.momentum === false
    ? ''
    : { up: ', trending up', down: ', trending down', flat: '' }[
        typeof input.momentum === 'string' ? input.momentum : detectMomentum(input.data)
      ]
  return `Latest value ${fmt(input.value)}${trend}. ${span}`
}
