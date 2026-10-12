import AxeBuilder from "@axe-core/playwright";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";

// The gallery tile expands into the component page with a cross-document
// view transition (docs/decisions/0012-gallery-view-transitions.md).

const TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

type Record = {
  /** Whether the new document started a view transition. */
  transition: boolean;
  /** Pseudo-elements animated by that transition. */
  pseudos: string[];
  /** Why the browser skipped it, when it did. */
  skipped?: string;
  visibility?: string;
};

/**
 * Records, per page, whether `pagereveal` carried a view transition and which
 * pseudo-elements it animated, and the time from the last key or pointer
 * press to `pageswap` on the outgoing page (the main-thread cost of starting
 * the navigation, a stand-in for INP that survives the unload).
 */
async function recordTransitions(context: BrowserContext) {
  await context.addInitScript(() => {
    const store = (key: string, value: unknown) =>
      sessionStorage.setItem(key, JSON.stringify(value));
    let pressed = 0;
    for (const type of ["keydown", "pointerdown"]) {
      addEventListener(
        type,
        () => {
          pressed = performance.now();
        },
        { capture: true },
      );
    }
    addEventListener("pageswap", () => {
      if (pressed) {
        store("vt:swap-ms", performance.now() - pressed);
      }
    });
    addEventListener("pagereveal", (event) => {
      const key = `vt:${location.pathname}`;
      const vt = (event as Event & { viewTransition?: ViewTransition | null })
        .viewTransition;
      if (!vt) {
        store(key, {
          transition: false,
          pseudos: [],
          visibility: document.visibilityState,
        });
        return;
      }
      vt.ready
        .then(() => {
          const pseudos = document
            .getAnimations()
            .map((a) => (a.effect as KeyframeEffect | null)?.pseudoElement)
            .filter((p): p is string => Boolean(p));
          store(key, { transition: true, pseudos: [...new Set(pseudos)] });
        })
        .catch((error: Error) =>
          store(key, {
            transition: true,
            pseudos: [],
            skipped: `${error.name}: ${error.message}`,
          }),
        );
    });
  });
}

async function recorded(page: Page, path: string): Promise<Record | null> {
  const handle = await page.waitForFunction(
    (key) => sessionStorage.getItem(key),
    `vt:${path}`,
  );
  return JSON.parse((await handle.jsonValue()) as string);
}

/**
 * Waits until the current page has been revealed and painted. A click that
 * lands before the outgoing page's first frame has nothing to capture, and
 * the browser skips the transition (docs/pitfalls.md, P-016); people cannot
 * click an unpainted page, but a test can.
 */
async function painted(page: Page) {
  await page.waitForFunction(() =>
    sessionStorage.getItem(`vt:${location.pathname}`),
  );
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

const supportsCrossDocument = (page: Page) =>
  page.evaluate(() => "onpagereveal" in window && "onpageswap" in window);

/**
 * Navigates with `go` and returns the new page's record once it shows the
 * morph of `group`. Headless Chromium now and then drops a cross-document
 * transition on the incoming page even though the outgoing page started it
 * (about 1 run in 12, docs/pitfalls.md, P-016), so a missing morph is retried
 * twice from the same starting state (`reset`) before the test fails. A
 * browser without cross-document transitions only navigates.
 */
async function navigateWithMorph(
  page: Page,
  opts: {
    go: () => Promise<unknown>;
    reset: () => Promise<unknown>;
    path: string;
    group: string;
  },
): Promise<Record | null> {
  const supported = await supportsCrossDocument(page);
  let last: Record | null = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.evaluate(
      (key) => sessionStorage.removeItem(key),
      `vt:${opts.path}`,
    );
    await opts.go();
    await page.waitForURL((url) => url.pathname === opts.path);
    if (!supported) {
      return null;
    }
    last = await recorded(page, opts.path);
    if (last?.pseudos.includes(`::view-transition-group(${opts.group})`)) {
      return last;
    }
    if (attempt < 3) {
      await painted(page);
      await opts.reset();
      await painted(page);
    }
  }
  throw new Error(`no morph of ${opts.group}: ${JSON.stringify(last)}`);
}

const transitionName = (page: Page, selector: string) =>
  page
    .locator(selector)
    .evaluate((el) => getComputedStyle(el).viewTransitionName);

const tileLink = (page: Page, title: string) =>
  page.getByTestId("gallery").getByRole("link", { name: title, exact: true });

test.beforeEach(async ({ context }) => {
  await recordTransitions(context);
});

test("a tile is a link that expands into the component page hero", async ({
  page,
}) => {
  await page.goto("/ui");
  await painted(page);
  const tile = page.locator('[data-tile="button"]');
  expect(
    await transitionName(page, '[data-tile="button"] [data-tile-preview]'),
  ).toBe("tile-preview-button");
  expect(
    await tile
      .locator(".vt-tile-title")
      .evaluate((el) => getComputedStyle(el).viewTransitionName),
  ).toBe("tile-title-button");
  // Names are unique on the gallery, or the browser skips the transition.
  const names = await page
    .locator("[data-tile-preview], .vt-tile-title")
    .evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).viewTransitionName),
    );
  expect(new Set(names).size).toBe(names.length);

  const vt = await navigateWithMorph(page, {
    go: () => tileLink(page, "Button").click(),
    reset: () => page.goBack(),
    path: "/ui/button",
    group: "tile-preview-button",
  });
  // A group animation exists only when both pages have the name: the morph.
  if (vt) {
    expect(vt.pseudos).toContain("::view-transition-group(tile-title-button)");
  }
  await expect(page).toHaveURL(/\/ui\/button$/);
  // The hero and heading carry the same names as the tile.
  expect(await transitionName(page, "[data-variant-demo]:not([hidden])")).toBe(
    "tile-preview-button",
  );
  expect(await transitionName(page, "h1 .vt-tile-title")).toBe(
    "tile-title-button",
  );
  // Only one hero frame is rendered, so the name stays unique.
  await expect(page.locator("[data-variant-demo]:visible")).toHaveCount(1);
});

