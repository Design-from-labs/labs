import {
  type BalloonsOptions,
  fadeBalloonsStill,
  holdBalloonsContainer,
  balloonsReduceMotion,
} from "./balloons-core";

// ---- upstream: src/textBalloons.ts ----
// Line for line, with these Labs changes (each also in the fidelity record):
// - No font ships. Upstream embeds the Sniglet typeface (SIL OFL-1.1, not on
//   this registry's license allowlist) as a base64 @font-face. The family is
//   read from `--balloons-font-family` on the container (or the root element),
//   falling back to the system's rounded or plain sans; `fontFace` takes an
//   @font-face rule to embed, the way upstream embeds Sniglet (see the docs).
// - The letters are escaped before they go into the SVG markup.
// - The options of balloons() (container, signal, reducedMotion), and the
//   layer is removed once the last letter has floated away (upstream leaves
//   its empty container in <body>). The returned promise resolves then.
// - Unused locals are dropped (totalLines, maxDepth, verticalProgress), so
//   the file compiles under noUnusedLocals.

export interface TextBalloonsOptions extends BalloonsOptions {
  /**
   * An @font-face rule to embed, for a web font. Each letter is drawn as an
   * SVG image, which cannot see the page's fonts, so the rule's `src` must be
   * a data: URL (balloonFontFace() makes one from a font file's URL).
   */
  fontFace?: string;
}

/** The family used when `--balloons-font-family` is not set. */
export const BALLOONS_FONT_FALLBACK = "ui-rounded, system-ui, sans-serif";

/**
 * Builds the @font-face rule `fontFace` takes from a font file's URL (fetched
 * once, inlined as a data: URL). Call it in the browser, then pass the result
 * with `--balloons-font-family` set to the same family.
 */
export async function balloonFontFace(
  family: string,
  url: string,
  descriptors = "font-weight: 100 900; font-style: normal;",
): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return `@font-face { font-family: "${family}"; ${descriptors} src: url(${dataUrl}); }`;
}

