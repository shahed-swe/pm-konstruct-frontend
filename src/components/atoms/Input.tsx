import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * A text input.
 *
 * `text-base` below the `md` breakpoint and `text-sm` above it: iOS zooms
 * the page when a focused input's text is under 16px, and supervisors fill
 * these in on phones.
 */
export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
