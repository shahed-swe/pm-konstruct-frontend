import { HardHat } from "lucide-react";
import Link from "next/link";
import type { BrandingDto } from "@/lib/api/types";

/**
 * The header and footer the public pages share.
 *
 * Carries the company's own logo and name, because the landing page is what
 * a prospect sees first and the deployment is branded.
 */
function Wordmark({ branding, dark = false }: { branding: BrandingDto; dark?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      {branding.logoUrl === null ? (
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <HardHat className="h-5 w-5" aria-hidden="true" />
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={branding.logoUrl}
          alt=""
          className="h-8 w-8 rounded-lg bg-white/10 object-contain p-0.5"
        />
      )}
      <span
        className={`font-[family-name:var(--font-chakra)] text-xl font-bold uppercase tracking-wide ${
          dark ? "text-white" : ""
        }`}
      >
        {branding.companyName}
      </span>
    </span>
  );
}

export function MarketingHeader({ branding }: { branding: BrandingDto }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b bg-background/80 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/">
          <Wordmark branding={branding} />
        </Link>

        <nav className="ml-4 flex items-center gap-4" aria-label="Account">
          <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-primary">
            Pricing
          </Link>
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary">
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90"
          >
            Start free trial
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function MarketingFooter({ branding }: { branding: BrandingDto }) {
  return (
    <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-12 text-slate-400">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:px-6 md:flex-row lg:px-8">
        <Wordmark branding={branding} dark />
        <nav className="flex gap-6 text-sm" aria-label="Footer">
          <Link href="/login" className="hover:text-white">
            Log in
          </Link>
          <Link href="/register" className="hover:text-white">
            Start trial
          </Link>
          <Link href="/pricing" className="hover:text-white">
            Pricing
          </Link>
          <Link href="/" className="hover:text-white">
            Home
          </Link>
        </nav>
      </div>
    </footer>
  );
}
