/**
 * The HTTP client every request goes through.
 *
 * Three things it does that a bare `fetch` does not:
 *
 * - Sends cookies. The session is an HttpOnly cookie pair, so nothing here
 *   ever holds a token. The legacy client kept one in `localStorage`, where
 *   any XSS could read it.
 * - Turns the API's error envelope into a typed `ApiError`, so a caller can
 *   read `error.field` rather than parsing a message.
 * - Refreshes a lapsed session once, transparently, and retries. Access
 *   tokens are short-lived; without this every page would bounce to login
 *   fifteen minutes in.
 */

/** The shape every error response uses. */
export interface ApiErrorBody {
  error: string;
  field?: string;
  code?: string;
  retryAfterSecs?: number;
}

export class ApiError extends Error {
  readonly status: number;
  readonly field: string | undefined;
  readonly code: string | undefined;
  readonly retryAfterSecs: number | undefined;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error);
    this.name = "ApiError";
    this.status = status;
    this.field = body.field;
    this.code = body.code;
    this.retryAfterSecs = body.retryAfterSecs;
  }

  /** The session has gone. The caller should send the user to sign in. */
  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  /** The subscription lapsed. `R6`: the client redirects to billing. */
  get isBillingRequired(): boolean {
    return this.status === 402 || this.code === "BILLING_REQUIRED";
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** A field-level validation failure the form can attach to an input. */
  get isValidation(): boolean {
    return this.status === 400 && this.field !== undefined;
  }
}

/** Same-origin by design: the API is proxied at `/api`, never a bare host. */
const BASE = "/api";

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Skips the refresh-and-retry. Used by the refresh call itself. */
  noRetry?: boolean;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Refreshes the session, at most once at a time.
 *
 * Several requests can fail with 401 together on a page that loads six
 * panels. Without the shared promise each would refresh separately, and the
 * rotation would treat the later ones as token reuse and revoke the family.
 */
async function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        credentials: "same-origin",
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      // Cleared on the next tick so callers awaiting this one still see it.
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();
  return refreshInFlight;
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody = { error: `Request failed with ${response.status}` };
  try {
    const parsed: unknown = await response.json();
    if (parsed && typeof parsed === "object" && "error" in parsed) {
      body = parsed as ApiErrorBody;
    }
  } catch {
    // A non-JSON body -- a proxy error page, say. The status is the message.
  }
  return new ApiError(response.status, body);
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, noRetry = false, signal, headers = {} } = options;

  const init: RequestInit = {
    method,
    credentials: "same-origin",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...(signal ? { signal } : {}),
  };

  const response = await fetch(`${BASE}${path}`, init);

  if (response.status === 401 && !noRetry) {
    if (await refreshSession()) {
      return request<T>(path, { ...options, noRetry: true });
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  // 204, and any other body-less success.
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/**
 * Fetches a binary body -- an image, a PDF -- rather than JSON.
 *
 * Separate from `request` because that one parses the body as JSON, and the
 * refresh-and-retry is still wanted: a logo fetched for a PDF export half an
 * hour into a session hits exactly the same expiry as anything else.
 */
export async function requestBlob(path: string): Promise<Blob> {
  const fetchOnce = () => fetch(`${BASE}${path}`, { credentials: "same-origin" });

  let response = await fetchOnce();
  if (response.status === 401 && (await refreshSession())) {
    response = await fetchOnce();
  }
  if (!response.ok) throw await parseError(response);
  return response.blob();
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) =>
    request<T>(path, signal ? { signal } : {}),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string, body?: unknown) => request<T>(path, { method: "DELETE", body }),
  blob: (path: string) => requestBlob(path),
};
