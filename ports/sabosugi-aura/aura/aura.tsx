"use client";

import * as React from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { type RenderLoopStatus, useRenderLoop } from "@/lib/render-loop";
import { cn } from "@/lib/utils";

/*
 * Ported from Sabo Sugi's "Aura" pen (index.html of the CodePen 2.0 project):
 * https://codepen.io/editor/sabosugi/pen/01a0ecd0-036b-7ae5-ba96-479b08e3331f
 * The shader source below is upstream's, character for character; only the
 * GLSL ES 3.00 prelude that three.js would have added is written out, because
 * this port draws the same fullscreen triangle with WebGL 2 directly.
 *
 * Copyright (c) 2026 Sabo Sugi. MIT License; the full notice ends this file.
 */

// Upstream's vertex shader. three.js declares `position` for it; here it is
// the attribute of the same fullscreen triangle.
const VERTEX = `#version 300 es
precision highp float;
precision highp int;
in vec3 position;

  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Upstream's fragment shader. Prelude: what three.js adds to a ShaderMaterial
// for WebGL 2 (default precision, the output variable and the gl_FragColor
// alias); everything after it is upstream's `fragmentShader` string.
const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor

  uniform vec2  uResolution;
  uniform float uTime;

  uniform float uFocalLength;
  uniform vec3  uCameraPosition;
  uniform mat3  uCameraRotation;

  uniform int   uRaySteps;
  uniform int   uWarpSteps;

  uniform float uStartDistance;
  uniform float uEpsilon;
  uniform float uLineWidth;
  uniform float uLineCore;
  uniform float uLineHeight;
  uniform float uWarpSmoothness;
  uniform float uWarpFrequency;
  uniform float uCenterWarpAmount;
  uniform float uCenterRadius;

  uniform vec3  uTint;
  uniform float uExposure;
  uniform float uBackgroundCutoff;

  uniform float uJitterStrength;
  uniform float uDitherStrength;
  uniform float uNoiseReferenceHeight;

  // Interleaved gradient noise, deterministic, range [0, 1)
  float gradientNoise(vec2 p) {
    return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
  }

  // Triangular distributed dither, range (-1, 1)
  float triangularDither(vec2 p) {
    return gradientNoise(p) + gradientNoise(p + vec2(47.3, 13.9)) - 1.0;
  }

  void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 resolution = max(uResolution, vec2(1.0));

    // Centered coordinates with correct aspect ratio
    vec2 screenPosition = (2.0 * fragCoord - resolution) / resolution.y;

    // Deformation mask: weak at center, full at center radius and beyond
    float centerDistance = length(screenPosition);
    float warpMask = mix(
      uCenterWarpAmount,
      1.0,
      smoothstep(0.0, max(uCenterRadius, 0.001), centerDistance)
    );

    // Vertical stretch: taller lines, same horizontal width
    screenPosition.y /= max(uLineHeight, 0.05);

    vec3 rayDirection = uCameraRotation * normalize(vec3(screenPosition, max(uFocalLength, 0.001)));

    // Noise grain size in physical pixels, stays visible on high-DPI screens
    float pixelScale = max(1.0, floor(resolution.y / uNoiseReferenceHeight + 0.5));
    vec2 noiseCoord = floor(fragCoord / pixelScale);

    vec3 color = vec3(0.0);

    // Per-pixel start offset breaks up ray marching bands
    float rayDistance = uStartDistance + uJitterStrength * gradientNoise(noiseCoord);
    float stepDistance = 0.1;

    // Glow level at cutoff distance, subtracted to keep background black
    float backgroundGlow = 1.0 / (uBackgroundCutoff * uBackgroundCutoff + uLineCore);

    for (int stepIndex = 20; stepIndex < uRaySteps; ++stepIndex) {
      float iteration = float(stepIndex) + 2.0;

      vec3 position = uCameraPosition + rayDistance * rayDirection;

      // Phase is invariant for all warp octaves of this step
      float phase = uTime + iteration - rayDistance;

      for (int warpIndex = 1; warpIndex <= uWarpSteps; ++warpIndex) {
        float frequency = float(warpIndex);

        // High octaves damped stronger, center mask reduces deformation
        float amplitude = 0.52 * warpMask * pow(frequency, -uWarpSmoothness);

        position += amplitude * sin(position.yzx * (frequency * uWarpFrequency) + phase) - 0.12;
      }

      vec4 distanceVector = vec4(
        abs(position.y + position.z * 0.20),
        sin(position - rayDistance) / 3.99
      );

      stepDistance = length(distanceVector) / (4.73 + rayDistance * rayDistance * 0.14);
      stepDistance = max(stepDistance, uEpsilon);

      vec3 palette = 0.9 + sin(iteration * 1.3 - vec3(4.8, -0.4, 1.2));

      float safeRayDistance = max(rayDistance, uStartDistance);

      // Glow distance shrunk by line width: widens the bright core
      float glowDistance = max(stepDistance - uLineWidth, 0.0);
      float glowFalloff = glowDistance * glowDistance + uLineCore;

      // Glow tail beyond the cutoff is removed
      float glow = max(1.0 / glowFalloff - backgroundGlow, 0.0);

      color += palette * glow / safeRayDistance;

      rayDistance += stepDistance;
    }

    color *= uTint;

    // Stable approximation of tanh tone mapping
    color /= max(uExposure, 1.0);
    vec3 e = exp(2.0 * clamp(color, -10.0, 10.0));
    color = (e - 1.0) / (e + 1.0);
    color = clamp(color, 0.0, 1.0);

    // Output dithering, disabled on pure black
    vec3 ditherMask = clamp(color * 255.0, 0.0, 1.0);
    color += ditherMask * triangularDither(fragCoord) * uDitherStrength / 255.0;
    color = clamp(color, 0.0, 1.0);

    gl_FragColor = vec4(color, 1.0);
  }
`;

