# Decisions

One record per consequential choice, written when it is made. Copy
`0000-template.md` to `NNNN-short-title.md` and add it to this index. Every
record has a `- Sources:` line (registry ids, or `none: <reason>`).

| # | Decision | Status |
| --- | --- | --- |
| [0001](0001-mit-license.md) | License the repository's own code under MIT | Accepted |
| [0002](0002-astro-static-site.md) | Astro static output, React islands only for demos | Accepted |
| [0003](0003-external-reference-guard.md) | External-reference guard: secret patterns, public allowlist | Accepted |
| [0004](0004-canonical-component-format.md) | shadcn registry items plus meta.json are canonical | Accepted |
| [0005](0005-only-ready-publishes.md) | Only ready components publish | Accepted |
| [0006](0006-github-hosted-runners.md) | GitHub-hosted runners for this public repository | Accepted |
| [0007](0007-component-license-policy.md) | Only redistributable, attributed components publish | Accepted |
| [0008](0008-npm-names.md) | `@designfrom/react` library and `designfrom` CLI | Accepted |
| [0009](0009-primitive-variants.md) | Primitive library as a variant dimension, published per variant | Accepted |
| [0010](0010-toolchain-pins.md) | Pin the toolchain and prefer aged dependency releases | Accepted |
| [0011](0011-scanner-pull-requests.md) | The scanner opens pull requests only with a dedicated token | Accepted |
| [0012](0012-gallery-view-transitions.md) | Expand gallery tiles into component pages with cross-document view transitions | Accepted |
| [0013](0013-keyframes-in-hoisted-style.md) | CSS keyframe animations as registry:ui components with a hoisted style | Accepted |
| [0014](0014-beta-on-preview-deployments.md) | Beta components on preview deployments, labeled, never in production | Accepted |
| [0015](0015-layout-stages.md) | Show layout parts in a device frame and app shell (stages) | Accepted |
| [0016](0016-ported-component-sources.md) | Multi-file ports as sources in `ports/`, exported by a script | Accepted |
| [0017](0017-port-variants-and-nested-targets.md) | Ports may ship primitive variants and nested file targets | Accepted |
| [0018](0018-node-env-in-items.md) | Item files may read `process.env.NODE_ENV` and nothing else from the environment | Accepted |
