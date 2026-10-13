"use client";

import React, { createContext, useContext, type RefObject, useRef, useCallback, useState, useId, useMemo } from "react";
import { type AnimationType, DEFAULTS, generateShimmerKey, SHIMMER_TRACE_CSS, type ShimmerConfig, type ShimmerProps, type ShimmerRect, useTrace } from "./shimmer-trace-core";

// ---- upstream: src/index.ts (module documentation; the exports are the declarations in this file and shimmer-trace-core) ----
/**
 * shimmer-trace
 *
 * React skeleton loaders that trace real DOM geometry and paint a single
 * synchronized overlay. No hand-authored skeleton shapes, no layout shift —
 * the same JSX you render when loaded is what gets measured while loading.
 *
 * ### How it works
 *
 * Wrap a tree in `<Shimmer loading>`. The component auto-detects its role:
 *
 * - **Master** (no parent Shimmer, or `stopPropagation`): hides children,
 *   traces their rects via `useTrace`, and renders a `ShimmerOverlay` of
 *   absolutely-positioned blocks over a `position:relative` container.
 * - **Reporter** (nested inside another Shimmer): measures its own subtree
 *   relative to the master ref and registers rects with the parent context,
 *   so a deeply nested Shimmer contributes to the single master overlay
 *   instead of painting its own.
 *
 * Nested Shimmers therefore share one overlay and one animation phase by
 * default. `stopPropagation` forces a nested Shimmer to act as a master.
 *
 * ### Skeleton shape sources (priority, while `loading=true`)
 *
 * 1. `as={Component}` — render `dummyLength ?? 1` instances of
 *    `<Component {...dummyData} />`. Children ignored during load. Best for
 *    cold-start lists with no real data yet.
 * 2. `dummyData` + children — each direct child is cloned with `dummyData`
 *    merged over its props. If `dummyLength` is set, the first templated
 *    child is cloned N times.
 * 3. Neither set — children render as-is. Combine with `useIsShimmering()`
 *    inside the child to skip data fetching and return an empty shape.
 *
 * `loading=false` always renders children untouched.
 *
 * ### Exports
 *
 * - {@link Shimmer} — core component. Props: `loading`, `dummyData`,
 *   `dummyLength`, `as`, `stopPropagation`, `className`, `style`, plus all
 *   {@link ShimmerConfig} fields (`animation`, `baseColor`, `highlightColor`,
 *   `speed`, `borderRadius`, `preserveBackground`).
 * - {@link createShimmer} — factory that bakes a {@link ShimmerConfig} into
 *   a pre-configured Shimmer component, avoiding a provider wrapper.
 * - {@link ShimmerSuspense} — `<Suspense>` boundary whose fallback is a
 *   `<Shimmer loading>` wrapping either an explicit `template` prop or the
 *   children themselves under `IsShimmeringContext` (Option B).
 * - {@link useIsShimmering} — `true` when rendered inside a
 *   `ShimmerSuspense` Option-B fallback; use it to short-circuit suspending
 *   data reads so the fallback paints an empty shape.
 * - {@link ShimmerContext}, {@link useShimmerContext} — low-level context
 *   exposing `register` / `unregister` / `masterRef` / `loading` / `config`,
 *   for building custom reporters.
 *
 * ### Types
 *
 * - {@link ShimmerProps} — full prop shape of `<Shimmer>`.
 * - {@link ShimmerConfig} — visual config shared by `Shimmer`,
 *   `createShimmer`, and `ShimmerSuspense`.
 * - {@link ShimmerRect} — measured `{ x, y, width, height, borderRadius }`
 *   block, positioned relative to the master container.
 * - {@link AnimationType} — `'wave' | 'pulse' | 'shine' | 'glow' | 'gradient'`.
 * - {@link ShimmerSuspenseProps} — props for `<ShimmerSuspense>`.
 */

// ---- upstream: src/ShimmerContext.tsx ----
export interface ShimmerContextValue {
	register: (id: string, rects: ShimmerRect[]) => void;
	unregister: (id: string) => void;
	/** Ref object (not .current) so Reporters always read a fresh value. */
	masterRef: RefObject<HTMLElement | null>;
	loading: boolean;
	config: Required<ShimmerConfig>;
}

export const ShimmerContext = createContext<ShimmerContextValue | null>(null);

export function useShimmerContext(): ShimmerContextValue | null {
	return useContext(ShimmerContext);
}

