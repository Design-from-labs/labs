import { expect, test } from "@playwright/test";

for (const path of ["/", "/ui", "/ui/button", "/credits"]) {
  test(`no horizontal page scroll at phone width: ${path}`, async ({
    page,
  }) => {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
