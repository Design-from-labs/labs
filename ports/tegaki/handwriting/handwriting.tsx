"use client";

import type * as React from "react";
import caveat from "tegaki/fonts/caveat";
import {
  TegakiRenderer,
  type TegakiRendererHandle,
  type TegakiRendererProps,
} from "tegaki/react";

type HandwritingProps = Omit<TegakiRendererProps<"div">, "font"> & {
  /**
   * A Tegaki font bundle. Defaults to Caveat (SIL Open Font License 1.1),
   * bundled with the `tegaki` package. Generate other bundles in the Tegaki
   * studio; a bundle carries its font's license, so use OFL or similarly
   * licensed fonts.
   */
  font?: TegakiRendererProps<"div">["font"];
  ref?: React.Ref<TegakiRendererHandle>;
};

/**
 * Text that writes itself, stroke by stroke, in a handwriting font. A thin
 * wrapper over Tegaki's renderer: it picks an OFL font by default and follows
 * the user's reduced-motion setting (the finished text appears at once). The
 * text stays real, selectable text for screen readers and search; the drawing
 * is decorative.
 *
 * Complex shaping (ligatures, contextual alternates, Arabic and Indic
 * scripts) is opt-in through `harfbuzzjs`; the item's docs show how.
 */
function Handwriting({
  font = caveat,
  reducedMotion = "user",
  ...props
}: HandwritingProps) {
  return (
    <TegakiRenderer
      data-slot="handwriting"
      font={font}
      reducedMotion={reducedMotion}
      {...props}
    />
  );
}

export { Handwriting, type HandwritingProps };
