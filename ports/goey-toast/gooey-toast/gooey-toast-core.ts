'use client'

import { type ReactNode, useEffect, useState } from 'react'
import type { ExternalToast, ToasterProps } from 'sonner'

// ---- upstream: src/types.ts ----

export type GooeyToastType = 'default' | 'success' | 'error' | 'warning' | 'info'

export interface GooeyToastTimings {
  displayDuration?: number
}

export interface GooeyToastClassNames {
  wrapper?: string
  content?: string
  header?: string
  title?: string
  icon?: string
  description?: string
  actionWrapper?: string
  actionButton?: string
}

export interface GooeyToastAction {
  label: string
  onClick: () => void
  successLabel?: string
}

export interface GooeyToastData {
  title: string
  description?: ReactNode
  type: GooeyToastType
  action?: GooeyToastAction
  icon?: ReactNode
  duration?: number
  classNames?: GooeyToastClassNames
  fillColor?: string
  borderColor?: string
  borderWidth?: number
  preset?: AnimationPresetName
  spring?: boolean
  bounce?: number
  showTimestamp?: boolean
}

export interface GooeyToastOptions {
  description?: ReactNode
  action?: GooeyToastAction
  icon?: ReactNode
  duration?: number
  id?: string | number
  classNames?: GooeyToastClassNames
  fillColor?: string
  borderColor?: string
  borderWidth?: number
  timing?: GooeyToastTimings
  preset?: AnimationPresetName
  spring?: boolean
  bounce?: number
  showProgress?: boolean
  showTimestamp?: boolean
  onDismiss?: (id: string | number) => void
  onAutoClose?: (id: string | number) => void
}

export interface GooeyPromiseData<T> {
  loading: string
  success: string | ((data: T) => string)
  error: string | ((error: unknown) => string)
  description?: {
    loading?: ReactNode
    success?: ReactNode | ((data: T) => ReactNode)
    error?: ReactNode | ((error: unknown) => ReactNode)
  }
  action?: {
    success?: GooeyToastAction
    error?: GooeyToastAction
  }
  classNames?: GooeyToastClassNames
  fillColor?: string
  borderColor?: string
  borderWidth?: number
  timing?: GooeyToastTimings
  preset?: AnimationPresetName
  spring?: boolean
  bounce?: number
  showTimestamp?: boolean
  onDismiss?: (id: string | number) => void
  onAutoClose?: (id: string | number) => void
}

export type GooeyToastPhase = 'loading' | 'default' | 'success' | 'error' | 'warning' | 'info'

export interface GooeyToastUpdateOptions {
  title?: string
  description?: ReactNode
  type?: GooeyToastType
  action?: GooeyToastAction
  icon?: ReactNode | null
  showTimestamp?: boolean
}

export interface DismissFilter {
  type: GooeyToastType | GooeyToastType[]
}

export interface GooeyToasterProps {
  position?: ToasterProps['position']
  duration?: number
  gap?: number
  offset?: number | string
  theme?: 'light' | 'dark'
  toastOptions?: Partial<ExternalToast>
  expand?: boolean
  closeButton?: boolean | 'top-left' | 'top-right'
  richColors?: boolean
  visibleToasts?: number
  dir?: 'ltr' | 'rtl'
  preset?: AnimationPresetName
  spring?: boolean
  bounce?: number
  swipeToDismiss?: boolean
  closeOnEscape?: boolean
  maxQueue?: number
  queueOverflow?: 'drop-oldest' | 'drop-newest'
  showProgress?: boolean
  showTimestamp?: boolean
}

// ---- upstream: src/presets.ts ----

export interface AnimationPreset {
  bounce: number
  spring: boolean
}

export const animationPresets = {
  smooth: { bounce: 0.1, spring: true },
  bouncy: { bounce: 0.6, spring: true },
  subtle: { bounce: 0.05, spring: true },
  snappy: { bounce: 0.4, spring: true },
} as const satisfies Record<string, AnimationPreset>

export type AnimationPresetName = keyof typeof animationPresets

// ---- upstream: src/context.ts ----

let _position: ToasterProps['position'] = 'bottom-right'
let _dir: 'ltr' | 'rtl' = 'ltr'
let _spring: boolean = true
let _bounce: number | undefined = undefined
let _theme: 'light' | 'dark' = 'light'

export function setGooeyTheme(theme: 'light' | 'dark') {
  _theme = theme
}

