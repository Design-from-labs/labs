import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Shimmer Lines and Text Shimmer (pen ports, WEB-1). They land
// as beta, so each test skips while its page is not published and runs on a
// LABS_INCLUDE_BETA=1 build (decision 0014) or once the components are ready.

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

for (const name of ["shimmer-lines", "text-shimmer"]) {
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

  test(`/ui/${name} does nothing but stand still under reduced motion`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, `/ui/${name}`);
    const moving = await hero(page).evaluate((el) =>
      el
        .getAnimations({ subtree: true })
        .filter(
          (a) => a.effect?.getTiming().iterations === Number.POSITIVE_INFINITY,
        )
        .map((a) => (a as CSSAnimation).animationName),
    );
    expect(moving).toEqual([]);
  });
}

test("shimmer-lines: editing a line changes how long its sweep lasts", async ({
  page,
}) => {
  await open(page, "/ui/shimmer-lines");
  const line = hero(page).getByRole("textbox").last();
  await line.scrollIntoViewIfNeeded();
  // Typing before hydration would be overwritten when React takes over.
  await expect(hero(page).locator("astro-island:not([ssr])")).toBeAttached();
  const duration = () =>
    line.evaluate((el) => getComputedStyle(el).animationDuration);
  const before = await duration();
  await line.click();
  await page.keyboard.press("End");
  await page.keyboard.type("!!!!!");
  expect(await duration()).not.toBe(before);
  await page.keyboard.press("Enter");
  // Enter is blocked: the line stays one text node, with no break or block.
  expect(
    await line.evaluate((el) => ({
      children: el.children.length,
      newline: (el.textContent ?? "").includes("\n"),
    })),
  ).toEqual({ children: 0, newline: false });
});

test("text-shimmer: the text is read once, the shine copy is hidden", async ({
  page,
}) => {
  await open(page, "/ui/text-shimmer");
  const root = hero(page).locator("[data-slot=text-shimmer]").first();
  await root.scrollIntoViewIfNeeded();
  const shine = root.locator("[data-slot=text-shimmer-shine]");
  await expect(shine).toHaveAttribute("aria-hidden", "true");
  await expect(shine).toHaveJSProperty("inert", true);
  // Exactly one copy of the words is exposed to assistive technology.
  await expect(root.locator(":scope > :not([aria-hidden])")).toHaveText(
    "Thinking in progress",
  );
});
