import { Crown } from "lucide-react";
import type { JobSupervisorDto } from "@/lib/api/types";
import { initialsOf } from "@/components/atoms/Avatar";

/**
 * Who is on a job.
 *
 * The primary supervisor with their name, then up to two more, then a count.
 * Ported from the jobs page, where the stack is the column managers scan
 * first. The crown marks the primary, and only when there is more than one
 * -- on a single-supervisor job it is noise.
 */
export function SupervisorStack({ supervisors }: { supervisors: JobSupervisorDto[] }) {
  if (supervisors.length === 0) {
    return <span className="text-xs italic text-muted-foreground/60">Unassigned</span>;
  }

  const primary = supervisors.find((s) => s.isPrimary) ?? supervisors[0];
  if (primary === undefined) return null;
  const rest = supervisors.filter((s) => s.id !== primary.id);
  const visible = rest.slice(0, 2);
  const overflow = rest.length - visible.length;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden="true"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary ring-2 ring-card"
        >
          {initialsOf(primary.name)}
        </span>
        <span className="truncate text-sm font-medium leading-tight">{primary.name}</span>
        {primary.isPrimary && supervisors.length > 1 && (
          <>
            <Crown className="h-3 w-3 shrink-0 text-amber-500" aria-hidden="true" />
            <span className="sr-only">Primary supervisor</span>
          </>
        )}
      </div>

      {visible.length > 0 && (
        <div className="flex flex-col gap-1 pl-0.5">
          {visible.map((s) => (
            <div key={s.id} className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[9px] font-bold ring-1 ring-card"
              >
                {initialsOf(s.name)}
              </span>
              <span className="truncate text-xs leading-tight text-muted-foreground">{s.name}</span>
            </div>
          ))}
          {overflow > 0 && (
            <span className="pl-7 text-[10px] text-muted-foreground/70">+{overflow} more</span>
          )}
        </div>
      )}
    </div>
  );
}
