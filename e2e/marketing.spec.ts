import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("the public pages", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("the landing page sells the product and offers both doors", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("calm centre");
    await expect(page.getByRole("link", { name: "Start a free trial" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    // The six things the product does.
    await expect(page.getByRole("heading", { name: "Site diaries" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Trade scheduling" })).toBeVisible();
  });

  test("pricing is rendered on the server, not filled in afterwards", async ({ page }) => {
    const response = await page.goto("/pricing");
    const html = (await response?.text()) ?? "";
    // A pricing page that arrives blank is the worst possible first
    // impression, and it is public data anyway.
    expect(html).toMatch(/person \/ month|Pricing is unavailable/);
  });

  test("pricing lists the plans with a call to action", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Straightforward pricing");
    await expect(page.getByRole("link", { name: "Create your company account" })).toBeVisible();
  });

  test("the public pages carry the company's own name", async ({ page }) => {
    await page.goto("/");
    // Branding reaches the landing page: this is a branded deployment, and
    // the name appears in both the header and the footer.
    const seeded = "BuildSmart Construction";
    await expect(page.getByRole("banner").getByText(seeded)).toBeVisible();
    await expect(page.getByRole("contentinfo").getByText(seeded)).toBeVisible();
  });
});

test("a signed-in visitor on the pricing page is taken into the app", async ({ page }) => {
  await signIn(page);
  await page.goto("/pricing");
  await expect(page).toHaveURL(/\/dashboard$/);
});
