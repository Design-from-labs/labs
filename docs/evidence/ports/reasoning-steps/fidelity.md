# Reasoning Steps: port fidelity

- Upstream: edwinvakayil/iconiq @ 236a851dd5ebb4c3a079d81c4646e19ab57d7574 (`registry/reasoning-steps.tsx`, Base UI)
- Harness: one page renders upstream's file or the port's, with upstream's own demo scene (`ReasoningStepsPreview` from `app/(site)/blocks/reasoning-steps/page.tsx`), upstream's theme tokens (`app/globals.css`) and its font (Geist); React 19.3.0, motion 14.1.0, @base-ui/react 1.9.0, radix-ui 1.6.7, react-aria-components 1.22.1, lucide-react 1.55.0; Chromium (Playwright 1.64.0), device scale 1
- Upstream demo: upstream's Next.js app run from the pinned commit (`next dev`, its own lockfile: motion 12, @base-ui/react 1.5, lucide-react 0.564), its page `/blocks/reasoning-steps` captured twice: once with upstream's `registry/reasoning-steps.tsx`, once with the port's Base UI file copied over it. Only the card is compared; the page background under its rounded corners is set to white on both sides.
- Diff: pixelmatch (S-152), threshold 0.1, anti-aliased pixels excluded; percent of all pixels in the frame (the card, for upstream-demo rows)
- Viewports: 1280x800 (desktop) and 375x812 (mobile)
- Clock: Playwright's clock is paused and stepped in 50 ms increments (the readout, the demo's cycle and Motion's frame loop); the harness removes `Element.prototype.animate` on both sides, so Motion runs every property on the paused clock (P-122); upstream's Next.js page is captured as it ships, and frames there are the best of three, with an upstream-against-upstream control
- Target: at most 0.1%. Worst port frame: **0.0483%** (Radix, mobile, timeline open at step 3). Default variant (Base UI, Lucide) worst: **0.0387%** (upstream demo, mobile, step 1).

## Scene

