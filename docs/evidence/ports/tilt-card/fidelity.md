# tilt-card: fidelity

- Upstream: [xxtomm/spell-ui `registry/spell-ui/tilt-card.tsx`](https://github.com/xxtomm/spell-ui/blob/a6441b7742b47d99932a8d687e895100bdf736be/registry/spell-ui/tilt-card.tsx) at `a6441b7742b47d99932a8d687e895100bdf736be` (MIT, copyright 2025 Spell UI; S-233)
- Port: `content/components/spell-ui/tilt-card` (`tilt-card`; default `tilt-card`)
- Method: Spell UI's own docs demo (`docs/tilt-card/demo.tsx`) rendered with each TiltCard; on both sides the brand marks and the card text are replaced by neutral shapes (no vendor logos in our evidence). Both pages run in one Vite harness (S-237) with React 19.3, Tailwind 4.3 and the Labs tokens, in Chromium (Playwright, S-014) at device scale 1; the upstream side imports the upstream file at the pinned commit, the port side imports the port. The pointer moves to 25%/25% and to 80%/70% of the card, then waits 700 ms for the 200 ms transform transition to finish. The demo frame is diffed with pixelmatch (S-152, threshold 0.1; PNG handling S-153).
- Target: at most 0.1% differing pixels.

## Result: pixels that differ (default variant, `tilt-card`)

| State | 1280x800 | 375x812 |
| --- | --- | --- |
| At rest | 0.000% | 0.000% |
| Pointer at the top left | 0.000% | 0.000% |
| Pointer at the bottom right | 0.000% | 0.000% |

Strips (top to bottom: the states above, 1280x800): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red marks a differing pixel).

## Enhancements (after fidelity)

- The spotlight color is the item's own variable, `--tilt-card-spotlight`, with the upstream white as its fallback; the spotlight layer is aria-hidden.
- The gallery demo is our own card (no brand marks).
- Reduced motion (`prefers-reduced-motion: reduce`, gallery demo): no tilt and no scale (the transform stays `perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`); the spotlight still follows the pointer as a fade.
- Right to left: the tilt follows the pointer's physical position, so it is the same in both directions; the demo's text uses logical alignment. Phone widths 320 and 375, both directions: no horizontal page scroll.
- Accessibility: axe (WCAG 2.2 AA and best practices) on `/ui/tilt-card`, light and dark, 1280 and 375 wide, and after switching to right to left: no violations in the component or its demo.
