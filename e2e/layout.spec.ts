import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/ui",
  "/ui/button",
  "/ui/badge",
  "/ui/tooltip",
  "/ui/designfrom-theme",
  "/ui/designfrom-base",
  "/credits",
];

// Explicit phone widths with mobile emulation off: an emulated mobile device
// widens its layout viewport to fit the content, which hides horizontal
// overflow (docs/pitfalls.md, P-015).
for (const width of [320, 375]) {
  test.describe(`phone width ${width}`, () => {
    test.use({
      viewport: { width, height: 800 },
      isMobile: false,
      hasTouch: false,
    });
    for (const dir of ["ltr", "rtl"] as const) {
      for (const path of PAGES) {
        test(`no horizontal page scroll (${dir}): ${path}`, async ({
          page,
        }) => {
          await page.goto(path);
          const overflow = await page.evaluate((d) => {
            document.documentElement.dir = d;
            return document.documentElement.scrollWidth - window.innerWidth;
          }, dir);
          expect(overflow).toBeLessThanOrEqual(0);
        });
      }
    }
  });
}

for (const path of ["/", "/ui", "/ui/button", "/credits"]) {
  test(`no horizontal page scroll on the device viewport: ${path}`, async ({
    page,
  }) => {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
