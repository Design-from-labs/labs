import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Rough Annotation (a port with its source in ports/pshihn-rough-notation).
// It lands as beta: CI and production builds do not show it, so each test
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

const hero = (page: Page) => page.locator("[data-variant-demo]:not([hidden])");
const marks = (page: Page) => hero(page).locator("svg.rough-annotation");

async function hydrated(page: Page) {
  await hero(page).scrollIntoViewIfNeeded();
  await expect(hero(page).locator("astro-island:not([ssr])")).toBeAttached();
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return results.violations.map(
    (v) => `${v.id}: ${v.nodes.length} node(s) ${v.nodes[0]?.target}`,
  );
}

for (const scheme of ["light", "dark"] as const) {
  test(`axe: /ui/rough-annotation (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, "/ui/rough-annotation");
    await hydrated(page);
    await expect(marks(page).first()).toBeAttached();
    expect(await axe(page)).toEqual([]);
  });
}

test("/ui/rough-annotation renders right to left without violations", async ({
  page,
}) => {
  await open(page, "/ui/rough-annotation");
  const toggle = page
    .locator("label:has(input[data-direction][value=rtl])")
    .filter({ visible: true })
    .first();
  if (await toggle.count()) {
    await toggle.click();
  } else {
    await hero(page).evaluate((el) => el.setAttribute("dir", "rtl"));
  }
  await expect(hero(page)).toHaveAttribute("dir", "rtl");
  await hydrated(page);
  expect(await axe(page)).toEqual([]);
});

test("rough-annotation: the marks are decoration", async ({ page }) => {
  await open(page, "/ui/rough-annotation");
  await hydrated(page);
  await expect(marks(page)).toHaveCount(6);
  for (const svg of await marks(page).all()) {
    await expect(svg).toHaveAttribute("aria-hidden", "true");
    await expect(svg).toHaveCSS("pointer-events", "none");
  }
  // The meaning stays in the markup: the strike-through is a `del`, the
  // highlight a `mark`.
  await expect(hero(page).locator("del[data-type=strike-through]")).toHaveCount(
    1,
  );
  await expect(hero(page).locator("mark[data-type=highlight]")).toHaveCount(1);
});

test("rough-annotation: reduced motion draws every mark at once", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "/ui/rough-annotation");
  await hydrated(page);
  await expect(marks(page)).toHaveCount(6);
  const dashed = await hero(page)
    .locator("svg.rough-annotation path")
    .evaluateAll(
      (paths) =>
        paths.filter((p) => (p as SVGPathElement).style.animationName !== "")
          .length,
    );
  expect(dashed).toBe(0);
  expect(
    await hero(page).evaluate(
      (el) => el.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
});

test("rough-annotation: Replay hides the marks and draws them again", async ({
  page,
}) => {
  await open(page, "/ui/rough-annotation");
  await hydrated(page);
  const paths = hero(page).locator("svg.rough-annotation path");
  await expect(paths.first()).toBeAttached();
  const count = await paths.count();
  await hero(page).getByRole("button", { name: "Replay" }).click();
  await expect(paths).toHaveCount(0);
  await expect(paths).toHaveCount(count, { timeout: 8000 });
});
