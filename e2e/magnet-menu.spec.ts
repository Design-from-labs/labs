import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Magnet Menu (a CodePen port): a staged header nav whose pill follows the
// pointer and keyboard focus. It lands as beta, so each test skips while its
// page is not published and runs on a LABS_INCLUDE_BETA=1 build
// (decision 0014) or once the owner promotes the component.

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
const staged = (page: Page) =>
  hero(page).frameLocator("iframe[data-stage-frame]");

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return results.violations.map(
    (v) => `${v.id}: ${v.nodes.length} node(s) ${v.nodes[0]?.target}`,
  );
}

for (const scheme of ["light", "dark"] as const) {
  test(`axe: /ui/magnet-menu (${scheme})`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, "/ui/magnet-menu");
    await hero(page).scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    expect(await axe(page)).toEqual([]);
  });
}

test("renders right to left without violations", async ({ page }) => {
  test.setTimeout(90_000);
  await open(page, "/ui/magnet-menu");
  // The switcher's rtl option sets the direction of the stage frame.
  await page.getByTestId("switcher").getByText("rtl", { exact: true }).click();
  await expect(hero(page)).toHaveAttribute("dir", "rtl");
  await hero(page).scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  expect(await axe(page)).toEqual([]);
});

test("the pill follows keyboard focus and the current link is marked", async ({
  page,
}) => {
  await open(page, "/ui/magnet-menu");
  const frame = staged(page);
  const nav = frame.getByRole("navigation", { name: "Example sections" });
  await nav.scrollIntoViewIfNeeded();
  const home = frame.getByRole("link", { name: "Home" });
  await expect(home).toHaveAttribute("aria-current", "page");
  const pill = () =>
    nav.locator("ul").evaluate((ul) => {
      const style = getComputedStyle(ul, "::before");
      return { opacity: Number(style.opacity), width: parseFloat(style.width) };
    });
  expect((await pill()).opacity).toBe(0);
  await frame.getByRole("link", { name: "Posts" }).focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect
    .poll(async () => (await pill()).opacity, { timeout: 3000 })
    .toBe(1);
  // The pill ends as wide as the focused link, so it is anchored to it (both
  // measured inside the frame, which the stage scales down).
  const width = await frame
    .getByRole("link", { name: "Posts" })
    .evaluate((el) => el.getBoundingClientRect().width);
  await expect
    .poll(async () => Math.abs((await pill()).width - width), {
      timeout: 3000,
    })
    .toBeLessThan(1.5);
  // Clicking a link moves the underline (and aria-current) to it.
  await frame.getByRole("link", { name: "Craft" }).click();
  await expect(frame.getByRole("link", { name: "Craft" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(home).not.toHaveAttribute("aria-current", "page");
});

test("reduced motion: the pill and underline move at once", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "/ui/magnet-menu");
  const nav = staged(page).getByRole("navigation", {
    name: "Example sections",
  });
  await nav.scrollIntoViewIfNeeded();
  const durations = await nav
    .locator("ul")
    .evaluate((ul) => [
      getComputedStyle(ul, "::before").transitionDuration,
      getComputedStyle(ul, "::after").transitionDuration,
    ]);
  for (const duration of durations) {
    expect(duration.split(",").every((d) => parseFloat(d) <= 0.01)).toBe(true);
  }
});

for (const width of [320, 375]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await open(page, "/ui/magnet-menu");
    await hero(page).scrollIntoViewIfNeeded();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const inner = await staged(page)
      .locator("html")
      .evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(inner).toBeLessThanOrEqual(0);
  });
}

test("the wall tile loops hover over the links and never takes the page's focus", async ({
  page,
}) => {
  await open(page, "/ui");
  const specimen = page.locator('[data-specimen="magnet-menu"]');
  test.skip(
    (await specimen.count()) === 0,
    "beta ports are not published here",
  );
  await specimen.scrollIntoViewIfNeeded();
  const frame = specimen.frameLocator("iframe[data-stage-frame]");
  // The driver writes data-loop on one link at a time; the frame is inert.
  await expect(frame.locator("a[data-loop~=hover]")).toHaveCount(1, {
    timeout: 8000,
  });
  const end = Date.now() + 4800;
  while (Date.now() < end) {
    const active = await page.evaluate(
      () => document.activeElement?.tagName ?? "",
    );
    expect(active).not.toBe("IFRAME");
    await page.waitForTimeout(150);
  }
});
