"use client";

/**
 * The application frame: navigation, header, content.
 *
 * Two navigations, one list. On a desktop it is a sidebar that can collapse
 * to icons; on a phone it is a drawer behind a menu button, because a 256px
 * sidebar on a 390px screen leaves no room for the page. Supervisors use
 * this on site, on a phone, so the phone case is not an afterthought.
 */
import { LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/atoms/Button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/molecules/Sheet";
import { NotificationBell } from "@/components/organisms/NotificationBell";
import { useLogout } from "@/lib/api/resources/auth";
import { canAccess, isManagerOrSupervisor } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth.store";
import { useBrandingStore } from "@/stores/branding.store";
import { useUiStore } from "@/stores/ui.store";

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

function isActive(pathname: string, href: string): boolean {
  // Guarded against `/jobs` matching a future `/jobs-archive`.
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  items,
  pathname,
  collapsed,
  onNavigate = () => {},
}: {
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  /** Closes the drawer after a tap. A no-op for the desktop sidebar. */
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <>
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            title={collapsed ? item.label : undefined}
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
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const companyName = useBrandingStore((s) => s.branding.companyName);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const logout = useLogout();

  // Hidden rather than disabled: a supervisor has no use for a Users link
  // they cannot open, and the legacy showed it and then redirected.
  const items = NAV.filter((item) =>
    item.senior === true ? isManagerOrSupervisor(user) : canAccess(user, permissions, item.module),
  );

  // A drawer left open across a navigation covers the page it opened.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  function signOut() {
    logout.mutate(undefined, {
      onSettled: () => {
        useAuthStore.getState().clear();
        router.replace("/login");
        router.refresh();
      },
    });
  }

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Straight to the content, for anyone who tabs. */}
      <a
        href="#main"
        className="sr-only-focusable absolute left-4 top-4 z-50 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        Skip to the page
      </a>

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
          <NavLinks items={items} pathname={pathname} collapsed={collapsed} />
        </nav>

        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand the navigation" : "Collapse the navigation"}
          className="border-t border-sidebar-border px-4 py-3 text-left text-xs uppercase tracking-wide hover:bg-sidebar-accent"
        >
          {collapsed ? "»" : "« Collapse"}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-2 border-b bg-card px-4">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open the navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-sidebar p-0 text-sidebar-foreground">
              <SheetHeader className="border-b border-sidebar-border px-4 py-4">
                <SheetTitle className="font-[family-name:var(--font-chakra)]">
                  {companyName}
                </SheetTitle>
              </SheetHeader>
              <nav className="space-y-1 p-2" aria-label="Main">
                <NavLinks
                  items={items}
                  pathname={pathname}
                  collapsed={false}
                  onNavigate={() => setMobileNavOpen(false)}
                />
              </nav>
            </SheetContent>
          </Sheet>

          <span className="truncate text-sm font-medium">{user?.name ?? ""}</span>

          <div className="ml-auto flex items-center gap-1">
          <NotificationBell />

          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            disabled={logout.isPending}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Sign out</span>
          </Button>
          </div>
        </header>

        <main id="main" className="min-w-0 flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
