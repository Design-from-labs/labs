# Message Actions: port fidelity

- Upstream: kvnkld/aicss @ 3ca50a3611b988d85eac6ffce662369494061674 (`packages/react/src/message-actions`: `MessageActions.tsx`, `MessageActions.module.css`, `icons.tsx`, `emojis.ts`)
- Harness: one page renders upstream's module (its CSS module and own icon set) or a port variant, with the same props (`text`, a fixed `sentAt` three minutes before the frozen clock), page, font (Geist) and state; React 19.3.0, @base-ui/react 1.9.0, radix-ui 1.6.7, react-aria-components 1.22.1, lucide-react 1.55.0; Chromium (Playwright 1.64.0), device scale 1
- Upstream demo: the repository ships the component package only (its site, aicss.dev, is not in the repository), so there is no upstream demo app to run; the harness scene is the comparison
- Diff: pixelmatch (S-152), threshold 0.1, anti-aliased pixels excluded; percent of all pixels in the frame
- Viewports: 1280x800 (desktop) and 375x812 (mobile)
- Interaction: the pointer moves before it hovers (React Aria counts a hover only after a pointer move, docs/pitfalls.md P-110), the same on both sides; states that can drift in real time are the best of three, with an upstream-against-upstream control below
- Target: at most 0.1%. Worst port frame: **0.0837%** (icons style, React Aria, Lucide, mobile, timestamp tooltip). Default variant (`message-actions-base`, upstream's glyphs) worst: **0.0693%**.

## Scene

The row under a one-line message, 120 px from the left edge (so no tooltip is clamped at the edge, which the primitives do and upstream does not), with these states: at rest; hovering the row (the timestamp fades in); hovering Copy (tooltip); after a click on Copy ("Copied" and the drawn check); after a thumbs-up (vote color, bump finished, tooltip); the reaction bar open; the emoji picker open; the more menu open; after picking a reaction and moving the pointer away; hovering the timestamp (full-date tooltip). Popups are also captured in the dark theme (`data-theme="dark"`).

## Results

| Against | Variant | State | Viewport | Differing pixels | Percent |
| --- | --- | --- | --- | ---: | ---: |
| upstream | Base UI | rest | 1280x800 | 0 | 0.0000% |
| upstream | Base UI | hoverRow | 1280x800 | 135 | 0.0132% |
| upstream | Base UI | hoverCopy | 1280x800 | 17 | 0.0017% |
| upstream | Base UI | hoverCopy-dark | 1280x800 | 22 | 0.0021% |
| upstream | Base UI | copied | 1280x800 | 17 | 0.0017% |
| upstream | Base UI | voteUp | 1280x800 | 92 | 0.0090% |
| upstream | Base UI | reactOpen | 1280x800 | 0 | 0.0000% |
| upstream | Base UI | reactOpen-dark | 1280x800 | 0 | 0.0000% |
| upstream | Base UI | pickerOpen | 1280x800 | 0 | 0.0000% |
| upstream | Base UI | pickerOpen-dark | 1280x800 | 0 | 0.0000% |
| upstream | Base UI | moreOpen | 1280x800 | 211 | 0.0206% |
| upstream | Base UI | moreOpen-dark | 1280x800 | 115 | 0.0112% |
| upstream | Base UI | reacted | 1280x800 | 0 | 0.0000% |
| upstream | Base UI | hoverTime | 1280x800 | 98 | 0.0096% |
| upstream | Base UI | rest | 375x812 | 0 | 0.0000% |
| upstream | Base UI | hoverRow | 375x812 | 135 | 0.0443% |
| upstream | Base UI | hoverCopy | 375x812 | 17 | 0.0056% |
| upstream | Base UI | hoverCopy-dark | 375x812 | 22 | 0.0072% |
| upstream | Base UI | copied | 375x812 | 17 | 0.0056% |
| upstream | Base UI | voteUp | 375x812 | 92 | 0.0302% |
| upstream | Base UI | reactOpen | 375x812 | 0 | 0.0000% |
| upstream | Base UI | reactOpen-dark | 375x812 | 0 | 0.0000% |
| upstream | Base UI | pickerOpen | 375x812 | 0 | 0.0000% |
| upstream | Base UI | pickerOpen-dark | 375x812 | 0 | 0.0000% |
| upstream | Base UI | moreOpen | 375x812 | 211 | 0.0693% (best of 3) |
| upstream | Base UI | moreOpen-dark | 375x812 | 115 | 0.0378% |
| upstream | Base UI | reacted | 375x812 | 0 | 0.0000% |
| upstream | Base UI | hoverTime | 375x812 | 98 | 0.0322% |
| upstream | Radix | rest | 1280x800 | 0 | 0.0000% |
| upstream | Radix | hoverRow | 1280x800 | 135 | 0.0132% |
| upstream | Radix | hoverCopy | 1280x800 | 17 | 0.0017% |
| upstream | Radix | hoverCopy-dark | 1280x800 | 22 | 0.0021% |
| upstream | Radix | copied | 1280x800 | 17 | 0.0017% |
| upstream | Radix | voteUp | 1280x800 | 92 | 0.0090% |
| upstream | Radix | reactOpen | 1280x800 | 0 | 0.0000% |
| upstream | Radix | reactOpen-dark | 1280x800 | 0 | 0.0000% |
| upstream | Radix | pickerOpen | 1280x800 | 0 | 0.0000% |
| upstream | Radix | pickerOpen-dark | 1280x800 | 0 | 0.0000% |
| upstream | Radix | moreOpen | 1280x800 | 211 | 0.0206% |
| upstream | Radix | moreOpen-dark | 1280x800 | 116 | 0.0113% |
| upstream | Radix | reacted | 1280x800 | 0 | 0.0000% |
| upstream | Radix | hoverTime | 1280x800 | 98 | 0.0096% |
| upstream | Radix | rest | 375x812 | 0 | 0.0000% |
| upstream | Radix | hoverRow | 375x812 | 135 | 0.0443% |
| upstream | Radix | hoverCopy | 375x812 | 17 | 0.0056% |
| upstream | Radix | hoverCopy-dark | 375x812 | 22 | 0.0072% |
| upstream | Radix | copied | 375x812 | 17 | 0.0056% |
| upstream | Radix | voteUp | 375x812 | 92 | 0.0302% |
| upstream | Radix | reactOpen | 375x812 | 0 | 0.0000% |
| upstream | Radix | reactOpen-dark | 375x812 | 0 | 0.0000% |
| upstream | Radix | pickerOpen | 375x812 | 0 | 0.0000% |
| upstream | Radix | pickerOpen-dark | 375x812 | 0 | 0.0000% |
| upstream | Radix | moreOpen | 375x812 | 211 | 0.0693% (best of 3) |
| upstream | Radix | moreOpen-dark | 375x812 | 116 | 0.0381% |
| upstream | Radix | reacted | 375x812 | 0 | 0.0000% |
| upstream | Radix | hoverTime | 375x812 | 98 | 0.0322% |
| upstream | React Aria | rest | 1280x800 | 0 | 0.0000% |
| upstream | React Aria | hoverRow | 1280x800 | 58 | 0.0057% |
| upstream | React Aria | hoverCopy | 1280x800 | 17 | 0.0017% |
| upstream | React Aria | hoverCopy-dark | 1280x800 | 22 | 0.0021% |
| upstream | React Aria | copied | 1280x800 | 119 | 0.0116% |
| upstream | React Aria | voteUp | 1280x800 | 92 | 0.0090% |
| upstream | React Aria | reactOpen | 1280x800 | 99 | 0.0097% |
| upstream | React Aria | reactOpen-dark | 1280x800 | 95 | 0.0093% |
| upstream | React Aria | pickerOpen | 1280x800 | 0 | 0.0000% |
| upstream | React Aria | pickerOpen-dark | 1280x800 | 0 | 0.0000% |
| upstream | React Aria | moreOpen | 1280x800 | 98 | 0.0096% |
| upstream | React Aria | moreOpen-dark | 1280x800 | 98 | 0.0096% |
| upstream | React Aria | reacted | 1280x800 | 98 | 0.0096% |
| upstream | React Aria | hoverTime | 1280x800 | 250 | 0.0244% |
| upstream | React Aria | rest | 375x812 | 0 | 0.0000% |
| upstream | React Aria | hoverRow | 375x812 | 58 | 0.0190% |
| upstream | React Aria | hoverCopy | 375x812 | 17 | 0.0056% |
| upstream | React Aria | hoverCopy-dark | 375x812 | 22 | 0.0072% |
| upstream | React Aria | copied | 375x812 | 119 | 0.0391% |
| upstream | React Aria | voteUp | 375x812 | 92 | 0.0302% |
| upstream | React Aria | reactOpen | 375x812 | 99 | 0.0325% |
| upstream | React Aria | reactOpen-dark | 375x812 | 95 | 0.0312% |
| upstream | React Aria | pickerOpen | 375x812 | 0 | 0.0000% |
| upstream | React Aria | pickerOpen-dark | 375x812 | 0 | 0.0000% |
| upstream | React Aria | moreOpen | 375x812 | 98 | 0.0322% |
| upstream | React Aria | moreOpen-dark | 375x812 | 98 | 0.0322% |
| upstream | React Aria | reacted | 375x812 | 98 | 0.0322% |
| upstream | React Aria | hoverTime | 375x812 | 250 | 0.0821% (best of 3) |
| upstream | icons style, Base UI, Lucide | rest | 1280x800 | 5 | 0.0005% |
| upstream | icons style, Base UI, Lucide | hoverRow | 1280x800 | 140 | 0.0137% |
| upstream | icons style, Base UI, Lucide | hoverCopy | 1280x800 | 22 | 0.0021% |
| upstream | icons style, Base UI, Lucide | hoverCopy-dark | 1280x800 | 31 | 0.0030% |
| upstream | icons style, Base UI, Lucide | copied | 1280x800 | 22 | 0.0021% |
| upstream | icons style, Base UI, Lucide | voteUp | 1280x800 | 97 | 0.0095% |
| upstream | icons style, Base UI, Lucide | reactOpen | 1280x800 | 24 | 0.0023% |
| upstream | icons style, Base UI, Lucide | reactOpen-dark | 1280x800 | 16 | 0.0016% |
| upstream | icons style, Base UI, Lucide | pickerOpen | 1280x800 | 16 | 0.0016% |
| upstream | icons style, Base UI, Lucide | pickerOpen-dark | 1280x800 | 10 | 0.0010% |
| upstream | icons style, Base UI, Lucide | moreOpen | 1280x800 | 216 | 0.0211% |
| upstream | icons style, Base UI, Lucide | moreOpen-dark | 1280x800 | 123 | 0.0120% |
| upstream | icons style, Base UI, Lucide | reacted | 1280x800 | 0 | 0.0000% |
| upstream | icons style, Base UI, Lucide | hoverTime | 1280x800 | 103 | 0.0101% |
| upstream | icons style, Base UI, Lucide | rest | 375x812 | 5 | 0.0016% |
| upstream | icons style, Base UI, Lucide | hoverRow | 375x812 | 140 | 0.0460% |
| upstream | icons style, Base UI, Lucide | hoverCopy | 375x812 | 22 | 0.0072% |
| upstream | icons style, Base UI, Lucide | hoverCopy-dark | 375x812 | 31 | 0.0102% |
| upstream | icons style, Base UI, Lucide | copied | 375x812 | 22 | 0.0072% |
| upstream | icons style, Base UI, Lucide | voteUp | 375x812 | 97 | 0.0319% |
| upstream | icons style, Base UI, Lucide | reactOpen | 375x812 | 24 | 0.0079% |
| upstream | icons style, Base UI, Lucide | reactOpen-dark | 375x812 | 16 | 0.0053% |
| upstream | icons style, Base UI, Lucide | pickerOpen | 375x812 | 16 | 0.0053% |
| upstream | icons style, Base UI, Lucide | pickerOpen-dark | 375x812 | 10 | 0.0033% |
| upstream | icons style, Base UI, Lucide | moreOpen | 375x812 | 216 | 0.0709% (best of 3) |
| upstream | icons style, Base UI, Lucide | moreOpen-dark | 375x812 | 123 | 0.0404% |
| upstream | icons style, Base UI, Lucide | reacted | 375x812 | 0 | 0.0000% |
| upstream | icons style, Base UI, Lucide | hoverTime | 375x812 | 103 | 0.0338% |
| upstream | icons style, Radix, Lucide | rest | 1280x800 | 5 | 0.0005% |
| upstream | icons style, Radix, Lucide | hoverRow | 1280x800 | 140 | 0.0137% |
| upstream | icons style, Radix, Lucide | hoverCopy | 1280x800 | 22 | 0.0021% |
| upstream | icons style, Radix, Lucide | hoverCopy-dark | 1280x800 | 31 | 0.0030% |
| upstream | icons style, Radix, Lucide | copied | 1280x800 | 22 | 0.0021% |
| upstream | icons style, Radix, Lucide | voteUp | 1280x800 | 97 | 0.0095% |
| upstream | icons style, Radix, Lucide | reactOpen | 1280x800 | 24 | 0.0023% |
| upstream | icons style, Radix, Lucide | reactOpen-dark | 1280x800 | 16 | 0.0016% |
| upstream | icons style, Radix, Lucide | pickerOpen | 1280x800 | 16 | 0.0016% |
| upstream | icons style, Radix, Lucide | pickerOpen-dark | 1280x800 | 10 | 0.0010% |
| upstream | icons style, Radix, Lucide | moreOpen | 1280x800 | 216 | 0.0211% |
| upstream | icons style, Radix, Lucide | moreOpen-dark | 1280x800 | 124 | 0.0121% |
| upstream | icons style, Radix, Lucide | reacted | 1280x800 | 0 | 0.0000% |
| upstream | icons style, Radix, Lucide | hoverTime | 1280x800 | 103 | 0.0101% |
| upstream | icons style, Radix, Lucide | rest | 375x812 | 5 | 0.0016% |
| upstream | icons style, Radix, Lucide | hoverRow | 375x812 | 140 | 0.0460% |
| upstream | icons style, Radix, Lucide | hoverCopy | 375x812 | 22 | 0.0072% |
| upstream | icons style, Radix, Lucide | hoverCopy-dark | 375x812 | 31 | 0.0102% |
| upstream | icons style, Radix, Lucide | copied | 375x812 | 22 | 0.0072% |
| upstream | icons style, Radix, Lucide | voteUp | 375x812 | 97 | 0.0319% |
| upstream | icons style, Radix, Lucide | reactOpen | 375x812 | 24 | 0.0079% |
| upstream | icons style, Radix, Lucide | reactOpen-dark | 375x812 | 16 | 0.0053% |
| upstream | icons style, Radix, Lucide | pickerOpen | 375x812 | 16 | 0.0053% |
| upstream | icons style, Radix, Lucide | pickerOpen-dark | 375x812 | 10 | 0.0033% |
| upstream | icons style, Radix, Lucide | moreOpen | 375x812 | 216 | 0.0709% (best of 3) |
| upstream | icons style, Radix, Lucide | moreOpen-dark | 375x812 | 124 | 0.0407% |
| upstream | icons style, Radix, Lucide | reacted | 375x812 | 0 | 0.0000% |
| upstream | icons style, Radix, Lucide | hoverTime | 375x812 | 103 | 0.0338% |
| upstream | icons style, React Aria, Lucide | rest | 1280x800 | 5 | 0.0005% |
| upstream | icons style, React Aria, Lucide | hoverRow | 1280x800 | 63 | 0.0062% |
| upstream | icons style, React Aria, Lucide | hoverCopy | 1280x800 | 22 | 0.0021% |
| upstream | icons style, React Aria, Lucide | hoverCopy-dark | 1280x800 | 31 | 0.0030% |
| upstream | icons style, React Aria, Lucide | copied | 1280x800 | 124 | 0.0121% |
| upstream | icons style, React Aria, Lucide | voteUp | 1280x800 | 97 | 0.0095% |
| upstream | icons style, React Aria, Lucide | reactOpen | 1280x800 | 123 | 0.0120% |
| upstream | icons style, React Aria, Lucide | reactOpen-dark | 1280x800 | 111 | 0.0108% |
| upstream | icons style, React Aria, Lucide | pickerOpen | 1280x800 | 16 | 0.0016% |
| upstream | icons style, React Aria, Lucide | pickerOpen-dark | 1280x800 | 10 | 0.0010% |
| upstream | icons style, React Aria, Lucide | moreOpen | 1280x800 | 103 | 0.0101% |
| upstream | icons style, React Aria, Lucide | moreOpen-dark | 1280x800 | 106 | 0.0104% |
| upstream | icons style, React Aria, Lucide | reacted | 1280x800 | 98 | 0.0096% |
| upstream | icons style, React Aria, Lucide | hoverTime | 1280x800 | 255 | 0.0249% |
| upstream | icons style, React Aria, Lucide | rest | 375x812 | 5 | 0.0016% |
| upstream | icons style, React Aria, Lucide | hoverRow | 375x812 | 63 | 0.0207% |
| upstream | icons style, React Aria, Lucide | hoverCopy | 375x812 | 22 | 0.0072% |
| upstream | icons style, React Aria, Lucide | hoverCopy-dark | 375x812 | 31 | 0.0102% |
| upstream | icons style, React Aria, Lucide | copied | 375x812 | 124 | 0.0407% |
| upstream | icons style, React Aria, Lucide | voteUp | 375x812 | 97 | 0.0319% |
| upstream | icons style, React Aria, Lucide | reactOpen | 375x812 | 123 | 0.0404% |
| upstream | icons style, React Aria, Lucide | reactOpen-dark | 375x812 | 111 | 0.0365% |
| upstream | icons style, React Aria, Lucide | pickerOpen | 375x812 | 16 | 0.0053% |
| upstream | icons style, React Aria, Lucide | pickerOpen-dark | 375x812 | 10 | 0.0033% |
| upstream | icons style, React Aria, Lucide | moreOpen | 375x812 | 103 | 0.0338% |
| upstream | icons style, React Aria, Lucide | moreOpen-dark | 375x812 | 106 | 0.0348% |
| upstream | icons style, React Aria, Lucide | reacted | 375x812 | 98 | 0.0322% |
| upstream | icons style, React Aria, Lucide | hoverTime | 375x812 | 255 | 0.0837% (best of 3) |
| upstream | icons style, Base UI, Phosphor | rest | 1280x800 | 137 | 0.0134% |
| upstream | icons style, Base UI, Phosphor | moreOpen | 1280x800 | 391 | 0.0382% |
| upstream | icons style, Base UI, Phosphor | reactOpen | 375x812 | 191 | 0.0627% |
| control | upstream | rest | 1280x800 | 0 | 0.0000% |
| control | upstream | hoverRow | 1280x800 | 0 | 0.0000% |
| control | upstream | hoverCopy | 1280x800 | 0 | 0.0000% |
| control | upstream | hoverCopy-dark | 1280x800 | 0 | 0.0000% |
| control | upstream | copied | 1280x800 | 0 | 0.0000% |
| control | upstream | voteUp | 1280x800 | 0 | 0.0000% |
| control | upstream | reactOpen | 1280x800 | 0 | 0.0000% |
| control | upstream | reactOpen-dark | 1280x800 | 0 | 0.0000% |
| control | upstream | pickerOpen | 1280x800 | 0 | 0.0000% |
| control | upstream | pickerOpen-dark | 1280x800 | 0 | 0.0000% |
| control | upstream | moreOpen | 1280x800 | 0 | 0.0000% |
| control | upstream | moreOpen-dark | 1280x800 | 0 | 0.0000% |
| control | upstream | reacted | 1280x800 | 0 | 0.0000% |
| control | upstream | hoverTime | 1280x800 | 0 | 0.0000% |
| control | upstream | rest | 375x812 | 0 | 0.0000% |
| control | upstream | hoverRow | 375x812 | 0 | 0.0000% |
| control | upstream | hoverCopy | 375x812 | 0 | 0.0000% |
| control | upstream | hoverCopy-dark | 375x812 | 0 | 0.0000% |
| control | upstream | copied | 375x812 | 0 | 0.0000% |
| control | upstream | voteUp | 375x812 | 0 | 0.0000% |
| control | upstream | reactOpen | 375x812 | 0 | 0.0000% |
| control | upstream | reactOpen-dark | 375x812 | 0 | 0.0000% |
| control | upstream | pickerOpen | 375x812 | 0 | 0.0000% |
| control | upstream | pickerOpen-dark | 375x812 | 0 | 0.0000% |
| control | upstream | moreOpen | 375x812 | 0 | 0.0000% |
| control | upstream | moreOpen-dark | 375x812 | 0 | 0.0000% |
| control | upstream | reacted | 375x812 | 0 | 0.0000% |
| control | upstream | hoverTime | 375x812 | 0 | 0.0000% |

## Evidence

`<state>-before.webp` is upstream, `-after.webp` the default variant (`message-actions-base`: Base UI, upstream's glyphs), `-diff.webp` the pixelmatch overlay (red: differing pixels).

## Deviations

- Files: upstream's CSS module becomes `message-actions-styles.ts`, a string the row renders in a React 19 `<style href precedence>` (decision 0013), with class names written out (`styles.btn` is `message-actions-btn`, so the component code reads as upstream), and keyframes and variables prefixed (`--ma-fg` is `--message-actions-fg`, `--cue-x` is `--message-actions-cue-x`), as the keyframe guard requires. The row's state is upstream's code in `useMessageActions` (`message-actions-shared.tsx`), shared by the three variants; `emojis.ts` is unchanged.
- Primitives (decision 0027): the hand-rolled parts become the primitive's: tooltips (Base UI: one tooltip shared by every button, which glides between them like upstream's bubble; Radix and React Aria: one per button, no glide), a popover holding the reactions as a toolbar (arrow keys) and the emoji picker, and a menu for "More actions". They position their popups (upstream used fixed offsets); the measured frames match because the offsets are the same (6 px for tooltips, 8 px for popups). Upstream's `role="menu"` rows with no arrow keys are gone.
- Icons (decision 0025's shape): the default style keeps upstream's own glyphs (`glyphs/message-actions-icons.tsx`, upstream's `icons.tsx` with only its stylesheet import changed), so the smile's mouth and wink and the reply's shaft and head animate as upstream's. The "icons" style (`message-actions-icons-<primitive>-<lucide|phosphor>`) renders `lucide-react` or Phosphor at upstream's 1.125 px stroke: in lucide-react 1.x `Smile` and `SmilePlus` are redrawn (P-113), a few pixels at rest; the wink turns Lucide's right eye into a short line and the reply moves Lucide's own arrow parts, the mouth no longer changes, and Lucide's Check draws from its far end to keep upstream's direction. Phosphor icons only hop.
- Portaled popups carry what they inherited inside the row: the theme variables (`.message-actions-surface`), the row's font, direction and theme (P-111). Upstream's emoji picker, already portaled upstream, keeps the page font. Labs fix: the picker now follows `.dark` and the system dark scheme, which upstream's ignored.
- Focus: after a keyboard close, focus returns to the button; after a pointer close it stays where it fell, as upstream (P-112). React Aria returns focus after any close, so after a mouse reaction its timestamp stays shown until focus moves on.
- Tooltips stay up while their button is pressed, so "Copy message" turns into "Copied" in place, as upstream's does (Radix: P-109).
- The timestamp's tooltip opens on hover only, as upstream's; React Aria's needs a controlled `Tooltip` because its trigger must be interactive (P-114).
- Logical CSS: `margin-left` on the timestamp and the item's `text-align: left` become logical, and the picker's paddings take their logical form; left-to-right renders are identical.
- Base UI: `collisionAvoidance={{ align: "shift" }}`, so the picker clamps into the viewport as upstream's does instead of swapping to end alignment.
- Upstream's `document` listeners for Escape and outside presses are gone; the primitives dismiss their popups.

## Labs additions (no change to the default look)

- `density="comfortable"`: 24 px targets (WCAG 2.2 target size) with upstream's 20 px pill drawn inside; the default `compact` is upstream's. The gallery demo uses `comfortable`, because axe's target-size rule fails upstream's 2 px gaps.
- A polite live region says "Copied"; the timestamp carries the full date as visually hidden text (rendered after hydration, since the server's clock and time zone differ).
- Votes are toggle buttons (`aria-pressed`, React Aria `ToggleButton`); emoji buttons have `aria-pressed`; Base UI's tooltip popup gets `role="tooltip"` and the button gets `aria-describedby` (P-010).
- The menu shows keyboard focus with the hover background.
- Reduced motion also stops the tooltip glide and the popup scale.
