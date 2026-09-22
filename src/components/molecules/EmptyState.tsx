import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * What a list shows when it has nothing in it.
 *
 * Always with the action that fills it. The legacy showed "No jobs found"
 * and nothing else, which leaves a new company's first user with no idea
 * what to do next.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center", className)}>
      {icon !== undefined && <div className="text-muted-foreground">{icon}</div>}
      <div>
        <p className="font-medium">{title}</p>
        {description !== undefined && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
