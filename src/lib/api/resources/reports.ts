"use client";

/**
 * The reports.
 *
 * Eight of them, each a read-only view over the same rows the rest of the
 * product writes. All take the same filter shape -- job, supervisor, author,
 * a date range and a status -- so one builder serves them all.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { keys } from "@/lib/query/keys";
import type {
  DailyProgressDto,
  DelayDto,
  DiaryReportDto,
  InspectionDto,
  JobProgressDto,
  ReportMetaDto,
  StageClaimDto,
  SupervisorPerformanceDto,
  UpcomingTaskDto,
  WeatherImpactDto,
} from "@/lib/api/types";

export interface ReportFilters {
  jobId?: number | undefined;
  supervisorId?: number | undefined;
  authorId?: number | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  status?: string | undefined;
}

function query(filters: ReportFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const q = params.toString();
  return q === "" ? "" : `?${q}`;
}

/** The jobs and supervisors the filters offer, scoped to what the caller sees. */
export function useReportMeta() {
  return useQuery({
    queryKey: [...keys.reports.all, "meta"],
    queryFn: ({ signal }) => api.get<ReportMetaDto>("/reports/meta", signal),
  });
}

/**
 * Builds one report's hook.
 *
 * Seven reports differing only in their path and their row type; writing
 * each out would be seven chances to spell a query key differently, which is
 * how the legacy ended up with reports that never refreshed.
 */
function report<T>(name: string, path: string) {
  return (filters: ReportFilters = {}, enabled = true) =>
    useQuery({
      queryKey: keys.reports.run(name, filters as Record<string, unknown>),
      queryFn: ({ signal }) => api.get<T>(`${path}${query(filters)}`, signal),
      enabled,
    });
}

export const useJobProgressReport = report<JobProgressDto[]>(
  "job-progress",
  "/reports/job-progress",
);
export const useDelaysReport = report<DelayDto[]>("delays", "/reports/delays");
export const useDiarySummaryReport = report<DiaryReportDto[]>(
  "site-diary-summary",
  "/reports/site-diary-summary",
);
export const useUpcomingTasksReport = report<UpcomingTaskDto[]>(
  "upcoming-tasks",
  "/reports/upcoming-tasks",
);
export const useStageClaimsReport = report<StageClaimDto[]>(
  "stage-claims",
  "/reports/stage-claims",
);
export const useInspectionsReport = report<InspectionDto[]>(
  "inspections",
  "/reports/inspections",
);
export const useWeatherImpactReport = report<WeatherImpactDto>(
  "weather-impact",
  "/reports/weather-impact",
);

/** The daily progress report needs a specific job and day, not a range. */
export function useDailyProgressReport(jobId: number | undefined, date: string, enabled = true) {
  return useQuery({
    queryKey: keys.reports.run("daily-progress", { jobId, date }),
    queryFn: ({ signal }) =>
      api.get<DailyProgressDto>(`/reports/daily-progress?jobId=${jobId}&date=${date}`, signal),
    enabled: enabled && jobId !== undefined && date !== "",
  });
}

export function useSupervisorPerformance(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: keys.reports.run("supervisor-performance", filters as Record<string, unknown>),
    queryFn: ({ signal }) =>
      // Mounted outside `/reports`, as the legacy kept it: it grades named
      // people, and it is manager-only for that reason.
      api.get<SupervisorPerformanceDto[]>(`/supervisor-performance${query(filters)}`, signal),
  });
}
