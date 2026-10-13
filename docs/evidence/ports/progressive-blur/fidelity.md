# progressive-blur: fidelity

- Upstream: [magicuidesign/magicui `apps/www/registry/magicui/progressive-blur.tsx`](https://github.com/magicuidesign/magicui/blob/85f97fd27b053339af74ba9dd4ca428ee25989fb/apps/www/registry/magicui/progressive-blur.tsx) at `85f97fd27b053339af74ba9dd4ca428ee25989fb` (MIT, copyright Magic UI; S-231)
- Port: `content/components/magicui/progressive-blur` (`progressive-blur`; default `progressive-blur`)
- Method: Magic UI's own demo (`registry/example/progressive-blur-demo.tsx`, a 400 px ScrollArea of 20 cards with a 40% bottom blur) rendered with each ProgressiveBlur. Both pages run in one Vite harness (S-237) with React 19.3, Tailwind 4.3 and the Labs tokens, in Chromium (Playwright, S-014) at device scale 1; the upstream side imports the upstream file at the pinned commit, the port side imports the port. The component is static; the second state scrolls the list by 600 px. The demo frame is diffed with pixelmatch (S-152, threshold 0.1; PNG handling S-153).
- Target: at most 0.1% differing pixels.

## Result: pixels that differ (default variant, `progressive-blur`)

| State | 1280x800 | 375x812 |
| --- | --- | --- |
| At rest | 0.000% | 0.000% |
| Scrolled 600 px | 0.000% | 0.000% |

Strips (top to bottom: the states above, 1280x800): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red marks a differing pixel).

## Enhancements (after fidelity)

- The root is `aria-hidden` and carries `data-slot="progressive-blur"`; React is imported as a type only.
- The gallery demo puts the blur beside a native scroller that is keyboard reachable (a named section with tabindex=0), instead of the shadcn ScrollArea the upstream demo uses.
- Reduced motion (`prefers-reduced-motion: reduce`, gallery demo): nothing moves; the blur is static.
- Right to left: the layers span the full width (`inset-x-0`), so the result is the same in both directions. Phone widths 320 and 375, both directions: no horizontal page scroll.
- Accessibility: axe (WCAG 2.2 AA and best practices) on `/ui/progressive-blur`, light and dark, 1280 and 375 wide, and after switching to right to left: no violations in the component or its demo.
