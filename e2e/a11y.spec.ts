import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];
const PAGES = [
  "/",
  "/ui",
  "/ui/button",
  "/ui/badge",
  "/ui/tooltip",
  "/ui/designfrom-theme",
  "/ui/use-reduced-motion",
  "/credits",
  "/404",
];

for (const scheme of ["light", "dark"] as const) {
  for (const path of PAGES) {
    test(`axe: ${path} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.length} node(s) ${v.nodes[0]?.target}`,
        ),
      ).toEqual([]);
    });
  }
}

test("axe: a component page after switching variant and direction", async ({
  page,
}) => {
  await page.goto("/ui/badge");
  await page.getByText("Subtle", { exact: true }).click();
  await page.getByText("rtl", { exact: true }).click();
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`),
  ).toEqual([]);
});
