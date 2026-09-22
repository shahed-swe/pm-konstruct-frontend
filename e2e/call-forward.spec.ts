import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("call forward", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("the landing page groups what is coming up by job", async ({ page }) => {
    await page.goto("/call-forward");
    await expect(page.getByRole("heading", { name: "Call forward" })).toBeVisible();
    await expect(page.getByRole("main").getByText(/BSC-2024-00\d/).first()).toBeVisible();
  });

  test("a job's programme can be added to and reordered", async ({ page }) => {
    const first = `E2E stage ${Date.now()}`;
    const second = `${first} (second)`;

    await page.goto("/jobs/1/call-forward");
    await expect(page.getByRole("heading", { name: "Call forward" })).toBeVisible();

    await page.getByLabel("Add an item").fill(first);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByLabel(`Title of ${first}`)).toBeVisible();

    await page.getByLabel("Add an item").fill(second);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByLabel(`Title of ${second}`)).toBeVisible();

    // Reordering is by button, not by dragging: dragging does not work on a
    // touch screen and cannot be reached by keyboard.
    //
    // Compared by the titles rather than by the rows' text, because a row's
    // editable fields are input values and do not show up as text content --
    // two rows with the same status would look identical.
    const titles = async () =>
      page.getByRole("main").locator("input[aria-label^='Title of']").evaluateAll((els) =>
        (els as HTMLInputElement[]).map((el) => el.value),
      );

    const before = await titles();
    expect(before.indexOf(first)).toBeLessThan(before.indexOf(second));

    await page.getByLabel(`Move ${second} up`).click();

    await expect
      .poll(async () => {
        const after = await titles();
        return after.indexOf(second) < after.indexOf(first);
      })
      .toBe(true);
  });

  test("a date entered on an item is saved", async ({ page }) => {
    const title = `E2E dated ${Date.now()}`;

    await page.goto("/jobs/1/call-forward");
    await page.getByLabel("Add an item").fill(title);
    await page.getByRole("button", { name: "Add", exact: true }).click();

    const estStart = page.getByLabel(`Estimated start for ${title}`);
    await estStart.fill("2026-10-01");
    await estStart.blur();

    await page.reload();
    await expect(page.getByLabel(`Estimated start for ${title}`)).toHaveValue("2026-10-01");
  });

  test("only a stage can contain other items", async ({ page }) => {
    const task = `E2E task ${Date.now()}`;
    const child = `${task} child`;

    await page.goto("/jobs/1/call-forward");
    await page.getByLabel("Add an item").fill(task);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByLabel(`Title of ${task}`)).toBeVisible();

    await page.getByLabel("Add an item").fill(child);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByLabel(`Title of ${child}`)).toBeVisible();

    // Tucking it under a task is refused, with a reason rather than silence.
    await page.getByLabel(`Move ${child} under the item above`).click();
    await expect(page.getByText("Only a stage can contain other items")).toBeVisible();
  });
});
