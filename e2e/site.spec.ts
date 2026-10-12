import { expect, type Page, test } from "@playwright/test";

const visibleSection = (page: Page) =>
  page.locator("[data-variant]:not([hidden])");

test("the hub lists products and experiments from content/projects", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Labs UI" })).toHaveAttribute(
    "href",
    "/ui",
  );
  await expect(
    page.getByRole("heading", { name: "Active experiments" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Past experiments" }),
  ).toBeVisible();
});

test("the gallery renders server-side demos without hydrating", async ({
  page,
}) => {
  await page.goto("/ui");
  const gallery = page.getByTestId("gallery");
  await expect(gallery.getByRole("link", { name: "Button" })).toBeVisible();
  await expect(gallery.getByRole("link", { name: "Badge" })).toBeVisible();
  await expect(gallery.getByRole("link", { name: "Tooltip" })).toBeVisible();
  // The tile previews are real markup from the demos, not images.
  await expect(
    gallery.locator("button", { hasText: "Save changes" }),
  ).toHaveCount(1);
  await expect(page.locator("astro-island")).toHaveCount(0);
});

test("the variant switcher changes the demo, install commands and source", async ({
  page,
}) => {
  await page.goto("/ui/button");
  const section = visibleSection(page);
  await expect(section).toHaveAttribute("data-variant", "button-radix-lucide");
  await expect(section.locator("[data-source]").first()).toContainText(
    'from "radix-ui"',
  );
  await expect(section.locator("[data-source]").first()).toContainText(
    'from "lucide-react"',
  );

  await page.getByText("Phosphor", { exact: true }).click();
  await expect(section).toHaveAttribute(
    "data-variant",
    "button-radix-phosphor",
  );
  await expect(section.locator("[data-source]").first()).toContainText(
    "@phosphor-icons/react/ssr",
  );
  await section.getByRole("tab", { name: "designfrom CLI" }).click();
  await expect(
    section
      .getByRole("tabpanel")
      .getByText("npx designfrom add button --icons phosphor"),
  ).toBeVisible();

  await page.getByText("React Aria", { exact: true }).click();
  await expect(section).toHaveAttribute("data-variant", "button-aria-phosphor");
  await expect(section.locator("[data-source]").first()).toContainText(
    "react-aria-components",
  );
  await expect(page).toHaveURL(/variant=button-aria-phosphor/);

  // A shared link opens the same variant.
  await page.goto("/ui/button?variant=button-base-lucide");
  await expect(visibleSection(page)).toHaveAttribute(
    "data-variant",
    "button-base-lucide",
  );
  await expect(page.locator('input[value="base"]')).toBeChecked();
});

test("copy puts the source, header included, on the clipboard", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "clipboard permissions are Chromium-only here",
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/ui/badge");
  const section = visibleSection(page);
  await section.getByRole("button", { name: "Copy source" }).first().click();
  await expect(
    section.getByRole("button", { name: "Copied" }).first(),
  ).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain("@dfl-header");
  expect(text).toContain("export { Badge, badgeVariants }");

  await section.getByRole("tab", { name: "designfrom CLI" }).click();
  await section
    .getByRole("tabpanel")
    .getByRole("button", { name: "Copy" })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "npx designfrom add badge",
  );
});

test("install tabs follow the tabs pattern", async ({ page }) => {
  await page.goto("/ui/button");
  const section = visibleSection(page);
  const first = section.getByRole("tab").first();
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(section.getByRole("tab", { name: "@designfrom" })).toBeFocused();
  await expect(
    section.getByRole("tab", { name: "@designfrom" }),
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(section.getByRole("tab", { name: "npm" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    section
      .getByRole("tabpanel")
      .getByText('from "@designfrom/react/radix/button"'),
  ).toBeVisible();
});

for (const primitive of ["radix", "base", "aria"] as const) {
  test(`tooltip (${primitive}) opens on keyboard focus and closes with Escape`, async ({
    page,
  }) => {
    await page.goto(`/ui/tooltip?variant=tooltip-${primitive}`);
    const frame = visibleSection(page).getByTestId("demo");
    await frame.scrollIntoViewIfNeeded();
    const trigger = frame.getByRole("button", { name: "Share" });
    await expect(trigger).toBeVisible();
    // Wait for the island to hydrate, then reach the trigger by keyboard:
    // from the direction switch, Tab moves into the demo.
    await expect(frame.locator("astro-island:not([ssr])")).toBeAttached();
    await page.locator('input[data-direction][value="ltr"]').focus();
    await page.keyboard.press("Tab");
    await expect(trigger).toBeFocused();
    await expect(page.getByRole("tooltip")).toContainText(
      "Copies a link to this page",
    );
    await expect(trigger).toHaveAttribute("aria-describedby", /.+/);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
  });
}

test("demos render right-to-left", async ({ page }) => {
  await page.goto("/ui/button");
  const frame = visibleSection(page).getByTestId("demo");
  const loading = frame.getByRole("button", { name: "Loading" });
  const ltr = await loading.evaluate((el) => {
    const icon = el.querySelector("svg")?.getBoundingClientRect();
    return icon
      ? icon.left <
          el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2
      : null;
  });
  expect(ltr).toBe(true);
  await page.getByText("rtl", { exact: true }).click();
  await expect(frame).toHaveAttribute("dir", "rtl");
  const rtl = await loading.evaluate((el) => {
    const icon = el.querySelector("svg")?.getBoundingClientRect();
    return icon
      ? icon.left >
          el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2
      : null;
  });
  expect(rtl).toBe(true);
});

test("the registry, namespace index and llms.txt are served", async ({
  request,
}) => {
  const index = await (await request.get("/r/registry.json")).json();
  const names = index.items.map((i: { name: string }) => i.name);
  expect(names).toEqual(
    expect.arrayContaining([
      "button-radix-lucide",
      "tooltip-aria",
      "badge-subtle-phosphor",
      "designfrom-theme",
      "font-figtree",
      "designfrom-base-radix-lucide",
    ]),
  );
  const item = await (await request.get("/r/button-base-phosphor.json")).json();
  expect(item.files[0].content).toContain("@dfl-header");
  expect(item.meta.primitive).toBe("base");
  const llms = await (await request.get("/llms.txt")).text();
  expect(llms).toContain("# Design From Labs");
  expect(llms).toContain("/r/button-radix-lucide.json");
  const schema = await (await request.get("/schemas/meta.schema.json")).json();
  expect(schema.$id).toBe(
    "https://labs.designfrom.com/schemas/meta.schema.json",
  );
});
