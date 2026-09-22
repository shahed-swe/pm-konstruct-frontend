import "server-only";

/**
 * Calling the API from a server component.
 *
 * Different from the browser client in two ways that matter: there is no
 * relative `/api` to rewrite to, and the cookies must be forwarded by hand
 * because the server's own fetch carries none. Forgetting either gives a
 * page that renders signed-out for a signed-in user.
 */
import { cookies } from "next/headers";
import { ApiError, type ApiErrorBody } from "./client";

export const ACCESS_COOKIE = "pmk_access";
export const REFRESH_COOKIE = "pmk_refresh";

/**
 * Where the API lives from inside the server process.
 *
 * `PMK_API_URL` is the same variable `next.config.ts` rewrites through, so
 * the two never point at different backends.
 */
function apiBase(): string {
  return process.env.PMK_API_URL ?? "http://127.0.0.1:8081";
}

/**
 * A server-side GET, with the caller's session attached.
 *
 * Returns `null` on 401 rather than throwing: a layout asking "who is this?"
 * for an anonymous visitor is an ordinary answer, not an error, and the
 * marketing pages ask exactly that.
 */
export async function serverGet<T>(path: string): Promise<T | null> {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;

  const response = await fetch(`${apiBase()}/api${path}`, {
    headers: access ? { Cookie: `${ACCESS_COOKIE}=${access}` } : {},
    // Session and branding are per-request by definition; caching either
    // across requests would serve one company's name to another.
    cache: "no-store",
  });

  if (response.status === 401 || response.status === 403) return null;

  if (!response.ok) {
    let body: ApiErrorBody = { error: `Request failed with ${response.status}` };
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      // A proxy error page. The status is all there is.
    }
    throw new ApiError(response.status, body);
  }

  return (await response.json()) as T;
}

/** Whether the request carries a session cookie at all. */
export async function hasSessionCookie(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(ACCESS_COOKIE) !== undefined;
}
