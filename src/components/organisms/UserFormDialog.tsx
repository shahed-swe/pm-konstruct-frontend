"use client";

/**
 * Adding someone, or changing their details.
 *
 * On an edit the password field is left blank and means "leave it alone" --
 * a manager changing a phone number should not have to know, or reset,
 * somebody's password.
 */
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useCreateUser, useUpdateUser } from "@/lib/api/resources/users";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { PasswordInput } from "@/components/atoms/PasswordInput";
import { Switch } from "@/components/atoms/Switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/molecules/Dialog";
import { Field } from "@/components/molecules/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/Select";
import { MIN_PASSWORD_LENGTH } from "@/components/molecules/PasswordFields";
import { useUiStore } from "@/stores/ui.store";
import type { UserDto } from "@/lib/api/types";

const ROLES = [
  { value: "MANAGER", label: "Manager", hint: "Everything, including users and billing." },
  { value: "SUPERVISOR", label: "Supervisor", hint: "The sites they are assigned to." },
  { value: "OFFICE", label: "Office", hint: "Whatever access you grant below." },
] as const;

export function UserFormDialog({
  user,
  open,
  onOpenChange,
}: {
  /** Absent when adding someone. */
  user?: UserDto | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const toast = useUiStore((s) => s.toast);
  const create = useCreateUser();
  const update = useUpdateUser();
  const editing = user !== undefined;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string>("SUPERVISOR");
  const [active, setActive] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ message: string; field?: string } | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPhone(user?.phone ?? "");
    setRole(user?.role ?? "SUPERVISOR");
    setActive(user?.active ?? true);
    setPassword("");
    setError(undefined);
  }, [open, user]);

  function fail(cause: unknown, fallback: string) {
    setError(
      cause instanceof ApiError
        ? { message: cause.message, ...(cause.field === undefined ? {} : { field: cause.field }) }
        : { message: fallback },
    );
  }

  function submit() {
    if (!editing && password.trim().length < MIN_PASSWORD_LENGTH) {
      setError({
        message: `The password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
        field: "password",
      });
      return;
    }
    setError(undefined);

    const body = {
      name: name.trim(),
      email: email.trim(),
      role,
      phone: phone.trim() === "" ? null : phone.trim(),
      active,
      // Blank on an edit means unchanged, which the API reads the same way.
      password: password.trim() === "" ? null : password,
    };

    const done = {
      onSuccess: () => {
        toast({ title: editing ? "Changes saved" : "User added", variant: "success" });
        onOpenChange(false);
      },
      onError: (cause: unknown) =>
        fail(cause, editing ? "The changes were not saved." : "The user was not added."),
    };

    if (editing) update.mutate({ id: user.id, ...body }, done);
    else create.mutate(body, done);
  }

  const pending = create.isPending || update.isPending;
  const fieldError = (field: string) => (error?.field === field ? error.message : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${user.name}` : "Add someone"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Leave the password blank to leave it unchanged."
              : "They will sign in with this email address and password."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error !== undefined && error.field === undefined && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error.message}
            </p>
          )}

          <Field label="Name" required error={fieldError("name")}>
            {(props) => (
              <Input {...props} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            )}
          </Field>

          <Field label="Email" required error={fieldError("email")}>
            {(props) => (
              <Input
                {...props}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
              />
            )}
          </Field>

          <Field label="Phone" error={fieldError("phone")}>
            {(props) => (
              <Input {...props} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            )}
          </Field>

          <Field
            label="Role"
            required
            hint={ROLES.find((r) => r.value === role)?.hint}
            error={fieldError("role")}
          >
            {(props) => (
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id={props.id} aria-describedby={props["aria-describedby"]}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>

          <Field
            label={editing ? "New password" : "Password"}
            required={!editing}
            hint={
              editing
                ? "Leave blank to keep the current one. Setting one signs them out everywhere."
                : `At least ${MIN_PASSWORD_LENGTH} characters.`
            }
            error={fieldError("password")}
          >
            {(props) => (
              <PasswordInput
                {...props}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            )}
          </Field>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Can sign in</p>
              <p className="text-xs text-muted-foreground">
                Turning this off blocks them without deleting their history.
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} aria-label="Can sign in" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {editing ? "Save changes" : "Add user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
