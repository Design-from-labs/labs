// The specimen wall's loops (docs/decisions/0020-specimen-loops.md).
//
// Each tile's specimen plays a short script of fake states on repeat:
// data-loop="hover press focus" on one of its controls, which the site's
// hover:, active: and focus-visible: variants answer to (src/styles/global.css),
// plus React Aria's data-hovered, data-pressed and data-focus-visible. Never
// real input. A `click` step calls the control's click() on a hydrated
// specimen.
//
// Only tiles in view play. They stop offscreen, in a hidden tab, under
// reduced motion, and while the visitor's "Pause animations" toggle is on
// (WCAG 2.2.2; remembered in localStorage). A paused specimen carries
// data-loop-paused, which also pauses its CSS animations and lets a demo with
// its own timer skip a step. Starts are staggered so the wall does not move
// in step. Clicking a tile freezes its frame, so the morph expands that frame.

const PAUSED_KEY = "labs:specimens-paused";
const CONTROLS =
  'button, a[href], input, select, textarea, [role="button"], [role="switch"], [role="tab"], [role="checkbox"], [role="slider"], [role="menuitem"]';
const STEP =
  /^(hover|press|release|focus|blur|click|idle|wait|spot)(?:\[(\d{1,2})\])?$/;
const MAX_DEFAULT_TARGETS = 3;

type Kind =
  | "hover"
  | "press"
  | "release"
  | "focus"
  | "blur"
  | "click"
  | "idle"
  | "wait"
  | "spot";
type Step = { kind: Kind; index: number };

function parse(script: string): Step[] {
  return script
    .split(/\s*(?:→|->)\s*/)
    .map((token) => STEP.exec(token.trim()))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({ kind: match[1] as Kind, index: Number(match[2] ?? 0) }));
}

