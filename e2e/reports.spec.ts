import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("reports", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("the job progress report lists the seeded jobs", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
    await expect(page.getByRole("main").getByText("BSC-2024-001").first()).toBeVisible();
  });

  test("each report is its own tab, and they load", async ({ page }) => {
    await page.goto("/reports");

    for (const name of ["Delays", "Site diary", "Stage claims", "Weather"]) {
      await page.getByRole("tab", { name }).click();
      // Either rows or an empty state, but never a stuck skeleton.
      await expect(
        page.getByRole("main").getByText(/row|rows|Nothing|No /).first(),
      ).toBeVisible();
    }
  });

  test("filtering by job narrows every report", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("main").getByText("BSC-2024-002").first()).toBeVisible();

    await page.getByLabel("Job", { exact: true }).click();
    await page.getByRole("option", { name: /BSC-2024-001/ }).click();

    await expect(page.getByRole("main").getByText("BSC-2024-002")).toHaveCount(0);
    await expect(page.getByRole("main").getByText("BSC-2024-001").first()).toBeVisible();
  });

  test("a report can be downloaded as a CSV", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("button", { name: "Download CSV" })).toBeVisible();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download CSV" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("job-progress.csv");
  });
});

test.describe("supervisor performance", () => {
  test("a manager sees the scores and what they are made of", async ({ page }) => {
    await signIn(page);
    await page.goto("/supervisor-performance");
    await expect(page.getByRole("heading", { name: "Supervisor performance" })).toBeVisible();
    // The parts, not just the score -- a single figure invites an argument
    // about the figure rather than about the work.
    await expect(page.getByRole("columnheader", { name: "Started on time" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Diary kept" })).toBeVisible();
  });

  test("a supervisor cannot reach it", async ({ page, context }) => {
    await context.clearCookies();
    await signIn(page, "supervisor");
    await page.goto("/supervisor-performance");
    await expect(page).toHaveURL(/\/forbidden$/);
  });
});
