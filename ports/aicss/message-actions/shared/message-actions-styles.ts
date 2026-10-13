// Labs port of upstream's MessageActions.module.css (packages/react/src/
// message-actions). CSS modules do not survive a registry install, so the
// class names are written out with the component's prefix, keyframes and
// variables too (message-actions-*), and the sheet ships as a string that
// the component renders in a React 19 <style href precedence> (hoisted into
// <head> once). Every change from upstream is marked "Labs" below and listed
// in docs/evidence/ports/message-actions/fidelity.md.

/** Upstream's `styles.<name>` lookups, so the component code reads as upstream. */
export const messageActionsClassNames = {
  ago: "message-actions-ago",
  bar: "message-actions-bar",
  btn: "message-actions-btn",
  bumpDown: "message-actions-bump-down",
  bumpUp: "message-actions-bump-up",
  cell: "message-actions-cell",
  check: "message-actions-check",
  copyMark: "message-actions-copy-mark",
  copySwap: "message-actions-copy-swap",
  danger: "message-actions-danger",
  emoji: "message-actions-emoji",
  emojiOut: "message-actions-emoji-out",
  empty: "message-actions-empty",
  glyph: "message-actions-glyph",
  glyphDown: "message-actions-glyph-down",
  grid: "message-actions-grid",
  groupLabel: "message-actions-group-label",
  hit: "message-actions-hit",
  icon: "message-actions-icon",
  item: "message-actions-item",
  mark: "message-actions-mark",
  menu: "message-actions-menu",
  minRoll: "message-actions-min-roll",
  minRollInner: "message-actions-min-roll-inner",
  minRolls: "message-actions-min-rolls",
  minStatic: "message-actions-min-static",
  moreEmoji: "message-actions-more-emoji",
  picker: "message-actions-picker",
  pickerScroll: "message-actions-picker-scroll",
  pop: "message-actions-pop",
  reaction: "message-actions-reaction",
  reply: "message-actions-reply",
  replyPlay: "message-actions-reply-play",
  root: "message-actions-root",
  rule: "message-actions-rule",
  search: "message-actions-search",
  slot: "message-actions-slot",
  smile: "message-actions-smile",
  smilePlay: "message-actions-smile-play",
  status: "message-actions-status",
  surface: "message-actions-surface",
  tip: "message-actions-tip",
  tipPositioner: "message-actions-tip-positioner",
  voteDown: "message-actions-vote-down",
  voteUp: "message-actions-vote-up",
  eye: "message-actions-eye",
  eyeShut: "message-actions-eye-shut",
  eyeWink: "message-actions-eye-wink",
  mouthHappy: "message-actions-mouth-happy",
  mouthRest: "message-actions-mouth-rest",
  replyHead: "message-actions-reply-head",
  replyShaft: "message-actions-reply-shaft",
} as const;

