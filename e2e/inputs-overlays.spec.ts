import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";

// Port batch I: stepper, bottom sheet, product tour (staged), video player,
// flow diagram and smooth corners. They land as beta, so each test skips
// while its page is not published and runs on a LABS_INCLUDE_BETA=1 build
// (decision 0014) or once the owner promotes the component.

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
const staged = (page: Page) =>
  hero(page).frameLocator("iframe[data-stage-frame]");

/** The box of `target` against its own document's viewport. */
async function fits(target: Locator) {
  return target.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const view = el.ownerDocument.defaultView;
    const width = view?.innerWidth ?? 0;
    const doc = el.ownerDocument.documentElement;
    return {
      inside: r.left >= -0.5 && r.right <= width + 0.5,
      overflow: doc.scrollWidth - doc.clientWidth,
    };
  });
}

const NAMES = [
  "stepper",
  "bottom-sheet",
  "product-tour",
  "video-player",
  "flow-diagram",
  "smooth-corners",
];

// The component pages show every source file highlighted token by token;
// axe's region rule walks them all (P-064), so these pages get 90 s.
for (const name of NAMES) {
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
    // The switcher's rtl option; a page without variants or a stage has no
    // switcher (P-041), so set the frame's direction the way the switch does.
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

test("stepper: arrow keys move the current step", async ({ page }) => {
  await open(page, "/ui/stepper");
  const frame = staged(page);
  const pause = frame.getByRole("button", { name: /autoplay/ });
  if ((await pause.getAttribute("aria-label")) === "Pause autoplay") {
    await pause.click();
  }
  const first = frame.getByRole("button", { name: "Step 1 of 5" });
  await first.click();
  await expect(first).toHaveAttribute("aria-current", "step");
  await first.press("ArrowRight");
  await expect(
    frame.getByRole("button", { name: "Step 2 of 5" }),
  ).toHaveAttribute("aria-current", "step");
});

for (const width of [320, 375]) {
  test(`bottom-sheet: the open sheet fits the frame at ${width}px, Escape closes it`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await open(page, "/ui/bottom-sheet");
    const frame = staged(page);
    const dialog = frame.locator('dialog[data-slot="bottom-sheet-dialog"]');
    await expect(dialog).toBeVisible();
    const box = await fits(frame.locator('[data-slot="bottom-sheet"]'));
    expect(box.inside).toBe(true);
    expect(box.overflow).toBeLessThanOrEqual(0);
    await frame.locator('[data-slot="bottom-sheet"]').click({
      position: { x: 10, y: 10 },
    });
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test(`product-tour: the popover fits the frame at ${width}px, Escape ends the tour`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await open(page, "/ui/product-tour");
    const frame = staged(page);
    const start = frame.getByRole("button", { name: "Start tour" });
    await start.click();
    const popover = frame.locator(".driver-popover");
    await expect(popover).toBeVisible();
    await page.waitForTimeout(600);
    const box = await fits(popover);
    expect(box.inside).toBe(true);
    expect(box.overflow).toBeLessThanOrEqual(0);
    await page.keyboard.press("Escape");
    await expect(popover).toHaveCount(0);
    await expect(start).toBeFocused();
  });
}

test("video-player: named controls and a slider timeline", async ({ page }) => {
  await open(page, "/ui/video-player");
  const player = hero(page);
  await expect(
    player.getByRole("button", { name: /play/i }).first(),
  ).toBeVisible();
  const scrubber = player.getByRole("slider", { name: "Video progress" });
  await expect(scrubber).toHaveAttribute("aria-valuemin", "0");
});

test("flow-diagram: every node shows at a phone width", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await open(page, "/ui/flow-diagram");
  await hero(page).scrollIntoViewIfNeeded();
  for (const label of ["Validate input", "Write to database"]) {
    await expect(hero(page).getByText(label).first()).toBeVisible();
  }
});

test("smooth-corners: the shape is a clip-path once hydrated", async ({
  page,
}) => {
  await open(page, "/ui/smooth-corners");
  const shape = hero(page).locator('[data-slot="smooth-corners"]').first();
  await shape.scrollIntoViewIfNeeded();
  await expect(shape).toHaveAttribute("data-state", "ready");
  expect(await shape.evaluate((el) => getComputedStyle(el).clipPath)).toMatch(
    /^path\(/,
  );
});
