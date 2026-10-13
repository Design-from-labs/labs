import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// UI Sounds (port source ports/raphaelsalaja-audio). It lands as beta: CI and
// production builds do not show it, so each test skips while its page is not
// published, and runs on a LABS_INCLUDE_BETA=1 build (decision 0014) or once
// the owner promotes the component to ready.

const TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

// The page is heavy to audit under a loaded machine (the source view lists a
// dozen files); give each test room, as the other port specs do.
test.describe.configure({ timeout: 90_000 });

declare global {
  interface Window {
    __audio: { contexts: number; oscillators: number };
  }
}

// Counts the audio contexts and oscillators the page creates, so a test can
// tell "nothing happened until I pressed a button" from "it played".
async function spyOnAudio(page: Page) {
  await page.addInitScript(() => {
    const Real = window.AudioContext;
    window.__audio = { contexts: 0, oscillators: 0 };
    window.AudioContext = class extends Real {
      constructor(options?: AudioContextOptions) {
        super(options);
        window.__audio.contexts += 1;
      }
      createOscillator() {
        window.__audio.oscillators += 1;
        return super.createOscillator();
      }
    };
  });
}

async function open(page: Page, path: string) {
  const response = await page.goto(path);
  test.skip(response?.status() === 404, `${path} is not published here`);
}

const hero = (page: Page) => page.locator("[data-variant-demo]:not([hidden])");

async function hydrated(page: Page) {
  await hero(page).scrollIntoViewIfNeeded();
  await expect(hero(page).locator("astro-island:not([ssr])")).toBeAttached();
}

const audio = (page: Page) => page.evaluate(() => window.__audio);

for (const scheme of ["light", "dark"] as const) {
  test(`axe: /ui/ui-sounds (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, "/ui/ui-sounds");
    await hydrated(page);
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`),
    ).toEqual([]);
  });
}

test("ui-sounds: nothing plays until a button is pressed, then the keyboard plays a sound", async ({
  page,
}) => {
  await spyOnAudio(page);
  await open(page, "/ui/ui-sounds");
  await hydrated(page);
  expect(await audio(page)).toEqual({ contexts: 0, oscillators: 0 });

  const click = hero(page).getByRole("button", { name: "Click" });
  await expect(async () => {
    await click.focus();
    await page.keyboard.press("Enter");
    expect((await audio(page)).oscillators).toBeGreaterThan(0);
  }).toPass();
  expect((await audio(page)).contexts).toBe(1);
});

test("ui-sounds: the Sound switch and the volume slider work from the keyboard and mute", async ({
  page,
}) => {
  await spyOnAudio(page);
  await open(page, "/ui/ui-sounds");
  await hydrated(page);

  const sound = hero(page).getByRole("switch", { name: "Sound" });
  const volume = hero(page).getByRole("slider", { name: "Volume" });
  await expect(sound).toHaveAttribute("aria-checked", "true");
  await expect(volume).toBeEnabled();

  await expect(async () => {
    await volume.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(volume).toHaveAttribute("aria-valuetext", /^7\d%$/, {
      timeout: 1000,
    });
  }).toPass();

  await expect(async () => {
    await sound.focus();
    await page.keyboard.press("Space");
    await expect(sound).toHaveAttribute("aria-checked", "false", {
      timeout: 1000,
    });
  }).toPass();
  await expect(volume).toBeDisabled();

  await hero(page).getByRole("button", { name: "Click" }).click();
  // Muted: no voice is built.
  expect((await audio(page)).oscillators).toBe(0);

  await sound.click();
  await expect(sound).toHaveAttribute("aria-checked", "true");
  await hero(page).getByRole("button", { name: "Click" }).click();
  await expect
    .poll(async () => (await audio(page)).oscillators)
    .toBeGreaterThan(0);
});

test("ui-sounds: reduced motion keeps sounds silent, says so, and Play anyway overrides it", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await spyOnAudio(page);
  await open(page, "/ui/ui-sounds");
  await hydrated(page);

  const note = hero(page).getByRole("status");
  await expect(note).toContainText("reduced motion");
  await hero(page).getByRole("button", { name: "Click" }).click();
  expect((await audio(page)).oscillators).toBe(0);

  await note.getByRole("button", { name: "Play anyway" }).click();
  await expect(note).toHaveCount(0);
  await hero(page).getByRole("button", { name: "Click" }).click();
  await expect
    .poll(async () => (await audio(page)).oscillators)
    .toBeGreaterThan(0);
});

test("/ui/ui-sounds renders right to left without violations", async ({
  page,
}) => {
  await open(page, "/ui/ui-sounds");
  const toggle = page
    .locator("label:has(input[data-direction][value=rtl])")
    .filter({ visible: true })
    .first();
  if (await toggle.count()) {
    await toggle.click();
  } else {
    await hero(page).evaluate((el) => el.setAttribute("dir", "rtl"));
  }
  await expect(hero(page)).toHaveAttribute("dir", "rtl");
  await hydrated(page);
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`),
  ).toEqual([]);
});
