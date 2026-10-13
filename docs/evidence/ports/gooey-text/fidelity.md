# gooey-text: fidelity

- Upstream: Victor Welander's 21st.dev item [Gooey Text Morphing](https://21st.dev/@victorwelander/components/gooey-text-morphing) (S-466). The item's license field is `mit`, its page dates it 2024-11-27; the notice is `ports/victorwelander-gooey-text/LICENSE` ("Copyright (c) 2024 Victor Welander"). 21st's terms (S-467) ask for the license, a visible author credit and a link back to the item page: the notice, the `author` field, the file header and the docs carry all three.
- Pin (decision 0030, `docs/decisions/0030-pin-snapshot-sources.md`): there is no repository or commit. The component, `gooey-text-morphing.tsx`, and its demo, `gooey-text-morphing.demo.tsx`, are saved byte for byte from 21st's CDN (`https://cdn.21st.dev/user_victorwelander/gooey-text-morphing.tsx` and `...demo.tsx`, fetched 2026-10-13 and re-fetched to confirm) in `ports/victorwelander-gooey-text/gooey-text/upstream/`. `sources.yaml` `ref` is the git tree hash of that directory, `d25e7a0b47e178eee1fba417e742d9950e30cebf`; verify it with `git rev-parse <commit>:ports/victorwelander-gooey-text/gooey-text/upstream`.
- Port: `ports/victorwelander-gooey-text/gooey-text`, exported to `content/components/victorwelander-gooey-text/gooey-text` (item `gooey-text`, primitive none, no icons).
- Not the same as `text-morph`: that item (a port of torph) glides shared characters to their new places; this one blurs two copies of the text over each other and thresholds the alpha with an SVG color matrix.
- Method: Playwright (S-014) Chromium, device scale 1, light scheme. The upstream demo (its component and demo files as saved, Tailwind loaded because the component's classes need it, Figtree on both sides) and the port's demo render in two harness pages with the same body. Playwright's fake clock is installed at a fixed epoch and **paused before the page loads**, so both sides start their loops at the same clock reading (`new Date()` upstream, `performance.now()` in the port; P-104 does not arise); each side then advances with `runFor` and a full-viewport screenshot is taken at 24 matched times from 100 ms to 9 s (the first morph, the holds, the full 5 s cycle and into the second). pixelmatch (S-152), threshold 0.1. Noise floor: a second load of upstream against the first.
- Target: at most 0.1% differing pixels per matched frame (owner brief, S-157).

## Result: pixels that differ (default props, as upstream's demo)

| Viewport | Matched frames (0 ms to 9 s) | Worst frame | Noise floor |
| --- | --- | --- | --- |
| 1280x800 | 26 | 0.0000% | 0.0000% |
| 375x812 | 26 | 0.0177% (54 px, 850 ms, mid first morph) | 0.0000% |

Every frame, including the blank first 250 ms (0, 50, 100 and 250 ms), is pixel identical at 1280x800, and at 375x812 all but two: 54 px (0.0177%) at 850 ms and 8 px (0.0026%) at 1000 ms, in the middle of the first morph. These two also appeared on the first of the earlier runs and not on the second; the most likely cause, not isolated, is the fractional milliseconds of `performance.now()` against the whole ones of `new Date()`. All frames are under the 0.1% target. Re-measured by the WEB-1 lead after the first word became opt-in.

Strips (1280x800, the 760x160 band of the viewport that holds the text at 100, 300, 700, 1000, 1500, 2000, 3000 and 4500 ms): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red marks a differing pixel; all blank). 375x812: `-375` files.

## Behavior checks (port, not pixel diffs)

Measured in the same harness (real time):

- Accessibility tree of the demo: one text node, "Design, Engineering, Is, Awesome"; the morphing copies are under an `aria-hidden` container.
- Reduced motion: over 7 s of samples the copies' `filter` is always empty and `opacity` only 0 or 1 (plain swaps); all four words appear.
- Motion on: 57 distinct filter values over 2 s (the blur runs).
- A `data-loop-paused` ancestor freezes the words and removing it resumes them; so does scrolling the component far off screen and back.
- React StrictMode (mount, unmount, mount): upstream arms 180 animation frames in 1.5 s, the port 90. Upstream's effect returns no cleanup, so StrictMode leaves two loops running; the port cancels its loop and disconnects its observer.

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place.

- **`renderFirstWordOnServer` (opt-in, off by default).** By default the port starts empty, like upstream: the first `cooldownTime` (0.25 s) shows nothing, then the first morph starts from "Design". With the prop set, the first word is in the second copy's server render, so the server HTML, a no-JavaScript visit and the first frames show a word (the word then holds 0.25 s before the first morph). Measured with the prop set: 0.6268% (1280x800) and 1.1816% (375x812) in the first 250 ms, identical afterwards; the default, measured above, is what the demo and the wall tile use ("fidelity default", ports/README.md).
- **The loop is cancelled on unmount** (`cancelAnimationFrame`, observer disconnected), pauses off screen (IntersectionObserver), in a paused gallery tile (`data-loop-paused`, contract 4.3) and with the new `paused` prop, and picks up where it stopped (time that passes while paused is not counted).
- **Frame times come from `performance.now()`** instead of `new Date()` (whole milliseconds upstream, fractional here).
- **The words are compared by value**: `texts` is keyed on its joined contents, so a parent that re-renders with an inline array does not restart the morph (upstream's effect depends on the array's identity).
- **The filter id is unique per instance** (`useId`), where upstream's is the fixed `threshold`: two instances, or another `#threshold` on the page, no longer share a filter.
- **Accessible text**: the morphing container is `aria-hidden`, and a visually hidden span holds every word once (or the `label` prop). The moving words are never announced.
- **Reduced motion**: the words swap at the same rhythm with no blur and no fade (`useReducedMotion`).
- **Types and lint only**: the interface is exported, `Math.pow` is kept as is, Biome formatting.
- Not changed on purpose: the root has no height of its own (the copies are absolutely positioned, as upstream), so the demo, like upstream's, gives its parent a height; and in a flex-centered parent the root is zero wide, so a phrase with spaces wraps at every space (upstream's behavior; the docs say so).

## Enhancements

None to the default look: `label`, `paused`, `renderFirstWordOnServer`, the registry item's docs and props, `tile` (span 2) and `loop` (hydrated, so the wall tile morphs).

## Credits

S-466 (the item), S-467 (21st's terms: credit and link back), S-469 (WCAG 2.2.2: why the words ship with `paused` and a note to pair it with a pause control), S-157, S-450.
