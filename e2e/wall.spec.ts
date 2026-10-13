import { expect, type Locator, type Page, test } from "@playwright/test";

// The /ui specimen wall (decision 0019) and its loops (decision 0020). These
// run in the `transitions` project, on their own: the loop timing assertions
// are as load-sensitive as the morph ones (docs/pitfalls.md, P-016).

const surface = (page: Page, name: string) =>
  page.locator(`[data-specimen="${name}"]`);

/** Distinct data-loop snapshots of a specimen, sampled for `ms`. */
async function sampleStates(page: Page, specimen: Locator, ms: number) {
  const seen = new Set<string>();
  const end = Date.now() + ms;
  while (Date.now() < end) {
    seen.add(
      await specimen.evaluate((el) =>
        [...el.querySelectorAll("[data-loop]")]
          .map((node, index) => `${index}:${node.getAttribute("data-loop")}`)
          .join("|"),
      ),
    );
    await page.waitForTimeout(150);
  }
  return seen;
}

test("tiles show only the specimen: no text of their own", async ({ page }) => {
  await page.goto("/ui");
  const tiles = page.locator("a[data-tile]");
  expect(await tiles.count()).toBeGreaterThan(4);
  const problems = await tiles.evaluateAll((links) =>
    links.flatMap((link) => {
      const out: string[] = [];
      const name = link.getAttribute("data-tile");
      // Every text node in the tile belongs to the specimen.
      const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (
          node.textContent?.trim() &&
          !node.parentElement?.closest("[data-specimen]")
        ) {
          out.push(
            `${name}: text outside the specimen "${node.textContent.trim()}"`,
          );
        }
      }
      if (link.querySelector("h1, h2, h3, h4, h5, h6")) {
        out.push(`${name}: a heading`);
      }
      // The specimen is decoration: hidden from assistive technology, inert.
      const specimen = link.querySelector("[data-specimen]");
      if (
        specimen?.getAttribute("aria-hidden") !== "true" ||
        !specimen.hasAttribute("inert")
      ) {
        out.push(`${name}: the specimen is not aria-hidden and inert`);
      }
      // The link still has a name: title and a short description.
      if (!/^.+: .{10,}/.test(link.getAttribute("aria-label") ?? "")) {
        out.push(`${name}: no aria-label with a description`);
      }
      return out;
    }),
  );
  expect(problems).toEqual([]);
  await expect(page.getByRole("link", { name: /^Button: / })).toBeVisible();
});

test("phone widths: one or two columns, full bleed, no horizontal scroll", async ({
  page,
}) => {
  for (const [width, columns] of [
    [320, 1],
    [375, 2],
    [1440, 4],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/ui");
    const wall = page.getByTestId("gallery");
    const layout = await wall.evaluate((el) => ({
      columns: getComputedStyle(el).gridTemplateColumns.split(" ").length,
      left: el.getBoundingClientRect().left,
      right: el.getBoundingClientRect().right,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    }));
    expect(layout.columns, `${width}px`).toBe(columns);
    expect(layout.overflow).toBeLessThanOrEqual(0);
    if (width < 640) {
      expect(layout.left).toBe(0);
      expect(layout.right).toBe(width);
    }
  }
});

test("loops play on tiles in view", async ({ page }) => {
  await page.goto("/ui");
  const button = surface(page, "button");
  await button.scrollIntoViewIfNeeded();
  await expect(button).toHaveAttribute("data-loop-state", "playing");
  await expect(button).not.toHaveAttribute("data-loop-paused");
  // The script moves through several states (hover, press, focus...).
  const states = await sampleStates(page, button, 6500);
  expect(states.size).toBeGreaterThanOrEqual(3);
  // Fake input never follows a tile's link.
  await expect(page).toHaveURL(/\/ui$/);
  // A specimen with no controls gets the spotlight.
  const badge = surface(page, "badge");
  await badge.scrollIntoViewIfNeeded();
  await expect(badge).toHaveAttribute("data-spotlight", "");
});

test("a staged tile's loop never takes the page's focus", async ({ page }) => {
  // One full loop cycle per staged tile, one after the other: the time grows
  // with every staged entry.
  test.setTimeout(120_000);
  await page.goto("/ui");
  const staged = page.locator("[data-specimen]:has(iframe[data-stage-frame])");
  const count = await staged.count();
  test.skip(count === 0, "no staged tiles published here");
  for (let index = 0; index < count; index += 1) {
    const specimen = staged.nth(index);
    const name = await specimen.getAttribute("data-specimen");
    await specimen.scrollIntoViewIfNeeded();
    const frame = specimen.locator("iframe[data-stage-frame]");
    // The framed document is inert too: inert stops at the frame boundary.
    await expect
      .poll(() =>
        frame.evaluate(
          (el: HTMLIFrameElement) =>
            el.contentDocument?.documentElement.inert ?? false,
        ),
      )
      .toBe(true);
    const duration = await specimen.evaluate((el) => {
      try {
        return JSON.parse((el as HTMLElement).dataset.loop ?? "{}").duration;
      } catch {
        return undefined;
      }
    });
    // One full cycle: the active element is never the stage's iframe.
    const end = Date.now() + Math.min(20_000, (duration ?? 4000) + 800);
    while (Date.now() < end) {
      const active = await page.evaluate(
        () => document.activeElement?.tagName ?? "",
      );
      expect(active, `${name} moved focus into its stage`).not.toBe("IFRAME");
      await page.waitForTimeout(150);
    }
  }
});

test("loops stop offscreen and in a hidden tab", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.goto("/ui");
  const button = surface(page, "button");
  await button.scrollIntoViewIfNeeded();
  await expect(button).toHaveAttribute("data-loop-state", "playing");
  // Scroll it out of view.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(button).toHaveAttribute("data-loop-state", "paused");
  await expect(button).toHaveAttribute("data-loop-paused", "");
  expect(await sampleStates(page, button, 1500)).toEqual(new Set([""]));

  // Back in view, then the tab hides.
  await button.scrollIntoViewIfNeeded();
  await expect(button).toHaveAttribute("data-loop-state", "playing");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(button).toHaveAttribute("data-loop-state", "paused");
});