export function getGooeyTheme(): 'light' | 'dark' {
  return _theme
}

export function setGooeyPosition(position: ToasterProps['position']) {
  _position = position
}

export function getGooeyPosition() {
  return _position
}

export function setGooeyDir(dir: 'ltr' | 'rtl') {
  _dir = dir
}

export function getGooeyDir(): 'ltr' | 'rtl' {
  return _dir
}

export function setGooeySpring(spring: boolean) {
  _spring = spring
}

export function getGooeySpring() {
  return _spring
}

export function setGooeyBounce(bounce: number | undefined) {
  _bounce = bounce
}

export function getGooeyBounce() {
  return _bounce
}

let _visibleToasts = 3

export function setGooeyVisibleToasts(n: number) {
  _visibleToasts = n
}

export function getGooeyVisibleToasts() {
  return _visibleToasts
}

// ---------------------------------------------------------------------------
// Container hover — broadcast from GooeyToaster to all mounted GooeyToast instances
// so timers pause and re-expand triggers correctly when hovering the stack.
// ---------------------------------------------------------------------------
let _swipeToDismiss = true

export function setGooeySwipeToDismiss(enabled: boolean) {
  _swipeToDismiss = enabled
}

export function getGooeySwipeToDismiss() {
  return _swipeToDismiss
}

let _closeOnEscape = true

export function setGooeyCloseOnEscape(enabled: boolean) {
  _closeOnEscape = enabled
}

export function getGooeyCloseOnEscape() {
  return _closeOnEscape
}

let _maxQueue = Infinity

export function setGooeyMaxQueue(n: number) {
  _maxQueue = n
}

export function getGooeyMaxQueue() {
  return _maxQueue
}

let _queueOverflow: 'drop-oldest' | 'drop-newest' = 'drop-oldest'

export function setGooeyQueueOverflow(strategy: 'drop-oldest' | 'drop-newest') {
  _queueOverflow = strategy
}

export function getGooeyQueueOverflow() {
  return _queueOverflow
}

let _showProgress = false

export function setGooeyShowProgress(show: boolean) {
  _showProgress = show
}

export function getGooeyShowProgress() {
  return _showProgress
}

let _showTimestamp = true

export function setGooeyShowTimestamp(show: boolean) {
  _showTimestamp = show
}

export function getGooeyShowTimestamp() {
  return _showTimestamp
}

let _closeButton: boolean | 'top-left' | 'top-right' = false

export function setGooeyCloseButton(value: boolean | 'top-left' | 'top-right') {
  _closeButton = value
}

export function getGooeyCloseButton(): boolean | 'top-left' | 'top-right' {
  return _closeButton
}

let _containerHovered = false
type HoverCb = (hovered: boolean) => void
const _hoverSubs: Set<HoverCb> = new Set()

export function setContainerHovered(hovered: boolean) {
  if (_containerHovered === hovered) return
  _containerHovered = hovered
  _hoverSubs.forEach(cb => cb(hovered))
}

export function getContainerHovered() {
  return _containerHovered
}

export function subscribeContainerHovered(cb: HoverCb): () => void {
  _hoverSubs.add(cb)
  return () => { _hoverSubs.delete(cb) }
}

// ---------------------------------------------------------------------------
// ARIA live region announcer — pushes text to a persistent live region so
// screen readers detect toast notifications reliably.
// ---------------------------------------------------------------------------
export type AriaLivePoliteness = 'polite' | 'assertive'

interface Announcement {
  message: string
  politeness: AriaLivePoliteness
}

type AnnounceCb = (announcement: Announcement) => void
const _announceSubs: Set<AnnounceCb> = new Set()

export function announce(message: string, politeness: AriaLivePoliteness = 'polite') {
  _announceSubs.forEach(cb => cb({ message, politeness }))
}

export function subscribeAnnouncements(cb: AnnounceCb): () => void {
  _announceSubs.add(cb)
  return () => { _announceSubs.delete(cb) }
}

// ---- upstream: src/usePrefersReducedMotion.ts ----

const QUERY = '(prefers-reduced-motion: reduce)'

function getInitialState(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(QUERY).matches
}

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getInitialState)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const mql = window.matchMedia(QUERY)
    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

// ---- upstream: src/components/gooey-styles.ts ----

