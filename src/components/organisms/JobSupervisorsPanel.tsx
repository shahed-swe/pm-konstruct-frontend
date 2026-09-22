"use client";

/**
 * Who is assigned to the job, and the manager's controls for changing it.
 *
 * Assignment is not decoration: it is what decides which jobs a supervisor
 * can see at all, so removing someone takes the job off their list. The
 * confirmation says so rather than asking "Are you sure?".
 */
import { Crown, Star, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Skeleton } from "@/components/atoms/Skeleton";
import { initialsOf } from "@/components/atoms/Avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/molecules/Card";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/Select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/molecules/Tooltip";
import {
  useAddAssignment,
  useJobAssignments,
  useRemoveAssignment,
  useSetPrimaryAssignment,
} from "@/lib/api/resources/jobs";
import { useUsers } from "@/lib/api/resources/users";
import { useUiStore } from "@/stores/ui.store";
import type { AssignmentDto } from "@/lib/api/types";

export function JobSupervisorsPanel({ jobId, isManager }: { jobId: number; isManager: boolean }) {
  const toast = useUiStore((s) => s.toast);
  const { data: assignments, isLoading } = useJobAssignments(jobId);
  const { data: users } = useUsers({ enabled: isManager });
  const add = useAddAssignment(jobId);
  const remove = useRemoveAssignment(jobId);
  const setPrimary = useSetPrimaryAssignment(jobId);

  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState("");
  const [removing, setRemoving] = useState<AssignmentDto | null>(null);

  const assignedIds = new Set((assignments ?? []).map((a) => a.userId));
  const available = (users ?? []).filter((u) => u.role === "SUPERVISOR" && !assignedIds.has(u.id));

  function assign() {
    if (chosen === "") return;
    add.mutate(
      { userId: Number.parseInt(chosen, 10) },
      {
        onSuccess: () => {
          toast({ title: "Supervisor assigned", variant: "success" });
          setChosen("");
          setPicking(false);
        },
        onError: () => toast({ title: "The supervisor could not be assigned", variant: "destructive" }),
      },
    );
  }

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-4 w-4 text-primary" aria-hidden="true" /> Site supervisors
          </CardTitle>
          {isManager && !picking && available.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7" onClick={() => setPicking(true)}>
              <UserPlus className="h-3.5 w-3.5" /> Assign
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-4" aria-busy={isLoading}>
        {isLoading ? (
          <>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </>
        ) : (assignments ?? []).length === 0 ? (
          <p className="text-sm italic text-muted-foreground">No supervisors assigned yet.</p>
        ) : (
          <ul className="space-y-1">
            {(assignments ?? []).map((sup) => (
              <li key={sup.userId} className="flex items-center gap-2.5 py-1">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold"
                >
                  {initialsOf(sup.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{sup.name}</p>
                  {sup.isPrimary && (
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      <Star className="h-2.5 w-2.5 fill-current" aria-hidden="true" /> Primary
                    </p>
                  )}
                </div>
                {isManager && (
                  // Always visible, not revealed on hover: the legacy hid
                  // these behind `group-hover`, which put them out of reach
                  // on a touch screen and out of the tab order's sight.
                  <div className="flex items-center gap-1">
                    {!sup.isPrimary && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            aria-label={`Make ${sup.name} the primary supervisor`}
                            disabled={setPrimary.isPending}
                            onClick={() =>
                              setPrimary.mutate(sup.userId, {
                                onSuccess: () =>
                                  toast({ title: `${sup.name} is now primary`, variant: "success" }),
                              })
                            }
                          >
                            <Star className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Set as primary</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label={`Remove ${sup.name} from this job`}
                          onClick={() => setRemoving(sup)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remove from this job</TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {isManager && picking && (
          <div className="border-t pt-3">
            {available.length > 0 ? (
              <div className="flex gap-2">
                <Select value={chosen} onValueChange={setChosen}>
                  <SelectTrigger className="h-8 flex-1 text-sm" aria-label="Supervisor to assign">
                    <SelectValue placeholder="Select supervisor…" />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-8" onClick={assign} disabled={chosen === "" || add.isPending}>
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2"
                  aria-label="Cancel assigning"
                  onClick={() => {
                    setPicking(false);
                    setChosen("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-xs italic text-muted-foreground">
                Every supervisor is already assigned to this job.
              </p>
            )}
          </div>
        )}
      </CardContent>

      {removing !== null && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setRemoving(null);
          }}
          title={`Remove ${removing.name} from this job?`}
          // Spelled out because the consequence is not obvious: assignment
          // is what makes the job visible to them at all.
          description="They will no longer see this job in their list, or be able to open its diary."
          confirmLabel="Remove"
          destructive
          onConfirm={() => {
            const name = removing.name;
            remove.mutate(removing.userId, {
              onSuccess: () => toast({ title: `${name} removed`, variant: "success" }),
              onError: () => toast({ title: "They could not be removed", variant: "destructive" }),
            });
            setRemoving(null);
          }}
        />
      )}
    </Card>
  );
}
