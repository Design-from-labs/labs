# aura: fidelity

- Upstream: Sabo Sugi's [Aura](https://codepen.io/editor/sabosugi/pen/01a0ecd0-036b-7ae5-ba96-479b08e3331f), a CodePen 2.0 pen (MIT by its own Details view, copyright 2026 Sabo Sugi; S-524, S-451), read from the pen's editor on 2026-10-13 and kept verbatim in `ports/sabosugi-aura/aura/upstream/` (the snapshot-pinning decision, 0030). The pen's files: `index.html` (all the code, 15,706 characters, SHA-256 `0768ad0b16279ad1b8b98258ee8c526c60ae83ebb6254e156cb334be0809a4f8`), `package.json`, an empty `script.js` and an empty `style.css`; the editor lists a `.codepen` file but shows no content for it, so it is not part of the snapshot.
- Pin: `sources.yaml` `ref` is the git tree hash of that directory, `6ca7c583a9bf4b2a3a75767bdb013dcf9c528975`; `git rev-parse <commit>:ports/sabosugi-aura/aura/upstream` reproduces it.
- Pen versions: the pen's `package.json` lists `three ^0.186.1` and `lil-gui ^0.21.0`, but `index.html` imports `three` 0.170.0 and `lil-gui` 0.20.0 from a CDN. What runs is the import map, so the upstream side of every diff below runs three 0.170.0 (S-525) and lil-gui 0.20.0 (S-526) installed from npm (the import map is the only line of the page changed, to local paths); a second set of runs uses three 0.185.1, the version this repository pins.
- Port: `ports/sabosugi-aura/aura`, exported to `content/components/sabosugi-aura/aura` (item `aura`, primitive none, no icons).
- Renderer: Chromium (Playwright S-014) with SwiftShader software WebGL (`--use-angle=swiftshader --enable-unsafe-swiftshader`, S-283), device scale 1.
- Method: the upstream page runs from a static server (the harness page for the port runs from Vite, S-237). `uTime` is pinned on both sides. The port is given `time={t}`. The upstream page is not edited: an init script wraps `WebGL2RenderingContext.uniform1f` for the `uTime` location and uploads `t` instead of the page's own clock value, so the page's loop, shader and three.js run untouched. Both sides also log the value uploaded to the GPU, and the log shows `t` on both (table below). Each frame is captured after four animation frames as a full-viewport screenshot (upstream's panel, a collapsed lil-gui title bar at the top right, is hidden with `display: none` on the upstream side only) and diffed with pixelmatch (S-152, threshold 0.1; PNG S-153). Noise floor: the same frame from a second, fresh upstream page load.
- Target: at most 0.1% differing pixels at 1280x800 and 375x812, or within the measured noise floor (owner brief, S-528).

## Result: pixels that differ

| Viewport | t = 0 | t = 0.5 | t = 2.37 | t = 7.9 | t = 19.4 | t = 60 |
| --- | --- | --- | --- | --- | --- | --- |
| 1280x800 (port) | 0.000% (0 px) | 0.000% (0 px) | 0.000% (0 px) | 0.000% (0 px) | 0.000% (0 px) | 0.000% (0 px) |
| 1280x800 (noise floor) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812 (port) | 0.000% (0 px) | 0.000% (0 px) | 0.000% (0 px) | 0.000% (0 px) | 0.000% (0 px) | 0.000% (0 px) |
| 375x812 (noise floor) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |

Worst port frame: 0.000% (0 of 1,024,000 pixels at 1280x800; 0 of 304,500 at 375x812); worst noise floor: 0.000%. The drawing buffer was the viewport on both sides (1280x800 and 375x812, upstream's `dpr` of exactly 1).

Strips (t = 0, 0.5, 2.37, 7.9, 19.4, 60 s): 1280x800 [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red marks a differing pixel, none here); 375x812 [before-375.webp](before-375.webp), [after-375.webp](after-375.webp), [diff-375.webp](diff-375.webp).

### Against three.js 0.185.1

The same shader through three 0.185.1 (the version this repository pins, which prints a deprecation warning for `THREE.Clock`) against the port, t = 0, 12 and 60 s at both viewports: 0.000% differing pixels on all six frames, noise floor 0.000%. The port needs no three.js, and three 0.170.0 and 0.185.1 draw the same pixels for this material, so the pin does not matter here.

### Clock

The animation time is verified apart from the pixels, on Playwright's fake clock, with both pages driven through the same steps (16 ms frames, a 100 ms step, a 500 ms step, a 5 s run) and the `uTime` each uploads logged:

| Steps (ms) | 16, 16, 16, 16, 100, 100, 33, 500, 16, 5000, 16, 16, 250, 16 |
| --- | --- |
| Upstream | 0, 0.0104, 0.0208, 0.0312, 0.0936, 0.156, 0.1768, 0.4992, 0.5096, 3.7648, 3.7752, 3.7856, 3.952, 3.9624 |
| Port | identical on every step (388 frames each, maximum difference 0) |

Each 16 ms frame adds 0.0104, which is 16 ms times the speed 0.65. The 0.1 s `MAX_DELTA` clamp: after gaps of 150 ms, 2 s and 60 s with no frame, the next frame advances the time by the same 0.0715 on both sides (an unclamped 60 s gap would have advanced it by 39 s). The first frame has a delta of 0 on both sides.

In the first run of this check the 250 ms step held 15 frames upstream and 16 in the port (one 16 ms phase slip of the fake clock's frame grid between two page loads); every later run matched on every step.

## Prior-art search

The pen's code comment reads "Keep colors raw, identical to Shadertoy output", so it may descend from a Shadertoy shader, whose default license is not MIT-compatible. Searched on 2026-10-13, by normal search and page loads only, for an earlier source of this exact shader: its distinctive constants (4.73, 0.14, 3.99, `vec3(4.8, -0.4, 1.2)`, the 0.52 amplitude, the -0.12 offset) and phrasing (`sin(p.yzx * ...)` warp octaves, a `0.9 + sin(i * 1.3 - vec3(...))` palette, glow as `1 / d^2`), in five web searches, plus one request for Shadertoy's search page, which answered HTTP 403 and was not retried or worked around. Nothing was found: no page, shader or repository with these constants or this structure, and no other source for the pen. The shader belongs to the family of golfed ray-marched glow shaders; the pen's version is a parameterised rewrite (named uniforms, a dither stage, a tone-map approximation, a center mask) under its author's own MIT notice. The search cannot show that no earlier shader exists.

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place.

- The shader strings are upstream's, character for character (checked by script against `upstream/index.html`); only the GLSL ES 3.00 prelude that three.js 0.170.0 adds to a `ShaderMaterial` for WebGL 2 is written out (`precision highp float; precision highp int;`, `layout(location = 0) out highp vec4 pc_fragColor;`, `#define gl_FragColor pc_fragColor`, and `in vec3 position;` for the vertex stage), because the port draws upstream's fullscreen triangle with raw WebGL 2 instead of three.js. The shader needs WebGL 2: its ray loop is bounded by a uniform, which GLSL ES 1.00 rejects (compile error measured in a WebGL 1 context).
- Drawn through the shared `render-loop` helper (decision 0021): drawing stops off screen and in hidden tabs, a lost context is restored, and the time is the loop's frame delta (capped at 0.1 s, as upstream's `MAX_DELTA`) times the speed.
- Upstream's `dpr` (default 1.0) is the exact pixel ratio of the drawing buffer, not a cap on the device ratio; the port keeps that with a `dpr` prop and its own buffer sizing (floor of the CSS size times `dpr`, as three.js's `setSize`). Verified on a 2x screen: the buffer is 1x by default, 2x with `dpr={2}`, half with `dpr={0.5}`.
- Debug panel (lil-gui): left out. Its starting values are the defaults of the props; camera position and rotation, focal length, start distance, epsilon, line core, the center warp, the warp steps, the background cutoff, the jitter and dither strengths and the noise reference height stay at upstream's defaults. Reset buttons, `paused` (the `playing` prop) and the Reset Time button have no counterpart.
- Under reduced motion the field stops on one still frame (the shader's picture at 12 s, `AURA_STILL_TIME`), drawn once, instead of the CSS picture that decision 0021 shows for the other effects: for a shader the still frame is the real picture. A set `time` is honored.
- The upstream page was a full-window canvas on a black page; the component is a stage (`aspect-video` by default, its box set by the caller) whose background is `--aura-background` (black).
- Without WebGL 2 and before the first frame: a CSS picture of the fan (conic gradients, no image file); upstream shows nothing without WebGL.

## Enhancements

Behaviors measured in the harness (SwiftShader, 480x300 stage unless noted):

- Props for the main parameters (`playing`, `speed`, `time`, `tint`, `exposure`, `lineWidth`, `lineHeight`, `warpFrequency`, `warpSmoothness`, `raySteps`, `dpr`), all defaulting to upstream's values and clamped to its panel's ranges. `tint="#7fe3ff"` reaches the shader as (0.498, 0.890, 1).
- `playing={false}`: 2 draws, then none; the time stays 0. A set `time`: one still frame.
- Moving: 60 draws per second; below the fold 0 draws per second; scrolled into view 60 again. Hidden tab: no draws (28, then 28 a second later), drawing resumes when visible (65).
- Reduced motion: status ready, 2 draws, then none; the time uploaded is 12 only ([reduced-motion-still.webp](reduced-motion-still.webp)).
- WebGL unavailable (context creation blocked): status `unsupported`, canvas hidden, the CSS picture at full opacity ([fallback.webp](fallback.webp), 1280x800 at half size).
- Context lost and restored: status `lost`, then `ready` again, with no console warnings (the dispose checks each object with `isShader`, `isProgram`, `isBuffer` and `isVertexArray` first).
- Decorative by default (`aria-hidden="true"`); with `aria-label` it is `role="img"` with that name. No interactive parts.
- `tile`: span 2, rows 2, surface dark.