/** Static class name map — avoids CSS module bundling issues with tsup */
export const styles = {
  spinnerSpin: 'gooey-spinnerSpin',
  wrapper: 'gooey-wrapper',
  blobSvg: 'gooey-blobSvg',
  content: 'gooey-content',
  contentCompact: 'gooey-contentCompact',
  contentExpanded: 'gooey-contentExpanded',
  header: 'gooey-header',
  iconWrapper: 'gooey-iconWrapper',
  title: 'gooey-title',
  titleDefault: 'gooey-titleDefault',
  titleSuccess: 'gooey-titleSuccess',
  titleError: 'gooey-titleError',
  titleWarning: 'gooey-titleWarning',
  titleInfo: 'gooey-titleInfo',
  titleLoading: 'gooey-titleLoading',
  description: 'gooey-description',
  actionWrapper: 'gooey-actionWrapper',
  actionButton: 'gooey-actionButton',
  actionDefault: 'gooey-actionDefault',
  actionSuccess: 'gooey-actionSuccess',
  actionError: 'gooey-actionError',
  actionWarning: 'gooey-actionWarning',
  actionInfo: 'gooey-actionInfo',
  progressWrapper: 'gooey-progressWrapper',
  progressBar: 'gooey-progressBar',
  progressDefault: 'gooey-progressDefault',
  progressSuccess: 'gooey-progressSuccess',
  progressError: 'gooey-progressError',
  progressWarning: 'gooey-progressWarning',
  progressInfo: 'gooey-progressInfo',
  progressPaused: 'gooey-progressPaused',
  timestamp: 'gooey-timestamp',
  closeButton: 'gooey-closeButton',
  closeButtonRight: 'gooey-closeButtonRight',
} as const

/**
 * Labs port: upstream ships this as `goey-toast/styles.css`. Here it is a
 * string the toaster injects once, so installing the item needs no CSS import.
 */
