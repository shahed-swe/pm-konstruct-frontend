import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * Finds text in whichever job list this viewport shows.
 *
 * The list renders twice -- a table above `md`, cards below -- and both are
 * in the DOM with one hidden by CSS. Filtering to the visible match is what
 * makes these tests meaningful at both widths: without it the desktop copy
 * satisfies the mobile run, and a card layout that never renders would pass.
 */
function inList(page: import("@playwright/test").Page, text: string) {
  return page.getByRole("main").getByText(text).filter({ visible: true });
}

test.describe("jobs", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("the list shows the seeded jobs with their supervisors", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.getByRole("heading", { name: "Project directory" })).toBeVisible();

    // The data really arrived, not just the shell.
    await expect(inList(page, "BSC-2024-001").first()).toBeVisible();
    // And the supervisor stack, which needs the `supervisors` array the API
    // did not used to send.
    await expect(inList(page, "Sarah Johnson").first()).toBeVisible();
  });

  test("the status tabs filter the list", async ({ page }) => {
    await page.goto("/jobs");
    await expect(inList(page, "BSC-2024-001").first()).toBeVisible();

    await page.getByRole("button", { name: /^Archived/ }).click();
    await expect(inList(page, "BSC-2024-001")).toHaveCount(0);

    await page.getByRole("button", { name: /^All jobs/ }).click();
    await expect(inList(page, "BSC-2024-001").first()).toBeVisible();
  });

  test("search narrows the list", async ({ page }) => {
    await page.goto("/jobs");
    await expect(inList(page, "BSC-2024-001").first()).toBeVisible();

    await page.getByLabel("Search jobs").fill("Westfield");
    await expect(inList(page, "BSC-2024-001")).toHaveCount(0);
    await expect(inList(page, "BSC-2024-002").first()).toBeVisible();
  });

  test("a job opens, showing its details and its people", async ({ page }) => {
    await page.goto("/jobs/1");
    await expect(page.getByRole("heading", { name: "1 River Rd" })).toBeVisible();
    await expect(page.getByText("Project details")).toBeVisible();
    await expect(page.getByText("Site supervisors")).toBeVisible();
    await expect(page.getByText("Riverside Developments")).toBeVisible();
  });

  test("a job can be created and then found in the list", async ({ page }) => {
    const suffix = Date.now().toString().slice(-6);
    const jobNumber = `E2E-${suffix}`;

    await page.goto("/jobs/new");
    await page.getByLabel("Job number").fill(jobNumber);
    await page.getByLabel("Site address").fill(`${suffix} Test Street`);
    await page.getByLabel("Client name").fill("Playwright Pty Ltd");
    await page.getByRole("button", { name: "Create job" }).click();

    await expect(page.getByRole("heading", { name: `${suffix} Test Street` })).toBeVisible();

    // The list knows about it, which is the cache invalidation working.
    await page.goto("/jobs");
    await page.getByLabel("Search jobs").fill(jobNumber);
    await expect(inList(page, jobNumber).first()).toBeVisible();
  });

  test("the notes panel saves on its own, and the note survives a reload", async ({ page }) => {
    // No word containing "saved" in it: Playwright's text matcher reads a
    // textarea's value, so a note mentioning the status would match the
    // status element's own assertion and pass before anything was written.
    const note = `Written by the browser test at ${new Date().toISOString()}`;
    await page.goto("/jobs/2");
    await page.getByLabel("Job notes").fill(note);

    // The status region, not any text on the page.
    await expect(page.getByRole("status")).toHaveText("Saved");

    await page.reload();
    await expect(page.getByLabel("Job notes")).toHaveValue(note);
  });

  test("a validation failure is attached to the field, not only to a toast", async ({ page }) => {
    await page.goto("/jobs/new");
    await page.getByRole("button", { name: "Create job" }).click();

    await expect(page.getByLabel("Job number")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Job number is required")).toBeVisible();
  });

  test("a duplicate job number is reported on the field the API named", async ({ page }) => {
    await page.goto("/jobs/new");
    // BSC-2024-001 is seeded, and job numbers are unique per company.
    await page.getByLabel("Job number").fill("BSC-2024-001");
    await page.getByLabel("Site address").fill("Somewhere else");
    await page.getByLabel("Client name").fill("Someone else");
    await page.getByRole("button", { name: "Create job" }).click();

    // Beside the input rather than in a banner, because that is where the
    // user is looking and it is the field they must change.
    await expect(page.getByLabel("Job number")).toHaveAttribute("aria-invalid", "true");
  });

  test("the project name is optional, as the form says", async ({ page }) => {
    const suffix = Date.now().toString().slice(-6);
    await page.goto("/jobs/new");
    await page.getByLabel("Job number").fill(`NONAME-${suffix}`);
    await page.getByLabel("Site address").fill(`${suffix} Nameless Road`);
    await page.getByLabel("Client name").fill("Anonymous Pty Ltd");
    await page.getByRole("button", { name: "Create job" }).click();

    await expect(page.getByRole("heading", { name: `${suffix} Nameless Road` })).toBeVisible();
  });
});
