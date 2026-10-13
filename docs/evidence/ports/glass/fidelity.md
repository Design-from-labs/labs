# glass: fidelity

- Upstream: [samasante/liquid-glass `src/`](https://github.com/samasante/liquid-glass/tree/4e7b769e1df7e5a7d3669fef22417fe3d2f79ade/src) at `4e7b769e1df7e5a7d3669fef22417fe3d2f79ade` (MIT, copyright 2026 Sam Asante; S-270)
- Port: `ports/samasante-liquid-glass/glass`, exported to `content/components/samasante-liquid-glass/glass` (item `glass`, primitive none, no icons)
- Renderer: Chromium (Playwright S-014) with SwiftShader software WebGL (`--use-angle=swiftshader --enable-unsafe-swiftshader`, S-283), device scale 1.
- Method: Two harness servers render the same scene files, one with `@samasante/liquid-glass` resolved to the upstream source (as its own demo site does) and one resolved to the port. The scenes are upstream's own copy-paste examples (GlassNotification, GlassContextMenu, GlassSwitch and GlassSlider; asset-free) plus the README's material button, an in-place lens over a striped hero, and the demo site's canvas lens (`draw`, WebGL 2) with its clock fixed at 0. Each `[data-shot]` box is captured snapped to whole pixels after fonts load and the debounced map regenerates, and diffed with pixelmatch (S-152, threshold 0.1). Noise floor: a second upstream load.
- Target: at most 0.1% differing pixels, or within the measured noise floor where GPU output is not repeatable (owner brief, S-288).

## Result: pixels that differ

| Viewport | material | inplace | notification | menu | controls | canvas |
| --- | --- | --- | --- | --- | --- | --- |
| 1280x800 (port) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 1280x800 (noise floor) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812 (port) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812 (noise floor) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |

Worst port frame: 0.000%; worst noise floor: 0.000%.

Strips (material, in place, notification, menu, switch and slider, canvas; 1280x800): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red marks a differing pixel).

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place.

- Seven files under `components/ui/` with the upstream code, renamed (`Glass.tsx` to `glass.tsx`, `GlassMaterial.tsx` to `glass-material.tsx`, `GlassSurface.tsx` to `glass-surface.tsx`, `displacement.ts`, `glassWebGL.ts`, `signal.ts` and `interaction.tsx` to `glass-displacement.ts`, `glass-webgl.ts`, `glass-signal.ts` and `glass-interaction.tsx`), with only the relative imports changed and type-only names imported with `type` (docs/pitfalls.md, P-065); `glass.tsx` also re-exports the package entry (`src/index.ts`) and, in addition, `GlassMaterial` and `GlassSurface`.
- Accessibility: the refracted copies (`refract`, `overlay`, supersampled copy) and the SVG filter layer are `aria-hidden`, and the copies are `inert`, so screen readers read content once and duplicated links stay out of the tab order.
- Reduced motion: `animateGlassValue` jumps to its target and `useLensWobble` does not squash or stretch.
- Comments that named a vendor's design language were reworded. Lens geometry stays physical (measured from the element's box), so it is unchanged in right-to-left pages.
