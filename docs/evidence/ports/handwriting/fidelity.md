# Handwriting: port fidelity

- Upstream: gkurt/tegaki @ 32654a4cfb0fa6a2873264cf693316acd59d1627, as published in npm tegaki 1.1.0
- Harness: one page renders either upstream's source or the port's files, same props, page, fonts and state; React 19.3.0, motion/framer-motion 14.1.0, sonner 2.0.8, tegaki 1.1.0; Chromium (Playwright 1.64.0), device scale 1
- Diff: pixelmatch (S-152), threshold 0.1, anti-aliased pixels excluded; percent of all pixels in the frame
- Viewports: 1280x800 (desktop) and 375x812 (mobile)
- Target: at most 0.1%. Worst port frame: **0.0000%** (6 frames)

## Scene

The README quick start (`<TegakiRenderer font={caveat}>`) against `<Handwriting>`, "Hello World" at 72px, with controlled `time` (0.6 s, 1.6 s and finished) so frames match exactly.

## Upstream demo

Tegaki's own site needs Bun, which is not installed on this machine; the README quick start, run from the published package, is the upstream demo.

## Results

| Against | Viewport | State | Differing pixels | Percent |
| --- | --- | --- | ---: | ---: |
| upstream | desktop | time-0.6s | 0 | 0.0000% |
| upstream | mobile | time-0.6s | 0 | 0.0000% |
| upstream | desktop | time-1.6s | 0 | 0.0000% |
| upstream | mobile | time-1.6s | 0 | 0.0000% |
| upstream | desktop | time-100s | 0 | 0.0000% |
| upstream | mobile | time-100s | 0 | 0.0000% |

## Evidence

`<state>-before.webp` is upstream, `-after.webp` the port, `-diff.webp` the pixelmatch overlay (red: differing pixels).

## Deviations

- A thin wrapper by design: Caveat (SIL OFL 1.1) as the default font, and `reducedMotion` defaulting to `"user"` (Labs addition; Tegaki's default is `"never"`). Without reduced motion it renders identically (the numbers above).
- Harfbuzz shaping is opt-in, as upstream's quick start has it, and documented in the item's docs instead of being bundled: importing `tegaki/shaper-harfbuzz` failed a default Next.js 16 build (Turbopack cannot resolve Node's `module` in harfbuzzjs, and prerendering then loads the WASM from a missing path). With the documented opt-in, a fresh Next.js app built and ran with all four items.
