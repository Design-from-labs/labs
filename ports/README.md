# Ported components (authoring sources)

Third-party components rewritten in this repository from a pinned upstream
commit (decision [0016](../docs/decisions/0016-ported-component-sources.md)).
Each source is an `in-repo` entry of the `oss` section of
[`sources.yaml`](../sources.yaml), which holds its repository, commit,
author, license, attribution and credit.

```text
ports/<source-id>/
  LICENSE                   the upstream license, verbatim
  NOTICE                    the upstream NOTICE, verbatim, when it has one
  <component>/
    component.json          sidecar fields, files and their registry types,
                            dependencies, docs, demo, optional stage
    <files>                 the port (Lucide icons where it renders icons)
    demo.tsx                the gallery demo
ports/icons.json            Lucide -> Phosphor names for the -phosphor items
```

`pnpm ports` exports them in the canonical format to
`content/components/<source-id>/<component>/` (items, `meta.json`, demo;
the preview is kept), appending the upstream attribution and license to every
file. `pnpm ports:check` (CI) fails when the export is stale. Everything
downstream reads only the exported files.

Merged upstream modules keep their lines; each starts with a
`// ---- upstream: <path> ----` marker, and every change from upstream is
listed under Deviations in `docs/evidence/ports/<component>/fidelity.md`.
Verbatim upstream files are excluded from Biome so they stay diffable.

## Contrast policy: fidelity default, contrast on request

When an upstream's default palette fails WCAG AA contrast (for example faint
secondary labels), the port keeps the upstream colors as the default, so the
fidelity diff still passes, and lifts them only on request:

- under `@media (prefers-contrast: more)`, to at least 4.5:1 for text (3:1
  for large text and non-text marks);
- under `@media (forced-colors: active)`, by deferring to system colors
  (`CanvasText`, `ButtonText`, `Highlight`) and replacing any cue that only
  color carried (for example underline a selected tab whose indicator
  disappears);
- expose the colors as component-prefixed tokens, so an app can raise them for
  everyone, and say so in `docs`.

Record it in the component's `a11y` notes and as a known deviation in its
`fidelity.md`, with the measured default ratios. A port may raise a default
only when the change stays within the 0.1% fidelity budget, and records that
too. Decided by the owner for Liveline and Lifeline; it applies to every port
without asking.

## The variants shape (primitives and nested files)

A port with a headless primitive, or too many upstream modules to merge into
a few flat files, uses the variants shape instead of `files` (decision
[0017](../docs/decisions/0017-port-variants-and-nested-targets.md)):

```text
ports/<source-id>/<component>/
  component.json      ... plus `variants`, `target`, optional `icons.json`
  src/shared/...      primitive-agnostic files (upstream layout kept)
  src/radix/...       files that differ per primitive, overlaid by path
  src/base/... src/aria/...
```

| Field | Meaning |
| --- | --- |
| `variants[]` | `{ primitive, roots, exclude?, dependencies?, registryDependencies?, status, style?, label?, iconSets? }`: one item per primitive and icon set; later `roots` override earlier ones file by file. A `style` (with a switcher `label`) names a non-default style, and a variant's own `iconSets` override the component's, so one style can draw its own glyphs (icon set none) while another uses an icon library (decision 0025) |
| `target` | install root, such as `components/data-table`; each file keeps its path below it |
| `registryDependencies` | `{primitive}` and `{iconSet}` are substituted, so `@designfrom/data-table-{primitive}-{iconSet}` follows the variant |
| `icons.json` | per-component Lucide to Phosphor names, merged over `ports/icons.json`; type imports (`LucideIcon`) map too |
| `demo` | a path, or a map keyed by variant or primitive |
| `sourcePath` | the upstream path shown as `source.path` (same as `upstreamPath`) |
| `licenseFile` | either shape: the one file that carries the full license text and upstream NOTICE; the others get a short notice pointing to it (decision 0029) |
| `changeNotice` | either shape: a sentence appended to every file's footer saying the files were modified (Apache-2.0, section 4(b)) |

