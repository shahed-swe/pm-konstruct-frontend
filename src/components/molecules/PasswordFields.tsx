"use client";

/**
 * A new password and its confirmation.
 *
 * Shared by register, reset and the first-run setup so the rule is stated
 * once. Eight characters is the API's minimum; saying so up front is kinder
 * than rejecting the form afterwards.
 */
import { PasswordInput } from "@/components/atoms/PasswordInput";
import { Field } from "@/components/molecules/Field";

export const MIN_PASSWORD_LENGTH = 8;

export function PasswordFields({
  password,
  confirm,
  onPassword,
  onConfirm,
  error,
  label = "Password",
}: {
  password: string;
  confirm: string;
  onPassword: (value: string) => void;
  onConfirm: (value: string) => void;
  error?: string | undefined;
  label?: string | undefined;
}) {
  // Only once they have typed something: telling someone their empty
  // confirmation does not match is noise.
  const mismatch = confirm !== "" && password !== confirm;

  return (
    <>
      <Field
        label={label}
        required
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        error={error}
      >
        {(props) => (
          <PasswordInput
            {...props}
            value={password}
            onChange={(e) => onPassword(e.target.value)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            maxLength={128}
            required
          />
        )}
      </Field>

      <Field
        label="Confirm password"
        required
        error={mismatch ? "The two passwords do not match." : undefined}
      >
        {(props) => (
          <PasswordInput
            {...props}
            value={confirm}
            onChange={(e) => onConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        )}
      </Field>
    </>
  );
}

/** The check both forms run before submitting. */
export function passwordProblem(password: string, confirm: string): string | undefined {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `The password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirm) return "The two passwords do not match.";
  return undefined;
}
