/**
 * Removes what the browser tests created.
 *
 * They run against the same seeded database the API suite uses, and that
 * suite asserts exact job counts. A job left behind by a browser test makes
 * it fail somewhere else entirely, which is a miserable thing to debug --
 * so the tests clean up after themselves rather than relying on a reseed.
 *
 * Purges rather than archives: an archived job still counts.
 */
import { request } from "@playwright/test";

/** Job numbers the browser tests create. */
const TEST_PREFIXES = ["E2E-", "NONAME-"];

export default async function globalTeardown() {
  const api = process.env.PMK_API_URL ?? "http://127.0.0.1:8081";
  const context = await request.newContext({ baseURL: api });

  try {
    const login = await context.post("/api/auth/login", {
      data: {
        email: "james.morrison@buildsmart.com.au",
        password: "buildsmart2024",
      },
    });
    if (!login.ok()) return;
    const { token } = (await login.json()) as { token: string };
    const headers = { Authorization: `Bearer ${token}` };

    const list = await context.get("/api/jobs", { headers });
    if (!list.ok()) return;
    const jobs = (await list.json()) as { id: number; jobNumber: string }[];

    for (const job of jobs) {
      if (TEST_PREFIXES.some((p) => job.jobNumber.startsWith(p))) {
        await context.delete(`/api/jobs/${job.id}?purge=true`, { headers });
      }
    }
  } finally {
    await context.dispose();
  }
}
