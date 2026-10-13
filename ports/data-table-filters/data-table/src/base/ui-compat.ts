/**
 * Props whose names belong to the project's primitive library.
 *
 * This is the Base UI variant: the blocks resolve `ui/tooltip`,
 * `ui/hover-card` and friends from a project initialized with shadcn's Base UI
 * style, so every key below is a Base UI prop name. The Radix variant ships the
 * same exports with the Radix spellings, which keeps the shared block files
 * identical across variants.
 */

/**
 * Base UI: `delay` on the tooltip provider (Radix: `delayDuration`).
 *
 * Spread this on the `TooltipProvider`, never on the tooltip root: Base UI's
 * tooltip root has no delay prop.
 */
export const TOOLTIP_DELAY = { delay: 100 };

/**
 * Base UI: `disableHoverablePopup` on the tooltip root (Radix:
 * `disableHoverableContent`).
 */
export const TOOLTIP_NOT_HOVERABLE = { disableHoverablePopup: true };

/**
 * Base UI: `delay` / `closeDelay` on the preview card trigger, which is what
 * shadcn's Base UI `hover-card` is built on (Radix: `openDelay` / `closeDelay`
 * on the root).
 *
 * Spread this on the `HoverCardTrigger`.
 */
export const HOVER_CARD_DELAY = { delay: 0, closeDelay: 0 };
