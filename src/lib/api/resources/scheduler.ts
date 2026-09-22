"use client";

/**
 * The trade scheduler: who is on which site, day by day.
 *
 * The board comes back in one call rather than the legacy's
 * per-worker-per-day fan-out -- both faster and free of the tearing that
 * produced, where half the grid showed one moment and half another.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { keys } from "@/lib/query/keys";
import type {
  AbsenceDto,
  AbsenceRequest,
  AllocationDto,
  AllocationRequest,
  BoardDto,
  DayNoteDto,
  DayNoteRequest,
  JobDto,
  MaintenanceJobDto,
  MaintenanceJobRequest,
  WorkerDto,
  WorkerRequest,
} from "@/lib/api/types";

export function useBoard(from: string, to: string) {
  return useQuery({
    queryKey: keys.scheduler.allocations(`${from}..${to}`),
    queryFn: ({ signal }) => api.get<BoardDto>(`/scheduler/board?from=${from}&to=${to}`, signal),
    enabled: from !== "" && to !== "",
  });
}

export function useWorkers(includeInactive = false) {
  return useQuery({
    queryKey: [...keys.scheduler.workers(), { includeInactive }],
    queryFn: ({ signal }) =>
      api.get<WorkerDto[]>(
        `/scheduler/workers${includeInactive ? "?includeInactive=true" : ""}`,
        signal,
      ),
  });
}

/** The jobs the board can allocate against, which includes archived ones. */
export function useSchedulableJobs() {
  return useQuery({
    queryKey: [...keys.scheduler.all, "jobs"],
    queryFn: ({ signal }) => api.get<JobDto[]>("/scheduler/jobs", signal),
  });
}

export function useMaintenanceJobs() {
  return useQuery({
    queryKey: [...keys.scheduler.all, "maintenance-jobs"],
    queryFn: ({ signal }) => api.get<MaintenanceJobDto[]>("/scheduler/maintenance-jobs", signal),
  });
}

function invalidateBoard(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: keys.scheduler.all });
}

export function useCreateWorker() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: WorkerRequest) => api.post<WorkerDto>("/scheduler/workers", body),
    onSuccess: () => invalidateBoard(client),
  });
}

export function useUpdateWorker() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: WorkerRequest & { id: number }) =>
      api.put<WorkerDto>(`/scheduler/workers/${id}`, body),
    onSuccess: () => invalidateBoard(client),
  });
}

/**
 * Takes a worker off the board without losing what they have already done.
 *
 * Deactivating, not deleting: their past allocations are the record of who
 * was on site. `purgeWorker` is the manager's escape hatch for someone added
 * by mistake.
 */
export function useDeactivateWorker() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/scheduler/workers/${id}`),
    onSuccess: () => invalidateBoard(client),
  });
}

export function usePurgeWorker() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/scheduler/workers/${id}/permanent`),
    onSuccess: () => invalidateBoard(client),
  });
}

export function useCreateAllocation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: AllocationRequest) =>
      api.post<AllocationDto>("/scheduler/allocations", body),
    onSuccess: () => invalidateBoard(client),
  });
}

export function useUpdateAllocation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: AllocationRequest & { id: number }) =>
      api.put<AllocationDto>(`/scheduler/allocations/${id}`, body),
    onSuccess: () => invalidateBoard(client),
  });
}

export function useDeleteAllocation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/scheduler/allocations/${id}`),
    onSuccess: () => invalidateBoard(client),
  });
}

export function useCreateAbsence() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: AbsenceRequest) => api.post<AbsenceDto>("/scheduler/worker-absences", body),
    onSuccess: () => invalidateBoard(client),
  });
}

export function useDeleteAbsence() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/scheduler/worker-absences/${id}`),
    onSuccess: () => invalidateBoard(client),
  });
}

export function useCreateMaintenanceJob() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: MaintenanceJobRequest) =>
      api.post<MaintenanceJobDto>("/scheduler/maintenance-jobs", body),
    onSuccess: () => invalidateBoard(client),
  });
}

/** One note per job per day; posting again replaces it. */
export function useSetDayNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: DayNoteRequest) => api.post<DayNoteDto>("/scheduler/job-day-notes", body),
    onSuccess: () => invalidateBoard(client),
  });
}

export function useDeleteDayNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/scheduler/job-day-notes/${id}`),
    onSuccess: () => invalidateBoard(client),
  });
}
