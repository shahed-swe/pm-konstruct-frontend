import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * The title row every screen starts with.
 *
 * One component so the spacing and the heading level are the same on all
 * thirty of them -- in the legacy each page wrote its own, and the gap below
 * the title varied between 4 and 8.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description !== undefined && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {/*
        Full width below `sm`, and wrapping.
        A page with four actions -- the scheduler has print, PDF, maintenance
        and add-worker -- laid them over each other on a 390px screen, so the
        last one could not be pressed at all. `shrink-0` was what did it.
      */}
      {actions !== undefined && (
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">{actions}</div>
      )}
    </div>
  );
}
