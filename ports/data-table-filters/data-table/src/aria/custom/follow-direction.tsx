"use client";

import { useIsRtl } from "../hooks/use-is-rtl";
import type * as React from "react";
import { I18nProvider, isRTL, useLocale } from "react-aria-components";

/**
 * Keeps React Aria's reading direction in step with the page.
 *
 * React Aria takes the direction from its locale (an `I18nProvider`, or the
 * browser's language), not from `dir` on `<html>`, so on a page set to
 * `dir="rtl"` in an English browser a slider would still put its minimum on
 * the left and a calendar would still step left for "previous". When the two
 * disagree, this wraps its children in a locale that reads the page's way: the
 * page's `lang` when it does, otherwise Arabic for right to left and US English
 * for left to right. An app that sets its own `I18nProvider` to a locale
 * matching its `dir` never takes the fallback.
 */
export function FollowDirection({ children }: { children: React.ReactNode }) {
  const isRtl = useIsRtl();
  const { direction } = useLocale();

  if ((direction === "rtl") === isRtl) return <>{children}</>;

  return <I18nProvider locale={pageLocale(isRtl)}>{children}</I18nProvider>;
}

function pageLocale(rtl: boolean) {
  const lang =
    typeof document === "undefined" ? "" : document.documentElement.lang;
  if (lang && isRTL(lang) === rtl) return lang;
  return rtl ? "ar" : "en-US";
}