`src/` is upstream code kept line for line, so Biome skips `ports/*/*/src`.
Nested files cannot be promoted to `ready` until the npm library keeps target
paths (pitfall P-044); until then they are reviewed on preview deployments.

| Source | Component | Upstream |
| --- | --- | --- |
| `torph` | `text-morph` | lochie/torph, `packages/torph/src` (core and React adapter) |
| `goey-toast` | `gooey-toast` | anl331/goey-toast, `src` |
| `tegaki` | `handwriting` | gkurt/tegaki, a wrapper over npm `tegaki` |
| `peckz-playground` | `dot-morph` | peckz/playground, `src/app/chrome-morph` (renamed, logo removed) |
| `liveline` | `liveline` | benjitaylor/liveline, `src` (variants shape, nested) |
| `lifeline` | `lifeline` | evilrabbit/lifeline, `components/lifeline` (variants shape) |
| `thiings-grid` | `thiings-grid` | charlieclark/thiings-grid, `lib/ThiingsGrid.tsx` |
| `data-table-filters` | `data-table`, `data-table-filter-command`, `data-table-sheet` | openstatusHQ/data-table-filters, `packages/registry` (variants shape, primitives) |
| `tableofcontent` | `table-of-contents` | batuhankarasakal/tableofcontent, `src` (React rewrite) |
| `guide-frame` | `guideframe-grid` | Dinil-Thilakarathne/guide-frame, `packages/core` and `packages/react` |
| `samasante-liquid-glass` | `glass` | samasante/liquid-glass, `src` |
| `jal-co-holosticker` | `holo-sticker` | jal-co/holosticker, `src/lib/three-renderer.ts` (renderer only) |
| `dmitrykurash-holocloth` | `holo-foil` | dmitrykurash/holocloth, `src/holoMaterial.ts` (material only, no cloth) |
| `obta1ner-lenticular` | `lenticular` | obta1ner/lenticular, `index.html` (rewritten as React) |
| `mark-x64-ribbon-shader` | `iridescent-ribbon` | mark-x64/siri-ribbon-shader, `src/ribbon.frag` (renamed, no branding) |
| `haaarshsingh-halftone-dots` | `dot-halftone` | haaarshsingh/halftone-dots, `src/DotHalftone.tsx` (render-loop, sample art replaced) |
| `shpigford-dither` | `vector-dither` | Shpigford/dither, `packages/core` (merged core plus a React SVG wrapper; presets renamed) |
| `shuding-cobe` | `globe` | shuding/cobe, a wrapper over npm `cobe` (render-loop, tokens, drag and keys) |
| `yousuf-viscose-carousel` | `viscose-carousel` | Yousuf-developer/Viscose-carousel, `components/Carousel.jsx` and `components/ring` (GSAP rewritten with Motion) |

