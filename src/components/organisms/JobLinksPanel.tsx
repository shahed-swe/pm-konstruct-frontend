"use client";

/**
 * Links to the job's files wherever the company actually keeps them.
 *
 * Named "cloud file links" rather than "Dropbox" on purpose: the column is
 * still `job_dropbox_folders`, but the client's requirement was "any cloud
 * based server. Google, Dropbox etc.", and several companies use Drive.
 *
 * `job.dropboxPath` is the single link this replaced. It is shown when set,
 * with a way to clear it, so nobody loses a link they saved years ago.
 */
import { ExternalLink, FolderOpen, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/molecules/Card";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/molecules/Dialog";
import { Field } from "@/components/molecules/Field";
import { useAddJobLink, useDeleteJobLink, useJobLinks, useUpdateJob } from "@/lib/api/resources/jobs";
import { useUiStore } from "@/stores/ui.store";

export function JobLinksPanel({
  jobId,
  legacyPath,
  editable,
}: {
  jobId: number;
  legacyPath: string | null;
  editable: boolean;
}) {
  const toast = useUiStore((s) => s.toast);
  const { data: links } = useJobLinks(jobId);
  const add = useAddJobLink(jobId);
  const remove = useDeleteJobLink(jobId);
  const updateJob = useUpdateJob(jobId);

  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [clearingLegacy, setClearingLegacy] = useState(false);

  function save() {
    const trimmed = url.trim();
    if (trimmed === "") {
      setError("Paste the link to the folder.");
      return;
    }
    setError(undefined);
    add.mutate(
      // "Cloud files" rather than rejecting a blank label: the label is for
      // people, and a missing one should not stop the link being saved.
      { label: label.trim() === "" ? "Cloud files" : label.trim(), url: trimmed, sortOrder: null },
      {
        onSuccess: () => {
          toast({ title: "Link added", variant: "success" });
          setAdding(false);
          setLabel("");
          setUrl("");
        },
        onError: () => setError("That link could not be saved. Check it is a full URL."),
      },
    );
  }

  return (
    <Card>
      <CardHeader className="border-b px-4 py-2.5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FolderOpen className="h-4 w-4 text-primary" aria-hidden="true" /> Cloud file links
          </CardTitle>
          {editable && (
            <Button variant="ghost" size="sm" className="h-7" onClick={() => setAdding(true)}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2 p-4">
        {legacyPath !== null && legacyPath !== "" && (
          <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Cloud files</p>
              <p className="truncate text-xs text-muted-foreground">{legacyPath}</p>
            </div>
            {legacyPath.startsWith("http") && (
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <a href={legacyPath} target="_blank" rel="noopener noreferrer" aria-label="Open the cloud folder">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            {editable && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Remove this link"
                onClick={() => setClearingLegacy(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}

        {(links ?? []).length === 0 && (legacyPath === null || legacyPath === "") ? (
          <p className="text-sm italic text-muted-foreground">
            No cloud folders linked to this job yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {(links ?? []).map((link) => (
              <li key={link.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{link.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{link.url}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <a
                    href={link.url}
                    target="_blank"
                    // `noreferrer` as well as `noopener`: these point at a
                    // company's own storage and the referrer would leak our
                    // URL, which contains the job id.
                    rel="noopener noreferrer"
                    aria-label={`Open ${link.label}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
                {editable && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={`Remove ${link.label}`}
                    onClick={() => setRemovingId(link.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a cloud file link</DialogTitle>
            <DialogDescription>
              Paste a shared folder link from Google Drive, Dropbox, OneDrive or anywhere else your
              company keeps files.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Label" hint="What the team will see, e.g. “Site photos”.">
              {(props) => (
                <Input {...props} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Cloud files" />
              )}
            </Field>
            <Field label="Link" required error={error}>
              {(props) => (
                <Input
                  {...props}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://drive.google.com/…"
                  inputMode="url"
                />
              )}
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={add.isPending}>
              Add link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {removingId !== null && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setRemovingId(null);
          }}
          title="Remove this link?"
          description="The folder itself is untouched — only the link from this job is removed."
          confirmLabel="Remove link"
          destructive
          onConfirm={() => {
            remove.mutate(removingId);
            setRemovingId(null);
          }}
        />
      )}

      {clearingLegacy && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setClearingLegacy(false);
          }}
          title="Remove the old cloud link?"
          description="This is the single link this job was set up with. Removing it leaves the links above."
          confirmLabel="Remove"
          destructive
          onConfirm={() => {
            updateJob.mutate(
              { dropboxPath: null },
              { onSuccess: () => toast({ title: "Old link removed", variant: "success" }) },
            );
            setClearingLegacy(false);
          }}
        />
      )}
    </Card>
  );
}
