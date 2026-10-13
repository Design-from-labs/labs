# Text Morph: port fidelity

- Upstream: lochie/torph @ d79a5aa63226acf97d49c3e34fafb2e85c07b026 (packages/torph/src, React adapter and core)
- Harness: one page renders either upstream's source or the port's files, same props, page, fonts and state; React 19.3.0, motion/framer-motion 14.1.0, sonner 2.0.8, tegaki 1.1.0; Chromium (Playwright 1.64.0), device scale 1
- Diff: pixelmatch (S-152), threshold 0.1, anti-aliased pixels excluded; percent of all pixels in the frame
- Viewports: 1280x800 (desktop) and 375x812 (mobile)
- Target: at most 0.1%. Worst port frame: **0.0007%** (18 frames)

## Scene

`<TextMorph>` at 48px/500, centred on white, cycling through words and numbers ("Design From Labs" -> "Design from scratch" -> "Labs" -> "1,204" -> "9,847.50"). Mid-morph frames are frozen by pausing every Web Animation and setting the same `currentTime` in both.

## Upstream demo

The torph site (Next.js, `site/`) was run from the same commit; its cards use the site's own fonts and layout, so it is kept as the reference screenshot and the numbers come from the shared harness.

## Results

| Against | Viewport | State | Differing pixels | Percent |
| --- | --- | --- | ---: | ---: |
| upstream | desktop | rest-0 | 0 | 0.0000% |
| upstream | desktop | to-1-at-120ms | 4 | 0.0004% |
| upstream | desktop | to-1-rest | 7 | 0.0007% |
| upstream | desktop | to-2-at-200ms | 0 | 0.0000% |
| upstream | desktop | to-2-rest | 0 | 0.0000% |
| upstream | desktop | to-3-at-150ms | 0 | 0.0000% |
| upstream | desktop | to-3-rest | 0 | 0.0000% |
| upstream | desktop | to-4-at-150ms | 0 | 0.0000% |
| upstream | desktop | to-4-rest | 0 | 0.0000% |
| upstream | mobile | rest-0 | 0 | 0.0000% |
| upstream | mobile | to-1-at-120ms | 0 | 0.0000% |
| upstream | mobile | to-1-rest | 0 | 0.0000% |
| upstream | mobile | to-2-at-200ms | 0 | 0.0000% |
| upstream | mobile | to-2-rest | 0 | 0.0000% |
| upstream | mobile | to-3-at-150ms | 0 | 0.0000% |
| upstream | mobile | to-3-rest | 0 | 0.0000% |
| upstream | mobile | to-4-at-150ms | 0 | 0.0000% |
| upstream | mobile | to-4-rest | 0 | 0.0000% |

## Evidence

`<state>-before.webp` is upstream, `-after.webp` the port, `-diff.webp` the pixelmatch overlay (red: differing pixels).

## Deviations

- The core's modules are merged into three files (`text-morph-core`, `-text`, `-engine`) so the registry item stays flat; upstream lines are unchanged apart from the relative imports.
- The vanilla class `TextMorph` is renamed `TextMorphEngine`, so it does not collide with the React component in the npm library's barrel. Two constants in the replace animation are renamed (`GROUP_EXIT_FADE`, `GROUP_ENTER_FADE`) because they now share a module with the number animation's own.
- Labs addition: `dir="auto"` on the rendered element. Upstream inherits the page direction, which reverses the letters of Latin text inside a right-to-left page; LTR pages are unchanged (the numbers above).
