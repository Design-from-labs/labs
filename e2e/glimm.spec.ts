import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Glimm (port batch WEB-2, source in ports/nomanijaz-glimm). It lands as beta:
// CI and production builds do not show it, so each test skips while its page
// is not published, and runs on a LABS_INCLUDE_BETA=1 build (decision 0014) or
// once the owner promotes the component to ready.

const TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

async function open(page: Page, path = "/ui/glimm") {
  const response = await page.goto(path);
  test.skip(response?.status() === 404, `${path} is not published here`);
}

const hero = (page: Page) => page.locator("[data-variant-demo]:not([hidden])");
const root = (page: Page) => hero(page).locator('[data-slot="glimm"]');
const trigger = (page: Page) =>
  hero(page).getByRole("button", { name: /^Show (the plan|today)$/ });

async function hydrated(page: Page) {
  await hero(page).scrollIntoViewIfNeeded();
  await expect(hero(page).locator("astro-island:not([ssr])")).toBeAttached();
}

/** The status the render loop reports once the demo is hydrated. */
async function ready(page: Page) {
  await hydrated(page);
  await expect(root(page)).toHaveAttribute("data-status", /.+/);
}

function blockWebGL(page: Page) {
  return page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      if (type.startsWith("webgl")) {
        return null;
      }
      return (original as (...args: unknown[]) => unknown).call(
        this,
        type,
        ...rest,
      );
    } as typeof original;
  });
}

test("glimm: a sweep swaps the view and lands focus on its heading", async ({
  page,
}) => {
  await open(page);
  await hydrated(page);
  const webgl = await page.evaluate(
    () => !!document.createElement("canvas").getContext("webgl"),
  );
  test.skip(!webgl, "no WebGL in this browser");
  await expect(root(page)).toHaveAttribute("data-status", "ready");
  await expect(
    root(page).getByRole("heading", { name: "Today" }),
  ).toBeVisible();
  await trigger(page).click();
  // While the band crosses, the outgoing view is a frozen, inert copy.
  await expect(root(page).locator('[data-slot="glimm-snapshot"]')).toHaveCount(
    1,
  );
  await expect(
    root(page).locator('[data-slot="glimm-snapshot"]'),
  ).toHaveAttribute("aria-hidden", "true");
  // Software GL can take a while to draw the 1.3 s sweep.
  await expect(root(page).locator('[data-slot="glimm-snapshot"]')).toHaveCount(
    0,
    { timeout: 20_000 },
  );
  const heading = root(page).getByRole("heading", { name: "Plan" });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
  await expect(trigger(page)).toHaveText("Show today");
});

test("glimm: without WebGL a sweep wipes the view and still lands focus", async ({
  page,
}) => {
  await blockWebGL(page);
  await open(page);
  await hydrated(page);
  await expect(root(page)).toHaveAttribute("data-status", "unsupported");
  await trigger(page).click();
  await expect(root(page).getByRole("heading", { name: "Plan" })).toBeFocused({
    timeout: 20_000,
  });
  await expect(root(page).locator('[data-slot="glimm-snapshot"]')).toHaveCount(
    0,
    { timeout: 20_000 },
  );
});

test("glimm: reduced motion crossfades and keeps focus management", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await hydrated(page);
  await expect(root(page)).toHaveAttribute("data-status", "reduced-motion");
  await trigger(page).click();
  const heading = root(page).getByRole("heading", { name: "Plan" });
  await expect(heading).toBeFocused();
  await expect(root(page).locator('[data-slot="glimm-snapshot"]')).toHaveCount(
    0,
    { timeout: 5000 },
  );
  // No band is drawn: the shader never ran.
  await expect(root(page)).toHaveAttribute("data-status", "reduced-motion");
});

test("glimm: a lost WebGL context falls back, and a restored one draws again", async ({
  page,
}) => {
  await open(page);
  await hydrated(page);
  const webgl = await page.evaluate(
    () => !!document.createElement("canvas").getContext("webgl"),
  );
  test.skip(!webgl, "no WebGL in this browser");
  await expect(root(page)).toHaveAttribute("data-status", "ready");
  type Lossy = HTMLCanvasElement & { lossExt?: WEBGL_lose_context | null };
  const lose = (restore: boolean) =>
    root(page)
      .locator("canvas")
      .first()
      .evaluate((canvas, restore) => {
        const c = canvas as Lossy;
        if (!restore) {
          const gl = c.getContext("webgl") as WebGLRenderingContext | null;
          c.lossExt = gl?.getExtension("WEBGL_lose_context") ?? null;
          c.lossExt?.loseContext();
        } else {
          c.lossExt?.restoreContext();
        }
        return !!c.lossExt;
      }, restore);
  test.skip(!(await lose(false)), "no WEBGL_lose_context");
  await expect(root(page)).toHaveAttribute("data-status", "lost");
  // A sweep while lost still swaps the view (the wipe, without the band).
  await trigger(page).click();
  await expect(root(page).getByRole("heading", { name: "Plan" })).toBeFocused({
    timeout: 20_000,
  });
  await lose(true);
  await expect(root(page)).toHaveAttribute("data-status", "ready");
});

test("glimm: the band follows the reading direction", async ({ page }) => {
  await open(page);
  await hydrated(page);
  const clipAtStart = async (dir: "ltr" | "rtl") => {
    await hero(page).evaluate((el, dir) => el.setAttribute("dir", dir), dir);
    await trigger(page).click();
    const snapshot = root(page).locator('[data-slot="glimm-snapshot"]');
    await expect(snapshot).toHaveCount(1);
    const clip = await snapshot.evaluate(
      (el) => (el as HTMLElement).style.clipPath,
    );
    await expect(snapshot).toHaveCount(0, { timeout: 20_000 });
    return clip;
  };
  // The outgoing view is clipped from the side the band has already crossed:
  // the start side in LTR (left) and the end side in RTL (right).
  expect(await clipAtStart("ltr")).toMatch(
    /^inset\(0(px)? 0(px)? 0(px)? [\d.]+%\)$/,
  );
  expect(await clipAtStart("rtl")).toMatch(
    /^inset\(0(px)? [\d.]+% 0(px)? 0(px)?\)$/,
  );
});

test("glimm: axe finds no violations (light and dark)", async ({ page }) => {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page);
    await ready(page);
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`),
    ).toEqual([]);
  }
});

test("glimm: renders right to left without violations", async ({ page }) => {
  await open(page);
  await ready(page);
  // The component page has no direction switch for this entry; set the frame's
  // direction the way the switch does.
  await hero(page).evaluate((el) => el.setAttribute("dir", "rtl"));
  await expect(hero(page)).toHaveAttribute("dir", "rtl");
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`),
  ).toEqual([]);
});
