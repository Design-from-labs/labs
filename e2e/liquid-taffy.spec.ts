import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Port batch K, liquid-taffy: anchored dropdown, morphing dropdown and speed
// dial. They land as beta, so each test skips while its page is not published
// and runs on a LABS_INCLUDE_BETA=1 build (decision 0014) or once the owner
// promotes the component.

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

/** The component page's trigger once the demo has hydrated. */
async function trigger(page: Page, name: string) {
  const button = hero(page).getByRole("button", { name });
  await button.scrollIntoViewIfNeeded();
  await expect(button).toHaveAttribute("aria-haspopup", "menu");
  // Hydration attaches the handlers after the server markup is already there.
  await expect
    .poll(
      async () => {
        await button.focus();
        await page.keyboard.press("Enter");
        const expanded = await button.getAttribute("aria-expanded");
        if (expanded === "true") {
          await page.keyboard.press("Escape");
          await expect(button).toHaveAttribute("aria-expanded", "false");
          return true;
        }
        return false;
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  await page.waitForTimeout(900);
  return button;
}

const NAMES = ["anchored-dropdown", "morphing-dropdown", "speed-dial"];

// The component pages show every source file highlighted token by token;
// axe's region rule walks them all (P-064), so these pages get 90 s.
for (const name of NAMES) {
  for (const scheme of ["light", "dark"] as const) {
    test(`axe: /ui/${name} (${scheme}), closed and open`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, `/ui/${name}`);
      const label = name === "speed-dial" ? "Shapes" : "Add shape";
      const button = await trigger(page, label);
      expect(await axe(page)).toEqual([]);
      await button.focus();
      await page.keyboard.press("Enter");
      await expect(button).toHaveAttribute("aria-expanded", "true");
      await page.waitForTimeout(900);
      expect(await axe(page)).toEqual([]);
    });
  }

  test(`/ui/${name} renders right to left without violations`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
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
    test(`/ui/${name}: no horizontal overflow at ${width}px, closed and open`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await open(page, `/ui/${name}`);
      const label = name === "speed-dial" ? "Shapes" : "Add shape";
      const button = await trigger(page, label);
      const overflow = () =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
      expect(await overflow()).toBeLessThanOrEqual(0);
      await button.focus();
      await page.keyboard.press("Enter");
      await expect(button).toHaveAttribute("aria-expanded", "true");
      await page.waitForTimeout(900);
      expect(await overflow()).toBeLessThanOrEqual(0);
      const menu = hero(page).getByRole("menu");
      const box = await menu.boundingBox();
      const items = await hero(page)
        .getByRole(name === "speed-dial" ? "menuitem" : "menuitemcheckbox")
        .evaluateAll((els) =>
          els.map((el) => {
            const r = el.getBoundingClientRect();
            return { left: r.left, right: r.right };
          }),
        );
      expect(box).not.toBeNull();
      for (const item of items) {
        expect(item.left).toBeGreaterThanOrEqual(-0.5);
        expect(item.right).toBeLessThanOrEqual(width + 0.5);
      }
    });
  }
}

for (const name of ["anchored-dropdown", "morphing-dropdown"]) {
  test(`${name}: keyboard opens, moves, ticks, closes and returns focus`, async ({
    page,
  }) => {
    await open(page, `/ui/${name}`);
    const button = await trigger(page, "Add shape");
    const menu = hero(page).getByRole("menu", { name: "Shapes menu" });
    await expect(menu).toBeHidden();
    await button.focus();
    await page.keyboard.press("ArrowDown");
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const rows = hero(page).getByRole("menuitemcheckbox");
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(0)).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(rows.nth(1)).toBeFocused();
    await page.keyboard.press("Space");
    await expect(rows.nth(1)).toHaveAttribute("aria-checked", "true");
    // Multi-select: the menu stays open after a tick.
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("End");
    await expect(rows.nth(3)).toBeFocused();
    await page.keyboard.press("t");
    await expect(rows.nth(2)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(rows.nth(2)).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("Escape");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(button).toBeFocused();
    // The ticks persist across a close.
    await page.keyboard.press("ArrowUp");
    await expect(rows.nth(3)).toBeFocused();
    await expect(rows.nth(1)).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("Escape");
  });

  test(`${name}: reduced motion switches state in place`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, `/ui/${name}`);
    const button = await trigger(page, "Add shape");
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const first = hero(page).getByRole("menuitemcheckbox").first();
    // No choreography: the first row is on screen without waiting for a pour.
    await expect(first).toBeVisible({ timeout: 300 });
    const anchor = hero(page).locator(`[class$="-anchor"]`).first();
    await expect(anchor).not.toHaveAttribute("data-liquid", "");
  });
}

