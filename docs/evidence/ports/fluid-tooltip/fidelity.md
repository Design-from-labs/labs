# fluid-tooltip: fidelity

- Upstream: [Dinil-Thilakarathne/sona-ui `src/registry/sonaui/fluid-tooltip/fluid-tooltip.tsx`](https://github.com/Dinil-Thilakarathne/sona-ui/blob/9a72ffe9648f3ea893acff13a957383a95158f07/src/registry/sonaui/fluid-tooltip/fluid-tooltip.tsx) at `9a72ffe9648f3ea893acff13a957383a95158f07` (MIT, copyright 2026 Dinil Thilakarathne; S-234)
- Port: `content/components/sona-ui/fluid-tooltip` (`fluid-tooltip-base`, `fluid-tooltip-radix`, `fluid-tooltip-aria`; default `fluid-tooltip-base`)
- Method: Sona UI's own example (`registry/examples/fluid-tooltip/fluid-tooltip-demo.tsx`: four icon buttons in a horizontal group) rendered with each FluidTooltip. Both pages run in one Vite harness (S-237) with React 19.3, Tailwind 4.3 and the Labs tokens, in Chromium (Playwright, S-014) at device scale 1; the upstream side imports the upstream file at the pinned commit, the port side imports the port. Hover waits 1.2 s for the 350 ms delay and the 200 ms transitions; the mid-handoff frame pauses every animation through the Web Animations API at 80 ms after moving from Home to Search. The toolbar and tooltip (a 234x142 crop) is diffed with pixelmatch (S-152, threshold 0.1; PNG handling S-153).
- Target: at most 0.1% differing pixels.

## Result: pixels that differ (default variant, `fluid-tooltip-base`)

| State | 1280x800 | 375x812 |
| --- | --- | --- |
| Closed | 0.000% | 0.000% |
| Home hovered (open) | 0.000% | 0.000% |
| Moved from Home to Notifications (settled) | 0.000% | 0.000% |
| Moving from Home to Search, 80 ms | 0.000% | 0.000% |
| Search focused from the keyboard | 0.000% | 0.000% |

Motion: both sides ran `motion` 14.1.0, the site's version. The port on 14.1.0 against upstream on 12.43.0 (the version upstream's lockfile pins) differs by at most 0.000% in these states (the same shots compared across two runs), so the item accepts `motion@>=12.43.0`.
Strips (top to bottom: the states above, 1280x800): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red marks a differing pixel).

## Other variants against upstream

| State | 1280x800 | 375x812 |
| --- | --- | --- |
| Radix: Home hovered | 0.000% | 0.226% |
| Radix: after a handoff | 0.283% | 0.433% |
| Radix: keyboard focus | 0.051% | 0.277% |
| React Aria: Home hovered | 0.000% | 0.000% |
| React Aria: after a handoff | 0.283% | 0.217% |
| React Aria: keyboard focus | 0.051% | 0.057% |

The Radix and React Aria variants rebuild the handoff (decision 0022). At rest they place the same surface, arrow and label as the Base UI original; what differs is the label's anti-aliasing at a different sub-pixel offset (the differing pixels sit inside the glyphs). Their mid-handoff frames are not compared: each primitive starts the handoff at a different moment.

## Enhancements (after fidelity)

- Colors are the item's own variables (`--fluid-tooltip-surface`, `-label`, `-shadow`) declared in light and dark, instead of an inline style that overrode any theme; their values are upstream's.
- A vertical group opens on the inline-end side, `inline-start` and `inline-end` are accepted sides, and the arrow follows them.
- Radix and React Aria variants with the same API (decision 0022).
- Reduced motion (`prefers-reduced-motion: reduce`, gallery demo): no glide, scale or slide: 16 ms after a handoff the tooltip is already in place; only the demo's hover and selected-text color transitions are still running (0.000% of the stage differs from the frame 2 s later).
- Right to left: the toolbar order reverses with the layout and the tooltip stays centred on its trigger; vertical groups open on the inline-end side. Phone widths 320 and 375, both directions: no horizontal page scroll.
- Accessibility: axe (WCAG 2.2 AA and best practices) on `/ui/fluid-tooltip`, light and dark, 1280 and 375 wide, and after switching to right to left: no violations in the component or its demo.
