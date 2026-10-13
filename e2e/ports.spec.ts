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

// WEB-1 (CodePen and 21st.dev sources): Border Shine and Gooey Text.
// Gooey Text cross-fades two copies of its words, so a contrast check would
// catch them at some partial opacity. Freeze the loop with both copies at full
// opacity, which is the color the design actually uses.
async function holdGooey(page: Page) {
  await hero(page).evaluate((el) => {
    el.setAttribute("data-loop-paused", "");
    for (const copy of el.querySelectorAll<HTMLElement>(
      "[aria-hidden=true].flex > span",
    )) {
      copy.style.filter = "";
      copy.style.opacity = "1";
    }
  });
}

for (const name of ["border-shine", "gooey-text"]) {
  for (const scheme of ["light", "dark"] as const) {
    test(`axe: /ui/${name} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, `/ui/${name}`);
      await hero(page).scrollIntoViewIfNeeded();
      if (name === "gooey-text") {
        await holdGooey(page);
      }
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
    if (name === "gooey-text") {
      await holdGooey(page);
    }
    expect(await axe(page)).toEqual([]);
  });
}

const shineAngle = (root: ReturnType<Page["locator"]>) =>
  root.evaluate((el) =>
    (el as HTMLElement).style.getPropertyValue("--border-shine-angle"),
  );

test("border-shine: the pointer and the arrow keys turn the light", async ({
  page,
}) => {
  await open(page, "/ui/border-shine");
  const button = hero(page).getByRole("button", {
    name: "Weather: partly cloudy",
  });
  await button.scrollIntoViewIfNeeded();
  const box = await button.boundingBox();
  if (!box) {
    throw new Error("no box");
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  // The pointer to the right of the centre: 90 degrees (0 is the top).
  // (Move until the demo has hydrated and is listening.)
  let step = 0;
  await expect
    .poll(async () => {
      step += 1;
      await page.mouse.move(cx + 120 + (step % 2), cy);
      return shineAngle(button);
    })
    .toBe("90.00");
  // Keys: Home returns to the rest angle, then 15 degrees per arrow.
  await button.focus();
  await page.keyboard.press("Home");
  expect(await shineAngle(button)).toBe("325.00");
  await page.keyboard.press("ArrowRight");
  expect(await shineAngle(button)).toBe("340.00");
  await page.keyboard.press("Shift+ArrowLeft");
  expect(await shineAngle(button)).toBe("295.00");
  await page.keyboard.press("ArrowDown");
  expect(await shineAngle(button)).toBe("280.00");
});

test("border-shine: reduced motion keeps the light still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "/ui/border-shine");
  const button = hero(page).getByRole("button", {
    name: "Weather: partly cloudy",
  });
  await button.scrollIntoViewIfNeeded();
  const box = await button.boundingBox();
  if (!box) {
    throw new Error("no box");
  }
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2);
  await button.focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(200);
  expect(await shineAngle(button)).toBe("");
});

test("gooey-text: the words are read once and the copies are hidden", async ({
  page,
}) => {
  await open(page, "/ui/gooey-text");
  const root = hero(page).locator("div.relative").first();
  await root.scrollIntoViewIfNeeded();
  await expect(root.locator(".sr-only")).toHaveText(
    "Design, Engineering, Is, Awesome",
  );
  await expect(root.locator("[aria-hidden=true].flex")).toHaveCount(1);
  // The words move on their own.
  const copies = root.locator("[aria-hidden=true].flex > span");
  const text = async () => (await copies.allTextContents()).join("|");
  const first = await text();
  await expect.poll(text, { timeout: 5000 }).not.toBe(first);
});

test("gooey-text: reduced motion swaps the words with no blur", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "/ui/gooey-text");
  const copies = hero(page).locator("[aria-hidden=true].flex > span");
  await copies.first().scrollIntoViewIfNeeded();
  const filters = new Set<string>();
  const words = new Set<string>();
  for (let i = 0; i < 40; i++) {
    for (const copy of await copies.all()) {
      filters.add(
        await copy.evaluate((el) => (el as HTMLElement).style.filter),
      );
      words.add((await copy.textContent()) ?? "");
    }
    await page.waitForTimeout(100);
  }
  expect([...filters]).toEqual([""]);
  expect(words.size).toBeGreaterThan(2);
});
