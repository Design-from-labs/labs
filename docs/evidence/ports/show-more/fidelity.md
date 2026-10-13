# show-more: fidelity

- Upstream: [ddoemonn/interior `components/interior/show-more.tsx`](https://github.com/ddoemonn/interior/blob/314800833bf01e23e6ae74c2a17fbdaac3688c84/components/interior/show-more.tsx) at `314800833bf01e23e6ae74c2a17fbdaac3688c84` (MIT, copyright 2026 ozzy; S-235)
- Port: `content/components/interior/show-more` (`show-more-lucide`, `show-more-phosphor`; default `show-more-phosphor`)
- Method: interior's own demo (`lib/demos/show-more-demo.tsx`: release notes, 3 lines, 168 px cap) inside interior's `.mat-panel` surface, rendered with each ShowMore. Both pages run in one Vite harness (S-237) with React 19.3, Tailwind 4.3 and the Labs tokens, in Chromium (Playwright, S-014) at device scale 1; the upstream side imports the upstream file at the pinned commit, the port side imports the port. Height and opacity are motion springs; the mid-expand frame uses Playwright's paused clock (S-240) 120 ms after the click, the other states real time. The demo frame is diffed with pixelmatch (S-152, threshold 0.1; PNG handling S-153).
- Target: at most 0.1% differing pixels.

## Result: pixels that differ (default variant, `show-more-phosphor`)

| State | 1280x800 | 375x812 |
| --- | --- | --- |
| Collapsed | 0.000% | 0.000% |
| Expanding, 120 ms | 0.000% | 0.000% |
| Expanded (capped, scrollable) | 0.000% | 0.000% |
| Expanded and scrolled 60 px | 0.000% | 0.000% |
| Toggle focused from the keyboard | 0.000% | 0.000% |

Motion: both sides ran `motion` 14.1.0, the site's version. The port on 14.1.0 against upstream on 12.43.0 (the version upstream's lockfile pins) differs by at most 0.000% in these states (the same shots compared across two runs), so the item accepts `motion@>=12.43.0`.
Strips (top to bottom: the states above, 1280x800): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red marks a differing pixel).

## Enhancements (after fidelity)

- The caret is the icon set's glyph: Phosphor's caret-down (the default, the same shape as the upstream inline SVG) or Lucide's chevron-down.
- Colors are the item's own variables (`--show-more-*`) in light and dark, with the upstream light values as fallbacks, instead of `dark:` utilities, so they follow the page's theme switch as well as the system setting.
- Logical alignment (`text-start`).
- Reduced motion (`prefers-reduced-motion: reduce`, gallery demo): 16 ms after the interaction the layout is already at its end state; nothing is still animating (0.000% of the stage differs from the frame 2 s later).
- Right to left: the text and the toggle align to the inline start; the caret sits after the label. Phone widths 320 and 375, both directions: no horizontal page scroll.
- Accessibility: axe (WCAG 2.2 AA and best practices) on `/ui/show-more`, light and dark, 1280 and 375 wide, and after switching to right to left: no violations in the component or its demo.
