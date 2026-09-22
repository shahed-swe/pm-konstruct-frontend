"use client";

/**
 * The trade scheduler: who is on which site, day by day.
 *
 * A grid of workers down the side and a week across the top. Allocating
 * somebody is picking a job in their cell; the API refuses two allocations
 * for one worker on one day, which is the rule that makes the board mean
 * anything.
 *
 * Absences sit on top: a worker on leave shows as unavailable rather than
 * disappearing, because the question the board answers is "who can I put on
 * this site tomorrow?" and "nobody, they are all on leave" is an answer.
 *
 * An allocation can be dragged from one day to another, as it can today.
 * `@dnd-kit` rather than the HTML5 drag API, which does nothing on a touch
 * screen -- and this board is read and changed on a phone.
 */
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronLeft,
  ChevronRight,
  FileDown,
  Loader2,
  Plus,
  Printer,
  StickyNote,
  UserMinus,
  Wrench,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Card, CardContent } from "@/components/molecules/Card";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/molecules/Dialog";
import { EmptyState } from "@/components/molecules/EmptyState";
import { Field } from "@/components/molecules/Field";
import { PageHeader } from "@/components/molecules/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/Select";
import { buildPdf, shareOrDownload } from "@/lib/reports/pdf";
import {
  useBoard,
  useCreateAbsence,
  useCreateAllocation,
  useCreateWorker,
  useDeactivateWorker,
  useDeleteAbsence,
  useDeleteAllocation,
  useCreateMaintenanceJob,
  useMaintenanceJobs,
  useSchedulableJobs,
  useSetDayNote,
  useUpdateAllocation,
} from "@/lib/api/resources/scheduler";
import { addDays, coversDay, weekDays, weekStart } from "@/lib/calendar/week";
import { canEdit } from "@/lib/auth/permissions";
import { useJobLabel } from "@/lib/jobs/useJobLabel";
import { today } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth.store";
import { useUiStore } from "@/stores/ui.store";
import type { AllocationDto, WorkerDto } from "@/lib/api/types";

/** The absence types the API accepts. */
const ABSENCE_TYPES = [
  { value: "sick", label: "Sick" },
  { value: "leave", label: "Leave" },
  { value: "trade_school", label: "Trade school" },
] as const;

const ABSENCE_STYLE: Record<string, string> = {
  sick: "bg-red-500/15 text-red-700 dark:text-red-300",
  leave: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  trade_school: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
};

