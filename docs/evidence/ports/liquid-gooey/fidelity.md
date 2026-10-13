# liquid-gooey: fidelity

- Upstream: [Jakubantalik/Libraries.dev `packages/liquid-gooey`](https://github.com/Jakubantalik/Libraries.dev/blob/bcaf88f8a16a75fd95bf21e0747193ee3380a927/packages/liquid-gooey) at `bcaf88f8a16a75fd95bf21e0747193ee3380a927` (MIT, copyright 2026 Jakub; S-230)
- Port: `content/components/libraries-dev/liquid-gooey` (`liquid-gooey`; default `liquid-gooey`)
- Method: The gooey playground's own PlusMenu and Tabs demos (`sites/gooey/playground/demos`, bare stage mode, light theme, blur 6, contrast 18, the "Figma soft" shadow), with its `styles.css` and `demo.css`, rendered with each package. Both pages run in one Vite harness (S-237) with React 19.3, Tailwind 4.3 and the Labs tokens, in Chromium (Playwright, S-014) at device scale 1; the upstream side imports the upstream file at the pinned commit, the port side imports the port. Component-driven springs compile to CSS transitions and observed items run a requestAnimationFrame loop; matched frames use Playwright's paused clock (S-240), the settled states real time. The stage with both demos is diffed with pixelmatch (S-152, threshold 0.1; PNG handling S-153).
- Target: at most 0.1% differing pixels.

## Result: pixels that differ (default variant, `liquid-gooey`)

| State | 1280x800 | 375x812 |
| --- | --- | --- |
| Plus menu closed, tabs at rest | 0.000% | 0.000% |
| Plus menu opening, 120 ms | 0.001% | 0.029% |
| Plus menu opening, 260 ms | 0.000% | 0.001% |
| Plus menu open (settled) | 0.000% | 0.002% |
| Tabs: moving to Ask, 90 ms | 0.001% | 0.000% |
| Tabs: Ask selected (settled) | 0.000% | 0.000% |

Strips (top to bottom: the states above, 1280x800): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red marks a differing pixel).

## Enhancements (after fidelity)

- The default `fill` is the item's own variable, `--liquid-gooey-fill`: white in light mode (the upstream default) and #202020 in dark mode (the upstream playground's dark surface).
- The twelve upstream files ship prefixed `liquid-gooey-*` (decision 0022), with "use client" on the client modules; `pnpm ports` appends the upstream MIT notice to each.
- Reduced motion (`prefers-reduced-motion: reduce`, gallery demo): 16 ms after the interaction the layout is already at its end state; nothing is still animating (0.000% of the stage differs from the frame 2 s later).
- Right to left: the effect follows the measured positions of its items, so it mirrors with the layout; the demo's slots use a logical inset (`start-20`). Phone widths 320 and 375, both directions: no horizontal page scroll.
- Accessibility: axe (WCAG 2.2 AA and best practices) on `/ui/liquid-gooey`, light and dark, 1280 and 375 wide, and after switching to right to left: no violations in the component or its demo. Only the silhouette is filtered; the demo's satellites are out of the tab order and hidden from assistive technology while closed, and the main button reports aria-expanded.
