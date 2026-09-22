import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "PM Konstruct" };

/**
 * The public landing page.
 *
 * A signed-in visitor never reaches it -- the middleware sends them to the
 * dashboard, which is what the legacy's `RootRoute` did in the browser.
 */
export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-20">
      <h1 className="font-[family-name:var(--font-chakra)] text-4xl font-bold tracking-tight">
        Site supervision, without the paperwork
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Jobs, site diaries, call forwards and trade scheduling for residential
        builders.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/register"
          className="rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground"
        >
          Start free trial
        </Link>
        <Link href="/login" className="rounded-md border px-5 py-2.5 font-medium">
          Sign in
        </Link>
      </div>
    </main>
  );
}
