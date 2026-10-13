# Flow Diagram: fidelity

- Upstream: Cloudflare's flow components, `packages/kumo/src/components/flow`
  at commit `f46e8bc9922c37dc1d3e7da779e589fe171df306` (MIT, Copyright (c)
  2026 Cloudflare, Inc.); source id `cloudflare-kumo`, credit S-405.
- Port: `ports/cloudflare-kumo/flow-diagram/`, flat shape (decision 0016),
  one file per upstream module, so each file diffs line for line against its
  upstream module (and the item stays promotable: no nested targets, P-044).
- Date: 2026-10-13.

## Method

The upstream documentation site renders its Flow examples inside a preview
box; running it was not needed. A Vite harness renders, side by side:

- **upstream**: the upstream flow sources and the docs' `FlowDemo.tsx`
  (all 15 examples), verbatim, with the upstream token stylesheet
  (`kumo.css`, its theme and binding) and Tailwind 4.3, inside the docs'
  preview box (`flex min-h-[120px] items-center justify-center rounded-t-lg
  border p-6` on the canvas color). Dark mode is the docs' own mechanism
  (`data-mode="dark"`). The upstream's `cn` package is shimmed with clsx and
  tailwind-merge (the flow only joins non-conflicting classes).
- **port**: the port files in this repository, with the component's
  `cssVars` (light and dark) and the same 15 examples, whose own demo token
  classes are renamed to neutral names with the values measured from the
  upstream page (computed styles, light and dark), plus the upstream page's
  type scale (13 px `text-sm`), which the interactive examples' buttons use.

Both pages share the docs' global rules (antialiasing, `letter-spacing:
-0.01em`, `line-height: 1.5`) and a system font (the docs' web font is not
shipped). Screenshots are of the preview box, Playwright Chromium,
`deviceScaleFactor` 1, pixelmatch threshold 0.1, at 1280x800 and 375x812, in
light and dark.

Frames: every example settled; a dragged state (pointer drag of 300 px,
10 steps); a wheel-panned state with the pointer hovering (scrollbars
visible); after clicking "Add middle node"; after expanding "Auth Service".
The numbers are in `fidelity.json`.

## Results

| Frames | Viewports | Schemes | Worst diff |
| --- | --- | --- | --- |
| 15 examples, settled | 1280x800, 375x812 | light, dark | 0.0000% |
| Panning: dragged 300 px | 1280x800, 375x812 | light, dark | 0.0000% |
| Panning: wheel 500 px, hovered (scrollbars) | 1280x800, 375x812 | light, dark | 0.0000% |
| Dynamic node added | 1280x800, 375x812 | light, dark | 0.0000% |
| Expandable node opened (click) | 1280x800, 375x812 | light, dark | 0.0000% |

76 frames, all 0 differing pixels. Noise floor (upstream against a second
upstream load, Parallel and Panning, both viewports): 0.0000%. The layout is
deterministic (no randomness, no time-based motion).

Evidence: `strip-light.webp`, `strip-dark.webp`, `strip-interactive.webp`
(each row: upstream, port, diff), `rtl-mirror.webp`, `site.webp`.

## Deviations from upstream

| Change | Why | Effect on the default look |
| --- | --- | --- |
| `bg-kumo-base`, `ring-kumo-line`, `text-kumo-placeholder`, `bg-kumo-hairline/50`, `bg-kumo-fill` become `bg-flow-diagram-node`, `ring-flow-diagram-line`, `text-flow-diagram-connector`, `bg-flow-diagram-track/50`, `bg-flow-diagram-thumb` | De-branding; component-prefixed cssVars whose values are the upstream tokens' computed values, light and dark | None (0.0000%) |
| `rounded-md` becomes `rounded-flow-diagram-node` (`--flow-diagram-radius: 0.375rem`) | A shadcn theme redefines `rounded-md` as `calc(var(--radius) - 2px)` (8 px with this site's radius); the variable keeps upstream's 6 px in any project | None |
| `ml-0` becomes `ms-0`; scrollbar insets `left/right` become `start/end`; node `left` becomes `insetInlineStart`; the horizontal thumb uses `insetInlineStart` | Right to left, the flow mirrors (below) | None left to right |
| Connector layer gets `rtl:-scale-x-100` | Mirrors the connectors with the nodes, once (P-021) | None left to right |
| Pan range is direction-aware (`clampX`), and a `dir` MutationObserver re-measures | Right to left the content overflows to the left, so the pan runs over positive offsets; upstream's clamp would make the start of the flow unreachable | Left to right the clamp equals upstream's |
| Parallel groups wrap their branches in a `<ul class="list-none">`; a nested `Flow.List` renders inside an `<li>` | Upstream nests `<li>` directly in `<li>` (React logs "cannot be a descendant of <li>" on the upstream page; axe `listitem` fails on upstream, 2 and 3 nodes) | None: nodes are absolutely positioned |
| Canvas: `role="group"`, `aria-label`/`aria-labelledby` props, `tabIndex=0` when it can pan, arrow keys / Home / End pan, focus ring `focus-visible:ring-2 ring-ring`, scrollbars also on `group-focus-visible` | Keyboard and screen-reader support | Only while focused |
| Keyboard focus moving to a control inside a node pans it into view (folding any native scroll of the clipped canvas into the pan) | Keyboard users cannot drag | Pointer focus is left as upstream (a click on a node button lets the browser scroll the canvas natively, exactly as upstream; measured 0.0000% on the "Expandable opened" frames) |
| Under `prefers-contrast: more`, the connector and the node ring use `--flow-diagram-connector-contrast` / `--flow-diagram-line-contrast`; in forced colors nodes get an outline | Contrast policy (ports/README.md): fidelity default, contrast on request | None by default |
| `"use client"` on every `.tsx` file; imports point at the renamed files and `@/lib/utils` | Contract | None |
| `// ---- upstream: <file> ----` markers and `Labs:` comments | Readable diff | None |

