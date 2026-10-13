# UI Sounds: port fidelity

- Upstream: raphaelsalaja/audio @ d8c04c77eff93e4ff8355b96dfa806f9a8c79b69 (`packages/audio/src`, plus the Core sound pack `.web-kits/core.json`). The repository's LICENSE was read at that commit: MIT, Copyright (c) 2026 Raphael Salaja; `ports/raphaelsalaja-audio/LICENSE` is a byte copy.
- Kind of fidelity: **sonic, not pixels.** The port is a synthesis engine and React hooks. Its demo is a Labs-designed sound board (buttons, a sound switch, a volume slider and a waveform strip); no upstream UI was copied, so there is no pixel diff.
- Harness: upstream's own source (`offline.ts` and everything it imports, plus `core.json`) and the port's files are each bundled with esbuild 0.27.7 (S-154) from the pinned files into one page, and run in the same Chromium 156.0.8078.4 (Playwright 1.64.0, S-014, headless). Every sound is rendered through `renderToBuffer` (upstream's `OfflineAudioContext` path) by both bundles, 2 s, 44.1 kHz, 2 channels, and the Float32 sample buffers are compared sample by sample.
- Seeding: the engine draws noise and reverb impulses from `Math.random`, so each render starts from the same seeded generator (mulberry32, seed 1000 + the sound's index) on both sides, and the second upstream render for the noise floor uses the same seed.
- Target: bit-identical samples, or at most 1e-6 absolute difference.
- Result: **all 62 Core sounds are within the target. 59 are bit-identical; three (complete, level-up, confetti) differ by at most 3.0e-8 (one to two float ulps at their level), exactly the difference between two renders of the unmodified upstream code (upstream against itself: up to 3.0e-8 on the same sounds).** 12 extra scenes cover every engine path the Core pack does not use (13 of the 14 effects, all but the URL-based convolver; wavetable, constant source, LFOs on detune, gain and filter frequency, IIR filter, stereo and 3D panning, play options and jitter): 12 of 12 are bit-identical. No sound is silent.

## What "deterministic" means here (P-WEB2-AUDIO-2)

Rendering the same sound twice through the same unmodified upstream code is not repeatable in Chromium. The engine's `onended` cleanup disconnects nodes and stops effect LFOs, Chromium fires `ended` on the main thread while the offline render runs on the audio thread, and the cut-off lands at a different render quantum each run (plus 1-ulp noise from the summing order of connections). The table therefore has two kinds of columns:

- **Max abs diff / RMS diff / Bit-identical:** both bundles with `AudioScheduledSourceNode.prototype.onended` replaced by a no-op, so the cleanup race cannot change the signal. The handler only frees nodes, so this measures the audio graph, which is what a listener hears.
- **Racy run:** the same comparison with the native `onended`, and the upstream-versus-itself difference (noise floor) for the same seed. The largest racy difference between port and upstream is 1.1e-2 on the scene with a chorus, which is smaller than upstream's own run-to-run difference on that scene (1.2e-2).

## Text-level check

Each upstream module was compared with its port file after replacing the relative imports with the `@/lib/ui-sounds-*` imports and dropping the `// ---- upstream: ... ----` marker line:

| Module | Result |
| --- | --- |
| `types`, `effects`, `engine`, `context`, `patch`, `sequence`, `analyser`, `offline` | byte-identical |
| `index` (the vanilla API) | 1 line differs: the import path in the TSDoc example |
| `react` | the Labs additions below; every other line identical |

## Core sounds (62)

| Sound | Peak | Max abs diff | RMS diff | Bit-identical | Racy run: max diff | Racy run: upstream vs itself |
| --- | ---: | ---: | ---: | :---: | ---: | ---: |
| click | 0.237 | 0 | 0 | yes | 0 | 0 |
| tap | 0.193 | 0 | 0 | yes | 0 | 0 |
| key-press | 0.172 | 0 | 0 | yes | 0 | 0 |
| checkbox | 0.208 | 0 | 0 | yes | 0 | 0 |
| radio | 0.189 | 0 | 0 | yes | 0 | 0 |
| tick | 0.143 | 0 | 0 | yes | 0 | 0 |
| scroll-snap | 0.075 | 0 | 0 | yes | 0 | 0 |
| focus | 0.058 | 0 | 0 | yes | 0 | 0 |
| blur | 0.039 | 0 | 0 | yes | 0 | 0 |
| toggle-on | 0.194 | 0 | 0 | yes | 0 | 0 |
| toggle-off | 0.191 | 0 | 0 | yes | 0 | 0 |
| hover | 0.038 | 0 | 0 | yes | 0 | 0 |
| select | 0.198 | 0 | 0 | yes | 0 | 0 |
| deselect | 0.158 | 0 | 0 | yes | 0 | 0 |
| pop | 0.244 | 0 | 0 | yes | 0 | 0 |
| boop | 0.198 | 0 | 0 | yes | 0 | 0 |
| bounce | 0.216 | 0 | 0 | yes | 0 | 0 |
| spring | 0.178 | 0 | 0 | yes | 0 | 0 |
| expand | 0.118 | 0 | 0 | yes | 0 | 0 |
| collapse | 0.119 | 0 | 0 | yes | 0 | 0 |
| success | 0.242 | 0 | 0 | yes | 1.5e-8 | 1.5e-8 |
| complete | 0.312 | 3.0e-8 | 1.2e-9 | no | 3.0e-8 | 3.0e-8 |
| level-up | 0.216 | 1.5e-8 | 5.9e-10 | no | 0 | 1.5e-8 |
| confetti | 0.187 | 3.0e-8 | 7.3e-10 | no | 3.0e-8 | 1.5e-8 |
| save | 0.139 | 0 | 0 | yes | 0 | 0 |
| ding | 0.153 | 0 | 0 | yes | 0 | 0 |
| notification | 0.184 | 0 | 0 | yes | 0 | 0 |
| mention | 0.126 | 0 | 0 | yes | 0 | 0 |
| badge | 0.143 | 0 | 0 | yes | 0 | 0 |
| info | 0.139 | 0 | 0 | yes | 0 | 0 |
| sparkle | 0.182 | 0 | 0 | yes | 0 | 0 |
| star | 0.123 | 0 | 0 | yes | 0 | 0 |
| error | 0.239 | 0 | 0 | yes | 0 | 0 |
| delete | 0.254 | 0 | 0 | yes | 0 | 0 |
| warning | 0.245 | 0 | 0 | yes | 0 | 0 |
| swoosh | 0.056 | 0 | 0 | yes | 0 | 0 |
| whoosh | 0.077 | 0 | 0 | yes | 0 | 0 |
| page-enter | 0.045 | 0 | 0 | yes | 0 | 0 |
| page-exit | 0.011 | 0 | 0 | yes | 0 | 0 |
| tab-switch | 0.178 | 0 | 0 | yes | 0 | 0 |
| drawer-open | 0.078 | 0 | 0 | yes | 0 | 0 |
| drawer-close | 0.059 | 0 | 0 | yes | 0 | 0 |
| modal-open | 0.098 | 0 | 0 | yes | 0 | 0 |
| modal-close | 0.079 | 0 | 0 | yes | 0 | 0 |
| dropdown-open | 0.068 | 0 | 0 | yes | 0 | 0 |
| dropdown-close | 0.049 | 0 | 0 | yes | 0 | 0 |
| slide | 0.038 | 0 | 0 | yes | 0 | 0 |
| slide-up | 0.048 | 0 | 0 | yes | 0 | 0 |
| slide-down | 0.010 | 0 | 0 | yes | 0 | 0 |
| copy | 0.154 | 0 | 0 | yes | 0 | 0 |
| send | 0.158 | 0 | 0 | yes | 0 | 0 |
| receive | 0.119 | 0 | 0 | yes | 0 | 0 |
| command | 0.176 | 0 | 0 | yes | 0 | 0 |
| escape | 0.157 | 0 | 0 | yes | 0 | 0 |
| undo | 0.139 | 0 | 0 | yes | 0 | 0 |
| archive | 0.119 | 0 | 0 | yes | 0 | 0 |
| sync | 0.127 | 0 | 0 | yes | 0 | 0 |
| heart | 0.183 | 0 | 0 | yes | 0 | 0 |
| streak | 0.237 | 0 | 0 | yes | 0 | 0 |
| loading-start | 0.079 | 0 | 0 | yes | 0 | 0 |
| loading-end | 0.099 | 0 | 0 | yes | 0 | 0 |
| progress-tick | 0.095 | 0 | 0 | yes | 0 | 0 |

## Engine paths the Core pack does not use, and play options (12)

| Sound | Peak | Max abs diff | RMS diff | Bit-identical | Racy run: max diff | Racy run: upstream vs itself |
| --- | ---: | ---: | ---: | :---: | ---: | ---: |
| ext:wavetable+lfo | 0.408 | 0 | 0 | yes | 0 | 0 |
| ext:constant+filter-lfo | 0.255 | 0 | 0 | yes | 8.6e-11 | 8.6e-11 |
| ext:iir+pan | 0.185 | 0 | 0 | yes | 0 | 0 |
| ext:panner3d | 0.284 | 0 | 0 | yes | 0 | 0 |
| ext:constant | 0.100 | 0 | 0 | yes | 0 | 0 |
| ext:fx-delay-chorus-flanger | 0.124 | 0 | 0 | yes | 1.1e-2 | 1.2e-2 |
| ext:fx-phaser-tremolo-vibrato | 0.210 | 0 | 0 | yes | 0 | 4.2e-4 |
| ext:fx-distortion-bitcrusher | 1.015 | 0 | 0 | yes | 0 | 0 |
| ext:fx-compressor-eq-gain-pan | 0.554 | 0 | 0 | yes | 0 | 0 |
| ext:fx-reverb-predelay | 0.053 | 0 | 0 | yes | 0 | 0 |
| opts:volume+detune+velocity+pan | 0.074 | 0 | 0 | yes | 0 | 0 |
| opts:jitter | 0.251 | 0 | 0 | yes | 0 | 0 |

`ext:` rows are small definitions written for this comparison; `opts:` rows pass play options (`volume`, `detune`, `velocity`, `pan`, `jitter`) to a Core sound.

## Behaviour in the gallery

`e2e/ui-sounds.spec.ts` runs against a `LABS_INCLUDE_BETA=1` build (it skips where the page is not published): axe at WCAG 2.2 AA in light, dark and right to left; no `AudioContext` exists until a button is pressed, and Enter on a focused button then builds a voice; the Sound switch (Space) mutes and the Volume slider (arrow keys) changes; under reduced motion the buttons stay silent, the page says why, and "Play anyway" overrides it. The server-rendered markup was also rendered in Node with no `window` and no `AudioContext` (`renderToString` of the provider, the three hooks and `SoundControls`): it renders, and nothing touches the audio context at import or render time.

## Deviations

- Flat install (decision 0016): upstream's relative imports became `@/lib/ui-sounds-<module>` imports, files are renamed with the `ui-sounds-` prefix (`index.ts` is `ui-sounds-api.ts`, `react.tsx` is `ui-sounds.tsx`), and each starts with a `// ---- upstream: <path> ----` marker. Nothing else changed in the eight engine modules.
- Left out: the command-line tool (`src/commands`, `bin.ts`), the JSON schemas, the tests and every sound pack except Core. A documentation example in `index.ts` named the upstream package; it now shows the Labs import path.
- The Core pack (`.web-kits/core.json`, version 3.1.0) is generated data in `ui-sounds-core-patch.ts`: one sound per line, keys in the original order, values unchanged (checked in the harness: equal to the upstream JSON apart from the dropped `$schema` key, a relative path into the upstream repository). No audio files, no samples, no network at import time.
- Labs additions in `ui-sounds.tsx`, marked: `SoundProvider` takes `respectReducedMotion` (default `true`, upstream's behaviour); `useSoundControls()` reads the provider (appended after the upstream code). Defaults reproduce upstream exactly.
- `useAnalyser` is unchanged and creates the audio context while rendering; use it only in a client-only subtree (P-WEB2-AUDIO-3). The demo creates its analyser inside the first button press.
- Shape: a component, not a `kind: "hook"` item, because foundation items carry no demo and the exporter writes components only (P-WEB2-AUDIO-1).
- Not covered by the comparison: the `sample` and `stream` sources and the `convolver` effect, which need a URL or a media stream (the Core pack uses none and the port adds no network). Safari's prefixed `webkitAudioContext` is not handled, nor is it upstream.

## Enhancements (Labs, default sound unchanged)

- Never auto-plays: sounds start only from a handler the app calls; the demo creates the audio context and its analyser on the first button press.
- Sound switch and volume slider (`SoundControls`): a labelled `role="switch"` and a labelled range input, keyboard operable, logical RTL utilities, reduced-motion safe transitions, shared tokens only (no component CSS variables needed).
- Reduced motion: sound is not motion, but upstream's hooks stay silent under `prefers-reduced-motion`, and that remains the default. `SoundControls` says so while it applies and offers "Play anyway"; `respectReducedMotion={false}` lets an app's own control decide. The waveform strip does not animate under reduced motion.
- SSR safe: no `AudioContext`, `window` or `document` at module scope or during server rendering, apart from `useAnalyser` (see Deviations).
- Tile and loop: the wall plays only CSS hover and press states on the buttons, never a click, so nothing sounds on the wall.
