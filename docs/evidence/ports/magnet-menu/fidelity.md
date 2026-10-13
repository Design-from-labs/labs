# magnet-menu: fidelity

- Upstream: Jhey's CodePen pen [Anchor Magnet Slide Menu](https://codepen.io/jh3y/pen/GRapZqO) (MIT, copyright 2026 by Jhey; S-470), pinned by the verbatim snapshot of its debug view, `ports/jh3y-anchor-magnet-menu/magnet-menu/upstream/debug.html` (19,374 bytes, captured 2026-10-13 and checked byte for byte against a second fetch the same day). `sources.yaml` `ref` is the git tree hash of that directory, `5d90f07374a1971ad805930ae6dc0c433c84f228` (`git rev-parse <commit>:ports/jh3y-anchor-magnet-menu/magnet-menu/upstream`; decision 0027, S-451)
- Port: `ports/jh3y-anchor-magnet-menu/magnet-menu`, exported to `content/components/jh3y-anchor-magnet-menu/magnet-menu` (items `magnet-menu` (default, no primitive), `magnet-menu-radix`, `magnet-menu-base`; no icons)
- Method: The upstream side is the snapshot served as is (only the `normalize.css` link points at a local copy of CodePen's stylesheet, `normalize-5.0.0.min.css`); the pen's own script runs. The port side is a harness page with the pen's page layer (its `body`, `body::before` backdrop and the normalize stylesheet, which are not part of the component) around the component with the same five links and ids, in a Vite harness (S-237) with React 19.3. Both run in Chromium 156.0.8078.4 (Playwright, S-014) at device scale 1, light and dark, 1280x800 and 375x812, one fresh browser context per screenshot. The pen is light until its theme button sets `html.dark` (its `body` background is `light-dark()` with no `color-scheme` of its own, so it ignores `prefers-color-scheme`); the dark runs set that class on both sides after load (the button's view transition is skipped) and also emulate the dark scheme. Each state is driven with real input (a mouse move onto a link, Tab presses until the link is focused, a click on a link). The pen's three fixed buttons (author link, orientation, theme) are hidden on its side. The screenshot is the whole viewport, with transitions finished (`animations: "disabled"`), and diffed with pixelmatch (threshold 0.1, S-152; PNG handling S-153). Mid-transition frames are checked separately (below). Noise floor: not measured separately, because every state renders to the same pixels on both sides.
- Target: at most 0.1% differing pixels.

## Result: pixels that differ

| State | 1280x800 light | 1280x800 dark | 375x812 light | 375x812 dark |
| --- | --- | --- | --- | --- |
| at rest | 0.000% | 0.000% | 0.000% | n/a |
| pointer on Posts | 0.000% | 0.000% | 0.000% | n/a |
| keyboard focus on Snippets | 0.000% | 0.000% | 0.000% | n/a |
| current Craft, pointer away | 0.000% | 0.000% | 0.000% | n/a |
| current Craft, pointer on Snippets | 0.000% | 0.000% | 0.000% | 0.000% |
| current Craft, pointer on it | 0.000% | 0.000% | 0.000% | n/a |
| vertical | 0.000% | 0.000% | 0.000% | n/a |
| vertical, pointer on Posts | 0.000% | 0.000% | 0.000% | n/a |

Strips (top to bottom: rest, hover on Posts, keyboard focus on Snippets, current Craft with the pointer away, current Craft with the pointer on Snippets, current Craft with the pointer on it, vertical, vertical with hover on Posts; 1280x800, light, half size): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red marks a differing pixel). Dark: [before-dark.webp](before-dark.webp), [after-dark.webp](after-dark.webp), [diff-dark.webp](diff-dark.webp). 375x812, side by side: [before-375.webp](before-375.webp), [after-375.webp](after-375.webp), [diff-375.webp](diff-375.webp).

The Radix and Base UI items are the same stylesheet around a different element tree; their 25 states are measured the same way:

Radix (`magnet-menu-radix`):

