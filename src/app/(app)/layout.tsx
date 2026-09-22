/**
 * Everything behind a sign-in.
 *
 * The guard runs on the server, so an unauthenticated or unsubscribed
 * visitor never receives the shell at all. Pages that need more than a
 * session -- a module permission, a manager-only page -- wrap themselves in
 * their own `RequireAccess` with the right props.
 *
 * The navigation chrome is deliberately thin here; the designed shell
 * organism replaces its contents in the component phase without changing
 * this boundary.
 */
import { RequireAccess } from "@/components/guards/RequireAccess";
import { AppShell } from "@/components/organisms/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAccess skipEntitlement>
      <AppShell>{children}</AppShell>
    </RequireAccess>
  );
}
