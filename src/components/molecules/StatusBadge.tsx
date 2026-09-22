import { Badge } from "@/components/atoms/Badge";
import { cn } from "@/lib/utils/cn";
import { humanise } from "@/lib/utils/format";

/**
 * A job's status, in the colours the current app uses.
 *
 * The palette is copied rather than rechosen: people read these at a glance
 * on a phone, and "amber means on hold" is learned behaviour by now.
 */
const STATUS_STYLES: Record<string, string> = {
  active: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  on_hold: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  archived: "bg-muted/60 text-muted-foreground border-border",
};

export function StatusBadge({ status, className }: { status: string; className?: string | undefined }) {
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-semibold", STATUS_STYLES[status] ?? STATUS_STYLES.active, className)}
    >
      {humanise(status)}
    </Badge>
  );
}
