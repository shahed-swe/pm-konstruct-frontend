"use client";

/**
 * Photos and documents.
 *
 * Uploads are a three-step dance and cannot be collapsed: the client asks
 * for a presigned URL, PUTs the bytes straight to object storage, then tells
 * the API the object exists. The bytes never pass through the API, which is
 * what makes a hundred site photos from a phone on 4G workable.
 *
 * `uploadFiles` below is the whole dance in one call, because getting the
 * order wrong leaves an object in the bucket with no row pointing at it.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { keys } from "@/lib/query/keys";
import type {
  BulkDeleteDto,
  DownloadUrlDto,
  JobFileDto,
  MediaDto,
  MediaSelectionRequest,
  PrepareUploadRequest,
  PreparedUploadDto,
} from "@/lib/api/types";

export type MediaOwner = { kind: "job"; jobId: number } | { kind: "diary"; entryId: number };

function ownerPath(owner: MediaOwner): string {
  return owner.kind === "job" ? `/jobs/${owner.jobId}/media` : `/site-diary/${owner.entryId}/media`;
}

function ownerKey(owner: MediaOwner) {
  return owner.kind === "job" ? keys.media.forJob(owner.jobId) : keys.media.forDiary(owner.entryId);
}

export function useMedia(owner: MediaOwner, enabled = true) {
  return useQuery({
    queryKey: ownerKey(owner),
    queryFn: ({ signal }) => api.get<MediaDto[]>(ownerPath(owner), signal),
    enabled,
  });
}

/** The Files tab on a job: documents and inspection drafts, not photos. */
export function useJobFiles(jobId: number, enabled = true) {
  return useQuery({
    queryKey: keys.jobs.files(jobId),
    queryFn: ({ signal }) => api.get<JobFileDto[]>(`/jobs/${jobId}/files`, signal),
    enabled: enabled && Number.isFinite(jobId),
  });
}

/**
 * Uploads files and returns what was stored.
 *
 * Each file is confirmed individually as soon as its bytes land, rather than
 * all of them at the end: a supervisor who loses signal half way through a
 * batch keeps the photos that made it, instead of losing all twenty.
 */
async function uploadFiles(
  owner: MediaOwner,
  files: File[],
  noteId: number | null,
  onProgress?: (done: number, total: number) => void,
): Promise<MediaDto[]> {
  const base = ownerPath(owner);

  const request: PrepareUploadRequest = {
    noteId,
    files: files.map((f) => ({
      fileName: f.name,
      mimeType: f.type === "" ? "application/octet-stream" : f.type,
      sizeBytes: f.size,
    })),
  };

  const prepared = await api.post<PreparedUploadDto[]>(`${base}/prepare`, request);
  const saved: MediaDto[] = [];

  for (const [index, plan] of prepared.entries()) {
    const file = files[index];
    if (file === undefined) continue;

    // Straight to object storage, so this one is not the shared client: it
    // is a different origin and must not carry our cookies.
    const response = await fetch(plan.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": plan.mimeType },
      credentials: "omit",
    });
    if (!response.ok) {
      throw new Error(`${file.name} could not be uploaded.`);
    }

    saved.push(
      await api.post<MediaDto>(`${base}/confirm`, {
        noteId,
        storedName: plan.storedName,
        originalName: plan.originalName,
        mimeType: plan.mimeType,
      }),
    );
    onProgress?.(saved.length, prepared.length);
  }

  return saved;
}

export function useUploadMedia(owner: MediaOwner) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      files,
      noteId = null,
      onProgress,
    }: {
      files: File[];
      noteId?: number | null;
      onProgress?: (done: number, total: number) => void;
    }) => uploadFiles(owner, files, noteId, onProgress),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ownerKey(owner) });
      if (owner.kind === "job") {
        void client.invalidateQueries({ queryKey: keys.jobs.files(owner.jobId) });
      }
    },
  });
}

/**
 * A short-lived link to the object itself.
 *
 * Not cached for long: the URL expires, and a cached one would start
 * returning 403 while the page still showed it as an image.
 */
export function useDownloadUrl(id: number, jobMedia: boolean, enabled = true) {
  return useQuery({
    queryKey: [...keys.media.all, "url", id, jobMedia],
    queryFn: ({ signal }) =>
      api.get<DownloadUrlDto>(`/media/${id}/url${jobMedia ? "?jobMedia=true" : ""}`, signal),
    enabled: enabled && Number.isFinite(id),
    staleTime: 60_000,
  });
}

export function useDeleteMedia(owner: MediaOwner) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, jobMedia }: { id: number; jobMedia: boolean }) =>
      api.delete<void>(`/media/${id}${jobMedia ? "?jobMedia=true" : ""}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ownerKey(owner) });
      if (owner.kind === "job") {
        void client.invalidateQueries({ queryKey: keys.jobs.files(owner.jobId) });
      }
    },
  });
}

/** Deleting a selection from a job's gallery, which mixes both sources. */
export function useBulkDeleteMedia(jobId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (media: MediaSelectionRequest[]) =>
      api.delete<BulkDeleteDto>(`/jobs/${jobId}/media`, { media }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.media.forJob(jobId) });
      void client.invalidateQueries({ queryKey: keys.jobs.files(jobId) });
    },
  });
}
