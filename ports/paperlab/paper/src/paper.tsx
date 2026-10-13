'use client'

import { advance, Canvas, type RootState, useThree } from '@react-three/fiber'
import { forwardRef, useMemo, useRef } from 'react'
import { useRenderLoop } from '@/lib/render-loop'
import { PaperMesh, useResolvedConfig, type PaperHandle, type PaperMeshProps } from './paper-mesh'
import { PaperFallback, PaperMirror, supportsWebGL } from './paper-a11y'
import { PaperLighting } from './paper-scene-paper-lighting'
import { PaperBackdrop } from './paper-scene-backdrop'
import { ReleaseContextOnUnmount } from './paper-scene-release'
import { CANVAS_SHADOWS } from './paper-scene-shadows'

export interface PaperProps extends PaperMeshProps {
  /** Extra children rendered inside the canvas (lights are provided). */
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

/*
 * Ported from NourMtir0722/Paperlab (packages/paperlab/src/Paper.tsx and its
 * imports, one module per file) at commit 41914833cb9a. Modified by Design
 * From Labs: flat file names and import paths, GSAP tweens rewritten with
 * Motion (paper-ease), and the canvas drawn through render-loop with the
 * flat fallback layered over it until the first frame. Every change is in
 * docs/evidence/ports/paper/fidelity.md. Copyright 2026 Noor Mtir; Apache
 * License 2.0, with the upstream NOTICE, at the end of this file.
 */

/**
 * `<Paper />` owns its own `<Canvas>` and fills its parent container —
 * the parent must have a height. Use `<PaperMesh />` inside an existing
 * R3F scene instead.
 *
 * Ships with its accessibility layer: a hidden DOM mirror of the content,
 * `prefers-reduced-motion` support, and a flat DOM fallback when WebGL is
 * unavailable.
 */
export const Paper = forwardRef<PaperHandle, PaperProps>(function Paper(
  { children, className, style, ...meshProps },
  ref,
) {
  // Keyed on every prop resolveConfig reads — a content/stock/behavior change
  // must refresh the fallback, mirror, and lighting, not just the mesh.
  const config = useResolvedConfig(meshProps)
  const webgl = useMemo(() => (typeof window === 'undefined' ? true : supportsWebGL()), [])

  // Labs: the canvas is drawn by render-loop (decision 0021) rather than
  // R3F's own loop: R3F runs with frameloop="never" and each loop frame
  // advances this canvas's root alone, so drawing stops off screen and in
  // hidden tabs. The upstream's flat fallback is shown until the first frame
  // (the server render, the gallery tile) and whenever WebGL is missing.
  // Reduced motion keeps the 3D sheet, still, as upstream does (no autoplay).
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const store = useRef<(() => RootState) | null>(null)
  const loop = useRenderLoop(canvasRef, {
    context: 'none',
    maxDpr: 2,
    respectReducedMotion: false,
    setup: () => store,
    // R3F sizes its own drawing buffer.
    resize: () => {},
    render: (root, frame) => {
      const get = root.current
      if (!get) return false
      advance(frame.time, false, get())
      return true
    },
  })
  const ready = loop.status === 'ready'

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
      {webgl ? (
        <Canvas
          ref={canvasRef}
          frameloop="never"
          shadows={CANVAS_SHADOWS}
          camera={{ position: [0, 0.35, 2.4], fov: 40 }}
          dpr={[1, 2]}
        >
          <StoreBridge store={store} />
          <PaperBackdrop backdrop={config.scene.backdrop} />
          <PaperLighting
            preset={config.scene.lighting}
            // The overrides, which this component was resolving without: a
            // preset whose scene said "studio, but dimmer" rendered as plain
            // studio here while the editor showed the dimmer one.
            light={config.scene.light}
            // One floor height, shared: the ground the shadow falls on is the
            // ground a sheet lands on.
            floor={config.scene.floor.enabled ? config.scene.floor.y : -1.05}
            scale={8}
            reducedMotion={meshProps.reducedMotion}
            // A burn bright enough to light the room says so on its source.
            damage={meshProps.damage}
          />
          {config.scene.floor.enabled && (
            // Dark, matte and large enough to leave no edge in frame: what the
            // fire's light pools on, and what the paper it cuts loose lands on.
            <mesh rotation-x={-Math.PI / 2} position={[0, config.scene.floor.y, 0]} receiveShadow>
              <planeGeometry args={[40, 40]} />
              {config.scene.floor.roughness >= 1 ? (
                // Chalk: all the way matte, no highlight at all. A standard material,
                // even at full roughness, turns into a mirror of the key at a grazing
                // angle, which drew a bright band across a black set.
                <meshLambertMaterial color={config.scene.floor.color} />
              ) : (
                <meshStandardMaterial
                  color={config.scene.floor.color}
                  roughness={config.scene.floor.roughness}
                />
              )}
            </mesh>
          )}
          <PaperMesh ref={ref} {...meshProps} />
          {children}
          <ReleaseContextOnUnmount />
        </Canvas>
      ) : (
        <PaperFallback config={config} />
      )}
      {webgl ? (
        <div
          aria-hidden={ready || undefined}
          data-slot="paper-fallback"
          style={{
            position: 'absolute',
            inset: 0,
            opacity: ready ? 0 : 1,
            pointerEvents: ready ? 'none' : undefined,
            transition: 'opacity 200ms ease-out',
          }}
        >
          <PaperFallback config={config} />
        </div>
      ) : null}
      <PaperMirror config={config} />
    </div>
  )
})

/** Hands the canvas's R3F store to the loop outside it (Labs). */
function StoreBridge({ store }: { store: { current: (() => RootState) | null } }) {
  const get = useThree((state) => state.get)
  store.current = get
  return null
}
