"use client";

import * as React from "react";

import { type RenderLoopStatus, useRenderLoop } from "@/lib/render-loop";
import { cn } from "@/lib/utils";

/*
 * Ported from mark-x64's ribbon shader study, at commit 775a3c093a14:
 * https://github.com/mark-x64/siri-ribbon-shader (src/ribbon.frag,
 * src/renderer.js and the playback loop of src/App.jsx). Renamed, with no
 * reference footage and no third-party branding.
 *
 * Copyright (c) 2026 Mark By. MIT License; the full notice ends this file.
 */

// The vertex stage draws one oversized triangle from gl_VertexID, so no
// buffers are needed (upstream src/renderer.js).
const VERTEX = `#version 300 es
precision highp float;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// Upstream src/ribbon.frag, unchanged: pure analytic light, no textures.
const FRAGMENT = `#version 300 es
precision highp float;
// Pure analytic light: no samplers, textures, frame buffers or reference pixels.
// A displaced RGB light ribbon plus its wider optical diffusion.
// All fitted values are low-order geometry / light parameters, not frame data.
uniform vec2 uResolution;
uniform float uTime, uIntensity, uHeight, uDispersion, uBloom, uFull;
out vec4 fragColor;

float gaussian(float x) { return exp(-0.5 * x * x); }

