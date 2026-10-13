import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Pill Toast (ports/hiaaryan-sileo). It lands as beta: CI and production
// builds do not show it, so each test skips while its page is not published
// and runs on a LABS_INCLUDE_BETA=1 build (decision 0014).

const TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

async function open(page: Page) {
  const response = await page.goto("/ui/pill-toast");
  test.skip(response?.status() === 404, "/ui/pill-toast is not published here");
}

const hero = (page: Page) => page.locator("[data-variant-demo]:not([hidden])");
// The demo is staged (an app shell in a laptop frame), so it runs in the
// stage iframe.
const staged = (page: Page) =>
  hero(page).frameLocator("iframe[data-stage-frame]");

async function violations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return results.violations.map(
    (v) => `${v.id}: ${v.nodes.length} node(s) ${v.nodes[0]?.target}`,
  );
}

for (const scheme of ["light", "dark"] as const) {
  test(`axe: /ui/pill-toast with a toast open (${scheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page);
    const frame = staged(page);
    await frame.getByRole("button", { name: "With action" }).click();
    await expect(
      frame.getByRole("group", { name: "File uploaded" }),
    ).toHaveCount(1);
    expect(await violations(page)).toEqual([]);
  });
}

test("/ui/pill-toast renders right to left without violations", async ({
  page,
}) => {
  await open(page);
  await page.getByText("rtl", { exact: true }).click();
  await expect(hero(page)).toHaveAttribute("dir", "rtl");
  const frame = staged(page);
  await frame.getByRole("button", { name: "Error" }).click();
  await expect(
    frame.getByRole("group", { name: "Something went wrong" }),
  ).toHaveCount(1);
  expect(await violations(page)).toEqual([]);
});

test("pill-toast: a toast is announced and Escape dismisses it", async ({
  page,
}) => {
  await open(page);
  const frame = staged(page);
  await frame.getByRole("button", { name: "Success" }).click();
  await expect(
    frame.getByRole("status").filter({ hasText: "Changes saved" }),
  ).toContainText("Your profile is up to date.");
  await expect(frame.getByRole("group", { name: "Changes saved" })).toHaveCount(
    1,
  );
  await frame.locator("body").press("Escape");
  await expect(frame.getByRole("group", { name: "Changes saved" })).toHaveCount(
    0,
    { timeout: 5000 },
  );
});

test("pill-toast: an error is announced assertively", async ({ page }) => {
  await open(page);
  const frame = staged(page);
  await frame.getByRole("button", { name: "Error" }).click();
  await expect(frame.getByRole("alert")).toContainText("Something went wrong");
});

test("pill-toast: keyboard focus opens the card and reaches its action", async ({
  page,
}) => {
  await open(page);
  const frame = staged(page);
  await frame.getByRole("button", { name: "With action" }).click();
  const card = frame.getByRole("group", { name: "File uploaded" });
  await card.focus();
  await page.keyboard.press("Tab");
  await expect(card).toHaveAttribute("data-expanded", "true");
  await expect(frame.getByRole("button", { name: "Share now" })).toBeFocused();
});