/**
 * Upstream's `params` (the values its debug panel started from). The props
 * below default to these; the rest of the panel's values stay fixed.
 */
export const AURA_DEFAULTS = {
  focalLength: 0.09,
  speed: 0.65,
  startDistance: 0.45,
  epsilon: 0.0097,
  lineWidth: 0.0086,
  lineCore: 0.0001,
  lineHeight: 1.84,
  warpSmoothness: 2.32,
  warpFrequency: 2.42,
  centerWarpAmount: 0.18,
  centerRadius: 0.57,
  warpSteps: 7,
  tint: "#ffffff",
  exposure: 2000,
  backgroundCutoff: 0.093,
  jitterStrength: 0,
  ditherStrength: 1.6,
  noiseReferenceHeight: 1080,
  dpr: 1,
  raySteps: 50,
} as const;

/** The moment shown as a still under reduced motion (seconds of animation). */
export const AURA_STILL_TIME = 12;

const MIN_DPR = 0.5;
const MAX_DPR = 3;

const UNIFORMS = [
  "uResolution",
  "uTime",
  "uFocalLength",
  "uCameraPosition",
  "uCameraRotation",
  "uRaySteps",
  "uWarpSteps",
  "uStartDistance",
  "uEpsilon",
  "uLineWidth",
  "uLineCore",
  "uLineHeight",
  "uWarpSmoothness",
  "uWarpFrequency",
  "uCenterWarpAmount",
  "uCenterRadius",
  "uTint",
  "uExposure",
  "uBackgroundCutoff",
  "uJitterStrength",
  "uDitherStrength",
  "uNoiseReferenceHeight",
] as const;

type UniformName = (typeof UNIFORMS)[number];

interface AuraProgram {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  shaders: WebGLShader[];
  buffer: WebGLBuffer;
  vao: WebGLVertexArrayObject;
  uniforms: Record<UniformName, WebGLUniformLocation | null>;
}

// Upstream's geometry: one triangle that covers the whole viewport.
const TRIANGLE = new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]);

