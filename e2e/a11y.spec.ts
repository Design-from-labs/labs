import { existsSync, readdirSync } from "node:fs";
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
  "/ui/sidebar",
  "/ui/sidebar?device=phone",
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

// The install row, the usage block and the props table scroll sideways on a
// narrow screen. A scroll region must take keyboard focus (axe:
// scrollable-region-focusable), so each is focusable and named (P-075).
test.describe("component page at 375px", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  for (const scheme of ["light", "dark"] as const) {
    for (const path of ["/ui/badge", "/ui/button"]) {
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

  test("a scrolling install command is reachable by keyboard and named", async ({
    page,
  }) => {
    await page.goto("/ui/badge");
    const command = page
      .locator("[role=tabpanel]:visible")
      .first()
      .getByRole("group", { name: "Command" });
    const { clientWidth, scrollWidth } = await command.evaluate((el) => ({
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
    }));
    expect(scrollWidth).toBeGreaterThan(clientWidth);
    await command.focus();
    await expect(command).toBeFocused();
  });
});

// A bare preview is a whole page for axe, so it needs a level-one heading
// (P-076); axe's page-has-heading-one checks it, framed stages included.
// Beta ports have their own findings, so a beta build adds no pages here.
const PREVIEWS = [
  "badge-lucide",
  "button-radix-lucide",
  "tooltip-radix",
  "designfrom-theme",
  "sidebar-lucide",
];
const PREVIEW_DIR = "dist/preview";

for (const item of PREVIEWS) {
  test(`axe: /preview/${item}`, async ({ page }) => {
    await page.goto(`/preview/${item}`);
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(
      results.violations.map(
        (v) => `${v.id}: ${v.nodes.length} node(s) ${v.nodes[0]?.target}`,
      ),
    ).toEqual([]);
  });
}

test("a bare preview has one level-one heading naming the item", async ({
  page,
}) => {
  await page.goto("/preview/badge-lucide");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Badge preview",
  );
});

// axe cannot read a background that an SVG paints, so it reports the active
// tab's contrast as incomplete rather than measuring it. Measure it here from
// the same two colors a user sees: the tab label and the surface's fill.
const luminance = (rgb: string) => {
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? []).slice(0, 3).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const MORPHING = (existsSync(PREVIEW_DIR) ? readdirSync(PREVIEW_DIR) : [])
  .filter((f) => f.startsWith("morphing-tabs-") && f.endsWith(".html"))
  .map((f) => f.replace(/\.html$/, ""));

// Morphing Tabs is a beta port: its previews exist on a beta build only
// (LABS_INCLUDE_BETA=1), where they are checked for the hydration (P-077)
// and the surface contrast.
for (const item of MORPHING) {
  test(`axe: /preview/${item} after hydration`, async ({ page }) => {
    await page.goto(`/preview/${item}`);
    await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
    await expect(page.locator("[data-slot=morphing-tabs] > svg")).toHaveCount(
      1,
    );
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(
      results.violations.map(
        (v) => `${v.id}: ${v.nodes.length} node(s) ${v.nodes[0]?.target}`,
      ),
    ).toEqual([]);
  });

  test(`morphing tabs: active label contrast on its surface (${item})`, async ({
    page,
  }) => {
    await page.goto(`/preview/${item}`);
    const surface = page.locator("[data-slot=morphing-tabs] > svg path");
    await expect(surface.first()).toBeAttached();
    const fill = await surface
      .first()
      .evaluate((el) => getComputedStyle(el).fill);
    const color = await page
      .locator("[role=tab][aria-selected=true]")
      .evaluate((tab) => {
        const label = [tab, ...tab.querySelectorAll("*")].find((el) =>
          [...el.childNodes].some(
            (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
          ),
        );
        return getComputedStyle(label ?? tab).color;
      });
    const [a, b] = [luminance(fill), luminance(color)].sort((x, y) => y - x);
    // Measured at 17.0:1 (#181818 on #fafaf8).
    expect((a + 0.05) / (b + 0.05)).toBeGreaterThan(7);
  });
}
