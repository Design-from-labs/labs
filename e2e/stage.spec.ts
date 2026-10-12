import { expect, type FrameLocator, type Page, test } from "@playwright/test";

// Stages: layout parts in a device frame and app shell
// (docs/decisions/0015-layout-stages.md). The seed is the Labs sidebar.

const DEVICES = {
  laptop: { width: 1280, height: 800 },
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  phone: { width: 390, height: 844 },
} as const;

const hero = (page: Page) => page.locator("[data-variant-demo]:not([hidden])");
const figure = (page: Page) => hero(page).locator("[data-stage]");
const framed = (page: Page): FrameLocator =>
  hero(page).frameLocator("iframe[data-stage-frame]");

/** Waits for the framed document's sidebar to be laid out. */
async function frameReady(page: Page) {
  await expect(framed(page).locator('[data-slot="sidebar"]')).toBeVisible();
}

test("the gallery tile shows the device frame, statically", async ({
  page,
}) => {
  await page.goto("/ui");
  const tile = page.locator('[data-tile="sidebar"]');
  const stage = tile.locator("[data-stage]");
  await expect(stage).toHaveAttribute("data-device", "laptop");
  await expect(stage.locator("iframe")).toHaveAttribute(
    "src",
    "/stage/still/sidebar-lucide",
  );
  // The still has no islands: nothing hydrates on the gallery.
  const islands = await tile
    .frameLocator("iframe")
    .locator("astro-island")
    .count();
  expect(islands).toBe(0);
  // The frame carries the shared name, not the tile's preview box.
  expect(
    await stage.evaluate((el) => getComputedStyle(el).viewTransitionName),
  ).toBe("tile-preview-sidebar");
  expect(
    await tile
      .locator("[data-tile-preview]")
      .evaluate((el) => getComputedStyle(el).viewTransitionName),
  ).toBe("none");
});

for (const [device, size] of Object.entries(DEVICES)) {
  test(`device switcher: ${device}`, async ({ page }) => {
    await page.goto("/ui/sidebar");
    await frameReady(page);
    await page
      .locator("[data-device-switcher]")
      .getByText(device, { exact: false })
      .first()
      .click();
    await expect(figure(page)).toHaveAttribute("data-device", device);
    if (device !== "laptop") {
      await expect(page).toHaveURL(new RegExp(`device=${device}`));
    }
    const frame = figure(page).locator("iframe");
    await expect(frame).toHaveAttribute(
      "title",
      `Sidebar on a ${device} screen`,
    );
    // The iframe is the device's real viewport...
    const inner = await frame.evaluate((el: HTMLIFrameElement) => ({
      width: el.contentWindow?.innerWidth,
      height: el.contentWindow?.innerHeight,
    }));
    expect(inner).toEqual(size);
    // ...scaled to fill the screen exactly, at the device's aspect ratio.
    const screen = await figure(page).locator(".stage-screen").boundingBox();
    const scaled = await frame.boundingBox();
    expect(screen && scaled).toBeTruthy();
    if (screen && scaled) {
      expect(Math.abs(scaled.width - screen.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(scaled.height - screen.height)).toBeLessThanOrEqual(1);
      expect(screen.width / screen.height).toBeCloseTo(
        size.width / size.height,
        1,
      );
    }
    // The component follows the device's breakpoint: a rail from 768px, a
    // top bar with a menu button below it.
    const menu = framed(page).getByRole("button", { name: "Menu" });
    const nav = framed(page).getByRole("navigation", { name: "Studio" });
    if (size.width < 768) {
      await expect(menu).toBeVisible();
      await expect(nav).toBeHidden();
    } else {
      await expect(menu).toBeHidden();
      await expect(nav).toBeVisible();
    }
  });
}

test("the phone layout's menu is a working disclosure (live island)", async ({
  page,
}) => {
  await page.goto("/ui/sidebar?device=phone");
  await frameReady(page);
  await expect(figure(page)).toHaveAttribute("data-device", "phone");
  const menu = framed(page).getByRole("button", { name: "Menu" });
  await expect(framed(page).locator("astro-island:not([ssr])")).toBeAttached();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(
    framed(page).getByRole("navigation", { name: "Studio" }),
  ).toBeVisible();
});

test("right-to-left mirrors the slots", async ({ page }) => {
  await page.goto("/ui/sidebar");
  await frameReady(page);
  const side = async () =>
    framed(page)
      .locator('[data-slot="sidebar"]')
      .evaluate((el) => {
        const box = el.getBoundingClientRect();
        const mid = box.left + box.width / 2;
        return {
          dir: document.documentElement.dir,
          start: mid < window.innerWidth / 2 ? "left" : "right",
        };
      });
  expect(await side()).toEqual({ dir: "ltr", start: "left" });
  await page.getByText("rtl", { exact: true }).click();
  await expect.poll(side).toEqual({ dir: "rtl", start: "right" });
  // The device frame itself does not mirror.
  await expect(figure(page)).toHaveAttribute("dir", "ltr");
  // Switching device keeps the direction (the framed document stays).
  await page.locator("[data-device-switcher]").getByText("Tablet").click();
  expect(await side()).toEqual({ dir: "rtl", start: "right" });
});

test("frames cause no layout shift, on the page or inside the stage", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let total = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      })[]) {
        if (!entry.hadRecentInput) {
          total += entry.value;
        }
      }
      sessionStorage.setItem(`cls:${location.pathname}`, String(total));
    }).observe({ type: "layout-shift", buffered: true });
  });
  for (const path of ["/ui", "/ui/sidebar"]) {
    await page.goto(path);
    // The frame's box is final before the iframe loads.
    const stage =
      path === "/ui"
        ? page.locator('[data-tile="sidebar"] [data-stage]')
        : figure(page);
    const before = await stage.boundingBox();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    expect(await stage.boundingBox()).toEqual(before);
    const cls = await page.evaluate(
      (key) => Number(sessionStorage.getItem(key) ?? "0"),
      `cls:${path}`,
    );
    expect(cls).toBeLessThanOrEqual(0.1);
  }
  // Inside the live stage document.
  const inner = await page
    .locator("[data-variant-demo]:not([hidden]) iframe")
    .evaluate((el: HTMLIFrameElement) =>
      Number(
        el.contentWindow?.sessionStorage.getItem(
          `cls:${el.contentWindow.location.pathname}`,
        ) ?? "0",
      ),
    );
  expect(inner).toBeLessThanOrEqual(0.1);
});

test("phone widths: the stage fits without horizontal scroll", async ({
  page,
}) => {
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of ["/ui", "/ui/sidebar", "/ui/sidebar?device=desktop"]) {
      await page.goto(path);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        ),
      ).toBeLessThanOrEqual(0);
    }
  }
});
