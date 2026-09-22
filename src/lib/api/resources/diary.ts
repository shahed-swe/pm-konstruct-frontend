"use client";

/**
 * Site diary entries, their notes and the comments on them.
 *
 * The diary is the heart of the product: a supervisor writes one entry per
 * site per day, and everything else -- ETOs, inspections, the action list on
 * the dashboard -- hangs off a note inside one.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { keys } from "@/lib/query/keys";
import type {
  CommentRequest,
  DiaryCommentDto,
  DiaryEntryDto,
  DiaryEntryRequest,
  DiaryNoteDto,
  DiaryNoteRequest,
  EmailEntryRequest,
  EmailSentDto,
  EtoListItemDto,
  WeatherSnapshotDto,
} from "@/lib/api/types";

export interface DiaryFilters {
  jobId?: number;
  from?: string;
  to?: string;
  actionStatus?: string;
  includeArchived?: boolean;
}

function diaryPath(filters: DiaryFilters): string {
  const params = new URLSearchParams();
  if (filters.jobId !== undefined) params.set("jobId", String(filters.jobId));
  if (filters.from !== undefined && filters.from !== "") params.set("from", filters.from);
  if (filters.to !== undefined && filters.to !== "") params.set("to", filters.to);
  if (filters.actionStatus !== undefined && filters.actionStatus !== "")
    params.set("actionStatus", filters.actionStatus);
  if (filters.includeArchived === true) params.set("includeArchived", "true");
  const query = params.toString();
  return query === "" ? "/site-diary" : `/site-diary?${query}`;
}

export function useDiaryEntries(filters: DiaryFilters = {}) {
  return useQuery({
    queryKey: keys.diary.list(filters as Record<string, unknown>),
    queryFn: ({ signal }) => api.get<DiaryEntryDto[]>(diaryPath(filters), signal),
  });
}

export function useDiaryEntry(id: number, enabled = true) {
  return useQuery({
    queryKey: keys.diary.detail(id),
    queryFn: ({ signal }) => api.get<DiaryEntryDto>(`/site-diary/${id}`, signal),
    enabled: enabled && Number.isFinite(id),
  });
}

export function useCreateDiaryEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<DiaryEntryRequest>) => api.post<DiaryEntryDto>("/site-diary", body),
    onSuccess: (entry) => {
      void client.invalidateQueries({ queryKey: keys.diary.all });
      // The dashboard counts diary entries, and the job detail shows the
      // week's. Both go stale the moment one is written.
      void client.invalidateQueries({ queryKey: keys.dashboard.all });
      client.setQueryData(keys.diary.detail(entry.id), entry);
    },
  });
}

export function useUpdateDiaryEntry(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<DiaryEntryRequest>) =>
      api.put<DiaryEntryDto>(`/site-diary/${id}`, body),
    onSuccess: (entry) => {
      client.setQueryData(keys.diary.detail(id), entry);
      void client.invalidateQueries({ queryKey: keys.diary.all });
      void client.invalidateQueries({ queryKey: keys.dashboard.all });
    },
  });
}

export function useDeleteDiaryEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/site-diary/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.diary.all });
      void client.invalidateQueries({ queryKey: keys.dashboard.all });
    },
  });
}

export function useSetEntryActionStatus(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (actionStatus: string | null) =>
      api.patch<DiaryEntryDto>(`/site-diary/${id}/action-status`, { actionStatus }),
    onSuccess: (entry) => {
      client.setQueryData(keys.diary.detail(id), entry);
      void client.invalidateQueries({ queryKey: keys.diary.all });
      void client.invalidateQueries({ queryKey: keys.dashboard.all });
    },
  });
}

export function useDiaryNotes(entryId: number, includeArchived = false) {
  return useQuery({
    queryKey: [...keys.diary.notes(entryId), { includeArchived }],
    queryFn: ({ signal }) =>
      api.get<DiaryNoteDto[]>(
        `/site-diary/${entryId}/notes${includeArchived ? "?includeArchived=true" : ""}`,
        signal,
      ),
    enabled: Number.isFinite(entryId),
  });
}

function invalidateNotes(client: ReturnType<typeof useQueryClient>, entryId: number) {
  void client.invalidateQueries({ queryKey: keys.diary.notes(entryId) });
  // A note carries the action status the dashboard's action list reads.
  void client.invalidateQueries({ queryKey: keys.dashboard.all });
}

/**
 * Adds a note outside a hook.
 *
 * The new-entry screen only learns the entry id while it is saving, and a
 * hook cannot be called at that point. Nothing is invalidated because the
 * page navigates to the new entry, which fetches everything fresh.
 */
