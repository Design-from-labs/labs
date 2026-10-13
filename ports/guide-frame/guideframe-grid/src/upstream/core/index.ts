import {
  canUseDOM,
  DEFAULT_BREAKPOINTS,
  DEFAULT_COLOR,
  DEFAULT_COLUMNS,
  DEFAULT_GUIDES_STORAGE_KEY,
  DEFAULT_GUTTER,
  DEFAULT_MARGIN,
  DEFAULT_OPACITY,
  DEFAULT_PANEL_POSITION_STORAGE_KEY,
  DEFAULT_PANEL_STORAGE_KEY,
  DEFAULT_RULER_SIZE,
  DEFAULT_SNAP_THRESHOLD,
  DEFAULT_STORAGE_KEY,
  DEFAULT_Z_INDEX,
  getBreakpoint,
  getViewportHeight,
  getViewportWidth,
  isEditableTarget,
  isProduction,
  ROOT_ATTRIBUTE,
  resolveResponsiveValue,
  safeRead,
  safeWrite,
} from "./env";
import {
  columnEdges,
  computeGridGeometry,
  describeElement,
  elementEdges,
  type GridGeometry,
  pickClosest,
  type SnapCandidate,
} from "./geometry";
import { createGuideId, readGuides, writeGuides } from "./guides-store";
import { OVERLAY_STYLES } from "./styles";
import type {
  Breakpoint,
  Guide,
  GuideAxis,
  GuideframeInstance,
  GuideframeOptions,
  RulerOptions,
  SnapOptions,
} from "./types";

export { createGuideId } from "./guides-store";
export * from "./types";

const NOOP_INSTANCE: GuideframeInstance = {
  update: () => {},
  destroy: () => {},
  setVisible: () => {},
  isVisible: () => false,
  getGuides: () => [],
  setGuides: () => {},
  clearGuides: () => {},
  setPanelOpen: () => {},
  isPanelOpen: () => false,
};

/** Live instances, so stale roots from HMR can be told apart from real ones. */
const liveRoots = new Set<HTMLElement>();

function normaliseRulers(rulers: GuideframeOptions["rulers"]): Required<RulerOptions> | null {
  if (!rulers) return null;
  const value = rulers === true ? {} : rulers;
  return {
    size: value.size ?? DEFAULT_RULER_SIZE,
    step: value.step ?? 100,
  };
}

function normaliseSnap(snap: GuideframeOptions["snap"]): Required<SnapOptions> | null {
  if (snap === false) return null;
  const value = snap === true || snap === undefined ? {} : snap;
  return {
    elements: value.elements ?? true,
    columns: value.columns ?? true,
    guides: value.guides ?? true,
    threshold: value.threshold ?? DEFAULT_SNAP_THRESHOLD,
  };
}

function createPanelButton(label: string, shortcut = "", keyshortcuts = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "gf-panel-row";
  // Design From Labs port: the visible hint is decorative; assistive
  // technology gets the shortcut from `aria-keyshortcuts` (set in renderPanel
  // while shortcuts are enabled), so the accessible name is just the label.
  if (keyshortcuts) {
    button.dataset.gfKeys = keyshortcuts;
    button.dataset.gfHint = shortcut;
  }

  const text = document.createElement("span");
  text.textContent = label;
  const key = document.createElement("kbd");
  key.textContent = shortcut;
  key.setAttribute("aria-hidden", "true");
  const toggle = document.createElement("span");
  toggle.className = "gf-panel-toggle";
  toggle.setAttribute("aria-hidden", "true");
  button.append(text, key, toggle);
  return button;
}

function modifierLabel() {
  const platform = typeof navigator !== "undefined" ? navigator.platform || "" : "";
  return /Mac|iPhone|iPad/.test(platform) ? "⌘" : "Ctrl+";
}

/** Design From Labs port: the modifier as an `aria-keyshortcuts` key name. */
function modifierKey() {
  const platform = typeof navigator !== "undefined" ? navigator.platform || "" : "";
  return /Mac|iPhone|iPad/.test(platform) ? "Meta" : "Control";
}

function scrollLeft() {
  return window.scrollX ?? window.pageXOffset ?? 0;
}

function scrollTop() {
  return window.scrollY ?? window.pageYOffset ?? 0;
}

