import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const TABS = ["Candidates", "Graph explorer", "Report"] as const;
const THEMES = ["dark", "light"] as const;

for (const theme of THEMES) {
  for (const tab of TABS) {
    test(`axe: ${tab} tab in ${theme} mode has no critical violations`, async ({ page }) => {
      await page.goto("/");
      const toggle = page.getByRole("button", { name: /switch to .* mode/ });
      const wantLight = theme === "light";
      const pressed = await toggle.getAttribute("aria-pressed");
      if ((pressed === "true") !== wantLight) {
        await toggle.click();
      }
      await page.getByRole("button", { name: tab, exact: true }).click();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22a", "wcag22aa"])
        .analyze();
      const critical = results.violations.filter((v) =>
        ["critical", "serious"].includes(v.impact ?? ""),
      );
      expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
    });
  }
}

test("skip link targets results and moves focus", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to results" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("reduced motion disables transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const seconds = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.body).transitionDuration),
  );
  expect(seconds).toBeLessThanOrEqual(0.001);
});