// With no camera rotation, upstream's `uCameraRotation` is the identity.
const IDENTITY_3 = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

function createProgram(gl: WebGL2RenderingContext): AuraProgram {
  const shaders: WebGLShader[] = [];
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const vao = gl.createVertexArray();
  const dispose = () => release({ gl, program, shaders, buffer, vao });
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error("Could not create a shader.");
    }
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) ?? "Shader compile failed.");
    }
    gl.attachShader(program, shader);
  };
  try {
    compile(gl.VERTEX_SHADER, VERTEX);
    compile(gl.FRAGMENT_SHADER, FRAGMENT);
    gl.bindAttribLocation(program, 0, "position");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "Program link failed.");
    }
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, TRIANGLE, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  } catch (error) {
    dispose();
    throw error;
  }
  const uniforms = Object.fromEntries(
    UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)]),
  ) as AuraProgram["uniforms"];
  return { gl, program, shaders, buffer, vao, uniforms };
}

/**
 * Frees the program's GL objects. After a context restore they belong to the
 * lost context's generation, so deleting them would only log warnings: the
 * `is*` checks skip what no longer exists.
 */
function release({
  gl,
  program,
  shaders,
  buffer,
  vao,
}: Pick<AuraProgram, "gl" | "program" | "shaders" | "buffer" | "vao">) {
  for (const shader of shaders) {
    if (gl.isShader(shader)) {
      gl.deleteShader(shader);
    }
  }
  if (gl.isProgram(program)) {
    gl.deleteProgram(program);
  }
  if (gl.isBuffer(buffer)) {
    gl.deleteBuffer(buffer);
  }
  if (gl.isVertexArray(vao)) {
    gl.deleteVertexArray(vao);
  }
}

function disposeProgram(aura: AuraProgram) {
  release(aura);
}

/** `#rgb` or `#rrggbb` to 0..1 channels (no color management, as upstream). */
function parseTint(tint: string): [number, number, number] {
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(tint.trim())?.[1];
  if (!hex) {
    return [1, 1, 1];
  }
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  return [
    Number.parseInt(full.slice(0, 2), 16) / 255,
    Number.parseInt(full.slice(2, 4), 16) / 255,
    Number.parseInt(full.slice(4, 6), 16) / 255,
  ];
}

const clamp = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;

/** Sizes the drawing buffer as upstream's `setSize` does (floor of CSS size
 * times the pixel ratio). */
function fitBuffer(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  ratio: number,
) {
  const w = Math.max(1, Math.floor(width * ratio));
  const h = Math.max(1, Math.floor(height * ratio));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

export interface AuraProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  /** Plays the animation. Default true. */
  playing?: boolean;
  /** Animation speed (0 to 5). Default 0.65, upstream's. */
  speed?: number;
  /**
   * Shows one moment, in seconds of animation time, and stops the clock. Use
   * it for stills and screenshots.
   */
  time?: number;
  /** Multiplies the light, `#rgb` or `#rrggbb`. Default "#ffffff". */
  tint?: string;
  /** Divides the light before tone mapping (200 to 8000): lower is brighter. Default 2000. */
  exposure?: number;
  /** Width of the bright line cores (0 to 0.05). Default 0.0086. */
  lineWidth?: number;
  /** Vertical stretch of the lines (0.1 to 5). Default 1.84. */
  lineHeight?: number;
  /** How tightly the lines wind (0.1 to 6). Default 2.42. */
  warpFrequency?: number;
  /** How quickly the winding fades at high detail (0 to 5). Default 2.32. */
  warpSmoothness?: number;
  /** Ray marching steps (21 to 150): more is smoother and slower. Default 50. */
  raySteps?: number;
  /**
   * The exact pixel ratio of the drawing buffer (0.5 to 3), whatever the
   * screen: upstream draws at 1 even on high-density displays. Default 1.
   */
  dpr?: number;
  /** Shown instead of the canvas when WebGL 2 is unavailable, and before the first frame. */
  fallback?: React.ReactNode;
  /** Called with the loop status, for example to hide controls without WebGL. */
  onStatusChange?: (status: RenderLoopStatus) => void;
}