| State | 1280x800 light | 1280x800 dark | 375x812 light | 375x812 dark |
| --- | --- | --- | --- | --- |
| at rest | 0.000% | 0.000% | 0.000% | n/a |
| pointer on Posts | 0.000% | 0.000% | 0.000% | n/a |
| keyboard focus on Snippets | 0.000% | 0.000% | 0.000% | n/a |
| current Craft, pointer away | 0.000% | 0.000% | 0.000% | n/a |
| current Craft, pointer on Snippets | 0.000% | 0.000% | 0.000% | 0.000% |
| current Craft, pointer on it | 0.000% | 0.000% | 0.000% | n/a |
| vertical | 0.000% | 0.000% | 0.000% | n/a |
| vertical, pointer on Posts | 0.000% | 0.000% | 0.000% | n/a |

Base UI (`magnet-menu-base`):

| State | 1280x800 light | 1280x800 dark | 375x812 light | 375x812 dark |
| --- | --- | --- | --- | --- |
| at rest | 0.000% | 0.000% | 0.000% | n/a |
| pointer on Posts | 0.000% | 0.000% | 0.000% | n/a |
| keyboard focus on Snippets | 0.000% | 0.000% | 0.000% | n/a |
| current Craft, pointer away | 0.000% | 0.000% | 0.000% | n/a |
| current Craft, pointer on Snippets | 0.000% | 0.000% | 0.000% | 0.000% |
| current Craft, pointer on it | 0.000% | 0.000% | 0.000% | n/a |
| vertical | 0.000% | 0.000% | 0.000% | n/a |
| vertical, pointer on Posts | 0.000% | 0.000% | 0.000% | n/a |

### Mid-transition frames

The pill and the underline animate (0.18 s, a linear() easing). With every animation paused at the same transition time on both sides (`getAnimations`, `pause`, `currentTime`), the region around the nav (800x160) at 1280x800 differs by:

| Scene | 30 ms | 70 ms | 110 ms | 150 ms |
| --- | --- | --- | --- | --- |
| the pill fades in on Posts | 0.000% | 0.000% | 0.000% | 0.000% |
| the pill slides from Posts to Snippets | 0.000% | 0.000% | 0.000% | 0.000% |
| the pill fades out after the pointer leaves | 0.000% | 0.000% | 0.000% | 0.000% |
| the underline slides from Home to Craft (with the pill) | 0.000% | 0.000% | 0.000% | 0.000% |

Strips at 70 ms (top to bottom: the four scenes): [mid-before.webp](mid-before.webp), [mid-after.webp](mid-after.webp), [mid-diff.webp](mid-diff.webp).

## Support boundary

Measured on this machine (S-472 is the reference for the feature itself): Playwright's Chromium 156.0.8078.4 reports `CSS.supports("anchor-name: --a")`, `position-anchor` and `anchor()` as supported, so the pill and underline are placed by the stylesheet alone and the script does nothing (`data-magnet-menu-fallback` is absent). The component asks the same question at mount; where the answer is no, the nav gets `data-magnet-menu-fallback` and the script described under Deviations positions the pill and underline instead.

No engine without anchor positioning is installed here to try it on: the WebKit builds in Playwright's cache (revisions 2272, 2336 and 2359) start but do not answer the driver (a launch hung until it was killed), and there is no Firefox. So that path was measured in Chromium with the feature switched off the way an unsupporting browser sees it: `CSS.supports` answers no for anything anchor-related, and the stylesheet's `@supports (anchor-name: --a)` block is made never to match (the text of the hoisted `<style>` is patched after load). Each state is then diffed against the same state rendered with anchor positioning (same harness page, same viewport, transitions finished):

| State (default item) | script positions against CSS anchors |
| --- | --- |
| at rest | 0.000% |
| pointer on Posts | 0.000% |
| keyboard focus on Snippets | 0.000% |
| current Craft, pointer away | 0.000% |
| current Craft, pointer on Snippets | 0.000% |
| vertical, pointer on Posts | 0.000% |
| viewport narrowed to 700 px, pointer on Snippets | 0.000% |
| pointer on Posts (radix item) | 0.000% |
| current Craft, pointer on Snippets (radix item) | 0.000% |
| pointer on Posts (base item) | 0.000% |
| current Craft, pointer on Snippets (base item) | 0.000% |

