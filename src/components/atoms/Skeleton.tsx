import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * A loading placeholder.
 *
 * `aria-hidden` and `role="presentation"`: a screen reader announcing a dozen
 * pulsing rectangles is worse than silence. The container should carry
 * `aria-busy` instead.
 */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props}
    />
  );
}