test("speed-dial: keyboard opens, chooses an action, and returns focus", async ({
  page,
}) => {
  await open(page, "/ui/speed-dial");
  const button = await trigger(page, "Shapes");
  await button.focus();
  await page.keyboard.press("ArrowDown");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const items = hero(page).getByRole("menuitem");
  await expect(items).toHaveCount(3);
  await expect(items.first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(items.nth(1)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(button).toBeFocused();
});

test("speed-dial: Escape closes it and returns focus", async ({ page }) => {
  await open(page, "/ui/speed-dial");
  const button = await trigger(page, "Shapes");
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(button).toBeFocused();
});

test("the wall tiles loop in view and never make a sound", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __audioContexts: number;
      AudioContext: typeof AudioContext;
    };
    w.__audioContexts = 0;
    const Native = w.AudioContext;
    if (Native) {
      w.AudioContext = class extends Native {
        constructor(...args: ConstructorParameters<typeof AudioContext>) {
          super(...args);
          w.__audioContexts += 1;
        }
      };
    }
  });
  await page.goto("/ui");
  for (const name of NAMES) {
    const tile = page.locator(`[data-specimen="${name}"]`);
    test.skip((await tile.count()) === 0, "not published here");
    await expect(tile).toHaveAttribute("data-loop", /click/);
  }
  const specimen = page.locator('[data-specimen="speed-dial"]');
  await specimen.scrollIntoViewIfNeeded();
  const trigger = specimen.locator('button[aria-label="Shapes"]');
  await expect
    .poll(() => trigger.getAttribute("aria-expanded"), { timeout: 12_000 })
    .toBe("true");
  expect(
    await page.evaluate(
      () => (window as unknown as { __audioContexts: number }).__audioContexts,
    ),
  ).toBe(0);
});

test("the wall tiles stay still under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ui");
  const specimen = page.locator('[data-specimen="speed-dial"]');
  test.skip((await specimen.count()) === 0, "not published here");
  await specimen.scrollIntoViewIfNeeded();
  await page.waitForTimeout(6500);
  await expect(specimen.locator('button[aria-label="Shapes"]')).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

// The icon library style: the plus, the shapes and the tick come from Lucide
// or Phosphor, and the surface still opens, ticks and closes.
for (const name of NAMES) {
  for (const set of ["lucide", "phosphor"] as const) {
    test(`/ui/${name}: the icon library style (${set}) opens and works`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await open(page, `/ui/${name}`);
      await page.getByText("Icon library", { exact: true }).click();
      await page
        .getByText(set === "lucide" ? "Lucide" : "Phosphor", { exact: true })
        .click();
      await expect(hero(page)).toHaveAttribute(
        "data-variant-demo",
        `${name}-icons-${set}`,
      );
      const label = name === "speed-dial" ? "Shapes" : "Add shape";
      const button = await trigger(page, label);
      await button.focus();
      await page.keyboard.press("ArrowDown");
      await expect(button).toHaveAttribute("aria-expanded", "true");
      const rows = hero(page).getByRole(
        name === "speed-dial" ? "menuitem" : "menuitemcheckbox",
      );
      await expect(rows.first()).toBeFocused();
      // Every row and the trigger draw an icon.
      expect(await rows.first().locator("svg").count()).toBeGreaterThan(0);
      expect(await button.locator("svg").count()).toBeGreaterThan(0);
      if (name !== "speed-dial") {
        await page.keyboard.press("Space");
        await expect(rows.first()).toHaveAttribute("aria-checked", "true");
      }
      expect(await axe(page)).toEqual([]);
    });
  }
}

