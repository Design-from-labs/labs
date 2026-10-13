import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Port batch J (decision 0027): scroll effects, page transitions and 3D. They
// land as beta, so each test skips while its page is not published, and runs
// on a LABS_INCLUDE_BETA=1 build (decision 0014) or once promoted.

const TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

async function open(page: Page, path: string) {
  const response = await page.goto(path);
  test.skip(response?.status() === 404, `${path} is not published here`);
}

// Paper's page lists 75 source files (about 87,000 highlighted spans), which
// axe cannot get through in a test's time; the listing is the site's own
// SourceView, checked on every other component page, so it is left out there.
async function axe(page: Page, excludeSource = false) {
  const builder = new AxeBuilder({ page }).withTags(TAGS);
  if (excludeSource) {
    builder.exclude("[data-source]");
  }
  const results = await builder.analyze();
  return results.violations.map(
    (v) => `${v.id}: ${v.nodes.length} node(s) ${v.nodes[0]?.target}`,
  );
}

const hero = (page: Page) => page.locator("[data-variant-demo]:not([hidden])");

const NAMES = [
  "smooth-scroll",
  "sticky-grid-scroll",
  "svg-mask-scroll-transition",
  "fold-carousel",
  "webgpu-page-transition",
  "paper",
];

for (const name of NAMES) {
  for (const scheme of ["light", "dark"] as const) {
    test(`axe: /ui/${name} (${scheme})`, async ({ page }) => {
      // Software WebGL draws every frame on the main thread's budget; axe
      // needs longer on the 3D pages.
      test.setTimeout(name === "paper" ? 120_000 : 30_000);
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, `/ui/${name}`);
      await hero(page).scrollIntoViewIfNeeded();
      expect(await axe(page, name === "paper")).toEqual([]);
    });
  }

  test(`/ui/${name} renders right to left without violations`, async ({
    page,
  }) => {
    test.setTimeout(name === "paper" ? 120_000 : 30_000);
    await open(page, `/ui/${name}`);
    // The page's direction switch, when it has a switcher (variants or a
    // stage); otherwise set the frame's direction the way the switch does.
    const toggle = page
      .getByTestId("switcher")
      .getByText("rtl", { exact: true });
    if (await toggle.count()) {
      await toggle.click();
    } else {
      await hero(page).evaluate((el) => el.setAttribute("dir", "rtl"));
    }
    await expect(hero(page)).toHaveAttribute("dir", "rtl");
    await hero(page).scrollIntoViewIfNeeded();
    expect(await axe(page, name === "paper")).toEqual([]);
  });
}

test("sticky-grid-scroll: scrolling its container opens the grid and shows the action", async ({
  page,
}) => {
  await open(page, "/ui/sticky-grid-scroll");
  const region = hero(page).getByRole("region", {
    name: "Sticky grid scroll demo",
  });
  await region.scrollIntoViewIfNeeded();
  const action = hero(page).locator('[data-slot="sticky-grid-scroll-action"]');
  await expect(action).toHaveAttribute("inert", "");
  await region.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect(action).not.toHaveAttribute("inert", { timeout: 10000 });
  await expect(action).toHaveCSS("opacity", "1", { timeout: 10000 });
});

test("svg-mask-scroll-transition: the masks open as its container scrolls", async ({
  page,
}) => {
  await open(page, "/ui/svg-mask-scroll-transition");
  const region = hero(page).getByRole("region", {
    name: "SVG mask scroll transition demo",
  });
  await region.scrollIntoViewIfNeeded();
  const firstFill = hero(page)
    .locator('[data-slot="svg-mask-scroll-transition-fill"]')
    .first();
  await region.evaluate((el) => el.scrollTo(0, el.clientHeight * 1.6));
  await expect
    .poll(() => firstFill.evaluate((el) => Number.parseFloat(el.style.width)), {
      timeout: 10000,
    })
    .toBeGreaterThan(0);
});

test("fold-carousel: next announces the next slide; arrow keys follow the reading direction", async ({
  page,
}) => {
  await open(page, "/ui/fold-carousel");
  const carousel = hero(page).getByRole("region", { name: "Landscapes" });
  await carousel.scrollIntoViewIfNeeded();
  const live = carousel.locator("[aria-live]");
  await expect(live).toHaveText("Slide 1 of 4");
  await carousel.getByRole("button", { name: "Next slide" }).click();
  await expect(live).toHaveText("Slide 2 of 4");
  await carousel.getByRole("button", { name: "Previous slide" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(live).toHaveText("Slide 3 of 4");
});

test("webgpu-page-transition: draws with WebGPU or WebGL 2, and switches views from the keyboard", async ({
  page,
}) => {
  await open(page, "/ui/webgpu-page-transition");
  const root = hero(page).locator('[data-slot="webgpu-page-transition"]');
  await root.scrollIntoViewIfNeeded();
  await expect(root).toHaveAttribute("data-tier", /^(webgpu|webgl2|dom)$/);
  const hasGL = await page.evaluate(
    () => !!document.createElement("canvas").getContext("webgl2"),
  );
  if (hasGL) {
    await expect(root).toHaveAttribute("data-tier", /^(webgpu|webgl2)$/, {
      timeout: 15000,
    });
  }
  // A view chosen mid-transition is ignored, as upstream; wait for each.
  const settled = () =>
    expect(root).not.toHaveAttribute("data-transitioning", { timeout: 10000 });
  await root.getByRole("button", { name: "Index" }).click();
  await expect(root).toHaveAttribute("data-view", "index");
  await settled();
  await root.getByRole("button", { name: "Selected" }).click();
  await expect(root).toHaveAttribute("data-view", "main");
  await settled();
  await root.getByRole("button", { name: "Spire" }).click();
  await expect(root).toHaveAttribute("data-view", "inner");
  await settled();
});

test("webgpu-page-transition: reduced motion shows plain images", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "/ui/webgpu-page-transition");
  const root = hero(page).locator('[data-slot="webgpu-page-transition"]');
  await root.scrollIntoViewIfNeeded();
  await expect(root).toHaveAttribute("data-tier", "dom");
  await expect(root.locator("canvas")).toHaveCount(0);
});

test("paper: the fallback gives way to the canvas once it draws", async ({
  page,
}) => {
  await open(page, "/ui/paper");
  const fallback = hero(page).locator('[data-slot="paper-fallback"]');
  await fallback.scrollIntoViewIfNeeded();
  const hasGL = await page.evaluate(
    () => !!document.createElement("canvas").getContext("webgl2"),
  );
  test.skip(!hasGL, "no WebGL 2 in this browser");
  await expect(fallback).toHaveCSS("opacity", "0", { timeout: 15000 });
});