Upstream's demo: a user bubble, then the trace with four steps (reading, recalling, weighing with nested details and two source pills, drafting). States: collapsed at step 1 and step 3 (the label shimmers and the active step's label shows under it) and when done; open at step 3, done, done with the details open, done in the dark theme; the self-timing readout after 3 s; and 80, 200 and 400 ms into opening (Motion's spring). On upstream's page: collapsed and open frames at steps 1, 3 and done, timed inside one step of the demo's 1700 ms cycle.

## Results: harness (upstream's file and demo scene)

| Against | Variant | State | Viewport | Differing pixels | Percent |
| --- | --- | --- | --- | ---: | ---: |
| upstream | Base UI, Lucide | collapsed-step1 | 1280x800 | 113 | 0.0110% |
| upstream | Base UI, Lucide | collapsed-step3 | 1280x800 | 122 | 0.0119% |
| upstream | Base UI, Lucide | collapsed-done | 1280x800 | 0 | 0.0000% |
| upstream | Base UI, Lucide | open-step3 | 1280x800 | 127 | 0.0124% |
| upstream | Base UI, Lucide | open-done | 1280x800 | 0 | 0.0000% |
| upstream | Base UI, Lucide | open-done-details | 1280x800 | 0 | 0.0000% |
| upstream | Base UI, Lucide | open-done-dark | 1280x800 | 0 | 0.0000% |
| upstream | Base UI, Lucide | self-timing-3s | 1280x800 | 125 | 0.0122% |
| upstream | Base UI, Lucide | expand-at-80ms | 1280x800 | 0 | 0.0000% |
| upstream | Base UI, Lucide | expand-at-200ms | 1280x800 | 5 | 0.0005% |
| upstream | Base UI, Lucide | expand-at-400ms | 1280x800 | 0 | 0.0000% |
| upstream | Base UI, Lucide | collapsed-step1 | 375x812 | 49 | 0.0161% |
| upstream | Base UI, Lucide | collapsed-step3 | 375x812 | 0 | 0.0000% |
| upstream | Base UI, Lucide | collapsed-done | 375x812 | 0 | 0.0000% |
| upstream | Base UI, Lucide | open-step3 | 375x812 | 0 | 0.0000% |
| upstream | Base UI, Lucide | open-done | 375x812 | 0 | 0.0000% |
| upstream | Base UI, Lucide | open-done-details | 375x812 | 0 | 0.0000% |
| upstream | Base UI, Lucide | open-done-dark | 375x812 | 0 | 0.0000% |
| upstream | Base UI, Lucide | self-timing-3s | 375x812 | 76 | 0.0250% |
| upstream | Base UI, Lucide | expand-at-80ms | 375x812 | 0 | 0.0000% |
| upstream | Base UI, Lucide | expand-at-200ms | 375x812 | 29 | 0.0095% |
| upstream | Base UI, Lucide | expand-at-400ms | 375x812 | 0 | 0.0000% |
| upstream | Radix, Lucide | collapsed-step1 | 1280x800 | 106 | 0.0104% |
| upstream | Radix, Lucide | collapsed-step3 | 1280x800 | 132 | 0.0129% |
| upstream | Radix, Lucide | collapsed-done | 1280x800 | 0 | 0.0000% |
| upstream | Radix, Lucide | open-step3 | 1280x800 | 351 | 0.0343% |
| upstream | Radix, Lucide | open-done | 1280x800 | 0 | 0.0000% (best of 2) |
| upstream | Radix, Lucide | open-done-details | 1280x800 | 472 | 0.0461% |
| upstream | Radix, Lucide | open-done-dark | 1280x800 | 417 | 0.0407% |
| upstream | Radix, Lucide | self-timing-3s | 1280x800 | 61 | 0.0060% |
| upstream | Radix, Lucide | expand-at-80ms | 1280x800 | 0 | 0.0000% |
| upstream | Radix, Lucide | expand-at-200ms | 1280x800 | 1 | 0.0001% |
| upstream | Radix, Lucide | expand-at-400ms | 1280x800 | 0 | 0.0000% |
| upstream | Radix, Lucide | collapsed-step1 | 375x812 | 44 | 0.0144% |
| upstream | Radix, Lucide | collapsed-step3 | 375x812 | 72 | 0.0236% |
| upstream | Radix, Lucide | collapsed-done | 375x812 | 0 | 0.0000% |
| upstream | Radix, Lucide | open-step3 | 375x812 | 147 | 0.0483% |
| upstream | Radix, Lucide | open-done | 375x812 | 0 | 0.0000% |
| upstream | Radix, Lucide | open-done-details | 375x812 | 0 | 0.0000% |
| upstream | Radix, Lucide | open-done-dark | 375x812 | 0 | 0.0000% |
| upstream | Radix, Lucide | self-timing-3s | 375x812 | 138 | 0.0453% (best of 2) |
| upstream | Radix, Lucide | expand-at-80ms | 375x812 | 0 | 0.0000% |
| upstream | Radix, Lucide | expand-at-200ms | 375x812 | 25 | 0.0082% |
| upstream | Radix, Lucide | expand-at-400ms | 375x812 | 0 | 0.0000% |
| upstream | React Aria, Lucide | collapsed-step1 | 1280x800 | 99 | 0.0097% |
| upstream | React Aria, Lucide | collapsed-step3 | 1280x800 | 0 | 0.0000% |
| upstream | React Aria, Lucide | collapsed-done | 1280x800 | 0 | 0.0000% |
| upstream | React Aria, Lucide | open-step3 | 1280x800 | 0 | 0.0000% |
| upstream | React Aria, Lucide | open-done | 1280x800 | 0 | 0.0000% |
| upstream | React Aria, Lucide | open-done-details | 1280x800 | 0 | 0.0000% |
| upstream | React Aria, Lucide | open-done-dark | 1280x800 | 0 | 0.0000% |
| upstream | React Aria, Lucide | self-timing-3s | 1280x800 | 65 | 0.0063% |
| upstream | React Aria, Lucide | expand-at-80ms | 1280x800 | 0 | 0.0000% |
| upstream | React Aria, Lucide | expand-at-200ms | 1280x800 | 4 | 0.0004% |
| upstream | React Aria, Lucide | expand-at-400ms | 1280x800 | 0 | 0.0000% |
| upstream | React Aria, Lucide | collapsed-step1 | 375x812 | 107 | 0.0351% |
| upstream | React Aria, Lucide | collapsed-step3 | 375x812 | 73 | 0.0240% |
| upstream | React Aria, Lucide | collapsed-done | 375x812 | 0 | 0.0000% |
| upstream | React Aria, Lucide | open-step3 | 375x812 | 89 | 0.0292% |
| upstream | React Aria, Lucide | open-done | 375x812 | 0 | 0.0000% |
| upstream | React Aria, Lucide | open-done-details | 375x812 | 0 | 0.0000% |
| upstream | React Aria, Lucide | open-done-dark | 375x812 | 0 | 0.0000% |
| upstream | React Aria, Lucide | self-timing-3s | 375x812 | 128 | 0.0420% |
| upstream | React Aria, Lucide | expand-at-80ms | 375x812 | 0 | 0.0000% |
| upstream | React Aria, Lucide | expand-at-200ms | 375x812 | 27 | 0.0089% |
| upstream | React Aria, Lucide | expand-at-400ms | 375x812 | 57 | 0.0187% |
| upstream | Base UI, Phosphor | open-done | 1280x800 | 40 | 0.0039% |
| upstream | Base UI, Phosphor | open-done | 375x812 | 40 | 0.0131% |
| control | upstream | collapsed-step1 | 1280x800 | 62 | 0.0061% |
| control | upstream | collapsed-step3 | 1280x800 | 138 | 0.0135% |
| control | upstream | collapsed-done | 1280x800 | 0 | 0.0000% |
| control | upstream | open-step3 | 1280x800 | 64 | 0.0063% |
| control | upstream | open-done | 1280x800 | 0 | 0.0000% |
| control | upstream | open-done-details | 1280x800 | 0 | 0.0000% |
| control | upstream | open-done-dark | 1280x800 | 0 | 0.0000% |
| control | upstream | self-timing-3s | 1280x800 | 134 | 0.0131% |
| control | upstream | expand-at-80ms | 1280x800 | 131 | 0.0128% |
| control | upstream | expand-at-200ms | 1280x800 | 9 | 0.0009% |
| control | upstream | expand-at-400ms | 1280x800 | 0 | 0.0000% |
| control | upstream | collapsed-step1 | 375x812 | 56 | 0.0184% |
| control | upstream | collapsed-step3 | 375x812 | 0 | 0.0000% |
| control | upstream | collapsed-done | 375x812 | 0 | 0.0000% |
| control | upstream | open-step3 | 375x812 | 128 | 0.0420% |
| control | upstream | open-done | 375x812 | 0 | 0.0000% |
| control | upstream | open-done-details | 375x812 | 0 | 0.0000% |
| control | upstream | open-done-dark | 375x812 | 0 | 0.0000% |
| control | upstream | self-timing-3s | 375x812 | 89 | 0.0292% |
| control | upstream | expand-at-80ms | 375x812 | 0 | 0.0000% |
| control | upstream | expand-at-200ms | 375x812 | 24 | 0.0079% |
| control | upstream | expand-at-400ms | 375x812 | 53 | 0.0174% |

## Results: upstream's own demo page

| Against | Variant | State | Viewport | Differing pixels | Percent |
| --- | --- | --- | --- | ---: | ---: |
| upstream demo | Base UI, Lucide | step1-collapsed | 1280x800 | 0 | 0.0000% |
| upstream demo | Base UI, Lucide | step3-collapsed | 1280x800 | 0 | 0.0000% |
| upstream demo | Base UI, Lucide | done-collapsed | 1280x800 | 0 | 0.0000% |
| upstream demo | Base UI, Lucide | step3-open | 1280x800 | 0 | 0.0000% (best of 3) |
| upstream demo | Base UI, Lucide | done-open | 1280x800 | 0 | 0.0000% |
| upstream demo | Base UI, Lucide | step1-collapsed | 375x812 | 21 | 0.0387% |
| upstream demo | Base UI, Lucide | step3-collapsed | 375x812 | 0 | 0.0000% |
| upstream demo | Base UI, Lucide | done-collapsed | 375x812 | 0 | 0.0000% |
| upstream demo | Base UI, Lucide | step3-open | 375x812 | 0 | 0.0000% |
| upstream demo | Base UI, Lucide | done-open | 375x812 | 0 | 0.0000% (best of 2) |
| control | upstream | step1-collapsed | 1280x800 | 0 | 0.0000% |
| control | upstream | step3-collapsed | 1280x800 | 239 | 0.2565% (best of 3) |
| control | upstream | done-collapsed | 1280x800 | 0 | 0.0000% (best of 3) |
| control | upstream | step3-open | 1280x800 | 0 | 0.0000% |
| control | upstream | done-open | 1280x800 | 0 | 0.0000% |
| control | upstream | step1-collapsed | 375x812 | 0 | 0.0000% |
| control | upstream | step3-collapsed | 375x812 | 0 | 0.0000% (best of 2) |
| control | upstream | done-collapsed | 375x812 | 0 | 0.0000% |
| control | upstream | step3-open | 375x812 | 0 | 0.0000% |
| control | upstream | done-open | 375x812 | 0 | 0.0000% (best of 2) |

## Evidence

`<state>-before.webp` is upstream, `-after.webp` the default variant (Base UI, Lucide), `-diff.webp` the pixelmatch overlay (red: differing pixels). `demo-*` frames are cropped to the card on upstream's own page.

## Deviations

- Base UI (the default) is upstream's file. Labs additions, none visible: the trigger's `text-left` is `text-start`; a polite live region carries the active step's label, so screen readers hear the progress without opening the timeline; a source pill that links out says "(opens in a new tab)" to screen readers.
- Radix: `Collapsible` from `radix-ui`. The trigger is the `motion.button` through `asChild`; the panel is force-mounted with upstream's own `hidden`, set once Motion's collapse finishes, as in the Base UI file.
- React Aria: `Disclosure`, `Button` (rendered as the `motion.button` through `render`) and `DisclosurePanel`. React Aria hides a collapsed panel with `hidden="until-found"` (find-in-page can open it) as soon as the panel's own animations end, which would blank Motion's inner collapse; the panel keeps `content-visibility: visible` until the collapse finishes (P-108). Its trigger's press scale follows React Aria's pressed state instead of Motion's `whileTap`, whose keyboard press toggled the disclosure a second time (P-124).
- Phosphor: `Check` becomes Phosphor's `CheckIcon` (a filled glyph, not a 3 px stroke).
- Demo: upstream's own preview, with one source pill renamed from a vendor's docs domain to `docs/deploys.md`, and a ref so the /ui wall can pause its cycle.
- Measurement: Motion runs some properties through the Web Animations API on real time; the harness removes `Element.prototype.animate` on both sides so every Motion frame follows the paused clock (P-122).
