"use client";

/**
 * Sign in.
 *
 * The session arrives as cookies the browser stores itself, so there is
 * nothing to keep here afterwards -- no token in `localStorage`, which is
 * what the legacy did and what any XSS on the page could have read.
 *
 * `router.refresh()` after a successful sign-in, not just `push`: the layouts
 * above read the session on the server, and without the refresh they would
 * re-render from a cache taken while nobody was signed in.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, api } from "@/lib/api/client";
import type { LoginResponse } from "@/lib/api/types";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post<LoginResponse>("/auth/login", { email, password });
      // Only same-origin paths: `next` comes from the URL, and following an
      // arbitrary value would make the login page an open redirect.
      const next = params.get("next");
      const destination = next !== null && next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/dashboard";
      router.replace(destination);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Could not sign in. Please try again.",
      );
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border bg-card p-6 shadow-sm"
      noValidate
    >
      <h1 className="mb-1 text-xl font-semibold">Sign in</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Use the email address your manager invited.
      </p>

      {error !== null && (
        // `role="alert"` so a screen reader announces the failure rather than
        // leaving the user re-submitting a form that will not work.
        <p role="alert" className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <label className="mb-4 block text-sm">
        <span className="mb-1 block font-medium">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2"
        />
      </label>

      <label className="mb-6 block text-sm">
        <span className="mb-1 block font-medium">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>

      <a
        href="/forgot-password"
        className="mt-4 block text-center text-sm text-muted-foreground underline"
      >
        Forgot your password?
      </a>
    </form>
  );
}