vec3 ribbon(vec2 uv, float time) {
    float z = time * 6.100180;
    vec3 cycle = vec3(1.0, sin(z), cos(z));
    // d(phase)/dt stays positive: the wave travels from right to left.
    float phase = -4.824537 + z + 0.371364 * sin(z) + -0.304856 * (cos(z) - 1.0) + 0.010850 * sin(2.0 * z);
    float baseline = dot(vec3(0.726896, 0.002852, 0.003134), cycle);
    float amplitude = dot(vec3(0.158162, -0.002412, 0.002027), cycle);
    float frequency = dot(vec3(4.570563, 0.120447, 0.125378), cycle);
    float tilt = dot(vec3(0.012385, -0.033358, 0.003878), cycle);
    float redPhase = dot(vec3(-0.394510, 0.013870, 0.017730), cycle);
    float bluePhase = dot(vec3(0.503310, 0.003127, 0.046292), cycle);
    float redWidth = dot(vec3(0.109624, -0.011169, 0.029950), cycle);
    float greenWidth = dot(vec3(0.103850, -0.012551, 0.030449), cycle);
    float blueWidth = dot(vec3(0.102429, -0.011292, 0.029249), cycle);
    float redEnergy = dot(vec3(0.726313, 0.100913, 0.100206), cycle);
    float greenEnergy = dot(vec3(0.758115, 0.100969, 0.085402), cycle);
    float blueEnergy = dot(vec3(0.791408, 0.070306, 0.070721), cycle);
    float lightCenter = dot(vec3(0.675112, -0.016285, 0.050804), cycle);
    float lightRadius = dot(vec3(0.351151, -0.041723, 0.036320), cycle);
    float diffusion = dot(vec3(0.375303, 0.116438, -0.130536), cycle);
    float coreEnergy = dot(vec3(0.024771, -0.009025, 0.005595), cycle);
    float coreWidth = dot(vec3(0.051309, -0.016287, 0.001463), cycle);
    float widthWave = dot(vec3(0.108698, -0.002688, -0.305189), cycle);
    float asymmetry = dot(vec3(0.008941, 0.034254, 0.014939), cycle);
    float secondHarmonic = dot(vec3(-0.002633, 0.002816, 0.000144), cycle);
    // Broaden the same light field; lose the white core as its energy spreads.
    float dissolve = uFull * smoothstep(1.076589, 1.518624, time);
    float expansion = 1.0 + dissolve * 3.623702;
    float fade = 1.0;
    if (uFull > 0.5) fade = exp(-5.766464 * max(time - 1.142785, 0.0));
    phase += 0.528093 * dissolve;
    baseline += -0.051802 * dissolve;
    lightCenter += -0.064073 * dissolve;
    lightRadius += 0.090304 * dissolve;
    amplitude *= uHeight;
    vec3 shifts = vec3(redPhase, 0.0, bluePhase) * uDispersion * (1.0 + dissolve * 3.117125);
    vec3 widths = max(vec3(redWidth, greenWidth, blueWidth), vec3(0.008)) * expansion;
    vec3 energies = max(vec3(redEnergy, greenEnergy, blueEnergy), vec3(0.0));
    float theta = frequency * uv.x + phase;
    float light = gaussian((uv.x - lightCenter) / max(lightRadius, 0.008));
    float commonY = baseline + amplitude * sin(theta) + tilt * (uv.x - 0.5) + secondHarmonic * sin(2.0 * theta);
    float whiteCore = max(coreEnergy, 0.0) * gaussian((uv.y - commonY) / max(coreWidth * expansion, 0.008));
    whiteCore *= exp(2.864576 * sin(theta) + -0.034796 * cos(theta)) * (1.0 - 1.000000 * dissolve);
    vec3 color = vec3(0.0);
    for (int channel = 0; channel < 3; channel++) {
        float angle = theta + shifts[channel];
        float centerY = baseline + amplitude * sin(angle) + tilt * (uv.x - 0.5) + secondHarmonic * sin(2.0 * angle);
        float distanceY = uv.y - centerY;
        float width = widths[channel] * (1.0 + clamp(widthWave, -0.75, 0.75) * sin(angle));
        width *= exp(asymmetry * tanh(distanceY / 0.12));
        float source = gaussian(distanceY / width);
        float glow = max(diffusion, 0.0) * gaussian(distanceY / (width * 3.0));
        vec3 densitySin = vec3(0.001207, -0.066348, -0.134531);
        vec3 densityCos = vec3(-0.143807, -0.134067, -0.073692);
        float density = exp(densitySin[channel] * sin(angle) + densityCos[channel] * cos(angle));
        color[channel] = (energies[channel] * density * (source + uBloom * glow) + whiteCore) * light;
    }
    return clamp(color * uIntensity * fade, 0.0, 1.0);
}
void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    uv.y = 1.0 - uv.y;
    fragColor = vec4(ribbon(uv, uTime), 1.0);
}`;

/** Length of the full sequence (wave, spread, fade) in seconds. */
export const IRIDESCENT_RIBBON_DURATION = 3.533333;
/** Length of the wave loop in seconds. */
export const IRIDESCENT_RIBBON_WAVE_DURATION = 1.03;

const UNIFORMS = [
  "uResolution",
  "uTime",
  "uIntensity",
  "uHeight",
  "uDispersion",
  "uBloom",
  "uFull",
] as const;

interface RibbonProgram {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  shaders: WebGLShader[];
  uniforms: Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>;
}

function createProgram(gl: WebGL2RenderingContext): RibbonProgram {
  const shaders: WebGLShader[] = [];
  const program = gl.createProgram();
  const dispose = () => {
    for (const shader of shaders) {
      gl.deleteShader(shader);
    }
    gl.deleteProgram(program);
  };
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
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "Program link failed.");
    }
  } catch (error) {
    dispose();
    throw error;
  }
  const uniforms = Object.fromEntries(
    UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)]),
  ) as RibbonProgram["uniforms"];
  return { gl, program, shaders, uniforms };
}

function disposeProgram({ gl, program, shaders }: RibbonProgram) {
  for (const shader of shaders) {
    gl.deleteShader(shader);
  }
  gl.deleteProgram(program);
}

export interface IridescentRibbonProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  /**
   * "full" plays the wave, then spreads it into a soft color field that fades
   * out; "wave" loops the travelling wave only. Default "full".
   */
  sequence?: "full" | "wave";
  /** Plays the sequence. Default true. */
  playing?: boolean;
  /** Playback rate. Default 1. */
  speed?: number;
  /** Repeats the sequence when it ends. Default true. */
  loop?: boolean;
  /**
   * Shows one moment, in seconds, and stops the clock (upstream `?time=`).
   * Use it for stills and screenshots.
   */
  time?: number;
  /** Wave height. Default 1 (0.4 to 1.6 reads well). */
  amplitude?: number;
  /** Color separation between the red, green and blue bands. Default 1. */
  dispersion?: number;
  /** The wide glow around the bands. Default 1. */
  glow?: number;
  /** Overall brightness. Default 1. */
  brightness?: number;
  /** Device pixel ratio cap. Default 2. */
  maxDpr?: number;
  /** Shown instead of the canvas without WebGL 2 or under reduced motion. */
  fallback?: React.ReactNode;
  /** Called with the loop status, for example to hide controls without WebGL. */
  onStatusChange?: (status: RenderLoopStatus) => void;
}

/** The static picture shown without WebGL 2, under reduced motion and before
 * the first frame: the ribbon's travelling wave, drawn in SVG. */
function RibbonFallback() {
  const id = React.useId();
  return (
    <svg
      viewBox="0 0 160 90"
      preserveAspectRatio="none"
      className="size-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-band`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#ff5a7a" stopOpacity="0" />
          <stop offset="0.3" stopColor="#ff6aa8" />
          <stop offset="0.55" stopColor="#7fe3ff" />
          <stop offset="0.8" stopColor="#8a7bff" />
          <stop offset="1" stopColor="#8a7bff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <path
        d="M0 66 C 20 52, 40 52, 60 66 S 100 80, 120 66 S 150 54, 160 60"
        fill="none"
        stroke={`url(#${id}-band)`}
        strokeWidth="14"
        filter={`url(#${id}-glow)`}
        opacity="0.7"
      />
      <path
        d="M0 66 C 20 52, 40 52, 60 66 S 100 80, 120 66 S 150 54, 160 60"
        fill="none"
        stroke={`url(#${id}-band)`}
        strokeWidth="2.5"
      />
    </svg>
  );
}