function readPaused(): boolean {
  try {
    return localStorage.getItem(PAUSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writePaused(paused: boolean) {
  try {
    if (paused) {
      localStorage.setItem(PAUSED_KEY, "1");
    } else {
      localStorage.removeItem(PAUSED_KEY);
    }
  } catch {
    // Storage can be blocked; the toggle still works for this visit.
  }
}

function setToken(el: Element, token: string, on: boolean) {
  const tokens = new Set(
    (el.getAttribute("data-loop") ?? "").split(" ").filter(Boolean),
  );
  if (on) {
    tokens.add(token);
  } else {
    tokens.delete(token);
  }
  if (tokens.size > 0) {
    el.setAttribute("data-loop", [...tokens].join(" "));
  } else {
    el.removeAttribute("data-loop");
  }
  // React Aria Components style their states with data attributes.
  const aria: Record<string, string> = {
    hover: "data-hovered",
    press: "data-pressed",
    focus: "data-focus-visible",
  };
  const name = aria[token];
  if (name && el.closest("[data-rac], [data-react-aria-pressable]") !== null) {
    if (on) {
      el.setAttribute(name, "true");
    } else {
      el.removeAttribute(name);
    }
  }
}

class Loop {
  readonly tile: HTMLElement;
  readonly surface: HTMLElement;
  private readonly authored: Step[] | null;
  private readonly duration: number;
  private readonly stagger: number;
  private steps: Step[] = [];
  private timer = 0;
  private position = 0;
  private started = false;
  running = false;
  visible = false;
  frozen = false;

  constructor(surface: HTMLElement, order: number) {
    this.surface = surface;
    this.tile = surface.closest<HTMLElement>("[data-tile]") ?? surface;
    let spec: { script?: string | null; duration?: number } = {};
    try {
      spec = JSON.parse(surface.dataset.loop ?? "{}");
    } catch {
      spec = {};
    }
    this.authored = spec.script ? parse(spec.script) : null;
    this.duration = Math.min(20_000, Math.max(1500, spec.duration ?? 4000));
    // Golden-ratio offsets spread the starts evenly over one cycle.
    this.stagger = Math.round(((order * 0.618_034) % 1) * this.duration * 0.6);
  }

  /** The document the specimen lives in: a stage's iframe, or the page. */
  private root(): ParentNode | null {
    const frame = this.surface.querySelector<HTMLIFrameElement>(
      "iframe[data-stage-frame]",
    );
    if (!frame) {
      return this.surface;
    }
    return frame.contentDocument?.body ?? null;
  }

  private frameRoot(): HTMLElement | null {
    const frame = this.surface.querySelector<HTMLIFrameElement>(
      "iframe[data-stage-frame]",
    );
    return frame?.contentDocument?.documentElement ?? null;
  }

  private controls(): Element[] {
    const root = this.root();
    return root ? [...root.querySelectorAll(CONTROLS)] : [];
  }

  /** Leaf groups for the spotlight: the first level with several children. */
  private spots(): Element[] {
    let node: Element | null = this.root() as Element | null;
    for (let depth = 0; node && depth < 6; depth += 1) {
      const children = [...node.children].filter(
        (c) => !(c instanceof HTMLScriptElement),
      );
      if (children.length > 1) {
        return children;
      }
      node = children[0] ?? null;
    }
    return [];
  }

  private animations(): Animation[] {
    const root = this.root();
    if (!root) {
      return [];
    }
    const target =
      root instanceof Document ? root.documentElement : (root as Element);
    return target.getAnimations?.({ subtree: true }) ?? [];
  }

  /** The script to play: the authored one, else a default for this specimen. */
  private resolve(): Step[] {
    if (this.authored) {
      return this.authored;
    }
    // A specimen that already animates (a pure CSS animation) keeps its own.
    if (
      this.animations().some(
        (a) =>
          a.effect?.getComputedTiming().iterations === Number.POSITIVE_INFINITY,
      )
    ) {
      return [];
    }
    const controls = this.controls().length;
    if (controls > 0) {
      return Array.from(
        { length: Math.min(controls, MAX_DEFAULT_TARGETS) },
        (_, index) => [
          { kind: "hover" as const, index },
          { kind: "idle" as const, index: 0 },
        ],
      ).flat();
    }
    const spots = this.spots();
    for (const spot of spots) {
      spot.setAttribute("data-spot", "");
    }
    return spots.length > 1
      ? spots.map((_, index) => ({ kind: "spot" as const, index }))
      : [];
  }

  private clear() {
    const root = this.root();
    if (!root) {
      return;
    }
    for (const el of root.querySelectorAll("[data-loop]")) {
      for (const token of ["hover", "press", "focus", "spot"]) {
        setToken(el, token, false);
      }
    }
  }

  private apply(step: Step) {
    if (step.kind === "wait") {
      return;
    }
    if (step.kind === "idle") {
      this.clear();
      return;
    }
    if (step.kind === "spot") {
      const spots = this.spots();
      for (const [index, spot] of spots.entries()) {
        setToken(spot, "spot", index === step.index);
      }
      return;
    }
    const target = this.controls()[step.index];
    if (!target) {
      return;
    }
    switch (step.kind) {
      case "hover":
        this.clear();
        setToken(target, "hover", true);
        break;
      case "press":
        setToken(target, "hover", true);
        setToken(target, "press", true);
        break;
      case "release":
        setToken(target, "press", false);
        break;
      case "focus":
        setToken(target, "focus", true);
        break;
      case "blur":
        setToken(target, "focus", false);
        break;
      case "click": {
        // The specimen sits inside the tile's link: a click bubbling up to it
        // would follow the link. The component's own handlers have run by
        // the time it reaches the tile, so cancelling there only stops the
        // navigation (docs/pitfalls.md, P-050).
        const stay = (event: Event) => event.preventDefault();
        this.tile.addEventListener("click", stay);
        (target as HTMLElement).click?.();
        this.tile.removeEventListener("click", stay);
        break;
      }
    }
  }

  private markPaused(paused: boolean) {
    for (const el of [this.surface, this.frameRoot()]) {
      if (!el) {
        continue;
      }
      if (paused) {
        el.setAttribute("data-loop-paused", "");
      } else {
        el.removeAttribute("data-loop-paused");
      }
    }
    for (const animation of this.animations()) {
      if (paused) {
        animation.pause();
      } else if (animation.playState === "paused") {
        animation.play();
      }
    }
    this.surface.toggleAttribute(
      "data-spotlight",
      !paused && this.steps[0]?.kind === "spot",
    );
  }

  private tick = () => {
    if (!this.running || this.steps.length === 0) {
      return;
    }
    this.apply(this.steps[this.position % this.steps.length]);
    this.position += 1;
    this.timer = window.setTimeout(
      this.tick,
      this.duration / this.steps.length,
    );
  };

  start() {
    if (this.running) {
      return;
    }
    this.running = true;
    this.steps = this.resolve();
    this.markPaused(false);
    this.surface.dataset.loopState = "playing";
    const delay = this.started ? 0 : this.stagger;
    this.started = true;
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(this.tick, delay);
  }

  stop(clear = true) {
    window.clearTimeout(this.timer);
    this.running = false;
    this.markPaused(true);
    if (clear) {
      this.clear();
    }
    this.surface.dataset.loopState = this.frozen ? "frozen" : "paused";
  }

  /** Holds the current frame for the morph into the component page. */
  freeze() {
    this.frozen = true;
    this.stop(false);
  }
}

/**
 * Contain, never crop (decision 0019): scale a specimen down until it fits
 * its tile's padding box. Reads every size first, then writes, and runs again
 * whenever a tile or a specimen changes size (a hydrated island, a font).
 */
function fitSpecimens() {
  const wrappers = [
    ...document.querySelectorAll<HTMLElement>("[data-specimen-fit]"),
  ];
  const fit = () => {
    const scales = wrappers.map((wrapper) => {
      const surface = wrapper.parentElement;
      if (!surface) {
        return 1;
      }
      const pad = Number.parseFloat(getComputedStyle(surface).paddingTop) || 0;
      const availWidth = surface.clientWidth - 2 * pad;
      const availHeight = surface.clientHeight - 2 * pad;
      const width = Math.max(wrapper.scrollWidth, wrapper.offsetWidth);
      const height = Math.max(wrapper.scrollHeight, wrapper.offsetHeight);
      if (width === 0 || height === 0) {
        return 1;
      }
      return Math.min(1, availWidth / width, availHeight / height);
    });
    for (const [index, wrapper] of wrappers.entries()) {
      const scale = Math.max(0.2, scales[index]);
      wrapper.style.setProperty("--fit", scale.toFixed(4));
      wrapper.dataset.fit = scale < 0.999 ? "scaled" : "natural";
    }
  };
  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(fit);
  };
  const observer = new ResizeObserver(schedule);
  for (const wrapper of wrappers) {
    observer.observe(wrapper);
    if (wrapper.parentElement) {
      observer.observe(wrapper.parentElement);
    }
    // A specimen whose content grows inside a fixed box (a hydrated demo).
    // An Astro island is display: contents, so watch what it renders.
    for (const child of wrapper.querySelectorAll(
      ":scope > :not(astro-island), :scope > astro-island > *",
    )) {
      observer.observe(child);
    }
  }
  document.fonts?.ready.then(schedule);
  fit();
}
fitSpecimens();

const surfaces = [...document.querySelectorAll<HTMLElement>("[data-specimen]")];
if (surfaces.length > 0) {
  const loops = surfaces.map((surface, order) => new Loop(surface, order));
  const byTile = new Map(loops.map((loop) => [loop.tile, loop]));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const toggle = document.querySelector<HTMLButtonElement>(
    "[data-loops-toggle]",
  );
  let userPaused = readPaused();

  const playable = (loop: Loop) =>
    loop.visible &&
    !loop.frozen &&
    !userPaused &&
    !reduce.matches &&
    document.visibilityState === "visible";

  const update = () => {
    document.documentElement.toggleAttribute("data-loops-paused", userPaused);
    toggle?.setAttribute("aria-pressed", userPaused ? "true" : "false");
    for (const loop of loops) {
      if (playable(loop)) {
        loop.start();
      } else if (loop.running) {
        loop.stop();
      }
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const loop = byTile.get(entry.target as HTMLElement);
        if (loop) {
          loop.visible = entry.isIntersecting;
        }
      }
      update();
    },
    { threshold: 0.2 },
  );
  for (const loop of loops) {
    observer.observe(loop.tile);
    // A stage's iframe document arrives later; restart against it.
    loop.surface.querySelector("iframe")?.addEventListener("load", () => {
      if (loop.running) {
        loop.stop();
      }
      update();
    });
  }

  toggle?.addEventListener("click", () => {
    userPaused = !userPaused;
    writePaused(userPaused);
    update();
  });
  reduce.addEventListener("change", update);
  document.addEventListener("visibilitychange", update);

  // Freeze the clicked tile before the page is captured for the morph.
  const freeze = (event: Event) => {
    const tile = (event.target as Element | null)?.closest<HTMLElement>(
      "[data-tile]",
    );
    const loop = tile ? byTile.get(tile) : undefined;
    if (!loop) {
      return;
    }
    if (event instanceof KeyboardEvent && event.key !== "Enter") {
      return;
    }
    loop.freeze();
  };
  document.addEventListener("pointerdown", freeze, { capture: true });
  document.addEventListener("keydown", freeze, { capture: true });

  // Back from a component page (back/forward cache): play again.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      for (const loop of loops) {
        loop.frozen = false;
      }
      update();
    }
  });

  update();
}
