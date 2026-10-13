import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Ported third-party components with sources in ports/ (scripts/export-ports.mjs).
// They land as beta: CI and production builds do not show them, so each test
// skips while its page is not published, and runs on a LABS_INCLUDE_BETA=1
// build (decision 0014) or once the owner promotes the component to ready.

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
// Gooey Toast is staged (an app shell in a laptop frame), so its demo runs in
// the stage iframe; the others render in the page.
const staged = (page: Page) =>
  hero(page).frameLocator("iframe[data-stage-frame]");

for (const name of ["text-morph", "gooey-toast", "handwriting", "dot-morph"]) {
  for (const scheme of ["light", "dark"] as const) {
    test(`axe: /ui/${name} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, `/ui/${name}`);
      await hero(page).scrollIntoViewIfNeeded();
      expect(await axe(page)).toEqual([]);
    });
  }

  test(`/ui/${name} renders right to left without violations`, async ({
    page,
  }) => {
    await open(page, `/ui/${name}`);
    // The direction switch shows when the page has a switcher (variants or a
    // stage); otherwise set the frame's direction the way the switch does.
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
}

test("text-morph: the text changes and is read once", async ({ page }) => {
  await open(page, "/ui/text-morph");
  const root = hero(page).locator("[torph-root]").first();
  await root.scrollIntoViewIfNeeded();
  await expect(root.locator("[torph-sr]")).toHaveText("Design From Labs");
  await expect(root.locator("[torph-sr]")).not.toHaveText("Design From Labs", {
    timeout: 5000,
  });
});

test("gooey-toast: a toast is announced and Escape dismisses it", async ({
  page,
}) => {
  await open(page, "/ui/gooey-toast");
  const frame = staged(page);
  await frame.getByRole("button", { name: "Success" }).click();
  await expect(frame.locator("[data-sonner-toast]")).toHaveCount(1);
  await expect(
    frame.getByRole("status").filter({ hasText: "Changes saved" }).first(),
  ).toBeAttached();
  await frame.locator("body").press("Escape");
  await expect(frame.locator("[data-sonner-toast]")).toHaveCount(0, {
    timeout: 5000,
  });
});

test("handwriting: the text stays readable", async ({ page }) => {
  await open(page, "/ui/handwriting");
  const root = hero(page).locator("[data-slot=handwriting]");
  await root.scrollIntoViewIfNeeded();
  await expect(root).toContainText("Design From Labs");
  await expect(root.locator("canvas")).toHaveAttribute("aria-hidden", "true");
});

test("dot-morph: Enter toggles the mark and the name follows", async ({
  page,
}) => {
  await open(page, "/ui/dot-morph");
  const button = hero(page).getByRole("button", { name: "Show the mark" });
  await button.scrollIntoViewIfNeeded();
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(
    hero(page).getByRole("button", { name: "Back to the menu dots" }),
  ).toHaveAttribute("aria-pressed", "true");
});
