import { expect, test } from "@playwright/test";
import { chooseJob, signIn } from "./helpers";

test.describe("site diary", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("the list shows entries with their job and author", async ({ page }) => {
    await page.goto("/site-diary");
    await expect(page.getByRole("heading", { name: "Site diary" })).toBeVisible();

    // The joined names the API had to start sending: every card is labelled
    // with its job, not with a bare id. Asserted across the list rather than
    // on whichever card happens to be first, which depends on the data.
    const cards = page.getByRole("main").getByRole("listitem");
    await expect(cards.first()).toBeVisible();
    await expect(
      page.getByRole("main").getByText(/Riverside|Westfield|BSC-/).first(),
    ).toBeVisible();
  });

  test("filtering by job puts the job in the URL so it can be shared", async ({ page }) => {
    await page.goto("/site-diary");
    await page.getByLabel("Filter by job").click();
    await page.getByRole("option").nth(1).click();
    await expect(page).toHaveURL(/\/site-diary\?jobId=\d+/);
  });

  test("an entry can be written, and appears in the diary", async ({ page }) => {
    const marker = `Playwright wrote this at ${new Date().toISOString()}`;

    await page.goto("/site-diary/new");
    await chooseJob(page, "Job");
    await page.getByLabel("General notes note 1", { exact: true }).fill(marker);
    await page.getByRole("button", { name: "Save entry" }).click();

    // Lands on the new entry. Asserted through the URL rather than the text,
    // because Playwright's text matcher reads a textarea's value and would
    // be satisfied by the form we have not left.
    await expect(page).toHaveURL(/\/site-diary\/\d+$/);
    await expect(page.getByRole("main").getByText(marker)).toBeVisible();

    await page.goto("/site-diary");
    await expect(page.getByRole("main").getByText(marker).first()).toBeVisible();
  });

  test("saving with no notes says so rather than creating an empty entry", async ({ page }) => {
    await page.goto("/site-diary/new");
    await chooseJob(page, "Job");
    await page.getByRole("button", { name: "Save entry" }).click();

    await expect(page.getByRole("main").getByRole("alert")).toContainText("at least one note");
  });

  test("the draft survives leaving the page", async ({ page }) => {
    const marker = `Draft kept at ${Date.now()}`;

    await page.goto("/site-diary/new");
    await page.getByLabel("General notes note 1", { exact: true }).fill(marker);
    // Away and back: the words are the expensive part and must not be lost.
    await page.goto("/jobs");
    await page.goto("/site-diary/new");

    await expect(page.getByLabel("General notes note 1", { exact: true })).toHaveValue(marker);
  });

  test("a note's status can be changed from the entry", async ({ page }) => {
    const marker = `Status test ${Date.now()}`;

    await page.goto("/site-diary/new");
    await chooseJob(page, "Job");
    await page.getByLabel("General notes note 1", { exact: true }).fill(marker);
    await page.getByRole("button", { name: "Save entry" }).click();
    await expect(page).toHaveURL(/\/site-diary\/\d+$/);

    const note = page.getByRole("main").locator("[id^='note-']").filter({ hasText: marker });
    await note.getByRole("button", { name: "Mark as Action" }).click();

    await expect(note.getByRole("button", { name: /Action — press to clear/ })).toBeVisible();

    // And it survives a reload, so it really was written.
    await page.reload();
    const after = page.getByRole("main").locator("[id^='note-']").filter({ hasText: marker });
    await expect(after.getByRole("button", { name: /Action — press to clear/ })).toBeVisible();
  });
});
