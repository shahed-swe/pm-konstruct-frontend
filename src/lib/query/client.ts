/**
 * The `QueryClient`, configured to behave the way the current app does.
 *
 * `staleTime: 5min`, `refetchOnWindowFocus: false` and `retry: 1` are the
 * legacy's settings, kept deliberately: supervisors work from vans on patchy
 * mobile data, and refetching every panel each time they switch back to the
 * tab was measurably expensive for them.
 *
 * What is new is the error handling. In the legacy each call site decided for
 * itself what a 401 meant, so some screens bounced to login, some rendered an
 * empty state, and the billing 402 was handled in exactly one place. Here
 * both are handled once, centrally.
 */
import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";

/** Where the app should go when a request says the session or subscription is gone. */
export type SessionFailure = "unauthenticated" | "billing-required";

type FailureHandler = (failure: SessionFailure) => void;

/**
 * Set once by the provider. A module-level hook rather than context because
 * the query cache is created outside React and needs to reach the router.
 */
let onSessionFailure: FailureHandler = () => {};

export function setSessionFailureHandler(handler: FailureHandler): void {
  onSessionFailure = handler;
}

function handle(error: unknown): void {
  if (!(error instanceof ApiError)) return;
  // The client already tried a refresh before this surfaced, so a 401 here
  // means the refresh token is gone too -- not a transient lapse.
  if (error.isUnauthenticated) onSessionFailure("unauthenticated");
  else if (error.isBillingRequired) onSessionFailure("billing-required");
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: handle }),
    mutationCache: new MutationCache({ onError: handle }),
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000,
        // One retry, and never for a request the server has already
        // answered definitively: retrying a 403 or a 404 only delays the
        // error the user needs to see.
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status < 500) return false;
          return failureCount < 1;
        },
      },
      mutations: {
        // A mutation is not idempotent. Retrying one can create a second
        // diary entry, which the legacy did on flaky connections.
        retry: false,
      },
    },
  });
}
