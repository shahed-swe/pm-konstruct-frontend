"use client";

/**
 * The dashboard's panels.
 *
 * Each is its own endpoint rather than one fat payload, which is what lets a
 * panel refresh on its own when something it shows changes -- marking a note
 * done updates the action list without re-fetching the calendar.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { keys } from "@/lib/query/keys";
import type {
  ActionItemDto,
  CalendarEventDto,
  CalendarFiltersDto,
  DashboardCallForwardDto,
  DashboardDiaryDto,
  DashboardJobDto,
  DashboardStatsDto,
  DelaySeverityDto,
  UpcomingClaimDto,
} from "@/lib/api/types";

export function useDashboardStats() {
  return useQuery({
    queryKey: keys.dashboard.stats(),
    queryFn: ({ signal }) => api.get<DashboardStatsDto>("/dashboard/stats", signal),
  });
}

export function useActionItems() {
  return useQuery({
    queryKey: keys.dashboard.actionItems(),
    queryFn: ({ signal }) => api.get<ActionItemDto[]>("/dashboard/action-items", signal),
  });
}

export function useUpcomingClaims() {
  return useQuery({
    queryKey: keys.dashboard.stageClaims(),
    queryFn: ({ signal }) => api.get<UpcomingClaimDto[]>("/dashboard/upcoming-claims", signal),
  });
}

export function useDelaySeverity() {
  return useQuery({
    queryKey: keys.dashboard.delays(),
    queryFn: ({ signal }) => api.get<DelaySeverityDto[]>("/dashboard/delay-severity", signal),
  });
}

/** The lists behind each stat, fetched only when one is opened. */
export function useDashboardList(
  kind: "jobs-list" | "active-jobs-list" | "completed-jobs-list",
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...keys.dashboard.all, kind],
    queryFn: ({ signal }) => api.get<DashboardJobDto[]>(`/dashboard/${kind}`, signal),
    enabled,
  });
}

export function useCallForwardList(kind: "open-cf-list" | "overdue-list", enabled: boolean) {
  return useQuery({
    queryKey: [...keys.dashboard.all, kind],
    queryFn: ({ signal }) => api.get<DashboardCallForwardDto[]>(`/dashboard/${kind}`, signal),
    enabled,
  });
}

export function useRecentDiaryList(enabled: boolean) {
  return useQuery({
    queryKey: [...keys.dashboard.all, "recent-diary-list"],
    queryFn: ({ signal }) => api.get<DashboardDiaryDto[]>("/dashboard/recent-diary-list", signal),
    enabled,
  });
}

export interface CalendarFilters {
  month?: string | undefined;
  jobId?: number | undefined;
  supervisorId?: number | undefined;
  type?: string | undefined;
  /**
   * The Gantt view spans everything rather than one month.
   *
   * The API's parameter is still called `gantt`, which is what the legacy
   * named it; it means "ignore the month".
   */
  gantt?: boolean | undefined;
}

export function useCalendar(filters: CalendarFilters) {
  const params = new URLSearchParams();
  if (filters.gantt === true) params.set("gantt", "true");
  else if (filters.month !== undefined) params.set("month", filters.month);
  if (filters.jobId !== undefined) params.set("jobId", String(filters.jobId));
  if (filters.supervisorId !== undefined) params.set("supervisorId", String(filters.supervisorId));
  if (filters.type !== undefined && filters.type !== "") params.set("type", filters.type);
  const query = params.toString();

  return useQuery({
    queryKey: keys.dashboard.calendar(query),
    queryFn: ({ signal }) =>
      api.get<CalendarEventDto[]>(`/dashboard/calendar${query === "" ? "" : `?${query}`}`, signal),
  });
}

export function useCalendarFilters() {
  return useQuery({
    queryKey: keys.dashboard.calendarFilters(),
    queryFn: ({ signal }) => api.get<CalendarFiltersDto>("/dashboard/calendar/filters", signal),
    // Jobs and supervisors do not change while somebody scrolls a calendar.
    staleTime: 10 * 60 * 1000,
  });
}
