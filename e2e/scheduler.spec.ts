import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("trade scheduler", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("shows a week of workers, and pages through the weeks", async ({ page }) => {
    await page.goto("/trade-scheduler");
    await expect(page.getByRole("heading", { name: "Trade scheduler" })).toBeVisible();

    const range = page.getByText(/—/).first();
    const before = await range.textContent();
    await page.getByRole("button", { name: "Next week" }).click();
    await expect(range).not.toHaveText(before ?? "");

    await page.getByRole("button", { name: "This week" }).click();
    await expect(range).toHaveText(before ?? "");
  });

  test("a worker can be added and appears on the board", async ({ page }) => {
    const name = `E2E Chippy ${Date.now()}`;

    await page.goto("/trade-scheduler");
    await page.getByRole("button", { name: "Add a worker" }).click();
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Trade").fill("Carpenter");
    await page.getByRole("button", { name: "Add", exact: true }).click();

    await expect(page.getByRole("main").getByText(name)).toBeVisible();
  });

  test("an allocated day shows the job, and stops offering to allocate again", async ({ page }) => {
    const name = `E2E Double ${Date.now()}`;

    await page.goto("/trade-scheduler");
    await page.getByRole("button", { name: "Add a worker" }).click();
    await page.getByLabel("Name").fill(name);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("main").getByText(name)).toBeVisible();

    const cell = page.getByLabel(new RegExp(`^Allocate ${name} on `)).first();
    await cell.click();
    await page.getByLabel("Job", { exact: true }).click();
    await page.getByRole("option").first().click();
    await page.getByRole("button", { name: "Allocate" }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);

    // One site per person per day. The cell shows where they are, and no
    // longer offers to put them somewhere else as well -- the API refuses a
    // second allocation, and the board should not invite one.
    const row = page.getByRole("row").filter({ hasText: name });
    await expect(row.getByLabel(new RegExp(`^Clear ${name} from `))).toHaveCount(1);
    await expect(
      await row.getByLabel(new RegExp(`^Allocate ${name} on `)).count(),
    ).toBeLessThan(7);
  });

  test("leave shows the worker as unavailable rather than hiding them", async ({ page }) => {
    const name = `E2E Onleave ${Date.now()}`;

    await page.goto("/trade-scheduler");
    await page.getByRole("button", { name: "Add a worker" }).click();
    await page.getByLabel("Name").fill(name);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("main").getByText(name)).toBeVisible();

    await page.getByLabel(`Record leave for ${name}`).click();
    await page.getByRole("button", { name: "Record it" }).click();

    // Still on the board, and also listed under the week's leave -- so the
    // name appears twice, which is the point. "Everybody is on leave" is an
    // answer the board has to be able to give.
    await expect(page.getByRole("row").filter({ hasText: name })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Leave this week" })).toBeVisible();
  });
});
