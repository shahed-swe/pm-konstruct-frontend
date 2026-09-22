"use client";

/**
 * The reports.
 *
 * Eleven views over the same rows the rest of the product writes, sharing
 * one filter bar and one table. The legacy had a copy of both on every
 * report and they had drifted: two offered a supervisor filter and the
 * others did not, and one defaulted its range to a month.
 *
 * The tab lives in the query string, as it did before, so a link to one
 * report opens on that report.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/atoms/Badge";
import { PageHeader } from "@/components/molecules/PageHeader";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/molecules/Tabs";
import { DelayBadge } from "@/components/molecules/DelayBadge";
import { Input } from "@/components/atoms/Input";
import { Field } from "@/components/molecules/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/Select";
import { DashboardCalendar } from "@/components/organisms/DashboardCalendar";
import { GanttChart } from "@/components/organisms/GanttChart";
import {
  DelaySeverityChart,
  JobHealthChart,
  SupervisorScoreChart,
} from "@/components/organisms/ReportCharts";
import { ReportFilterBar } from "@/components/organisms/ReportFilters";
import { ReportTable, type Column } from "@/components/organisms/ReportTable";
import { useCalendar } from "@/lib/api/resources/dashboard";
import { useReportMeta, useSupervisorPerformance, useDailyProgressReport } from "@/lib/api/resources/reports";
import { useAuthStore } from "@/stores/auth.store";
import { today } from "@/lib/utils/format";
import {
  useDelaysReport,
  useDiarySummaryReport,
  useInspectionsReport,
  useJobProgressReport,
  useStageClaimsReport,
  useUpcomingTasksReport,
  useWeatherImpactReport,
  type ReportFilters,
} from "@/lib/api/resources/reports";
import { formatDate } from "@/lib/utils/format";
import type {
  SupervisorPerformanceDto,
  DelayDto,
  DiaryReportDto,
  InspectionDto,
  JobProgressDto,
  StageClaimDto,
  UpcomingTaskDto,
  WeatherRowDto,
} from "@/lib/api/types";

const HEALTH_STYLE: Record<string, string> = {
  on_track: "border-emerald-400/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  at_risk: "border-amber-400/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  behind: "border-red-400/30 bg-red-500/10 text-red-600 dark:text-red-400",
};

/**
 * The report's severity bands are not the dashboard's buckets.
 *
 * Reports classify a delay at 3/7/14 days and the dashboard at 7/14/28.
 * Both are preserved deliberately -- managers have calibrated to them, and
 * aligning them would silently reclassify historical delays on one of the
 * two. See `docs/audit/preserved-quirks.md`.
 */
const SEVERITY_STYLE: Record<string, string> = {
  critical: "border-red-400/30 bg-red-500/10 text-red-600 dark:text-red-400",
  major: "border-amber-400/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  minor: "border-border bg-muted text-muted-foreground",
};

/** The schedule tab spans everything rather than one month. */
function ScheduleTab({ filters }: { filters: ReportFilters }) {
  const { data, isLoading } = useCalendar({
    gantt: true,
    ...(filters.jobId === undefined ? {} : { jobId: filters.jobId }),
    ...(filters.supervisorId === undefined ? {} : { supervisorId: filters.supervisorId }),
  });
  return (
    <div className="rounded-xl border bg-card p-4">
      <GanttChart events={data} isLoading={isLoading} />
    </div>
  );
}

