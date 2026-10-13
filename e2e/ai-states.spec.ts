import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// AI interface states and loaders (port batch ai-states, sources in ports/).
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

const PRIMITIVES = ["radix", "base", "aria"] as const;

// axe needs about 20 s on the MessageActions page, whose source view lists
// every file of six items (docs/pitfalls.md, P-123); give each test room.
test.describe.configure({ timeout: 90_000 });

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

async function hydrated(page: Page) {
  await hero(page).scrollIntoViewIfNeeded();
  await expect(hero(page).locator("astro-island:not([ssr])")).toBeAttached();
}

const COMPONENTS = [
  "reasoning-steps",
  "message-actions",
  "streamed-text-loader",
  "inline-activity-loader",
  "image-generation-loader",
  "shimmer-trace",
  "gradient-spin",
];

for (const name of COMPONENTS) {
  for (const scheme of ["light", "dark"] as const) {
    test(`axe: /ui/${name} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, `/ui/${name}`);
      await hydrated(page);
      expect(await axe(page)).toEqual([]);
    });
  }

  test(`/ui/${name} renders right to left without violations`, async ({
    page,
  }) => {
    await open(page, `/ui/${name}`);
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
}

for (const primitive of PRIMITIVES) {
  test(`reasoning-steps (${primitive}): Enter toggles the timeline and the active step is announced`, async ({
    page,
  }) => {
    await open(
      page,
      `/ui/reasoning-steps?variant=reasoning-steps-${primitive}-lucide`,
    );
    await hydrated(page);
    const trigger = hero(page).getByRole("button", { name: /Reasoning/ });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    // The island may still be attaching its listeners right after hydration.
    await expect(async () => {
      await trigger.focus();
      await page.keyboard.press("Enter");
      await expect(trigger).toHaveAttribute("aria-expanded", "true", {
        timeout: 1000,
      });
    }).toPass();
    await expect(
      hero(page).getByText("Reading the request").first(),
    ).toBeVisible();
    // The live region carries the active step's label.
    await expect(hero(page).getByRole("status")).not.toBeEmpty({
      timeout: 5000,
    });
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(await axe(page)).toEqual([]);
  });

  test(`message-actions (${primitive}): tooltips, the menu and the reaction bar work from the keyboard`, async ({
    page,
  }) => {
    await open(
      page,
      `/ui/message-actions?variant=message-actions-${primitive}`,
    );
    await hydrated(page);
    const good = hero(page).getByRole("button", { name: "Good response" });
    await expect(async () => {
      await good.blur();
      await good.focus();
      await expect(
        page.getByRole("tooltip").filter({ hasText: "Good response" }),
      ).toBeVisible({ timeout: 1000 });
    }).toPass();
    await expect(good).toHaveAttribute("aria-describedby", /.+/);
    await page.keyboard.press("Enter");
    await expect(good).toHaveAttribute("aria-pressed", "true");

    const copy = hero(page).getByRole("button", { name: "Copy message" });
    // A real pointer moves before it hovers (docs/pitfalls.md, P-110).
    await page.mouse.move(2, 2);
    await page.mouse.move(4, 4);
    await copy.hover();
    await expect(
      page.getByRole("tooltip").filter({ hasText: "Copy message" }),
    ).toBeVisible();
    // "Copied" lasts 900 ms, so start waiting for it before the click.
    const copiedTip = page
      .getByRole("tooltip")
      .filter({ hasText: "Copied" })
      .waitFor();
    const copiedStatus = hero(page)
      .getByRole("status")
      .filter({ hasText: "Copied" })
      .waitFor({ state: "attached" });
    await copy.click();
    await Promise.all([copiedTip, copiedStatus]);

    const more = hero(page).getByRole("button", { name: "More actions" });
    await more.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem")).toHaveCount(3);
    await page.keyboard.press("ArrowDown");
    await expect(
      menu.getByRole("menuitem").filter({ hasText: "Fork chat" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(more).toBeFocused();

    const react = hero(page).getByRole("button", { name: "Add reaction" });
    await react.focus();
    await page.keyboard.press("Enter");
    const bar = page.getByRole("toolbar", { name: "Reactions" });
    await expect(bar).toBeVisible();
    await expect(bar.getByRole("button", { name: "👍" })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(bar.getByRole("button", { name: "❤️" })).toBeFocused();
    expect(await axe(page)).toEqual([]);
    await page.keyboard.press("Enter");
    await expect(bar).toHaveCount(0);
    await expect(
      hero(page).getByRole("button", { name: "Reaction ❤️" }),
    ).toBeVisible();
  });
}

test("loaders: each status carries real text for screen readers", async ({
  page,
}) => {
  const checks: [string, RegExp][] = [
    ["/ui/image-generation-loader", /Generating image/],
    ["/ui/inline-activity-loader", /Assistant is thinking/],
    ["/ui/gradient-spin", /Saving changes/],
  ];
  for (const [path, text] of checks) {
    await open(page, path);
    await hydrated(page).catch(() => hero(page).scrollIntoViewIfNeeded());
    await expect(
      hero(page).getByRole("status").filter({ hasText: text }).first(),
    ).toBeAttached();
  }
});

test("shimmer-trace: the loading status is outside the hidden skeleton", async ({
  page,
}) => {
  await open(page, "/ui/shimmer-trace");
  await hydrated(page);
  const status = hero(page)
    .getByRole("status")
    .filter({ hasText: "Loading profile" });
  await expect(status.first()).toBeAttached();
  expect(
    await status
      .first()
      .evaluate((el) => el.closest("[aria-hidden=true]") === null),
  ).toBe(true);
});

test("loaders hold still under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const name of [
    "inline-activity-loader",
    "image-generation-loader",
    "gradient-spin",
  ]) {
    await open(page, `/ui/${name}`);
    await hero(page).scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const a = await hero(page).screenshot();
    await page.waitForTimeout(600);
    const b = await hero(page).screenshot();
    expect(a.equals(b), `${name} moved under reduced motion`).toBe(true);
  }
});