export const gooeyToastCss = `
/* Spinner animation */
.gooey-spinnerSpin {
  animation: gooey-toast-spin 1s linear infinite;
}

@keyframes gooey-toast-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Center position: center the toast within Sonner's container */
[data-sonner-toast][data-x-position="center"] {
  left: 0 !important;
  right: 0 !important;
  margin-left: auto !important;
  margin-right: auto !important;
  width: fit-content !important;
}

/* Fix mobile centering: override Sonner's mobile offset variables for center positions */
@media only screen and (max-width: 600px) {
  [data-sonner-toaster][data-x-position='center'] {
    left: 50% !important;
    right: auto !important;
    transform: translateX(-50%) !important;
  }
}

/* Style detection marker — used by GooeyToaster to verify CSS is loaded */
[data-gooey-toast-css] { --gooey-toast: 1; }

/* When Sonner expands the stack (hover), our syncSonnerHeights corrections are
   applied synchronously (before paint) by the shared MutationObserver, so the
   transform/height transition target is always the correct value — there is no
   stale-offset frame to cause overlap. This lets us use a smooth ease-out curve
   over a longer duration so toasts glide between stacked positions instead of
   snapping. */
[data-sonner-toast][data-expanded="true"] {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
              opacity 0.4s,
              height 0.35s cubic-bezier(0.22, 1, 0.36, 1),
              box-shadow 0.2s !important;
}

@media (prefers-reduced-motion: reduce) {
  [data-sonner-toast][data-expanded="true"] {
    transition: opacity 0.01s, box-shadow 0.01s !important;
  }
}


/* ============================================
   Wrapper — single container for both states
   ============================================ */
.gooey-wrapper {
  pointer-events: auto;
  cursor: default;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  position: relative;
  width: fit-content;
}

/* SVG background — parametric morph from pill to blob */
.gooey-blobSvg {
  position: absolute;
  top: 0;
  left: 0;
  overflow: visible;
  pointer-events: none;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.06))
          drop-shadow(0 1px 4px rgba(0, 0, 0, 0.04));
}

/* Content on top of SVG background */
.gooey-content {
  position: relative;
  z-index: 1;
  transition: padding 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.gooey-contentCompact {
  padding: 7px 10px 7px 10px;
}

.gooey-contentExpanded {
  padding: 7px 10px 16px 10px;
  min-width: 300px;
  max-width: 380px;
}

/* ============================================
   Shared
   ============================================ */
.gooey-header {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: inherit;
}

.gooey-header > .gooey-title,
.gooey-header > .gooey-timestamp {
  min-width: 0;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.gooey-header > .gooey-timestamp {
  margin-left: auto;
}

.gooey-iconWrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  line-height: 0;
}

.gooey-title {
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  color: inherit;
  padding: 0 4px 2px 2px;
}

.gooey-titleDefault { color: #555; }
.gooey-titleSuccess { color: #4CAF50; }
.gooey-titleError { color: #E53935; }
.gooey-titleWarning { color: #C49000; }
.gooey-titleInfo { color: #1E88E5; }
.gooey-titleLoading { color: #555; }

.gooey-timestamp {
  font-size: 11px;
  font-weight: 400;
  color: #999;
  white-space: nowrap;
  line-height: 1;
  padding-left: 6px;
}

.gooey-description {
  font-size: 13px;
  font-weight: 400;
  color: #444;
  line-height: 1.55;
  margin-top: 16px;
  overflow: hidden;
}

.gooey-actionWrapper {
  margin-top: 12px;
  overflow: hidden;
}

.gooey-actionButton {
  display: block;
  box-sizing: border-box;
  width: 100%;
  border: none;
  border-radius: 999px;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  text-align: center;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s ease;
}

.gooey-actionButton:focus:not(:focus-visible) {
  outline: none;
}

.gooey-actionButton:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.gooey-actionDefault {
  background: #E8E8E8;
  color: #555;
}
.gooey-actionDefault:hover { background: #DCDCDC; }
.gooey-actionDefault:active { background: #D0D0D0; }

.gooey-actionSuccess {
  background: #C8E6C9;
  color: #4CAF50;
}
.gooey-actionSuccess:hover { background: #A5D6A7; }
.gooey-actionSuccess:active { background: #81C784; }

.gooey-actionError {
  background: #FFCDD2;
  color: #E53935;
}
.gooey-actionError:hover { background: #EF9A9A; }
.gooey-actionError:active { background: #E57373; }

.gooey-actionWarning {
  background: #FFECB3;
  color: #C49000;
}
.gooey-actionWarning:hover { background: #FFE082; }
.gooey-actionWarning:active { background: #FFD54F; }

.gooey-actionInfo {
  background: #BBDEFB;
  color: #1E88E5;
}
.gooey-actionInfo:hover { background: #90CAF9; }
.gooey-actionInfo:active { background: #64B5F6; }

/* ============================================
   Progress countdown bar
   ============================================ */
.gooey-progressWrapper {
  margin-top: 10px;
  overflow: hidden;
  border-radius: 2px;
  height: 3px;
  background: rgba(0, 0, 0, 0.06);
}

.gooey-progressBar {
  height: 100%;
  border-radius: 2px;
  transform-origin: left center;
  animation: gooey-toast-progress-shrink var(--gooey-toast-progress-duration, 4000ms) linear forwards;
  animation-play-state: running;
}

.gooey-progressPaused .gooey-progressBar {
  animation-play-state: paused;
}

@keyframes gooey-toast-progress-shrink {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}

.gooey-progressDefault { background: #999; }
.gooey-progressSuccess { background: #4CAF50; }
.gooey-progressError { background: #E53935; }
.gooey-progressWarning { background: #C49000; }
.gooey-progressInfo { background: #1E88E5; }

/* ============================================
   Dark mode
   ============================================ */

.gooey-wrapper[data-theme="dark"] .gooey-blobSvg {
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))
          drop-shadow(0 1px 4px rgba(0, 0, 0, 0.2));
}

.gooey-wrapper[data-theme="dark"] .gooey-titleDefault { color: #ccc; }
.gooey-wrapper[data-theme="dark"] .gooey-titleSuccess { color: #66BB6A; }
.gooey-wrapper[data-theme="dark"] .gooey-titleError { color: #EF5350; }
.gooey-wrapper[data-theme="dark"] .gooey-titleWarning { color: #FFB300; }
.gooey-wrapper[data-theme="dark"] .gooey-titleInfo { color: #42A5F5; }
.gooey-wrapper[data-theme="dark"] .gooey-titleLoading { color: #ccc; }

.gooey-wrapper[data-theme="dark"] .gooey-timestamp {
  color: #777;
}

.gooey-wrapper[data-theme="dark"] .gooey-description {
  color: #e0e0e0;
}

.gooey-wrapper[data-theme="dark"] .gooey-actionDefault {
  background: #3a3a3a;
  color: #ccc;
}
.gooey-wrapper[data-theme="dark"] .gooey-actionDefault:hover { background: #444; }
.gooey-wrapper[data-theme="dark"] .gooey-actionDefault:active { background: #4e4e4e; }

.gooey-wrapper[data-theme="dark"] .gooey-actionSuccess {
  background: #1b5e20;
  color: #66BB6A;
}
.gooey-wrapper[data-theme="dark"] .gooey-actionSuccess:hover { background: #2e7d32; }
.gooey-wrapper[data-theme="dark"] .gooey-actionSuccess:active { background: #388e3c; }

.gooey-wrapper[data-theme="dark"] .gooey-actionError {
  background: #b71c1c;
  color: #EF5350;
}
.gooey-wrapper[data-theme="dark"] .gooey-actionError:hover { background: #c62828; }
.gooey-wrapper[data-theme="dark"] .gooey-actionError:active { background: #d32f2f; }

.gooey-wrapper[data-theme="dark"] .gooey-actionWarning {
  background: #4a3800;
  color: #FFB300;
}
.gooey-wrapper[data-theme="dark"] .gooey-actionWarning:hover { background: #5c4600; }
.gooey-wrapper[data-theme="dark"] .gooey-actionWarning:active { background: #6e5400; }

.gooey-wrapper[data-theme="dark"] .gooey-actionInfo {
  background: #0d47a1;
  color: #42A5F5;
}
.gooey-wrapper[data-theme="dark"] .gooey-actionInfo:hover { background: #1565c0; }
.gooey-wrapper[data-theme="dark"] .gooey-actionInfo:active { background: #1976d2; }

.gooey-wrapper[data-theme="dark"] .gooey-progressWrapper {
  background: rgba(255, 255, 255, 0.1);
}
.gooey-wrapper[data-theme="dark"] .gooey-progressDefault { background: #888; }
.gooey-wrapper[data-theme="dark"] .gooey-progressSuccess { background: #66BB6A; }
.gooey-wrapper[data-theme="dark"] .gooey-progressError { background: #EF5350; }
.gooey-wrapper[data-theme="dark"] .gooey-progressWarning { background: #FFB300; }
.gooey-wrapper[data-theme="dark"] .gooey-progressInfo { background: #42A5F5; }

/* ---------------------------------------------------------------------------
   Close button — appears on hover, positioned top-left by default.
   Use closeButton="top-right" on GooeyToaster for top-right placement.
   Border and background are set inline to match the toast's own styling.
   --------------------------------------------------------------------------- */
.gooey-closeButton {
  position: absolute;
  top: -6px;
  left: -6px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border-style: solid;
  border-radius: 50%;
  color: #444;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease, transform 0.15s ease;
  pointer-events: none;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}
.gooey-closeButtonRight {
  left: auto;
  right: -1px;
  top: 6px;
}
.gooey-wrapper:hover .gooey-closeButton,
.gooey-wrapper:focus-within .gooey-closeButton,
.gooey-wrapper:active .gooey-closeButton {
  opacity: 1;
  pointer-events: auto;
}
.gooey-closeButton:focus,
.gooey-closeButton:focus-visible {
  opacity: 1;
  pointer-events: auto;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.15);
}
.gooey-closeButton:hover {
  transform: scale(1.15);
}
.gooey-closeButton:active {
  transform: scale(0.95);
}
.gooey-wrapper[data-theme="dark"] .gooey-closeButton {
  color: #e0e0e0;
  box-shadow: 0 1px 4px rgba(255, 255, 255, 0.25);
}
`

let gooeyStyleEl: HTMLStyleElement | null = null

export function ensureGooeyToastStyles() {
  if (gooeyStyleEl || typeof document === 'undefined') return
  const existing = document.querySelector<HTMLStyleElement>('style[data-gooey-toast]')
  if (existing) {
    gooeyStyleEl = existing
    return
  }
  gooeyStyleEl = document.createElement('style')
  gooeyStyleEl.dataset.gooeyToast = 'true'
  gooeyStyleEl.textContent = gooeyToastCss
  // Upstream's stylesheet loads before Sonner injects its own, and several
  // rules rely on that order, so go in just ahead of Sonner's <style>.
  const sonnerStyle = Array.from(document.head.querySelectorAll('style')).find((el) =>
    el.textContent?.includes('[data-sonner-toaster]'),
  )
  document.head.insertBefore(gooeyStyleEl, sonnerStyle ?? null)
}
