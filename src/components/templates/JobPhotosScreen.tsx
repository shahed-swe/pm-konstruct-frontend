"use client";

/**
 * Every photo on a job, from its diary entries and from the job itself.
 *
 * Two sources with independent id sequences, so a selection has to carry
 * which table each id came from -- that is what `source` on the bulk delete
 * is for, and why an id alone is never enough.
 *
 * Office staff may only remove their own uploads. A photo of defective work
 * is evidence, and the office is not the party that decides it goes away;
 * the API enforces this too.
 */
import { Camera, CheckSquare, Loader2, Square, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/atoms/Button";
import { Skeleton } from "@/components/atoms/Skeleton";
import { BackLink } from "@/components/molecules/BackLink";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { EmptyState } from "@/components/molecules/EmptyState";
import { PageHeader } from "@/components/molecules/PageHeader";
import {
  useBulkDeleteMedia,
  useJobFiles,
  useMedia,
  useUploadMedia,
} from "@/lib/api/resources/media";
import { useJob } from "@/lib/api/resources/jobs";
import { canEdit } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth.store";
import { useUiStore } from "@/stores/ui.store";
import type { MediaDto, MediaSelectionRequest } from "@/lib/api/types";

/** `job:12` — a key that survives mixing the two sources. */
function keyOf(media: MediaDto): string {
  return `${media.jobId === null ? "diary" : "job"}:${media.id}`;
}

function selectionOf(key: string): MediaSelectionRequest | null {
  const [source, raw] = key.split(":");
  const id = Number.parseInt(raw ?? "", 10);
  if ((source !== "job" && source !== "diary") || !Number.isFinite(id)) return null;
  return { source, id };
}

export function JobPhotosScreen({ jobId }: { jobId: number }) {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const toast = useUiStore((s) => s.toast);
  const mayEdit = canEdit(user, permissions, "site-diary");

  const { data: job } = useJob(jobId);
  const { data: media, isLoading } = useMedia({ kind: "job", jobId });
  const { data: files } = useJobFiles(jobId);
  const upload = useUploadMedia({ kind: "job", jobId });
  const bulkDelete = useBulkDeleteMedia(jobId);

  const input = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const photos = useMemo(
    () => (media ?? []).filter((m) => m.mimeType.startsWith("image/")),
    [media],
  );

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <>
      <BackLink href={`/jobs/${jobId}`} label="Back to the job" />

      <PageHeader
        title="Photos"
        description={
          job === undefined ? undefined : `${job.address === "" ? job.name : job.address}`
        }
        actions={
          mayEdit ? (
            <>
              <input
                ref={input}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                aria-label="Choose photos to upload"
                onChange={(e) => {
                  const chosen = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  if (chosen.length === 0) return;
                  upload.mutate(
                    { files: chosen, onProgress: (done, total) => setProgress({ done, total }) },
                    {
                      onSuccess: (saved) => {
                        toast({
                          title:
                            saved.length === 1
                              ? "Photo uploaded"
                              : `${saved.length} photos uploaded`,
                          variant: "success",
                        });
                        setProgress(null);
                      },
                      onError: (cause) => {
                        toast({
                          title: "The upload did not finish",
                          description: cause instanceof ApiError ? cause.message : undefined,
                          variant: "destructive",
                        });
                        setProgress(null);
                      },
                    },
                  );
                }}
              />
              <Button disabled={upload.isPending} onClick={() => input.current?.click()}>
                {upload.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="h-4 w-4" aria-hidden="true" />
                )}
                Upload photos
              </Button>
            </>
          ) : undefined
        }
      />

      {progress !== null && (
        <p role="status" aria-live="polite" className="mb-4 text-sm text-muted-foreground">
          Uploaded {progress.done} of {progress.total}…
        </p>
      )}

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
          <span className="text-sm">
            {selected.size} {selected.size === 1 ? "photo" : "photos"} selected
          </span>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setConfirming(true)}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete selected
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" aria-busy="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <EmptyState
          icon={<Camera className="h-10 w-10" />}
          title="No photos on this job yet"
          description={
            mayEdit
              ? "Photos taken on site, and any attached to a diary entry, appear here."
              : "Nothing has been photographed on this site yet."
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => {
            const key = keyOf(photo);
            const isSelected = selected.has(key);

            return (
              <li key={key} className="group relative">
                <a
                  href={photo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "block aspect-square overflow-hidden rounded-lg border bg-muted",
                    isSelected && "ring-2 ring-primary",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.originalName}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </a>

                {mayEdit && (
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`Select ${photo.originalName}`}
                    onClick={() => toggle(key)}
                    className="absolute left-2 top-2 rounded-md bg-background/90 p-1 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 aria-pressed:opacity-100"
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                )}

                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  {photo.diaryEntryId !== null ? "From the diary · " : ""}
                  {formatDate(photo.createdAt)}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {(files ?? []).length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Documents
          </h2>
          <ul className="divide-y rounded-xl border bg-card">
            {(files ?? []).map((file) => (
              <li key={`${file.storedName}-${file.id}`} className="px-4 py-2.5">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:text-primary"
                >
                  {file.originalName}
                </a>
                <p className="text-xs text-muted-foreground">
                  {file.uploaderName ?? "Unknown"} · {formatDate(file.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {confirming && (
        <ConfirmDialog
          open
          onOpenChange={setConfirming}
          title={`Delete ${selected.size} ${selected.size === 1 ? "photo" : "photos"}?`}
          // Says it is all-or-nothing, because that is what the API does and
          // a partial delete would be worse to explain afterwards.
          description="They are removed from the job and from any diary entry they were attached to. If one of them cannot be deleted, none of them are."
          confirmLabel="Delete them"
          destructive
          onConfirm={() => {
            const selections = [...selected]
              .map(selectionOf)
              .filter((s): s is MediaSelectionRequest => s !== null);

            bulkDelete.mutate(selections, {
              onSuccess: (result) => {
                toast({
                  title: `${result.deleted} deleted`,
                  description: result.cleanupPending
                    ? "The files are being removed from storage."
                    : undefined,
                  variant: "success",
                });
                setSelected(new Set());
              },
              onError: (cause) =>
                toast({
                  title: "Nothing was deleted",
                  description: cause instanceof ApiError ? cause.message : undefined,
                  variant: "destructive",
                }),
            });
            setConfirming(false);
          }}
        />
      )}
    </>
  );
}