test("the hero follows the variant switcher", async ({ page }) => {
  await page.goto("/ui/button");
  await painted(page);
  await page.getByText("React Aria", { exact: true }).click();
  const hero = page.locator("[data-variant-demo]:not([hidden])");
  await expect(hero).toHaveAttribute("data-variant-demo", "button-aria-lucide");
  await expect(page.locator("[data-variant-demo]:visible")).toHaveCount(1);
  expect(await transitionName(page, "[data-variant-demo]:not([hidden])")).toBe(
    "tile-preview-button",
  );
});

test("back returns to the same scroll position and shrinks into the tile", async ({
  page,
}) => {
  await page.goto("/ui");
  await painted(page);
  const tile = page
    .locator('[data-tile="designfrom-theme"]')
    .getByRole("link", { name: "Design From theme", exact: true });
  // Scroll so the tile sits mid-viewport (an instant scroll, so the
  // position is final when it is read).
  const before = await tile.evaluate((el) => {
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top - window.innerHeight / 2, behavior: "instant" });
    return window.scrollY;
  });
  expect(before).toBeGreaterThan(0);
  await tile.click();
  await expect(page).toHaveURL(/\/ui\/designfrom-theme$/);
  await painted(page);
  await navigateWithMorph(page, {
    go: () => page.goBack(),
    reset: () => page.goForward(),
    path: "/ui",
    group: "tile-preview-designfrom-theme",
  });
  await page.waitForFunction((y) => Math.abs(window.scrollY - y) <= 1, before);
  expect(
    Math.abs((await page.evaluate(() => window.scrollY)) - before),
  ).toBeLessThanOrEqual(1);
  await expect(tile).toBeInViewport();
});

test("reduced motion navigates without a morph", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ui");
  await painted(page);
  await tileLink(page, "Badge").click();
  await expect(page).toHaveURL(/\/ui\/badge$/);
  const vt = await recorded(page, "/ui/badge");
  expect(vt?.transition).toBe(false);
  expect(vt?.pseudos ?? []).toEqual([]);
  // Back is instant too.
  await page.goBack();
  await expect(page).toHaveURL(/\/ui$/);
  expect((await recorded(page, "/ui"))?.transition).toBe(false);
});

test("Enter on a focused tile opens the component, with a visible focus ring", async ({
  page,
}) => {
  await page.goto("/ui");
  await painted(page);
  const link = tileLink(page, "Tooltip");
  // Reach the tile by keyboard so :focus-visible applies.
  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.press("Tab");
    if (await link.evaluate((el) => el === document.activeElement)) {
      break;
    }
  }
  await expect(link).toBeFocused();
  const ring = await page.locator('[data-tile="tooltip"]').evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      style: style.outlineStyle,
      width: Number.parseFloat(style.outlineWidth),
    };
  });
  expect(ring.style).toBe("solid");
  expect(ring.width).toBeGreaterThanOrEqual(2);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/ui\/tooltip$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tooltip");
  const swap = await page.evaluate(() => sessionStorage.getItem("vt:swap-ms"));
  if (swap !== null) {
    // Input to the outgoing page's capture stays inside the INP budget.
    expect(Number(swap)).toBeLessThan(200);
  }
});

test("right-to-left: the names still match and nothing overflows", async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      document.documentElement.dir = "rtl";
    });
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/ui");
  await painted(page);
  await navigateWithMorph(page, {
    go: () => tileLink(page, "Badge").click(),
    reset: () => page.goBack(),
    path: "/ui/badge",
    group: "tile-preview-badge",
  });
  expect(await page.evaluate(() => document.documentElement.dir)).toBe("rtl");
  expect(await transitionName(page, "[data-variant-demo]:not([hidden])")).toBe(
    "tile-preview-badge",
  );
  // The heading sits at the inline start, which is the right in RTL.
  const box = await page.locator("h1 .vt-tile-title").boundingBox();
  expect(box && box.x + box.width).toBeGreaterThan(375 / 2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(0);
});

test("no layout shift on the gallery, the component page, or across the transition", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let total = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      })[]) {
        if (!entry.hadRecentInput) {
          total += entry.value;
        }
      }
      sessionStorage.setItem(`cls:${location.pathname}`, String(total));
    }).observe({ type: "layout-shift", buffered: true });
  });
  const cls = (path: string) =>
    page.evaluate(
      (key) => Number(sessionStorage.getItem(key) ?? "0"),
      `cls:${path}`,
    );
  await page.goto("/ui");
  await painted(page);
  await page.waitForTimeout(600);
  expect(await cls("/ui")).toBeLessThanOrEqual(0.1);
  await tileLink(page, "Button").click();
  await expect(page).toHaveURL(/\/ui\/button$/);
  await page.waitForTimeout(800);
  expect(await cls("/ui/button")).toBeLessThanOrEqual(0.1);
});

for (const scheme of ["light", "dark"] as const) {
  test(`axe: after the expand and after back (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/ui");
    await painted(page);
    await tileLink(page, "Button").click();
    await expect(page).toHaveURL(/\/ui\/button$/);
    await page.waitForFunction(() => !document.activeViewTransition);
    const detail = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(
      detail.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`),
    ).toEqual([]);
    await page.goBack();
    await expect(page).toHaveURL(/\/ui$/);
    const gallery = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(
      gallery.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`),
    ).toEqual([]);
  });
}