| `joshpuckett-stepper` | `stepper` | Josh Puckett's fluid stepper, `packages/*/src` (core, React adapter, stylesheet; the package name is not written here, the guard matches it) |
| `magic-spells-bottom-sheet` | `bottom-sheet` | magic-spells/bottom-sheet `src` with dialog-panel and physics-engine (web components rewritten as React; variants shape, primitives) |
| `driver-js` | `product-tour` | nilbuild/driver.js 1.9.0 (a wrapper over npm `driver.js`, its stylesheet adapted) |
| `simpleplayer` | `video-player` | grizzshutsdown/simpleplayer, `src/player` (web component rewritten as React; variants shape, an `icons` style) |
| `cloudflare-kumo` | `flow-diagram` | cloudflare/kumo, `packages/kumo/src/components/flow` (de-branded) |
| `lisse` | `smooth-corners` | JaceThings/Lisse, `packages/core/src` and `packages/react/src` |
| `slot-text` | `slot-text` | danielwh2/slot-text, `src` (core and React adapter) |
| `calligraph` | `calligraph` | raphaelsalaja/calligraph, `packages/calligraph/src` |
| `griffo` | `split-text` | dimicx/griffo, `src/core`, `src/internal` and `src/motion` (variants shape, flat) |
| `kugiri` | `split-lines` | edoardolunardi/kugiri, `src/index.ts` (verbatim, plus a Labs React wrapper in `labs/`) |
| `componentry` | `annotated-text` | harshjdhv/componentry, `packages/ui/src/components/annotated-text.tsx` |
| `morphicons` | `morph-icon` | guillermolg00/morphicons, `src` (core, DOM driver and React adapter) |
| `libraries-dev` | `image-fx` | Jakubantalik/Libraries.dev, `packages/img-fx/src` (engine, presets and shaders merged into three files; renamed from ImageGeneration) |
| `lenis` | `smooth-scroll` | darkroomengineering/lenis v1.3.26, `packages/react/src` (four modules merged, plus the Lenis stylesheet) |
| `theoplawinski-sticky-grid` | `sticky-grid-scroll` | theoplawinski/codrops-sticky-grid-scroll, `src/scripts/index.js` and `src/styles/index.css` (GSAP rewritten with Motion; scroll containers) |
| `hiro-kiii-scroll-transition` | `svg-mask-scroll-transition` | Hiro-kiii/Scroll-Transition, `js/script.js` to `script4.js` (four patterns as a prop; GSAP rewritten with Motion) |
| `kareem-aez-fold-carousel` | `fold-carousel` | Kareem-AEz's fold carousel, `src/registry/fold-carousel` (variants shape, primitives; de-branded) |
| `bnpne-webgpu-transitions` | `webgpu-page-transition` | bnpne/page-transitions-with-webgpu-vanilla-js, `src` (one component; WebGPU, WebGL 2 and DOM tiers; GSAP and SplitText rewritten) |
| `paperlab` | `paper` | NourMtir0722/Paperlab, `packages/paperlab/src/Paper.tsx` and its closure (Apache-2.0 with NOTICE; GSAP rewritten with Motion) |
| `jh3y-border-shine` | `border-shine` | Jhey's CodePen "masked inset border shine" (debug-view snapshot pinned by tree hash; GSAP and the debug panel left out, arrow keys added) |
| `victorwelander-gooey-text` | `gooey-text` | Victor Welander's 21st.dev item "Gooey Text Morphing" (CDN files pinned by tree hash; a different technique from `text-morph`) |
| `una-neumorphic-shadows` | `neumorphic-panel` | Una Kravets's CodePen "Neumorphic shadows", `debug.html` (a verbatim snapshot, pinned by tree hash; decision 0027) |
| `jshmllr-shadow-stacking` | `elevation` | Josh Miller's CodePen 2.0 "Shadow Stacking I" (a fork of "Shadow Stacking II"), `style.css` and `index.html` (a verbatim snapshot, pinned by tree hash) |
| `jh3y-anchor-magnet-menu` | `magnet-menu` | CodePen pen jh3y/GRapZqO, pinned by the snapshot in `upstream/` (decision 0027; variants shape, Radix and Base UI NavigationMenu, a script fallback without anchor positioning) |
| `jh3y-scroll-carousel` | `scroll-carousel` | CodePen pen jh3y/PovoorJ, pinned by the snapshot in `upstream/` (decision 0027; GSAP fallback rewritten as a scroll listener, photos replaced, a flat strip under reduced motion) |
| `jh3y-text-shimmer` | `shimmer-lines` | Jhey's CodePen "Text Shimmer Lines" (a snapshot of the pen's debug view; tweakpane left out, defaults pinned) |
| `devongovett-text-shimmer` | `text-shimmer` | Devon Govett's CodePen 2.0 "GPU accelerated text shimmer" (a snapshot of its files) |
