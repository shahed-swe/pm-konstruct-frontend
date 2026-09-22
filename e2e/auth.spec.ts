import { expect, test } from "@playwright/test";
import { ACCOUNTS, signIn } from "./helpers";

test.describe("signing in", () => {
  test("a signed-out visitor is sent to login and back where they were going", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page).toHaveURL(/\/login\?next=%2Fjobs/);

    await page.getByLabel("Email").fill(ACCOUNTS.manager.email);
    await page.getByLabel("Password").fill(ACCOUNTS.manager.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    // Back to where they were headed, not the dashboard.
    await expect(page).toHaveURL(/\/jobs$/);
  });

  test("a wrong password says so without saying which part was wrong", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ACCOUNTS.manager.email);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    // Never "no such user" or "wrong password": either one tells an attacker
    // which addresses have accounts.
    await expect(alert).not.toContainText(/no such|not found|unknown user/i);
  });

  test("a signed-in user visiting login goes to the dashboard", async ({ page }) => {
    await signIn(page);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("the company's colours are in the first paint, not applied afterwards", async ({ page }) => {
    // The style block is in the server's HTML. If branding were applied in an
    // effect this would be empty on arrival and the page would flash.
    const response = await page.goto("/login");
    const html = (await response?.text()) ?? "";
    expect(html).toContain("<style>:root{--primary:");
  });
});
