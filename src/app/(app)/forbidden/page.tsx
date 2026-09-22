import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "No access" };

/**
 * Where a guard sends someone who is signed in but not entitled to a page.
 *
 * Deliberately not a 404: pretending the page does not exist would leave a
 * supervisor who followed a manager's link thinking the link was broken.
 */
export default function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-2xl font-semibold">You do not have access to this page</h1>
      <p className="mt-2 text-muted-foreground">
        Ask your manager if you need it -- they can grant access from Users.
      </p>
      <Link href="/dashboard" className="mt-6 inline-block text-primary underline">
        Back to the dashboard
      </Link>
    </div>
  );
}
