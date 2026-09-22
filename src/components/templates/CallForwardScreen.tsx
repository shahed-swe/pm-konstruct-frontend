"use client";

/**
 * What is coming up, across every job.
 *
 * Grouped by job with the most urgent items first, because the question this
 * page answers is "what do I need to chase today?". A job with something
 * delayed is marked at the group level, so a manager scanning the page does
 * not have to read every row.
 */
import { AlertTriangle, ArrowRight, Clock, PhoneForwarded, Play, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Skeleton } from "@/components/atoms/Skeleton";
import { DelayBadge } from "@/components/molecules/DelayBadge";
import { EmptyState } from "@/components/molecules/EmptyState";
import { PageHeader } from "@/components/molecules/PageHeader";
import { useUpcomingCallForward } from "@/lib/api/resources/callForward";
import { useJobs } from "@/lib/api/resources/jobs";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { CallForwardDto, JobDto } from "@/lib/api/types";

/** Delayed first, then running, then waiting; earliest date within each. */
const URGENCY: Record<string, number> = {
  delayed: 0,
  in_progress: 1,
  not_started: 2,
  on_hold: 3,
};

function byUrgency(a: CallForwardDto, b: CallForwardDto): number {
  const ua = URGENCY[a.delayStatus] ?? 5;
  const ub = URGENCY[b.delayStatus] ?? 5;
  if (ua !== ub) return ua - ub;
  // A missing date sorts last rather than first, which a plain compare of
  // nulls would not do.
  const da = a.estStart ?? a.estFinish ?? "9999-99-99";
  const db = b.estStart ?? b.estFinish ?? "9999-99-99";
  return da.localeCompare(db);
}

const PER_JOB = 4;

function JobGroup({ job, items }: { job: JobDto; items: CallForwardDto[] }) {
  const delayed = items.filter((i) => i.delayStatus === "delayed").length;
  const running = items.filter((i) => i.delayStatus === "in_progress").length;
  const shown = items.slice(0, PER_JOB);
  const remaining = items.length - shown.length;

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <header
        className={cn(
          "flex items-center justify-between gap-3 border-b px-4 py-3",
          delayed > 0 ? "border-l-4 border-l-red-500 bg-red-500/5" : "bg-secondary/30",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              delayed > 0 ? "bg-red-500/15 text-red-600" : "bg-primary/10 text-primary",
            )}
          >
            <PhoneForwarded className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-sm font-semibold">
                {job.address === "" ? job.name : job.address}
              </h2>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                #{job.jobNumber}
              </span>
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-2.5 text-[11px]">
              {delayed > 0 && (
                <span className="flex items-center gap-0.5 font-semibold text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" /> {delayed} delayed
                </span>
              )}
              {running > 0 && (
                <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
                  <Play className="h-3 w-3" aria-hidden="true" /> {running} in progress
                </span>
              )}
              {delayed === 0 && running === 0 && items.length > 0 && (
                <span className="text-muted-foreground">{items.length} upcoming</span>
              )}
            </p>
          </div>
        </div>

        <Button asChild size="sm" variant="ghost" className="h-8 shrink-0 text-xs">
          <Link href={`/jobs/${job.id}/call-forward`}>
            View schedule <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </header>

      {items.length === 0 ? (
        <p className="flex items-center gap-2 px-4 py-3.5 text-xs italic text-muted-foreground">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Nothing scheduled — all done, or not
          yet planned.
        </p>
      ) : (
        <>
          <ul className="divide-y">
            {shown.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/jobs/${job.id}/call-forward`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 hover:bg-muted/30"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
                  {item.supplierTrade !== null && (
                    <span className="truncate text-xs text-muted-foreground">
                      {item.supplierTrade}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(item.estStart ?? item.estFinish)}
                  </span>
                  <DelayBadge delayStatus={item.delayStatus} delayDays={item.delayDays} />
                </Link>
              </li>
            ))}
          </ul>
          {remaining > 0 && (
            <div className="border-t bg-muted/20 px-4 py-2.5">
              <Link
                href={`/jobs/${job.id}/call-forward`}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
              >
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
                {remaining} more {remaining === 1 ? "item" : "items"} — view the full schedule
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function CallForwardScreen() {
  const [search, setSearch] = useState("");
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const { data: upcoming, isLoading: itemsLoading } = useUpcomingCallForward();

  const itemsByJob = useMemo(() => {
    const out = new Map<number, CallForwardDto[]>();
    for (const item of upcoming ?? []) {
      out.set(item.jobId, [...(out.get(item.jobId) ?? []), item]);
    }
    for (const list of out.values()) list.sort(byUrgency);
    return out;
  }, [upcoming]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (jobs ?? [])
      .filter((job) => job.status === "active")
      .filter(
        (job) =>
          q === "" ||
          job.name.toLowerCase().includes(q) ||
          job.address.toLowerCase().includes(q) ||
          job.jobNumber.toLowerCase().includes(q),
      )
      // Jobs with something delayed first, so the page opens on the problems.
      .sort((a, b) => {
        const da = (itemsByJob.get(a.id) ?? []).some((i) => i.delayStatus === "delayed") ? 0 : 1;
        const db = (itemsByJob.get(b.id) ?? []).some((i) => i.delayStatus === "delayed") ? 0 : 1;
        return da - db || a.jobNumber.localeCompare(b.jobNumber);
      });
  }, [jobs, search, itemsByJob]);

  const loading = jobsLoading || itemsLoading;

  return (
    <>
      <PageHeader
        title="Call forward"
        description="What is coming up on each site, and what has slipped."
      />

      <div className="relative mb-6 max-w-md">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          aria-label="Search jobs"
          placeholder="Search jobs…"
          className="bg-card pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-4" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<PhoneForwarded className="h-10 w-10" />}
          title="No active jobs"
          description="A job needs to be active before its programme appears here."
        />
      ) : (
        <div className="space-y-4">
          {groups.map((job) => (
            <JobGroup key={job.id} job={job} items={itemsByJob.get(job.id) ?? []} />
          ))}
        </div>
      )}
    </>
  );
}