export function createDiaryNote(entryId: number, body: DiaryNoteRequest): Promise<DiaryNoteDto> {
  return api.post<DiaryNoteDto>(`/site-diary/${entryId}/notes`, body);
}

export function useAddDiaryNote(entryId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: DiaryNoteRequest) =>
      api.post<DiaryNoteDto>(`/site-diary/${entryId}/notes`, body),
    onSuccess: () => invalidateNotes(client, entryId),
  });
}

export function useUpdateDiaryNote(entryId: number) {
  const client = useQueryClient();
  return useMutation({
    // PATCH, not PUT: a note edit sends only what changed, and the API
    // treats an absent field as "leave it alone".
    mutationFn: ({ noteId, ...body }: Partial<DiaryNoteRequest> & { noteId: number }) =>
      api.patch<DiaryNoteDto>(`/site-diary/${entryId}/notes/${noteId}`, body),
    onSuccess: () => invalidateNotes(client, entryId),
  });
}

export function useDeleteDiaryNote(entryId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (noteId: number) => api.delete<void>(`/site-diary/${entryId}/notes/${noteId}`),
    onSuccess: () => invalidateNotes(client, entryId),
  });
}

/** A note's own action status, which is what the dashboard's action list reads. */
export function useSetNoteActionStatus(entryId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, actionStatus }: { noteId: number; actionStatus: string | null }) =>
      api.patch<DiaryNoteDto>(`/site-diary/${entryId}/notes/${noteId}/action-status`, {
        actionStatus,
      }),
    onSuccess: () => invalidateNotes(client, entryId),
  });
}

export function useArchiveDiaryNote(entryId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, archived }: { noteId: number; archived: boolean }) =>
      api.patch<DiaryNoteDto>(
        `/site-diary/${entryId}/notes/${noteId}/${archived ? "archive" : "unarchive"}`,
      ),
    onSuccess: () => invalidateNotes(client, entryId),
  });
}

/** Comments are addressed through their entry, which is what carries the tenant check. */
function commentsKey(entryId: number, noteId: number) {
  return [...keys.diary.notes(entryId), noteId, "comments"] as const;
}

export function useNoteComments(entryId: number, noteId: number, enabled = true) {
  return useQuery({
    queryKey: commentsKey(entryId, noteId),
    queryFn: ({ signal }) =>
      api.get<DiaryCommentDto[]>(`/site-diary/${entryId}/notes/${noteId}/comments`, signal),
    enabled: enabled && Number.isFinite(noteId),
  });
}

export function useAddNoteComment(entryId: number, noteId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CommentRequest) =>
      api.post<DiaryCommentDto>(`/site-diary/${entryId}/notes/${noteId}/comments`, body),
    onSuccess: () => void client.invalidateQueries({ queryKey: commentsKey(entryId, noteId) }),
  });
}

export function useWeatherSnapshot(entryId: number, enabled = true) {
  return useQuery({
    queryKey: keys.diary.weather(entryId),
    queryFn: ({ signal }) =>
      api.get<WeatherSnapshotDto | null>(`/site-diary/${entryId}/weather-snapshot`, signal),
    enabled: enabled && Number.isFinite(entryId),
  });
}

export function useEmailDiaryEntry(entryId: number) {
  return useMutation({
    mutationFn: (body: EmailEntryRequest) =>
      api.post<EmailSentDto>(`/site-diary/${entryId}/email`, body),
  });
}

/** The approved ETOs raised against a job, for its detail page. */
export function useJobEtos(jobId: number, enabled = true) {
  return useQuery({
    queryKey: keys.jobs.etos(jobId),
    queryFn: ({ signal }) => api.get<EtoListItemDto[]>(`/site-diary/job/${jobId}/etos`, signal),
    enabled: enabled && Number.isFinite(jobId),
  });
}
