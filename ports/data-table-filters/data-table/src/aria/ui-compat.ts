/**
 * The React Aria spellings of the delays these blocks use.
 *
 * shadcn's `aria-nova` style builds `ui/tooltip` on React Aria's
 * `TooltipTrigger`, which takes the delay itself (and defaults it to 0 there),
 * so spread this on every `TooltipTrigger`. It keeps the 100 ms of the Radix
 * variant's `delayDuration`. React Aria tooltips close when the pointer leaves
 * the trigger, so there is no "not hoverable" switch to set.
 */
export const TOOLTIP_DELAY = { delay: 100 };

/**
 * The timestamp card opens on hover without a delay, like the Radix variant's
 * `openDelay: 0`. It closes after a short delay instead of 0 so the pointer can
 * cross the gap into the card, whose rows copy their value on click.
 */
export const HOVER_CARD_DELAY = { openDelay: 0, closeDelay: 100 };
