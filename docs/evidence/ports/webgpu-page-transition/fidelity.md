# webgpu-page-transition: fidelity

- Upstream: [bnpne/page-transitions-with-webgpu-vanilla-js `src`](https://github.com/bnpne/page-transitions-with-webgpu-vanilla-js/tree/70e5c0eafb14cd1fdf02aef0799ba486dead46dc/src) at `70e5c0eafb14cd1fdf02aef0799ba486dead46dc` (MIT, copyright 2009 - 2025 Codrops; S-263), on its lockfile's three.js 0.184.0, GSAP 3.15.0 (with SplitText) and Lenis 1.3.26
- Port: `ports/bnpne-webgpu-transitions/webgpu-page-transition`, exported to `content/components/bnpne-webgpu-transitions/webgpu-page-transition` (item `webgpu-page-transition`, primitive none, no icons), on the site's three.js 0.185.1 (S-275)
- Renderer: Chromium (Playwright S-014) with WebGPU on its SwiftShader adapter (`--enable-unsafe-webgpu`; the adapter reports google / swiftshader), device scale 1, 1280x800 and 375x812.
- Method: the upstream runs from its own Vite dev server with its five photos replaced by generated images of the same aspect ratios (the same files on both sides; the photos are not redistributable), its footer and cursor hidden; the port fills the same viewport with the same images, captions and facts. After the intro, time is frozen on the fake clock's 16 ms frame grid (S-240) and advanced frame by frame, with CSS transitions off on both sides (they run on the compositor clock). The script clicks the third image (carousel to detail), the carousel link, the index link and the carousel link again, capturing each transition at 160, 400 and 720 ms and at rest. Three references: the upstream as pinned (three.js 0.184.0), the same upstream with three.js 0.185.1 installed (the site's version, to separate the port's code from the three.js release), and a second load of the pinned upstream (noise floor). The port is measured on WebGPU and again forced to its WebGL 2 tier.
- Target: at most 0.1% differing pixels per matched frame (owner brief, S-157, S-260).

## Result: pixels that differ

Port on WebGPU (port against the pinned upstream / against the upstream on three.js 0.185.1; noise floor):

| Frame | 1280x800 | 375x812 |
| --- | --- | --- |
| carousel, at rest | 0.000% / 0.000%; 0.000% | 0.000% / 0.000%; 0.000% |
| to detail, 160 ms | 12.145% / 0.000%; 0.000% | 2.390% / 0.000%; 0.000% |
| to detail, 400 ms | 1.240% / 0.000%; 0.000% | 1.899% / 0.000%; 0.000% |
| to detail, 720 ms | 0.000% / 0.000%; 0.000% | 0.000% / 0.000%; 0.000% |
| detail, at rest | 0.000% / 0.000%; 0.000% | 0.000% / 0.000%; 0.000% |
| back to carousel, 400 ms | 9.992% / 0.000%; 0.000% | 2.789% / 0.005%; 0.000% |
| carousel, at rest | 0.000% / 0.000%; 0.000% | 0.000% / 0.000%; 0.000% |
| to index, 160 / 400 / 720 ms | 0.000% / 0.000%; 0.000% | 0.000% / 0.000%; 0.000% |
| index, at rest | 0.000% / 0.000%; 0.000% | 0.000% / 0.000%; 0.000% |
| back to carousel, 400 ms and at rest | 0.000% / 0.000%; 0.000% | 0.000% / 0.000%; 0.000% |

Port forced to WebGL 2, against the same references: identical to the WebGPU
numbers within 0.005% in every frame (worst against the upstream on three.js
0.185.1: 0.005%). SwiftShader draws the two backends alike.

Every frame at rest is 0.000% against the pinned upstream, and every frame is
within 0.005% of the upstream running on three.js 0.185.1. The frames where
planes are fading (opacity between 0 and 1) differ from the pinned upstream:
three.js 0.185 changed how transparent planes composite, and the upstream's
own code on 0.185.1 gives exactly the port's pixels (measured pixel by pixel on
a fading plane: 59, 78, 94, 111... on both, against 59, 80, 99, 117... on
0.184). The site pins three.js 0.185.1 for every three.js item (decision
0021), so the port ships on it.

Strips (carousel, detail at 400 ms, detail, index at 400 ms, index; 1280x800): [before.webp](before.webp) (pinned upstream), [after.webp](after.webp) (port, WebGPU), [diff.webp](diff.webp); [after-webgl2.webp](after-webgl2.webp) and [diff-webgl2.webp](diff-webgl2.webp) for the WebGL 2 tier (pixelmatch S-152; red marks a differing pixel).

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place.

- One component in its own box instead of a site: the canvas, the views and the navigation live inside it; `fixed` positions are relative to it and vw and vh are its width and height (`cqw`, `cqh`). Views switch through state (`view`, `defaultView`, `onViewChange`) instead of the History API, with buttons instead of links. The router, preloader, custom cursor and footer (with its links) are not ported.
- `gpu.js`, `carousel.js` and `IndexFloat` keep their code; the scene sizes to the component's box, takes the images as a prop and reports its backend; the wheel and pointer listeners are on the component.
- Every GSAP tween is a Motion animation with the same durations, delays, staggers and eases (morphs 0.9 s `power3.inOut`, fades 0.5 s `power2.out`/`in`, text 0.7 s `power3.out`...). SplitText is replaced by a split component that renders the same masked markup; the words or lines are aria-hidden with a visually hidden copy of the text, instead of SplitText's aria-label on a generic element (ARIA forbids it there).
- The upstream's intro leaves an inline `opacity: 1` on both navigation links (its `gsap.set`), so the inactive link is not dimmed; the port does the same after its intro.
- The inner view scrolls in its own container (Lenis on that container, `lerp: 0.09`, `syncTouch`) instead of the page.
- Rendering tiers: three.js's `WebGPURenderer` picks WebGPU, else WebGL 2 (also `forceWebGL`); without either, and under reduced motion, the images are DOM images in the slots (rounded corners), views crossfade or cut, and nothing tilts. The canvas runs through `render-loop` (`context: "none"`; `render` returns false until three.js has initialized; a failed initialization reports "unsupported"), so it pauses off screen and in hidden tabs with the pixel ratio capped at 2.
- Keyboard: the carousel images are buttons named by their captions; ArrowLeft and ArrowRight move the carousel one image (mirrored in right-to-left); the arrows spin the index float; the index view has a list of buttons (shown on focus) to open each image; the detail view's scroll area is focusable.
- Colours and the font are prefixed tokens with the upstream values as defaults (`--webgpu-page-transition-surface`, `-foreground`, `-font`), with a dark pair. Under `prefers-contrast: more` the dimmed text is full opacity.
