import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Canvas effects (decision 0021): the static fallback shows without WebGL and
// under reduced motion, the canvas takes over when the loop draws, and the
// component page stays axe clean. Beta entries exist only on preview builds
// (LABS_INCLUDE_BETA=1, decision 0014); elsewhere these tests skip.
const EFFECTS = [
  "holo-sticker",
  "holo-foil",
  "iridescent-ribbon",
  "globe",
] as const;

async function open(page: Page, name: string) {
  const response = await page.goto(`/ui/${name}`);
  test.skip(response?.status() === 404, `${name} is not built (beta)`);
  await page.locator('[data-testid="demo"]').first().scrollIntoViewIfNeeded();
  return page.locator(`[data-testid="demo"] [data-slot="${name}"]`);
}

for (const name of EFFECTS) {
  test(`${name}: draws on its canvas when WebGL 2 exists`, async ({ page }) => {
    const root = await open(page, name);
    const webgl2 = await page.evaluate(
      () => !!document.createElement("canvas").getContext("webgl2"),
    );
    test.skip(!webgl2, "no WebGL 2 in this browser");
    await expect(root).toHaveAttribute("data-status", "ready");
    // The fallback fades out (a 300 ms transition); assert the end state.
    await expect(root.locator(`[data-slot="${name}-fallback"]`)).toHaveClass(
      /\bopacity-0\b/,
    );
  });

  test(`${name}: shows its fallback without WebGL`, async ({ page }) => {
    await page.addInitScript(() => {
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
    const root = await open(page, name);
    await expect(root).toHaveAttribute("data-status", "unsupported");
    await expect(root.locator("canvas")).toBeHidden();
    await expect(root.locator(`[data-slot="${name}-fallback"]`)).toHaveCSS(
      "opacity",
      "1",
    );
  });

  test(`${name}: draws again after a lost WebGL context`, async ({ page }) => {
    const root = await open(page, name);
    const webgl2 = await page.evaluate(
      () => !!document.createElement("canvas").getContext("webgl2"),
    );
    test.skip(!webgl2, "no WebGL 2 in this browser");
    await expect(root).toHaveAttribute("data-status", "ready");
    // getContext returns the canvas's existing context (null for the other
    // type), so this finds the effect's own context.
    const lose = (restore: boolean) =>
      root
        .locator("canvas")
        .first()
        .evaluate((canvas, restore) => {
          const c = canvas as HTMLCanvasElement;
          const gl = (c.getContext("webgl2") ??
            c.getContext("webgl")) as WebGLRenderingContext | null;
          const ext = gl?.getExtension("WEBGL_lose_context");
          if (restore) ext?.restoreContext();
          else ext?.loseContext();
          return !!ext;
        }, restore);
    test.skip(!(await lose(false)), "no WEBGL_lose_context");
    await expect(root).toHaveAttribute("data-status", "lost");
    await lose(true);
    await expect(root).toHaveAttribute("data-status", "ready");
  });

  test(`${name}: shows its fallback under reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const root = await open(page, name);
    await expect(root).toHaveAttribute("data-status", "reduced-motion");
    await expect(root.locator(`[data-slot="${name}-fallback"]`)).toBeVisible();
  });
}

test("lenticular: arrow keys step through the views", async ({ page }) => {
  const root = await open(page, "lenticular");
  await expect(root).toHaveAttribute("data-status", "ready");
  await expect(root).toHaveAttribute("aria-valuetext", /View \d of 3/);
  await root.focus();
  const before = await root.getAttribute("aria-valuetext");
  await page.keyboard.press("ArrowRight");
  await expect(root).not.toHaveAttribute("aria-valuetext", before ?? "");
  await page.keyboard.press("Home");
  await expect(root).toHaveAttribute("aria-valuenow", "0");
});

// Dot Halftone is a 2D canvas: under reduced motion it draws its dots at once
// (upstream's own branch) instead of showing the fallback.
test("dot-halftone: draws on its canvas", async ({ page }) => {
  const root = await open(page, "dot-halftone");
  await expect(root).toHaveAttribute("data-status", "ready");
  await expect(root.locator('[data-slot="dot-halftone-fallback"]')).toHaveClass(
    /\bopacity-0\b/,
  );
});

test("dot-halftone: shows its fallback without a 2D canvas", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      // The demo's own sampling canvases are detached; block only the
      // drawn one.
      if (type === "2d" && this.dataset.slot === "dot-halftone-canvas") {
        return null;
      }
      return (original as (...args: unknown[]) => unknown).call(
        this,
        type,
        ...rest,
      );
    } as typeof original;
  });
  const root = await open(page, "dot-halftone");
  await expect(root).toHaveAttribute("data-status", "unsupported");
  await expect(root.locator('[data-slot="dot-halftone-fallback"]')).toHaveCSS(
    "opacity",
    "1",
  );
});

test("dot-halftone: draws still dots under reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const root = await open(page, "dot-halftone");
  await expect(root).toHaveAttribute("data-status", "ready");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("vector-dither: the dithered SVG is in the server render", async ({
    page,
  }) => {
    const root = await open(page, "vector-dither");
    const svg = root.locator('[data-slot="vector-dither-svg"]');
    await expect(svg).toBeVisible();
    expect(await svg.locator("rect").count()).toBeGreaterThan(10);
  });
});

for (const name of [
  ...EFFECTS,
  "lenticular",
  "glass",
  "dot-halftone",
  "vector-dither",
]) {
  test(`${name}: hydrates without page errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await open(page, name);
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });

  test(`axe: /ui/${name}`, async ({ page }) => {
    // The page shows every source file of the item; axe's region rule walks
    // each highlighted token, which takes a while for the larger ports.
    test.setTimeout(90_000);
    // Reduced motion keeps the effects still (their fallback shows), so axe is
    // not starved by a software-rendered WebGL loop; the markup is the same.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, name);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"])
      .analyze();
    expect(
      results.violations.map(
        (v) => `${v.id}: ${v.nodes.length} node(s) ${v.nodes[0]?.target}`,
      ),
    ).toEqual([]);
  });
}
