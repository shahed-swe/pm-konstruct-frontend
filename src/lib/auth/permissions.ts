/**
 * What the signed-in user may see and do.
 *
 * A deliberate mirror of the server's `pmk_domain::access`, ported from the
 * legacy `contexts/auth.tsx` so the two agree. They must: the API refuses
 * anything the user is not entitled to, and a UI that disagrees either shows
 * a button that always fails or hides one that would have worked. Where the
 * legacy had a quirk -- `progress` gated on `jobs:read`, `settings` open to
 * everyone -- the quirk is kept, because changing it would silently alter who
 * can reach a page in an application people are using today.
 *
 * The server remains the only thing that decides. This is for rendering.
 */
import type { PermissionDto, UserDto } from "@/lib/api/types";

export type Role = "MANAGER" | "SUPERVISOR" | "OFFICE";

/** Managers bypass permission rows entirely, exactly as the API does. */
export function bypassesChecks(role: string): boolean {
  return role === "MANAGER";
}

export function hasPermission(
  user: Pick<UserDto, "role"> | null,
  permissions: PermissionDto[],
  resource: string,
  action: string,
): boolean {
  if (!user) return false;
  if (bypassesChecks(user.role)) return true;
  return permissions.some((p) => p.resource === resource && p.action === action);
}

/**
 * The permission each navigable area reads through.
 *
 * `dashboard` and `settings` are absent because they are open to any signed-in
 * user; `users` and `billing` are manager-only and are listed separately.
 */
const READ_GATE: Record<string, string> = {
  jobs: "jobs",
  "site-diary": "site-diary",
  "call-forward": "call-forward",
  // Not a typo: the progress page reads job data and the legacy gated it on
  // `jobs:read`, never on a `progress` permission of its own.
  progress: "jobs",
  reports: "reports",
  "trade-scheduler": "trade-scheduler",
};

const MANAGER_ONLY = new Set(["users", "billing"]);

const WRITE_GATE = new Set(["jobs", "site-diary", "call-forward", "trade-scheduler"]);

/** May the user open this area at all? */
export function canAccess(
  user: Pick<UserDto, "role"> | null,
  permissions: PermissionDto[],
  module: string,
): boolean {
  if (!user) return false;
  if (module === "dashboard" || module === "settings") return true;
  if (bypassesChecks(user.role)) return true;
  if (MANAGER_ONLY.has(module)) return false;

  const resource = READ_GATE[module];
  // An unknown area is manager-only, which is the legacy's default branch.
  // Denying by default is also the safer way for this to be wrong.
  if (resource === undefined) return false;
  return permissions.some((p) => p.resource === resource && p.action === "read");
}

/** May the user create or change records in this area? */
export function canEdit(
  user: Pick<UserDto, "role"> | null,
  permissions: PermissionDto[],
  module: string,
): boolean {
  if (!user) return false;
  if (bypassesChecks(user.role)) return true;
  if (!WRITE_GATE.has(module)) return false;
  return permissions.some((p) => p.resource === module && p.action === "write");
}

/** The two forms pages and the ETO register are open to both senior roles. */
export function isManagerOrSupervisor(user: Pick<UserDto, "role"> | null): boolean {
  return user?.role === "MANAGER" || user?.role === "SUPERVISOR";
}

/**
 * Does the subscription permit the application itself?
 *
 * `accessAllowed` alone is not enough: a company that has paid but never
 * finished onboarding has no plan selected, and every page would render
 * against an account with no seats. The legacy required both for the
 * application and only `accessAllowed` for settings, so that a manager can
 * still reach their own account page while sorting the subscription out.
 */
export function entitlementAllows(
  billing: { accessAllowed: boolean; onboardingComplete: boolean } | null,
  area: "app" | "settings",
): boolean {
  if (!billing) return false;
  if (area === "settings") return billing.accessAllowed;
  return billing.accessAllowed && billing.onboardingComplete;
}
