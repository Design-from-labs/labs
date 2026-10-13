import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Port batch K wrappers: number flow, financial chart and virtual list (each a
// thin wrapper over its upstream npm package). They land as beta, so each test
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

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return results.violations.map(
    (v) => `${v.id}: ${v.nodes.length} node(s) ${v.nodes[0]?.target}`,
  );
}

const hero = (page: Page) => page.locator("[data-variant-demo]:not([hidden])");

const NAMES = ["number-flow", "financial-chart", "virtual-list"];

// The component pages show every source file highlighted token by token;
// axe's region rule walks them all (P-064), so these pages get 90 s.
for (const name of NAMES) {
  for (const scheme of ["light", "dark"] as const) {
    test(`axe: /ui/${name} (${scheme})`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, `/ui/${name}`);
      await hero(page).scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      expect(await axe(page)).toEqual([]);
    });
  }

  test(`/ui/${name} renders right to left without violations`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await open(page, `/ui/${name}`);
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
    await page.waitForTimeout(800);
    expect(await axe(page)).toEqual([]);
  });

  for (const width of [320, 375]) {
    test(`/ui/${name}: no horizontal overflow at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await open(page, `/ui/${name}`);
      await hero(page).scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

test("number-flow: the number is named by its value and changes", async ({
  page,
}) => {
  await open(page, "/ui/number-flow");
  const demo = hero(page);
  await demo.scrollIntoViewIfNeeded();
  const price = demo.locator("number-flow-react").first();
  const label = () =>
    price.evaluate(
      (el) =>
        // NumberFlow names itself through ElementInternals (role img).
        (el as unknown as { _internals?: ElementInternals })._internals
          ?.ariaLabel ?? null,
    );
  await expect.poll(label).toBe("$1,240.50");
  await demo.getByRole("button", { name: "Next balance" }).click();
  await expect.poll(label).toBe("$1,318.25");
});

test("financial-chart: a named figure, a keyboard cursor and the attribution link", async ({
  page,
}) => {
  await open(page, "/ui/financial-chart");
  const demo = hero(page);
  await demo.scrollIntoViewIfNeeded();
  const figure = demo.getByRole("figure", {
    name: "Sample asset, synthetic daily prices and volume",
  });
  await expect(figure).toBeVisible();
  await expect(figure).toHaveAccessibleDescription(/Candlestick chart of 90/);
  // The library's required attribution: a visible link to its author.
  const logo = demo.getByRole("link", { name: "Charting by TradingView" });
  await expect(logo).toBeVisible();
  const cursor = demo.getByRole("slider");
  await cursor.focus();
  await expect(cursor).toHaveAttribute("aria-valuenow", "90");
  await cursor.press("Home");
  await expect(cursor).toHaveAttribute("aria-valuenow", "1");
  await expect(cursor).toHaveAttribute("aria-valuetext", /^2026-01-05: open/);
  await cursor.press("ArrowRight");
  await expect(cursor).toHaveAttribute("aria-valuenow", "2");
});

test("financial-chart: the canvas draws on the hydrated wall tile", async ({
  page,
}) => {
  // The wall lists a beta item only when its page is published too.
  const published = await page.request.get("/ui/financial-chart");
  test.skip(
    published.status() === 404,
    "financial-chart is not published here",
  );
  await open(page, "/ui");
  const tile = page.locator('[data-specimen="financial-chart"]');
  await tile.scrollIntoViewIfNeeded();
  await expect(tile.locator("canvas").first()).toBeVisible();
  // The specimen is aria-hidden, so find the attribution logo by its title;
  // it must stay visible on the tile too.
  await expect(
    tile.locator('a[title="Charting by TradingView"]'),
  ).toBeVisible();
});

test("virtual-list: a named list region with positioned rows", async ({
  page,
}) => {
  await open(page, "/ui/virtual-list");
  const demo = hero(page);
  await demo.scrollIntoViewIfNeeded();
  const region = demo.getByRole("region", { name: "Tasks" });
  await expect(region).toBeVisible();
  const first = region.getByRole("listitem").first();
  await expect(first).toHaveAttribute("aria-posinset", "1");
  await expect(first).toHaveAttribute("aria-setsize", "10000");
  await region.focus();
  await page.keyboard.press("End");
  await expect
    .poll(() =>
      region.getByRole("listitem").last().getAttribute("aria-posinset"),
    )
    .toBe("10000");
});