/**
 * True when rendered inside a ShimmerSuspense fallback (Option B).
 * Components use this to skip data fetching and return an empty shape.
 */
export const IsShimmeringContext = createContext<boolean>(false);

export function useIsShimmering(): boolean {
	return useContext(IsShimmeringContext);
}

// ---- upstream: src/ShimmerOverlay.tsx ----
interface ShimmerOverlayProps {
  rects: ShimmerRect[];
  animation: AnimationType;
  baseColor: string;
  highlightColor: string;
  speed: number;
}

/**
 * Returns animation-specific inline styles for each shimmer block.
 * For sweep-style animations (wave, shine), the colored gradient is rendered
 * as a child layer so the sweep can extend across the container in sync.
 */
function getBlockStyles(
  animation: AnimationType,
  baseColor: string,
  highlightColor: string,
  speed: number,
  rect: ShimmerRect,
): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    top: rect.y,
    left: rect.x,
    width: rect.width,
    height: rect.height,
    borderRadius: rect.borderRadius,
    overflow: 'hidden',
  };

  switch (animation) {
    case 'wave':
    case 'shine':
      return { ...base, background: baseColor };
    case 'pulse':
      return {
        ...base,
        background: baseColor,
        animation: `shimmer-trace-pulse ${speed}s ease-in-out infinite`,
      };
    case 'glow':
      return {
        ...base,
        background: baseColor,
        animation: `shimmer-trace-glow ${speed}s ease-in-out infinite`,
      };
    case 'gradient':
      return {
        ...base,
        backgroundImage: `linear-gradient(90deg, ${baseColor}, ${highlightColor}, ${baseColor})`,
        backgroundSize: '200% 100%',
        animation: `shimmer-trace-gradient ${speed * 1.5}s ease-in-out infinite`,
      };
  }
}

/**
 * Sweeping shine layer used by `wave` and `shine` animations.
 * Spans the full container width so the highlight sweeps in sync across all blocks.
 */
const SweepLayer: React.FC<{
  rect: ShimmerRect;
  highlightColor: string;
  speed: number;
  containerWidth: number;
  variant: 'wave' | 'shine';
}> = ({ rect, highlightColor, speed, containerWidth, variant }) => {
  const isShine = variant === 'shine';
  return (
    <div
      data-shimmer-sweep=""
      style={{
        position: 'absolute',
        top: 0,
        left: -rect.x,
        width: containerWidth > 0 ? containerWidth : '100vw',
        height: '100%',
        background: isShine
          ? `linear-gradient(115deg, transparent 30%, ${highlightColor} 50%, transparent 70%)`
          : `linear-gradient(90deg, transparent 0%, ${highlightColor} 50%, transparent 100%)`,
        animation: `${isShine ? 'shimmer-trace-shine' : 'shimmer-trace-wave'} ${speed}s ease-in-out infinite`,
      }}
    />
  );
};

/**
 * The overlay component rendered by the Master Shimmer.
 *
 * Renders one absolutely-positioned div per traced rect. Sweep-style
 * animations (`wave`, `shine`) get an additional gradient layer that spans
 * the container so the highlight passes across all blocks in sync.
 */
export const ShimmerOverlay: React.FC<ShimmerOverlayProps> = ({
  rects,
  animation,
  baseColor,
  highlightColor,
  speed,
}) => {
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);

  React.useLayoutEffect(() => {
    if (!overlayRef.current?.parentElement) return;
    setContainerWidth(overlayRef.current.parentElement.offsetWidth);
  }, [rects]);

  if (rects.length === 0) return null;

  const isSweep = animation === 'wave' || animation === 'shine';

  return (
    <div
      ref={overlayRef}
      role="status"
      aria-busy="true"
      aria-label="Loading content"
      data-shimmer-ignore="true"
      data-shimmer-overlay=""
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none',
        visibility: 'visible',
        ...({ "--shimmer-trace-base-color": baseColor } as React.CSSProperties),
      }}
    >
      {rects.map((rect, i) => (
        <div
          key={i}
          style={getBlockStyles(animation, baseColor, highlightColor, speed, rect)}
        >
          {isSweep && (
            <SweepLayer
              rect={rect}
              highlightColor={highlightColor}
              speed={speed}
              containerWidth={containerWidth}
              variant={animation as 'wave' | 'shine'}
            />
          )}
        </div>
      ))}
    </div>
  );
};

