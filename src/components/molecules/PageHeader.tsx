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
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
        {description !== undefined && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions !== undefined && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