/**
 * The picture without WebGL 2 and before the first frame, in CSS only: a
 * soft fan of spectral light rising from one point, as the shader draws it.
 */
function AuraFallback() {
  const apex = "50% 49%";
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to bottom, #000 0%, #000 45%, transparent 55%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, #000 0%, #000 45%, transparent 55%)",
      }}
    >
      <div
        className="absolute inset-[-10%]"
        style={{
          background: `conic-gradient(from 270deg at ${apex}, #38c2ee 0deg, #bfe9dc 8deg, #c9b0e0 20deg, #f1e7ae 32deg, #8a5f46 44deg, #1a2a5e 58deg, #0a1850 75deg, #0a1850 105deg, #0f2a68 122deg, #8a7c78 140deg, #b99bc4 152deg, #a5c4ea 168deg, #d6efe6 180deg)`,
          filter: "blur(18px)",
        }}
      />
      <div
        className="absolute inset-[-10%]"
        style={{
          background: `repeating-conic-gradient(from 270deg at ${apex}, transparent 0deg 4deg, rgba(0,0,0,0.38) 7deg 11deg, transparent 14deg 19deg)`,
          filter: "blur(8px)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0) 65%)",
        }}
      />
      <div
        className="absolute h-[14%] w-[22%]"
        style={{
          left: "39%",
          top: "42%",
          background:
            "radial-gradient(closest-side, rgba(255,255,255,0.9), rgba(255,255,255,0))",
        }}
      />
    </div>
  );
}

/**
 * A raymarched field of glowing, winding light lines, drawn by one WebGL 2
 * fragment shader. Decorative by default: a stage that fills its box.
 */
