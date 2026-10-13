# glimm: fidelity

- Upstream: [glimm 0.3.1 by Noman Ijaz](https://www.npmjs.com/package/glimm), the published `dist/index.js` (core) and `dist/react.js` with its chunk (React entry), at `gitHead` `ea7f5500b10979c1abd006b2462e38528fce1bb8` (MIT, "Copyright (c) 2026 Noman Ijaz - iamnoman.com"; S-508, S-509). The project site is [glimm.dev](https://glimm.dev) (S-510).
- Pin: the package's repository (`github.com/nomanjack/glimm`) returned 404 on 2026-10-13, so, per the snapshot-pinning decision (0028), `sources.yaml` names the npm page as `repo` and the package's `gitHead` as `ref`, and the registry cites the tarball (S-509): `https://registry.npmjs.org/glimm/-/glimm-0.3.1.tgz`, `dist.shasum` `5e24a7060bfd637b3dca383f2251690d0a023285`. The tarball was downloaded again and compared with the copy used for the port (same shasum, `diff -r` of the unpacked package empty); `npm view glimm@0.3.1 license` and the tarball's `LICENSE` both say MIT. The `dist` is not minified, so it is ported line for line.
- Port: `ports/nomanijaz-glimm/glimm`, exported to `content/components/nomanijaz-glimm/glimm` (item `glimm`, primitive none, no icons). Ported: the core (`dist/index.js`: OKLCH and palettes, easings, the three shader controllers `createShader`, `createMeshShader` and `createNamedropShader`, `playSweep`) and the React entry (`dist/react.js`: the covered and masked sweeps, `GlimmProvider`, `useGlimm`). Not ported: the Next.js entry (`dist/next.js`), which only adds `next/navigation` links and routing around the same provider.
- Renderer: Chromium (Playwright S-014) with SwiftShader software WebGL (`--use-angle=swiftshader --enable-unsafe-swiftshader`, S-283), device scale 1.
- Method: the upstream `dist` and the port each run in a page served by Vite (S-237): the same two full-window views (generated content, system font), the same provider props, one `sweep()` called from the test script. Time is driven by hand: an init script on both sides replaces `requestAnimationFrame`, `cancelAnimationFrame` and `performance.now` with a frame stepper (16 ms per frame) and `Math.random` with a constant (the band's hue offset), so a "frame" is the same on every load (P-WEB2-GLIMM-2). Each matched frame is captured after the sweep has started (`ctrl.getAlpha() > 0`), stepping n frames, with the browser's own View Transition (the masked sweep) in place. Every side is loaded twice; each port load is diffed against each upstream load whose animated progress is exactly equal, and the upstream's noise floor is the worst diff between its two loads. pixelmatch (S-152, threshold 0.1) and pngjs (S-153) compare the 1280x800 and 375x812 screenshots of the whole window.
- Target: at most 0.1% differing pixels, or within the measured noise floor.

## Result: pixels that differ

Default look (prism, left to right, 1100 ms sweep, 220 ms outro), frames at 96, 256, 400, 560, 704, 848, 1008, 1104 and 1200 ms (progress 0.076, 0.370, 0.627, 0.811, 0.910, 0.967, 0.996, 1.000, 1.000):

| Viewport | Frames | Worst port frame | Upstream noise floor |
| --- | --- | --- | --- |
| 1280x800 | 9 | 0.000% | 0.000% |
| 375x812 | 9 | 0.000% | 0.000% |

Other options and looks, at 256, 560 and 848 ms (every frame 0.000% at both viewports, noise floor 0.000%):

| Case | Options | Viewports | Worst port frame |
| --- | --- | --- | --- |
| rtl-berry | `direction: "rtl"`, palette berry | 1280x800, 375x812 | 0.000% |
| ttb-citrus | `direction: "ttb"`, palette citrus, `waveAmount: 1` | 1280x800, 375x812 | 0.000% |
| btt-ember | `direction: "btt"`, palette ember, `brightness: 0.8`, `easing: "easeInOutCubic"` | 1280x800, 375x812 | 0.000% |
| mesh-azure | `shaderFactory: createMeshShader`, palette azure | 1280x800, 375x812 | 0.000% |
| namedrop-lagoon | `shaderFactory: createNamedropShader`, palette lagoon | 1280x800, 375x812 | 0.000% |

Strips (the default case, 1280x800): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red marks a differing pixel). The other cases have `<case>-before.webp`, `-after.webp` and `-diff.webp`.

Why the frames match exactly: the port keeps every line of the shader controllers and sweeps, the same frame order (the band is drawn, then the sweep updates its progress) and the same clock reads. P-WEB2-GLIMM-3 records how the loop was moved onto the shared render loop without changing either.

### The container scope against upstream's masked sweep

The container scope is a Labs addition (no upstream counterpart): the same sweep inside one box, with the outgoing view held as a frozen copy instead of a View Transition snapshot. To check it, a container the size of the window (`<GlimmProvider scope="container">` at 100vw by 100vh) with the same views is diffed against upstream's masked sweep at the same progress:

| Case | Viewport | Worst frame | Frames |
| --- | --- | --- | --- |
| contained | 1280x800 | 0.015% | 256, 560, 848 ms |
| contained | 375x812 | 0.235% | 256, 560, 848 ms |
| contained, `direction: "rtl"`, ember | 1280x800 | 0.009% | 256, 560, 848 ms |
| contained, `direction: "rtl"`, ember | 375x812 | 0.175% | 256, 560, 848 ms |
| contained, mesh look | 1280x800 | 0.033% | 256, 560, 848 ms |
| contained, mesh look | 375x812 | 0.249% | 256, 560, 848 ms |

The differing pixels are a one-pixel column at the boundary between the outgoing and the incoming view at 560 ms (the clip edge of a DOM element and of a View Transition image round differently); the rest of the frame is identical. The sweep in this scope starts a few frames after the click (the new view is committed and painted under the frozen copy first), which the harness steps through before counting frames. Those 375 px frames are above the 0.1% target (a column of 812 px is 0.27% of a 375 px window), so the table records them as a measured, understood limit of the scope rather than a pass.

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place. File names are in `ports/nomanijaz-glimm/glimm`.

- Language and layout (`glimm-core.ts`, `glimm-sweeps.ts`, `glimm.tsx`): TypeScript instead of the compiled JavaScript, with the types of `dist/*.d.ts` and annotations for the internals; `const` for `var`; the three entry points in one core file, the covered and masked sweeps in one file and the provider in `glimm.tsx`. `diff` of the emitted JavaScript of `glimm-core.ts` and `glimm-sweeps.ts` against `dist/index.js` and the chunk (formatted with the same formatter) shows only the changes below; the provider is the upstream provider adapted to the render loop and extended, so it is checked by the frame diffs above, not by a line diff.
- Drawing is the shared `render-loop` helper (decision 0021), not upstream's own loops. Upstream's controllers each create a context, observe their canvas with a `ResizeObserver` and run `requestAnimationFrame` (the default one only while its alpha is above zero, the mesh and NameDrop ones forever). The controllers now take the context the loop creates (the loop creates it with exactly the attributes the controller asks for, so `getContext` returns it), expose `draw()` and `resize()`, and ask for a frame through an `invalidate` option; the provider draws on demand (`continuous: false`, `invalidate()` from `render` while the band has alpha). The pixel ratio cap (2) and the rounding are upstream's. Drawing pauses off screen and in hidden tabs, and a lost context is restored.
- The provider renders its canvas (upstream appends a canvas to its host element on the first sweep), so the WebGL context exists from the first render, not the first sweep. The curtain (the opaque fallback layer) is still created on the first sweep. `onController` runs again after a context restore.
- The two experimental controllers keep their code but not their debug output: the `console.log` calls in `createNamedropShader` (on creation and on its first active frame) are removed.
- `nextPaint` and `waitForWork` are exported from `glimm-sweeps.ts` for the container scope; nothing else in the covered and masked sweeps changed.
- The canvas has no `aria-hidden` of its own (its host is `aria-hidden`).
- `useEffect(() => { defaultsRef.current = defaults }, [defaults])` has no dependency list: `defaults` is a new object every render, so the effect is the same.

## Enhancements

Nothing here changes the default look (the table above is measured with the defaults).

- Reduced motion: upstream swaps at once (`reducedMotion: "instant"`, default) or plays anyway (`"sweep"`); `"crossfade"` is added: the new view fades in over the old one in 180 ms (a frozen copy in the container scope, the browser's own View Transition crossfade for the viewport scope, an instant swap without it). Under reduced motion the loop reports `reduced-motion` and creates no context.
- WebGL unavailable or the context lost: upstream swaps at once. `fallback: "wipe"` (default) runs the same masks with a controller that draws nothing, so the view is wiped and revealed without the band; `fallback: "instant"` is upstream's behavior. Status is `data-status` on the layer (`pending`, `ready`, `unsupported`, `reduced-motion`, `lost`).
- Container scope (`scope="container"`): the layer is `position: absolute` in the provider's own box and the outgoing view is a frozen, inert copy (ids dropped, form values and 2D canvases copied) clipped with upstream's mask math, so a transition can live inside a card, a tile or a dialog, with no page-wide snapshot (P-WEB2-GLIMM-1).
- Focus: `sweep(navigate, { focus })` moves focus to the new view once it is committed (a selector looked up inside the provider's content, an element or a function; a heading gets `tabindex="-1"`). Upstream does not move focus.
- Right to left: `direction` accepts `"inline-end"` and `"inline-start"`, resolved against the layer's computed `direction`, so a forward sweep runs right to left in RTL. `"ltr"`, `"rtl"`, `"ttb"` and `"btt"` are upstream's, physical.
- Demo: generated views (a stat with a bar chart, a task list) swept inside one box with a button and the six palettes; `loop` plays it on the specimen wall (hydrated, clicks scripted).
- Accessibility: see the item's `a11y` notes; the demo page is axe clean in light and dark, with `dir="rtl"`.
