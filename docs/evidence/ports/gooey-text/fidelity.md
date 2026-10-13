# gooey-text: fidelity

- Upstream: Victor Welander's 21st.dev item [Gooey Text Morphing](https://21st.dev/@victorwelander/components/gooey-text-morphing) (S-466). The item's license field is `mit`, its page dates it 2024-11-27; the notice is `ports/victorwelander-gooey-text/LICENSE` ("Copyright (c) 2024 Victor Welander"). 21st's terms (S-467) ask for the license, a visible author credit and a link back to the item page: the notice, the `author` field, the file header and the docs carry all three.
- Pin (decision 0027, `docs/decisions/0027-pin-snapshot-sources.md`): there is no repository or commit. The component, `gooey-text-morphing.tsx`, and its demo, `gooey-text-morphing.demo.tsx`, are saved byte for byte from 21st's CDN (`https://cdn.21st.dev/user_victorwelander/gooey-text-morphing.tsx` and `...demo.tsx`, fetched 2026-10-13 and re-fetched to confirm) in `ports/victorwelander-gooey-text/gooey-text/upstream/`. `sources.yaml` `ref` is the git tree hash of that directory, `d25e7a0b47e178eee1fba417e742d9950e30cebf`; verify it with `git rev-parse <commit>:ports/victorwelander-gooey-text/gooey-text/upstream`.
- Port: `ports/victorwelander-gooey-text/gooey-text`, exported to `content/components/victorwelander-gooey-text/gooey-text` (item `gooey-text`, primitive none, no icons).
- Not the same as `text-morph`: that item (a port of torph) glides shared characters to their new places; this one blurs two copies of the text over each other and thresholds the alpha with an SVG color matrix.
- Method: Playwright (S-014) Chromium, device scale 1, light scheme. The upstream demo (its component and demo files as saved, Tailwind loaded because the component's classes need it, Figtree on both sides) and the port's demo render in two harness pages with the same body. Playwright's fake clock is installed at a fixed epoch and **paused before the page loads**, so both sides start their loops at the same clock reading (`new Date()` upstream, `performance.now()` in the port; P-104 does not arise); each side then advances with `runFor` and a full-viewport screenshot is taken at 24 matched times from 100 ms to 9 s (the first morph, the holds, the full 5 s cycle and into the second). pixelmatch (S-152), threshold 0.1. Noise floor: a second load of upstream against the first.
- Target: at most 0.1% differing pixels per matched frame (owner brief, S-157).

## Result: pixels that differ

| Viewport | Frames | Worst frame from 300 ms | The first 250 ms | Noise floor |
| --- | --- | --- | --- | --- |
| 1280x800 | 24 | 0.0000% | 0.6268% (see Deviations) | 0.0000% |
| 375x812 | 24 | 0.0000% | 1.1816% (see Deviations) | 0.0000% |

Every frame from 300 ms on is pixel identical at both sizes. The strips were captured on a second run of the same script: the first run measured two 375x812 frames in the middle of the first morph at 54 px (0.0177%, 850 ms) and 8 px (0.0026%, 1000 ms), which did not reproduce (the noise floor was 0 in both runs), so the cause, most likely the fractional milliseconds of `performance.now()` against whole ones of `new Date()`, is not isolated. Both runs are under the 0.1% target.

Strips (1280x800, the 760x160 band of the viewport that holds the text at 300, 700, 1000, 1500, 2000, 3000 and 4500 ms): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red marks a differing pixel; all blank). 375x812: `-375` files.

## Behavior checks (port, not pixel diffs)

Measured in the same harness (real time):

- Accessibility tree of the demo: one text node, "Design, Engineering, Is, Awesome"; the morphing copies are under an `aria-hidden` container.
- Reduced motion: over 7 s of samples the copies' `filter` is always empty and `opacity` only 0 or 1 (plain swaps); all four words appear.
- Motion on: 57 distinct filter values over 2 s (the blur runs).
- A `data-loop-paused` ancestor freezes the words and removing it resumes them; so does scrolling the component far off screen and back.
- React StrictMode (mount, unmount, mount): upstream arms 180 animation frames in 1.5 s, the port 90. Upstream's effect returns no cleanup, so StrictMode leaves two loops running; the port cancels its loop and disconnects its observer.

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place.

- **The first word is in the server render.** Upstream's two spans start empty, so the first `cooldownTime` (0.25 s) shows nothing and then the first morph starts from "Design". The port renders the first word in the second copy, so the server render, the gallery tile and a no-JavaScript visit show a word, and the word holds 0.25 s longer before the first morph. That is the only difference in the first 250 ms and the only frames over the target (above).
- **The loop is cancelled on unmount** (`cancelAnimationFrame`, observer disconnected), pauses off screen (IntersectionObserver), in a paused gallery tile (`data-loop-paused`, contract 4.3) and with the new `paused` prop, and picks up where it stopped (time that passes while paused is not counted).
- **Frame times come from `performance.now()`** instead of `new Date()` (whole milliseconds upstream, fractional here).
- **The words are compared by value**: `texts` is keyed on its joined contents, so a parent that re-renders with an inline array does not restart the morph (upstream's effect depends on the array's identity).
- **The filter id is unique per instance** (`useId`), where upstream's is the fixed `threshold`: two instances, or another `#threshold` on the page, no longer share a filter.
- **Accessible text**: the morphing container is `aria-hidden`, and a visually hidden span holds every word once (or the `label` prop). The moving words are never announced.
- **Reduced motion**: the words swap at the same rhythm with no blur and no fade (`useReducedMotion`).
- **Types and lint only**: the interface is exported, `Math.pow` is kept as is, Biome formatting.
- Not changed on purpose: the root has no height of its own (the copies are absolutely positioned, as upstream), so the demo, like upstream's, gives its parent a height; and in a flex-centered parent the root is zero wide, so a phrase with spaces wraps at every space (upstream's behavior; the docs say so).

## Enhancements

None to the default look: `label`, `paused`, the registry item's docs and props, `tile` (span 2) and `loop` (hydrated, so the wall tile morphs).

## Credits

S-466 (the item), S-467 (21st's terms: credit and link back), S-469 (WCAG 2.2.2: why the words ship with `paused` and a note to pair it with a pause control), S-157, S-450.
