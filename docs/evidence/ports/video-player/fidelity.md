# Video Player: fidelity

- Upstream: grizzshutsdown/simpleplayer at `53935947011aacc739012a858238ba3495216c26`
  (MIT, Copyright (c) 2026 grizz), `src/player/*` (a custom element with a shadow root).
- Port: `ports/simpleplayer/video-player/` (React rewrite, variants shape), exported to
  `content/components/simpleplayer/video-player/` as `video-player` (upstream glyphs, the
  default), `video-player-icons-lucide` and `video-player-icons-phosphor`.
- Credits: S-404 (upstream), S-407 (brief), S-411 (FFmpeg, test media), S-152 and
  S-153 (pixelmatch, pngjs), S-014 (Playwright), S-015 (axe-core), S-290 (slider pattern),
  S-286 (IntersectionObserver).

## Method

- Upstream: its own demo (`dev/index.html` and `dev/main.ts`), served by its `dev` script
  (`vite dev dev`) on 127.0.0.1:5342. The demo's third-party sample video URL is blocked
  in the run (Playwright route abort, then a reload) and the player's `src` is set to the
  generated test video below, so both sides play the same file.
- Port: a Vite page in the pod's harness that renders the same document (the demo's
  `styles.css`, header, settings form wired to the props) with `<VideoPlayer id="player">`
  in place of `<simple-player id="player">`, with Tailwind (preflight included, as in an
  installing app) and the `video-player` item's files.
- Harness-only page fixes so the player box sits at the same position (pitfall P-023):
  `html { line-height: normal }`, `h1 { font-weight: bold }` and the browser's default
  checkbox margins, which preflight resets. Measured: the player box is
  160,139 960x540 at 1280x800 and 32,271.03 311x174.94 at 375x812 on both sides.
- Tool: `fidelity.mjs` (Playwright Chromium 156 headless, device scale 1, light scheme),
  screenshot of `#player` only, pixelmatch threshold 0.1, at 1280x800 and 375x812.
- State per frame (same hook on both sides): wait for the first frame, pause, seek to
  3.5 s and wait for `seeked`, wait 1.3 s (upstream's progress settle and estimate hold),
  then move the real mouse:
  - `hidden`: default demo settings (no tray, time on), pointer outside, controls hidden.
  - `shown`: pointer over the center: overlay, play button.
  - `scrubber`: pointer over the scrubber at 40 %: taller bar, hover fill, time tooltip.
  - `tray-shown`: the demo's "Controls tray" checkbox on, pointer over the center: control
    tray and pinned time.
  - `tray-scrubber`: tray on, pointer over the scrubber at 60 %: the pinned time shows the
    hovered time.
  - `tray-volume`: tray on, pointer over the mute button: the volume slider open.
- Noise floor: the same hook with upstream on both sides (`noise-scrubber`,
  `noise-tray-volume`).

## Results

| Frame | 1280x800 | 375x812 |
| --- | --- | --- |
| hidden | 0 px (0.0000 %) | 0 px (0.0000 %) |
| shown | 0 px (0.0000 %) | 0 px (0.0000 %) |
| scrubber | 0 px (0.0000 %) | 0 px (0.0000 %) |
| tray-shown | 0 px (0.0000 %) | 0 px (0.0000 %) |
| tray-scrubber | 0 px (0.0000 %) | 0 px (0.0000 %) |
| tray-volume | 0 px (0.0000 %) | 0 px (0.0000 %) |
| noise floor (upstream vs upstream, scrubber and tray-volume) | 0 px | 0 px |

Totals: 518,400 px per frame at 1280x800 (the 960x540 player) and 54,425 px at 375x812
(311x175). Files: `<frame>-<viewport>-{before,after,diff}.webp` (before is upstream) and
`fidelity.json`.

Before the harness fixes above, the first `hidden` frame differed by 2.03 % (1280) and
0.57 % then 6.38 % (375): the whole video sat a fraction of a pixel lower because preflight
changed the page's line height and checkbox margins above and below the player.

## Test media (no upstream media, font or logo shipped)

Upstream's demo streams a third-party sample video; its hosted site loads an SF Pro font
file and logos. None of them is used or shipped. The player's own text already uses the
system font stack (`system-ui, -apple-system, ...`) in upstream's stylesheet, and the dev
demo's page font is `Inter, ui-sans-serif, system-ui, ...` with no font file, so both sides
render the system font: no deviation was needed for fidelity.

The test video was generated with FFmpeg 8.1.2 (S-411) and is used by the fidelity run
and by the site demo (`public/demo-media/video-player/test-pattern.mp4`, 266,257 bytes,
SHA-256 `cd656e563ce6f633f71c5896cbc1d31acdba3db604066622eda6547722470f4b`):

```bash
ffmpeg -f lavfi -i "testsrc2=size=640x360:rate=24:duration=10" \
  -f lavfi -i "sine=frequency=440:sample_rate=44100:duration=10" \
  -c:v libx264 -profile:v main -pix_fmt yuv420p -preset veryslow -crf 36 -g 48 \
  -c:a aac -b:a 32k -ac 1 -movflags +faststart -shortest test-pattern.mp4
```

A 10 s, 640x360, 24 fps H.264 (Main) test pattern with a 440 Hz mono AAC tone. The demo's
captions file (`test-pattern.en.vtt`) is original text written for it.

## Deviations from upstream

Structure (behavior unchanged):

1. The custom element is a React component (`video-player.tsx`) that renders upstream's
   template as JSX, plus `VideoPlayerController` (`video-player-controller.ts`), upstream's
   `SimplePlayer` class kept line for line as a plain class: `connect()`, `disconnect()`
   and `update(options)` replace `connectedCallback`, `disconnectedCallback` and
   `attributeChangedCallback`, and the component calls them from effects. Options are
   props instead of attributes (`disable-autoplay` and its `no-` alias become
   `autoPlay={false}`, `controls`, `show-time` becomes `showTime`, `disable-volume` becomes
   `volume={false}`, and so on; the `enable-*`/`no-*` aliases are gone). The aspect ratio is
   a style on the root, `pause-on-overlay-click` a data attribute on it.
2. No shadow root: the root element takes the listeners that were on the host and the
   shadow root (focusin, focusout, fullscreenchange), focus is found with `contains()`
   instead of `shadowRoot.activeElement`, and `getFullscreenElement()` reads the document.
   The media session owner is a module variable instead of a static field.
3. Upstream's `constants`, `types`, `fullscreen`, `media` and `progress` modules are merged
   line for line into `video-player-media.ts`.
4. The stylesheet (`video-player-styles.ts`) is upstream's `styles.ts` line for line,
   rendered as a React 19 hoisted `<style href precedence>` (decision 0013). The `:host`
   rule's box (position, display, width, aspect ratio, isolation, overflow, contain and
   the `#1E1E1E` background) is Tailwind classes on the root so a `className` can override
   it; `*` box sizing is scoped to `.video-player`.
