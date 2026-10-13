# Dot Morph: port fidelity

- Upstream: peckz/playground @ 8b088c0911f6e9d3135962b92ca82b9da38736ce (src/app/chrome-morph)
- Harness: one page renders either upstream's source or the port's files, same props, page, fonts and state; React 19.3.0, motion/framer-motion 14.1.0, sonner 2.0.8, tegaki 1.1.0; Chromium (Playwright 1.64.0), device scale 1
- Diff: pixelmatch (S-152), threshold 0.1, anti-aliased pixels excluded; percent of all pixels in the frame
- Viewports: 1280x800 (desktop) and 375x812 (mobile)
- Target: at most 0.1%. Worst port frame: **0.0000%** (24 frames)

## Scene

The page as upstream lays it out (Butter theme, size 16x, centred), the button captured on Playwright's clock: swell-in, single dot, a hover and click, then the split and the morph frame by frame. Upstream morphs into a third-party logo, which the port drops. To compare the whole motion without that logo, `upstreampetals` is upstream's own studio with only its target shapes swapped for the port's petals; `upstream` (unchanged upstream) is compared on the dot and split frames only, and no logo frame is kept.

## Upstream demo

The upstream Next.js app was run from the same commit and its `/chrome-morph` page compared with the port at rest and with the three dots on hover, with the control panel and back link hidden in both: see `demo-*`.

## Results

| Against | Viewport | State | Differing pixels | Percent |
| --- | --- | --- | ---: | ---: |
| upstream | desktop | appear-at-160ms | 0 | 0.0000% |
| upstream | desktop | dot-rest | 0 | 0.0000% |
| upstream | desktop | split-at-150ms | 0 | 0.0000% |
| upstream | desktop | split-at-300ms | 0 | 0.0000% |
| upstream | mobile | appear-at-160ms | 0 | 0.0000% |
| upstream | mobile | dot-rest | 0 | 0.0000% |
| upstream | mobile | split-at-150ms | 0 | 0.0000% |
| upstream | mobile | split-at-300ms | 0 | 0.0000% |
| upstreampetals | desktop | appear-at-160ms | 0 | 0.0000% |
| upstreampetals | desktop | dot-rest | 0 | 0.0000% |
| upstreampetals | desktop | split-at-150ms | 0 | 0.0000% |
| upstreampetals | desktop | split-at-300ms | 0 | 0.0000% |
| upstreampetals | desktop | morph-at-100ms | 0 | 0.0000% |
| upstreampetals | desktop | morph-at-250ms | 0 | 0.0000% |
| upstreampetals | desktop | morph-at-450ms | 0 | 0.0000% |
| upstreampetals | desktop | mark-rest | 0 | 0.0000% |
| upstreampetals | mobile | appear-at-160ms | 0 | 0.0000% |
| upstreampetals | mobile | dot-rest | 0 | 0.0000% |
| upstreampetals | mobile | split-at-150ms | 0 | 0.0000% |
| upstreampetals | mobile | split-at-300ms | 0 | 0.0000% |
| upstreampetals | mobile | morph-at-100ms | 0 | 0.0000% |
| upstreampetals | mobile | morph-at-250ms | 0 | 0.0000% |
| upstreampetals | mobile | morph-at-450ms | 0 | 0.0000% |
| upstreampetals | mobile | mark-rest | 0 | 0.0000% |
| upstream demo | desktop | dots-hovered (448x448 crop) | 0 | 0.0000% |
| upstream demo | desktop | dot-rest (448x448 crop) | 0 | 0.0000% |
| upstream demo | mobile | dots-hovered (448x448 crop) | 0 | 0.0000% |
| upstream demo | mobile | dot-rest (448x448 crop) | 0 | 0.0000% |

## Evidence

`<state>-before.webp` is upstream, `-after.webp` the port, `-diff.webp` the pixelmatch overlay (red: differing pixels).

## Deviations

- Renamed DotMorph; the logo's paths, colours and name are gone. The default mark is an original three-petal shape, `mark` takes any three paths and `colors` replaces the logo colour mode.
- The studio's control panel (leva), routing, record mode and the H key are not part of the component; the settings are props with upstream's defaults.
- Labs: the server renders the resting single dot instead of hiding the icon until the swell-in, so an unhydrated gallery tile shows it; keyboard focus splits the dot like hover; the accessible names describe the next press.
