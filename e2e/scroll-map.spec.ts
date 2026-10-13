import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Scroll Map (a CodePen port): a route drawn as a container scrolls, and a
// button that opens the map to full width. It lands as beta, so each test
// skips while its page is not published and runs on a LABS_INCLUDE_BETA=1
// build (decision 0014) or once the owner promotes the component.

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
const root = (page: Page) => hero(page).locator("[data-slot=scroll-map]");
const route = (page: Page) =>
  hero(page).locator("[data-slot=scroll-map-route]");
// The demo hydrates when it scrolls into view; the map's engine replaces the
// server-rendered dash (0.001px) once it runs.
const hydrated = (page: Page) =>
  expect
    .poll(() => dash(page), { timeout: 10_000 })
    .not.toBe("0.001px, 100000px");
const dash = (page: Page) =>
  route(page).evaluate((el) => (el as SVGElement).style.strokeDasharray);

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return results.violations.map(
    (v) => `${v.id}: ${v.nodes.length} node(s) ${v.nodes[0]?.target}`,
  );
}

for (const scheme of ["light", "dark"] as const) {
  test(`axe: /ui/scroll-map (${scheme})`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, "/ui/scroll-map");
    await root(page).scrollIntoViewIfNeeded();
    await hydrated(page);
    await page.waitForTimeout(500);
    expect(await axe(page)).toEqual([]);
  });
}

test("renders right to left without violations", async ({ page }) => {
  test.setTimeout(90_000);
  await open(page, "/ui/scroll-map");
  await hero(page).evaluate((el) => el.setAttribute("dir", "rtl"));
  await root(page).scrollIntoViewIfNeeded();
  expect(await axe(page)).toEqual([]);
  // The map takes the inline start side: the right half in right to left.
  const map = await hero(page)
    .locator("[data-slot=scroll-map-svg]")
    .boundingBox();
  const box = await root(page).boundingBox();
  expect(map && box && map.x > box.x + box.width / 4).toBe(true);
});

test("the route is drawn as the container scrolls", async ({ page }) => {
  await open(page, "/ui/scroll-map");
  const scroller = root(page).locator("xpath=..");
  await scroller.scrollIntoViewIfNeeded();
  await hydrated(page);
  const before = await dash(page);
  await scroller.evaluate((el) => {
    el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
  });
  await expect.poll(() => dash(page), { timeout: 8000 }).not.toBe(before);
  const drawn = Number.parseFloat((await dash(page)).split("px")[0]);
  expect(drawn).toBeGreaterThan(50);
});

test("the expand button opens the map by keyboard and Escape closes it", async ({
  page,
}) => {
  await open(page, "/ui/scroll-map");
  const expand = hero(page).getByRole("button", { name: "Expand map" });
  await expand.scrollIntoViewIfNeeded();
  await hydrated(page);
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expand.focus();
  await page.keyboard.press("Enter");
  await expect(expand).toHaveAttribute("aria-expanded", "true");
  const close = hero(page).getByRole("button", { name: "Close map" });
  await expect(close).toBeFocused();
  await expect(
    hero(page).locator("[data-slot=scroll-map-content]"),
  ).toHaveJSProperty("inert", true);
  await page.keyboard.press("Escape");
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expect(expand).toBeFocused();
});

test("the map is named and described for screen readers", async ({ page }) => {
  await open(page, "/ui/scroll-map");
  const map = hero(page).getByRole("img", { name: "Ride route" });
  await expect(map).toHaveCount(1);
  await expect(map).toHaveAccessibleDescription(
    /route drawn from Lantern Garden/,
  );
});

test("reduced motion: the whole route is drawn and nothing is scrubbed", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "/ui/scroll-map");
  const scroller = root(page).locator("xpath=..");
  await scroller.scrollIntoViewIfNeeded();
  await hydrated(page);
  const full = await dash(page);
  // Drawn to its end: the gap after the dash is the 0.1 px the pen leaves.
  expect(full).toMatch(/px, 0\.\d+px$|px, 0\.1px$/);
  await scroller.evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.waitForTimeout(500);
  expect(await dash(page)).toBe(full);
  expect(await axe(page)).toEqual([]);
});