5. The volume slider (`role="slider"`, focusable) was inside the mute `<button>`, which is
   invalid nesting (axe `nested-interactive`; screen readers flatten a button's content).
   It now sits next to the button inside a `video-player-volume-slot` wrapper that has the
   button's slot box; the wrapper carries `hidden`, `is-volume-open`, the
   `data-video-player-volume-control` attribute and the hover listeners, and the CSS
   selectors that used `.sp-control-button:hover` also match `.video-player-volume-slot:hover`
   so hovering the open slider keeps the slot highlighted as before. Pixel-identical in the
   `tray-volume` frames.
6. The scrubber and the volume slider render initial `aria-valuemin/max/now/text`, so the
   server-rendered markup has the slider's required attributes before the controller sets
   them; the scrub time tooltip is `aria-hidden` (the slider's value text carries it); the
   volume slider has `aria-orientation="vertical"`.

Renames (collisions and de-branding; everything is global without a shadow root):

| Upstream | Port |
| --- | --- |
| classes, keyframes, data attributes `sp-*` | `video-player-*` (`.sp-player` is `.video-player-player`, the host is `.video-player`) |
| custom properties `--sp-*`, `--space`, `--white`, `--black`, `--white-rgb`, `--overlay-soft`, `--overlay-blur`, `--simple-player-aspect-ratio` | `--video-player--*` (private, defined on the root; the double dash marks them internal, the single-dash `--video-player-*` are the public tokens) |
| themable values (`--white`, `--overlay-soft`, `--overlay-blur`, `--sp-glass-*`, `--sp-control-glass-*`, `--sp-control-hover-surface`, `--sp-shimmer-highlight`, the `#1E1E1E` background) | read from public tokens `--video-player-foreground`, `-overlay`, `-overlay-blur`, `-glass-surface`, `-glass-opacity`, `-control-glass-surface`, `-control-glass-opacity`, `-control-hover-surface`, `-glass-filter`, `-shimmer-highlight`, `-background`, with upstream's values as fallbacks (cssVars, light and dark equal) |
| `SimplePlayer`, `styles`, `dataset.spControlIndex` | `VideoPlayer` / `VideoPlayerController`, `videoPlayerStyles`, `dataset.videoPlayerControlIndex` |
| `<simple-player>` | `<VideoPlayer>` |

Labs enhancements (none changes the default look; all frames above are 0 px):

7. Keyboard: the play button and the player itself get a `:focus-visible` ring (upstream
   set `outline: 0` with no replacement); a new `--video-player-focus-ring` token colors
   every ring. The volume slider opens while it has keyboard focus (upstream opened it on
   hover only, so a focused slider was invisible) and leaves the tab order when it cannot
   open. The elapsed/remaining time button is focusable (upstream `tabindex="-1"`) and
   named "Show remaining time" / "Show elapsed time". Upstream's shortcuts are kept as
   they are: Space, Enter, K and media keys on the player; arrows, Page Up/Down, Home/End
   on the scrubber; Up/Down, Home/End on the volume. Upstream has no M or F shortcut, so
   none was added.
8. Reduced motion: no autoplay (the play button starts the video), and every transition
   and animation inside the player is off (controls appear and hide instantly, no loading
   shimmer).
9. Contrast on request (ports/README.md policy): `prefers-contrast: more` makes the glass
   behind the time, the tray, the volume track and the scrubber opaque dark and the overlay
   darker; `forced-colors: active` draws the bars in Highlight on Canvas with a CanvasText
   edge. The default keeps upstream's translucent glass, whose contrast depends on the
   video beneath (not measurable in general).
10. Right to left: the control tray and the pinned time swap sides (logical insets), the
   tray's buttons and its hover highlight mirror, and the time texts stay left to right
   (`direction: ltr; unicode-bidi: isolate`, so "-0:08" does not reorder). The timeline,
   the scrub preview and the play glyph stay left to right, as in native players, so the
   right arrow still seeks forward. Evidence: `enhance-rtl-1280x800.webp`.
11. Icon-library style (`video-player-icons-lucide`, `-phosphor`): the same seven slots
   filled with Lucide `Play`, `Pause`, `Volume2`, `VolumeX`, `PictureInPicture2`,
   `Maximize2`, `Minimize2` (Phosphor `PlayIcon`, `PauseIcon`, `SpeakerHighIcon`,
   `SpeakerXIcon`, `PictureInPictureIcon`, `ArrowsOutSimpleIcon`, `ArrowsInSimpleIcon`).
   Three CSS rules fill the big play and pause icons and thin stroked control icons; they
   do not affect upstream's glyphs (their paths set fill and stroke themselves). Evidence:
   `enhance-icons-lucide-1280x800.webp`, `enhance-icons-phosphor-1280x800.webp` (Phosphor's
   regular weight draws an outlined play icon).
12. `children` (`<track>` elements) pass through to the `<video>`; `videoRef` exposes it.

## Primitive

Primitive `none`. The scrubber and the volume control are sliders, but upstream draws
them with its own pointer logic (a 240 ms long-press before scrubbing, a 4 px drag
threshold, a return marker with snapping, hover preview, pointer capture, vertical volume
from the pointer's y) and its own DOM; a Radix, Base UI or React Aria slider would replace
that logic and markup and change both the pixels and the feel. Both keep the WAI-ARIA
slider pattern (S-290): `role="slider"`, a name, `aria-valuemin/max/now`, a time or
percent `aria-valuetext`, and the arrow, Page and Home/End keys. Every other control is a
native button, which a primitive would only wrap.

## Other checks

- axe (light and dark, `ltr` and `rtl`, 1280x800 and 375x812, all three variants, tray on,
  captions track, controls revealed by focus): 0 violations. The hidden tray is scaled to
  0.96, so a scan while it is hidden reads its 24 px buttons as 23 px (`target-size`); the
  visible buttons are exactly 24x24 px.
- Behavior (Playwright): muted autoplay; Space and K toggle playback and the button's name;
  focusing a control reveals the controls; Tab order: play, scrubber, time, mute, volume,
  Picture-in-Picture, fullscreen; arrow seeks with "m:ss of m:ss" value text; volume keys;
  mute toggle names; drag scrubbing commits; reduced motion leaves the video paused with
  0 s transitions; no horizontal overflow at 320, 375 and 1280 px in both directions; no
  console errors or warnings under React StrictMode.
- Wall loop (demo inside `[data-specimen]`): controls shown, then hover preview at 30 %
  and 70 % (the pinned time follows), then hidden, repeating every 6 s; the video never
  plays; with `data-loop-paused` the demo skips its steps. Outside the wall the demo runs
  no script.
