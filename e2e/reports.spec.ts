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

    for (const name of ["Delays", "Site diary", "Stage claims", "Weather", "Supervisor"]) {
      await page.getByRole("tab", { name }).click();
      // Either rows or an empty state, but never a stuck skeleton.
      await expect(
        page.getByRole("main").getByText(/row|rows|Nothing|No /).first(),
      ).toBeVisible();
    }
  });

  test("the open tab is in the URL, so a link opens on it", async ({ page }) => {
    await page.goto("/reports");
    await page.getByRole("tab", { name: "Delays" }).click();
    await expect(page).toHaveURL(/tab=delays/);

    await page.goto("/reports?tab=weather");
    await expect(page.getByRole("tab", { name: "Weather" })).toHaveAttribute(
      "data-state",
      "active",
    );
  });

  test("the project schedule and calendar tabs draw", async ({ page }) => {
    await page.goto("/reports?tab=schedule");
    await expect(
      page.getByRole("main").getByText(/Planned|Nothing to chart/).first(),
    ).toBeVisible();

    await page.goto("/reports?tab=calendar");
    await expect(page.getByRole("button", { name: "Next month" })).toBeVisible();
  });

  test("daily progress asks for a job and a day", async ({ page }) => {
    await page.goto("/reports?tab=daily");
    await expect(page.getByText("Choose a job and a day")).toBeVisible();

    // Two "Job" pickers on this tab: the shared filter bar's and the
    // report's own. The second one is the one that drives it.
    await page.getByLabel("Job", { exact: true }).nth(1).click();
    await page.getByRole("option", { name: /BSC-2024-001/ }).click();
    // Either figures or an honest "nothing recorded", never a stuck state.
    await expect(
      page.getByRole("main").getByText(/Complete|Nothing recorded/).first(),
    ).toBeVisible();
  });

  test("a report can be downloaded as an Excel file too", async ({ page }) => {
    await page.goto("/reports");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Excel" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("job-progress.xlsx");
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
    await expect(page.getByRole("button", { name: "CSV" })).toBeVisible();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "CSV" }).click();
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