export const messageActionsCss = `
/* Labs: the theme variables also go on every popup surface (class
   message-actions-surface: the tooltip, the reaction bar, the emoji picker and
   the menu), which the primitives portal out of the row. */
.message-actions-root,
.message-actions-surface {
  --message-actions-fg: #1d1d1d;
  --message-actions-muted: #aeaeae;
  --message-actions-hover: rgba(0, 0, 0, 0.05);
  --message-actions-selected: rgba(0, 0, 0, 0.07);
  --message-actions-pop: #ffffff;
  --message-actions-line: #e0e0e0;
  /* Hairline first so it stays an even 0.5px on every edge. */
  --message-actions-elevated:
    0 0 0 0.5px #e0e0e0,
    0 4px 8px rgba(0, 0, 0, 0.02),
    0 8px 12px rgba(0, 0, 0, 0.02),
    0 2px 4px rgba(0, 0, 0, 0.02),
    0 1px 2px rgba(0, 0, 0, 0.04);
  --message-actions-good: #1f9d55;
  --message-actions-bad: #e11d48;
}

.message-actions-root {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-family: inherit;
}

[data-theme="dark"] .message-actions-root,
.dark .message-actions-root,
[data-theme="dark"] .message-actions-surface,
.dark .message-actions-surface,
.message-actions-surface[data-theme="dark"] {
  --message-actions-fg: #f4f4f5;
  --message-actions-muted: #5a5a5a;
  --message-actions-hover: #2e2e2e;
  --message-actions-selected: #333333;
  --message-actions-pop: #1c1c1e;
  --message-actions-line: #3a3a3a;
  --message-actions-bad: #f87171;
  --message-actions-elevated:
    0 0 0 0.5px #3a3a3a,
    0 4px 8px rgba(0, 0, 0, 0.28),
    0 8px 12px rgba(0, 0, 0, 0.22),
    0 2px 4px rgba(0, 0, 0, 0.24),
    0 1px 2px rgba(0, 0, 0, 0.32);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) .message-actions-root,
  :root:not([data-theme]) .message-actions-surface {
    --message-actions-fg: #f4f4f5;
    --message-actions-muted: #5a5a5a;
    --message-actions-hover: #2e2e2e;
    --message-actions-selected: #333333;
    --message-actions-pop: #1c1c1e;
    --message-actions-line: #3a3a3a;
    --message-actions-bad: #f87171;
    --message-actions-elevated:
      0 0 0 0.5px #3a3a3a,
      0 4px 8px rgba(0, 0, 0, 0.28),
      0 8px 12px rgba(0, 0, 0, 0.22),
      0 2px 4px rgba(0, 0, 0, 0.24),
      0 1px 2px rgba(0, 0, 0, 0.32);
  }
}

.message-actions-hit {
  display: inline-flex;
}

/* Labs: the primitive's positioner places the tooltip (side top, 6px offset,
   centered), so upstream's fixed position, translate and measured width are
   gone; it sizes to its text. */
.message-actions-tip {
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: max-content;
  overflow: hidden;
  padding: 4px 5px;
  border-radius: 6px;
  background: rgba(29, 29, 29, 0.6);
  color: rgba(255, 255, 255, 0.9);
  font-size: 10px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
  backdrop-filter: blur(6px);
}

.message-actions-tip[data-theme="dark"] {
  background: rgba(255, 255, 255, 0.12);
}

/* Upstream's arrival (150 ms after an 80 ms delay) and departure (50 ms),
   for each primitive's open and close states. */
@keyframes message-actions-tip-in {
  from {
    opacity: 0;
    transform: translateY(1px);
    filter: blur(2px);
  }
}

@keyframes message-actions-tip-out {
  to {
    opacity: 0;
    transform: translateY(1px);
    filter: blur(2px);
  }
}

/* Radix (data-state) and React Aria (data-entering / data-exiting). */
.message-actions-tip[data-state="delayed-open"],
.message-actions-tip[data-entering] {
  animation: message-actions-tip-in 150ms ease 80ms both;
}

.message-actions-tip[data-state="closed"],
.message-actions-tip[data-exiting] {
  animation: message-actions-tip-out 50ms ease both;
}

/* Base UI: one tooltip shared by every button glides between them, like
   upstream's single bubble (position and width over 160 ms). */
.message-actions-tip-positioner {
  transition:
    top 160ms cubic-bezier(0.22, 1, 0.36, 1),
    left 160ms cubic-bezier(0.22, 1, 0.36, 1);
}

.message-actions-tip-positioner[data-instant] {
  transition: none;
}

.message-actions-tip[data-base-ui] {
  transition:
    opacity 150ms ease 80ms,
    transform 150ms ease 80ms,
    filter 150ms ease 80ms,
    width 160ms cubic-bezier(0.22, 1, 0.36, 1);
}

.message-actions-tip[data-base-ui][data-starting-style],
.message-actions-tip[data-base-ui][data-ending-style] {
  opacity: 0;
  transform: translateY(1px);
  filter: blur(2px);
}

.message-actions-tip[data-base-ui][data-ending-style] {
  transition:
    opacity 50ms ease,
    transform 50ms ease,
    filter 50ms ease;
}

.message-actions-tip[data-base-ui][data-instant] {
  transition: none;
}

.message-actions-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--message-actions-muted);
  cursor: pointer;
}

/* Labs: density="comfortable" gives every button a 24px target (WCAG 2.2
   target size) and keeps upstream's 20px pill, drawn inside the padding. */
.message-actions-root[data-density="comfortable"] {
  gap: 0;
}

.message-actions-root[data-density="comfortable"] .message-actions-btn {
  width: 24px;
  height: 24px;
  padding: 2px;
  border-radius: 9px;
  background-clip: content-box;
}

.message-actions-btn:hover {
  background: var(--message-actions-hover);
  color: var(--message-actions-fg);
}

.message-actions-btn[data-on="true"] {
  background: var(--message-actions-selected);
  color: var(--message-actions-fg);
}

.message-actions-btn[data-on="true"]:has(.message-actions-vote-up) {
  color: var(--message-actions-good);
}

.message-actions-btn[data-on="true"]:has(.message-actions-vote-down) {
  color: var(--message-actions-bad);
}

.message-actions-icon,
.message-actions-icon :is(path, circle, line, rect, polyline, polygon) {
  vector-effect: non-scaling-stroke;
}

.message-actions-glyph {
  display: block;
  width: 12px;
  height: 12px;
  transform-origin: 50% 82%;
}

.message-actions-reaction {
  font-size: 12px;
  line-height: 1;
  transform-origin: center;
  animation: message-actions-reaction-in 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes message-actions-reaction-in {
  from {
    opacity: 0;
    scale: 1.2;
  }
  to {
    opacity: 1;
    scale: 1;
  }
}

.message-actions-mark {
  display: block;
  line-height: 1;
  translate: 0 0.08em;
}

.message-actions-ago {
  display: inline-flex;
  align-items: center;
  height: 20px;
  /* Labs: logical, so right to left mirrors it (was margin-left). */
  margin-inline-start: 4px;
  font-size: 12px;
  line-height: 1;
  font-weight: 400;
  color: var(--message-actions-muted);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  cursor: default;
  opacity: 0;
  transition: opacity 200ms ease;
}

.message-actions-root:hover .message-actions-ago,
.message-actions-root:focus-within .message-actions-ago {
  opacity: 1;
}

.message-actions-min-rolls {
  display: inline-flex;
}

.message-actions-min-static {
  display: inline;
}

.message-actions-min-roll {
  display: inline-block;
  position: relative;
  overflow: hidden;
  height: 1em;
  line-height: 1em;
  vertical-align: -0.05em;
}

.message-actions-min-roll-inner {
  display: flex;
  flex-direction: column;
  transition: transform 350ms cubic-bezier(0.4, 0, 0.2, 1);
}

.message-actions-min-roll-inner[data-dir="down"] {
  transform: translateY(-1em);
}

.message-actions-min-roll-inner[data-dir="up"][data-shifted="true"] {
  transform: translateY(-1em);
}

.message-actions-min-roll-inner[data-dir="down"][data-shifted="true"] {
  transform: translateY(0);
}

.message-actions-min-roll-inner span {
  height: 1em;
  line-height: 1em;
}

.message-actions-glyph-down {
  transform-origin: 50% 18%;
}

.message-actions-smile {
  transform-origin: 50% 60%;
}

/* Upstream's own glyphs (the default style): the reply's shaft and head. */
.message-actions-reply-shaft {
  transform-box: view-box;
  transform-origin: 66.667% 50%;
}

.message-actions-reply-head {
  transform-box: view-box;
}

.message-actions-reply-play .message-actions-reply-shaft {
  animation: message-actions-reply-grow 520ms cubic-bezier(0.22, 1.15, 0.36, 1);
}

.message-actions-reply-play .message-actions-reply-head {
  animation: message-actions-reply-head 520ms cubic-bezier(0.22, 1.15, 0.36, 1);
}

/* Labs ("icons" style): upstream drew its own reply arrow with a separate shaft and head.
   Lucide's Reply draws the curve and shaft as its first path and the head as
   its second, so those get the same moves (Phosphor icons only hop). */
.message-actions-reply.lucide > path:first-child {
  transform-box: view-box;
  transform-origin: 66.667% 50%;
}

.message-actions-reply.lucide > path:last-child {
  transform-box: view-box;
}

.message-actions-reply-play.lucide > path:first-child {
  animation: message-actions-reply-grow 520ms cubic-bezier(0.22, 1.15, 0.36, 1);
}

.message-actions-reply-play.lucide > path:last-child {
  animation: message-actions-reply-head 520ms cubic-bezier(0.22, 1.15, 0.36, 1);
}

.message-actions-slot {
  position: relative;
  display: inline-flex;
}

.message-actions-bump-up {
  animation: message-actions-thumb-up 520ms cubic-bezier(0.22, 1.15, 0.36, 1);
}

.message-actions-bump-down {
  animation: message-actions-thumb-down 520ms cubic-bezier(0.22, 1.15, 0.36, 1);
}

.message-actions-smile-play {
  animation: message-actions-smile-hop 560ms cubic-bezier(0.22, 1.2, 0.36, 1);
}

.message-actions-copy-swap {
  display: grid;
}

.message-actions-copy-swap .message-actions-glyph {
  grid-area: 1 / 1;
}

.message-actions-copy-mark {
  opacity: 1;
  transition: opacity 220ms ease;
}

.message-actions-copy-swap[data-on="true"] .message-actions-copy-mark {
  opacity: 0;
  transition: none;
}

.message-actions-check {
  color: var(--message-actions-good);
  opacity: 0;
  transition: opacity 220ms ease;
}

.message-actions-copy-swap[data-on="true"] .message-actions-check {
  opacity: 1;
  transition: none;
}

.message-actions-check path {
  stroke-dasharray: 28;
  stroke-dashoffset: 0;
}

.message-actions-copy-swap[data-on="true"] .message-actions-check path {
  animation: message-actions-draw-check 420ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

/* Labs: Lucide's Check runs right to left (upstream's ran left to right), so
   it draws from its far end to keep upstream's stroke direction. */
.message-actions-copy-swap[data-on="true"] .message-actions-check.lucide path {
  animation-name: message-actions-draw-check-reverse;
}

.message-actions-pop {
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0;
  padding: 2px;
  border-radius: 12px;
  background: var(--message-actions-pop);
  box-shadow: var(--message-actions-elevated);
  transform-origin: 16px 100%;
  animation: message-actions-pop-in 160ms cubic-bezier(0.22, 1, 0.36, 1);
}

/* Labs: the reaction row is a toolbar (arrow keys move between emoji)
   inside the popover, laid out as upstream's row. */
.message-actions-bar {
  display: flex;
  align-items: center;
}

.message-actions-emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.message-actions-emoji:hover,
.message-actions-emoji[data-on="true"] {
  background: var(--message-actions-hover);
}

.message-actions-pop .message-actions-mark {
  translate: none;
}

.message-actions-emoji-out {
  overflow: hidden;
  pointer-events: none;
  animation: message-actions-emoji-out 220ms ease forwards;
}

@keyframes message-actions-emoji-out {
  to {
    width: 0;
    opacity: 0;
    transform: scale(0.9);
  }
}

.message-actions-more-emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--message-actions-muted);
  cursor: pointer;
}

.message-actions-more-emoji:hover {
  background: var(--message-actions-hover);
  color: var(--message-actions-fg);
}

.message-actions-picker {
  --message-actions-fg: #1d1d1d;
  --message-actions-muted: #aeaeae;
  --message-actions-hover: rgba(0, 0, 0, 0.05);
  --message-actions-selected: rgba(0, 0, 0, 0.07);
  --message-actions-pop: #ffffff;
  --message-actions-line: #e0e0e0;
  --message-actions-elevated:
    0 0 0 0.5px #e0e0e0,
    0 4px 8px rgba(0, 0, 0, 0.02),
    0 8px 12px rgba(0, 0, 0, 0.02),
    0 2px 4px rgba(0, 0, 0, 0.02),
    0 1px 2px rgba(0, 0, 0, 0.04);

  z-index: 30;
  width: 286px;
  border-radius: 16px;
  background: var(--message-actions-pop);
  color: var(--message-actions-fg);
  box-shadow: var(--message-actions-elevated);
  overflow: hidden;
  animation: message-actions-pop-in 160ms cubic-bezier(0.22, 1, 0.36, 1);
}

.message-actions-picker[data-theme="dark"] {
  --message-actions-fg: #f4f4f5;
  --message-actions-muted: #5a5a5a;
  --message-actions-hover: #2e2e2e;
  --message-actions-selected: #333333;
  --message-actions-pop: #1c1c1e;
  --message-actions-line: #3a3a3a;
  --message-actions-elevated:
    0 0 0 0.5px #3a3a3a,
    0 4px 8px rgba(0, 0, 0, 0.28),
    0 8px 12px rgba(0, 0, 0, 0.22),
    0 2px 4px rgba(0, 0, 0, 0.24),
    0 1px 2px rgba(0, 0, 0, 0.32);
}

.message-actions-search {
  display: flex;
  align-items: center;
  gap: 8px;
  /* Labs: logical form of upstream's 8px 12px 8px 10px. */
  padding-block: 8px;
  padding-inline: 10px 12px;
  border-bottom: 0.5px solid var(--message-actions-line);
  color: var(--message-actions-muted);
}

.message-actions-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--message-actions-fg);
  font: inherit;
  font-size: 14px;
}

.message-actions-search input::placeholder {
  color: var(--message-actions-muted);
}

.message-actions-picker-scroll {
  max-height: 248px;
  /* Labs: logical form of upstream's 0 4px 10px 8px. */
  padding-block: 0 10px;
  padding-inline: 8px 4px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--message-actions-hover) transparent;
}

.message-actions-picker-scroll::-webkit-scrollbar {
  width: 4px;
  height: 0;
}

.message-actions-picker-scroll::-webkit-scrollbar:horizontal {
  display: none;
}

.message-actions-picker-scroll::-webkit-scrollbar-track,
.message-actions-picker-scroll::-webkit-scrollbar-corner {
  background: transparent;
}

.message-actions-picker-scroll::-webkit-scrollbar-thumb {
  background: var(--message-actions-hover);
  border-radius: 999px;
}

.message-actions-group-label {
  margin: 10px 4px 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--message-actions-muted);
}

.message-actions-grid {
  display: grid;
  grid-template-columns: repeat(8, 32px);
  gap: 2px;
}

.message-actions-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.message-actions-cell:hover,
.message-actions-cell[data-on="true"] {
  background: var(--message-actions-hover);
}

.message-actions-empty {
  margin: 16px 8px;
  font-size: 13px;
  color: var(--message-actions-muted);
}

.message-actions-menu {
  z-index: 2;
  display: flex;
  flex-direction: column;
  min-width: 120px;
  padding: 2px 0;
  border-radius: 10px;
  background: var(--message-actions-pop);
  box-shadow: var(--message-actions-elevated);
  transform-origin: 100% 100%;
  animation: message-actions-pop-in 160ms cubic-bezier(0.22, 1, 0.36, 1);
}

.message-actions-item {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  margin: 0 2px;
  padding: 0 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--message-actions-fg);
  font: inherit;
  font-size: 12px;
  line-height: 1;
  /* Labs: was text-align: left. */
  text-align: start;
  white-space: nowrap;
  cursor: pointer;
}

.message-actions-item svg {
  flex: none;
  color: var(--message-actions-muted);
}

.message-actions-item:hover,
.message-actions-item[data-highlighted],
.message-actions-item[data-focused] {
  background: var(--message-actions-hover);
}

/* Labs: keyboard focus inside the menu shows as the hover background. */
.message-actions-item:focus-visible {
  outline: none;
}

.message-actions-rule {
  height: 0.5px;
  margin: 2px 0;
  background: var(--message-actions-line);
  /* Labs: React Aria draws the separator as an <hr>. */
  border: 0;
}

/* Labs: the popups take focus when they open (keyboard users land on their
   first item); the surface itself needs no ring. */
.message-actions-surface:focus-visible {
  outline: none;
}

.message-actions-danger,
.message-actions-danger svg {
  color: var(--message-actions-bad);
}

/* Upstream's own glyphs (the default style): the mouth and the wink. */
.message-actions-smile-play .message-actions-mouth-rest {
  opacity: 0;
}

.message-actions-smile-play .message-actions-mouth-happy {
  opacity: 1;
}

.message-actions-mouth-happy {
  opacity: 0;
}

.message-actions-eye-wink {
  opacity: 0;
}

.message-actions-smile-play .message-actions-eye-shut {
  animation: message-actions-wink-shut 560ms cubic-bezier(0.22, 1.2, 0.36, 1);
}

.message-actions-smile-play .message-actions-eye-wink {
  animation: message-actions-wink-line 560ms cubic-bezier(0.22, 1.2, 0.36, 1);
}

/* Labs ("icons" style): upstream swapped its own right eye for a wink line. Lucide's Smile
   draws the right eye as its first path, which turns into the same short
   horizontal line for the wink (Phosphor icons only hop). */
.message-actions-smile.lucide > path:first-child {
  transform-box: fill-box;
  transform-origin: center;
}

.message-actions-smile-play.lucide > path:first-child {
  animation: message-actions-wink 560ms cubic-bezier(0.22, 1.2, 0.36, 1);
}

@keyframes message-actions-thumb-up {
  0% { transform: none; }
  46% { transform: translateY(-1.5px) rotate(-6deg); }
  100% { transform: none; }
}

@keyframes message-actions-thumb-down {
  0% { transform: none; }
  46% { transform: translateY(1.5px) rotate(-6deg); }
  100% { transform: none; }
}

@keyframes message-actions-draw-check {
  from { stroke-dashoffset: 28; }
  to { stroke-dashoffset: 0; }
}

@keyframes message-actions-draw-check-reverse {
  from { stroke-dashoffset: -28; }
  to { stroke-dashoffset: 0; }
}

@keyframes message-actions-smile-hop {
  0% { transform: none; }
  45% { transform: translate(0.4px, -1px) rotate(-3deg); }
  100% { transform: none; }
}

@keyframes message-actions-wink-shut {
  0%, 6% { opacity: 1; }
  16%, 32% { opacity: 0; }
  42%, 100% { opacity: 1; }
}

@keyframes message-actions-wink-line {
  0%, 6% { opacity: 0; }
  16%, 32% { opacity: 1; }
  42%, 100% { opacity: 0; }
}

@keyframes message-actions-wink {
  0%, 6% { transform: none; }
  16%, 32% { transform: rotate(90deg) scaleY(2.4); }
  42%, 100% { transform: none; }
}

@keyframes message-actions-reply-grow {
  0%, 100% { transform: none; }
  46% { transform: scaleX(1.25); }
}

@keyframes message-actions-reply-head {
  0%, 100% { transform: none; }
  46% { transform: translateX(-12.5%); }
}

@keyframes message-actions-pop-in {
  from { opacity: 0; transform: translateY(4px) scale(0.96); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .message-actions-bump-up,
  .message-actions-bump-down,
  .message-actions-smile-play,
  .message-actions-smile-play.lucide > path:first-child,
  .message-actions-smile-play .message-actions-eye-shut,
  .message-actions-smile-play .message-actions-eye-wink,
  .message-actions-reply-play .message-actions-reply-shaft,
  .message-actions-reply-play .message-actions-reply-head,
  .message-actions-reply-play.lucide > path:first-child,
  .message-actions-reply-play.lucide > path:last-child,
  .message-actions-check path,
  .message-actions-copy-swap[data-on="true"] .message-actions-check path,
  .message-actions-tip,
  .message-actions-pop,
  .message-actions-picker,
  .message-actions-menu,
  .message-actions-emoji-out,
  .message-actions-reaction {
    animation: none;
  }
  .message-actions-min-roll-inner,
  .message-actions-ago {
    transition: none;
  }
  .message-actions-copy-mark,
  .message-actions-check,
  .message-actions-tip,
  .message-actions-tip-positioner {
    transition: none;
  }
  .message-actions-check path {
    stroke-dashoffset: 0;
  }
}

/* Labs: announces "Copied" and the chosen reaction to screen readers. */
.message-actions-status {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
`;
