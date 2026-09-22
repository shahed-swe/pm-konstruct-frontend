"use client";

/**
 * Sign-up: a company and its first manager, in one form.
 *
 * Registration signs the user straight in -- the API sets the session
 * cookies on the same response -- so there is no "now log in" step. They land
 * on billing, because a new company has no subscription yet and every other
 * page would bounce them there anyway.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api/client";
import { useRegister } from "@/lib/api/resources/auth";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/molecules/Card";
import { Field } from "@/components/molecules/Field";
import { PasswordFields, passwordProblem } from "@/components/molecules/PasswordFields";

export function RegisterForm() {
  const router = useRouter();
  const register = useRegister();

  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = passwordProblem(password, confirm);
    if (problem !== undefined) {
      setError(problem);
      return;
    }
    setError(undefined);

    register.mutate(
      {
        companyName: companyName.trim(),
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() === "" ? null : phone.trim(),
      },
      {
        onSuccess: () => {
          router.replace("/billing");
          router.refresh();
        },
        onError: (cause) => {
          setError(
            cause instanceof ApiError
              ? cause.message
              : "The account could not be created. Please try again.",
          );
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>
          Set up your company and your own login. You can invite your team afterwards.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error !== undefined && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Field label="Company name" required>
            {(props) => (
              <Input
                {...props}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                autoComplete="organization"
                required
              />
            )}
          </Field>

          <Field label="Your name" required>
            {(props) => (
              <Input
                {...props}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
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

          <Field label="Phone" hint="Optional. Used when a site needs to reach you.">
            {(props) => (
              <Input
                {...props}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            )}
          </Field>

          <PasswordFields
            password={password}
            confirm={confirm}
            onPassword={setPassword}
            onConfirm={setConfirm}
          />

          <Button type="submit" className="w-full" disabled={register.isPending}>
            {register.isPending ? "Creating your account…" : "Create account"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