/** One job on one day: the programme against what the diary recorded. */
function DailyProgressTab({ filters }: { filters: ReportFilters }) {
  const { data: meta } = useReportMeta();
  const [jobId, setJobId] = useState<string>(
    filters.jobId === undefined ? "" : String(filters.jobId),
  );
  const [date, setDate] = useState(today());

  const chosen = jobId === "" ? undefined : Number.parseInt(jobId, 10);
  const { data, isLoading } = useDailyProgressReport(chosen, date);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3">
        <Field label="Job" required className="min-w-52 flex-1">
          {(props) => (
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger id={props.id}>
                <SelectValue placeholder="Select a job…" />
              </SelectTrigger>
              <SelectContent>
                {(meta?.jobs ?? []).map((job) => (
                  <SelectItem key={job.id} value={String(job.id)}>
                    {job.jobNumber} — {job.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
        <Field label="Date" required className="w-44">
          {(props) => (
            <Input {...props} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          )}
        </Field>
      </div>

      {chosen === undefined ? (
        <p className="text-sm text-muted-foreground">Choose a job and a day.</p>
      ) : isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : data === undefined ? (
        <p className="text-sm text-muted-foreground">Nothing recorded for that day.</p>
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border bg-card p-3">
              <dt className="text-xs text-muted-foreground">Complete</dt>
              <dd className="text-lg font-semibold">{data.completionPct}%</dd>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <dt className="text-xs text-muted-foreground">Delayed items</dt>
              <dd className="text-lg font-semibold">{data.delayedTasks}</dd>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <dt className="text-xs text-muted-foreground">Days behind</dt>
              <dd className="text-lg font-semibold">{data.daysBehindProgram}</dd>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <dt className="text-xs text-muted-foreground">Planned that day</dt>
              <dd className="text-lg font-semibold">{data.plannedToday.length}</dd>
            </div>
          </dl>

          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">The diary for that day</h3>
            {data.diary === null ? (
              <p className="text-sm text-muted-foreground">
                No diary entry was written — which is itself worth knowing.
              </p>
            ) : (
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Work completed</dt>
                  <dd className="whitespace-pre-wrap">{data.diary.workCompleted}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Issues</dt>
                  <dd className="whitespace-pre-wrap">{data.diary.issues}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Trades on site</dt>
                  <dd className="whitespace-pre-wrap">{data.diary.tradesOnSite}</dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** The supervisor table, repeated here as a tab exactly as it was. */
function SupervisorTab({ filters }: { filters: ReportFilters }) {
  const { data, isLoading } = useSupervisorPerformance(filters);

  const columns: Column<SupervisorPerformanceDto>[] = [
    { header: "Supervisor", cell: (r) => r.name },
    { header: "Active jobs", cell: (r) => r.activeJobs },
    {
      header: "Started on time",
      cell: (r) => (r.onTimeStartRate === null ? "—" : `${Math.round(r.onTimeStartRate * 100)}%`),
      value: (r) => r.onTimeStartRate,
    },
    {
      header: "Finished on time",
      cell: (r) =>
        r.onTimeCompletionRate === null ? "—" : `${Math.round(r.onTimeCompletionRate * 100)}%`,
      value: (r) => r.onTimeCompletionRate,
    },
    { header: "Delayed items", cell: (r) => r.delayedTaskCount },
    {
      header: "Diary kept",
      cell: (r) =>
        r.diaryComplianceRate === null ? "—" : `${Math.round(r.diaryComplianceRate * 100)}%`,
      value: (r) => r.diaryComplianceRate,
    },
    { header: "Score", cell: (r) => r.performanceScore },
  ];

  return (
    <>
      <SupervisorScoreChart rows={data ?? []} />
      <ReportTable
        rows={data}
        columns={columns}
        isLoading={isLoading}
        caption="Supervisor performance"
        filename="supervisor-performance"
        rowKey={(r) => r.supervisorId}
        emptyTitle="No supervisors to compare"
      />
    </>
  );
}

export function ReportsScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const isManager = useAuthStore((s) => s.user?.role === "MANAGER");
  const [filters, setFilters] = useState<ReportFilters>({});

  const tab = params.get("tab") ?? "progress";
  const setTab = (next: string) => router.replace(`/reports?tab=${next}`);

  const progress = useJobProgressReport(filters);
  const delays = useDelaysReport(filters);
  const diary = useDiarySummaryReport(filters);
  const upcoming = useUpcomingTasksReport(filters);
  const claims = useStageClaimsReport(filters);
  const inspections = useInspectionsReport(filters);
  const weather = useWeatherImpactReport(filters);

  const progressColumns: Column<JobProgressDto>[] = [
    { header: "Job", cell: (r) => r.jobNumber },
    { header: "Name", cell: (r) => r.jobName },
    { header: "Supervisor", cell: (r) => r.supervisorName ?? "—" },
    { header: "Tasks", cell: (r) => r.totalTasks },
    { header: "Done", cell: (r) => r.completed },
    { header: "Delayed", cell: (r) => r.delayedCount },
    { header: "Complete", cell: (r) => `${r.completionPct}%`, value: (r) => r.completionPct },
    {
      header: "Health",
      cell: (r) => (
        <Badge variant="outline" className={HEALTH_STYLE[r.health]}>
          {r.health.replace(/_/g, " ")}
        </Badge>
      ),
      value: (r) => r.health,
    },
  ];

  const delayColumns: Column<DelayDto>[] = [
    { header: "Job", cell: (r) => r.jobNumber },
    { header: "Item", cell: (r) => r.title },
    { header: "Trade", cell: (r) => r.supplierTrade ?? "—" },
    { header: "Supervisor", cell: (r) => r.supervisorName ?? "—" },
    { header: "Due", cell: (r) => formatDate(r.estFinish), value: (r) => r.estFinish },
    { header: "Days late", cell: (r) => r.delayDays },
    {
      header: "Severity",
      cell: (r) => (
        <Badge variant="outline" className={SEVERITY_STYLE[r.severity]}>
          {r.severity}
        </Badge>
      ),
      value: (r) => r.severity,
    },
  ];

  const diaryColumns: Column<DiaryReportDto>[] = [
    { header: "Date", cell: (r) => formatDate(r.date), value: (r) => r.date },
    { header: "Job", cell: (r) => r.jobNumber },
    { header: "Author", cell: (r) => r.authorName ?? "—" },
    { header: "Workforce", cell: (r) => r.workforce ?? "—" },
    {
      header: "Work completed",
      cell: (r) => <span className="line-clamp-2">{r.workCompleted}</span>,
      value: (r) => r.workCompleted,
      className: "max-w-80",
    },
    {
      header: "Issues",
      cell: (r) => <span className="line-clamp-2">{r.issues}</span>,
      value: (r) => r.issues,
      className: "max-w-60",
    },
  ];

  const upcomingColumns: Column<UpcomingTaskDto>[] = [
    { header: "Job", cell: (r) => r.jobNumber },
    { header: "Item", cell: (r) => r.title },
    { header: "Trade", cell: (r) => r.supplierTrade ?? "—" },
    { header: "Starts", cell: (r) => formatDate(r.estStart), value: (r) => r.estStart },
    {
      header: "In",
      cell: (r) =>
        r.daysUntilStart === null
          ? "—"
          : r.daysUntilStart === 0
            ? "today"
            : `${r.daysUntilStart} days`,
      value: (r) => r.daysUntilStart,
    },
    { header: "Supervisor", cell: (r) => r.supervisorName ?? "—" },
  ];

  const claimColumns: Column<StageClaimDto>[] = [
    { header: "Job", cell: (r) => r.jobNumber },
    { header: "Claim", cell: (r) => r.title },
    { header: "Due", cell: (r) => formatDate(r.estFinish), value: (r) => r.estFinish },
    {
      header: "Claimed",
      cell: (r) => formatDate(r.actualFinish),
      value: (r) => r.actualFinish,
    },
    { header: "Forecast month", cell: (r) => r.forecastMonth ?? "—" },
    { header: "Status", cell: (r) => r.status.replace(/_/g, " ") },
  ];

  const inspectionColumns: Column<InspectionDto>[] = [
    { header: "Date", cell: (r) => formatDate(r.date), value: (r) => r.date },
    { header: "Job", cell: (r) => r.jobNumber },
    { header: "Inspector", cell: (r) => r.inspector ?? "—" },
    { header: "Workforce", cell: (r) => r.workforce ?? "—" },
    {
      header: "Safety notes",
      cell: (r) => <span className="line-clamp-2">{r.safetyNotes ?? ""}</span>,
      value: (r) => r.safetyNotes,
      className: "max-w-80",
    },
  ];

  const weatherColumns: Column<WeatherRowDto>[] = [
    { header: "Date", cell: (r) => formatDate(r.date), value: (r) => r.date },
    { header: "Job", cell: (r) => r.jobNumber },
    { header: "Conditions", cell: (r) => r.weatherCondition ?? "—" },
    {
      header: "Temperature",
      cell: (r) => (r.temperature === null ? "—" : `${r.temperature}°C`),
      value: (r) => r.temperature,
    },
    {
      header: "Rain",
      cell: (r) => (r.rainfallMm === null ? "—" : `${r.rainfallMm} mm`),
      value: (r) => r.rainfallMm,
    },
    {
      header: "Lost day",
      cell: (r) =>
        r.isWeatherImpactDay ? (
          <DelayBadge delayStatus="delayed" />
        ) : (
          <span className="text-muted-foreground">No</span>
        ),
      value: (r) => (r.isWeatherImpactDay ? "yes" : "no"),
    },
    { header: "Why", cell: (r) => r.impactReason ?? "—" },
  ];

  return (
    <>
      <PageHeader title="Reports" description="Every site, from the rows the team already writes." />

      <ReportFilterBar filters={filters} onChange={setFilters} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 flex h-auto flex-wrap justify-start print:hidden">
          <TabsTrigger value="progress">Job progress</TabsTrigger>
          {isManager && <TabsTrigger value="supervisor">Supervisor</TabsTrigger>}
          <TabsTrigger value="delays">Delays</TabsTrigger>
          <TabsTrigger value="diary">Site diary</TabsTrigger>
          <TabsTrigger value="upcoming">What is coming up</TabsTrigger>
          <TabsTrigger value="daily">Daily progress</TabsTrigger>
          <TabsTrigger value="schedule">Project schedule</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="weather">Weather</TabsTrigger>
          <TabsTrigger value="claims">Stage claims</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
        </TabsList>

        {isManager && (
          <TabsContent value="supervisor">
            <SupervisorTab filters={filters} />
          </TabsContent>
        )}

        <TabsContent value="daily">
          <DailyProgressTab filters={filters} />
        </TabsContent>

        <TabsContent value="schedule">
          <ScheduleTab filters={filters} />
        </TabsContent>

        <TabsContent value="calendar">
          <DashboardCalendar />
        </TabsContent>

        <TabsContent value="progress">
          <JobHealthChart rows={progress.data ?? []} />
          <ReportTable
            rows={progress.data}
            columns={progressColumns}
            isLoading={progress.isLoading}
            caption="How each job is tracking"
            filename="job-progress"
            rowKey={(r) => r.jobId}
            emptyTitle="No jobs match these filters"
          />
        </TabsContent>

        <TabsContent value="delays">
          <DelaySeverityChart rows={delays.data ?? []} />
          <ReportTable
            rows={delays.data}
            columns={delayColumns}
            isLoading={delays.isLoading}
            caption="Programme items that have slipped"
            filename="delays"
            rowKey={(r) => r.taskId}
            emptyTitle="Nothing is running late"
            emptyDescription="Every programme item is on or ahead of its date."
          />
        </TabsContent>

        <TabsContent value="diary">
          <ReportTable
            rows={diary.data}
            columns={diaryColumns}
            isLoading={diary.isLoading}
            caption="Diary entries in the range"
            filename="site-diary"
            rowKey={(r) => r.id}
            emptyTitle="No diary entries in this range"
          />
        </TabsContent>

        <TabsContent value="upcoming">
          <ReportTable
            rows={upcoming.data}
            columns={upcomingColumns}
            isLoading={upcoming.isLoading}
            caption="Programme items starting soon"
            filename="upcoming-tasks"
            rowKey={(r) => r.taskId}
            emptyTitle="Nothing scheduled to start"
          />
        </TabsContent>

        <TabsContent value="claims">
          <ReportTable
            rows={claims.data}
            columns={claimColumns}
            isLoading={claims.isLoading}
            caption="Stage claims and when they fall due"
            filename="stage-claims"
            rowKey={(r) => r.id}
            emptyTitle="No stage claims"
          />
        </TabsContent>

        <TabsContent value="inspections">
          <ReportTable
            rows={inspections.data}
            columns={inspectionColumns}
            isLoading={inspections.isLoading}
            caption="Inspections carried out"
            filename="inspections"
            rowKey={(r) => r.id}
            emptyTitle="No inspections in this range"
          />
        </TabsContent>

        <TabsContent value="weather">
          {weather.data !== undefined && (
            <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border bg-card p-3">
                <dt className="text-xs text-muted-foreground">Days lost</dt>
                <dd className="text-lg font-semibold">{weather.data.totalImpactDays}</dd>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <dt className="text-xs text-muted-foreground">Rain</dt>
                <dd className="text-lg font-semibold">{weather.data.totalRainfallMm} mm</dd>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <dt className="text-xs text-muted-foreground">Rainy days</dt>
                <dd className="text-lg font-semibold">{weather.data.rainyDays}</dd>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <dt className="text-xs text-muted-foreground">Average temperature</dt>
                <dd className="text-lg font-semibold">
                  {weather.data.avgTemperature === null
                    ? "—"
                    : `${weather.data.avgTemperature}°C`}
                </dd>
              </div>
            </dl>
          )}

          <ReportTable
            rows={weather.data?.rows}
            columns={weatherColumns}
            isLoading={weather.isLoading}
            caption="Weather recorded against diary entries"
            filename="weather-impact"
            rowKey={(r) => r.id}
            emptyTitle="No weather recorded in this range"
            emptyDescription="Weather is stamped on a diary entry when the service is configured."
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