// ---- upstream: src/Shimmer.tsx ----
/**
 * The main Shimmer component.
 *
 * Auto-detects **Master** (no parent Shimmer) vs **Reporter** (nested).
 * - Master: renders children hidden, traces DOM, paints overlay.
 * - Reporter: measures own rects, reports to parent Master.
 *
 * ### Skeleton shape via `dummyData`
 *
 * Pass `dummyData` so children render with realistic data while loading.
 * No render-prop, no manual `data || fallback` in JSX.
 *
 * ```tsx
 * const userTemplate = { name: 'Loading...', role: '...', avatar: '' };
 *
 * <Shimmer loading={loading} dummyData={{ user: userTemplate }}>
 *   <UserCard user={user} />
 * </Shimmer>
 * ```
 *
 * ### List mode (`dummyLength`)
 *
 * Combined with `dummyData`, clones the first child N times with
 * template props merged in:
 *
 * ```tsx
 * <Shimmer
 *   loading={loading}
 *   dummyLength={5}
 *   dummyData={{ fruit: { name: 'xxxxx', price: '$0.00' } }}
 * >
 *   <FruitCard fruit={undefined as any} />
 * </Shimmer>
 * ```
 */
export function Shimmer({
	loading = false,
	children,
	dummyLength,
	dummyData,
	as,
	stopPropagation = false,
	animation,
	baseColor,
	highlightColor,
	speed,
	borderRadius,
	preserveBackground,
	className,
	style,
	loadingLabel = "Loading content",
}: ShimmerProps) {
	const parentContext = useShimmerContext();
	const isMaster = !parentContext || stopPropagation;
	const id = useId();

	const config = useMemo(
		() => ({
			animation:
				animation ?? parentContext?.config.animation ?? DEFAULTS.animation,
			baseColor:
				baseColor ?? parentContext?.config.baseColor ?? DEFAULTS.baseColor,
			highlightColor:
				highlightColor ??
				parentContext?.config.highlightColor ??
				DEFAULTS.highlightColor,
			speed: speed ?? parentContext?.config.speed ?? DEFAULTS.speed,
			borderRadius:
				borderRadius ??
				parentContext?.config.borderRadius ??
				DEFAULTS.borderRadius,
			preserveBackground:
				preserveBackground ??
				parentContext?.config.preserveBackground ??
				DEFAULTS.preserveBackground,
		}),
		[
			animation,
			baseColor,
			highlightColor,
			speed,
			borderRadius,
			preserveBackground,
			parentContext?.config,
		],
	);

	if (isMaster) {
		return (
			<MasterShimmer
				id={id}
				loading={loading}
				config={config}
				dummyLength={dummyLength}
				dummyData={dummyData}
				as={as}
				className={className}
				style={style}
				loadingLabel={loadingLabel}
			>
				{children}
			</MasterShimmer>
		);
	}

	return (
		<ReporterShimmer
			id={id}
			parentContext={parentContext!}
			config={config}
			dummyLength={dummyLength}
			dummyData={dummyData}
			as={as}
		>
			{children}
		</ReporterShimmer>
	);
}

/* ─────────────────── Master ─────────────────── */

interface MasterShimmerProps {
	id: string;
	loading: boolean;
	config: Required<typeof DEFAULTS>;
	children: React.ReactNode;
	dummyLength?: number;
	dummyData?: Record<string, any>;
	as?: React.ComponentType<any>;
	className?: string;
	style?: React.CSSProperties;
	loadingLabel: string;
}

