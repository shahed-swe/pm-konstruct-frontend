"use client";

/**
 * How each supervisor is tracking.
 *
 * Manager-only, deliberately: it grades named people, and a supervisor
 * reading their peers' scores is not something the product has ever allowed.
 * The API refuses it too.
 *
 * The score is shown beside the numbers it came from rather than alone. A
 * single figure invites an argument about the figure; the parts invite an
 * argument about the work, which is the useful conversation.
 */
import { useState } from "react";
import { Badge } from "@/components/atoms/Badge";
import { Progress } from "@/components/atoms/Progress";
import { PageHeader } from "@/components/molecules/PageHeader";
import { ReportFilterBar } from "@/components/organisms/ReportFilters";
import { ReportTable, type Column } from "@/components/organisms/ReportTable";
import { useSupervisorPerformance, type ReportFilters } from "@/lib/api/resources/reports";
import { cn } from "@/lib/utils/cn";
import type { SupervisorPerformanceDto } from "@/lib/api/types";

/** A rate the API sends as a fraction, or as null when there is nothing to divide. */
function rate(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function scoreTone(score: number): string {
  if (score >= 80) return "border-emerald-400/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "border-amber-400/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return "border-red-400/30 bg-red-500/10 text-red-600 dark:text-red-400";
}

export function SupervisorPerformanceScreen() {
  const [filters, setFilters] = useState<ReportFilters>({});
  const { data, isLoading } = useSupervisorPerformance(filters);

  const columns: Column<SupervisorPerformanceDto>[] = [
    { header: "Supervisor", cell: (r) => r.name },
    { header: "Active jobs", cell: (r) => r.activeJobs },
    { header: "Completed", cell: (r) => r.completedJobs },
    {
      header: "Started on time",
      cell: (r) => rate(r.onTimeStartRate),
      value: (r) => r.onTimeStartRate,
    },
    {
      header: "Finished on time",
      cell: (r) => rate(r.onTimeCompletionRate),
      value: (r) => r.onTimeCompletionRate,
    },
    { header: "Delayed items", cell: (r) => r.delayedTaskCount },
    {
      header: "Average delay",
      cell: (r) => (r.avgDelayDays === null ? "—" : `${r.avgDelayDays} days`),
      value: (r) => r.avgDelayDays,
    },
    {
      header: "Diary kept",
      cell: (r) => rate(r.diaryComplianceRate),
      value: (r) => r.diaryComplianceRate,
    },
    {
      header: "Score",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn(scoreTone(r.performanceScore))}>
            {r.performanceScore}
          </Badge>
          <Progress
            value={r.performanceScore}
            className="w-16"
            aria-label={`${r.name}'s score`}
          />
        </div>
      ),
      value: (r) => r.performanceScore,
    },
  ];

  return (
    <>
      <PageHeader
        title="Supervisor performance"
        description="Built from the dates and diaries already recorded, not from anything anyone fills in separately."
      />

      <ReportFilterBar
        filters={filters}
        onChange={setFilters}
        // No supervisor filter: the point of the page is comparing them.
        show={{ job: true, supervisor: false, dates: true }}
      />

      <ReportTable
        rows={data}
        columns={columns}
        isLoading={isLoading}
        caption="Supervisor performance"
        filename="supervisor-performance"
        rowKey={(r) => r.supervisorId}
        emptyTitle="No supervisors to compare"
        emptyDescription="Supervisors appear here once they are assigned to a job."
      />
    </>
  );
}
