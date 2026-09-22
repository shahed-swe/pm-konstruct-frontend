"use client";

/**
 * How far along each site is.
 *
 * One record per reading, so the history is kept rather than one number
 * being overwritten -- which is what makes the reports able to say when a
 * job stalled.
 */
import { Loader2, Plus, Trash2, TrendingUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Progress } from "@/components/atoms/Progress";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Textarea } from "@/components/atoms/Textarea";
import { Card, CardContent } from "@/components/molecules/Card";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
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
import {
  useCreateProgress,
  useDeleteProgress,
  useProgress,
} from "@/lib/api/resources/progress";
import { useJobs } from "@/lib/api/resources/jobs";
import { canEdit } from "@/lib/auth/permissions";
import { useJobLabel } from "@/lib/jobs/useJobLabel";
import { formatDate, today } from "@/lib/utils/format";
import { useAuthStore } from "@/stores/auth.store";
import { useUiStore } from "@/stores/ui.store";
import type { ProgressDto } from "@/lib/api/types";

export function ProgressScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const jobFilter = params.get("jobId") ?? "all";

  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const toast = useUiStore((s) => s.toast);
  const labelJob = useJobLabel();
  // Progress is gated on `jobs:write`, as the legacy gated its reading on
  // `jobs:read` -- it is job data wearing another name.
  const mayEdit = canEdit(user, permissions, "jobs");

  const { data: jobs } = useJobs();
  const { data: records, isLoading } = useProgress(
    jobFilter === "all" ? undefined : Number.parseInt(jobFilter, 10),
  );
  const create = useCreateProgress();
  const remove = useDeleteProgress();

  const [adding, setAdding] = useState(false);
  const [jobId, setJobId] = useState(jobFilter === "all" ? "" : jobFilter);
  const [date, setDate] = useState(today());
  const [percent, setPercent] = useState("");
  const [milestone, setMilestone] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [deleting, setDeleting] = useState<ProgressDto | null>(null);

  const byJob = useMemo(() => {
    const out = new Map<number, ProgressDto[]>();
    for (const record of records ?? []) {
      out.set(record.jobId, [...(out.get(record.jobId) ?? []), record]);
    }
    // Newest first: the latest reading is the one people want.
    for (const list of out.values()) list.sort((a, b) => b.date.localeCompare(a.date));
    return out;
  }, [records]);

  function setJobFilter(value: string) {
    router.replace(value === "all" ? "/progress" : `/progress?jobId=${value}`);
  }

  function submit() {
    const pct = Number.parseFloat(percent);
    if (jobId === "") {
      setError("Choose the job this reading is for.");
      return;
    }
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setError("The percentage must be between 0 and 100.");
      return;
    }
    setError(undefined);

    create.mutate(
      {
        jobId: Number.parseInt(jobId, 10),
        date,
        percentComplete: pct,
        milestone: milestone.trim() === "" ? null : milestone.trim(),
        description: description.trim() === "" ? null : description.trim(),
      },
      {
        onSuccess: () => {
          toast({ title: "Progress recorded", variant: "success" });
          setAdding(false);
          setPercent("");
          setMilestone("");
          setDescription("");
        },
        onError: (cause) =>
          setError(cause instanceof ApiError ? cause.message : "It could not be recorded."),
      },
    );
  }

  return (
    <>
      <PageHeader
        title="Progress"
        description="How far along each site is, and when it got there."
        actions={
          mayEdit ? (
            <Button onClick={() => setAdding((v) => !v)}>
              <Plus className="h-4 w-4" /> Record progress
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 max-w-sm">
        <Select value={jobFilter} onValueChange={setJobFilter}>
          <SelectTrigger aria-label="Filter by job">
            <SelectValue placeholder="All jobs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All jobs</SelectItem>
            {(jobs ?? []).map((job) => (
              <SelectItem key={job.id} value={String(job.id)}>
                {labelJob({ jobNumber: job.jobNumber, jobName: job.name, jobAddress: job.address })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {adding && mayEdit && (
        <Card className="mb-6">
          <CardContent className="space-y-4 p-4">
            {error !== undefined && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Job" required className="sm:col-span-3">
                {(props) => (
                  <Select value={jobId} onValueChange={setJobId}>
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

              <Field label="Date" required>
                {(props) => (
                  <Input {...props} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                )}
              </Field>

              <Field label="Percent complete" required>
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    min={0}
                    max={100}
                    value={percent}
                    onChange={(e) => setPercent(e.target.value)}
                  />
                )}
              </Field>

              <Field label="Milestone" hint="e.g. Frame complete">
                {(props) => (
                  <Input {...props} value={milestone} onChange={(e) => setMilestone(e.target.value)} />
                )}
              </Field>
            </div>

            <Field label="Notes">
              {(props) => (
                <Textarea
                  {...props}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-20"
                />
              )}
            </Field>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={create.isPending}>
                {create.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Record it
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : byJob.size === 0 ? (
        <EmptyState
          icon={<TrendingUp className="h-10 w-10" />}
          title="No progress recorded yet"
          description="A reading against a date is what lets the reports say when a job stalled."
        />
      ) : (
        <div className="space-y-4">
          {[...byJob.entries()].map(([id, list]) => {
            const job = (jobs ?? []).find((j) => j.id === id);
            const latest = list[0];
            if (latest === undefined) return null;

            return (
              <Card key={id}>
                <CardContent className="p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">
                      {job === undefined
                        ? `Job #${id}`
                        : labelJob({
                            jobNumber: job.jobNumber,
                            jobName: job.name,
                            jobAddress: job.address,
                          })}
                    </h2>
                    <span className="text-sm font-medium">{latest.percentComplete}%</span>
                  </div>

                  <Progress
                    value={latest.percentComplete}
                    aria-label={`Progress on ${job?.jobNumber ?? id}`}
                  />

                  <ul className="mt-4 divide-y text-sm">
                    {list.map((record) => (
                      <li key={record.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                        <span className="w-24 shrink-0 text-muted-foreground">
                          {formatDate(record.date)}
                        </span>
                        <span className="w-12 shrink-0 font-medium">{record.percentComplete}%</span>
                        <span className="min-w-0 flex-1 truncate">
                          {record.milestone ?? record.description ?? ""}
                        </span>
                        {mayEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            aria-label={`Delete the reading from ${formatDate(record.date)}`}
                            onClick={() => setDeleting(record)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {deleting !== null && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
          title="Delete this reading?"
          description="The history is what the reports read to work out when a job stalled."
          confirmLabel="Delete"
          destructive
          onConfirm={() => {
            remove.mutate(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}
