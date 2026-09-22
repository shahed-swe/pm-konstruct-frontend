import type { Page } from "@playwright/test";

/** The seeded accounts the API test suite uses. */
export const ACCOUNTS = {
  manager: { email: "james.morrison@buildsmart.com.au", password: "buildsmart2024" },
  supervisor: { email: "sarah.johnson@buildsmart.com.au", password: "buildsmart2024" },
} as const;

/**
 * Signs in through the form, not through an API call.
 *
 * Slower, and deliberate: the cookie path and the post-login redirect are
 * both things that only break in the browser.
 */
export async function signIn(page: Page, account: keyof typeof ACCOUNTS = "manager") {
  const { email, password } = ACCOUNTS[account];
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}
