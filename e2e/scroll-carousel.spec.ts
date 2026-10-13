import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Scroll Carousel (a CodePen port): a ring of pictures turned by a scroller.
// It lands as beta, so each test skips while its page is not published and
// runs on a LABS_INCLUDE_BETA=1 build (decision 0014) or once the owner
// promotes the component.

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

const hero = (page: Page) => page.locator("[data-variant-demo]:not([hidden])");
const ring = (page: Page) =>
  hero(page).locator("[data-slot=scroll-carousel-ring]");
const scroller = (page: Page) =>
  hero(page).locator("[data-slot=scroll-carousel-scroller]");

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return results.violations.map(
    (v) => `${v.id}: ${v.nodes.length} node(s) ${v.nodes[0]?.target}`,
  );
}

const turn = (page: Page) =>
  ring(page).evaluate((el) => getComputedStyle(el).transform);

for (const scheme of ["light", "dark"] as const) {
  test(`axe: /ui/scroll-carousel (${scheme})`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, "/ui/scroll-carousel");
    await hero(page).scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    expect(await axe(page)).toEqual([]);
  });
}

test("renders right to left without violations", async ({ page }) => {
  test.setTimeout(90_000);
  await open(page, "/ui/scroll-carousel");
  await hero(page).evaluate((el) => el.setAttribute("dir", "rtl"));
  await hero(page).scrollIntoViewIfNeeded();
  expect(await axe(page)).toEqual([]);
});

test("the ring turns as the named scroll region scrolls", async ({ page }) => {
  await open(page, "/ui/scroll-carousel");
  const region = hero(page).getByRole("region", { name: "Gradient gallery" });
  await region.scrollIntoViewIfNeeded();
  await expect(region).toHaveAttribute("tabindex", "0");
  const before = await turn(page);
  await region.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => region.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0);
  await expect.poll(() => turn(page)).not.toBe(before);
});

test("without CSS scroll timelines a scroll listener turns the ring", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const supports = CSS.supports.bind(CSS);
    CSS.supports = ((...args: string[]) =>
      String(args[0]).includes("animation-timeline")
        ? false
        : (supports as (...a: string[]) => boolean)(
            ...args,
          )) as typeof CSS.supports;
  });
  await open(page, "/ui/scroll-carousel");
  const root = hero(page).locator("[data-slot=scroll-carousel]");
  await expect(root).toHaveAttribute("data-script-driver", "");
  const before = await turn(page);
  await scroller(page).evaluate((el) => {
    el.scrollLeft = el.scrollWidth / 4;
  });
  await expect.poll(() => turn(page)).not.toBe(before);
  await expect
    .poll(() =>
      root.evaluate((el) =>
        el.style.getPropertyValue("--scroll-carousel--progress"),
      ),
    )
    .not.toBe("");
});

test("reduced motion: a flat strip replaces the ring and nothing is scroll-linked", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "/ui/scroll-carousel");
  // Server rendering draws the ring; the strip replaces it once the
  // preference is read after hydration.
  const strip = hero(page).locator("[data-slot=scroll-carousel-strip]");
  await expect(strip).toBeAttached();
  await strip.scrollIntoViewIfNeeded();
  await expect(strip).toHaveAccessibleName("Gradient gallery");
  await expect(ring(page)).toHaveCount(0);
  await expect(strip.getByRole("img")).toHaveCount(16);
  for (const image of await strip.getByRole("img").all()) {
    await expect(image).toHaveAttribute("alt", /Gradient \d+ of 16/);
  }
  expect(await axe(page)).toEqual([]);
});

for (const width of [320, 375]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await open(page, "/ui/scroll-carousel");
    await hero(page).scrollIntoViewIfNeeded();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    // The ring is sized by its own box: it fits the demo at phone widths.
    const box = await hero(page)
      .locator("[data-slot=scroll-carousel]")
      .boundingBox();
    expect(box?.width ?? 0).toBeLessThanOrEqual(width);
  });
}

test("on the wall nobody can scroll, so the ring turns by itself", async ({
  page,
}) => {
  await open(page, "/ui");
  const specimen = page.locator('[data-specimen="scroll-carousel"]');
  test.skip(
    (await specimen.count()) === 0,
    "beta ports are not published here",
  );
  await specimen.scrollIntoViewIfNeeded();
  const root = specimen.locator("[data-slot=scroll-carousel]");
  // The tile hydrates when it is in view, then the demo turns scroll drive off.
  await expect(root).toHaveAttribute("data-scroll-driven", "false", {
    timeout: 8000,
  });
  const ringTransform = () =>
    root
      .locator("[data-slot=scroll-carousel-ring]")
      .evaluate((el) => getComputedStyle(el).transform);
  await expect
    .poll(() =>
      root
        .locator("[data-slot=scroll-carousel-ring]")
        .evaluate((el) => getComputedStyle(el).animationName),
    )
    .toBe("scroll-carousel-turn");
  const before = await ringTransform();
  await expect.poll(ringTransform, { timeout: 5000 }).not.toBe(before);
});
