"use client";

/**
 * The three-step action status on a diary entry or note.
 *
 * Action → In process → Completed, with pressing the current one clearing it.
 * The colours are the ones people already read at a glance: red, amber,
 * green.
 *
 * Completed locks. Once something is marked done, only the person who raised
 * it or a manager can reopen it -- otherwise anyone passing the entry can
 * quietly undo someone else's sign-off. When nobody raised it explicitly the
 * author counts as the raiser, which is what the legacy did.
 */
import { CheckCircle2, Clock, Loader2, Lock, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/molecules/Tooltip";
import { cn } from "@/lib/utils/cn";

export type ActionStatus = "action" | "processing" | "completed" | null;

const STEPS = [
  {
    value: "action",
    label: "Action",
    Icon: Zap,
    active: "bg-red-500 text-white border-red-500 shadow-sm",
    inactive: "text-red-600 border-red-300/60 hover:bg-red-50 dark:hover:bg-red-950/40",
  },
  {
    value: "processing",
    label: "In process",
    Icon: Clock,
    active: "bg-amber-500 text-white border-amber-500 shadow-sm",
    inactive: "text-amber-600 border-amber-300/60 hover:bg-amber-50 dark:hover:bg-amber-950/40",
  },
  {
    value: "completed",
    label: "Completed",
    Icon: CheckCircle2,
    active: "bg-emerald-500 text-white border-emerald-500 shadow-sm",
    inactive: "text-emerald-600 border-emerald-300/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
  },
] as const;

export interface ActionStatusButtonsProps {
  status: ActionStatus;
  /** Who put it into its current state. Falls back to the author. */
  raisedBy: number | null;
  authorId: number | null;
  currentUserId: number;
  isManager: boolean;
  pending?: boolean | undefined;
  onChange: (next: ActionStatus) => void;
  variant?: "compact" | "full" | undefined;
}

export function ActionStatusButtons({
  status,
  raisedBy,
  authorId,
  currentUserId,
  isManager,
  pending = false,
  onChange,
  variant = "compact",
}: ActionStatusButtonsProps) {
  const isRaiser = raisedBy !== null ? currentUserId === raisedBy : currentUserId === authorId;
  const locked = status === "completed" && !isRaiser && !isManager;

  const buttons = (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Action status">
      {STEPS.map(({ value, label, Icon, active, inactive }) => {
        const on = status === value;
        return (
          <button
            key={value}
            type="button"
            disabled={locked || pending}
            aria-pressed={on}
            // Pressing the active one clears the status, which is how the
            // current app removes a flag. Said out loud for screen readers,
            // because "pressed" alone does not explain what a second press
            // will do.
            aria-label={on ? `${label} — press to clear` : `Mark as ${label}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (locked || pending) return;
              onChange(on ? null : value);
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border font-medium transition-colors",
              variant === "compact" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1.5 text-sm",
              on ? active : inactive,
              (locked || pending) && "cursor-not-allowed opacity-50",
            )}
          >
            {pending && on ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            ) : (
              <Icon className={variant === "compact" ? "h-3 w-3" : "h-4 w-4"} aria-hidden="true" />
            )}
            {label}
          </button>
        );
      })}
      {locked && <Lock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />}
    </div>
  );

  if (!locked) return buttons;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>{buttons}</span>
      </TooltipTrigger>
      <TooltipContent>
        Only the person who raised this, or a manager, can reopen it.
      </TooltipContent>
    </Tooltip>
  );
}

/** The badge shown on a card, when there is no room for the buttons. */
export function actionStatusLabel(status: ActionStatus): string | null {
  if (status === "action") return "Action required";
  if (status === "processing") return "In process";
  if (status === "completed") return "Completed";
  return null;
}
