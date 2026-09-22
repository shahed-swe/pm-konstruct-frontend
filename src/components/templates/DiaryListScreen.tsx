"use client";

/**
 * The site diary.
 *
 * One entry per site per day is the product's rhythm, so the list is
 * chronological and filtered by job. The action flags on the left edge are
 * what a manager scans for: red means somebody needs to do something.
 */
import { AlertTriangle, BookOpen, CloudSun, Filter, Plus, ShieldAlert, User } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Card, CardContent } from "@/components/molecules/Card";
import { EmptyState } from "@/components/molecules/EmptyState";
import { PageHeader } from "@/components/molecules/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/Select";
import { actionStatusLabel, type ActionStatus } from "@/components/molecules/ActionStatusButtons";
import { useDiaryEntries } from "@/lib/api/resources/diary";
import { useJobs } from "@/lib/api/resources/jobs";
import { useJobLabel } from "@/lib/jobs/useJobLabel";
import { canEdit } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth.store";
import type { DiaryEntryDto } from "@/lib/api/types";

const STATUS_EDGE: Record<string, string> = {
  action: "border-l-4 border-l-red-500",
  processing: "border-l-4 border-l-amber-500",
  completed: "border-l-4 border-l-emerald-500",
};

const STATUS_BADGE: Record<string, string> = {
  action: "bg-red-500 text-white border-transparent",
  processing: "bg-amber-500 text-white border-transparent",
  completed: "bg-emerald-500 text-white border-transparent",
};

/**
 * What the card shows as the entry's gist.
 *
 * An inspection form files itself as a diary entry whose `workCompleted`
 * begins "SITE INSPECTION"; for those the note is the readable part, so it
 * wins. Ported from the legacy, which worked the same way.
 */
function preview(entry: DiaryEntryDto): { text: string; isForm: boolean } {
  const work = entry.workCompleted.trim();
  const note = (entry.notes ?? "").trim();
  const isForm =
    work.toUpperCase().startsWith("SITE INSPECTION") ||
    note.toUpperCase().includes("SITE INSPECTION");
  const text = isForm && note !== "" ? note : work !== "" ? work : note;
  return { text: text === "" ? "Diary entry" : text, isForm };
}

export function DiaryListScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const jobFilter = params.get("jobId") ?? "all";

  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const mayCreate = canEdit(user, permissions, "site-diary");
  const labelJob = useJobLabel();

  const { data: jobs } = useJobs();
  const { data: entries, isLoading } = useDiaryEntries(
    jobFilter === "all" ? {} : { jobId: Number.parseInt(jobFilter, 10) },
  );

  const sorted = useMemo(
    () =>
      [...(entries ?? [])].sort(
        (a, b) => b.date.localeCompare(a.date) || (b.time ?? "").localeCompare(a.time ?? ""),
      ),
    [entries],
  );

  // The filter lives in the URL rather than in state, so a link to one job's
  // diary can be shared and the browser's Back button works.
  function setJobFilter(value: string) {
    router.replace(value === "all" ? "/site-diary" : `/site-diary?jobId=${value}`);
  }

  const newEntryHref = jobFilter === "all" ? "/site-diary/new" : `/site-diary/new?jobId=${jobFilter}`;

  return (
    <>
      <PageHeader
        title="Site diary"
        description="What happened on site, day by day."
        actions={
          mayCreate ? (
            <Button asChild>
              <Link href={newEntryHref}>
                <Plus className="h-4 w-4" /> New entry
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <Filter className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Select value={jobFilter} onValueChange={setJobFilter}>
          <SelectTrigger className="w-full sm:w-72" aria-label="Filter by job">
            <SelectValue placeholder="All jobs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All jobs</SelectItem>
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
        {jobFilter !== "all" && (
          <Button variant="ghost" size="sm" onClick={() => setJobFilter("all")}>
            Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-10 w-10" />}
          title="No diary entries yet"
          description={
            jobFilter === "all"
              ? "The first entry on a site starts the record."
              : "Nothing has been logged on this job yet."
          }
          action={
            mayCreate ? (
              <Button asChild size="sm">
                <Link href={newEntryHref}>
                  <Plus className="h-4 w-4" /> New entry
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {sorted.map((entry) => {
            const status = entry.actionStatus as ActionStatus;
            const label = actionStatusLabel(status);
            const { text, isForm } = preview(entry);

            return (
              <li key={entry.id}>
                <Link href={`/site-diary/${entry.id}`} className="block">
                  <Card
                    className={cn(
                      "transition-all hover:border-primary/50 hover:shadow-md",
                      status !== null && STATUS_EDGE[status],
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-primary">
                          {labelJob({
                            jobNumber: entry.jobNumber,
                            jobName: entry.jobName,
                            jobAddress: entry.jobAddress,
                          }) || `Job #${entry.jobId}`}
                        </span>
                        {label !== null && (
                          <Badge className={STATUS_BADGE[status as string]}>{label}</Badge>
                        )}
                        {isForm && <Badge variant="outline">Completed form</Badge>}
                        {entry.issues !== null && entry.issues !== "" && (
                          <Badge variant="outline" className="gap-1 text-destructive">
                            <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" /> Issues
                          </Badge>
                        )}
                        {entry.safetyNotes !== null && entry.safetyNotes !== "" && (
                          <Badge variant="outline" className="gap-1 text-amber-600 dark:text-amber-400">
                            <ShieldAlert className="h-2.5 w-2.5" aria-hidden="true" /> Safety
                          </Badge>
                        )}
                      </div>

                      <p className="line-clamp-3 whitespace-pre-line text-sm text-foreground/80">
                        {text}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{formatDate(entry.date)}</span>
                        {entry.time !== null && <span>{entry.time}</span>}
                        {entry.authorName !== null && entry.authorName !== undefined && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" aria-hidden="true" />
                            {entry.authorName}
                          </span>
                        )}
                        {entry.weather !== null && (
                          <span className="flex items-center gap-1">
                            <CloudSun className="h-3 w-3" aria-hidden="true" />
                            {entry.weather}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
