/**
 * Browser tests against the real stack.
 *
 * Not a mock in sight: these run against `next start` talking to the Rust API
 * talking to Postgres, because the failures worth catching here are the ones
 * that only appear when all three are involved -- a cookie whose path is
 * wrong, a query key that never invalidates, a field the API renamed.
 *
 * Start the stack first (`tools/dev/stack up`); the web server is started
 * for you.
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PMK_WEB_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Serial: the tests share one seeded database, and two of them creating a
  // job at once would make the counts they assert unpredictable.
  workers: 1,
  fullyParallel: false,
  forbidOnly: process.env.CI !== undefined,
  retries: 0,
  reporter: process.env.CI !== undefined ? "list" : [["list"]],
  // The seeded database is shared with the API suite, which asserts exact
  // job counts. Anything these tests create is purged afterwards.
  globalTeardown: "./e2e/global-teardown.ts",
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Supervisors use this on a phone, and the jobs list switches from a
    // table to cards at `md`. Running the smoke path at both widths is what
    // catches a card layout that never renders.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],

  webServer: {
    command: `npx next start --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
    env: { PMK_API_URL: process.env.PMK_API_URL ?? "http://127.0.0.1:8081" },
  },
});
