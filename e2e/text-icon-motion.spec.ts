import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Port batch H (text, annotation and icon motion). The items land as beta, so
// each test skips while its page is not published and runs on a
// LABS_INCLUDE_BETA=1 build (decision 0014) or once the owner promotes it.

const TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

const NAMES = [
  "slot-text",
  "calligraph",
  "split-text",
  "split-lines",
  "annotated-text",
  "morph-icon",
  "image-fx",
];

async function open(page: Page, path: string) {
  const response = await page.goto(path);
  test.skip(response?.status() === 404, `${path} is not published here`);
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .include("[data-variant-demo]:not([hidden])")
    .withTags(TAGS)
    .analyze();
  return results.violations.map(
    (v) => `${v.id}: ${v.nodes.length} node(s) ${v.nodes[0]?.target}`,
  );
}

const hero = (page: Page) => page.locator("[data-variant-demo]:not([hidden])");

for (const name of NAMES) {
  test(`/ui/${name} hydrates without page errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await open(page, `/ui/${name}`);
    await hero(page).scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });

  for (const scheme of ["light", "dark"] as const) {
    // Reduced motion gives each demo its settled frame, so axe never measures
    // contrast halfway through a reveal.
    test(`axe: /ui/${name} demo (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await open(page, `/ui/${name}`);
      await hero(page).scrollIntoViewIfNeeded();
      expect(await axe(page)).toEqual([]);
    });
  }

  test(`/ui/${name} renders right to left without violations`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, `/ui/${name}`);
    // The page's direction switch (a radio), not the word in the source view.
    const toggle = page.locator('input[data-direction][value="rtl"]');
    if (await toggle.count()) {
      await toggle.check({ force: true });
    } else {
      await hero(page).evaluate((el) => el.setAttribute("dir", "rtl"));
    }
    await expect(hero(page)).toHaveAttribute("dir", "rtl");
    await hero(page).scrollIntoViewIfNeeded();
    expect(await axe(page)).toEqual([]);
  });
}

test("slot-text: the button keeps its name while the label rolls", async ({
  page,
}) => {
  await open(page, "/ui/slot-text");
  const button = hero(page).getByRole("button", { name: "Copy" });
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await expect(
    hero(page).getByRole("button", { name: "Copied" }),
  ).toBeVisible();
  await expect(hero(page).getByRole("button", { name: "Copy" })).toBeVisible({
    timeout: 5000,
  });
});

test("calligraph: the text is read once and changes", async ({ page }) => {
  await open(page, "/ui/calligraph");
  const text = hero(page).locator(".sr-only").first();
  await text.scrollIntoViewIfNeeded();
  await expect(text).toHaveText("Calligraph");
  await expect(text).not.toHaveText("Calligraph", { timeout: 6000 });
});

test("morph-icon: each toggle is a named button with a pressed state", async ({
  page,
}) => {
  await open(page, "/ui/morph-icon");
  for (const name of ["Menu", "Play", "Dark mode"]) {
    await expect(
      hero(page).getByRole("button", { name, exact: true }),
    ).toHaveAttribute("aria-pressed", /true|false/);
  }
});

test("image-fx: a static picture shows without motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "/ui/image-fx");
  await hero(page).scrollIntoViewIfNeeded();
  await expect(
    hero(page).locator("[data-slot=image-fx-fallback]").first(),
  ).toBeVisible();
});
