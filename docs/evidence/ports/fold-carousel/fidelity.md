# fold-carousel: fidelity

- Upstream: [Kareem-AEz/iphone-duo-fold-carousel `src/registry/fold-carousel`](https://github.com/Kareem-AEz/iphone-duo-fold-carousel/tree/57cb4976589e9a13cfbe1785700972cabddaa49d/src/registry/fold-carousel) and its `src/components/ui/button.tsx` at `57cb4976589e9a13cfbe1785700972cabddaa49d` (MIT, copyright 2026 Kareem Ahmed; S-264)
- Port: `ports/kareem-aez-fold-carousel/fold-carousel` (variants shape), exported to `content/components/kareem-aez-fold-carousel/fold-carousel`: items `fold-carousel-base-lucide` (the default, upstream's primitive), `-base-phosphor`, `-radix-lucide`, `-radix-phosphor`, `-aria-lucide`, `-aria-phosphor`
- Renderer: Chromium (Playwright S-014), device scale 1, 1280x800 and 375x812.
- Method: the upstream's own registry sources (the carousel, its engine and its Base UI button, with the `cn` package it imports, 0.3.0) and each port variant render in one Vite and Tailwind 4 harness with the upstream site's theme tokens (`src/app/globals.css`), in the upstream home page's layout: the door example (`gap-20`, `panelWidth="min(20rem, 42vw)"`) and the book example (`gap-14`, `min(14rem, 38vw)`), with prev and next buttons. The four upstream photos are replaced on both sides by the same generated images (the photos are not redistributable). Time is frozen with Playwright's clock (S-240), paused on its own 16 ms animation-frame grid, and advanced 16 ms per frame with a short real pause after each so React commits land in the same frame; CSS transitions are switched off on both sides (the button's hover and press transitions run on the compositor clock, which the fake clock does not drive; the fold is Motion). Frames: at rest; 96, 256, 400 and 608 ms after clicking next; after it settles; 256 ms after clicking previous; 304 ms after pressing ArrowRight with focus in the carousel; after that settles. Noise floor: a second upstream load.
- Target: at most 0.1% differing pixels per matched frame (owner brief, S-157, S-260).

## Result: pixels that differ

Every variant against the upstream, door and book, both viewports:

| Viewport | Variant | rest | next 96 / 256 / 400 / 608 ms | after next | prev 256 ms | key 304 ms | after key |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1280x800 | door, Base UI | 0.000% | 0.000% / 0.000% / 0.000% / 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 1280x800 | door, Radix | 0.000% | 0.000% / 0.000% / 0.000% / 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 1280x800 | door, React Aria | 0.000% | 0.000% / 0.000% / 0.000% / 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 1280x800 | book, Base UI | 0.000% | 0.000% / 0.000% / 0.000% / 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 1280x800 | book, Radix | 0.000% | 0.000% / 0.000% / 0.000% / 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 1280x800 | book, React Aria | 0.000% | 0.000% / 0.000% / 0.000% / 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812 | door, Base UI | 0.000% | 0.000% / 0.000% / 0.000% / 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812 | door, Radix | 0.000% | 0.000% / 0.000% / 0.000% / 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812 | door, React Aria | 0.000% | 0.000% / 0.000% / 0.000% / 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812 | book, Base UI | 0.000% | 0.000% / 0.000% / 0.000% / 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812 | book, Radix | 0.000% | 0.000% / 0.000% / 0.000% / 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812 | book, React Aria | 0.000% | 0.000% / 0.000% / 0.000% / 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |

Noise floor (upstream against a second upstream load): 0.000% in every frame.
Worst port frame: 0.000%.

Earlier runs that paused the clock at an arbitrary time measured up to 2.4%
between two upstream loads mid-fold: a click-started spring then began at a
random phase of the fake 16 ms frame grid. Pausing on the grid made every load
identical (docs/pitfalls.md).

Strips (rest, then 96, 256 and 400 ms into a turn, then settled; 1280x800, door; `-book` for the book variant): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port, Base UI), [diff.webp](diff.webp) (pixelmatch S-152; red marks a differing pixel).

## Deviations

Every change from upstream.

- Files: one upstream module per flat file, prefixed (decision 0022): `fold-carousel.tsx`, `fold-carousel-hook.ts` (was `use-fold-carousel.ts`), `fold-carousel-config.ts`, and `internal/*` as `fold-carousel-anchor-fold.ts`, `-book.tsx`, `-context.ts`, `-types.ts`, `-door.tsx`, `-face.tsx`, `-stage.tsx`, `-panels.ts`, `-slide-layer.tsx`, `-smoothstep.ts`, `-engine.ts`, `-leaf.ts`, `-ready-slides.ts`, `-wrap.ts`; relative imports follow. The upstream test file is not shipped.
- `cn` comes from `@/lib/utils` (clsx and tailwind-merge, as shadcn's) instead of the `cn` package; measured identical output.
- The button is part of the item, per primitive (`fold-carousel-button.tsx`): Base UI is the upstream's shadcn button file verbatim; Radix (a native button, Slot for `asChild`) and React Aria (its Button, `onClick` called from press events) carry the same classes and keep Base UI's `focusableWhenDisabled` behaviour (aria-disabled, stays in the tab order, ignores presses). The upstream installed shadcn's `button` as a registry dependency.
- Files that use hooks start with `"use client"` (the upstream relied on the importing file).
- Right to left: ArrowLeft and ArrowRight follow the reading direction, and the chevrons mirror (`rtl:-scale-x-100`).
- Phosphor items use `CaretLeftIcon` and `CaretRightIcon` for Lucide's chevrons.
- De-branding: the component, its copy and its demo name no device or brand; the upstream site's device wording and logos are not ported.
