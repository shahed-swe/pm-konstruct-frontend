"use client";

/**
 * Progress records: a percentage and a milestone against a date.
 *
 * Photos here are pasted URLs rather than uploads -- the column is `text[]`
 * and the legacy UI takes links. Left as it is, because changing it means
 * migrating whatever is already in there.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { keys } from "@/lib/query/keys";
import type { ProgressDto, ProgressPatchRequest, ProgressRequest } from "@/lib/api/types";

export function useProgress(jobId?: number) {
  return useQuery({
    queryKey: keys.progress.job(jobId ?? 0),
    queryFn: ({ signal }) =>
      api.get<ProgressDto[]>(
        jobId === undefined ? "/progress" : `/progress?jobId=${jobId}`,
        signal,
      ),
  });
}

export function useCreateProgress() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: ProgressRequest) => api.post<ProgressDto>("/progress", body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.progress.all });
      void client.invalidateQueries({ queryKey: keys.dashboard.all });
    },
  });
}

export function useUpdateProgress() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: ProgressPatchRequest & { id: number }) =>
      api.put<ProgressDto>(`/progress/${id}`, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.progress.all });
      void client.invalidateQueries({ queryKey: keys.dashboard.all });
    },
  });
}

export function useDeleteProgress() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/progress/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.progress.all });
      void client.invalidateQueries({ queryKey: keys.dashboard.all });
    },
  });
}