/**
 * A procedural iridescent light ribbon: three phase-shifted Gaussian bands on
 * a travelling wave, drawn by one WebGL 2 fragment shader.
 */
export function IridescentRibbon({
  sequence = "full",
  playing = true,
  speed = 1,
  loop = true,
  time,
  amplitude = 1,
  dispersion = 1,
  glow = 1,
  brightness = 1,
  maxDpr = 2,
  fallback,
  onStatusChange,
  className,
  "aria-label": ariaLabel,
  ...props
}: IridescentRibbonProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const position = React.useRef(time ?? 0);
  const settings = {
    sequence,
    playing,
    speed,
    loop,
    time,
    amplitude,
    dispersion,
    glow,
    brightness,
  };
  const current = React.useRef(settings);
  current.current = settings;
  const fixed = time !== undefined;

  const { status, invalidate } = useRenderLoop<RibbonProgram>(canvasRef, {
    context: "webgl2",
    contextAttributes: {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
    },
    maxDpr,
    continuous: !fixed && playing,
    setup: (_canvas, context) =>
      createProgram(context as WebGL2RenderingContext),
    dispose: disposeProgram,
    render: (ribbon, frame) => {
      const s = current.current;
      const duration =
        s.sequence === "full"
          ? IRIDESCENT_RIBBON_DURATION
          : IRIDESCENT_RIBBON_WAVE_DURATION;
      if (s.time !== undefined) {
        position.current = Math.max(
          0,
          Math.min(IRIDESCENT_RIBBON_DURATION, s.time),
        );
      } else if (s.playing) {
        position.current += frame.delta * s.speed;
        if (position.current >= duration) {
          position.current = s.loop ? 0 : duration;
        }
      }
      const { gl, program, uniforms } = ribbon;
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;
      gl.viewport(0, 0, width, height);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
      gl.useProgram(program);
      gl.uniform2f(uniforms.uResolution, width, height);
      gl.uniform1f(uniforms.uTime, position.current);
      gl.uniform1f(uniforms.uIntensity, s.brightness);
      gl.uniform1f(uniforms.uHeight, s.amplitude);
      gl.uniform1f(uniforms.uDispersion, s.dispersion);
      gl.uniform1f(uniforms.uBloom, s.glow);
      gl.uniform1f(uniforms.uFull, s.sequence === "full" ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  });

  // A still (fixed time) or a paused ribbon draws on demand: after every
  // render, so any prop change shows up.
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
  const showCanvas = status !== "unsupported" && status !== "reduced-motion";
  return (
    <div
      data-slot="iridescent-ribbon"
      data-status={status}
      {...(labelled
        ? { role: "img" as const, "aria-label": ariaLabel }
        : { "aria-hidden": true as const })}
      className={cn(
        "relative aspect-video w-full overflow-hidden bg-[var(--iridescent-ribbon-background,#000)]",
        className,
      )}
      {...props}
    >
      <canvas
        ref={canvasRef}
        data-slot="iridescent-ribbon-canvas"
        className={cn("block size-full", !showCanvas && "hidden")}
      />
      <div
        data-slot="iridescent-ribbon-fallback"
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none",
          ready && "opacity-0",
        )}
      >
        {fallback ?? <RibbonFallback />}
      </div>
    </div>
  );
}
