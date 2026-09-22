"use client";

/**
 * One job's programme, with the templates that fill it.
 *
 * A template is captured from a job that already ran, never authored by hand
 * -- so it always reflects a programme that really worked. Applying one adds
 * to what is there; replacing clears it first, which is destructive enough
 * to ask twice.
 */
import { FileStack, Loader2, Save } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Skeleton } from "@/components/atoms/Skeleton";
import { BackLink } from "@/components/molecules/BackLink";
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
import { PageHeader } from "@/components/molecules/PageHeader";
import { CallForwardBoard } from "@/components/organisms/CallForwardBoard";
import {
  useApplyTemplate,
  useCallForwardTemplates,
  useCreateTemplate,
} from "@/lib/api/resources/callForward";
import { useJob } from "@/lib/api/resources/jobs";
import { canEdit } from "@/lib/auth/permissions";
import { useAuthStore } from "@/stores/auth.store";
import { useUiStore } from "@/stores/ui.store";

function ApplyTemplateRow({
  templateId,
  name,
  itemCount,
  jobId,
  hasExisting,
}: {
  templateId: number;
  name: string;
  itemCount: number;
  jobId: number;
  hasExisting: boolean;
}) {
  const toast = useUiStore((s) => s.toast);
  const apply = useApplyTemplate(templateId);
  const [replacing, setReplacing] = useState(false);

  function run(replace: boolean) {
    apply.mutate(
      { jobId, replace },
      {
        onSuccess: (result) =>
          toast({
            title: `${result.applied} ${result.applied === 1 ? "item" : "items"} added`,
            variant: "success",
          }),
        onError: () => toast({ title: "The template was not applied", variant: "destructive" }),
      },
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </p>
      </div>
      <Button size="sm" variant="outline" disabled={apply.isPending} onClick={() => run(false)}>
        {apply.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
        Add to this job
      </Button>
      {hasExisting && (
        <Button size="sm" variant="ghost" onClick={() => setReplacing(true)}>
          Replace
        </Button>
      )}

      {replacing && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setReplacing(false);
          }}
          title={`Replace this job's programme with “${name}”?`}
          // Names what is lost, because "replace" alone does not say that the
          // dates already entered against the existing items go with it.
          description="Everything currently scheduled on this job is deleted first, including any actual dates already recorded against it."
          confirmLabel="Replace the programme"
          destructive
          onConfirm={() => {
            run(true);
            setReplacing(false);
          }}
        />
      )}
    </li>
  );
}

export function JobCallForwardScreen({ jobId }: { jobId: number }) {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const toast = useUiStore((s) => s.toast);
  const editable = canEdit(user, permissions, "call-forward");

  const { data: job, isLoading } = useJob(jobId);
  const { data: templates } = useCallForwardTemplates();
  const createTemplate = useCreateTemplate();

  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  function saveAsTemplate() {
    const name = templateName.trim();
    if (name === "") {
      setError("Give the template a name.");
      return;
    }
    setError(undefined);
    createTemplate.mutate(
      { name, jobId },
      {
        onSuccess: () => {
          toast({ title: "Template saved", variant: "success" });
          setSaving(false);
          setTemplateName("");
        },
        onError: (cause) =>
          setError(
            cause instanceof ApiError ? cause.message : "The template could not be saved.",
          ),
      },
    );
  }

  return (
    <>
      <BackLink href={`/jobs/${jobId}`} label="Back to the job" />

      {isLoading ? (
        <Skeleton className="mb-6 h-10 w-80" />
      ) : (
        <PageHeader
          title="Call forward"
          description={
            job === undefined
              ? undefined
              : `${job.address === "" ? job.name : job.address} · ${job.jobNumber}`
          }
          actions={
            editable ? (
              <Button variant="outline" onClick={() => setSaving(true)}>
                <Save className="h-4 w-4" aria-hidden="true" /> Save as template
              </Button>
            ) : undefined
          }
        />
      )}

      <CallForwardBoard jobId={jobId} editable={editable} />

      {editable && (templates ?? []).length > 0 && (
        <Card className="mt-6">
          <CardHeader className="border-b px-4 py-2.5">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileStack className="h-4 w-4 text-primary" aria-hidden="true" /> Templates
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul>
              {(templates ?? []).map((template) => (
                <ApplyTemplateRow
                  key={template.id}
                  templateId={template.id}
                  name={template.name}
                  itemCount={template.items.length}
                  jobId={jobId}
                  hasExisting
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog open={saving} onOpenChange={setSaving}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save this programme as a template</DialogTitle>
            <DialogDescription>
              Captures the stages and trades on this job, without their dates, so the same
              programme can be laid out on a new site.
            </DialogDescription>
          </DialogHeader>
          <Field label="Template name" required error={error}>
            {(props) => (
              <Input
                {...props}
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Standard double-storey"
              />
            )}
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaving(false)}>
              Cancel
            </Button>
            <Button onClick={saveAsTemplate} disabled={createTemplate.isPending}>
              Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