export function createGuideframe(initialOptions: GuideframeOptions = {}): GuideframeInstance {
  if (!canUseDOM()) return NOOP_INSTANCE;

  let options: GuideframeOptions = { ...initialOptions };
  // Design From Labs port: `enabled` overrides upstream's production gate.
  if (options.enabled === false) return NOOP_INSTANCE;
  if (options.enabled !== true && isProduction() && !options.forceVisibleInProduction) {
    return NOOP_INSTANCE;
  }

  // ------------------------------------------------------------- host DOM --
  // Any root left behind by a hot reload belongs to a module instance that is
  // already gone; removing it prevents overlays stacking up during dev.
  document.querySelectorAll<HTMLElement>(`[${ROOT_ATTRIBUTE}]`).forEach((stale) => {
    if (!liveRoots.has(stale)) stale.remove();
  });

  const host = document.createElement("div");
  host.setAttribute(ROOT_ATTRIBUTE, "");
  // Mounted on <body> by default so a transformed ancestor can't break
  // `position: fixed`, and so the host app's layout never reflows around it.
  // `display: contents` makes the host generate no box at all, so it adds no
  // layout of its own *and* leaves the overlay root's containing block as the
  // mount target — a positioned container when scoped, the viewport when fixed.
  host.style.cssText = "display:contents;";
  const mountTarget = options.container ?? document.body;
  const shadow = host.attachShadow({ mode: "open" });

  const styleEl = document.createElement("style");
  styleEl.textContent = OVERLAY_STYLES;
  shadow.append(styleEl);

  const root = document.createElement("div");
  root.className = "gf-root";
  shadow.append(root);

  const gridLayer = document.createElement("div");
  gridLayer.className = "gf-grid-layer";
  const grid = document.createElement("div");
  grid.className = "gf-grid";
  gridLayer.append(grid);

  const guidesLayer = document.createElement("div");
  guidesLayer.className = "gf-guides-layer";

  const selectionLayer = document.createElement("div");
  selectionLayer.className = "gf-selection-layer gf-hidden";
  const selectionBox = document.createElement("div");
  selectionBox.className = "gf-selection-box";
  selectionLayer.append(selectionBox);
  const selectionStatus = document.createElement("div");
  selectionStatus.className = "gf-selection-status gf-hidden";
  selectionStatus.setAttribute("role", "status");

  const inspectorLayer = document.createElement("div");
  inspectorLayer.className = "gf-inspector-layer gf-hidden";
  const inspectorHover = document.createElement("div");
  inspectorHover.className = "gf-inspector-box gf-inspector-hover";
  const inspectorPinned = document.createElement("div");
  inspectorPinned.className = "gf-inspector-box gf-inspector-pinned gf-hidden";
  const inspectorMargin = document.createElement("div");
  inspectorMargin.className = "gf-inspector-margin gf-hidden";
  const inspectorPadding = ["top", "right", "bottom", "left"].map((side) => {
    const band = document.createElement("div");
    band.className = `gf-inspector-padding gf-inspector-padding-${side} gf-hidden`;
    return band;
  });
  const inspectorMeasureX = document.createElement("div");
  inspectorMeasureX.className = "gf-inspector-measure gf-inspector-measure-x gf-hidden";
  const inspectorMeasureXLabel = document.createElement("span");
  inspectorMeasureX.append(inspectorMeasureXLabel);
  const inspectorMeasureY = document.createElement("div");
  inspectorMeasureY.className = "gf-inspector-measure gf-inspector-measure-y gf-hidden";
  const inspectorMeasureYLabel = document.createElement("span");
  inspectorMeasureY.append(inspectorMeasureYLabel);
  const inspectorLayout = document.createElement("div");
  inspectorLayout.className = "gf-inspector-layout gf-hidden";
  const inspectorLabel = document.createElement("div");
  inspectorLabel.className = "gf-inspector-label";
  const inspectorDistance = document.createElement("div");
  inspectorDistance.className = "gf-inspector-distance gf-hidden";
  const inspectorStatus = document.createElement("div");
  inspectorStatus.className = "gf-inspector-status";
  inspectorStatus.setAttribute("role", "status");
  inspectorStatus.textContent = "Geometry Inspector · Page interactions paused · Esc to exit";
  inspectorLayer.append(
    inspectorHover,
    inspectorPinned,
    inspectorMargin,
    ...inspectorPadding,
    inspectorMeasureX,
    inspectorMeasureY,
    inspectorLayout,
    inspectorLabel,
    inspectorDistance,
    inspectorStatus,
  );

  const rulerX = document.createElement("div");
  rulerX.className = "gf-ruler gf-ruler-x";
  const rulerY = document.createElement("div");
  rulerY.className = "gf-ruler gf-ruler-y";
  const rulerCorner = document.createElement("div");
  rulerCorner.className = "gf-ruler-corner";
  rulerCorner.title = "Clear all guides on this route";

  const readout = document.createElement("div");
  readout.className = "gf-readout gf-hidden";

  const panel = document.createElement("section");
  panel.className = "gf-panel gf-hidden";
  panel.setAttribute("aria-label", "GuideFrame controls");
  // Design From Labs port: the panel behaves as a non-modal dialog (the
  // shortcut moves focus to it, Escape closes it and returns focus), so it is
  // announced as one rather than as a region landmark, which also keeps two
  // overlays on one page (a page grid and a scoped one) from producing
  // duplicate landmarks. Focus lands on the panel itself, so the next Tab
  // reaches its first control (see setPanelOpen).
  panel.setAttribute("role", "dialog");
  panel.tabIndex = -1;
  const panelHeader = document.createElement("header");
  panelHeader.className = "gf-panel-header";
  const panelTitle = document.createElement("strong");
  panelTitle.textContent = "GuideFrame";
  const panelMeta = document.createElement("span");
  panelMeta.className = "gf-panel-meta";
  const panelClose = document.createElement("button");
  panelClose.type = "button";
  panelClose.className = "gf-panel-close";
  panelClose.setAttribute("aria-label", "Close GuideFrame controls");
  panelClose.textContent = "×";
  panelHeader.append(panelTitle, panelMeta, panelClose);

  const panelBody = document.createElement("div");
  panelBody.className = "gf-panel-body";
  const gridControl = createPanelButton("Grid", `${modifierLabel()}G`, `${modifierKey()}+G`);
  const rulersControl = createPanelButton("Rulers", "⇧R", "Shift+R");
  const guidesControl = createPanelButton("Guides");
  const inspectorControl = createPanelButton("Geometry inspector", "⇧M", "Shift+M");
  const lockControl = createPanelButton("Lock guides", "⇧L", "Shift+L");
  const snapElementsControl = createPanelButton("Snap to elements");
  const snapColumnsControl = createPanelButton("Snap to columns");
  const snapGuidesControl = createPanelButton("Snap to guides");
  const separator = document.createElement("div");
  separator.className = "gf-panel-separator";
  const clearControl = document.createElement("button");
  clearControl.type = "button";
  clearControl.className = "gf-panel-clear";
  // Design From Labs port: upstream declared an ARIA menu, but the actions
  // expand inline and have no arrow-key roving focus, so they are announced
  // as a disclosure (aria-expanded + aria-controls) over a labelled group of
  // ordinary buttons, which matches how they behave.
  const clearLabel = document.createElement("span");
  clearLabel.textContent = "Clear…";
  // Design From Labs port: isolate the label so its trailing ellipsis stays
  // after the word in a right-to-left panel.
  clearLabel.dir = "auto";
  const clearChevron = document.createElement("span");
  clearChevron.className = "gf-panel-clear-chevron";
  clearChevron.setAttribute("aria-hidden", "true");
  clearChevron.textContent = "›";
  clearControl.append(clearLabel, clearChevron);
  const clearMenu = document.createElement("div");
  clearMenu.className = "gf-panel-clear-menu gf-hidden";
  clearMenu.setAttribute("role", "group");
  clearMenu.setAttribute("aria-label", "Clear guides");
  const clearMenuId = `gf-clear-menu-${createGuideId()}`;
  clearMenu.id = clearMenuId;
  clearControl.setAttribute("aria-controls", clearMenuId);
  const createClearAction = (label: string) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gf-panel-clear-action";
    button.textContent = label;
    return button;
  };
  const clearSelectedControl = createClearAction("Selected guides");
  const clearHorizontalControl = createClearAction("Horizontal guides");
  const clearVerticalControl = createClearAction("Vertical guides");
  const clearAllControl = createClearAction("All guides");
  clearAllControl.classList.add("gf-panel-clear-action-danger");
  clearMenu.append(
    clearSelectedControl,
    clearHorizontalControl,
    clearVerticalControl,
    clearAllControl,
  );
  panelBody.append(
    gridControl,
    rulersControl,
    guidesControl,
    inspectorControl,
    lockControl,
    separator,
    snapElementsControl,
    snapColumnsControl,
    snapGuidesControl,
    clearControl,
    clearMenu,
  );
  panel.append(panelHeader, panelBody);

  // Design From Labs port: the grid, guides, rulers and drag readout are a
  // visual instrument with no text worth announcing (tick numbers, a pointer
  // readout); hide them from assistive technology. The panel and the status
  // messages stay exposed.
  for (const decorative of [
    gridLayer,
    guidesLayer,
    selectionLayer,
    rulerX,
    rulerY,
    rulerCorner,
    readout,
  ]) {
    decorative.setAttribute("aria-hidden", "true");
  }

  root.append(
    gridLayer,
    guidesLayer,
    selectionLayer,
    selectionStatus,
    inspectorLayer,
    rulerX,
    rulerY,
    rulerCorner,
    readout,
    panel,
  );
  mountTarget.append(host);
  liveRoots.add(host);

  // ---------------------------------------------------------------- state --
  let destroyed = false;
  let visible = options.visible ?? options.defaultVisible ?? true;
  let rulersOn = false;
  let guidesOn = true;
  let inspectorOn = false;
  let hoveredElement: Element | null = null;
  let pinnedElement: Element | null = null;
  let inspectorDetailOn = false;
  let inspectorAdvancedOn = false;
  let inspectorSnapshot: {
    element: Element;
    width: number;
    height: number;
    left: number;
    top: number;
    viewportWidth: number;
  } | null = null;
  let previousCursor = "";
  let suppressNextPageClick = false;
  // Design From Labs port: the panel keys are configurable (`panelStorageKey`)
  // and `defaultPanelOpen` applies when nothing is stored yet. The defaults
  // are upstream's fixed keys and a closed panel.
  const panelKey = () => options.panelStorageKey ?? DEFAULT_PANEL_STORAGE_KEY;
  const panelPositionKey = () =>
    options.panelStorageKey
      ? `${options.panelStorageKey}-position`
      : DEFAULT_PANEL_POSITION_STORAGE_KEY;
  const storedPanelOpen = safeRead(panelKey());
  let panelOpen =
    options.panel !== false &&
    (storedPanelOpen === null ? options.defaultPanelOpen === true : storedPanelOpen === "true");
  /** Where focus was before the shortcut moved it into the panel. */
  let panelReturnFocus: HTMLElement | null = null;
  let clearMenuOpen = false;
  const snapOverrides: Partial<Pick<Required<SnapOptions>, "elements" | "columns" | "guides">> = {};
  /** The guides that Backspace/Delete acts on. */
  let selectedIds = new Set<string>();
  let guides: Guide[] = [];
  const guideHistory: Guide[][] = [];
  let nudgeSequence: { key: string; timeout: ReturnType<typeof setTimeout> } | null = null;
  let geometry: GridGeometry | null = null;
  let breakpoint: Breakpoint = "desktop";
  let frame = 0;

  const guideElements = new Map<string, HTMLElement>();

  const storageKey = () => options.storageKey ?? DEFAULT_STORAGE_KEY;
  const guidesKey = () => options.guidesStorageKey ?? DEFAULT_GUIDES_STORAGE_KEY;
  const controlledVisible = () => options.visible;
  const controlledGuides = () => options.guides;

  // Restore persisted state (uncontrolled mode only).
  if (controlledVisible() === undefined) {
    const stored = safeRead(storageKey());
    if (stored === "true") visible = true;
    if (stored === "false") visible = false;
  }
  guides = controlledGuides() ?? options.defaultGuides ?? readGuides(guidesKey());
  // Rulers start in step with the grid, so enabling `rulers` doesn't change how
  // an existing setup looks on load. Shift+R moves them independently after that.
  rulersOn = normaliseRulers(options.rulers) !== null && visible;

  const storedPanelPosition = safeRead(panelPositionKey());
  if (storedPanelPosition) {
    try {
      const position = JSON.parse(storedPanelPosition) as {
        x?: number;
        y?: number;
      };
      if (Number.isFinite(position.x) && Number.isFinite(position.y)) {
        panel.style.left = `${position.x}px`;
        panel.style.top = `${position.y}px`;
        panel.style.right = "auto";
      }
    } catch {
      // Ignore old or malformed position data.
    }
  }

  /*
   * Design From Labs port: a scoped overlay (`container`) keeps its pointer
   * behaviour inside the container. Upstream inspected, paused clicks on and
   * marquee-selected across the whole page even when scoped.
   */
  function inScope(target: EventTarget | null) {
    if (!options.container) return true;
    return target instanceof Node && options.container.contains(target);
  }

  function cursorTarget(): HTMLElement {
    return options.container instanceof HTMLElement ? options.container : document.documentElement;
  }

  /**
   * Design From Labs port: one path for every way the panel opens or closes
   * (shortcut, close button, Escape, the instance API). `focus` moves keyboard
   * focus into the panel and back out to where it was when it closes.
   */
  function setPanelOpen(next: boolean, focus = false) {
    const open = options.panel !== false && next;
    if (panelOpen === open) return;
    const focusInside = panel.contains(shadow.activeElement);
    panelOpen = open;
    if (!panelOpen) clearMenuOpen = false;
    safeWrite(panelKey(), String(panelOpen));
    options.onPanelOpenChange?.(panelOpen);
    if (panelOpen && focus) {
      const active = document.activeElement;
      panelReturnFocus = active instanceof HTMLElement && active !== host ? active : null;
      render();
      panel.focus({ preventScroll: true });
      return;
    }
    if (!panelOpen && focusInside) {
      const target = panelReturnFocus?.isConnected ? panelReturnFocus : null;
      panelReturnFocus = null;
      target?.focus({ preventScroll: true });
    }
    scheduleRender();
  }

  // ------------------------------------------------------------ rendering --
  function effectivePosition(): "fixed" | "absolute" {
    // A scoped overlay can never be `fixed` — it would escape its container.
    return options.container ? "absolute" : (options.position ?? "fixed");
  }

  /*
   * Two coordinate spaces are in play, and which one guides are *stored* in
   * depends on the mode:
   *
   *  - fixed (page overlay): document coordinates, so guides stay pinned to the
   *    page while it scrolls.
   *  - scoped/absolute: overlay-relative coordinates, so guides stay pinned to
   *    the component even when it moves elsewhere on the page.
   *
   * `renderOffset` converts stored → drawn, `clientOffset` converts a pointer
   * or a `getBoundingClientRect` value → stored.
   */
  function renderOffset() {
    if (effectivePosition() === "fixed") {
      return { x: scrollLeft(), y: scrollTop() };
    }
    return { x: 0, y: 0 };
  }

  function clientOffset() {
    if (effectivePosition() === "fixed") {
      return { x: scrollLeft(), y: scrollTop() };
    }
    const rect = root.getBoundingClientRect();
    return { x: -rect.left, y: -rect.top };
  }

  /** The box the grid is laid out in: the container when scoped, else the viewport. */
  function overlayWidth() {
    if (options.container) return root.clientWidth || getViewportWidth();
    return getViewportWidth();
  }

  function currentGeometry(): GridGeometry {
    const viewportWidth = overlayWidth();
    breakpoint =
      options.activeBreakpoint ??
      getBreakpoint(viewportWidth, {
        ...DEFAULT_BREAKPOINTS,
        ...options.breakpoints,
      });

    return computeGridGeometry({
      viewportWidth,
      maxWidth: options.maxWidth ?? 1280,
      columnCount: resolveResponsiveValue(options.columns, DEFAULT_COLUMNS, breakpoint),
      gutter: resolveResponsiveValue(options.gutter, DEFAULT_GUTTER, breakpoint),
      margin: resolveResponsiveValue(options.margin, DEFAULT_MARGIN, breakpoint),
    });
  }

  function renderGrid() {
    if (!geometry) return;
    // Design From Labs port: without a `color` prop the columns follow the
    // `--guideframe-grid-color` token (it inherits into the shadow root), whose
    // default is upstream's color.
    const color = options.color ?? `var(--guideframe-grid-color, ${DEFAULT_COLOR})`;

    root.style.setProperty("--guideframe-grid-color", color);
    root.classList.toggle("gf-root-scoped", Boolean(options.container));
    root.style.setProperty("--guideframe-grid-z-index", String(options.zIndex ?? DEFAULT_Z_INDEX));
    root.style.setProperty("--guideframe-grid-position", effectivePosition());

    grid.style.maxWidth = `${geometry.width}px`;
    grid.style.gridTemplateColumns = `repeat(${geometry.columnCount}, minmax(0, 1fr))`;
    grid.style.columnGap = `${geometry.gutter}px`;
    grid.style.paddingLeft = `${geometry.margin}px`;
    grid.style.paddingRight = `${geometry.margin}px`;
    grid.style.opacity = String(options.opacity ?? DEFAULT_OPACITY);

    // Only rebuild the columns when the count actually changed — otherwise
    // every resize frame would restart the reveal animation.
    if (grid.childElementCount !== geometry.columnCount) {
      grid.replaceChildren();
      for (let index = 0; index < geometry.columnCount; index += 1) {
        const column = document.createElement("div");
        column.className = "gf-column";
        column.style.setProperty("--guideframe-grid-delay", `${index * 80}ms`);
        grid.append(column);
      }
    }
  }

  function rulerConfig() {
    return normaliseRulers(options.rulers) ?? (rulersOn ? normaliseRulers(true) : null);
  }

  function renderRulers() {
    const config = rulerConfig();
    const enabled = rulersVisible();

    rulerX.classList.toggle("gf-hidden", !enabled);
    rulerY.classList.toggle("gf-hidden", !enabled);
    rulerCorner.classList.toggle("gf-hidden", !enabled);
    if (!config || !enabled || !geometry) return;

    root.style.setProperty("--guideframe-grid-ruler-size", `${config.size}px`);

    const origin = renderOffset();
    const width = options.container ? root.clientWidth : getViewportWidth();
    const height = options.container ? root.clientHeight : getViewportHeight();

    rulerX.replaceChildren(...buildTicks("x", origin.x, width, config.step, config.size));
    rulerY.replaceChildren(...buildTicks("y", origin.y, height, config.step, config.size));
  }

  function buildTicks(
    axis: GuideAxis,
    scrollOffset: number,
    extent: number,
    step: number,
    size: number,
  ) {
    const nodes: HTMLElement[] = [];
    const minor = Math.max(2, Math.round(step / 10));
    const start = Math.floor(scrollOffset / minor) * minor;

    for (let value = start; value <= scrollOffset + extent; value += minor) {
      // Rounding keeps hairlines crisp under browser zoom and fractional DPR.
      const offset = Math.round(value - scrollOffset);
      if (offset < 0 || offset > extent) continue;
      const isMajor = value % step === 0;

      const tick = document.createElement("div");
      tick.className = "gf-tick";
      const length = isMajor ? size : Math.round(size * 0.3);
      if (axis === "x") {
        tick.style.left = `${offset}px`;
        tick.style.height = `${length}px`;
      } else {
        tick.style.top = `${offset}px`;
        tick.style.width = `${length}px`;
      }
      nodes.push(tick);

      if (isMajor) {
        const label = document.createElement("span");
        label.className = "gf-tick-label";
        label.textContent = String(value);
        if (axis === "x") label.style.left = `${offset}px`;
        else label.style.top = `${offset}px`;
        nodes.push(label);
      }
    }

    // Column boundaries get their own accent ticks on the horizontal ruler.
    if (axis === "x" && geometry) {
      for (const edge of columnEdges(geometry)) {
        const tick = document.createElement("div");
        tick.className = "gf-tick gf-tick-column";
        tick.style.left = `${Math.round(edge.position)}px`;
        tick.style.height = `${size}px`;
        tick.style.width = "1px";
        nodes.push(tick);
      }
    }

    return nodes;
  }

  function renderGuides() {
    const seen = new Set<string>();

    for (const guide of guides) {
      seen.add(guide.id);
      let element = guideElements.get(guide.id);
      if (!element) {
        element = document.createElement("div");
        const line = document.createElement("div");
        line.className = "gf-guide-line";
        const hit = document.createElement("div");
        hit.className = "gf-guide-hit";
        const handle = document.createElement("div");
        handle.className = "gf-guide-handle";
        element.append(line, hit, handle);
        hit.addEventListener("pointerdown", (event) => onGuidePointerDown(event, guide.id));
        guidesLayer.append(element);
        guideElements.set(guide.id, element);
      }
      const classes = ["gf-guide", `gf-guide-${guide.axis}`];
      if (guide.locked) classes.push("gf-guide-locked");
      if (selectedIds.has(guide.id)) classes.push("gf-guide-selected");
      element.className = classes.join(" ");
      element.dataset.guideId = guide.id;
    }

    for (const [id, element] of guideElements) {
      if (seen.has(id)) continue;
      element.remove();
      guideElements.delete(id);
    }

    positionGuides();
    renderSelectionStatus();
  }

  function renderSelectionStatus() {
    const count = selectedIds.size;
    selectionStatus.classList.toggle("gf-hidden", count < 2);
    selectionStatus.textContent = count < 2 ? "" : `${count} guides selected`;
  }

  function positionGuides() {
    const origin = renderOffset();

    for (const guide of guides) {
      const element = guideElements.get(guide.id);
      if (!element) continue;
      if (guide.axis === "x") {
        element.style.left = `${guide.position - origin.x}px`;
      } else {
        element.style.top = `${guide.position - origin.y}px`;
      }
    }
  }

  /** True when the rulers (and therefore the guides) should be drawn. */
  function rulersVisible() {
    return rulersOn;
  }

  function currentSnap() {
    const configured = normaliseSnap(options.snap) ?? {
      elements: false,
      columns: false,
      guides: false,
      threshold: DEFAULT_SNAP_THRESHOLD,
    };
    return { ...configured, ...snapOverrides };
  }

  function setPressed(control: HTMLButtonElement, pressed: boolean) {
    control.setAttribute("role", "switch");
    control.setAttribute("aria-checked", String(pressed));
    control.classList.toggle("gf-panel-row-on", pressed);
  }

  function renderPanel() {
    const enabled = options.panel !== false;
    if (!enabled) {
      panelOpen = false;
      clearMenuOpen = false;
    }
    panel.classList.toggle("gf-hidden", !enabled || !panelOpen);
    if (!enabled || !panelOpen) return;

    const snap = currentSnap();
    if (guides.length === 0) clearMenuOpen = false;
    const anyUnlocked = guides.some((guide) => !guide.locked);
    // Design From Labs port: hints and aria-keyshortcuts only while the
    // shortcuts actually work.
    const shortcutsOn = options.shortcut !== false;
    for (const control of [gridControl, rulersControl, inspectorControl, lockControl]) {
      const keys = control.dataset.gfKeys;
      // Emptied rather than hidden, so the switch stays in the same grid
      // column as on the rows that never had a hint.
      const hint = control.querySelector("kbd");
      if (hint) hint.textContent = shortcutsOn ? (control.dataset.gfHint ?? "") : "";
      if (keys && shortcutsOn) control.setAttribute("aria-keyshortcuts", keys);
      else control.removeAttribute("aria-keyshortcuts");
    }
    setPressed(gridControl, isVisible());
    setPressed(rulersControl, rulersOn);
    setPressed(guidesControl, guidesOn);
    setPressed(inspectorControl, inspectorOn);
    setPressed(lockControl, guides.length > 0 && !anyUnlocked);
    setPressed(snapElementsControl, snap.elements);
    setPressed(snapColumnsControl, snap.columns);
    setPressed(snapGuidesControl, snap.guides);
    lockControl.disabled = guides.length === 0;
    clearControl.disabled = guides.length === 0;
    clearControl.setAttribute("aria-expanded", String(clearMenuOpen));
    clearControl.classList.toggle("gf-panel-clear-open", clearMenuOpen);
    clearMenu.classList.toggle("gf-hidden", !clearMenuOpen);
    clearSelectedControl.disabled = !guides.some(
      (guide) => selectedIds.has(guide.id) && !guide.locked,
    );
    clearHorizontalControl.disabled = !guides.some((guide) => guide.axis === "y");
    clearVerticalControl.disabled = !guides.some((guide) => guide.axis === "x");
    clearAllControl.disabled = guides.length === 0;
    panelMeta.textContent = geometry
      ? `${breakpoint} · ${geometry.columnCount} cols · ${geometry.gutter}px gap`
      : breakpoint;
  }

  function inspectedElementAt(clientX: number, clientY: number) {
    if (typeof document.elementsFromPoint !== "function") return null;
    return (
      document
        .elementsFromPoint(clientX, clientY)
        .find(
          (element) =>
            element !== host &&
            !host.contains(element) &&
            element !== document.body &&
            element !== document.documentElement &&
            // Design From Labs port: a scoped overlay inspects only its container.
            inScope(element),
        ) ?? null
    );
  }

  function inspectorRect(element: Element) {
    const rect = element.getBoundingClientRect();
    const rootRect = options.container ? root.getBoundingClientRect() : null;
    return {
      left: rect.left - (rootRect?.left ?? 0),
      top: rect.top - (rootRect?.top ?? 0),
      right: rect.right - (rootRect?.left ?? 0),
      bottom: rect.bottom - (rootRect?.top ?? 0),
      width: rect.width,
      height: rect.height,
    };
  }

  function placeInspectorBox(box: HTMLElement, rect: ReturnType<typeof inspectorRect>) {
    box.style.left = `${rect.left}px`;
    box.style.top = `${rect.top}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
  }

  function rounded(value: number) {
    return Math.round(value * 10) / 10;
  }

  function numericStyle(value: string | undefined) {
    return Number.parseFloat(value ?? "") || 0;
  }

  function computedBoxModel(element: Element) {
    const empty = {
      padding: [0, 0, 0, 0] as [number, number, number, number],
      margin: [0, 0, 0, 0] as [number, number, number, number],
      border: [0, 0, 0, 0] as [number, number, number, number],
    };
    if (typeof getComputedStyle !== "function") return empty;
    const style = getComputedStyle(element);
    return {
      padding: [
        numericStyle(style.paddingTop),
        numericStyle(style.paddingRight),
        numericStyle(style.paddingBottom),
        numericStyle(style.paddingLeft),
      ] as [number, number, number, number],
      margin: [
        numericStyle(style.marginTop),
        numericStyle(style.marginRight),
        numericStyle(style.marginBottom),
        numericStyle(style.marginLeft),
      ] as [number, number, number, number],
      border: [
        numericStyle(style.borderTopWidth),
        numericStyle(style.borderRightWidth),
        numericStyle(style.borderBottomWidth),
        numericStyle(style.borderLeftWidth),
      ] as [number, number, number, number],
    };
  }

  function computedSpacing(element: Element) {
    const { padding } = computedBoxModel(element);
    return padding.some(Boolean) ? `padding ${padding.map(rounded).join(" ")}` : "";
  }

  function hideInspectorDetails() {
    inspectorMargin.classList.add("gf-hidden");
    for (const band of inspectorPadding) band.classList.add("gf-hidden");
    inspectorMeasureX.classList.add("gf-hidden");
    inspectorMeasureY.classList.add("gf-hidden");
    inspectorLayout.classList.add("gf-hidden");
    inspectorLayout.replaceChildren();
  }

  type InspectorLayout = {
    kind: "flex" | "grid";
    direction: string;
    rowGap: number;
    columnGap: number;
    align: string;
    justify: string;
    alignContent: string;
  };

  function computedLayout(element: Element): InspectorLayout | null {
    if (typeof getComputedStyle !== "function") return null;
    const style = getComputedStyle(element);
    const display = style.display;
    if (
      display !== "flex" &&
      display !== "inline-flex" &&
      display !== "grid" &&
      display !== "inline-grid"
    ) {
      return null;
    }
    return {
      kind: display.includes("flex") ? "flex" : "grid",
      direction: style.flexDirection || "row",
      rowGap: numericStyle(style.rowGap),
      columnGap: numericStyle(style.columnGap),
      align: style.alignItems || "normal",
      justify: style.justifyContent || "normal",
      alignContent: style.alignContent || "normal",
    };
  }

  function layoutSummary(layout: InspectorLayout) {
    const gaps =
      layout.rowGap === layout.columnGap
        ? `gap ${rounded(layout.rowGap)}`
        : `row ${rounded(layout.rowGap)} · column ${rounded(layout.columnGap)}`;
    const alignment = [
      layout.justify !== "normal" ? `justify ${layout.justify}` : "",
      layout.align !== "normal" && layout.align !== "stretch" ? `align ${layout.align}` : "",
      layout.alignContent !== "normal" && layout.alignContent !== "stretch"
        ? `content ${layout.alignContent}`
        : "",
    ].filter(Boolean);
    const base = layout.kind === "flex" ? `flex ${layout.direction} · ${gaps}` : `grid · ${gaps}`;
    return [base, ...alignment].join(" · ");
  }

  function boxModelSummary(element: Element) {
    if (!inspectorAdvancedOn || typeof getComputedStyle !== "function") return "";
    const style = getComputedStyle(element);
    const { margin, border } = computedBoxModel(element);
    const details = [
      margin.some(Boolean) ? `margin ${margin.map(rounded).join(" ")}` : "",
      border.some(Boolean) ? `border ${border.map(rounded).join(" ")}` : "",
      style.boxSizing ? `box ${style.boxSizing}` : "",
      style.overflow && style.overflow !== "visible" ? `overflow ${style.overflow}` : "",
    ].filter(Boolean);
    return details.join(" · ");
  }

  function inspectorBreadcrumb(element: Element) {
    if (!inspectorAdvancedOn) return "";
    const parts: string[] = [];
    let current: Element | null = element;
    while (current && current !== document.body && parts.length < 4) {
      parts.unshift(describeElement(current));
      current = current.parentElement;
    }
    return parts.join(" > ");
  }

  function snapshotSummary(element: Element, rect: ReturnType<typeof inspectorRect>) {
    if (!inspectorSnapshot || inspectorSnapshot.element !== element) return "";
    const widthDelta = rounded(rect.width - inspectorSnapshot.width);
    const heightDelta = rounded(rect.height - inspectorSnapshot.height);
    const leftDelta = rounded(rect.left - inspectorSnapshot.left);
    const topDelta = rounded(rect.top - inspectorSnapshot.top);
    return `snapshot ${inspectorSnapshot.viewportWidth}px · Δ size ${widthDelta} × ${heightDelta} · position ${leftDelta}, ${topDelta}`;
  }

  function overflowSummary(element: Element) {
    if (!inspectorAdvancedOn || !(element instanceof HTMLElement)) return "";
    const overflowX = Math.max(0, element.scrollWidth - element.clientWidth);
    const overflowY = Math.max(0, element.scrollHeight - element.clientHeight);
    return overflowX || overflowY
      ? `overflow detected · x ${rounded(overflowX)} · y ${rounded(overflowY)}`
      : "";
  }

  function appendLayoutRect(className: string, rect: ReturnType<typeof inspectorRect>, label = "") {
    if (rect.width <= 0 || rect.height <= 0) return;
    const marker = document.createElement("div");
    marker.className = className;
    placeInspectorBox(marker, rect);
    if (label) {
      const value = document.createElement("span");
      value.textContent = label;
      marker.append(value);
    }
    inspectorLayout.append(marker);
  }

  function inspectorContentRect(element: Element, rect: ReturnType<typeof inspectorRect>) {
    const { padding, border } = computedBoxModel(element);
    const left = rect.left + border[3] + padding[3];
    const top = rect.top + border[0] + padding[0];
    const width = Math.max(0, rect.width - border[1] - border[3] - padding[1] - padding[3]);
    const height = Math.max(0, rect.height - border[0] - border[2] - padding[0] - padding[2]);
    return { left, top, right: left + width, bottom: top + height, width, height };
  }

  function placeInspectorLayout(
    element: Element,
    layout: InspectorLayout | null,
    containerRect: ReturnType<typeof inspectorRect>,
  ) {
    inspectorLayout.replaceChildren();
    if (!inspectorDetailOn || !layout || pinnedElement !== element) {
      inspectorLayout.classList.add("gf-hidden");
      return "";
    }

    const children = Array.from(element.children)
      .map((child) => ({ element: child, rect: inspectorRect(child) }))
      .filter(({ rect }) => rect.width > 0 && rect.height > 0);
    for (const child of children) {
      appendLayoutRect("gf-inspector-layout-child", child.rect);
    }

    const seen = new Set<string>();
    const gapValues = { x: [] as number[], y: [] as number[] };
    const addGap = (
      axis: "x" | "y",
      start: number,
      end: number,
      crossStart: number,
      crossEnd: number,
    ) => {
      const size = end - start;
      if (size <= 0 || crossEnd <= crossStart) return;
      const key = [axis, rounded(start), rounded(end), rounded(crossStart), rounded(crossEnd)].join(
        ":",
      );
      if (seen.has(key)) return;
      seen.add(key);
      gapValues[axis].push(rounded(size));
      const rect =
        axis === "x"
          ? {
              left: start,
              right: end,
              top: crossStart,
              bottom: crossEnd,
              width: size,
              height: crossEnd - crossStart,
            }
          : {
              left: crossStart,
              right: crossEnd,
              top: start,
              bottom: end,
              width: crossEnd - crossStart,
              height: size,
            };
      appendLayoutRect(
        `gf-inspector-layout-gap gf-inspector-layout-gap-${axis}`,
        rect,
        String(rounded(size)),
      );
    };

    for (const child of children) {
      const first = child.rect;
      const right = children
        .filter(
          ({ rect }) =>
            rect.left >= first.right &&
            Math.min(first.bottom, rect.bottom) > Math.max(first.top, rect.top),
        )
        .sort((a, b) => a.rect.left - b.rect.left)[0]?.rect;
      if (right) {
        addGap(
          "x",
          first.right,
          right.left,
          Math.max(first.top, right.top),
          Math.min(first.bottom, right.bottom),
        );
      }

      const below = children
        .filter(
          ({ rect }) =>
            rect.top >= first.bottom &&
            Math.min(first.right, rect.right) > Math.max(first.left, rect.left),
        )
        .sort((a, b) => a.rect.top - b.rect.top)[0]?.rect;
      if (below) {
        addGap(
          "y",
          first.bottom,
          below.top,
          Math.max(first.left, below.left),
          Math.min(first.right, below.right),
        );
      }
    }

    const contentRect = inspectorContentRect(element, containerRect);
    if (inspectorAdvancedOn && layout.kind === "flex") {
      const horizontal = layout.direction.startsWith("row");
      const reverse = layout.direction.endsWith("reverse");
      const axis = document.createElement("div");
      axis.className = `gf-inspector-layout-axis gf-inspector-layout-axis-${horizontal ? "x" : "y"}${reverse ? " gf-inspector-layout-axis-reverse" : ""}`;
      axis.style.left = `${horizontal ? contentRect.left : contentRect.left + contentRect.width / 2}px`;
      axis.style.top = `${horizontal ? contentRect.top + contentRect.height / 2 : contentRect.top}px`;
      if (horizontal) axis.style.width = `${contentRect.width}px`;
      else axis.style.height = `${contentRect.height}px`;
      const label = document.createElement("span");
      label.textContent = "main axis";
      axis.append(label);
      inspectorLayout.append(axis);
    } else if (inspectorAdvancedOn && typeof getComputedStyle === "function") {
      const style = getComputedStyle(element);
      const addTracks = (value: string, axis: "x" | "y") => {
        const sizes = value
          .split(" ")
          .map(numericStyle)
          .filter((size) => size > 0);
        if (sizes.length < 1) return;
        const gap = axis === "x" ? layout.columnGap : layout.rowGap;
        const available = axis === "x" ? contentRect.width : contentRect.height;
        const occupied = sizes.reduce((total, size) => total + size, 0) + gap * (sizes.length - 1);
        const alignment = axis === "x" ? layout.justify : layout.alignContent;
        const free = Math.max(0, available - occupied);
        const offset =
          alignment === "end" || alignment === "flex-end"
            ? free
            : alignment === "center"
              ? free / 2
              : 0;
        let position = (axis === "x" ? contentRect.left : contentRect.top) + offset;
        sizes.forEach((size, index) => {
          const track = document.createElement("div");
          track.className = `gf-inspector-layout-track gf-inspector-layout-track-${axis}`;
          if (axis === "x") {
            track.style.left = `${position}px`;
            track.style.top = `${contentRect.top}px`;
            track.style.width = `${size}px`;
            track.style.height = `${contentRect.height}px`;
            position += size + layout.columnGap;
          } else {
            track.style.left = `${contentRect.left}px`;
            track.style.top = `${position}px`;
            track.style.width = `${contentRect.width}px`;
            track.style.height = `${size}px`;
            position += size + layout.rowGap;
          }
          const label = document.createElement("span");
          label.textContent = `${index + 1} · ${rounded(size)}`;
          track.append(label);
          inspectorLayout.append(track);
        });
      };
      addTracks(style.gridTemplateColumns || "", "x");
      addTracks(style.gridTemplateRows || "", "y");
    }
    inspectorLayout.classList.remove("gf-hidden");

    const audit = (axis: "x" | "y") => {
      const values = gapValues[axis];
      if (!values.length) return "";
      const counts = new Map<number, number>();
      for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
      const distribution = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([value, count]) => `${value}px ×${count}`)
        .join(", ");
      return `${axis} gaps ${distribution}${counts.size > 1 ? " · inconsistent" : " · consistent"}`;
    };
    return inspectorAdvancedOn ? [audit("x"), audit("y")].filter(Boolean).join(" · ") : "";
  }

  function placeInspectorBoxModel(element: Element, rect: ReturnType<typeof inspectorRect>) {
    if (!inspectorDetailOn) {
      hideInspectorDetails();
      return;
    }

    const { padding, margin, border } = computedBoxModel(element);
    const [paddingTop, paddingRight, paddingBottom, paddingLeft] = padding;
    const [marginTop, marginRight, marginBottom, marginLeft] = margin;
    const [borderTop, borderRight, borderBottom, borderLeft] = border;
    const contentLeft = rect.left + borderLeft;
    const contentTop = rect.top + borderTop;
    const contentWidth = Math.max(0, rect.width - borderLeft - borderRight);
    const contentHeight = Math.max(0, rect.height - borderTop - borderBottom);
    const bands = [
      { left: contentLeft, top: contentTop, width: contentWidth, height: paddingTop },
      {
        left: contentLeft + contentWidth - paddingRight,
        top: contentTop + paddingTop,
        width: paddingRight,
        height: Math.max(0, contentHeight - paddingTop - paddingBottom),
      },
      {
        left: contentLeft,
        top: contentTop + contentHeight - paddingBottom,
        width: contentWidth,
        height: paddingBottom,
      },
      {
        left: contentLeft,
        top: contentTop + paddingTop,
        width: paddingLeft,
        height: Math.max(0, contentHeight - paddingTop - paddingBottom),
      },
    ];

    inspectorPadding.forEach((band, index) => {
      const box = bands[index];
      band.style.left = `${box.left}px`;
      band.style.top = `${box.top}px`;
      band.style.width = `${box.width}px`;
      band.style.height = `${box.height}px`;
      band.classList.toggle("gf-hidden", box.width <= 0 || box.height <= 0);
    });

    inspectorMargin.style.left = `${rect.left - marginLeft}px`;
    inspectorMargin.style.top = `${rect.top - marginTop}px`;
    inspectorMargin.style.width = `${rect.width + marginLeft + marginRight}px`;
    inspectorMargin.style.height = `${rect.height + marginTop + marginBottom}px`;
    inspectorMargin.classList.toggle("gf-hidden", !margin.some(Boolean));
  }

  function placeInspectorMeasurements(
    hoverRect: ReturnType<typeof inspectorRect>,
    pinnedRect: ReturnType<typeof inspectorRect>,
  ) {
    inspectorMeasureX.classList.add("gf-hidden");
    inspectorMeasureY.classList.add("gf-hidden");
    if (!inspectorDetailOn) return;

    const horizontal =
      hoverRect.left >= pinnedRect.right
        ? { start: pinnedRect.right, end: hoverRect.left }
        : pinnedRect.left >= hoverRect.right
          ? { start: hoverRect.right, end: pinnedRect.left }
          : null;
    if (horizontal) {
      const overlapTop = Math.max(hoverRect.top, pinnedRect.top);
      const overlapBottom = Math.min(hoverRect.bottom, pinnedRect.bottom);
      const y =
        overlapBottom >= overlapTop
          ? (overlapTop + overlapBottom) / 2
          : (hoverRect.top + pinnedRect.top) / 2;
      inspectorMeasureX.style.left = `${horizontal.start}px`;
      inspectorMeasureX.style.top = `${y}px`;
      inspectorMeasureX.style.width = `${horizontal.end - horizontal.start}px`;
      inspectorMeasureXLabel.textContent = String(rounded(horizontal.end - horizontal.start));
      inspectorMeasureX.classList.remove("gf-hidden");
    }

    const vertical =
      hoverRect.top >= pinnedRect.bottom
        ? { start: pinnedRect.bottom, end: hoverRect.top }
        : pinnedRect.top >= hoverRect.bottom
          ? { start: hoverRect.bottom, end: pinnedRect.top }
          : null;
    if (vertical) {
      const overlapLeft = Math.max(hoverRect.left, pinnedRect.left);
      const overlapRight = Math.min(hoverRect.right, pinnedRect.right);
      const x =
        overlapRight >= overlapLeft
          ? (overlapLeft + overlapRight) / 2
          : (hoverRect.left + pinnedRect.left) / 2;
      inspectorMeasureY.style.left = `${x}px`;
      inspectorMeasureY.style.top = `${vertical.start}px`;
      inspectorMeasureY.style.height = `${vertical.end - vertical.start}px`;
      inspectorMeasureYLabel.textContent = String(rounded(vertical.end - vertical.start));
      inspectorMeasureY.classList.remove("gf-hidden");
    }
  }

  function spacingDiagnosis(
    first: Element,
    second: Element,
    firstRect: ReturnType<typeof inspectorRect>,
    secondRect: ReturnType<typeof inspectorRect>,
  ) {
    if (!inspectorDetailOn || first.parentElement !== second.parentElement) return "";
    const parent = first.parentElement;
    const layout = parent ? computedLayout(parent) : null;
    const firstBox = computedBoxModel(first);
    const secondBox = computedBoxModel(second);
    if (secondRect.left >= firstRect.right) {
      const margins = rounded(firstBox.margin[1] + secondBox.margin[3]);
      return `source x · CSS gap ${rounded(layout?.columnGap ?? 0)} · margins ${margins}`;
    }
    if (firstRect.left >= secondRect.right) {
      const margins = rounded(secondBox.margin[1] + firstBox.margin[3]);
      return `source x · CSS gap ${rounded(layout?.columnGap ?? 0)} · margins ${margins}`;
    }
    if (secondRect.top >= firstRect.bottom) {
      const margins = rounded(firstBox.margin[2] + secondBox.margin[0]);
      return `source y · CSS gap ${rounded(layout?.rowGap ?? 0)} · margins ${margins}`;
    }
    if (firstRect.top >= secondRect.bottom) {
      const margins = rounded(secondBox.margin[2] + firstBox.margin[0]);
      return `source y · CSS gap ${rounded(layout?.rowGap ?? 0)} · margins ${margins}`;
    }
    return "overlapping siblings";
  }

  function renderInspector() {
    inspectorLayer.classList.toggle("gf-hidden", !inspectorOn);
    if (!inspectorOn) return;
    if (hoveredElement && !hoveredElement.isConnected) hoveredElement = null;
    if (pinnedElement && !pinnedElement.isConnected) pinnedElement = null;

    if (!hoveredElement) {
      hideInspectorDetails();
      inspectorHover.classList.add("gf-hidden");
      inspectorLabel.classList.add("gf-hidden");
      inspectorDistance.classList.add("gf-hidden");
      inspectorPinned.classList.toggle("gf-hidden", !pinnedElement);
      if (pinnedElement) placeInspectorBox(inspectorPinned, inspectorRect(pinnedElement));
      return;
    }

    const hoverRect = inspectorRect(hoveredElement);
    const layout = computedLayout(hoveredElement);
    placeInspectorBox(inspectorHover, hoverRect);
    placeInspectorBoxModel(hoveredElement, hoverRect);
    const layoutAudit = placeInspectorLayout(hoveredElement, layout, hoverRect);
    inspectorHover.classList.remove("gf-hidden");

    const details = [
      describeElement(hoveredElement),
      `${rounded(hoverRect.width)} × ${rounded(hoverRect.height)}`,
      inspectorDetailOn ? computedSpacing(hoveredElement) : "",
      inspectorDetailOn && layout && pinnedElement === hoveredElement ? layoutSummary(layout) : "",
      layoutAudit,
      boxModelSummary(hoveredElement),
      overflowSummary(hoveredElement),
      inspectorAdvancedOn ? snapshotSummary(hoveredElement, hoverRect) : "",
      inspectorBreadcrumb(hoveredElement),
    ].filter(Boolean);
    inspectorLabel.replaceChildren();
    for (const detail of details) {
      const line = document.createElement("span");
      line.textContent = detail;
      inspectorLabel.append(line);
    }
    inspectorLabel.style.left = `${Math.max(8, hoverRect.left)}px`;
    inspectorLabel.style.top = `${Math.max(8, hoverRect.top - 8)}px`;
    inspectorLabel.classList.remove("gf-hidden");

    const comparing = pinnedElement && pinnedElement !== hoveredElement;
    inspectorPinned.classList.toggle("gf-hidden", !pinnedElement);
    inspectorDistance.classList.toggle("gf-hidden", !comparing);
    if (!pinnedElement) {
      inspectorMeasureX.classList.add("gf-hidden");
      inspectorMeasureY.classList.add("gf-hidden");
      return;
    }

    const pinnedRect = inspectorRect(pinnedElement);
    placeInspectorBox(inspectorPinned, pinnedRect);
    if (!comparing) {
      inspectorMeasureX.classList.add("gf-hidden");
      inspectorMeasureY.classList.add("gf-hidden");
      return;
    }
    placeInspectorMeasurements(hoverRect, pinnedRect);

    const horizontalGap =
      hoverRect.left >= pinnedRect.right
        ? hoverRect.left - pinnedRect.right
        : pinnedRect.left >= hoverRect.right
          ? pinnedRect.left - hoverRect.right
          : 0;
    const verticalGap =
      hoverRect.top >= pinnedRect.bottom
        ? hoverRect.top - pinnedRect.bottom
        : pinnedRect.top >= hoverRect.bottom
          ? pinnedRect.top - hoverRect.bottom
          : 0;
    const leftDelta = Math.abs(hoverRect.left - pinnedRect.left);
    const topDelta = Math.abs(hoverRect.top - pinnedRect.top);
    const source = spacingDiagnosis(pinnedElement, hoveredElement, pinnedRect, hoverRect);
    inspectorDistance.textContent = `gap x ${rounded(horizontalGap)} · y ${rounded(verticalGap)}  |  align x ${rounded(leftDelta)} · y ${rounded(topDelta)}${source ? `  |  ${source}` : ""}`;
    inspectorDistance.style.left = `${Math.max(8, (hoverRect.left + pinnedRect.left) / 2)}px`;
    inspectorDistance.style.top = `${Math.max(8, (hoverRect.top + pinnedRect.top) / 2)}px`;
  }

  function setInspector(next: boolean) {
    if (inspectorOn === next) return;
    inspectorOn = next;
    if (next) {
      previousCursor = cursorTarget().style.cursor;
      cursorTarget().style.cursor = "crosshair";
      inspectorStatus.textContent =
        "Geometry Inspector · Page interactions paused · Option for spacing · Shift+Option for advanced · Esc to exit";
    } else {
      cursorTarget().style.cursor = previousCursor;
      hoveredElement = null;
      pinnedElement = null;
      inspectorDetailOn = false;
      inspectorAdvancedOn = false;
      inspectorSnapshot = null;
      hideInspectorDetails();
      inspectorLayer.classList.add("gf-hidden");
    }
    scheduleRender();
  }

  /*
   * The grid and the rulers are independent layers. The root only hides when
   * *both* are off, so `Shift+R` can bring the rulers up from cold instead of
   * being a silent no-op whenever the grid happens to be hidden.
   */
  function render() {
    if (destroyed) return;
    const showRoot =
      isVisible() || rulersVisible() || inspectorOn || (options.panel !== false && panelOpen);
    root.classList.toggle("gf-hidden", !showRoot);
    if (!showRoot) return;
    geometry = currentGeometry();
    gridLayer.classList.toggle("gf-hidden", !isVisible());
    guidesLayer.classList.toggle("gf-hidden", !guidesOn || (!isVisible() && !rulersVisible()));
    renderGrid();
    renderGuides();
    renderRulers();
    renderInspector();
    renderPanel();
  }

  function scheduleRender() {
    if (destroyed || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      render();
    });
  }

  /** Cheap path for scroll: reposition, don't rebuild the grid. */
  function scheduleSync() {
    if (destroyed || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!isVisible() && !rulersVisible() && !inspectorOn) return;
      positionGuides();
      renderRulers();
      renderInspector();
    });
  }

  // -------------------------------------------------------------- guides ---
  function commitGuides(next: Guide[], persist = true) {
    guides = next;
    if (controlledGuides() === undefined && persist) writeGuides(guidesKey(), guides);
    options.onGuidesChange?.(guides);
    renderGuides();
    if (panelOpen) renderPanel();
  }

  function cloneGuides(value: Guide[]) {
    return value.map((guide) => ({ ...guide }));
  }

  function guidesMatch(a: Guide[], b: Guide[]) {
    return (
      a.length === b.length &&
      a.every((guide, index) => {
        const other = b[index];
        return (
          guide.id === other?.id &&
          guide.axis === other.axis &&
          guide.position === other.position &&
          Boolean(guide.locked) === Boolean(other.locked)
        );
      })
    );
  }

  function finishNudgeSequence() {
    if (!nudgeSequence) return;
    clearTimeout(nudgeSequence.timeout);
    nudgeSequence = null;
  }

  function recordGuideHistory(previous: Guide[], next: Guide[]) {
    finishNudgeSequence();
    if (guidesMatch(previous, next)) return;
    guideHistory.push(cloneGuides(previous));
    if (guideHistory.length > 50) guideHistory.shift();
  }

  function undoGuideChange() {
    finishNudgeSequence();
    const previous = guideHistory.pop();
    if (!previous) return false;
    const previousIds = new Set(previous.map((guide) => guide.id));
    selectedIds = new Set([...selectedIds].filter((id) => previousIds.has(id)));
    commitGuides(cloneGuides(previous));
    return true;
  }

  function snapCandidates(axis: GuideAxis, clientX: number, clientY: number, excludeId?: string) {
    const snap = currentSnap();
    const candidates: SnapCandidate[] = [];

    // Element rects are in viewport space; the grid is already in overlay space.
    const client = clientOffset();
    const clientDelta = axis === "x" ? client.x : client.y;
    const render = renderOffset();
    const gridOffset = axis === "x" ? render.x : render.y;

    if (snap.columns && geometry && axis === "x") {
      for (const edge of columnEdges(geometry)) {
        candidates.push({
          position: edge.position + gridOffset,
          kind: "column",
          label: edge.label,
          priority: 2,
        });
      }
    }

    if (snap.guides) {
      for (const guide of guides) {
        if (guide.id === excludeId || guide.axis !== axis) continue;
        candidates.push({
          position: guide.position,
          kind: "guide",
          label: "guide",
          priority: 3,
        });
      }
    }

    if (snap.elements && typeof document.elementsFromPoint === "function") {
      const stack = document
        .elementsFromPoint(clientX, clientY)
        .filter(
          (element) =>
            element !== host &&
            !host.contains(element) &&
            element !== document.body &&
            element !== document.documentElement,
        )
        .slice(0, 4);
      for (const element of stack) {
        candidates.push(...elementEdges(element, axis, clientDelta));
      }
    }

    return { snap, candidates };
  }

  type DragState = {
    id: string;
    axis: GuideAxis;
    /** Created for this drag, either from a ruler or by duplicating a guide. */
    createdDuringDrag: boolean;
    /** A duplicate is discarded if Option was clicked without an actual drag. */
    duplicated: boolean;
    startPointerPosition: number;
    moved: boolean;
    /** Guide state before this gesture, recorded only if the gesture commits. */
    historySnapshot: Guide[];
    /** Where the guide sat before the drag, so Escape can put it back. */
    originPosition: number;
    pointerId: number;
    captureTarget: Element;
  };

  let drag: DragState | null = null;
  let marquee: {
    pointerId: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null = null;
  let panelDrag: {
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null = null;
  let previousUserSelect = "";

  /**
   * Dragging a guide across the page would otherwise select the text underneath
   * it. `preventDefault` on pointerdown is not reliable for this, so selection
   * is suppressed on the document for the duration of the drag.
   */
  function suppressSelection() {
    previousUserSelect = document.documentElement.style.userSelect;
    document.documentElement.style.userSelect = "none";
    try {
      window.getSelection()?.removeAllRanges();
    } catch {
      /* selection APIs are unavailable in some embedded contexts */
    }
  }

  function restoreSelection() {
    document.documentElement.style.userSelect = previousUserSelect;
  }

  function updateMarquee(event: PointerEvent) {
    if (!marquee) return;
    marquee.currentX = event.clientX;
    marquee.currentY = event.clientY;

    const left = Math.min(marquee.startX, marquee.currentX);
    const right = Math.max(marquee.startX, marquee.currentX);
    const top = Math.min(marquee.startY, marquee.currentY);
    const bottom = Math.max(marquee.startY, marquee.currentY);
    const rootRect = root.getBoundingClientRect();
    selectionBox.style.left = `${left - rootRect.left}px`;
    selectionBox.style.top = `${top - rootRect.top}px`;
    selectionBox.style.width = `${right - left}px`;
    selectionBox.style.height = `${bottom - top}px`;

    const offset = clientOffset();
    selectedIds = new Set(
      guides
        .filter((guide) => {
          if (guide.locked) return false;
          const clientPosition = guide.position - (guide.axis === "x" ? offset.x : offset.y);
          return guide.axis === "x"
            ? clientPosition >= left && clientPosition <= right
            : clientPosition >= top && clientPosition <= bottom;
        })
        .map((guide) => guide.id),
    );
    renderGuides();
  }

  function beginMarquee(event: PointerEvent) {
    finishNudgeSequence();
    marquee = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
    };
    selectedIds.clear();
    selectionLayer.classList.remove("gf-hidden");
    suppressSelection();
    updateMarquee(event);
  }

  function endMarquee() {
    marquee = null;
    selectionLayer.classList.add("gf-hidden");
    restoreSelection();
    renderGuides();
    suppressNextPageClick = true;
    setTimeout(() => {
      suppressNextPageClick = false;
    }, 0);
  }

  function pointerPosition(event: PointerEvent, axis: GuideAxis) {
    const offset = clientOffset();
    return axis === "x" ? event.clientX + offset.x : event.clientY + offset.y;
  }

  function updateDrag(event: PointerEvent) {
    if (!drag) return;
    const raw = pointerPosition(event, drag.axis);
    if (Math.abs(raw - drag.startPointerPosition) >= 2) drag.moved = true;
    // Alt/Option is reserved for duplicating an existing guide on pointerdown.
    const bypass = event.metaKey || event.ctrlKey;
    const { snap, candidates } = bypass
      ? { snap: null, candidates: [] }
      : snapCandidates(drag.axis, event.clientX, event.clientY, drag.id);

    const result = snap
      ? pickClosest(raw, candidates, snap.threshold)
      : { position: raw, kind: "none" as const, label: "" };

    const position = Math.round(result.position * 100) / 100;
    const next = guides.map((guide) => (guide.id === drag?.id ? { ...guide, position } : guide));
    guides = next;
    positionGuides();

    showReadout(event, `${drag.axis.toUpperCase()} ${Math.round(position)}`, result.label);
  }

  function showReadout(event: PointerEvent, text: string, hint: string) {
    readout.classList.remove("gf-hidden");
    readout.replaceChildren(document.createTextNode(text));
    if (hint) {
      const span = document.createElement("span");
      span.className = "gf-readout-hint";
      span.textContent = hint;
      readout.append(span);
    }
    // Design From Labs port: a scoped root is not at the viewport origin.
    const rootRect = options.container ? root.getBoundingClientRect() : null;
    readout.style.left = `${event.clientX - (rootRect?.left ?? 0)}px`;
    readout.style.top = `${event.clientY - (rootRect?.top ?? 0)}px`;
  }

  function hideReadout() {
    readout.classList.add("gf-hidden");
  }

  function isOverRuler(event: PointerEvent, axis: GuideAxis) {
    const config = rulerConfig();
    if (!config) return false;
    // A horizontal guide (axis "y") is deleted by dropping it on the top ruler.
    const rect = root.getBoundingClientRect();
    return axis === "y"
      ? event.clientY >= rect.top && event.clientY - rect.top <= config.size
      : event.clientX >= rect.left && event.clientX - rect.left <= config.size;
  }

  function endDrag(event: PointerEvent, cancelled: boolean) {
    if (!drag) return;
    const current = drag;
    drag = null;
    hideReadout();
    restoreSelection();

    try {
      current.captureTarget.releasePointerCapture(current.pointerId);
    } catch {
      /* capture may already be lost if the element was removed */
    }

    guideElements.get(current.id)?.classList.remove("gf-guide-dragging");

    const droppedOnRuler = !cancelled && isOverRuler(event, current.axis);

    // A cancelled drag only removes the guide if the drag is what created it.
    // Cancelling a move of an existing guide puts it back where it started.
    const uncommittedDuplicate = current.duplicated && !current.moved;
    if (droppedOnRuler || uncommittedDuplicate || (cancelled && current.createdDuringDrag)) {
      selectedIds.delete(current.id);
      const next = guides.filter((guide) => guide.id !== current.id);
      recordGuideHistory(current.historySnapshot, next);
      commitGuides(next);
      return;
    }

    if (cancelled) {
      commitGuides(
        guides.map((guide) =>
          guide.id === current.id ? { ...guide, position: current.originPosition } : guide,
        ),
      );
      return;
    }

    recordGuideHistory(current.historySnapshot, guides);
    commitGuides(guides.slice());
  }

  function beginDrag(
    event: PointerEvent,
    guide: Guide,
    createdDuringDrag: boolean,
    target: Element,
    duplicated = false,
    historySnapshot = cloneGuides(guides),
  ) {
    if (guide.locked) return;
    event.preventDefault();
    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      /* pointer capture is best-effort; the window listeners still fire */
    }
    suppressSelection();
    drag = {
      id: guide.id,
      axis: guide.axis,
      createdDuringDrag,
      duplicated,
      startPointerPosition: pointerPosition(event, guide.axis),
      moved: false,
      historySnapshot,
      originPosition: guide.position,
      pointerId: event.pointerId,
      captureTarget: target,
    };
    guideElements.get(guide.id)?.classList.add("gf-guide-dragging");
    updateDrag(event);
  }

  function selectOnly(id: string | null) {
    finishNudgeSequence();
    if (id === null) selectedIds.clear();
    else selectedIds = new Set([id]);
    renderGuides();
  }

  function toggleSelected(id: string) {
    finishNudgeSequence();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedIds = next;
    renderGuides();
  }

  function deleteSelected() {
    const deletable = new Set(
      guides.filter((guide) => selectedIds.has(guide.id) && !guide.locked).map((guide) => guide.id),
    );
    if (deletable.size === 0) return false;
    const previous = cloneGuides(guides);
    selectedIds = new Set([...selectedIds].filter((id) => !deletable.has(id)));
    const next = guides.filter((guide) => !deletable.has(guide.id));
    recordGuideHistory(previous, next);
    commitGuides(next);
    return true;
  }

  function nudgeSelected(event: KeyboardEvent) {
    const direction = {
      ArrowLeft: { axis: "x" as const, delta: -1 },
      ArrowRight: { axis: "x" as const, delta: 1 },
      ArrowUp: { axis: "y" as const, delta: -1 },
      ArrowDown: { axis: "y" as const, delta: 1 },
    }[event.key];
    if (!direction) return false;

    const affectedIds = guides
      .filter(
        (guide) => selectedIds.has(guide.id) && !guide.locked && guide.axis === direction.axis,
      )
      .map((guide) => guide.id)
      .sort();
    if (affectedIds.length === 0) return false;

    const sequenceKey = `${direction.axis}:${affectedIds.join(",")}`;
    if (nudgeSequence?.key !== sequenceKey) {
      finishNudgeSequence();
      guideHistory.push(cloneGuides(guides));
      if (guideHistory.length > 50) guideHistory.shift();
    }
    if (nudgeSequence) clearTimeout(nudgeSequence.timeout);
    nudgeSequence = {
      key: sequenceKey,
      timeout: setTimeout(() => {
        nudgeSequence = null;
      }, 400),
    };

    const amount = direction.delta * (event.shiftKey ? 10 : 1);
    const affected = new Set(affectedIds);
    commitGuides(
      guides.map((guide) =>
        affected.has(guide.id)
          ? { ...guide, position: Math.round((guide.position + amount) * 100) / 100 }
          : guide,
      ),
    );
    return true;
  }

  function clearGuidesByAxis(axis: GuideAxis) {
    const previous = cloneGuides(guides);
    const next = guides.filter((guide) => guide.axis !== axis);
    if (guidesMatch(previous, next)) return false;
    const nextIds = new Set(next.map((guide) => guide.id));
    selectedIds = new Set([...selectedIds].filter((id) => nextIds.has(id)));
    recordGuideHistory(previous, next);
    commitGuides(next);
    return true;
  }

  function closeClearMenu() {
    clearMenuOpen = false;
    renderPanel();
  }

  function onGuidePointerDown(event: PointerEvent, id: string) {
    if (event.button !== 0) return;
    const guide = guides.find((item) => item.id === id);
    if (!guide) return;
    if (event.shiftKey) {
      event.preventDefault();
      toggleSelected(id);
      return;
    }
    // Selecting a locked guide is fine — it just can't be moved or duplicated.
    selectOnly(id);
    if (guide.locked) return;
    const target = event.currentTarget as Element;
    if (event.altKey) {
      const historySnapshot = cloneGuides(guides);
      const duplicate = { ...guide, id: createGuideId() };
      guides = [...guides, duplicate];
      selectedIds = new Set([duplicate.id]);
      renderGuides();
      beginDrag(event, duplicate, true, target, true, historySnapshot);
      return;
    }
    beginDrag(event, guide, false, target);
  }

  function onRulerPointerDown(event: PointerEvent, axis: GuideAxis) {
    if (event.button !== 0) return;
    finishNudgeSequence();
    const historySnapshot = cloneGuides(guides);
    const guide: Guide = {
      id: createGuideId(),
      axis,
      position: pointerPosition(event, axis),
    };
    guides = [...guides, guide];
    selectedIds = new Set([guide.id]);
    renderGuides();
    beginDrag(event, guide, true, event.currentTarget as Element, false, historySnapshot);
  }

  // -------------------------------------------------------------- events ---
  const onPointerMove = (event: PointerEvent) => {
    if (marquee && event.pointerId === marquee.pointerId) {
      event.preventDefault();
      event.stopImmediatePropagation();
      updateMarquee(event);
      return;
    }
    if (panelDrag && event.pointerId === panelDrag.pointerId) {
      const rect = panel.getBoundingClientRect();
      // Design From Labs port: a scoped panel is dragged within its container.
      const bounds = options.container
        ? root.getBoundingClientRect()
        : { left: 0, top: 0, width: getViewportWidth(), height: getViewportHeight() };
      const maxX = Math.max(8, bounds.width - rect.width - 8);
      const maxY = Math.max(8, bounds.height - rect.height - 8);
      const x = Math.min(maxX, Math.max(8, event.clientX - bounds.left - panelDrag.offsetX));
      const y = Math.min(maxY, Math.max(8, event.clientY - bounds.top - panelDrag.offsetY));
      panel.style.left = `${x}px`;
      panel.style.top = `${y}px`;
      panel.style.right = "auto";
      return;
    }
    if (drag && event.pointerId === drag.pointerId) {
      event.preventDefault();
      updateDrag(event);
      return;
    }
    if (inspectorOn) {
      hoveredElement = inspectedElementAt(event.clientX, event.clientY);
      renderInspector();
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    if (marquee && event.pointerId === marquee.pointerId) {
      event.preventDefault();
      event.stopImmediatePropagation();
      updateMarquee(event);
      endMarquee();
      return;
    }
    if (panelDrag && event.pointerId === panelDrag.pointerId) {
      panelDrag = null;
      safeWrite(
        panelPositionKey(),
        JSON.stringify({ x: panel.offsetLeft, y: panel.offsetTop }),
      );
      return;
    }
    if (!drag || event.pointerId !== drag.pointerId) return;
    endDrag(event, false);
  };

  const onPointerCancel = (event: PointerEvent) => {
    if (marquee && event.pointerId === marquee.pointerId) {
      endMarquee();
      return;
    }
    if (panelDrag && event.pointerId === panelDrag.pointerId) {
      panelDrag = null;
      return;
    }
    if (!drag || event.pointerId !== drag.pointerId) return;
    endDrag(event, true);
  };

  const onScroll = () => scheduleSync();

  function announceInspector(message: string) {
    inspectorStatus.textContent = message;
  }

  function moveInspectorSelection(key: string) {
    const current = pinnedElement ?? hoveredElement;
    if (!current) return false;
    const next =
      key === "ArrowUp"
        ? current.parentElement
        : key === "ArrowDown"
          ? current.firstElementChild
          : key === "ArrowLeft"
            ? current.previousElementSibling
            : key === "ArrowRight"
              ? current.nextElementSibling
              : null;
    if (
      !next ||
      next === document.body ||
      next === document.documentElement ||
      host.contains(next)
    ) {
      announceInspector("Geometry Inspector · No element in that direction");
      return true;
    }
    pinnedElement = next;
    hoveredElement = next;
    announceInspector(`Geometry Inspector · Selected ${describeElement(next)}`);
    renderInspector();
    return true;
  }

  function inspectorReport(element: Element) {
    const rect = inspectorRect(element);
    const layout = computedLayout(element);
    const box = computedBoxModel(element);
    return {
      element: describeElement(element),
      breadcrumb: inspectorBreadcrumb(element),
      viewportWidth: getViewportWidth(),
      rect: {
        left: rounded(rect.left),
        top: rounded(rect.top),
        width: rounded(rect.width),
        height: rounded(rect.height),
      },
      padding: box.padding.map(rounded),
      margin: box.margin.map(rounded),
      border: box.border.map(rounded),
      layout,
      overflow: overflowSummary(element),
      snapshot: snapshotSummary(element, rect),
    };
  }

  async function copyInspectorReport() {
    const element = pinnedElement ?? hoveredElement;
    if (!element || !navigator.clipboard?.writeText) {
      announceInspector("Geometry Inspector · Copy unavailable");
      return;
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(inspectorReport(element), null, 2));
      announceInspector("Geometry Inspector · Geometry copied");
    } catch {
      announceInspector("Geometry Inspector · Copy unavailable");
    }
  }

  function exportInspectorReport() {
    const element = pinnedElement ?? hoveredElement;
    if (!element || typeof URL.createObjectURL !== "function") {
      announceInspector("Geometry Inspector · Export unavailable");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(inspectorReport(element), null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `guideframe-${describeElement(element)
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase()}.json`;
    shadow.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    announceInspector("Geometry Inspector · Geometry exported");
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (inspectorOn && event.key === "Alt") {
      inspectorDetailOn = true;
      inspectorAdvancedOn = event.shiftKey;
      renderInspector();
    } else if (inspectorOn && event.key === "Shift" && inspectorDetailOn) {
      inspectorAdvancedOn = true;
      renderInspector();
    }
    if (event.key === "Escape" && marquee) {
      event.preventDefault();
      endMarquee();
      selectOnly(null);
      return;
    }
    // Escape aborts an in-flight drag before any other handling.
    if (event.key === "Escape" && drag) {
      const synthetic = new PointerEvent("pointerup", {
        pointerId: drag.pointerId,
      });
      endDrag(synthetic, true);
      return;
    }

    // Ignore keystrokes an IME is still composing, and anything typed into a field.
    if (event.isComposing || event.keyCode === 229) return;
    if (isEditableTarget(event.target)) return;

    if (event.key === "Escape" && clearMenuOpen) {
      event.preventDefault();
      closeClearMenu();
      clearControl.focus();
      return;
    }

    // Design From Labs port: Escape inside the panel closes it and returns
    // focus to where it was before the panel took it.
    if (event.key === "Escape" && panelOpen && panel.contains(shadow.activeElement)) {
      event.preventDefault();
      setPanelOpen(false);
      return;
    }

    if (inspectorOn && !event.metaKey && !event.ctrlKey && !event.altKey) {
      if (event.key.startsWith("Arrow") && moveInspectorSelection(event.key)) {
        event.preventDefault();
        return;
      }
      const inspectorKey = event.key.toLowerCase();
      const selected = pinnedElement ?? hoveredElement;
      if (event.shiftKey && inspectorKey === "s" && selected) {
        event.preventDefault();
        const rect = inspectorRect(selected);
        inspectorSnapshot = {
          element: selected,
          width: rect.width,
          height: rect.height,
          left: rect.left,
          top: rect.top,
          viewportWidth: getViewportWidth(),
        };
        announceInspector(`Geometry Inspector · Snapshot saved at ${getViewportWidth()}px`);
        renderInspector();
        return;
      }
      if (event.shiftKey && inspectorKey === "c") {
        event.preventDefault();
        void copyInspectorReport();
        return;
      }
      if (event.shiftKey && inspectorKey === "e") {
        event.preventDefault();
        exportInspectorReport();
        return;
      }
    }

    /*
     * Deleting and deselecting act on a guide the user has directly selected, so
     * they stay available even when the global `shortcut` handling is disabled —
     * they can't fire unless a guide is selected in the first place.
     */
    if (selectedIds.size > 0) {
      if (nudgeSelected(event)) {
        event.preventDefault();
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        // Backspace would otherwise navigate back in some browsers.
        event.preventDefault();
        deleteSelected();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        selectOnly(null);
        return;
      }
    }

    if (event.key === "Escape" && inspectorOn) {
      event.preventDefault();
      if (pinnedElement) {
        pinnedElement = null;
        renderInspector();
      } else {
        setInspector(false);
      }
      return;
    }

    if (options.shortcut === false) return;

    const platform = typeof navigator !== "undefined" ? navigator.platform || "" : "";
    const isMac = /Mac|iPhone|iPad/.test(platform);
    const modKey = isMac ? event.metaKey : event.ctrlKey;
    const key = event.key.toLowerCase();

    if (event.shiftKey && !modKey && !event.altKey && key === "z") {
      const undone = undoGuideChange();
      if (undone) event.preventDefault();
      return;
    }

    if (modKey && event.shiftKey && !event.altKey && key === "g") {
      event.preventDefault();
      setPanelOpen(!panelOpen, true);
      return;
    }

    if (modKey && !event.shiftKey && !event.altKey && key === "g") {
      event.preventDefault();
      setVisible(!isVisible());
      return;
    }

    if (event.shiftKey && !modKey && !event.altKey && key === "r") {
      event.preventDefault();
      rulersOn = !rulersOn;
      scheduleRender();
      return;
    }

    if (event.shiftKey && !modKey && !event.altKey && key === "l") {
      event.preventDefault();
      const previous = cloneGuides(guides);
      const anyUnlocked = guides.some((guide) => !guide.locked);
      const next = guides.map((guide) => ({ ...guide, locked: anyUnlocked }));
      recordGuideHistory(previous, next);
      commitGuides(next);
      return;
    }

    if (event.shiftKey && !modKey && !event.altKey && key === "m") {
      event.preventDefault();
      setInspector(!inspectorOn);
    }
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key === "Shift" && inspectorAdvancedOn) {
      inspectorAdvancedOn = false;
      renderInspector();
    } else if (event.key === "Alt" && inspectorDetailOn) {
      inspectorDetailOn = false;
      inspectorAdvancedOn = false;
      renderInspector();
    }
  };

  const onWindowBlur = () => {
    if (!inspectorDetailOn) return;
    inspectorDetailOn = false;
    inspectorAdvancedOn = false;
    renderInspector();
  };

  rulerX.addEventListener("pointerdown", (event) => onRulerPointerDown(event, "y"));
  rulerY.addEventListener("pointerdown", (event) => onRulerPointerDown(event, "x"));
  rulerCorner.addEventListener("click", () => clearGuides());
  panelClose.addEventListener("click", () => setPanelOpen(false));
  panelHeader.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target === panelClose) return;
    const rect = panel.getBoundingClientRect();
    panelDrag = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    event.preventDefault();
  });
  gridControl.addEventListener("click", () => setVisible(!isVisible()));
  rulersControl.addEventListener("click", () => {
    rulersOn = !rulersOn;
    scheduleRender();
  });
  guidesControl.addEventListener("click", () => {
    guidesOn = !guidesOn;
    scheduleRender();
  });
  inspectorControl.addEventListener("click", () => setInspector(!inspectorOn));
  lockControl.addEventListener("click", () => {
    const previous = cloneGuides(guides);
    const anyUnlocked = guides.some((guide) => !guide.locked);
    const next = guides.map((guide) => ({ ...guide, locked: anyUnlocked }));
    recordGuideHistory(previous, next);
    commitGuides(next);
    renderPanel();
  });
  snapElementsControl.addEventListener("click", () => {
    snapOverrides.elements = !currentSnap().elements;
    renderPanel();
  });
  snapColumnsControl.addEventListener("click", () => {
    snapOverrides.columns = !currentSnap().columns;
    renderPanel();
  });
  snapGuidesControl.addEventListener("click", () => {
    snapOverrides.guides = !currentSnap().guides;
    renderPanel();
  });
  clearControl.addEventListener("click", () => {
    clearMenuOpen = !clearMenuOpen;
    renderPanel();
  });
  clearSelectedControl.addEventListener("click", () => {
    deleteSelected();
    closeClearMenu();
  });
  clearHorizontalControl.addEventListener("click", () => {
    clearGuidesByAxis("y");
    closeClearMenu();
  });
  clearVerticalControl.addEventListener("click", () => {
    clearGuidesByAxis("x");
    closeClearMenu();
  });
  clearAllControl.addEventListener("click", () => {
    clearGuides();
    closeClearMenu();
  });

  const onWindowPointerDown = (event: PointerEvent) => {
    if (inspectorOn && event.target !== host && inScope(event.target)) {
      const inspected = inspectedElementAt(event.clientX, event.clientY);
      if (inspected) {
        pinnedElement = pinnedElement === inspected ? null : inspected;
        hoveredElement = inspected;
        renderInspector();
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    // Shadow-DOM events retarget to the host, so a different target means the
    // click landed on the page rather than on GuideFrame UI.
    if (event.target === host) return;
    if (
      event.button === 0 &&
      event.shiftKey &&
      guidesOn &&
      (isVisible() || rulersVisible()) &&
      inScope(event.target)
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      beginMarquee(event);
      return;
    }
    if (selectedIds.size > 0) selectOnly(null);
  };

  const blockPageInteraction = (event: Event) => {
    if (event.target === host) return;
    if (event.type === "click" && suppressNextPageClick) {
      suppressNextPageClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (!inspectorOn || !inScope(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  window.addEventListener("pointerdown", onWindowPointerDown, true);
  window.addEventListener("pointerup", blockPageInteraction, true);
  window.addEventListener("click", blockPageInteraction, true);
  window.addEventListener("dblclick", blockPageInteraction, true);
  window.addEventListener("contextmenu", blockPageInteraction, true);
  window.addEventListener("pointermove", onPointerMove, {
    capture: true,
    passive: false,
  });
  window.addEventListener("pointerup", onPointerUp, true);
  window.addEventListener("pointercancel", onPointerCancel, true);
  window.addEventListener("scroll", onScroll, { passive: true, capture: true });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onWindowBlur);

  // A ResizeObserver on the root element catches viewport changes *and*
  // scrollbar appear/disappear, which a bare `resize` listener misses.
  const resizeObserver =
    typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => scheduleRender()) : null;
  resizeObserver?.observe(document.documentElement);
  if (!resizeObserver) window.addEventListener("resize", scheduleRender);

  // ----------------------------------------------------------------- API ---
  function isVisible() {
    return controlledVisible() ?? visible;
  }

  function setVisible(next: boolean) {
    if (controlledVisible() === undefined) {
      visible = next;
      safeWrite(storageKey(), String(next));
    }
    // Showing or hiding the overlay brings the rulers with it, so the master
    // toggle reveals everything that was configured. Shift+R moves them alone.
    rulersOn = next && normaliseRulers(options.rulers) !== null;
    options.onVisibleChange?.(next);
    scheduleRender();
  }

  function clearGuides() {
    const previous = cloneGuides(guides);
    selectedIds.clear();
    recordGuideHistory(previous, []);
    commitGuides([]);
  }

  render();

  return {
    update(next: GuideframeOptions) {
      if (destroyed) return;
      options = { ...next };
      if (next.panel === false) panelOpen = false;
      if (next.guides !== undefined) {
        finishNudgeSequence();
        guides = next.guides;
        guideHistory.length = 0;
      }
      scheduleRender();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      finishNudgeSequence();
      if (inspectorOn) cursorTarget().style.cursor = previousCursor;
      if (marquee) restoreSelection();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("pointerdown", onWindowPointerDown, true);
      window.removeEventListener("pointerup", blockPageInteraction, true);
      window.removeEventListener("click", blockPageInteraction, true);
      window.removeEventListener("dblclick", blockPageInteraction, true);
      window.removeEventListener("contextmenu", blockPageInteraction, true);
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerCancel, true);
      window.removeEventListener("scroll", onScroll, {
        capture: true,
      } as EventListenerOptions);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("resize", scheduleRender);
      resizeObserver?.disconnect();
      guideElements.clear();
      liveRoots.delete(host);
      host.remove();
    },
    setVisible,
    isVisible,
    getGuides: () => guides.slice(),
    setGuides: (next: Guide[]) => {
      finishNudgeSequence();
      guideHistory.length = 0;
      const nextIds = new Set(next.map((guide) => guide.id));
      selectedIds = new Set([...selectedIds].filter((id) => nextIds.has(id)));
      commitGuides(next);
    },
    clearGuides,
    setPanelOpen: (next: boolean) => setPanelOpen(next),
    isPanelOpen: () => panelOpen,
  };
}
