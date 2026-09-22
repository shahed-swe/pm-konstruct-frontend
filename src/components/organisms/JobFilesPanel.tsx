"use client";

/**
 * The job's documents.
 *
 * Distinct from its photos, which live on the Photos screen: this is the
 * plans, the variation paperwork and the inspection drafts, and it is what
 * an office user goes looking for.
 *
 * Gated on `site-diary:write` rather than `jobs:write`, because on site it is
 * the supervisor writing the diary who has the paperwork in hand.
 */
import { FileText, Loader2, Paperclip, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/molecules/Card";
import { useJobFiles, useUploadMedia } from "@/lib/api/resources/media";
import { formatDate } from "@/lib/utils/format";
import { useUiStore } from "@/stores/ui.store";

/** Bytes as the size a person would say out loud. */
function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function JobFilesPanel({ jobId, editable }: { jobId: number; editable: boolean }) {
  const toast = useUiStore((s) => s.toast);
  const { data: files, isLoading } = useJobFiles(jobId);
  const upload = useUploadMedia({ kind: "job", jobId });
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? []);
    if (chosen.length === 0) return;
    upload.mutate(
      {
        files: chosen,
        onProgress: (done, total) => setProgress({ done, total }),
      },
      {
        onSuccess: (saved) => {
          toast({
            title: saved.length === 1 ? "File uploaded" : `${saved.length} files uploaded`,
            variant: "success",
          });
          setProgress(null);
        },
        onError: (cause) => {
          toast({
            title: "The upload did not finish",
            description: cause instanceof Error ? cause.message : undefined,
            variant: "destructive",
          });
          setProgress(null);
        },
      },
    );
    // Cleared so picking the same file again still fires a change event.
    event.target.value = "";
  }

  return (
    <Card>
      <CardHeader className="border-b px-4 py-2.5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Paperclip className="h-4 w-4 text-primary" aria-hidden="true" /> Files
          </CardTitle>
          {editable && (
            <>
              <input
                ref={input}
                type="file"
                multiple
                className="sr-only"
                onChange={onPick}
                aria-label="Choose files to upload"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                disabled={upload.isPending}
                onClick={() => input.current?.click()}
              >
                {upload.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                Upload
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0" aria-busy={isLoading}>
        {progress !== null && (
          <p role="status" aria-live="polite" className="border-b px-4 py-2 text-xs text-muted-foreground">
            Uploaded {progress.done} of {progress.total}…
          </p>
        )}

        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-4/5" />
          </div>
        ) : (files ?? []).length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No files on this job yet.
          </p>
        ) : (
          <ul className="divide-y">
            {(files ?? []).map((file) => (
              <li key={`${file.storedName}-${file.id}`} className="flex items-center gap-3 px-4 py-2.5">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-medium hover:text-primary"
                  >
                    {file.originalName}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {fileSize(file.fileSize)}
                    {file.uploaderName !== null && ` · ${file.uploaderName}`} ·{" "}
                    {formatDate(file.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