function MasterShimmer({
	id,
	loading,
	config,
	children,
	dummyLength,
	dummyData,
	as,
	className,
	style,
	loadingLabel,
}: MasterShimmerProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	const [reporterRects, setReporterRects] = useState<
		Record<string, ShimmerRect[]>
	>({});

	const register = useCallback((rid: string, rects: ShimmerRect[]) => {
		setReporterRects((prev) => ({ ...prev, [rid]: rects }));
	}, []);

	const unregister = useCallback((rid: string) => {
		setReporterRects((prev) => {
			const next = { ...prev };
			delete next[rid];
			return next;
		});
	}, []);

	const tracedRects = useTrace(
		containerRef,
		loading,
		config.borderRadius || undefined,
	);

	const allRects = useMemo(() => {
		const reported = Object.values(reporterRects).flat();
		return [...tracedRects, ...reported];
	}, [tracedRects, reporterRects]);

	const renderedChildren = useSkeletonChildren({
		loading,
		children,
		dummyLength,
		dummyData,
		as,
		id,
	});

	const contextValue = useMemo(
		() => ({
			register,
			unregister,
			masterRef: containerRef,
			loading,
			config,
		}),
		[register, unregister, loading, config],
	);

	return (
		<ShimmerContext.Provider value={contextValue}>
			{/* Labs: the container is aria-hidden while loading (so is upstream's
			    status overlay inside it); this polite live region outside it
			    tells screen readers. Absolutely positioned and clipped, so it
			    takes no space in block, flex or grid parents. */}
			<span role="status" aria-live="polite" style={visuallyHidden}>
				{loading ? loadingLabel : null}
			</span>
			<div
				ref={containerRef}
				className={className}
				style={{
					position: "relative",
					visibility:
						loading && !config.preserveBackground ? "hidden" : undefined,
					...style,
				}}
				aria-hidden={loading || undefined}
				data-shimmer-master
				data-shimmer-preserve-bg={
					loading && config.preserveBackground ? "true" : undefined
				}
			>
				<style href="designfrom-shimmer-trace" precedence="default">
					{SHIMMER_TRACE_CSS}
				</style>
				{renderedChildren}

				{loading && (
					<ShimmerOverlay
						rects={allRects}
						animation={config.animation}
						baseColor={config.baseColor}
						highlightColor={config.highlightColor}
						speed={config.speed}
					/>
				)}
			</div>
		</ShimmerContext.Provider>
	);
}

/* ─────────────────── Reporter ─────────────────── */

interface ReporterShimmerProps {
	id: string;
	parentContext: NonNullable<ReturnType<typeof useShimmerContext>>;
	config: Required<typeof DEFAULTS>;
	children: React.ReactNode;
	dummyLength?: number;
	dummyData?: Record<string, any>;
	as?: React.ComponentType<any>;
}

function ReporterShimmer({
	id,
	parentContext,
	config,
	children,
	dummyLength,
	dummyData,
	as,
}: ReporterShimmerProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	const tracedRects = useTrace(
		containerRef,
		parentContext.loading,
		config.borderRadius || undefined,
		parentContext.masterRef,
	);

	React.useLayoutEffect(() => {
		if (!parentContext.loading || tracedRects.length === 0) {
			parentContext.unregister(id);
			return;
		}
		parentContext.register(id, tracedRects);
		return () => {
			parentContext.unregister(id);
		};
	}, [tracedRects, parentContext, id]);

	const renderedChildren = useSkeletonChildren({
		loading: parentContext.loading,
		children,
		dummyLength,
		dummyData,
		as,
		id,
	});

	return (
		<div
			ref={containerRef}
			data-shimmer-reporter
			style={{ display: "contents" }}
		>
			{renderedChildren}
		</div>
	);
}

/* ─────────────── Skeleton Children ─────────────── */

interface UseSkeletonChildrenParams {
	loading: boolean;
	children: React.ReactNode;
	dummyLength?: number;
	dummyData?: Record<string, any>;
	as?: React.ComponentType<any>;
	id: string;
}

/**
 * Build the rendered children tree.
 *
 * Priority during `loading=true`:
 * 1. `as` set → render `dummyLength` (or 1) instances of `<as {...dummyData} />`.
 *    Children ignored. Cold-start safe.
 * 2. `dummyData` set + children present → clone each child merging
 *    dummyData over its props. If `dummyLength` set, clone first
 *    templated child N times.
 * 3. None → pass children through (e.g. `useIsShimmering` flow).
 *
 * `loading=false` → children untouched.
 */
function useSkeletonChildren({
	loading,
	children,
	dummyLength,
	dummyData,
	as,
	id,
}: UseSkeletonChildrenParams): React.ReactNode {
	if (!loading) return children;

	if (as) {
		const count = dummyLength && dummyLength > 0 ? dummyLength : 1;
		const Component = as;
		return Array.from({ length: count }, (_, i) => (
			<Component
				{...(dummyData || {})}
				key={generateShimmerKey(`${id}-as-${i}`)}
			/>
		));
	}

	const childArray = React.Children.toArray(children);

	const templated = childArray.map((c, i) => {
		if (!React.isValidElement(c)) return c;
		const key = generateShimmerKey(`${id}-tpl-${i}`);
		const props = dummyData ? { ...dummyData, key } : { key };
		return React.cloneElement(c as React.ReactElement, props as any);
	});

	if (dummyLength && dummyLength > 0) {
		const first = templated.find((c) => React.isValidElement(c)) as
			| React.ReactElement
			| undefined;
		if (!first) return null;
		return Array.from({ length: dummyLength }, (_, i) =>
			React.cloneElement(first, {
				key: generateShimmerKey(`${id}-clone-${i}`),
			} as any),
		);
	}

	return templated;
}