function AllocationCell({
  worker,
  day,
  allocation,
  absenceType,
  editable,
  onAllocate,
  onClear,
}: {
  worker: WorkerDto;
  day: string;
  allocation: AllocationDto | undefined;
  absenceType: string | undefined;
  editable: boolean;
  onAllocate: (worker: WorkerDto, day: string) => void;
  onClear: (allocation: AllocationDto) => void;
}) {
  const jobs = useSchedulableJobs();
  const maintenance = useMaintenanceJobs();
  const labelJob = useJobLabel();

  // Both hooks run unconditionally, as hooks must: a cell is a drop target
  // whether or not it currently holds something, and a source only when it
  // does.
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `${worker.id}|${day}`,
    disabled: !editable || absenceType !== undefined,
  });
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: allocation === undefined ? `empty-${worker.id}-${day}` : `alloc-${allocation.id}`,
    disabled: !editable || allocation === undefined,
  });

  if (absenceType !== undefined) {
    return (
      <div
        ref={setDropRef}
        className={cn(
          "flex h-full min-h-14 items-center justify-center rounded-md p-1 text-center text-[11px] font-medium",
          ABSENCE_STYLE[absenceType] ?? "bg-muted",
        )}
      >
        {ABSENCE_TYPES.find((t) => t.value === absenceType)?.label ?? absenceType}
      </div>
    );
  }

  if (allocation === undefined) {
    return editable ? (
      <button
        ref={setDropRef}
        type="button"
        onClick={() => onAllocate(worker, day)}
        aria-label={`Allocate ${worker.name} on ${day}`}
        className={cn(
          "flex h-full min-h-14 w-full items-center justify-center rounded-md border border-dashed text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary",
          isOver && "border-primary bg-primary/10 text-primary",
        )}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    ) : (
      <div ref={setDropRef} className="min-h-14" />
    );
  }

  const job = (jobs.data ?? []).find((j) => j.id === allocation.jobId);
  const maintenanceJob = (maintenance.data ?? []).find((m) => m.id === allocation.maintenanceJobId);

  const label =
    job !== undefined
      ? labelJob({ jobNumber: job.jobNumber, jobName: job.name, jobAddress: job.address })
      : (maintenanceJob?.name ?? "Allocated");

  return (
    <div ref={setDropRef}>
    <div
      ref={setDragRef}
      style={{
        backgroundColor: `${worker.color}22`,
        transform: CSS.Translate.toString(transform),
      }}
      className={cn(
        "group relative flex h-full min-h-14 flex-col justify-center rounded-md p-1.5 text-[11px]",
        editable && "cursor-grab touch-none active:cursor-grabbing",
        isDragging && "z-10 opacity-70 shadow-lg",
      )}
      {...(editable ? { ...listeners, ...attributes } : {})}
    >
      <span className="line-clamp-2 font-medium">{label}</span>
      {allocation.note !== null && (
        <span className="line-clamp-1 text-muted-foreground">{allocation.note}</span>
      )}
      {editable && (
        <button
          type="button"
          aria-label={`Clear ${worker.name} from ${day}`}
          onClick={() => onClear(allocation)}
          className="absolute right-0.5 top-0.5 rounded p-0.5 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
    </div>
  );
}

export function TradeSchedulerScreen() {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const toast = useUiStore((s) => s.toast);
  const labelJob = useJobLabel();
  const editable = canEdit(user, permissions, "trade-scheduler");

  const [start, setStart] = useState(() => weekStart(today()));
  const days = useMemo(() => weekDays(start, today()), [start]);
  const from = start;
  const to = addDays(start, 6);

  const { data: board, isLoading } = useBoard(from, to);
  const { data: jobs } = useSchedulableJobs();
  const { data: maintenanceJobs } = useMaintenanceJobs();

  const createAllocation = useCreateAllocation();
  const updateAllocation = useUpdateAllocation();
  const deleteAllocation = useDeleteAllocation();
  const createWorker = useCreateWorker();
  const deactivateWorker = useDeactivateWorker();
  const createAbsence = useCreateAbsence();
  const deleteAbsence = useDeleteAbsence();
  const createMaintenance = useCreateMaintenanceJob();
  const setDayNote = useSetDayNote();

  const [allocating, setAllocating] = useState<{ worker: WorkerDto; day: string } | null>(null);
  const [allocationTarget, setAllocationTarget] = useState("");
  const [allocationNote, setAllocationNote] = useState("");
  const [addingWorker, setAddingWorker] = useState(false);
  const [workerName, setWorkerName] = useState("");
  const [workerTrade, setWorkerTrade] = useState("");
  const [absenceFor, setAbsenceFor] = useState<WorkerDto | null>(null);
  const [absenceType, setAbsenceType] = useState<string>("leave");
  const [absenceFrom, setAbsenceFrom] = useState(today());
  const [absenceTo, setAbsenceTo] = useState(today());
  const [removingWorker, setRemovingWorker] = useState<WorkerDto | null>(null);
  const [addingMaintenance, setAddingMaintenance] = useState(false);
  const [maintenanceName, setMaintenanceName] = useState("");
  const [maintenanceRef, setMaintenanceRef] = useState("");
  const [noteFor, setNoteFor] = useState<{ jobId: number; day: string } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [exporting, setExporting] = useState(false);

  const sensors = useSensors(
    // 6px before a drag begins, so tapping an empty cell still opens the
    // allocation dialog.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  /** `workerId|day` to the allocation on it. */
  const allocationsByCell = useMemo(() => {
    const out = new Map<string, AllocationDto>();
    for (const a of board?.allocations ?? []) {
      out.set(`${a.workerId}|${a.assignedDate.slice(0, 10)}`, a);
    }
    return out;
  }, [board]);

  /**
   * Moves an allocation to the cell it was dropped on.
   *
   * The API refuses a second allocation for one worker on one day, so
   * dropping onto an occupied cell is refused here rather than sending a
   * request that will fail -- the board should not offer a move it knows
   * cannot happen.
   */
  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over === null ? null : String(event.over.id);
    if (overId === null || !activeId.startsWith("alloc-")) return;

    const allocationId = Number.parseInt(activeId.slice("alloc-".length), 10);
    const allocation = (board?.allocations ?? []).find((a) => a.id === allocationId);
    if (allocation === undefined) return;

    const [rawWorker, day] = overId.split("|");
    const workerId = Number.parseInt(rawWorker ?? "", 10);
    if (!Number.isFinite(workerId) || day === undefined) return;
    if (workerId === allocation.workerId && day === allocation.assignedDate.slice(0, 10)) return;

    if (allocationsByCell.has(`${workerId}|${day}`)) {
      toast({
        title: "There is already someone allocated there",
        description: "Clear that day first, or drop it somewhere empty.",
      });
      return;
    }

    if ((board?.absences ?? []).some((a) => a.workerId === workerId && coversDay(a, day))) {
      toast({ title: "They are on leave that day" });
      return;
    }

    updateAllocation.mutate(
      {
        id: allocation.id,
        workerId,
        assignedDate: day,
        jobId: allocation.jobId,
        maintenanceJobId: allocation.maintenanceJobId,
        note: allocation.note,
      },
      { onError: () => toast({ title: "The move was not saved", variant: "destructive" }) },
    );
  }

  /** The week as a PDF, for a site meeting. */
  async function exportPdf() {
    setExporting(true);
    try {
      const rows = (board?.workers ?? []).map((worker) => [
        worker.name,
        ...days.map((day) => {
          const absence = absenceOn(worker.id, day.key);
          if (absence !== undefined) {
            return ABSENCE_TYPES.find((t) => t.value === absence)?.label ?? absence;
          }
          const allocation = allocationsByCell.get(`${worker.id}|${day.key}`);
          if (allocation === undefined) return "—";
          const job = (jobs ?? []).find((j) => j.id === allocation.jobId);
          const maintenance = (maintenanceJobs ?? []).find(
            (m) => m.id === allocation.maintenanceJobId,
          );
          return job === undefined
            ? (maintenance?.name ?? "Allocated")
            : labelJob({
                jobNumber: job.jobNumber,
                jobName: job.name,
                jobAddress: job.address,
              });
        }),
      ]);

      const file = await buildPdf({
        title: "Trade schedule",
        subtitle: `${days[0]?.label ?? from} — ${days[6]?.label ?? to}`,
        sections: [
          {
            heading: "Allocations",
            columns: ["Worker", ...days.map((d) => d.label)],
            rows,
          },
        ],
        filename: `trade-schedule-${from}`,
      });
      await shareOrDownload(file);
    } catch {
      toast({ title: "The PDF could not be produced", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  function absenceOn(workerId: number, day: string): string | undefined {
    return (board?.absences ?? []).find((a) => a.workerId === workerId && coversDay(a, day))
      ?.absenceType;
  }

  function saveAllocation() {
    if (allocating === null || allocationTarget === "") {
      setError("Choose a job.");
      return;
    }
    setError(undefined);

    const [kind, rawId] = allocationTarget.split(":");
    const id = Number.parseInt(rawId ?? "", 10);

    createAllocation.mutate(
      {
        workerId: allocating.worker.id,
        assignedDate: allocating.day,
        ...(kind === "maintenance" ? { maintenanceJobId: id } : { jobId: id }),
        note: allocationNote.trim() === "" ? null : allocationNote.trim(),
      },
      {
        onSuccess: () => {
          setAllocating(null);
          setAllocationTarget("");
          setAllocationNote("");
        },
        onError: (cause) =>
          setError(
            cause instanceof ApiError
              ? cause.status === 409
                ? `${allocating.worker.name} is already allocated that day.`
                : cause.message
              : "The allocation was not saved.",
          ),
      },
    );
  }

  return (
    <>
      <PageHeader
        title="Trade scheduler"
        description="Who is on which site, day by day."
        actions={
          <>
            <Button variant="outline" className="print:hidden" onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden="true" /> Print
            </Button>
            <Button
              variant="outline"
              className="print:hidden"
              disabled={exporting}
              onClick={() => void exportPdf()}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <FileDown className="h-4 w-4" aria-hidden="true" />
              )}
              PDF
            </Button>
            {editable && (
              <>
                <Button
                  variant="outline"
                  className="print:hidden"
                  onClick={() => setAddingMaintenance(true)}
                >
                  <Wrench className="h-4 w-4" aria-hidden="true" /> Maintenance job
                </Button>
                <Button className="print:hidden" onClick={() => setAddingWorker(true)}>
                  <Plus className="h-4 w-4" /> Add a worker
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Previous week"
          onClick={() => setStart((s) => addDays(s, -7))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="h-8" onClick={() => setStart(weekStart(today()))}>
          This week
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Next week"
          onClick={() => setStart((s) => addDays(s, 7))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {days[0]?.label} — {days[6]?.label}
        </span>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (board?.workers ?? []).length === 0 ? (
        <EmptyState
          title="No workers yet"
          description="Add the people you allocate to sites, and they appear here."
          action={
            editable ? <Button onClick={() => setAddingWorker(true)}>Add a worker</Button> : undefined
          }
        />
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[56rem] border-separate border-spacing-1 p-1">
            <caption className="sr-only">
              Allocations from {days[0]?.label} to {days[6]?.label}
            </caption>
            <thead>
              <tr>
                <th scope="col" className="w-44 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  Worker
                </th>
                {days.map((day) => (
                  <th
                    key={day.key}
                    scope="col"
                    className={cn(
                      "text-center text-xs font-medium",
                      day.isWeekend && "text-muted-foreground",
                      day.isToday && "text-primary",
                    )}
                  >
                    {day.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(board?.workers ?? []).map((worker) => (
                <tr key={worker.id}>
                  <th scope="row" className="text-left align-middle">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: worker.color }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{worker.name}</p>
                        {worker.trade !== null && (
                          <p className="truncate text-[11px] text-muted-foreground">
                            {worker.trade}
                          </p>
                        )}
                      </div>
                      {editable && (
                        <div className="ml-auto flex gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            aria-label={`Record leave for ${worker.name}`}
                            onClick={() => setAbsenceFor(worker)}
                          >
                            <UserMinus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            aria-label={`Take ${worker.name} off the board`}
                            onClick={() => setRemovingWorker(worker)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </th>

                  {days.map((day) => (
                    <td
                      key={day.key}
                      className={cn("align-top", day.isWeekend && "bg-muted/30 rounded-md")}
                    >
                      <AllocationCell
                        worker={worker}
                        day={day.key}
                        allocation={allocationsByCell.get(`${worker.id}|${day.key}`)}
                        absenceType={absenceOn(worker.id, day.key)}
                        editable={editable}
                        onAllocate={(w, d) => {
                          setAllocating({ worker: w, day: d });
                          setAllocationTarget("");
                          setAllocationNote("");
                          setError(undefined);
                        }}
                        onClear={(allocation) => deleteAllocation.mutate(allocation.id)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </DndContext>
      )}

      {editable && (board?.workers ?? []).length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <StickyNote className="h-4 w-4 text-primary" aria-hidden="true" /> Notes on the day
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              A line against a job for one day — a delivery window, a gate code, whoever is
              meeting the inspector. Everybody on the board sees it.
            </p>

            <ul className="space-y-1 text-sm">
              {(board?.dayNotes ?? []).map((note) => {
                const job = (jobs ?? []).find((j) => j.id === note.jobId);
                return (
                  <li key={note.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {job === undefined
                        ? `Job #${note.jobId}`
                        : labelJob({
                            jobNumber: job.jobNumber,
                            jobName: job.name,
                            jobAddress: job.address,
                          })}
                    </span>
                    <span className="text-muted-foreground">{note.noteDate}</span>
                    <span className="min-w-0 flex-1">{note.note}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6"
                      onClick={() => {
                        setNoteFor({ jobId: note.jobId, day: note.noteDate });
                        setNoteText(note.note);
                      }}
                    >
                      Edit
                    </Button>
                  </li>
                );
              })}
            </ul>

            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-dashed"
              onClick={() => {
                setNoteFor({ jobId: jobs?.[0]?.id ?? 0, day: days[0]?.key ?? from });
                setNoteText("");
              }}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add a note
            </Button>
          </CardContent>
        </Card>
      )}

      {(board?.absences ?? []).length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <h2 className="mb-2 text-sm font-semibold">Leave this week</h2>
            <ul className="space-y-1 text-sm">
              {(board?.absences ?? []).map((absence) => {
                const worker = (board?.workers ?? []).find((w) => w.id === absence.workerId);
                return (
                  <li key={absence.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{worker?.name ?? "Someone"}</span>
                    <span className="text-muted-foreground">
                      {ABSENCE_TYPES.find((t) => t.value === absence.absenceType)?.label ??
                        absence.absenceType}
                      , {absence.startDate} to {absence.endDate}
                    </span>
                    {editable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6"
                        onClick={() => deleteAbsence.mutate(absence.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog open={allocating !== null} onOpenChange={(open) => !open && setAllocating(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {allocating === null ? "" : `${allocating.worker.name} on ${allocating.day}`}
            </DialogTitle>
            <DialogDescription>
              One site per person per day — the board is only useful if it says where somebody
              actually is.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error !== undefined && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Field label="Job" required>
              {(props) => (
                <Select value={allocationTarget} onValueChange={setAllocationTarget}>
                  <SelectTrigger id={props.id}>
                    <SelectValue placeholder="Select a job…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(jobs ?? []).map((job) => (
                      <SelectItem key={`job-${job.id}`} value={`job:${job.id}`}>
                        {labelJob({
                          jobNumber: job.jobNumber,
                          jobName: job.name,
                          jobAddress: job.address,
                        })}
                      </SelectItem>
                    ))}
                    {(maintenanceJobs ?? []).map((job) => (
                      <SelectItem key={`maint-${job.id}`} value={`maintenance:${job.id}`}>
                        {job.name} (maintenance)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>

            <Field label="Note" hint="Optional — what they are doing there.">
              {(props) => (
                <Input
                  {...props}
                  value={allocationNote}
                  onChange={(e) => setAllocationNote(e.target.value)}
                />
              )}
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocating(null)}>
              Cancel
            </Button>
            <Button onClick={saveAllocation} disabled={createAllocation.isPending}>
              {createAllocation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Allocate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addingWorker} onOpenChange={setAddingWorker}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a worker</DialogTitle>
            <DialogDescription>
              Somebody you allocate to sites. They do not get a login.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field label="Name" required>
              {(props) => (
                <Input {...props} value={workerName} onChange={(e) => setWorkerName(e.target.value)} />
              )}
            </Field>
            <Field label="Trade" hint="e.g. Carpenter">
              {(props) => (
                <Input {...props} value={workerTrade} onChange={(e) => setWorkerTrade(e.target.value)} />
              )}
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingWorker(false)}>
              Cancel
            </Button>
            <Button
              disabled={createWorker.isPending || workerName.trim() === ""}
              onClick={() =>
                createWorker.mutate(
                  {
                    name: workerName.trim(),
                    trade: workerTrade.trim() === "" ? null : workerTrade.trim(),
                  },
                  {
                    onSuccess: () => {
                      toast({ title: "Worker added", variant: "success" });
                      setAddingWorker(false);
                      setWorkerName("");
                      setWorkerTrade("");
                    },
                    onError: () =>
                      toast({ title: "The worker was not added", variant: "destructive" }),
                  },
                )
              }
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={absenceFor !== null} onOpenChange={(open) => !open && setAbsenceFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {absenceFor === null ? "" : `Record leave for ${absenceFor.name}`}
            </DialogTitle>
            <DialogDescription>
              They stay on the board, marked unavailable. “Everyone is on leave” is an answer the
              board should be able to give.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field label="Type" required>
              {(props) => (
                <Select value={absenceType} onValueChange={setAbsenceType}>
                  <SelectTrigger id={props.id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ABSENCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="From" required>
                {(props) => (
                  <Input
                    {...props}
                    type="date"
                    value={absenceFrom}
                    onChange={(e) => setAbsenceFrom(e.target.value)}
                  />
                )}
              </Field>
              <Field label="To" required>
                {(props) => (
                  <Input
                    {...props}
                    type="date"
                    value={absenceTo}
                    onChange={(e) => setAbsenceTo(e.target.value)}
                  />
                )}
              </Field>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAbsenceFor(null)}>
              Cancel
            </Button>
            <Button
              disabled={createAbsence.isPending}
              onClick={() => {
                if (absenceFor === null) return;
                createAbsence.mutate(
                  {
                    workerId: absenceFor.id,
                    absenceType,
                    startDate: absenceFrom,
                    endDate: absenceTo,
                  },
                  {
                    onSuccess: () => {
                      toast({ title: "Leave recorded", variant: "success" });
                      setAbsenceFor(null);
                    },
                    onError: (cause) =>
                      toast({
                        title: "The leave was not recorded",
                        description:
                          cause instanceof ApiError && cause.status === 409
                            ? "That overlaps leave they already have."
                            : undefined,
                        variant: "destructive",
                      }),
                  },
                );
              }}
            >
              Record it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addingMaintenance} onOpenChange={setAddingMaintenance}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a maintenance job</DialogTitle>
            <DialogDescription>
              Work that is not one of your build sites — a warranty callback, a repair. Workers
              can be allocated to it like any other job.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field label="Name" required>
              {(props) => (
                <Input
                  {...props}
                  value={maintenanceName}
                  onChange={(e) => setMaintenanceName(e.target.value)}
                  placeholder="e.g. Warranty — 14 Rae St"
                />
              )}
            </Field>
            <Field label="Reference" hint="Optional — a docket or work-order number.">
              {(props) => (
                <Input
                  {...props}
                  value={maintenanceRef}
                  onChange={(e) => setMaintenanceRef(e.target.value)}
                />
              )}
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingMaintenance(false)}>
              Cancel
            </Button>
            <Button
              disabled={createMaintenance.isPending || maintenanceName.trim() === ""}
              onClick={() =>
                createMaintenance.mutate(
                  {
                    name: maintenanceName.trim(),
                    reference: maintenanceRef.trim() === "" ? null : maintenanceRef.trim(),
                  },
                  {
                    onSuccess: () => {
                      toast({ title: "Maintenance job added", variant: "success" });
                      setAddingMaintenance(false);
                      setMaintenanceName("");
                      setMaintenanceRef("");
                    },
                    onError: () =>
                      toast({ title: "It was not added", variant: "destructive" }),
                  },
                )
              }
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteFor !== null} onOpenChange={(open) => !open && setNoteFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>A note on the day</DialogTitle>
            <DialogDescription>
              One per job per day. Saving again replaces what is there.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field label="Job" required>
              {(props) => (
                <Select
                  value={noteFor === null ? "" : String(noteFor.jobId)}
                  onValueChange={(v) =>
                    setNoteFor((current) =>
                      current === null ? null : { ...current, jobId: Number.parseInt(v, 10) },
                    )
                  }
                >
                  <SelectTrigger id={props.id}>
                    <SelectValue placeholder="Select a job…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(jobs ?? []).map((job) => (
                      <SelectItem key={job.id} value={String(job.id)}>
                        {labelJob({
                          jobNumber: job.jobNumber,
                          jobName: job.name,
                          jobAddress: job.address,
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>

            <Field label="Day" required>
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  value={noteFor?.day ?? ""}
                  onChange={(e) =>
                    setNoteFor((current) =>
                      current === null ? null : { ...current, day: e.target.value },
                    )
                  }
                />
              )}
            </Field>

            <Field label="Note" required>
              {(props) => (
                <Input
                  {...props}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="e.g. Concrete pour 7am, gate code 4821"
                />
              )}
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteFor(null)}>
              Cancel
            </Button>
            <Button
              disabled={setDayNote.isPending || noteText.trim() === "" || noteFor === null}
              onClick={() => {
                if (noteFor === null) return;
                setDayNote.mutate(
                  { jobId: noteFor.jobId, noteDate: noteFor.day, note: noteText.trim() },
                  {
                    onSuccess: () => {
                      toast({ title: "Note saved", variant: "success" });
                      setNoteFor(null);
                    },
                    onError: () => toast({ title: "It was not saved", variant: "destructive" }),
                  },
                );
              }}
            >
              Save the note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {removingWorker !== null && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setRemovingWorker(null);
          }}
          title={`Take ${removingWorker.name} off the board?`}
          // Deactivating, not deleting: their past allocations are the record
          // of who was on site.
          description="They stop appearing on the scheduler. Everywhere they have already been allocated stays as it is."
          confirmLabel="Take them off"
          onConfirm={() => {
            deactivateWorker.mutate(removingWorker.id);
            setRemovingWorker(null);
          }}
        />
      )}
    </>
  );
}
