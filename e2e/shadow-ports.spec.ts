import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Neumorphic Panel and Elevation, ported from two CodePen pens (ports/). They
// land as beta: CI and production builds do not show them, so each test skips
// while its page is not published, and runs on a LABS_INCLUDE_BETA=1 build
// (decision 0014) or once the owner promotes them to ready.

const TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];
const NAMES = ["neumorphic-panel", "elevation"];

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

for (const name of NAMES) {
  for (const scheme of ["light", "dark"] as const) {
    // Fidelity default, contrast on request: the Neumorphic Panel keeps the
    // pen's faint text (1.25:1) unless the visitor asks for more contrast, so
    // axe runs with that request on for both components.
    test(`axe: /ui/${name} (${scheme}, more contrast)`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, contrast: "more" });
      await open(page, `/ui/${name}`);
      await hero(page).scrollIntoViewIfNeeded();
      expect(await axe(page)).toEqual([]);
    });
  }

  test(`/ui/${name} renders right to left without violations`, async ({
    page,
  }) => {
    await page.emulateMedia({ contrast: "more" });
    await open(page, `/ui/${name}`);
    const toggle = page.getByText("rtl", { exact: true });
    if (await toggle.count()) {
      await toggle.click();
    } else {
      await hero(page).evaluate((el) => el.setAttribute("dir", "rtl"));
    }
    await expect(hero(page)).toHaveAttribute("dir", "rtl");
    await hero(page).scrollIntoViewIfNeeded();
    expect(await axe(page)).toEqual([]);
  });

  for (const width of [320, 375]) {
    test(`/ui/${name} has no horizontal page scroll at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await open(page, `/ui/${name}`);
      await hero(page).scrollIntoViewIfNeeded();
      const extra = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(extra).toBeLessThanOrEqual(0);
    });
  }
}

test("neumorphic-panel: Space toggles the pressed look and state", async ({
  page,
}) => {
  await open(page, "/ui/neumorphic-panel");
  const button = hero(page).getByRole("button", { name: "E8EAE9 panel" });
  await button.scrollIntoViewIfNeeded();
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(button).toHaveAttribute("data-state", "raised");
  await button.focus();
  await page.keyboard.press("Space");
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(button).toHaveAttribute("data-state", "pressed");
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-pressed", "false");
});

test("neumorphic-panel: the pen's squircle and shadows are in place", async ({
  page,
}) => {
  await open(page, "/ui/neumorphic-panel");
  const panel = hero(page).locator("[data-slot=neumorphic-panel]").first();
  await panel.scrollIntoViewIfNeeded();
  const box = await panel.boundingBox();
  expect(Math.round(box?.width ?? 0)).toBeLessThanOrEqual(300);
  const shadow = await panel.evaluate((el) => getComputedStyle(el).boxShadow);
  // Raised: the highlight (top start) and the faint shadow, two layers.
  expect(shadow.match(/rgba?\(/g)).toHaveLength(2);
});

test("elevation: every light and dark level has its own shadow", async ({
  page,
}) => {
  await open(page, "/ui/elevation");
  const cards = hero(page).locator("[data-slot=elevation]");
  await expect(cards).toHaveCount(15);
  const shadows = await cards.evaluateAll((els) =>
    els.map((el) => getComputedStyle(el).boxShadow),
  );
  // Dark level 0 is "none"; the rest all differ from each other per scale.
  expect(shadows[0]).toBe("none");
  expect(new Set(shadows.slice(0, 8)).size).toBe(8);
  expect(new Set(shadows.slice(8)).size).toBe(7);
});