// ---- upstream: src/ShimmerSuspense.tsx ----
export interface ShimmerSuspenseProps extends ShimmerConfig {
  children: React.ReactNode;
  /**
   * Explicit skeleton template. Rendered hidden and traced for shimmer shape.
   *
   * Preferred — pass the same component with no data props:
   * ```tsx
   * <ShimmerSuspense template={<UserCard />}>
   *   <UserCard />
   * </ShimmerSuspense>
   * ```
   *
   * If omitted, falls back to Option B: children are re-rendered with
   * `useIsShimmering()=true` so they can return an empty shape themselves.
   */
  template?: React.ReactNode;
  /** Labs: what screen readers announce while the fallback shows. Defaults to "Loading content". */
  loadingLabel?: string;
}

/**
 * Suspense boundary that automatically shows a shimmer skeleton while
 * children are suspended (e.g. useSuspenseQuery, use(promise), etc).
 *
 * **Option A — explicit template (preferred):**
 * ```tsx
 * <ShimmerSuspense template={<UserCard />}>
 *   <UserCard />
 * </ShimmerSuspense>
 * ```
 *
 * **Option B — useIsShimmering hook (no template):**
 * ```tsx
 * function UserCard() {
 *   const isShimmering = useIsShimmering();
 *   const data = isShimmering ? null : useSuspenseQuery(...);
 *   return <div><h3>{data?.name}</h3></div>;
 * }
 *
 * <ShimmerSuspense>
 *   <UserCard />
 * </ShimmerSuspense>
 * ```
 * Components must use `useIsShimmering()` to skip data fetching in shimmer mode,
 * otherwise they will also suspend inside the fallback (causing an empty skeleton).
 */
export function ShimmerSuspense({
  children,
  template,
  ...shimmerConfig
}: ShimmerSuspenseProps) {
  const skeletonContent =
    template !== undefined ? (
      template
    ) : (
      <IsShimmeringContext.Provider value={true}>
        {children}
      </IsShimmeringContext.Provider>
    );

  return (
    <React.Suspense
      fallback={
        <Shimmer loading={true} {...shimmerConfig}>
          {skeletonContent}
        </Shimmer>
      }
    >
      {children}
    </React.Suspense>
  );
}

// ---- upstream: src/createShimmer.tsx ----
/**
 * Factory function to create a pre-configured Shimmer component.
 * Avoids "Provider Hell" by baking config into the returned component.
 *
 * All config properties are optional — defaults are used for anything
 * not specified.
 *
 * @example
 * ```tsx
 * const AppShimmer = createShimmer({
 *   animation: 'pulse',
 *   baseColor: '#1a1a2e',
 *   highlightColor: '#16213e',
 *   speed: 2,
 * });
 *
 * <AppShimmer loading={isLoading}>
 *   <MyComponent />
 * </AppShimmer>
 * ```
 */
export function createShimmer(config: ShimmerConfig = {}) {
  const mergedConfig: Required<ShimmerConfig> = {
    animation: config.animation ?? DEFAULTS.animation,
    baseColor: config.baseColor ?? DEFAULTS.baseColor,
    highlightColor: config.highlightColor ?? DEFAULTS.highlightColor,
    speed: config.speed ?? DEFAULTS.speed,
    borderRadius: config.borderRadius ?? DEFAULTS.borderRadius,
    preserveBackground: config.preserveBackground ?? DEFAULTS.preserveBackground,
  };

  function ConfiguredShimmer(props: Omit<ShimmerProps, keyof ShimmerConfig> & Partial<ShimmerConfig>) {
    return (
      <Shimmer
        {...mergedConfig}
        {...props}
      />
    );
  }

  // Removed ConfiguredShimmer.displayName
  return ConfiguredShimmer;
}

// ---- Labs ----
/** The standard visually hidden (sr-only) clip: read by screen readers, never painted. */
const visuallyHidden: React.CSSProperties = {
	position: "absolute",
	width: 1,
	height: 1,
	padding: 0,
	margin: -1,
	overflow: "hidden",
	clip: "rect(0, 0, 0, 0)",
	whiteSpace: "nowrap",
	border: 0,
};