The script's numbers are whole pixels (`offsetLeft`, `offsetTop`, `offsetWidth`, `offsetHeight`, which also ignore any transform on a host), so its pill can sit up to half a pixel from the anchored one (measured: left 158 against 158.234 px and 81 against 80.594 px wide for Posts); no pixel differs beyond the diff threshold, including after the viewport is narrowed (the script re-measures on resize). What this does not show is how a real older engine lays out the rest of the page; the support boundary is therefore stated as the feature test, not as a list of browser versions.

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place.

- **Only the nav is the component.** The pen's page chrome is left out: the author link, the grid backdrop, the fixed orientation button, the fixed theme button and their view transitions (the circular reveal between themes, and the `view-transition-name`s the pen's script put on every link and on the underline so the orientation change animated). The orientation is the `orientation` prop and changes at once (a page can wrap the state change in `document.startViewTransition`); the theme is the page's. The pen's own glyphs (the bear, the orientation arrow, the sun and moon) are all in that chrome, so the nav draws none and the component has icon set `none` (decision 0025 does not apply).
- **The current page.** Upstream marks the link the URL hash targets (`a:target`). The port keeps that and adds `aria-current` (`active` on `MagnetMenuLink`): the rules read `a:is([aria-current], :target)`, so a router can say which page is current without a hash. Upstream announced nothing; `active` sets `aria-current="page"`.
- **Scoped and renamed.** Every rule is under `.magnet-menu`; the anchor names `--anchor` and `--target` are per-instance (`useId`), so two menus on a page never share an anchor (the pill would otherwise jump to the last one in the tree); `--intent` and `--transition` are `--magnet-menu--intent` and `--magnet-menu--transition`. The root keeps the pen's `line-height: 1.15` (from normalize) and `isolation: isolate`, so the pill's `z-index: -1` stays inside the nav in any host; both change nothing in the pen's own page.
- **Colors through two tokens.** Upstream's `canvasText` and `canvas` are read through `--magnet-menu-ink` and `--magnet-menu-paper`, which fall back to them, so the pen's page renders as before; the items set them to black on white and white on black for the light and dark themes (`cssVars`), because the site's themes do not set `color-scheme`. The pill's color can be set alone with `--magnet-menu-indicator`.
- **Fonts and sizes come from the host.** The pen's body font stack (SF Pro first) is the page's; the nav inherits. The fidelity pages put the pen's stack on both sides.
- **`touch-action: none` is dropped.** The pen set it on the list; it would stop a swipe that starts on the menu from scrolling the page.
- **The focus ring is restated.** Upstream colored the browser's own ring (`outline-color`); the port also states its style, width and offset (Chromium's defaults for a link: `auto`, 1px, offset 1px, measured) so a host's global `:focus-visible` rule cannot restyle it (pitfall P-WEB1-B1-1).
- **The fallback is rewritten** (the pen's script, measured and ported by hand). Without anchor positioning the pen wrote each link's viewport box into custom properties from a generated stylesheet and positioned the pill `fixed`, so it drifted when the page scrolled. The port measures `offsetLeft`, `offsetTop`, `offsetWidth` and `offsetHeight` of the hovered or focused item and of the current one, relative to the list, and positions the pill and underline `absolute`; it re-measures on resize, on `hashchange` and when `aria-current` or the loop's `data-loop` changes, and the pill keeps its box while it fades out (the pen's "falloff"). The pen's `falloff` and `deactivate` handlers in the anchor path wrote a variable (`--item-active`) that no rule reads, so they are not ported.
- **Reduced motion, more contrast, forced colors** are added (the pen has none): transitions are off under `prefers-reduced-motion`; the label color is raised from 50% to 75% ink under `prefers-contrast: more` (the default 50% mix measures about 4.5:1 on white, upstream's value, kept); under forced colors the links use `LinkText` and the pill is a `Highlight` outline.
- **Primitives.** `magnet-menu-radix` and `magnet-menu-base` put the same markup on Radix `NavigationMenu` and Base UI `NavigationMenu`, which add arrow-key movement between the links (Radix also Home and End); the pill follows focus either way. They render the same pixels as the default item, with one more wrapper element in Radix's case (its list sits in a `position: relative` div). Radix writes its own `dir` on the root and the list; the port overrides both so a right-to-left page is not forced to left to right on the first paint, and reads the page's direction after mount for the arrow keys. There is no React Aria item: it has no navigation menu (its `Menu` is an actions menu, `Tabs` and `Breadcrumbs` are other patterns), and its `Link` would add nothing a native `a` lacks.
- **Names.** `MagnetMenu` and `MagnetMenuLink`; parts carry `data-slot`s (`magnet-menu`, `-list`, `-item`, `-link`).

## Enhancements (after fidelity)

- **Variants.** The default item (no primitive), `magnet-menu-radix` (Radix `NavigationMenu`) and `magnet-menu-base` (Base UI `NavigationMenu`), from the same stylesheet and fallback script; all three render the same pixels in every state above. There is no React Aria item (see Deviations) and no icon set.
- **Keyboard** (real key presses in Chromium, one run per item, left to right and right to left): every link is a Tab stop in all three items and the pill follows focus. In the default item arrow keys do nothing (it is a list of links). In the Radix item ArrowRight and ArrowLeft move to the next and previous link, ArrowDown and ArrowUp do as well, Home and End jump to the ends, and the keys mirror in right to left. In the Base UI item ArrowRight and ArrowLeft move between links and mirror in right to left once the component hands the page's direction to Base UI's provider (without it they did not: found with a real key press, fixed); Home, End and the vertical arrows do nothing in a horizontal menu.
- **Layout part.** `stage` is the header slot in a laptop frame: the demo is the header, so the gallery shows the menu in context. The wall tile loops hover over the links (`hover[1] → hover[3] → hover[2] → hover[5] → hover[4] → idle`, no JavaScript needed).
- **Tokens.** Component-prefixed only: `--magnet-menu-ink`, `--magnet-menu-paper` (set for light and dark in `cssVars`) and `--magnet-menu-indicator`. No shared token is defined.
- **Right to left.** The pill and underline are anchored to the links, so they follow the mirrored order with no change; the Radix and Base UI items map the arrow keys by the page's direction (above). The stylesheet uses no left or right inset except the underline's inset from its anchor (symmetric).
- **Reduced motion.** `transition: none` on the list, the pill and the underline under `prefers-reduced-motion: reduce` (checked in the e2e spec by the computed transition durations).
- **Contrast on request.** The labels are upstream's 50% mix of ink over paper: about 4.48:1 on white (just under 4.5:1) and about 4.69:1 on black; under `prefers-contrast: more` they use a 75% mix (about 11:1 on white). Forced colors: `LinkText` links and a `Highlight` outline for the pill.
- **Accessibility.** axe (WCAG 2.2 AA and best-practice tags, page-level rules off because the harness pages are bare) is clean on the harness pages for all three items at 1280x800 in light and dark, in right to left, at 375x812, and vertical: 20 pages. The built component page (`/ui/magnet-menu`, with every rule) runs in `e2e/magnet-menu.spec.ts`: light, dark and right to left. The demo's `div` replaces a `header` element, which axe reads as a second banner landmark next to the site's (`landmark-unique`), and the nav has no default name for the same reason.
- **Phone widths.** 320 and 375 px: no horizontal overflow on the page or inside the stage frame (e2e).
- **e2e.** `e2e/magnet-menu.spec.ts` (beta builds): axe in both schemes and right to left, the pill following keyboard focus and `aria-current` moving on click, reduced-motion durations, no overflow at 320 and 375, and the wall tile (the loop writes `data-loop` on one link at a time and never moves the page's focus into the frame). 8 tests, all passing on a beta build; the production build skips them.
