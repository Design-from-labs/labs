"use client";

import { DropdownMenu, Popover, Toolbar, Tooltip } from "radix-ui";
import { type ReactElement, useEffect, useRef, useState } from "react";
import {
  messageActionsElapsedMinutes as elapsedMinutes,
  messageActionsFormatAbsolute as formatAbsolute,
  messageActionsFormatAgo as formatAgo,
  type MessageActionsProps,
  MessageActionsStyle,
  MessageActionsMinuteRoll as MinuteRoll,
  messageActionsSurface,
  messageActionsThemeOf,
  messageActionsReactions as REACTIONS,
  useMessageActions,
  useMessageActionsPointerInput,
} from "./message-actions-shared";
import { messageActionsClassNames as styles } from "./message-actions-styles";

export type { MessageActionsProps } from "./message-actions-shared";

/**
 * Upstream's Cue (one button's tooltip) on Radix Tooltip: it opens on hover
 * and keyboard focus, and stays up while the button is pressed so the label
 * can change in place ("Copy message" to "Copied"), as upstream's does.
 */
function Cue({
  label,
  children,
  quiet = false,
}: {
  label: string;
  children: ReactElement;
  quiet?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const pressing = useRef(false);
  const [open, setOpen] = useState(false);

  // While its popup is open the button's tooltip stays away, and it does not
  // come back when the popup closes unless the pointer or focus returns.
  useEffect(() => {
    if (quiet) setOpen(false);
  }, [quiet]);
  const [tipTheme, setTipTheme] = useState<"light" | "dark">("light");

  return (
    <span ref={ref} className={styles.hit}>
      <Tooltip.Root
        open={open && !quiet}
        onOpenChange={(next) => {
          if (!next && pressing.current) return;
          if (next) setTipTheme(messageActionsThemeOf(ref.current));
          setOpen(next);
        }}
      >
        <Tooltip.Trigger
          asChild
          // Radix closes a tooltip when its trigger is pressed or clicked;
          // upstream keeps it up so the label can change in place.
          onPointerDown={() => {
            pressing.current = true;
          }}
          onClick={() => {
            pressing.current = true;
            setTimeout(() => {
              pressing.current = false;
            });
          }}
          onPointerLeave={() => {
            pressing.current = false;
          }}
        >
          {children}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className={styles.tip}
            data-theme={tipTheme}
            side="top"
            sideOffset={6}
          >
            {label}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </span>
  );
}

export function MessageActions(props: MessageActionsProps) {
  const {
    vote,
    copied,
    panel,
    setPanel,
    pickerOpen,
    setPickerOpen,
    query,
    setQuery,
    reaction,
    extra,
    setExtra,
    extraOut,
    setExtraOut,
    upN,
    downN,
    smileN,
    setSmileN,
    replyN,
    icon,
    searchRef,
    postedAt,
    now,
    mounted,
    density,
    choose,
    copy,
    react,
    emojiGroups,
    reply,
    more,
  } = useMessageActions(props);
  const Good = icon.good;
  const Bad = icon.bad;
  const Copy = icon.copy;
  const Copied = icon.copied;
  const Smile = icon.smile;
  const Reply = icon.reply;
  const More = icon.more;
  const Aloud = icon.aloud;
  const Fork = icon.fork;
  const Report = icon.report;
  const Search = icon.search;
  const AddEmoji = icon.addEmoji;
  const rootRef = useRef<HTMLDivElement>(null);
  const pointer = useMessageActionsPointerInput();
  const keepFocusAfterPointer = (event: Event) => {
    if (pointer.current) event.preventDefault();
  };

  return (
    <Tooltip.Provider delayDuration={0}>
      <MessageActionsStyle />
      <Popover.Root
        open={panel === "react"}
        onOpenChange={(open) =>
          setPanel((value) =>
            open ? "react" : value === "react" ? null : value,
          )
        }
      >
        <Popover.Anchor asChild>
          <div ref={rootRef} className={styles.root} data-density={density}>
            <Cue label="Good response">
              <button
                type="button"
                className={styles.btn}
                data-on={vote === "up"}
                aria-pressed={vote === "up"}
                aria-label="Good response"
                onClick={() => choose("up")}
              >
                <Good
                  key={upN}
                  className={`${styles.glyph} ${styles.voteUp} ${upN ? styles.bumpUp : ""}`}
                  size={12}
                />
              </button>
            </Cue>

            <Cue label="Bad response">
              <button
                type="button"
                className={styles.btn}
                data-on={vote === "down"}
                aria-pressed={vote === "down"}
                aria-label="Bad response"
                onClick={() => choose("down")}
              >
                <Bad
                  key={downN}
                  className={`${styles.glyph} ${styles.glyphDown} ${styles.voteDown} ${downN ? styles.bumpDown : ""}`}
                  size={12}
                />
              </button>
            </Cue>

            <Cue label={copied ? "Copied" : "Copy message"}>
              <button
                type="button"
                className={styles.btn}
                aria-label={copied ? "Copied" : "Copy message"}
                onClick={copy}
              >
                <span
                  className={styles.copySwap}
                  data-on={copied ? "true" : "false"}
                >
                  <Copy
                    className={`${styles.glyph} ${styles.copyMark}`}
                    size={12}
                  />
                  <Copied
                    className={`${styles.glyph} ${styles.check}`}
                    size={12}
                  />
                </span>
              </button>
            </Cue>

            <Cue
              label={reaction ? `Reaction ${reaction}` : "Add reaction"}
              quiet={panel === "react"}
            >
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className={styles.btn}
                  data-on={panel === "react" || reaction !== null}
                  aria-label={
                    reaction ? `Reaction ${reaction}` : "Add reaction"
                  }
                  onClick={() => {
                    setSmileN((n) => n + 1);
                  }}
                >
                  {reaction ? (
                    <span
                      key={reaction}
                      className={`${styles.reaction} ${styles.mark}`}
                      aria-hidden="true"
                    >
                      {reaction}
                    </span>
                  ) : (
                    <Smile
                      key={smileN}
                      className={`${styles.glyph} ${styles.smile} ${smileN ? styles.smilePlay : ""}`}
                      size={12}
                    />
                  )}
                </button>
              </Popover.Trigger>
            </Cue>

            <Cue label="Reply">
              <button
                type="button"
                className={styles.btn}
                aria-label="Reply"
                onClick={reply}
              >
                <Reply
                  key={replyN}
                  className={`${styles.glyph} ${styles.reply} ${replyN ? styles.replyPlay : ""}`}
                  size={12}
                />
              </button>
            </Cue>

            <span className={styles.slot}>
              <DropdownMenu.Root
                modal={false}
                open={panel === "more"}
                onOpenChange={(open) =>
                  setPanel((value) =>
                    open ? "more" : value === "more" ? null : value,
                  )
                }
              >
                <Cue label="More actions" quiet={panel === "more"}>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      className={styles.btn}
                      data-on={panel === "more"}
                      aria-label="More actions"
                    >
                      <More className={styles.glyph} size={12} />
                    </button>
                  </DropdownMenu.Trigger>
                </Cue>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    {...messageActionsSurface(rootRef.current)}
                    className={`${styles.menu} ${styles.surface}`}
                    onCloseAutoFocus={keepFocusAfterPointer}
                    side="top"
                    align="end"
                    sideOffset={8}
                    collisionPadding={8}
                  >
                    <DropdownMenu.Item asChild onSelect={() => more("aloud")}>
                      <button type="button" className={styles.item}>
                        <Aloud size={12} />
                        Read aloud
                      </button>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild onSelect={() => more("fork")}>
                      <button type="button" className={styles.item}>
                        <Fork size={12} />
                        Fork chat
                      </button>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className={styles.rule} />
                    <DropdownMenu.Item asChild onSelect={() => more("report")}>
                      <button
                        type="button"
                        className={`${styles.item} ${styles.danger}`}
                      >
                        <Report size={12} />
                        Report
                      </button>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </span>

            <Cue label={formatAbsolute(postedAt)}>
              <time
                className={styles.ago}
                dateTime={postedAt.toISOString()}
                // Labs: the default sentAt is relative to the clock, so the
                // server and client strings differ by a few milliseconds.
                suppressHydrationWarning
              >
                {elapsedMinutes(postedAt, now) >= 1 &&
                elapsedMinutes(postedAt, now) < 60 ? (
                  <>
                    <MinuteRoll value={String(elapsedMinutes(postedAt, now))} />
                    m ago
                  </>
                ) : (
                  formatAgo(postedAt, now)
                )}
                {/* Labs: screen readers get the full date the tooltip shows on hover. */}
                {mounted ? (
                  <span className={styles.status}>
                    , {formatAbsolute(postedAt)}
                  </span>
                ) : null}
              </time>
            </Cue>

            {/* Labs: tells screen readers that the copy worked. */}
            <span className={styles.status} role="status" aria-live="polite">
              {copied ? "Copied" : ""}
            </span>
          </div>
        </Popover.Anchor>

        <Popover.Portal>
          <Popover.Content
            key={pickerOpen ? "picker" : "reactions"}
            {...(pickerOpen
              ? { "data-theme": messageActionsThemeOf(rootRef.current) }
              : messageActionsSurface(rootRef.current))}
            className={`${pickerOpen ? styles.picker : styles.pop} ${styles.surface}`}
            onCloseAutoFocus={keepFocusAfterPointer}
            aria-label={pickerOpen ? "Search emoji" : "Add reaction"}
            side="top"
            align="start"
            sideOffset={8}
            collisionPadding={8}
          >
            {pickerOpen ? (
              <>
                <label className={styles.search}>
                  <Search size={16} />
                  <input
                    ref={searchRef}
                    value={query}
                    placeholder="Search emoji"
                    aria-label="Search emoji"
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <div className={styles.pickerScroll}>
                  {emojiGroups.length === 0 ? (
                    <p className={styles.empty}>No emoji found</p>
                  ) : (
                    emojiGroups.map((group) => (
                      <section key={group.label}>
                        <p className={styles.groupLabel}>{group.label}</p>
                        <div className={styles.grid}>
                          {group.items.map(([emoji]) => (
                            <button
                              key={emoji}
                              type="button"
                              className={styles.cell}
                              data-on={reaction === emoji}
                              aria-label={emoji}
                              aria-pressed={reaction === emoji}
                              onClick={() => react(emoji)}
                            >
                              <span className={styles.mark}>{emoji}</span>
                            </button>
                          ))}
                        </div>
                      </section>
                    ))
                  )}
                </div>
              </>
            ) : (
              <Toolbar.Root className={styles.bar} aria-label="Reactions" loop>
                {REACTIONS.map((emoji) => (
                  <Toolbar.Button
                    key={emoji}
                    type="button"
                    className={styles.emoji}
                    data-on={reaction === emoji}
                    aria-label={emoji}
                    aria-pressed={reaction === emoji}
                    onClick={() => react(emoji)}
                  >
                    <span className={styles.mark}>{emoji}</span>
                  </Toolbar.Button>
                ))}
                {extra ? (
                  <Toolbar.Button
                    type="button"
                    className={`${styles.emoji} ${extraOut ? styles.emojiOut : ""}`}
                    data-on={!extraOut && reaction === extra}
                    aria-label={extra}
                    aria-pressed={!extraOut && reaction === extra}
                    onClick={() => react(extra)}
                    onAnimationEnd={(event) => {
                      if (event.target !== event.currentTarget || !extraOut)
                        return;
                      setExtra(null);
                      setExtraOut(false);
                    }}
                  >
                    <span className={styles.mark}>{extra}</span>
                  </Toolbar.Button>
                ) : null}
                <Toolbar.Button
                  type="button"
                  className={styles.moreEmoji}
                  data-on={pickerOpen}
                  aria-expanded={pickerOpen}
                  aria-label="Search emoji"
                  onClick={() => setPickerOpen((open) => !open)}
                >
                  <AddEmoji size={16} />
                </Toolbar.Button>
              </Toolbar.Root>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </Tooltip.Provider>
  );
}