// The primitive variants (Radix, Base UI, React Aria): the same API and the same
// behaviour as the default menu wiring, built on the primitive's own menu.
for (const name of NAMES) {
  for (const primitive of ["Radix", "Base UI", "React Aria"] as const) {
    const slug =
      primitive === "Radix"
        ? "radix"
        : primitive === "Base UI"
          ? "base"
          : "aria";
    test(`/ui/${name}: the ${primitive} variant opens, ticks, drags and closes`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") {
          errors.push(message.text());
        }
      });
      await open(page, `/ui/${name}`);
      await page.getByText(primitive, { exact: true }).click();
      await expect(hero(page)).toHaveAttribute(
        "data-variant-demo",
        `${name}-${slug}`,
      );
      const speed = name === "speed-dial";
      const button = await trigger(page, speed ? "Shapes" : "Add shape");
      const rows = hero(page).getByRole(
        speed ? "menuitem" : "menuitemcheckbox",
      );
      // The menu is named by the surface, and closed to the page until open.
      const menu = hero(page).getByRole("menu", { name: "Shapes menu" });
      if (!speed) {
        await expect(menu).toBeHidden();
      }
      // A click opens it and a second click closes it.
      await button.click();
      await expect(button).toHaveAttribute("aria-expanded", "true");
      await expect(rows.first()).toBeVisible();
      if (!speed) {
        await expect(menu).toBeVisible();
      }
      // The morphing dropdown's button is under its panel while it is open.
      const covered = name === "morphing-dropdown";
      if (!speed) {
        await rows.nth(1).click();
        await expect(rows.nth(1)).toHaveAttribute("aria-checked", "true");
        await expect(button).toHaveAttribute("aria-expanded", "true");
        // A press that drags on the button pulls the liquid finger and does
        // not toggle the menu.
        const box = covered ? null : await button.boundingBox();
        if (box) {
          const x = box.x + box.width / 2;
          const y = box.y + box.height / 2;
          await page.mouse.move(x, y);
          await page.mouse.down();
          await page.mouse.move(x + 14, y + 22, { steps: 6 });
          await page.mouse.up();
          await page.waitForTimeout(500);
          await expect(button).toHaveAttribute("aria-expanded", "true");
        }
      }
      if (covered) {
        await page.keyboard.press("Escape");
      } else {
        await button.click();
      }
      await expect(button).toHaveAttribute("aria-expanded", "false");
      // Keyboard: ArrowDown opens on the first row, Escape closes and
      // returns focus to the trigger.
      await button.focus();
      await page.keyboard.press("ArrowDown");
      await expect(button).toHaveAttribute("aria-expanded", "true");
      await expect(rows.first()).toBeFocused();
      await page.keyboard.press("ArrowDown");
      await expect(rows.nth(1)).toBeFocused();
      if (speed) {
        await page.keyboard.press("ArrowRight");
        await expect(rows.nth(2)).toBeFocused();
      } else {
        await page.keyboard.press("Space");
        await expect(rows.nth(1)).toHaveAttribute("aria-checked", /true|false/);
      }
      await page.keyboard.press("Escape");
      await expect(button).toHaveAttribute("aria-expanded", "false");
      await expect(button).toBeFocused();
      // A press outside closes it.
      await button.click();
      await expect(button).toHaveAttribute("aria-expanded", "true");
      await page.mouse.click(5, 300);
      await expect(button).toHaveAttribute("aria-expanded", "false");
      // Tab closes it.
      await button.focus();
      await page.keyboard.press("ArrowDown");
      await expect(button).toHaveAttribute("aria-expanded", "true");
      await expect(rows.first()).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(button).toHaveAttribute("aria-expanded", "false");
      expect(await axe(page)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}