Measured default contrast (WCAG): connectors oklch(70.8% 0 0) on white 2.6:1
(2.5:1 on the docs' canvas), dark oklch(55.6% 0 0) on oklch(10% 0 0) 4.4:1;
node ring 1.2:1 light, 1.5:1 dark. Raised: connectors and ring 4.7:1 light,
7.4:1 or more dark.

Not changed: no animation exists to reduce (pans set the motion values
directly, with no inertia and no transitions; the scrollbars appear without a
transition), so reduced motion keeps the behavior. The server render still
shows nodes at `opacity: 0` until they are measured in the browser, as
upstream (see the wall notes).

## Renames

| Upstream | Port |
| --- | --- |
| `index.ts` | `flow-diagram.tsx` (exports `Flow`) |
| `diagram.tsx` | `flow-diagram-canvas.tsx` |
| `node.tsx` | `flow-diagram-node.tsx` |
| `parallel.tsx` | `flow-diagram-parallel.tsx` |
| `connectors.tsx` | `flow-diagram-connectors.tsx` |
| `flow-layout.ts` | `flow-diagram-layout.ts` (verbatim) |
| `use-children.tsx` | `flow-diagram-descendants.tsx` (verbatim plus `"use client"`) |
| token classes `*-kumo-*` | `*-flow-diagram-*` (table above) |

Exported identifiers keep upstream's names (`Flow`, `FlowDiagram`, `FlowNode`,
`FlowAnchor`, `FlowParallelNode`, `FlowNodeList`, ...); none collide across the
item's files except the layout types, which `flow-diagram-canvas.tsx`
re-exports from `flow-diagram-layout.ts` (the same symbols, so the library's
`export *` barrel is not ambiguous).

## Primitive and icons

Primitive `none`: the component is a measured layout of list items and an
SVG overlay with a pan gesture. No Radix, Base UI or React Aria part covers a
pannable canvas or a graph layout (a ScrollArea would replace the
transform-based pan and its clamp, changing behavior and pixels). Icon set
`none`: the component renders no icons (only the upstream docs' Expandable
example uses a caret icon, in demo code).

## Right to left

Decision: the flow mirrors. A horizontal flow progresses from the right
(reading direction), a vertical flow's branches start at the right, the
connectors and arrowheads are mirrored once, the initial view shows the
start of the flow and the pan range runs the other way. Node text keeps its
own direction. Check: the right-to-left render with node text hidden equals
the horizontally flipped left-to-right render within 0.0004% to 0.17% of
pixels (sub-pixel antialiasing at fractional node offsets; `rtl-mirror.webp`,
first row), for Parallel, Complex, VerticalParallel, Anchor, Disabled and
ParallelNestedList. Right to left at 375 px: "Start" is visible first, a
drag to the right pans to +360 px, the wheel reaches the end at +1069 px.

## Behavior checks (harness)

- Keyboard (Panning, 375 px): Tab focuses the canvas (`role=group`,
  tabindex 0); 5 x ArrowRight pans to -200 px, 5 x ArrowLeft back to 0, End
  to -1069 px, Home to 0; right to left the signs flip (ArrowLeft to +200,
  End to +1069). A diagram that fits has no tab stop.
- Focus follow (Expandable, 375 px): tabbing to "Rate Limiter", which starts
  outside the canvas, pans it fully into view (x -155 px, native scroll 0).
- Scrollbars: visible on hover and while the canvas has keyboard focus.
- axe (wcag2a/aa, 2.1, 2.2, best practice) on the component: Parallel,
  Panning, ParallelNestedList, Anchor, Expandable, VerticalParallel x light,
  dark x ltr, rtl x 1280, 375: 0 violations (48 runs). Upstream, same rules:
  `listitem` on Parallel (2 nodes) and ParallelNestedList (3 nodes).

## Site checks (beta build of an isolated copy, P-047)

- `/ui/flow-diagram` at 1280, 375 and 320 px, light and dark: no console or
  hydration errors, no horizontal overflow, all 10 nodes visible, the canvas
  inside the demo frame, axe clean; right to left (the frame's `dir`, as the
  direction switch sets it; this page has no switch, P-041) also clean, with
  the flow starting at the right after a pan was re-clamped to 0.
- `/ui` wall, 1440 and 375 px: the tile (2 x 1) hydrates and pans back and
  forth; under reduced motion it stays paused at offset 0 with every node
  shown. The demo moves only inside a wall specimen and skips its frame while
  `[data-loop-paused]` is set; on the component page it never moves.
- The preview still was captured from the hydrated component page (the
  `/preview` route never hydrates, so its nodes would be invisible; P-061).
