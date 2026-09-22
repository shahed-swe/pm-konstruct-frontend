"use client";

/**
 * The last resort when a page throws.
 *
 * Shows the reset button rather than only an apology: most failures here are
 * a request that timed out, and retrying works.
 */
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is what correlates this with the server log; the message
    // itself is not shown, because it can carry internals.
    console.error("Unhandled page error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">
          The page could not be loaded. Trying again usually works.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
