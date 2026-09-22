import { expect, test } from "@playwright/test";
import { chooseJob, signIn } from "./helpers";

test.describe("forms", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("the index offers the two forms", async ({ page }) => {
    await page.goto("/forms");
    await expect(page.getByRole("heading", { name: "Forms" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Site inspection/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Extra to order/ })).toBeVisible();
  });

  test("an ETO is raised and waits on a manager", async ({ page }) => {
    await page.goto("/forms/eto");
    await chooseJob(page, "Job");
    await page.getByLabel("Reason").fill("Playwright raised this");
    await page.getByLabel("What is being ordered").fill("Two extra piers");
    await page.getByRole("button", { name: "Send for approval" }).click();

    // Raising does not approve: the person asking for the money is not the
    // person who agrees to it.
    await expect(page.getByText(/waiting on a manager/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Share it" })).toHaveCount(0);
  });

  test("an incomplete ETO says what is missing", async ({ page }) => {
    await page.goto("/forms/eto");
    await page.getByRole("button", { name: "Send for approval" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Choose the job");
  });

  test("an inspection opens a draft on the server", async ({ page }) => {
    await page.goto("/forms/property-inspection");
    await chooseJob(page, "Job");

    // The draft exists from the moment a job is chosen, because an
    // inspection takes an hour and a phone dies.
    await expect(page.getByLabel("Inspector")).toBeVisible();
    await expect(page.getByLabel("Room 1")).toBeVisible();
  });

  test("an inspection's items survive a save and a reload", async ({ page }) => {
    const room = `Ensuite ${Date.now()}`;

    await page.goto("/forms/property-inspection");
    await chooseJob(page, "Job");
    await page.getByLabel("Room 1").fill(room);
    await page.getByLabel("What was found 1").fill("Hairline crack above the shower");
    await page.getByRole("button", { name: "Save the inspection" }).click();

    // Wait for the save to land before reloading. Reloading while the
    // request is in flight cancels it, and the test then fails for a reason
    // that has nothing to do with what it is checking.
    await expect(page.getByText("Inspection saved").first()).toBeVisible();

    await page.reload();
    await chooseJob(page, "Job");
    await expect(page.getByLabel("Room 1")).toHaveValue(room);
  });
});

test.describe("progress", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("a reading is recorded and shown against its job", async ({ page }) => {
    const milestone = `E2E milestone ${Date.now()}`;

    await page.goto("/progress");
    await page.getByRole("button", { name: "Record progress" }).click();
    await chooseJob(page, "Job");
    await page.getByLabel("Percent complete").fill("42");
    await page.getByLabel("Milestone").fill(milestone);
    await page.getByRole("button", { name: "Record it" }).click();

    await expect(page.getByRole("main").getByText(milestone)).toBeVisible();
    await expect(page.getByRole("main").getByText("42%").first()).toBeVisible();
  });

  test("a percentage outside the range is refused", async ({ page }) => {
    await page.goto("/progress");
    await page.getByRole("button", { name: "Record progress" }).click();
    await chooseJob(page, "Job");
    await page.getByLabel("Percent complete").fill("180");
    await page.getByRole("button", { name: "Record it" }).click();

    await expect(page.getByRole("main").getByRole("alert")).toContainText("between 0 and 100");
  });
});

test.describe("job photos", () => {
  test("the gallery opens, even with nothing in it", async ({ page }) => {
    await signIn(page);
    await page.goto("/jobs/1/photos");
    await expect(page.getByRole("heading", { name: "Photos" })).toBeVisible();
  });
});
