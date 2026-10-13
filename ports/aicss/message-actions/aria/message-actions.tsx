"use client";

import { type ReactElement, useEffect, useRef, useState } from "react";
import {
  Button,
  Dialog,
  DialogTrigger,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Separator,
  ToggleButton,
  Toolbar,
  Tooltip,
  TooltipTrigger,
  TooltipTriggerStateContext,
} from "react-aria-components";
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
} from "./message-actions-shared";
import { messageActionsClassNames as styles } from "./message-actions-styles";

export type { MessageActionsProps } from "./message-actions-shared";

/**
 * Upstream's Cue (one button's tooltip) on React Aria's TooltipTrigger: it
 * opens on hover and keyboard focus with no delay, and stays up while the
 * button is pressed so the label can change in place ("Copy message" to
 * "Copied"), as upstream's does.
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
  const [open, setOpen] = useState(false);

  // While its popup is open the button's tooltip stays away, and it does not
  // come back when the popup closes unless the pointer or focus returns.
  useEffect(() => {
    if (quiet) setOpen(false);
  }, [quiet]);
  const [tipTheme, setTipTheme] = useState<"light" | "dark">("light");

  return (
    <span ref={ref} className={styles.hit}>
      <TooltipTrigger
        closeDelay={0}
        delay={0}
        isOpen={open && !quiet}
        shouldCloseOnPress={false}
        onOpenChange={(next) => {
          if (next) setTipTheme(messageActionsThemeOf(ref.current));
          setOpen(next);
        }}
      >
        {children}
        <Tooltip
          className={styles.tip}
          data-theme={tipTheme}
          offset={6}
          placement="top"
        >
          {label}
        </Tooltip>
      </TooltipTrigger>
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
  const timeRef = useRef<HTMLTimeElement>(null);
  const [timeTip, setTimeTip] = useState(false);
  const [timeTheme, setTimeTheme] = useState<"light" | "dark">("light");

  return (
    <>
      <MessageActionsStyle />
      <div ref={rootRef} className={styles.root} data-density={density}>
        <Cue label="Good response">
          <ToggleButton
            className={styles.btn}
            data-on={vote === "up"}
            isSelected={vote === "up"}
            aria-label="Good response"
            onChange={() => choose("up")}
          >
            <Good
              key={upN}
              className={`${styles.glyph} ${styles.voteUp} ${upN ? styles.bumpUp : ""}`}
              size={12}
            />
          </ToggleButton>
        </Cue>

        <Cue label="Bad response">
          <ToggleButton
            className={styles.btn}
            data-on={vote === "down"}
            isSelected={vote === "down"}
            aria-label="Bad response"
            onChange={() => choose("down")}
          >
            <Bad
              key={downN}
              className={`${styles.glyph} ${styles.glyphDown} ${styles.voteDown} ${downN ? styles.bumpDown : ""}`}
              size={12}
            />
          </ToggleButton>
        </Cue>

        <Cue label={copied ? "Copied" : "Copy message"}>
          <Button
            className={styles.btn}
            aria-label={copied ? "Copied" : "Copy message"}
            onPress={copy}
          >
            <span
              className={styles.copySwap}
              data-on={copied ? "true" : "false"}
            >
              <Copy
                className={`${styles.glyph} ${styles.copyMark}`}
                size={12}
              />
              <Copied className={`${styles.glyph} ${styles.check}`} size={12} />
            </span>
          </Button>
        </Cue>

        <DialogTrigger
          isOpen={panel === "react"}
          onOpenChange={(open) =>
            setPanel((value) =>
              open ? "react" : value === "react" ? null : value,
            )
          }
        >
          <Cue
            label={reaction ? `Reaction ${reaction}` : "Add reaction"}
            quiet={panel === "react"}
          >
            <Button
              className={styles.btn}
              data-on={panel === "react" || reaction !== null}
              aria-label={reaction ? `Reaction ${reaction}` : "Add reaction"}
              onPress={() => {
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
            </Button>
          </Cue>
          <Popover
            triggerRef={rootRef}
            placement="top start"
            offset={8}
            containerPadding={8}
          >
            <Dialog
              key={pickerOpen ? "picker" : "reactions"}
              {...(pickerOpen
                ? { "data-theme": messageActionsThemeOf(rootRef.current) }
                : messageActionsSurface(rootRef.current))}
              className={`${pickerOpen ? styles.picker : styles.pop} ${styles.surface}`}
              aria-label={pickerOpen ? "Search emoji" : "Add reaction"}
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
                <Toolbar className={styles.bar} aria-label="Reactions">
                  {REACTIONS.map((emoji) => (
                    <Button
                      key={emoji}
                      // React Aria's dialog focuses itself; the other
                      // primitives land on the first reaction, so this does too.
                      autoFocus={emoji === REACTIONS[0]}
                      className={styles.emoji}
                      data-on={reaction === emoji}
                      aria-label={emoji}
                      aria-pressed={reaction === emoji}
                      onPress={() => react(emoji)}
                    >
                      <span className={styles.mark}>{emoji}</span>
                    </Button>
                  ))}
                  {extra ? (
                    <Button
                      className={`${styles.emoji} ${extraOut ? styles.emojiOut : ""}`}
                      data-on={!extraOut && reaction === extra}
                      aria-label={extra}
                      aria-pressed={!extraOut && reaction === extra}
                      onPress={() => react(extra)}
                      onAnimationEnd={(event) => {
                        if (event.target !== event.currentTarget || !extraOut)
                          return;
                        setExtra(null);
                        setExtraOut(false);
                      }}
                    >
                      <span className={styles.mark}>{extra}</span>
                    </Button>
                  ) : null}
                  <Button
                    className={styles.moreEmoji}
                    data-on={pickerOpen}
                    aria-expanded={pickerOpen}
                    aria-label="Search emoji"
                    onPress={() => setPickerOpen((open) => !open)}
                  >
                    <AddEmoji size={16} />
                  </Button>
                </Toolbar>
              )}
            </Dialog>
          </Popover>
        </DialogTrigger>

        <Cue label="Reply">
          <Button className={styles.btn} aria-label="Reply" onPress={reply}>
            <Reply
              key={replyN}
              className={`${styles.glyph} ${styles.reply} ${replyN ? styles.replyPlay : ""}`}
              size={12}
            />
          </Button>
        </Cue>

        <span className={styles.slot}>
          <MenuTrigger
            isOpen={panel === "more"}
            onOpenChange={(open) =>
              setPanel((value) =>
                open ? "more" : value === "more" ? null : value,
              )
            }
          >
            <Cue label="More actions" quiet={panel === "more"}>
              <Button
                className={styles.btn}
                data-on={panel === "more"}
                aria-label="More actions"
              >
                <More className={styles.glyph} size={12} />
              </Button>
            </Cue>
            <Popover placement="top end" offset={8} containerPadding={8}>
              <Menu
                {...messageActionsSurface(rootRef.current)}
                className={`${styles.menu} ${styles.surface}`}
                onAction={(key) => more(key as "aloud" | "fork" | "report")}
              >
                <MenuItem
                  id="aloud"
                  className={styles.item}
                  textValue="Read aloud"
                >
                  <Aloud size={12} />
                  Read aloud
                </MenuItem>
                <MenuItem
                  id="fork"
                  className={styles.item}
                  textValue="Fork chat"
                >
                  <Fork size={12} />
                  Fork chat
                </MenuItem>
                <Separator className={styles.rule} />
                <MenuItem
                  id="report"
                  className={`${styles.item} ${styles.danger}`}
                  textValue="Report"
                >
                  <Report size={12} />
                  Report
                </MenuItem>
              </Menu>
            </Popover>
          </MenuTrigger>
        </span>

        {/* React Aria's TooltipTrigger needs a focusable, interactive trigger,
            and the timestamp is neither, so its tooltip opens on hover only,
            as upstream's does. */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a hover-only tooltip trigger, like upstream's Cue; the full date is also in the timestamp's visually hidden text. */}
        <span
          className={styles.hit}
          onMouseEnter={() => {
            setTimeTheme(messageActionsThemeOf(timeRef.current));
            setTimeTip(true);
          }}
          onMouseLeave={() => setTimeTip(false)}
        >
          <time
            ref={timeRef}
            className={styles.ago}
            dateTime={postedAt.toISOString()}
            // Labs: the default sentAt is relative to the clock, so the
            // server and client strings differ by a few milliseconds.
            suppressHydrationWarning
          >
            {elapsedMinutes(postedAt, now) >= 1 &&
            elapsedMinutes(postedAt, now) < 60 ? (
              <>
                <MinuteRoll value={String(elapsedMinutes(postedAt, now))} />m
                ago
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
          <TooltipTriggerStateContext.Provider
            value={{
              isOpen: timeTip,
              shouldSkipAnimation: false,
              open: () => setTimeTip(true),
              close: () => setTimeTip(false),
            }}
          >
            <Tooltip
              className={styles.tip}
              data-theme={timeTheme}
              offset={6}
              placement="top"
              triggerRef={timeRef}
            >
              {formatAbsolute(postedAt)}
            </Tooltip>
          </TooltipTriggerStateContext.Provider>
        </span>

        {/* Labs: tells screen readers that the copy worked. */}
        <span className={styles.status} role="status" aria-live="polite">
          {copied ? "Copied" : ""}
        </span>
      </div>
    </>
  );
}
