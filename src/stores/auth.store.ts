/**
 * Who is signed in, and what they may do.
 *
 * Not the session itself: that is an HttpOnly cookie pair the browser holds
 * and JavaScript cannot read. This store is the *decoded* answer the server
 * gave to `/auth/me`, kept here so a permission check does not need to be
 * an async call in the middle of a render.
 *
 * It is hydrated once, server-side, and refreshed by the `useSession` query.
 * Nothing writes to it directly from a component.
 */
import type { EntitlementDto, PermissionDto, UserDto } from "@/lib/api/types";
import { hasPermission } from "@/lib/auth/permissions";
import { createStore } from "./createStore";

export interface AuthState {
  user: UserDto | null;
  permissions: PermissionDto[];
  billing: EntitlementDto | null;
  /** False until the first `/auth/me` settles, so guards can wait rather than flash. */
  resolved: boolean;

  setSession: (session: {
    user: UserDto;
    permissions: PermissionDto[];
    billing: EntitlementDto;
  }) => void;
  clear: () => void;
}

export const useAuthStore = createStore<AuthState>(
  (set) => ({
    user: null,
    permissions: [],
    billing: null,
    resolved: false,

    setSession: ({ user, permissions, billing }) =>
      set({ user, permissions, billing, resolved: true }, false, "auth/setSession"),

    clear: () =>
      set(
        { user: null, permissions: [], billing: null, resolved: true },
        false,
        "auth/clear",
      ),
  }),
  { name: "auth" },
);

/**
 * Convenience for components: `usePermission("jobs", "write")`.
 *
 * The rule itself lives in `lib/auth/permissions.ts`, shared with the server
 * components, so there is one answer rather than two that can drift.
 */
export function usePermission(resource: string, action: string): boolean {
  return useAuthStore((s) => hasPermission(s.user, s.permissions, resource, action));
}
