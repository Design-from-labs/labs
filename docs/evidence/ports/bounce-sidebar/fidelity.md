# bounce-sidebar: fidelity

- Upstream: [starc007/ui-components (beUI) `components/motion/bounce-sidebar.tsx`](https://github.com/starc007/ui-components/blob/7bb802bc0123fa8944bc327060e60a5bae8c65bc/components/motion/bounce-sidebar.tsx) at `7bb802bc0123fa8944bc327060e60a5bae8c65bc` (MIT, copyright 2026 Saurabh Chauhan; S-232)
- Port: `content/components/beui/bounce-sidebar` (`bounce-sidebar`; default `bounce-sidebar`)
- Method: beUI's own preview (`components/previews/motion/bounce-sidebar.preview.tsx`: five destinations, Components selected, w-52, text-base) rendered with each BounceSidebar. Both pages run in one Vite harness (S-237) with React 19.3, Tailwind 4.3 and the Labs tokens, in Chromium (Playwright, S-014) at device scale 1; the upstream side imports the upstream file at the pinned commit, the port side imports the port. The dot is a motion spring on an arc path; matched frames use Playwright's paused clock (S-240): a hop to the adjacent item at 50 ms, a long jump at 80 and 160 ms, a jump up at 100 ms, then settled. The preview frame is diffed with pixelmatch (S-152, threshold 0.1; PNG handling S-153).
- Target: at most 0.1% differing pixels.

## Result: pixels that differ (default variant, `bounce-sidebar`)

| State | 1280x800 | 375x812 |
| --- | --- | --- |
| At rest | 0.000% | 0.000% |
| Hop to Motion, 50 ms | 0.000% | 0.000% |
| Jump to Changelog, 80 ms | 0.000% | 0.000% |
| Jump to Changelog, 160 ms | 0.000% | 0.000% |
| Jump up to Overview, 100 ms | 0.000% | 0.000% |
| Changelog selected (settled) | 0.000% | 0.000% |

Motion: both sides ran `motion` 14.1.0, the site's version. The port on 14.1.0 against upstream on 12.43.0 (the version upstream's lockfile pins) differs by at most 0.023% in these states (the same shots compared across two runs), so the item accepts `motion@>=12.43.0`.
Strips (top to bottom: the states above, 1280x800): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red marks a differing pixel).

## Enhancements (after fidelity)

- Logical utilities (`ps-6`, `start-3`, `text-start`).
- Contract revision 3 (the `stage` field for layout parts) is not on staging yet; this layout part gets its `stage` when it lands.
- Reduced motion (`prefers-reduced-motion: reduce`, gallery demo): 16 ms after the interaction the layout is already at its end state; only the demo's hover and selected-text color transitions are still running (0.065% of the stage differs from the frame 2 s later).
- Right to left: the list, labels and dot sit at the inline start, and the dot's arc bulges to the right, still away from the labels. Phone widths 320 and 375, both directions: no horizontal page scroll.
- Accessibility: axe (WCAG 2.2 AA and best practices) on `/ui/bounce-sidebar`, light and dark, 1280 and 375 wide, and after switching to right to left: no violations in the component or its demo.
