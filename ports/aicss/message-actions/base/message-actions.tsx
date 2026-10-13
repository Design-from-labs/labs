"use client";

import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import { Toolbar } from "@base-ui/react/toolbar";
import { Tooltip } from "@base-ui/react/tooltip";
import { type ReactElement, useEffect, useId, useRef, useState } from "react";
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

type CueState = {
  open: boolean;
  trigger: string | null;
  theme: "light" | "dark";
};

/**
 * Upstream's Cue: one tooltip shared by the whole row (a Base UI tooltip
 * handle with a trigger per button), so it glides from button to button and
 * stays up while a button is pressed, as upstream's single bubble does.
 */
function Cue({
  handle,
  id,
  label,
  children,
  quiet = false,
  describedBy,
}: {
  handle: Tooltip.Handle<string>;
  id: string;
  label: string;
  children: ReactElement;
  quiet?: boolean;
  describedBy?: string;
}) {
  return (
    <span className={styles.hit}>
      <Tooltip.Trigger
        aria-describedby={describedBy}
        closeOnClick={false}
        delay={0}
        disabled={quiet}
        handle={handle}
        id={id}
        payload={label}
        render={children}
      />
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
  const keepFocusAfterPointer = () => !pointer.current;
  const [handle] = useState(() => Tooltip.createHandle<string>());
  const [cue, setCue] = useState<CueState>({
    open: false,
    trigger: null,
    theme: "light",
  });
  const base = useId();
  const ids = {
    good: `${base}-good`,
    bad: `${base}-bad`,
    copy: `${base}-copy`,
    react: `${base}-react`,
    reply: `${base}-reply`,
    more: `${base}-more`,
    ago: `${base}-ago`,
  };
  const tipId = `${base}-tip`;
  const quietTrigger =
    panel === "react" ? ids.react : panel === "more" ? ids.more : null;
  const cueOpen =
    cue.open && (quietTrigger === null || cue.trigger !== quietTrigger);
  // While a popup is open its button's tooltip stays away, and it does not
  // come back when the popup closes unless the pointer or focus returns.
  useEffect(() => {
    if (quietTrigger) {
      setCue((current) =>
        current.trigger === quietTrigger
          ? { ...current, open: false }
          : current,
      );
    }
  }, [quietTrigger]);
  // Labs: Base UI does not link the trigger to the tooltip, so the button the
  // tooltip is showing for gets aria-describedby here.
  const describedBy = (id: string) =>
    cueOpen && cue.trigger === id ? tipId : undefined;

  return (
    <>
      <MessageActionsStyle />
      <div ref={rootRef} className={styles.root} data-density={density}>
        <Cue
          handle={handle}
          id={ids.good}
          label="Good response"
          describedBy={describedBy(ids.good)}
        >
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

        <Cue
          handle={handle}
          id={ids.bad}
          label="Bad response"
          describedBy={describedBy(ids.bad)}
        >
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

        <Cue
          handle={handle}
          id={ids.copy}
          label={copied ? "Copied" : "Copy message"}
          describedBy={describedBy(ids.copy)}
        >
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
              <Copied className={`${styles.glyph} ${styles.check}`} size={12} />
            </span>
          </button>
        </Cue>

        <Popover.Root
          open={panel === "react"}
          onOpenChange={(open) =>
            setPanel((value) =>
              open ? "react" : value === "react" ? null : value,
            )
          }
        >
          <Cue
            handle={handle}
            id={ids.react}
            label={reaction ? `Reaction ${reaction}` : "Add reaction"}
            quiet={panel === "react"}
            describedBy={describedBy(ids.react)}
          >
            <Popover.Trigger
              render={
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
              }
            />
          </Cue>
          <Popover.Portal>
            <Popover.Positioner
              anchor={rootRef}
              side="top"
              align="start"
              // Upstream clamps the picker into the viewport; Base UI's
              // default would swap it to end alignment instead.
              collisionAvoidance={{ align: "shift" }}
              sideOffset={8}
              collisionPadding={8}
            >
              <Popover.Popup
                key={pickerOpen ? "picker" : "reactions"}
                {...(pickerOpen
                  ? { "data-theme": messageActionsThemeOf(rootRef.current) }
                  : messageActionsSurface(rootRef.current))}
                className={`${pickerOpen ? styles.picker : styles.pop} ${styles.surface}`}
                finalFocus={keepFocusAfterPointer}
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
                  <Toolbar.Root className={styles.bar} aria-label="Reactions">
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
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>

        <Cue
          handle={handle}
          id={ids.reply}
          label="Reply"
          describedBy={describedBy(ids.reply)}
        >
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
          <Menu.Root
            modal={false}
            open={panel === "more"}
            onOpenChange={(open) =>
              setPanel((value) =>
                open ? "more" : value === "more" ? null : value,
              )
            }
          >
            <Cue
              handle={handle}
              id={ids.more}
              label="More actions"
              quiet={panel === "more"}
              describedBy={describedBy(ids.more)}
            >
              <Menu.Trigger
                render={
                  <button
                    type="button"
                    className={styles.btn}
                    data-on={panel === "more"}
                    aria-label="More actions"
                  >
                    <More className={styles.glyph} size={12} />
                  </button>
                }
              />
            </Cue>
            <Menu.Portal>
              <Menu.Positioner
                side="top"
                align="end"
                sideOffset={8}
                collisionPadding={8}
              >
                <Menu.Popup
                  {...messageActionsSurface(rootRef.current)}
                  className={`${styles.menu} ${styles.surface}`}
                  finalFocus={keepFocusAfterPointer}
                >
                  <Menu.Item
                    nativeButton
                    render={<button type="button" className={styles.item} />}
                    onClick={() => more("aloud")}
                  >
                    <Aloud size={12} />
                    Read aloud
                  </Menu.Item>
                  <Menu.Item
                    nativeButton
                    render={<button type="button" className={styles.item} />}
                    onClick={() => more("fork")}
                  >
                    <Fork size={12} />
                    Fork chat
                  </Menu.Item>
                  <Menu.Separator className={styles.rule} />
                  <Menu.Item
                    nativeButton
                    render={
                      <button
                        type="button"
                        className={`${styles.item} ${styles.danger}`}
                      />
                    }
                    onClick={() => more("report")}
                  >
                    <Report size={12} />
                    Report
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </span>

        <Cue
          handle={handle}
          id={ids.ago}
          label={formatAbsolute(postedAt)}
          describedBy={describedBy(ids.ago)}
        >
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
        </Cue>

        {/* Labs: tells screen readers that the copy worked. */}
        <span className={styles.status} role="status" aria-live="polite">
          {copied ? "Copied" : ""}
        </span>
      </div>

      <Tooltip.Root
        handle={handle}
        open={cueOpen}
        triggerId={cue.trigger}
        onOpenChange={(open, details) => {
          // A focus-opened tooltip may not report its trigger; the event
          // target is then the trigger itself.
          const target = details.event?.target;
          const trigger =
            details.trigger ??
            (target instanceof Element ? target.closest("[id]") : null);
          setCue((current) => ({
            open,
            trigger: trigger?.id ?? current.trigger,
            theme: trigger ? messageActionsThemeOf(trigger) : current.theme,
          }));
        }}
      >
        {({ payload }) => (
          <Tooltip.Portal>
            <Tooltip.Positioner
              className={styles.tipPositioner}
              side="top"
              sideOffset={6}
            >
              {/* Labs: Base UI's popup has no tooltip role of its own. */}
              <Tooltip.Popup
                id={tipId}
                role="tooltip"
                className={styles.tip}
                data-base-ui=""
                data-theme={cue.theme}
              >
                {payload}
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        )}
      </Tooltip.Root>
    </>
  );
}
