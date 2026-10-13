# morphing-tabs: fidelity

- Upstream: [starc007/ui-components (beUI) `components/motion/morphing-tabs.tsx`](https://github.com/starc007/ui-components/blob/7bb802bc0123fa8944bc327060e60a5bae8c65bc/components/motion/morphing-tabs.tsx) at `7bb802bc0123fa8944bc327060e60a5bae8c65bc` (MIT, copyright 2026 Saurabh Chauhan; S-232)
- Port: `content/components/beui/morphing-tabs` (`morphing-tabs-radix-lucide`, `morphing-tabs-radix-phosphor`, `morphing-tabs-base-lucide`, `morphing-tabs-base-phosphor`, `morphing-tabs-aria-lucide`, `morphing-tabs-aria-phosphor`; default `morphing-tabs-radix-lucide`)
- Method: beUI's own preview (`components/previews/blocks/morphing-tabs.preview.tsx`: three rooms on #242424, controlled value, reorder and close handlers) rendered with each MorphingTabs. Both pages run in one Vite harness (S-237) with React 19.3, Tailwind 4.3 and the Labs tokens, in Chromium (Playwright, S-014) at device scale 1; the upstream side imports the upstream file at the pinned commit, the port side imports the port. Motion springs run on requestAnimationFrame; matched mid-glide frames use Playwright's paused clock (S-240), the rest and settled states real time. The preview frame is diffed with pixelmatch (S-152, threshold 0.1; PNG handling S-153).
- Target: at most 0.1% differing pixels.

## Result: pixels that differ (default variant, `morphing-tabs-radix-lucide`)

| State | 1280x800 | 375x812 |
| --- | --- | --- |
| At rest (Room 2 selected) | 0.000% | 0.000% |
| Selecting Archive, 60 ms | 0.000% | 0.000% |
| Selecting General, 140 ms | 0.000% | 0.000% |
| Archive selected (settled) | 0.000% | 0.000% |
| Hovering an inactive tab | 0.000% | 0.000% |
| Dragging Archive 200 px toward the start | 0.000% | 0.000% |

Motion: both sides ran `motion` 14.1.0, the site's version. The port on 14.1.0 against upstream on 12.43.0 (the version upstream's lockfile pins) differs by at most 0.072% in these states (the same shots compared across two runs), so the item accepts `motion@>=12.43.0`.
Strips (top to bottom: the states above, 1280x800): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red marks a differing pixel).

## Other variants against upstream

| State | 1280x800 | 375x812 |
| --- | --- | --- |
| Base UI, Lucide: at rest | 0.000% | 0.000% |
| Base UI, Lucide: Archive selected | 0.000% | 0.000% |
| React Aria, Lucide: at rest | 0.000% | 0.000% |
| React Aria, Lucide: Archive selected | 0.000% | 0.000% |
| Radix, Phosphor: at rest | 0.000% | 0.000% |
| Radix, Phosphor: Archive selected | 0.000% | 0.000% |

The Phosphor variants differ from upstream only in the close glyph (Phosphor's X instead of Lucide's), which upstream does not have; the Base UI and React Aria variants match upstream with Lucide.

## Enhancements (after fidelity)

- The tabs are the primitive's own (Radix Tabs, Base UI Tabs or React Aria Tabs): roles, ids, roving focus, arrow keys, Home and End come from the primitive. A press selects on release without a drag, as upstream (Radix and Base UI otherwise select on mousedown; docs/pitfalls.md, P-068).
- Close buttons render beside the tablist in a layer that moves with their tab, so the tablist owns only tabs (decision 0022).
- beUI's easing, spring and touch tokens (`lib/ease.ts`, `lib/touch.ts`) are inlined, so the item needs no other files.
- Colors stay upstream's fixed palette (a dark rail with a light panel, in both themes).
- Reduced motion (`prefers-reduced-motion: reduce`, gallery demo): 16 ms after the interaction the layout is already at its end state; still running: color, an opacity cross-fade (opacity, and the demo's color transitions) (0.030% of the stage differs from the frame 2 s later).
- Right to left: the slots, the drag direction and the liquid surface mirror (the surface SVG is flipped), Alt+Arrow reorders in the reading direction, and the direction is re-read when a `dir` attribute changes (P-069). Phone widths 320 and 375, both directions: no horizontal page scroll.
- Accessibility: axe (WCAG 2.2 AA and best practices) on `/ui/morphing-tabs`, light and dark, 1280 and 375 wide, and after switching to right to left: no violations in the component or its demo. On the bare `/preview` page axe reads the active tab's dark label against the dark root, because the white surface under it is an SVG it cannot see (P-072); the real contrast is about 17:1, and the component page reports no violation.