const BASE_SIZE = 324;
interface BalloonData {
  text: string;
  color: string;
  fontSize: number;
}

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function createTextBalloon(
  data: BalloonData,
  fontFamily: string,
  fontDefinition: string,
): HTMLElement {
  const balloon = document.createElement("text-balloon");

  // Create a temporary element to measure the text size
  const measureElement = document.createElement("span");
  // TODO: figure out line height that fits snugly around emojis without clipping them
  measureElement.style.cssText = `
    position: absolute;
    visibility: hidden;
    font-family: ${fontFamily};
    font-weight: bold;
    font-size: ${data.fontSize}px;
    line-height: 1;
    vertical-align: sub;
    white-space: nowrap;
    min-width: 1ch;
  `;
  measureElement.textContent = data.text;
  document.body.appendChild(measureElement);

  // Measure the text size
  const textWidth = measureElement.offsetWidth;
  const textHeight = measureElement.offsetHeight;

  // Remove the temporary element
  document.body.removeChild(measureElement);

  // Calculate SVG size with padding
  const padding = 20; // Adjust this value as needed
  const svgWidth = textWidth + padding * 1;
  const svgHeight = textHeight + padding * 1;
  const scaleAdjustment = BASE_SIZE / data.fontSize;

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${
      svgWidth * scaleAdjustment
    }" height="${svgHeight * scaleAdjustment}">
      <defs>
     <filter id="balloon" color-interpolation-filters="sRGB">
    <feMorphology in="SourceGraphic" operator="dilate" radius="5" result="dilated" />

    <feGaussianBlur in="dilated" stdDeviation="8" result="dilated-blur" />

    <feSpecularLighting in="dilated-blur" surfaceScale="20" specularConstant="3.05" specularExponent="20" lighting-color="#ffffff" result="outline-highlight">
      <feDistantLight azimuth="-20" elevation="12" />
    </feSpecularLighting>

     <feComposite in2="dilated" in="outline-highlight" operator="atop" result="outline-with-light" />


    <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />

    <feSpecularLighting in="blur" surfaceScale="14" specularConstant="1" specularExponent="35" lighting-color="#ffffff" result="highlight">
      <fePointLight x="400" y="-120" z="500"/>
    </feSpecularLighting>

    <feComposite in2="SourceGraphic" in="highlight" operator="atop" result="with-light" />

    <feColorMatrix in="SourceAlpha" type="matrix" values="1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 100 0" result="black" />
    <feOffset in="black" dx="-12" dy="12" result="offset" />

    <feComposite in2="black" in="offset" operator="out" result="clipped" />
    <feGaussianBlur in="clipped" stdDeviation="12" result="clipped-blur" />
    <feOffset in="clipped-blur" dx="12" dy="-12" result="offset-shadow" />
    <feComposite in="offset-shadow" in2="with-light" operator="atop" result="swa" />

    <feComposite in="outline-with-light" in2="SourceGraphic" operator="out" result="outline"/>
    <feComposite in2="outline" in="swa" operator="over"  />

  </filter>
        <style type="text/css">
        ${fontDefinition}
        </style>
      </defs>
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="${
        data.color
      }" font-size="${BASE_SIZE}px" font-family="${fontFamily.replaceAll('"', "'")}" font-weight="bold" filter="url(#balloon)">${
    escapeXml(data.text)
  }</text>
    </svg>
  `;

  // Use encodeURIComponent instead of btoa
  const encodedSVG = encodeURIComponent(svgContent);

  Object.assign(balloon.style, {
    position: "absolute",
    top: "100%",
    opacity: "0",
    width: `${svgWidth}px`,
    height: `${svgHeight}px`,
    fontSize: data.fontSize,
    lineHeight: "1",
    display: "inline-block",
    // background: "black",
    minWidth: "1ch",
  });

  const balloonContent = document.createElement("balloon-content");
  Object.assign(balloonContent.style, {
    display: "block",

    position: "absolute",
    left: "50%",
    top: "50%",
    width: `${svgWidth * scaleAdjustment}px`,
    height: `${svgHeight * scaleAdjustment}px`,
    transform: `translate(-50%, -50%) scale(${1 / scaleAdjustment})`,
    transformOrigin: "center",

    backgroundImage: `url("data:image/svg+xml,${encodedSVG}")`,
    backgroundSize: "contain",
  });
  balloon.appendChild(balloonContent);

  return balloon;
}

function animateBalloon(
  balloon: HTMLElement,
  zPosition: number,
  delay: number,
  // Labs: the scene height (upstream: 100vh).
  sceneHeight: string,
) {
  const duration = 5000 + Math.random() * 1500;
  const tiltYAmplitude = (Math.random() - 0.5) * 14; // Random tilt amplitude between -10 and 10 degrees
  const tiltZAmplitude = (Math.random() - 0.5) * 16; // Random tilt amplitude between -20 and 20 degrees
  const tiltFrequency = 1 + Math.random(); // Random frequency between 1 and 2
  const targetX = (Math.random() - 0.5) * 100; // Random target X position between -50 and 50

  const keyframes = new Array(101).fill(null).map((_, i) => {
    const progress = i / 100;
    const horizontalProgress = targetX * progress;
    const tiltY =
      Math.sin(progress * Math.PI * 2 * tiltFrequency) * tiltYAmplitude;
    const tiltZ =
      Math.cos(progress * Math.PI * 2 * tiltFrequency) * tiltZAmplitude;

    return {
      transform: `translate3d(${horizontalProgress}px, calc(-1 * (${sceneHeight} + 100%) * ${progress}), ${-zPosition}px) rotateY(${tiltY}deg) rotateZ(${tiltZ}deg)`,
      opacity: i === 0 ? 0 : 1,
    };
  });

  const animation = balloon.animate(keyframes, {
    duration,
    delay,
    easing: "linear",
    fill: "forwards",
  });

  animation.onfinish = () => balloon.remove();
  return animation;
}

/**
 * Floats a few lines of text up, one balloon per character. Resolves when
 * the last letter has floated away (a still frame under reduced motion).
 */
export function textBalloons(
  balloons: BalloonData[],
  options: TextBalloonsOptions = {},
): Promise<void> {
  // Labs: reduced motion, cancellation and containment.
  const reduce = balloonsReduceMotion();
  if ((reduce && options.reducedMotion === "skip") || options.signal?.aborted) {
    return Promise.resolve();
  }
  const host = options.container ?? null;
  const release = host ? holdBalloonsContainer(host) : () => {};
  const fontFamily =
    getComputedStyle(host ?? document.documentElement)
      .getPropertyValue("--balloons-font-family")
      .trim() || BALLOONS_FONT_FALLBACK;
  const fontDefinition = options.fontFace ?? "";

  const container = document.createElement("text-balloons");
  container.setAttribute("aria-hidden", "true");

  const textBalloonsStyle = document.createElement("style");
  textBalloonsStyle.innerHTML = fontDefinition;
  container.appendChild(textBalloonsStyle);

  Object.assign(container.style, {
    position: host ? "absolute" : "fixed",
    bottom: "0",
    left: "0",
    width: "100%",
    height: "100%",
    zIndex: "9999",
    pointerEvents: "none",
    perspective: "1000px",
    perspectiveOrigin: "50% 100%",

    // Shadows
    filter: "drop-shadow(-60px 60px 12px rgba(0, 0, 0, 0.25))",

    // Custom balloon font
    fontFamily,
    fontWeight: "bold",
  });

  (host ?? document.body).appendChild(container);
  const sceneHeight = host ? `${host.clientHeight}px` : "100vh";

  const lineDelay = 1000; // Delay between lines in milliseconds
  const charDelay = 100; // Delay between characters in milliseconds
  const charSpacing = 0.2; // Additional spacing between characters in ch units
  const animations: Animation[] = [];

  balloons.forEach((line, lineIndex) => {
    // Using segmenter to support emojis
    const chars = Array.from(new Intl.Segmenter().segment(line.text)).map(
      (segment) => segment.segment
    );
    // const zPosition = ((totalLines - lineIndex + 1) / totalLines) * maxDepth;
    const zPosition = 0;

    const lineBalloons = chars.map((char) => {
      const balloon = createTextBalloon(
        {
          text: char,
          color: line.color,
          fontSize: line.fontSize,
        },
        fontFamily,
        fontDefinition,
      );
      balloon.style.opacity = "0";
      container.appendChild(balloon);
      return balloon;
    });

    // Force a reflow
    container.offsetHeight;

    // Calculate total line width
    const lineWidthPx = lineBalloons.reduce(
      (sum, balloon) => sum + balloon.offsetWidth,
      0
    );
    const containerWidth = container.offsetWidth;
    const lineWidthPercent = (lineWidthPx / containerWidth) * 100;

    const startX = Math.max(
      0,
      Math.min(100 - lineWidthPercent, 50 - lineWidthPercent / 2)
    );

    let currentX = startX;

    lineBalloons.forEach((balloon, charIndex) => {
      const charWidthPercent = (balloon.offsetWidth / containerWidth) * 100;

      balloon.style.left = `${currentX}%`;

      animations.push(
        animateBalloon(
          balloon,
          zPosition,
          lineIndex * lineDelay + charIndex * charDelay,
          sceneHeight,
        ),
      );

      currentX += charWidthPercent + charSpacing;
    });
  });

  // Labs: one place that ends the release (finished, still frame or abort).
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      for (const animation of animations) animation.cancel();
      container.remove();
      release();
      options.signal?.removeEventListener("abort", finish);
      resolve();
    };
    options.signal?.addEventListener("abort", finish);
    if (reduce) {
      // One still frame, 3.2 s into the flight (the lines staggered up the
      // scene), faded in and out; nothing moves.
      for (const animation of animations) {
        animation.pause();
        animation.currentTime = 3200;
      }
      const fade = fadeBalloonsStill(container);
      animations.push(fade);
      fade.finished.then(finish, () => {});
      return;
    }
    Promise.all(animations.map((animation) => animation.finished)).then(
      finish,
      () => {},
    );
  });
}
