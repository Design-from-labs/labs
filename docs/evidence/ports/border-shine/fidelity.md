# border-shine: fidelity

- Upstream: Jhey's CodePen [masked inset border shine](https://codepen.io/jh3y/pen/WbwyGBb) (S-465). Its own Details view shows an MIT notice, "Copyright (c) 2026 by Jhey (https://codepen.io/jh3y/pen/WbwyGBb)", which is `ports/jh3y-border-shine/LICENSE` (public pens are MIT by default, S-451).
- Pin (decision 0030, `docs/decisions/0030-pin-snapshot-sources.md`): a pen has no commit. The pen's debug view, `https://cdpn.io/pen/debug/WbwyGBb` (the code that actually runs), is saved byte for byte, fetched 2026-10-13 and re-fetched to confirm, as `ports/jh3y-border-shine/border-shine/upstream/debug.html`. `sources.yaml` `ref` is the git tree hash of that directory, `ccec66c2191e6105456fcb8d6e5eefc6f53c1ef9`; verify it with `git rev-parse <commit>:ports/jh3y-border-shine/border-shine/upstream`.
- Port: `ports/jh3y-border-shine/border-shine`, exported to `content/components/jh3y-border-shine/border-shine` (item `border-shine`, primitive none, no icons).
- What the pen is: a 64 px glass button drawn at scale 2 (a sun behind a cloud). Its `::before` is a dark gradient with a backdrop filter, its `::after` a 1 px inset highlight masked by a linear gradient, and the gradient's angle follows the pointer anywhere on the page (`--pointer-angle`, 0 at the top, clockwise). The same angle masks the sun's and the cloud's strokes.
- Method: Playwright (S-014) Chromium, device scale 1, dark scheme (the pen's pinned default). The pen runs as saved (its page script and the esm.sh modules it imports load), with its own page furniture hidden by a style tag (annotation arrows, the social link, the debug panel; none is part of the component). The port renders `BorderShine` with the pen's markup and classes in a harness page with the pen's page CSS (black body, the fading grid, the `main` wrapper with its 3D transform). Each state is a fresh load on both sides, the pointer moved to the same point (clamped into the viewport), settled for 300 ms plus two frames, then a full-viewport screenshot. pixelmatch (S-152), threshold 0.1. Noise floor: the pen against a second load of itself.
- Target: at most 0.1% differing pixels per state (owner brief, S-157).

## Result: pixels that differ

| Viewport | States | Worst state | Noise floor (3 states) |
| --- | --- | --- | --- |
| 1280x800 | 6 (rest; pointer at top left, right, below, centre, far corner) | 0.0000% | 0.0000% |
| 375x812 | 6 (same) | 0.0000% | 0.0000% |

The angle the page script wrote (`--pointer-angle`) and the angle the port wrote (`--border-shine-angle`) match to the hundredth in every state (for example 307.87, 92.60 and 188.53 at 1280x800).

Strips (1280x800, a 256 px crop around the button: rest, top left, right, below, centre, far corner): [before.webp](before.webp) (pen), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; blank). 375x812: `-375` files.

### The press, frame by frame

The pen's only motion of its own is the CSS transition on `translate` and `scale` when the button is pressed (0.1 s). The port's classes are `transition-[translate,scale] duration-100 ease-[ease-out]` (Tailwind's own `ease-out` is a different curve, `cubic-bezier(0, 0, 0.2, 1)`; P-147). With the mouse down, the two transitions were paused and sought to 0, 16, 32, 48, 64, 80, 96 and 100 ms on each side: `scale` and `translate` are identical on all eight frames (for example 1.99058 and 0 0.471233px at 32 ms; 1.98 and 0 1px at 100 ms). Screenshots at 0, 48 and 100 ms differ by 88 px (0.0086%), 14 px (0.0014%) and 0 px.

### GSAP

The pen imports GSAP 3.13 and Draggable (proprietary, S-345) only to let the visitor drag and reset its Tweakpane debug panel; nothing of the effect uses either. They are not ported, depended on or copied, and the panel (theme, pointer, angle, an exploded 3D view) is left out with its defaults pinned: dark, follow the pointer, angle 325, not exploded. There is therefore no tween to rewrite; the one transition is CSS and is recorded above.

## Behavior checks (port)

- Arrow keys, with the button focused: ArrowRight 340, ArrowRight 355, ArrowUp 10, ArrowLeft 355, Shift+ArrowLeft 310, Shift+ArrowLeft 265, ArrowDown 250, Home 325 (the rest angle), Shift+ArrowRight 10. At 25 degrees (after one more ArrowRight) the port is pixel identical to the pen with `--pointer-angle: 25.00` set by hand (0 px).
- Reduced motion: with the pointer moved and ArrowRight pressed, no `--border-shine-angle` is ever set and the screenshot equals the rest state (0 px).

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place.

- **A wrapper, not a button**: `BorderShine` renders any element (`as`, default `div`) around any content; `BorderShineGlyph` is the pen's sun-and-cloud drawing. Size, scale and press feedback are the caller's classes (the demo uses the pen's). `angle` (default 325), `follow` and `squircle` are props.
- **CSS**: the pen's layers (`base`, `demo`, `point`, `explode`, `arrows`) are flattened to the declarations that win at the pinned defaults, in a hoisted `<style>` (decision 0013); parts are `data-slot`s; `--pointer-angle` is `--border-shine-angle`; the pen's colors are `--border-shine-*` variables with the pen's values as fallbacks (and as the item's `cssVars`). The explode layer's transforms are left out (the exploded view is the debug panel's), except the `translate3d(0, 0, 0)` that promotes the pseudo-element and the glyph layers, which is kept. `isolate` replaces the stacking context the pen got from `scale`.
- **The pointer is read once per frame** (requestAnimationFrame) instead of on every event, so the light lags at most one frame.
- **Arrow keys turn the light** (15 degrees, Shift 45, Home resets) while the element, or a button or link inside it, has focus; fields and widgets that use the arrows themselves keep them. Not in the pen, which is pointer-only.
- **Reduced motion**: the light stays at `angle`; the pointer and the keys no longer move it.
- **The pseudo-elements ignore the pointer** (`pointer-events: none`) so content inside a wrapped card stays clickable.
- **Focus ring**: `focus-visible:outline-2 outline-offset-4 outline-ring`; the pen has the browser default.
- **Contrast and forced colors** (ports/README.md): under `prefers-contrast: more` the highlight is a solid white inset line; under forced colors the edge is a `CanvasText` border. Neither applies by default.
- **Left out**: the debug panel and its libraries, the annotation arrows, the follow link, the page's fonts (the arrows' Google font is not shipped; the arrows are hidden on both sides of the diff, so no font is compared), the exploded 3D view, `body` styles. The demo draws the black page and fading grid itself.
- **Added for the demo**: an accessible name on the glyph button (the pen has none) and a second, plain card wrapped the same way, to show it is not tied to an icon.
- **Types and lint only**: Biome formatting; the demo uses `ease-[ease-out]` for the pen's keyword curve.

## Credits

S-465 (the pen), S-451 (CodePen's licensing), S-345 (GSAP's license, why GSAP is not used), S-463 (`corner-shape`), S-156 (hoisted `<style>`), S-157, S-450.
