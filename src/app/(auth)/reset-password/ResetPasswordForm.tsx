"use client";

/**
 * Setting a new password from an emailed link.
 *
 * Claiming the token signs every other session out -- that is the point,
 * since the usual reason for a reset is that someone else may have had the
 * old password. The success message says so, so nobody is surprised to find
 * themselves signed out on their phone.
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api/client";
import { useResetPassword } from "@/lib/api/resources/auth";
import { Button } from "@/components/atoms/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/molecules/Card";
import { PasswordFields, passwordProblem } from "@/components/molecules/PasswordFields";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const reset = useResetPassword();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [done, setDone] = useState(false);

  if (token === "") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">This link is not valid</CardTitle>
          <CardDescription>
            The reset link is missing its token. It may have been cut short by your email client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" asChild>
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (done) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Your password is set</CardTitle>
          <CardDescription>
            You have been signed out everywhere else, including on your phone. Sign in again with
            the new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = passwordProblem(password, confirm);
    if (problem !== undefined) {
      setError(problem);
      return;
    }
    setError(undefined);

    reset.mutate(
      { token, password },
      {
        onSuccess: () => setDone(true),
        onError: (cause) =>
          setError(
            cause instanceof ApiError
              ? cause.message
              : "The password could not be reset. The link may have expired.",
          ),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Set a new password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error !== undefined && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <PasswordFields
            label="New password"
            password={password}
            confirm={confirm}
            onPassword={setPassword}
            onConfirm={setConfirm}
          />

          <Button type="submit" className="w-full" disabled={reset.isPending}>
            {reset.isPending ? "Setting your password…" : "Set password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
