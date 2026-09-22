import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("shows the counts, the action board and the calendar", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Good to see you/ })).toBeVisible();
    await expect(page.getByText("Active jobs")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Calendar" })).toBeVisible();
  });

  test("a count opens the list behind it", async ({ page }) => {
    await page.goto("/dashboard");
    // A number nobody can drill into is not worth showing.
    await page.getByRole("button", { name: /Active jobs/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Jobs" })).toBeVisible();
    await expect(dialog.getByText(/BSC-2024-00\d/).first()).toBeVisible();
  });

  test("the action board has its three columns", async ({ page }) => {
    await page.goto("/dashboard");
    const board = page.getByRole("main");
    await expect(board.getByRole("heading", { name: /Needs doing/ })).toBeVisible();
    await expect(board.getByRole("heading", { name: /Being done/ })).toBeVisible();
    await expect(board.getByRole("heading", { name: /^Done/ })).toBeVisible();
  });

  test("the calendar pages by month and comes back to today", async ({ page }) => {
    await page.goto("/dashboard");
    const heading = page.getByRole("heading", { level: 2 }).filter({ hasText: /\d{4}$/ }).first();
    const before = await heading.textContent();

    await page.getByRole("button", { name: "Next month" }).click();
    await expect(heading).not.toHaveText(before ?? "");

    await page.getByRole("button", { name: "Today" }).click();
    await expect(heading).toHaveText(before ?? "");
  });

  test("the timeline tab draws the programme", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("tab", { name: "Timeline" }).click();
    // Either bars or an honest empty state, never a stuck skeleton.
    await expect(
      page.getByRole("main").getByText(/Planned|Nothing to chart/).first(),
    ).toBeVisible();
  });
});
