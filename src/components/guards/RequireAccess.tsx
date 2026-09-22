import "server-only";

/**
 * The server-side replacement for the seven route wrappers in the legacy
 * `App.tsx`.
 *
 * Those wrappers ran in the browser: the page mounted, the component asked
 * the auth context, and only then redirected. On a slow connection a
 * supervisor could see a manager-only page's skeleton for a moment. Deciding
 * on the server means the user is redirected before any of it is sent.
 *
 * The combinations are the ones the legacy actually used, named after what
 * they protect rather than after which check they run.
 */
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/lib/auth/session";
import {
  canAccess,
  canEdit,
  entitlementAllows,
  isManagerOrSupervisor,
} from "@/lib/auth/permissions";

interface Props {
  children: ReactNode;
  /** The area, as `canAccess` names it. Omit for a page that only needs a session. */
  module?: string;
  /** Require write rather than read. */
  write?: boolean;
  /** `settings` relaxes the onboarding requirement, as the legacy did. */
  area?: "app" | "settings";
  /** Both senior roles, for the forms pages. */
  seniorOnly?: boolean;
  /** Manager only, for supervisor performance. */
  managerOnly?: boolean;
  /** Skip the subscription check -- `/billing` itself, and `/forbidden`. */
  skipEntitlement?: boolean;
}

export async function RequireAccess({
  children,
  module,
  write = false,
  area = "app",
  seniorOnly = false,
  managerOnly = false,
  skipEntitlement = false,
}: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { user, permissions, billing } = session;

  if (!skipEntitlement && !entitlementAllows(billing, area)) {
    redirect("/billing");
  }

  if (managerOnly && user.role !== "MANAGER") redirect("/forbidden");
  if (seniorOnly && !isManagerOrSupervisor(user)) redirect("/forbidden");

  if (module !== undefined) {
    const allowed = write
      ? canEdit(user, permissions, module)
      : canAccess(user, permissions, module);
    if (!allowed) redirect("/forbidden");
  }

  return <>{children}</>;
}
