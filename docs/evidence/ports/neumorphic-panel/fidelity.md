# neumorphic-panel: fidelity

- Upstream: the CodePen "Neumorphic shadows" by Una Kravets, <https://codepen.io/una/pen/gbwjzgw> (MIT, "Copyright (c) 2026 by Una Kravets"; S-460, license verified on the pen's Details view and CodePen's licensing documentation, S-451)
- Pin: no git commit exists for a pen, so the source is a verbatim snapshot of the pen's compiled debug view (`https://cdpn.io/pen/debug/gbwjzgw`, saved 2026-10-13 as `ports/una-neumorphic-shadows/neumorphic-panel/upstream/debug.html`, 1,619 bytes) and `ref` in `sources.yaml` is the git tree hash of that directory, `fc17a41832744c5ad747c8b8570a5cf2832562b9` (decision `docs/decisions/0027-pin-snapshot-sources.md`). Verify it from any commit that contains the snapshot: `git rev-parse <commit>:ports/una-neumorphic-shadows/neumorphic-panel/upstream` must print that hash.
- Port: `content/components/una-neumorphic-shadows/neumorphic-panel` (`neumorphic-panel`; default `neumorphic-panel`; one item, no primitive, no icons)
- Method: the pen's own page, served unchanged from the snapshot, against a Vite harness page (S-237; React 19.3, Tailwind 4.3, the Labs tokens) that renders `<NeumorphicPanel state="raised">` and `<NeumorphicPanel state="pressed">` with the pen's text, inside the pen's own body rule (its `margin: 8px` is the browser default, written out because Tailwind's preflight resets it). Chromium 156 (Playwright 1.64, S-014) at device scale 1, light scheme, `reducedMotion: no-preference`, the pen's fixed 300px panels, no animation to pause. Diffed with pixelmatch (S-152, threshold 0.1; PNG handling S-153), and also compared byte for byte, because the shadows are faint. The pen uses `corner-shape: squircle` under `@supports`; this Chromium supports it, so both sides draw squircle corners.
- Target: at most 0.1% differing pixels.

## Result: pixels that differ (default state, `neumorphic-panel`)

| State | Viewport | Frames | Worst diff | Noise floor (upstream vs itself) |
| --- | --- | --- | --- | --- |
| Raised panel above the pressed panel, as the pen | 1280x800 | 1 (static) | 0.000% (0 px) | 0.000% |
| The same | 375x812 | 1 (static) | 0.000% (0 px) | not measured (same page, same engine) |
| The same pair made of toggle buttons (`pressable`, the second `defaultPressed`) | 1280x800 | 1 (static) | 0.000% (0 px) | 0.000% |

Also exact: every screenshot above is byte-identical between upstream and port (`docs/evidence/ports/neumorphic-panel/fidelity.json` holds the pixelmatch numbers). The computed styles of both panels (box-shadow list, radius, `corner-shape`, color, background, font, letter spacing, rectangle) are equal strings on the two sides.

Strips: `default-<viewport>-{before,after,diff}.webp` and `toggle-1280x800-{before,after,diff}.webp` (before is the pen, after is the port, diff is pixelmatch's; red marks a differing pixel, none here).

## Deviations from upstream (the default look is unchanged)

- The pen styles two classes on a bare `div`; the port is a React component, `data-slot="neumorphic-panel"` with `data-state="raised" | "pressed"` instead of the classes `.raised` and `.pressed` (same specificity), and the CSS ships in a hoisted `<style href="designfrom-neumorphic-panel">` (React 19), so no global stylesheet is needed.
- The pen's colors are read through `--neumorphic-panel-*` variables with the pen's values as fallbacks (the item's `cssVars` carry them); geometry (offsets, blur, 300px, 64px radius and the 120px squircle) is the pen's.
- Added to the rule the pen puts on `body`: `font-family: system-ui, sans-serif` (the component sets it so it looks the same on any page), `line-height: normal`, `box-sizing: border-box` (no border or padding by default, so the size is the pen's 300px), `text-align: center`, and a button reset for the `pressable` toggle.
- The dark theme values are Labs' own (a darker surface, and white and black shadows tuned for it); the pen has a single light palette. They only apply under the site's dark theme or a `.dark` ancestor.
- The gallery demo lays the two panels side by side when the stage is wide enough, and stacks them (the pen's column) when it is not, so it fits the wall tile and the 1200x750 still; the first panel is a toggle that starts raised. The comparison above uses the pen's own column layout.
- The pen's demo text is the color hex, `E8EAE9`, kept in the gallery demo; it is the only content the pen shows.

## Enhancements (after fidelity)

- **Toggle**: `pressable` renders a native `<button type="button" aria-pressed>`; `pressed`, `defaultPressed` and `onPressedChange` control it. The pressed button is pixel-identical to the pen's pressed panel (the row above). The 200 ms ease between the two shadow lists only runs when reduced motion is not requested.
- **Right to left**: the light source mirrors to the top end: the x offsets of all four shadows flip under `:dir(rtl)` (computed `-31px` becomes `31px`, `8px` becomes `-8px`, and likewise for the insets), and the text reads in its own direction.
- **Contrast on request** (fidelity default, contrast on request; `ports/README.md`): the pen's text is `#ced3d9` on `#e8eae9`, 1.25:1, and the panel's edge is a soft shadow, so the default fails WCAG AA by design. Under `prefers-contrast: more` the text becomes `#4b525c` (6.53:1) and the panel gets a 2px `#4b525c` edge, the pressed state a 5px double edge; under `forced-colors: active` the text is `ButtonText`, the edge a system-colored border and the pressed state a double border (shadows are removed in forced colors). The focus outline is `#3a56d6` (4.99:1 on the surface), or `Highlight` in forced colors. The colors are `--neumorphic-panel-contrast-foreground`, `--neumorphic-panel-contrast-edge`, `--neumorphic-panel-foreground` and `--neumorphic-panel-focus`. Images: `contrast-more-1280x800.webp`, `forced-colors-1280x800.webp`, `rtl-1280x800.webp` (informational, not diffed).
- **Keyboard and screen reader**: Enter and Space toggle the button, focus shows an outline for keyboard focus only, the accessible name is the visible text plus a label that contains it. axe (WCAG 2.2 AA and best practices) on `/ui/neumorphic-panel`, light and dark, with more contrast requested, and after switching to right to left: no violations (`e2e/shadow-ports.spec.ts`). The default palette is not axe-clean for contrast, by design (see above).
- **Phones**: in the gallery demo the panels shrink with `max-w-full` (the pen's are a fixed 300px); checked at 320 and 375px, no horizontal page scroll.
- Gallery: the specimen wall tile loops a click on the toggle (`loop`, hydrated).
