"use client";

/**
 * Hides a control the user may not use.
 *
 * For buttons and panels inside a page they *are* allowed to see -- the
 * "Delete" on a diary note, the "Invite user" in a list. Page-level access is
 * decided on the server by `RequireAccess`; this is the finer grain.
 *
 * Renders `fallback` (nothing by default) rather than a disabled control: a
 * greyed-out button the user can never enable is noise, and the legacy's
 * disabled buttons had no tooltip explaining why.
 */
import type { ReactNode } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { hasPermission } from "@/lib/auth/permissions";

interface Props {
  resource: string;
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequirePermission({ resource, action, children, fallback = null }: Props) {
  const allowed = useAuthStore((s) => hasPermission(s.user, s.permissions, resource, action));
  return <>{allowed ? children : fallback}</>;
}
