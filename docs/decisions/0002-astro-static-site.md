# 0002: Build the site with Astro as static output, React islands only for demos

- Status: Accepted
- Date: 2026-10-12
- Deciders: Owner (brief), Pod LAB
- Sources: S-001, S-002, S-003, S-008, S-009, S-021

## Context

The site is a catalogue: mostly text, code and previews, with a handful of
interactive demos. The brief asked for Astro (latest stable), near-zero
JavaScript by default, static output, lazy islands and compressed images.

## Decision

- Astro 7 with `output: "static"`; every page is prerendered, including
  `/r/*.json`, `/llms.txt` and `/llms-full.txt`.
- React (`@astrojs/react`) only for component demos. Gallery tiles are
  server-rendered with no hydration; the component page hydrates the shown
  variant's demo with `client:visible`.
- Variant switching, install tabs and copy buttons are small inline scripts
  (no framework runtime).
- Tailwind CSS v4 with a token layer (`src/styles/tokens.css`) using the
  shadcn variable names, so registry items work unchanged in shadcn projects.
- Syntax highlighting at build time (Shiki through Astro), so highlighted
  source costs no client JavaScript.
- Hosted on Vercel as a static deployment; production from `main`.

## Alternatives

| Option | Why not |
| --- | --- |
| Next.js | Ships a React runtime on every page; the catalogue does not need server rendering at request time. |
| Client-side highlighting | Adds JavaScript per page for no benefit; the source is known at build time. |
| One island for the whole page | Hydrates text and code that never change. |

## Evidence

The Playwright smoke test (`e2e/`) checks that the gallery renders without
hydrating, that the switcher swaps the source, and that copy works; the
build log lists the client bundles.

## Consequences

Interactive demos must be server-render safe (docs/contract.md, section 2).
A demo that needs browser APIs must guard them inside effects.

## Re-test when

A component needs request-time data, or client JavaScript on a page without
an interactive demo exceeds 10 KB gzipped.
