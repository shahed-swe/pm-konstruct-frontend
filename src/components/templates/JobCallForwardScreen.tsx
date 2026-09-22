"use client";

/**
 * One job's programme, with the templates that fill it.
 *
 * A template is captured from a job that already ran, never authored by hand
 * -- so it always reflects a programme that really worked. Applying one adds
 * to what is there; replacing clears it first, which is destructive enough
 * to ask twice.
 */
import { FileSpreadsheet, FileStack, GanttChartSquare, Loader2, Printer, Save, Table2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/molecules/Tabs";
import { CallForwardBoard } from "@/components/organisms/CallForwardBoard";
import { GanttChart } from "@/components/organisms/GanttChart";
import { useCalendar } from "@/lib/api/resources/dashboard";
import {
  buildTree,
  flattenTree,
  useApplyTemplate,
  useCallForwardItems,
  useCallForwardTemplates,
  useCreateTemplate,
} from "@/lib/api/resources/callForward";
import { downloadXlsx } from "@/lib/reports/xlsx";
import { formatDate } from "@/lib/utils/format";
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

/** The job's programme as a timeline, the same chart the dashboard draws. */
function ProgrammeTimeline({ jobId }: { jobId: number }) {
  const { data, isLoading } = useCalendar({ gantt: true, jobId });
  return (
    <div className="rounded-xl border bg-card p-4">
      <GanttChart events={data} isLoading={isLoading} />
    </div>
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

  const { data: items } = useCallForwardItems({ jobId });
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [exporting, setExporting] = useState(false);

  /**
   * The programme as a spreadsheet.
   *
   * Flattened in the order the board draws it, with the depth as an indent
   * in the title -- a spreadsheet has no tree, and losing the structure
   * entirely makes the export hard to read against the screen.
   */
  async function exportXlsx() {
    setExporting(true);
    try {
      const rows = flattenTree(buildTree(items ?? [])).map((node) => [
        `${"    ".repeat(node.depth)}${node.title}`,
        node.itemType === "HEADER" ? "Stage" : node.itemType === "STAGE_CLAIM" ? "Stage claim" : "Task",
        node.supplierTrade ?? "",
        formatDate(node.estStart, ""),
        formatDate(node.estFinish, ""),
        formatDate(node.actualStart, ""),
        formatDate(node.actualFinish, ""),
        node.status.replace(/_/g, " "),
        node.delayStatus === "delayed" ? `${node.delayDays ?? 0} days late` : node.delayStatus.replace(/_/g, " "),
      ]);

      await downloadXlsx(
        `call-forward-${job?.jobNumber ?? jobId}`,
        "Call forward",
        [
          { header: "Item", width: 42 },
          { header: "Type" },
          { header: "Trade" },
          { header: "Est. start" },
          { header: "Est. finish" },
          { header: "Actual start" },
          { header: "Actual finish" },
          { header: "Status" },
          { header: "Tracking" },
        ],
        rows,
      );
    } catch {
      toast({ title: "The spreadsheet could not be produced", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

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
            <>
              <Button variant="outline" className="print:hidden" onClick={() => window.print()}>
                <Printer className="h-4 w-4" aria-hidden="true" /> Print
              </Button>
              <Button
                variant="outline"
                className="print:hidden"
                disabled={exporting}
                onClick={() => void exportXlsx()}
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                )}
                Excel
              </Button>
              {editable && (
                <Button variant="outline" className="print:hidden" onClick={() => setSaving(true)}>
                  <Save className="h-4 w-4" aria-hidden="true" /> Save as template
                </Button>
              )}
            </>
          }
        />
      )}

      <Tabs defaultValue="board">
        <TabsList className="mb-3 print:hidden">
          <TabsTrigger value="board">
            <Table2 className="h-3.5 w-3.5" aria-hidden="true" /> Programme
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <GanttChartSquare className="h-3.5 w-3.5" aria-hidden="true" /> Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          <CallForwardBoard jobId={jobId} editable={editable} />
        </TabsContent>

        <TabsContent value="timeline">
          <ProgrammeTimeline jobId={jobId} />
        </TabsContent>
      </Tabs>

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
