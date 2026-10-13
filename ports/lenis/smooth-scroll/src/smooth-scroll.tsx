"use client";

import Lenis, { type LenisOptions, type ScrollCallback } from 'lenis'
import {
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  type ReactNode,
  type RefAttributes,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

/*
 * Ported from darkroomengineering/lenis (packages/react/src: types.ts,
 * store.ts, provider.tsx and use-lenis.ts, merged in that order) at commit
 * eea71595f5ae (v1.3.26): https://github.com/darkroomengineering/lenis.
 * Upstream lines are kept as they are; only the imports are merged. The Labs
 * additions (SmoothScroll, which also loads the Lenis stylesheet, and the
 * useSmoothScroll alias) follow the upstream modules.
 *
 * Copyright (c) 2024 darkroom.engineering. MIT License; the full notice ends
 * this file.
 */

// ---- upstream: packages/react/src/types.ts ----
export type LenisContextValue = {
  lenis: Lenis
  addCallback: (callback: ScrollCallback, priority: number) => void
  removeCallback: (callback: ScrollCallback) => void
}

export type LenisProps = ComponentPropsWithoutRef<'div'> & {
  /**
   * Setup a global instance of Lenis
   * if `asChild`, the component will render wrapper and content divs
   * @default false
   */
  root?: boolean | 'asChild'
  /**
   * Lenis options
   */
  options?: LenisOptions
  /**
   * Auto-setup requestAnimationFrame
   * @default true
   * @deprecated use options.autoRaf instead
   */
  autoRaf?: boolean
  /**
   * Children
   */
  children?: ReactNode

  /**
   * Class name to be applied to the wrapper div
   * @default ''
   */
  className?: string | undefined
}

export type LenisRef = {
  /**
   * The wrapper div element
   *
   * Will only be defined if `root` is `false` or `root` is `asChild`
   */
  wrapper: HTMLDivElement | null
  /**
   * The content div element
   *
   * Will only be defined if `root` is `false` or `root` is `asChild`
   */
  content: HTMLDivElement | null
  /**
   * The lenis instance
   */
  lenis?: Lenis
}

// ---- upstream: packages/react/src/store.ts ----
type Listener<S> = (state: S) => void

export class Store<S> {
  private listeners: Listener<S>[] = []

  constructor(private state: S) {}

  set(state: S) {
    this.state = state

    for (const listener of this.listeners) {
      listener(this.state)
    }
  }

  subscribe(listener: Listener<S>) {
    this.listeners = [...this.listeners, listener]
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  get() {
    return this.state
  }
}

export function useStore<S>(store: Store<S>) {
  const [state, setState] = useState(store.get())

  useEffect(() => {
    return store.subscribe((state) => setState(state))
  }, [store])

  return state
}

// ---- upstream: packages/react/src/provider.tsx ----
export const LenisContext = createContext<LenisContextValue | null>(null)

/**
 * The root store for the lenis context
 *
 * This store serves as a fallback for the context if it is not available
 * and allows us to use the global lenis instance above a provider
 */
export const rootLenisContextStore = new Store<LenisContextValue | null>(null)

/**
 * React component to setup a Lenis instance
 */
export const ReactLenis: ForwardRefExoticComponent<
  LenisProps & RefAttributes<LenisRef>
> = forwardRef<LenisRef, LenisProps>(
  (
    {
      children,
      root = false,
      options = {},
      autoRaf = true,
      className = '',
      ...props
    }: LenisProps,
    ref
  ) => {
    const wrapperRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)

    const [lenis, setLenis] = useState<Lenis | undefined>(undefined)

    // Setup ref
    useImperativeHandle(
      ref,
      () => ({
        wrapper: wrapperRef.current,
        content: contentRef.current,
        lenis,
      }),
      [lenis]
    )

    // Setup lenis instance
    useEffect(() => {
      const lenis = new Lenis({
        ...options,
        ...(wrapperRef.current &&
          contentRef.current && {
            wrapper: wrapperRef.current!,
            content: contentRef.current!,
          }),
        autoRaf: options?.autoRaf ?? autoRaf, // this is to avoid breaking the autoRaf prop if it's still used (require breaking change)
      })

      setLenis(lenis)

      return () => {
        lenis.destroy()
        setLenis(undefined)
      }
    }, [autoRaf, JSON.stringify({ ...options, wrapper: null, content: null })])

    // Handle callbacks
    const callbacksRefs = useRef<
      {
        callback: ScrollCallback
        priority: number
      }[]
    >([])

    const addCallback: LenisContextValue['addCallback'] = useCallback(
      (callback, priority) => {
        callbacksRefs.current.push({ callback, priority })
        callbacksRefs.current.sort((a, b) => a.priority - b.priority)
      },
      []
    )

    const removeCallback: LenisContextValue['removeCallback'] = useCallback(
      (callback) => {
        callbacksRefs.current = callbacksRefs.current.filter(
          (cb) => cb.callback !== callback
        )
      },
      []
    )

    // This makes sure to set the global context if the root is true
    useEffect(() => {
      if (root && lenis) {
        rootLenisContextStore.set({ lenis, addCallback, removeCallback })

        return () => rootLenisContextStore.set(null)
      }
    }, [root, lenis, addCallback, removeCallback])

    // Setup callback listeners
    useEffect(() => {
      if (!lenis) return

      const onScroll: ScrollCallback = (data) => {
        for (const { callback } of callbacksRefs.current) {
          callback(data)
        }
      }

      lenis.on('scroll', onScroll)

      return () => {
        lenis.off('scroll', onScroll)
      }
    }, [lenis])

    if (!children) return null

    return (
      <LenisContext.Provider
        value={{ lenis: lenis!, addCallback, removeCallback }}
      >
        {root && root !== 'asChild' ? (
          children
        ) : (
          <div
            ref={wrapperRef}
            className={`${className} ${lenis?.className ?? ''}`.trim()}
            {...props}
          >
            <div ref={contentRef}>{children}</div>
          </div>
        )}
      </LenisContext.Provider>
    )
  }
)

// ---- upstream: packages/react/src/use-lenis.ts ----
// Fall back to an empty object if both context and store are not available
const fallbackContext: Partial<LenisContextValue> = {}

/**
 * Hook to access the Lenis instance and its methods
 *
 * @example <caption>Scroll callback</caption>
 *          useLenis((lenis) => {
 *            if (lenis.isScrolling) {
 *              console.log('Scrolling...')
 *            }
 *
 *            if (lenis.progress === 1) {
 *              console.log('At the end!')
 *            }
 *          })
 *
 * @example <caption>Scroll callback with dependencies</caption>
 *          useLenis((lenis) => {
 *            if (lenis.isScrolling) {
 *              console.log('Scrolling...', someDependency)
 *            }
 *          }, [someDependency])
 * @example <caption>Scroll callback with priority</caption>
 *          useLenis((lenis) => {
 *            if (lenis.isScrolling) {
 *              console.log('Scrolling...')
 *            }
 *          }, [], 1)
 * @example <caption>Instance access</caption>
 *          const lenis = useLenis()
 *
 *          handleClick() {
 *            lenis.scrollTo(100, {
 *              lerp: 0.1,
 *              duration: 1,
 *              easing: (t) => t,
 *              onComplete: () => {
 *                console.log('Complete!')
 *              }
 *            })
 *          }
 */
export function useLenis(
  callback?: ScrollCallback,
  deps: unknown[] = [],
  priority = 0
): Lenis | undefined {
  // Try to get the lenis instance from the context first
  const localContext = useContext(LenisContext)
  // Fall back to the root store if the context is not available
  const rootContext = useStore(rootLenisContextStore)
  // Fall back to the fallback context if all else fails
  const currentContext = localContext ?? rootContext ?? fallbackContext

  const { lenis, addCallback, removeCallback } = currentContext

  useEffect(() => {
    if (!(callback && addCallback && removeCallback && lenis)) return

    addCallback(callback, priority)
    callback(lenis)

    return () => {
      removeCallback(callback)
    }
  }, [lenis, addCallback, removeCallback, priority, ...deps, callback])

  return lenis
}

// ---- Labs: SmoothScroll ----

/**
 * The stylesheet Lenis recommends (packages/core/lenis.css, line for line):
 * auto height while Lenis runs, `overflow: clip` when stopped, contained
 * overscroll for opted-out regions, and no iframe pointer capture while
 * smoothing.
 */
const SMOOTH_SCROLL_CSS = `html.lenis,
html.lenis body {
  height: auto;
}

.lenis:not(.lenis-autoToggle).lenis-stopped {
  overflow: clip;
}

.lenis [data-lenis-prevent],
.lenis [data-lenis-prevent-wheel],
.lenis [data-lenis-prevent-touch],
.lenis [data-lenis-prevent-vertical],
.lenis [data-lenis-prevent-horizontal] {
  overscroll-behavior: contain;
}

.lenis.lenis-smooth iframe {
  pointer-events: none;
}

.lenis.lenis-autoToggle {
  transition-property: overflow;
  transition-duration: 1ms;
  transition-behavior: allow-discrete;
}`

/**
 * Smooth scrolling for the page (`root`) or for a scroll container (the
 * default renders a wrapper and a content div): `ReactLenis` plus the Lenis
 * stylesheet, hoisted and deduplicated by React. Lenis honours
 * `prefers-reduced-motion` (1:1 wheel tracking, instant `scrollTo`) unless
 * `options.respectReducedMotion` is false.
 */
export const SmoothScroll: ForwardRefExoticComponent<
  LenisProps & RefAttributes<LenisRef>
> = forwardRef<LenisRef, LenisProps>(function SmoothScroll(props, ref) {
  return (
    <>
      <style href="designfrom-smooth-scroll" precedence="default">
        {SMOOTH_SCROLL_CSS}
      </style>
      <ReactLenis ref={ref} {...props} />
    </>
  )
})

/** `useLenis` under the Labs name: the instance, and an optional scroll callback. */
export const useSmoothScroll: typeof useLenis = useLenis

export { ReactLenis as Lenis }
