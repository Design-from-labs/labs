import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Port batch K: Segmented Pill and Balloons. They land as beta, so each test
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

// The component pages show every source file highlighted token by token;
// axe's region rule walks them all (P-064), so these pages get 90 s.
for (const name of ["segmented-pill", "balloons"]) {
  for (const scheme of ["light", "dark"] as const) {
    test(`axe: /ui/${name} (${scheme})`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, `/ui/${name}`);
      await hero(page).scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
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
    await page.waitForTimeout(500);
    expect(await axe(page)).toEqual([]);
  });

  for (const width of [320, 375]) {
    test(`/ui/${name}: no horizontal overflow at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await open(page, `/ui/${name}`);
      await hero(page).scrollIntoViewIfNeeded();
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

// ---- Segmented Pill -------------------------------------------------------

/** The pill sits behind the selected item (their centers agree). */
async function pillOnSelected(page: Page, selected: string) {
  await page.waitForTimeout(500);
  const control = hero(page).locator(".segmented-pill").first();
  const pill = await control
    .locator(".segmented-pill__indicator")
    .boundingBox();
  const item = await control
    .getByText(selected, { exact: true })
    .first()
    .boundingBox();
  expect(pill).not.toBeNull();
  expect(item).not.toBeNull();
  if (!pill || !item) {
    return;
  }
  expect(
    Math.abs(pill.x + pill.width / 2 - (item.x + item.width / 2)),
  ).toBeLessThan(1.5);
}

test("segmented-pill: the default is a tablist that follows the arrow keys", async ({
  page,
}) => {
  await open(page, "/ui/segmented-pill");
  const tabs = hero(page).getByRole("tab");
  await expect(tabs).toHaveCount(3);
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
  await tabs.nth(0).focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(tabs.nth(1)).toBeFocused();
  await pillOnSelected(page, "Activity");
  await page.keyboard.press("End");
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
  await tabs.nth(2).click();
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
  await pillOnSelected(page, "Settings");
});

test("segmented-pill: right to left swaps the arrows and keeps the pill on the selection", async ({
  page,
}) => {
  await open(page, "/ui/segmented-pill");
  await page.getByTestId("switcher").getByText("rtl", { exact: true }).click();
  await expect(hero(page)).toHaveAttribute("dir", "rtl");
  const tabs = hero(page).getByRole("tab");
  await tabs.nth(0).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await pillOnSelected(page, "Activity");
});

// Radix and Base UI are toggle groups (the arrows move focus, Space selects);
// React Aria is a radio group (the arrows select as they move). Radix's
// single toggle group is a radiogroup of radios, Base UI's a group of toggle
// buttons (aria-pressed), React Aria's a radiogroup of native radios.
for (const [label, groupRole, itemRole, selected] of [
  ["Radix", "radiogroup", "radio", { attribute: "aria-checked" }],
  ["Base UI", "group", "button", { attribute: "aria-pressed" }],
  ["React Aria", "radiogroup", "radio", { checked: true }],
] as const) {
  test(`segmented-pill: the ${label} variant is a named group that moves the pill`, async ({
    page,
  }) => {
    await open(page, "/ui/segmented-pill");
    await page
      .getByTestId("switcher")
      .getByText(label, { exact: true })
      .click();
    // A variant's island hydrates once it is shown; a click before that is
    // lost, so wait for it (the same wait as ai-states.spec.ts).
    await expect(hero(page).locator("astro-island:not([ssr])")).toBeAttached();
    const group = hero(page).getByRole(groupRole, { name: "Section" });
    await expect(group).toBeVisible();
    const items = group.getByRole(itemRole);
    await expect(items).toHaveCount(3);
    const isSelected = async (index: number) => {
      if ("checked" in selected) {
        await expect(items.nth(index)).toBeChecked();
      } else {
        await expect(items.nth(index)).toHaveAttribute(
          selected.attribute,
          "true",
        );
      }
    };
    await group.getByText("Settings", { exact: true }).click();
    await isSelected(2);
    await pillOnSelected(page, "Settings");
    await items.nth(2).focus();
    await page.keyboard.press("ArrowRight");
    await expect(items.nth(0)).toBeFocused();
    await page.keyboard.press("Space");
    await isSelected(0);
    await pillOnSelected(page, "Overview");
  });
}

// The gallery stills render the demo inside a scaled wrapper (the wall scales
// tiles the same way). Rects are in screen pixels, so a pill sized from them
// would come out the wrong size there.
for (const variant of [
  "segmented-pill",
  "segmented-pill-radix",
  "segmented-pill-base",
  "segmented-pill-aria",
]) {
  test(`segmented-pill: ${variant} keeps the pill on its item under a scaled ancestor`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, `/preview/${variant}`);
    await page.waitForTimeout(500);
    const control = page.locator(".segmented-pill").first();
    const pill = await control
      .locator(".segmented-pill__indicator")
      .boundingBox();
    const item = await control
      .getByText("Overview", { exact: true })
      .first()
      .boundingBox();
    expect(pill).not.toBeNull();
    expect(item).not.toBeNull();
    if (pill && item) {
      expect(Math.abs(pill.x - item.x)).toBeLessThan(2);
      expect(Math.abs(pill.width - item.width)).toBeLessThan(2);
      expect(Math.abs(pill.height - item.height)).toBeLessThan(2);
    }
  });
}

test("segmented-pill: the registry items sit beside the stock toggle group", async ({
  page,
}) => {
  const names = [
    "segmented-pill",
    "segmented-pill-radix",
    "segmented-pill-base",
    "segmented-pill-aria",
  ];
  const first = await page.request.get("/r/segmented-pill.json");
  test.skip(first.status() === 404, "segmented-pill is not published here");
  for (const name of names) {
    const response = await page.request.get(`/r/${name}.json`);
    expect(response.ok()).toBe(true);
    const item = await response.json();
    expect(item.name).toBe(name);
    // None of the files installs over (or imports) shadcn's toggle-group.
    for (const file of item.files as {
      path: string;
      target?: string;
      content: string;
    }[]) {
      expect(`${file.path} ${file.target ?? ""}`).not.toContain("toggle-group");
      expect(file.content).not.toContain("@/components/ui/toggle-group");
    }
    expect(item.registryDependencies ?? []).not.toContain("toggle-group");
  }
});

// ---- Balloons -------------------------------------------------------------

test("balloons: a release stays inside the stage and is aria-hidden", async ({
  page,
}) => {
  await open(page, "/ui/balloons");
  const stage = hero(page).locator("div.relative.overflow-hidden").first();
  await hero(page).scrollIntoViewIfNeeded();
  await hero(page).getByRole("button", { name: "Release balloons" }).click();
  const layer = hero(page).locator("balloons");
  await expect(layer).toHaveCount(1);
  await expect(layer).toHaveAttribute("aria-hidden", "true");
  const box = await stage.boundingBox();
  const inner = await layer.boundingBox();
  expect(box).not.toBeNull();
  expect(inner).not.toBeNull();
  if (box && inner) {
    expect(inner.x).toBeGreaterThanOrEqual(box.x - 1);
    expect(inner.y).toBeGreaterThanOrEqual(box.y - 1);
    expect(inner.x + inner.width).toBeLessThanOrEqual(box.x + box.width + 1);
    expect(inner.y + inner.height).toBeLessThanOrEqual(box.y + box.height + 1);
  }
  // Nothing was added to the page outside the stage, and the page's buttons
  // stay reachable under the layer.
  await expect(page.locator("body > balloons")).toHaveCount(0);
  await expect(
    hero(page).getByRole("button", { name: "Text balloons" }),
  ).toBeEnabled();
  expect(await layer.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe(
    "none",
  );
});

test("balloons: reduced motion shows a still frame that fades out and removes itself", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "/ui/balloons");
  await hero(page).scrollIntoViewIfNeeded();
  await hero(page).getByRole("button", { name: "Release balloons" }).click();
  const layer = hero(page).locator("balloons");
  await expect(layer).toHaveCount(1);
  // Every balloon is held (paused) mid-flight: only the layer's own opacity
  // fade runs.
  const moving = await layer.evaluate(
    (el) =>
      el
        .getAnimations({ subtree: true })
        .filter((a) => a.effect?.target !== el && a.playState === "running")
        .length,
  );
  expect(moving).toBe(0);
  await expect(layer).toHaveCount(0, { timeout: 6000 });
});

test("balloons: text balloons release as letters inside the stage", async ({
  page,
}) => {
  await open(page, "/ui/balloons");
  await hero(page).scrollIntoViewIfNeeded();
  await hero(page).getByRole("button", { name: "Text balloons" }).click();
  const layer = hero(page).locator("text-balloons");
  await expect(layer).toHaveCount(1);
  await expect(layer).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("body > text-balloons")).toHaveCount(0);
});
