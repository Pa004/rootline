import { expect, test, type Page } from "@playwright/test";

async function goAnalysis(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Analysis", exact: true }).click();
}

test("dashboard lands with KPIs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Rootline" })).toBeVisible();
  await expect(page.getByText("Corpus MRR")).toBeVisible();
});

test("candidates table renders with scores", async ({ page }) => {
  await goAnalysis(page);
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
  await goAnalysis(page);
  await page.getByRole("button", { name: "Graph explorer" }).click();
  await expect(page.getByRole("application", { name: "evidence graph" })).toBeVisible();
  await expect(page.getByLabel("show commit nodes")).toBeChecked();
});

test("keyboard selects a candidate row", async ({ page }) => {
  await goAnalysis(page);
  const row = page.getByRole("row", { name: /tweak create user lookup/ });
  await row.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Report" }).click();
  await expect(page.getByText("Contradictory evidence")).toBeVisible();
});

test("guided tour opens and escapes", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start guided tour" }).click();
  await expect(page.getByText("Step 1 of 4")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Step 1 of 4")).not.toBeVisible();
});
