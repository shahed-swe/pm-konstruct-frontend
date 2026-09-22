import { expect, test } from "@playwright/test";
import { ACCOUNTS, signIn } from "./helpers";

test.describe("users", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("the list shows everyone with their role", async ({ page }) => {
    await page.goto("/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await expect(page.getByRole("main").getByText("James Morrison")).toBeVisible();
    await expect(page.getByRole("main").getByText("Sarah Johnson")).toBeVisible();
  });

  test("a manager cannot delete themselves from the list", async ({ page }) => {
    await page.goto("/users");
    // No delete button on their own row: locking yourself out of your own
    // company's administration is not a mistake worth allowing.
    await expect(page.getByLabel("Delete James Morrison")).toHaveCount(0);
    await expect(page.getByLabel("Delete Sarah Johnson")).toBeVisible();
  });

  test("access is granted by area, at three levels", async ({ page }) => {
    await page.goto("/users");
    await page.getByLabel("Set what Sarah Johnson can reach").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("What Sarah Johnson can reach")).toBeVisible();
    // Reports are read-only, so there is no Edit to offer.
    const reports = dialog.getByRole("group", { name: "Access to Reports" });
    await expect(reports.getByRole("button", { name: "Edit" })).toHaveCount(0);
    await expect(reports.getByRole("button", { name: "View" })).toBeVisible();
  });

  test("a supervisor cannot reach the users page at all", async ({ page, context }) => {
    await context.clearCookies();
    await signIn(page, "supervisor");
    await page.goto("/users");
    await expect(page).toHaveURL(/\/forbidden$/);
  });
});

test.describe("settings", () => {
  test("a manager sees branding and email", async ({ page }) => {
    await signIn(page);
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Branding" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Email server" })).toBeVisible();
    await expect(page.getByLabel("Company name")).toHaveValue(/\w/);
  });

  test("a supervisor sees the page but not the manager's sections", async ({ page, context }) => {
    await context.clearCookies();
    await signIn(page, "supervisor");
    await page.goto("/settings");
    // Open to everyone -- their own preferences live here -- but the
    // manager-only parts say so rather than silently vanishing.
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByText(/set by a manager/)).toBeVisible();
    await expect(page.getByLabel("Company name")).toHaveCount(0);
  });
});

test.describe("billing", () => {
  test("shows the subscription and the seats it covers", async ({ page }) => {
    await signIn(page);
    await page.goto("/billing");
    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
    await expect(page.getByText("People with access")).toBeVisible();
  });

  test("reaches the page even when the subscription has lapsed", async ({ page }) => {
    await signIn(page);
    // Every other page redirects here when entitlement fails; this one must
    // not, or the company cannot pay.
    await page.goto("/billing");
    await expect(page).toHaveURL(/\/billing$/);
  });
});

test.describe("the signed-in user", () => {
  test("their name is in the header", async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole("banner")).toContainText("James Morrison");
  });

  test("a supervisor's navigation hides what they cannot open", async ({ page, context }) => {
    await context.clearCookies();
    await signIn(page, "supervisor");

    // The sidebar is a drawer on a phone. Opening it is part of what this
    // asserts: without one there is no navigation at all on the device
    // supervisors actually use.
    const menu = page.getByRole("button", { name: "Open the navigation" });
    if (await menu.isVisible()) await menu.click();

    const nav = page.getByRole("navigation", { name: "Main" }).filter({ visible: true });
    await expect(nav.getByRole("link", { name: "Jobs" })).toBeVisible();
    // Users and billing are manager-only: shown and then redirected is worse
    // than not shown.
    await expect(nav.getByRole("link", { name: "Users" })).toHaveCount(0);
  });

  test("the navigation is reachable on a phone", async ({ page }) => {
    await signIn(page);
    const menu = page.getByRole("button", { name: "Open the navigation" });
    if (!(await menu.isVisible())) {
      // Desktop: the sidebar is always there.
      await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
      return;
    }

    await menu.click();
    const drawer = page.getByRole("dialog");
    await expect(drawer.getByRole("link", { name: "Jobs" })).toBeVisible();

    // And it closes itself on the way through, rather than covering the page
    // it just opened.
    await drawer.getByRole("link", { name: "Jobs" }).click();
    await expect(page).toHaveURL(/\/jobs$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("signing out ends the session", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);

    // And the session really is gone, not merely navigated away from.
    await page.goto("/jobs");
    await expect(page).toHaveURL(/\/login/);
  });
});

test("the login page is reachable without a session", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  void ACCOUNTS;
});
