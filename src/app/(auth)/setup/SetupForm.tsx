"use client";

/**
 * The first account on a fresh installation.
 *
 * Unauthenticated by necessity -- there is nobody to authenticate as yet --
 * so the only thing standing in front of it is a secret held by whoever
 * deployed the server. A deployment that leaves `SETUP_SECRET` unset has the
 * endpoint disabled entirely, and this page says so rather than failing with
 * a bare error.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api/client";
import { useCompleteSetup, useSetupStatus } from "@/lib/api/resources/auth";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { PasswordInput } from "@/components/atoms/PasswordInput";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/molecules/Card";
import { Field } from "@/components/molecules/Field";
import { PasswordFields, passwordProblem } from "@/components/molecules/PasswordFields";

export function SetupForm() {
  const router = useRouter();
  const { data: status, isLoading } = useSetupStatus();
  const setup = useCompleteSetup();

  const [setupKey, setSetupKey] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  if (isLoading) return null;

  if (status !== undefined && !status.needsSetup) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">This installation is already set up</CardTitle>
          <CardDescription>
            The first account exists, so there is nothing to do here.
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

    setup.mutate(
      {
        setupKey,
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() === "" ? null : phone.trim(),
        companyName: companyName.trim() === "" ? null : companyName.trim(),
      },
      {
        onSuccess: () => {
          router.replace("/dashboard");
          router.refresh();
        },
        onError: (cause) =>
          setError(
            cause instanceof ApiError
              ? cause.message
              : "Setup could not be completed. Check the setup key and try again.",
          ),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Set up this installation</CardTitle>
        <CardDescription>
          Create the first company and its manager. You will need the setup key from whoever
          deployed the server.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error !== undefined && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Field label="Setup key" required hint="Set as SETUP_SECRET on the server.">
            {(props) => (
              <PasswordInput
                {...props}
                value={setupKey}
                onChange={(e) => setSetupKey(e.target.value)}
                autoComplete="off"
                required
              />
            )}
          </Field>

          <Field label="Company name">
            {(props) => (
              <Input
                {...props}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                autoComplete="organization"
              />
            )}
          </Field>

          <Field label="Your name" required>
            {(props) => (
              <Input {...props} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            )}
          </Field>

          <Field label="Email" required>
            {(props) => (
              <Input
                {...props}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            )}
          </Field>

          <Field label="Phone">
            {(props) => (
              <Input {...props} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
            )}
          </Field>

          <PasswordFields
            password={password}
            confirm={confirm}
            onPassword={setPassword}
            onConfirm={setConfirm}
          />

          <Button type="submit" className="w-full" disabled={setup.isPending}>
            {setup.isPending ? "Setting up…" : "Complete setup"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
