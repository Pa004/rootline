import { expect, test } from "@playwright/test";

test("candidates table renders with scores", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Rootline" })).toBeVisible();
  await expect(page.getByText("tweak create user lookup")).toBeVisible();
  await expect(page.getByText("0.30")).toBeVisible();
});

test("theme toggle switches data-theme", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("graph explorer renders cytoscape canvas", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Graph explorer" }).click();
  await expect(page.getByRole("application", { name: "evidence graph" })).toBeVisible();
  await expect(page.getByLabel("show commit nodes")).toBeChecked();
});

test("keyboard selects a candidate row", async ({ page }) => {
  await page.goto("/");
  const row = page.getByRole("row", { name: /tweak create user lookup/ });
  await row.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Report" }).click();
  await expect(page.getByText("Contradictory evidence")).toBeVisible();
});
