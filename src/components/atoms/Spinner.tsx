import { cn } from "@/lib/utils/cn";

/**
 * The busy indicator, matching the one the current app shows while the
 * session resolves.
 */
export function Spinner({ className, label = "Loading" }: { className?: string | undefined; label?: string | undefined }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
          className,
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
