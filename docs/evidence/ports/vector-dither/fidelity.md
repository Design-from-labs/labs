# vector-dither: fidelity

- Upstream: [Shpigford/dither `packages/core`](https://github.com/Shpigford/dither/tree/19125db21f5874f1677afb6394a0ecd2047bf853/packages/core) at `19125db21f5874f1677afb6394a0ecd2047bf853` (MIT, copyright 2026 Josh Pigford; S-341); the web app in `packages/web` is the upstream demo.
- Port: `ports/shpigford-dither/vector-dither` (`vector-dither-core.ts`, upstream's six core modules merged line for line; `vector-dither.tsx`, a Labs-written React wrapper), exported to `content/components/shpigford-dither/vector-dither` (item `vector-dither`, primitive none, no icons)
- Renderer: Chromium (Playwright S-014) launched with `--use-angle=swiftshader --enable-unsafe-swiftshader --disable-gpu-rasterization`, device scale 1. No WebGL and no drawing loop is involved: the output is SVG computed from a luminance grid, so `render-loop` does not apply.
- Method:
  1. **Core, byte for byte** (Node 24, `core-equal.mjs` in the scratch harness): upstream's `generateSvg` and the port's `ditherGenerateSvg` over the full matrix of 9 patterns x 3 modes x 2 styles x 3 shapes x 7 palettes (the 4 presets and 3 custom ones, including upstream's negative-percentage case) x 5 cell sizes (2, 5, 8, 13, 32) x 6 gradient sources (linear at 0, 45 and 137 degrees and non-square sizes, radial, conic, noise) x 2 overlay settings for the linear and radial modes: **56,700 SVG strings, 0 differences**; the gradient grids, Bayer matrices, presets, `mapToColor` and every pattern threshold are equal too.
  2. **Rendered**: upstream's web app (built with its own `npm run build:web`, served statically) at its default state (a 1024 px 1:1 linear gradient at 45 degrees, Bayer 4x4, square cells of 8 px, its four-green default preset), and again after loading an original image (the same city drawing the Dot Halftone evidence uses, 600x600 SVG) through its file input. Its **Export SVG** download is captured and rendered as an image in Chromium; the port renders the same settings as inline SVG in a harness page (React 19, StrictMode, Tailwind 4). Three more settings (radial halftone circles scaled, conic lines diamonds with the radial mode, noise Bayer 8x8 circles with the linear mode) are exported with upstream's core and compared the same way. Each rendered port SVG's markup also equals upstream's string (ids, wrapper classes and whitespace aside). Sizes: the natural size, and the size the app shows its preview at (752 px at 1280x800, 351 px at 375x812). Noise floor: a second upstream load. pixelmatch (S-152), threshold 0.1.
  3. **Canvas preview**: the app's canvas buffer (read with `toDataURL`) against the port at natural size, and the app's on-screen preview (the canvas scaled down with `image-rendering: pixelated`) against the port at the same box.
- Target: at most 0.1% differing pixels per frame (owner brief, S-157).

## Result: pixels that differ

| Viewport | Frame | Port | Noise floor |
| --- | --- | --- | --- |
| 1280x800 | default: app canvas buffer vs port (1024x1024) | 0.000% | 0.000% |
| 1280x800 | default: exported SVG vs port (1024x1024) | 0.000% | 0.000% |
| 1280x800 | default: exported SVG vs port (752x752) | 0.000% | 0.000% |
| 1280x800 | image: app canvas buffer vs port (600x600) | 0.000% | 0.000% |
| 1280x800 | image: exported SVG vs port (600x600) | 0.000% | 0.000% |
| 1280x800 | radial halftone circles scaled (512x512) | 0.000% | 0.000% |
| 1280x800 | conic lines diamonds, radial mode (600x400) | 0.000% | 0.000% |
| 1280x800 | noise Bayer 8x8 circles, linear mode (400x400) | 0.000% | 0.000% |
| 375x812 | default: app canvas buffer vs port (1024x1024) | 0.000% | 0.000% |
| 375x812 | default: exported SVG vs port (1024x1024) | 0.000% | 0.000% |
| 375x812 | default: exported SVG vs port (351x351) | 0.000% | 0.000% |
| 375x812 | image: app canvas buffer vs port (600x600) | 0.000% | 0.000% |
| 375x812 | image: exported SVG vs port (351x351) | 0.000% | 0.000% |
| 375x812 | radial halftone circles scaled (512x512 and 351x351) | 0.000% | 0.000% |
| 375x812 | conic lines diamonds, radial mode (600x400 and 351x234) | 0.000% | 0.000% |
| 375x812 | noise Bayer 8x8 circles, linear mode (400x400 and 351x351) | 0.000% | 0.000% |

Worst port frame against upstream's SVG or canvas buffer: 0.000%; worst noise floor: 0.000%.

**Canvas preview on screen** (canvas against SVG, not port against upstream): the app's scaled, pixelated canvas differs from the port's SVG at the same box by 1.044% (default, 752 px), 3.876% (default, 351 px) and 0.805% (image, 351 px; 0.000% at its natural 600 px). Upstream's own exported SVG differs from its own preview by exactly the same amounts, so the difference is the renderer: the canvas is scaled down with nearest-neighbour sampling (`image-rendering: pixelated`), while an SVG is rasterized at the target size with antialiased cell edges. At natural size the two agree to the pixel.

Strips (1280x800: the default at 752 px, the image at 600 px, then the three extra settings at natural size): [before.webp](before.webp) (upstream's exported SVG), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red marks a differing pixel).

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place.

- **Core** (`vector-dither-core.ts`): the six modules (`bayer`, `patterns`, `dither`, `svg`, `gradient`, `palettes`) are merged in order, each after a `// ---- upstream: packages/core/<file> ----` marker, with their lines kept. TypeScript types are added to parameters, to the empty object and array literals and as exported setting types; behavior is unchanged (the matrix above).
- **Export renames** (the npm library re-exports every item file, decision 0016): `BAYER` as `DITHER_BAYER`, `BAYER_NORM` as `DITHER_BAYER_NORM`, `getPatternThreshold` as `ditherPatternThreshold`, `mapToColor` as `ditherMapToColor`, `generateSvg` as `ditherGenerateSvg`, `generateGradientGrid` as `ditherGradientGrid`, `PRESETS` as `DITHER_PRESETS`; `ditherImage` keeps its name. The declarations lose their `export` keyword and one export list at the end renames them.
- **Presets renamed** (no product names in shipped data): upstream's `gameboy` preset is `green` and `cga` is `neon`; colors and shares are unchanged. `bw` and `sepia` keep their names.
- **React wrapper** (Labs-written): renders the result as inline SVG React elements with upstream's structure (an `svg` with the same width, height and viewBox, the background `rect`, one `g fill` per color, the same shapes and rounding). The groups carry `data-color` instead of `id="color-N"`, so several instances on a page never repeat an id; the string from `ditherGenerateSvg` keeps the ids for files. The SVG fills its container's width (inline `width: 100%; height: auto`, so the width and height attributes kept from upstream cannot override it).
- **Inputs from upstream's web app**: the image luminance sampling (`processImage`) is `vectorDitherImageGrid`, the equal shares for custom colors follow its color-count control, and given percentages are normalized as its `normalizePercentages()` does (the last share absorbs the remainder). Defaults are the app's start state: a 1024 px 1:1 linear gradient at 45 degrees, Bayer 4x4, image mode, threshold style, square cells of 8 px, overlay angle 45, scale 100, offsets 0, the four-green preset.
- **Props** for every setting; upstream's `style` setting is the `ditherStyle` prop (`style` is React's). The app's sidebar, drag and drop, PNG export and keyboard shortcut are not ported: the component is the picture; `ditherGenerateSvg` gives the SVG file.
- **Image sources** are read once with a 2D canvas (`getImageData`, `crossOrigin = "anonymous"`); until then, and if a cross-origin image cannot be read, the plain image shows (`data-status` `pending` or `unsupported`). Gradient sources are pure computation and render on the server, so the wall tile shows the real dither.
- **Accessibility**: `alt` makes the wrapper `role="img"` with that name; otherwise it is `aria-hidden`. The SVG itself is always `aria-hidden`.
