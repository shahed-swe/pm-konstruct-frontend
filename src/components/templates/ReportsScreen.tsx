"use client";

/**
 * The reports.
 *
 * Seven views over the same rows the rest of the product writes, sharing one
 * filter bar and one table. The legacy had a copy of both on every report
 * and they had drifted: two offered a supervisor filter and the others did
 * not, and one defaulted its range to a month.
 */
import { useState } from "react";
import { Badge } from "@/components/atoms/Badge";
import { PageHeader } from "@/components/molecules/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/molecules/Tabs";
import { DelayBadge } from "@/components/molecules/DelayBadge";
import { ReportFilterBar } from "@/components/organisms/ReportFilters";
import { ReportTable, type Column } from "@/components/organisms/ReportTable";
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

export function ReportsScreen() {
  const [filters, setFilters] = useState<ReportFilters>({});

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

      <Tabs defaultValue="progress">
        <TabsList className="mb-4 flex h-auto flex-wrap justify-start">
          <TabsTrigger value="progress">Job progress</TabsTrigger>
          <TabsTrigger value="delays">Delays</TabsTrigger>
          <TabsTrigger value="diary">Site diary</TabsTrigger>
          <TabsTrigger value="upcoming">What is coming up</TabsTrigger>
          <TabsTrigger value="claims">Stage claims</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="weather">Weather</TabsTrigger>
        </TabsList>

        <TabsContent value="progress">
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
