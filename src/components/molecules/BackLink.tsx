import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * "Back to jobs", rather than relying on the browser's Back.
 *
 * A supervisor who reached a job from a notification has nothing useful
 * behind them in history, which is why the legacy had a `BackButton` with a
 * fallback rather than a `history.back()`.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
