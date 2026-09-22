import { AlertTriangle, CheckCircle2, Clock, Play } from "lucide-react";
import { Badge } from "@/components/atoms/Badge";
import { cn } from "@/lib/utils/cn";

/**
 * How a call-forward item is tracking.
 *
 * `delayStatus` is computed by the API from the estimated and actual dates
 * -- it is never stored, so it cannot go stale the way a status column does.
 * Red is the one people look for.
 */
const STYLES: Record<string, { label: string; className: string; Icon: typeof Clock }> = {
  delayed: {
    label: "Delayed",
    className: "border-red-400/30 bg-red-500/10 text-red-600 dark:text-red-400",
    Icon: AlertTriangle,
  },
  in_progress: {
    label: "In progress",
    className: "border-blue-400/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    Icon: Play,
  },
  completed: {
    label: "Completed",
    className: "border-emerald-400/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    Icon: CheckCircle2,
  },
  not_started: {
    label: "Not started",
    className: "border-border bg-muted text-muted-foreground",
    Icon: Clock,
  },
  on_hold: {
    label: "On hold",
    className: "border-amber-400/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    Icon: Clock,
  },
};

export function DelayBadge({
  delayStatus,
  delayDays,
  className,
}: {
  delayStatus: string;
  delayDays?: number | null | undefined;
  className?: string | undefined;
}) {
  const style = STYLES[delayStatus] ?? STYLES.not_started;
  if (style === undefined) return null;
  const { label, className: tone, Icon } = style;

  return (
    <Badge variant="outline" className={cn("gap-1", tone, className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
      {delayStatus === "delayed" && delayDays !== null && delayDays !== undefined && (
        <span className="font-semibold">
          {" "}
          {delayDays} {delayDays === 1 ? "day" : "days"}
        </span>
      )}
    </Badge>
  );
}
