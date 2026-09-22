"use client";

/**
 * The application frame: sidebar, header, content.
 *
 * A client component because the sidebar's collapsed state and the mobile
 * drawer live in the UI store, and because the active link has to be known
 * from the current path.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { useBrandingStore } from "@/stores/branding.store";
import { useUiStore } from "@/stores/ui.store";
import { canAccess, isManagerOrSupervisor } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils/cn";

interface NavItem {
  href: string;
  label: string;
  /** The area `canAccess` gates on. */
  module: string;
  /**
   * Open to managers and supervisors, with no permission row of its own.
   *
   * The forms are the one area the legacy gated by role rather than by
   * permission, so `canAccess` has nothing to say about it.
   */
  senior?: true;
}

/** In the order the current app lists them. */
const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", module: "dashboard" },
  { href: "/jobs", label: "Jobs", module: "jobs" },
  { href: "/site-diary", label: "Site Diary", module: "site-diary" },
  { href: "/call-forward", label: "Call Forward", module: "call-forward" },
  { href: "/trade-scheduler", label: "Trade Scheduler", module: "trade-scheduler" },
  { href: "/progress", label: "Progress", module: "progress" },
  { href: "/forms", label: "Forms", module: "forms", senior: true },
  { href: "/reports", label: "Reports", module: "reports" },
  { href: "/users", label: "Users", module: "users" },
  { href: "/settings", label: "Settings", module: "settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const companyName = useBrandingStore((s) => s.branding.companyName);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  // Hidden rather than disabled: a supervisor has no use for a Users link
  // they cannot open, and the legacy showed it and then redirected.
  const items = NAV.filter((item) =>
    item.senior === true ? isManagerOrSupervisor(user) : canAccess(user, permissions, item.module),
  );

  return (
    <div className="flex min-h-dvh bg-background">
      <aside
        className={cn(
          "hidden shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <span
            className={cn(
              "truncate font-[family-name:var(--font-chakra)] font-semibold",
              collapsed && "sr-only",
            )}
          >
            {companyName}
          </span>
        </div>

        <nav className="flex-1 space-y-1 p-2" aria-label="Main">
          {items.map((item) => {
            // `startsWith` so `/jobs/12` still highlights Jobs, but guarded
            // against `/jobs` matching `/jobs-archive` were one ever added.
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "text-center",
                )}
              >
                {collapsed ? item.label.charAt(0) : item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={toggleSidebar}
          className="border-t border-sidebar-border px-4 py-3 text-left text-xs uppercase tracking-wide hover:bg-sidebar-accent"
        >
          {collapsed ? "»" : "« Collapse"}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-card px-4">
          <span className="truncate text-sm font-medium">{user?.name ?? ""}</span>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