test("reduced motion: a static frame, no loops", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ui");
  const button = surface(page, "button");
  await button.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await expect(button).toHaveAttribute("data-loop-paused", "");
  await expect(button).not.toHaveAttribute("data-loop-state", "playing");
  expect(await sampleStates(page, button, 2500)).toEqual(new Set([""]));
});

test("the pause toggle stops every loop and is remembered", async ({
  page,
}) => {
  await page.goto("/ui");
  const toggle = page.getByRole("button", { name: "Pause animations" });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  const button = surface(page, "button");
  await button.scrollIntoViewIfNeeded();
  await expect(button).toHaveAttribute("data-loop-state", "playing");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(button).toHaveAttribute("data-loop-state", "paused");
  await expect(
    page.locator('[data-specimen][data-loop-state="playing"]'),
  ).toHaveCount(0);
  expect(await sampleStates(page, button, 1500)).toEqual(new Set([""]));

  // Remembered for this visitor.
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await button.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await expect(button).not.toHaveAttribute("data-loop-state", "playing");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  // Clicking the toggle may scroll the tile away; loops play only in view.
  await button.scrollIntoViewIfNeeded();
  await expect(button).toHaveAttribute("data-loop-state", "playing");
});

test("pressing a tile freezes its frame for the morph", async ({ page }) => {
  await page.goto("/ui");
  const tile = page.locator('a[data-tile="button"]');
  const button = surface(page, "button");
  await button.scrollIntoViewIfNeeded();
  // Wait for a state to be on screen, then press (without navigating).
  await expect(button.locator("[data-loop]").first()).toBeAttached({
    timeout: 8000,
  });
  await tile.dispatchEvent("pointerdown");
  await expect(button).toHaveAttribute("data-loop-state", "frozen");
  // The frame holds: whatever state was on screen stays there.
  expect((await sampleStates(page, button, 1500)).size).toBe(1);
});

test("no tile crops its specimen, at desktop and phone widths", async ({
  page,
}) => {
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/ui");
    // Bring every tile into view once, so lazy islands render and are fitted.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    });
    await page.waitForTimeout(800);
    const cropped = await page
      .locator("[data-specimen-fit]")
      .evaluateAll((wrappers) =>
        wrappers.flatMap((wrapper) => {
          const surface = wrapper.parentElement?.getBoundingClientRect();
          const box = wrapper.getBoundingClientRect();
          if (!surface) {
            return [];
          }
          const out =
            box.left < surface.left - 1 ||
            box.right > surface.right + 1 ||
            box.top < surface.top - 1 ||
            box.bottom > surface.bottom + 1;
          return out
            ? [`${wrapper.parentElement?.getAttribute("data-specimen")}`]
            : [];
        }),
      );
    expect(cropped, `${width}px`).toEqual([]);
  }
});

test("phones: no tile is taller than two rows", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/ui");
  const tall = await page.locator(".specimen-cell").evaluateAll((cells) => {
    const wall = cells[0]?.parentElement;
    const row = wall
      ? Number.parseFloat(getComputedStyle(wall).gridAutoRows)
      : 0;
    return cells
      .filter((cell) => cell.getBoundingClientRect().height > 2 * row + 6)
      .map((cell) =>
        cell.querySelector("[data-tile]")?.getAttribute("data-tile"),
      );
  });
  expect(tall).toEqual([]);
});

test("a component's own stage surface is transparent on the wall", async ({
  page,
}) => {
  await page.goto("/ui");
  const surfaces = await page.locator("[data-specimen]").evaluateAll((els) =>
    els.map((el) => {
      const name = el.getAttribute("data-specimen");
      return getComputedStyle(el).getPropertyValue(`--${name}-surface`).trim();
    }),
  );
  expect(surfaces.every((value) => value === "transparent")).toBe(true);
});

test("full-width demos fill their tile (beta ports)", async ({ page }) => {
  await page.goto("/ui");
  const grid = page.locator('[data-specimen="thiings-grid"]');
  test.skip((await grid.count()) === 0, "beta ports are not published here");
  await grid.scrollIntoViewIfNeeded();
  const width = await grid
    .locator('[aria-label="Sample grid"]')
    .evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeGreaterThan(200);
});
