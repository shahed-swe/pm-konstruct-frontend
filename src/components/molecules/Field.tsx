"use client";

/**
 * A labelled form field with its error message.
 *
 * Wires the label, the control and the error together by id so a screen
 * reader announces "Job number, invalid entry, must be unique" rather than
 * leaving the message as unattached red text -- which is what the legacy's
 * hand-written forms did on most pages.
 *
 * `children` receives the ids to spread onto the control.
 */
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Label } from "@/components/atoms/Label";

interface FieldProps {
  label: string;
  /** Shown under the control, and announced with it. */
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
  className?: string;
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean | undefined;
  }) => ReactNode;
}

export function Field({ label, error, hint, required = false, className, children }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy = [error !== undefined ? errorId : null, hint !== undefined ? hintId : null]
    .filter((v): v is string => v !== null)
    .join(" ");

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>

      {children({
        id,
        "aria-describedby": describedBy === "" ? undefined : describedBy,
        "aria-invalid": error !== undefined ? true : undefined,
      })}

      {hint !== undefined && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error !== undefined && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