export function Aura({
  playing = true,
  speed = AURA_DEFAULTS.speed,
  time,
  tint = AURA_DEFAULTS.tint,
  exposure = AURA_DEFAULTS.exposure,
  lineWidth = AURA_DEFAULTS.lineWidth,
  lineHeight = AURA_DEFAULTS.lineHeight,
  warpFrequency = AURA_DEFAULTS.warpFrequency,
  warpSmoothness = AURA_DEFAULTS.warpSmoothness,
  raySteps = AURA_DEFAULTS.raySteps,
  dpr = AURA_DEFAULTS.dpr,
  fallback,
  onStatusChange,
  className,
  "aria-label": ariaLabel,
  ...props
}: AuraProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();
  // Under reduced motion nothing moves: a still frame, unless a moment is set.
  const fixedTime = time ?? (reducedMotion ? AURA_STILL_TIME : undefined);
  const settings = {
    playing,
    speed,
    fixedTime,
    tint,
    exposure,
    lineWidth,
    lineHeight,
    warpFrequency,
    warpSmoothness,
    raySteps,
    dpr,
  };
  const current = React.useRef(settings);
  current.current = settings;
  const position = React.useRef(fixedTime ?? 0);
  const moving = fixedTime === undefined && playing;

  const { status, invalidate } = useRenderLoop<AuraProgram>(canvasRef, {
    context: "webgl2",
    contextAttributes: {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
    },
    // The pixel ratio is the `dpr` prop itself (see `resize`), not a cap.
    maxDpr: 1,
    continuous: moving,
    // Reduced motion draws one still frame instead of the CSS fallback.
    respectReducedMotion: false,
    setup: (_canvas, context) =>
      createProgram(context as WebGL2RenderingContext),
    resize: (_aura, size) => {
      const canvas = canvasRef.current;
      if (canvas) {
        fitBuffer(
          canvas,
          size.width,
          size.height,
          clamp(current.current.dpr, MIN_DPR, MAX_DPR),
        );
      }
    },
    dispose: disposeProgram,
    render: (aura, frame) => {
      const s = current.current;
      if (s.fixedTime !== undefined) {
        position.current = s.fixedTime;
      } else if (s.playing) {
        // Upstream: animationTime += min(clock.getDelta(), 0.1) * speed.
        position.current += frame.delta * clamp(s.speed, 0, 5);
      }
      const { gl, program, uniforms, vao } = aura;
      const canvas = gl.canvas as HTMLCanvasElement;
      fitBuffer(
        canvas,
        frame.width,
        frame.height,
        clamp(s.dpr, MIN_DPR, MAX_DPR),
      );
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;
      gl.viewport(0, 0, width, height);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform2f(uniforms.uResolution, width, height);
      gl.uniform1f(uniforms.uTime, position.current);
      gl.uniform1f(uniforms.uFocalLength, AURA_DEFAULTS.focalLength);
      gl.uniform3f(uniforms.uCameraPosition, 0, 0, 0);
      gl.uniformMatrix3fv(uniforms.uCameraRotation, false, IDENTITY_3);
      gl.uniform1i(uniforms.uRaySteps, Math.round(clamp(s.raySteps, 21, 150)));
      gl.uniform1i(uniforms.uWarpSteps, AURA_DEFAULTS.warpSteps);
      gl.uniform1f(uniforms.uStartDistance, AURA_DEFAULTS.startDistance);
      gl.uniform1f(uniforms.uEpsilon, AURA_DEFAULTS.epsilon);
      gl.uniform1f(uniforms.uLineWidth, clamp(s.lineWidth, 0, 0.05));
      gl.uniform1f(uniforms.uLineCore, AURA_DEFAULTS.lineCore);
      gl.uniform1f(uniforms.uLineHeight, clamp(s.lineHeight, 0.1, 5));
      gl.uniform1f(uniforms.uWarpSmoothness, clamp(s.warpSmoothness, 0, 5));
      gl.uniform1f(uniforms.uWarpFrequency, clamp(s.warpFrequency, 0.1, 6));
      gl.uniform1f(uniforms.uCenterWarpAmount, AURA_DEFAULTS.centerWarpAmount);
      gl.uniform1f(uniforms.uCenterRadius, AURA_DEFAULTS.centerRadius);
      gl.uniform3fv(uniforms.uTint, parseTint(s.tint));
      gl.uniform1f(uniforms.uExposure, clamp(s.exposure, 200, 8000));
      gl.uniform1f(uniforms.uBackgroundCutoff, AURA_DEFAULTS.backgroundCutoff);
      gl.uniform1f(uniforms.uJitterStrength, AURA_DEFAULTS.jitterStrength);
      gl.uniform1f(uniforms.uDitherStrength, AURA_DEFAULTS.ditherStrength);
      gl.uniform1f(
        uniforms.uNoiseReferenceHeight,
        AURA_DEFAULTS.noiseReferenceHeight,
      );
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  });

  // A still, or a paused field, draws on demand: after every render, so any
  // prop change shows up.
  React.useEffect(() => {
    invalidate();
  });

  React.useEffect(() => {
    onStatusChange?.(status);
  }, [onStatusChange, status]);

  const labelled = Boolean(ariaLabel || props["aria-labelledby"]);
  const ready = status === "ready";
  // Keep the canvas laid out while the context is lost: a hidden canvas is
  // off screen to the loop's IntersectionObserver, so a restored context
  // would never draw again.
  const showCanvas = status !== "unsupported";
  return (
    <div
      data-slot="aura"
      data-status={status}
      {...(labelled
        ? { role: "img" as const, "aria-label": ariaLabel }
        : { "aria-hidden": true as const })}
      className={cn(
        "relative aspect-video w-full overflow-hidden bg-[var(--aura-background,#000)]",
        className,
      )}
      {...props}
    >
      <canvas
        ref={canvasRef}
        data-slot="aura-canvas"
        className={cn("block size-full", !showCanvas && "hidden")}
      />
      <div
        data-slot="aura-fallback"
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none",
          ready && "opacity-0",
        )}
      >
        {fallback ?? <AuraFallback />}
      </div>
    </div>
  );
}
