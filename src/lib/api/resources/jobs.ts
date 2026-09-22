"use client";

/**
 * Jobs: the record every other feature hangs off.
 *
 * One module per resource, each holding its fetchers and its hooks, so a
 * screen imports `useJobs()` rather than assembling a query key, a path and
 * a response type at the call site. That assembly is where the legacy drifted
 * -- three different spellings of the jobs key meant an edited job stayed
 * stale in two places out of three.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { keys } from "@/lib/query/keys";
import type {
  AddAssignmentRequest,
  AssignmentDto,
  JobDto,
  JobLinkDto,
  JobLinkRequest,
  JobTaskDto,
  JobPatchRequest,
  JobTaskPatchRequest,
  JobTaskRequest,
  JobUpsertRequest,
} from "@/lib/api/types";

export interface JobFilters {
  status?: string;
  supervisorId?: number;
  search?: string;
}

function jobsPath(filters: JobFilters): string {
  const params = new URLSearchParams();
  if (filters.status !== undefined && filters.status !== "") params.set("status", filters.status);
  if (filters.supervisorId !== undefined) params.set("supervisorId", String(filters.supervisorId));
  if (filters.search !== undefined && filters.search !== "") params.set("search", filters.search);
  const query = params.toString();
  return query === "" ? "/jobs" : `/jobs?${query}`;
}

export function useJobs(filters: JobFilters = {}) {
  return useQuery({
    queryKey: keys.jobs.list(filters as Record<string, unknown>),
    queryFn: ({ signal }) => api.get<JobDto[]>(jobsPath(filters), signal),
  });
}

export function useJob(id: number, enabled = true) {
  return useQuery({
    queryKey: keys.jobs.detail(id),
    queryFn: ({ signal }) => api.get<JobDto>(`/jobs/${id}`, signal),
    enabled: enabled && Number.isFinite(id),
  });
}

export function useCreateJob() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: JobUpsertRequest) => api.post<JobDto>("/jobs", body),
    onSuccess: (job) => {
      // The whole area, not one list: a new job belongs in every filtered
      // view whose filter it matches, and we do not know which those are.
      void client.invalidateQueries({ queryKey: keys.jobs.all });
      client.setQueryData(keys.jobs.detail(job.id), job);
    },
  });
}

/**
 * Updates a job.
 *
 * The API merges whatever is sent onto what is stored, so this takes a patch
 * rather than the whole record. The edit form sends every field; the row
 * menu's archive sends `{ status }` and the notes panel `{ description }`.
 * Sending only what changed is what stops two people editing one job from
 * overwriting each other's untouched fields.
 */
export function useUpdateJob(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: JobPatchRequest) => api.put<JobDto>(`/jobs/${id}`, body),
    onSuccess: (job) => {
      client.setQueryData(keys.jobs.detail(id), job);
      void client.invalidateQueries({ queryKey: keys.jobs.all });
    },
  });
}

/**
 * Archives a job, or deletes it outright.
 *
 * The default archives, which is what the delete button on a job does. A
 * purge cascades to diary entries, media, call-forward items and scheduler
 * allocations, so it is opt-in and the UI asks twice.
 */
export function useDeleteJob() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, purge = false }: { id: number; purge?: boolean }) =>
      api.delete<void>(`/jobs/${id}${purge ? "?purge=true" : ""}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.jobs.all }),
  });
}

export function useJobAssignments(id: number) {
  return useQuery({
    queryKey: keys.jobs.assignments(id),
    queryFn: ({ signal }) => api.get<AssignmentDto[]>(`/jobs/${id}/assignments`, signal),
    enabled: Number.isFinite(id),
  });
}

export function useAddAssignment(jobId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: AddAssignmentRequest) =>
      api.post<AssignmentDto>(`/jobs/${jobId}/assignments`, body),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.jobs.assignments(jobId) }),
  });
}

export function useRemoveAssignment(jobId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => api.delete<void>(`/jobs/${jobId}/assignments/${userId}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.jobs.assignments(jobId) }),
  });
}

export function useSetPrimaryAssignment(jobId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) =>
      api.put<AssignmentDto>(`/jobs/${jobId}/assignments/${userId}/primary`),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.jobs.assignments(jobId) }),
  });
}

export function useJobTasks(jobId: number) {
  return useQuery({
    queryKey: keys.jobs.tasks(jobId),
    queryFn: ({ signal }) => api.get<JobTaskDto[]>(`/jobs/${jobId}/tasks`, signal),
    enabled: Number.isFinite(jobId),
  });
}

export function useCreateJobTask(jobId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: JobTaskRequest) => api.post<JobTaskDto>(`/jobs/${jobId}/tasks`, body),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.jobs.tasks(jobId) }),
  });
}

export function useUpdateJobTask(jobId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: JobTaskPatchRequest & { id: number }) =>
      api.put<JobTaskDto>(`/tasks/${id}`, body),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.jobs.tasks(jobId) }),
  });
}

export function useDeleteJobTask(jobId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/tasks/${id}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.jobs.tasks(jobId) }),
  });
}

export function useJobLinks(jobId: number) {
  return useQuery({
    queryKey: keys.jobs.links(jobId),
    queryFn: ({ signal }) => api.get<JobLinkDto[]>(`/jobs/${jobId}/links`, signal),
    enabled: Number.isFinite(jobId),
  });
}

export function useAddJobLink(jobId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: JobLinkRequest) => api.post<JobLinkDto>(`/jobs/${jobId}/links`, body),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.jobs.links(jobId) }),
  });
}

export function useDeleteJobLink(jobId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (linkId: number) => api.delete<void>(`/jobs/${jobId}/links/${linkId}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.jobs.links(jobId) }),
  });
}
