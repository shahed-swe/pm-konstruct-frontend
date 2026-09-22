"use client";

/**
 * A site inspection: a walk through a house, room by room, logging defects.
 *
 * The draft lives on the server from the moment a job is chosen, because an
 * inspection takes an hour and a phone dies. Saving sends the revision the
 * client last read; a save built on a stale one is rejected rather than
 * quietly wiping the other inspector's work.
 *
 * Photos attach to an item, not to the form, because "the crack in the
 * ensuite" is one line with two pictures.
 */
import { Camera, FileDown, Loader2, Mail, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/atoms/Button";
import { Checkbox } from "@/components/atoms/Checkbox";
import { Input } from "@/components/atoms/Input";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Textarea } from "@/components/atoms/Textarea";
import { BackLink } from "@/components/molecules/BackLink";
import { Card, CardContent } from "@/components/molecules/Card";
import { Field } from "@/components/molecules/Field";
import { PageHeader } from "@/components/molecules/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/Select";
import {
  uploadInspectionPhotos,
  useEmailForm,
  useInspectionDraft,
  useSaveInspection,
} from "@/lib/api/resources/forms";
import { useJobs } from "@/lib/api/resources/jobs";
import { useJobLabel } from "@/lib/jobs/useJobLabel";
import { EmailDialog } from "@/components/organisms/DiaryEmailDialog";
import { buildPdf, shareOrDownload } from "@/lib/reports/pdf";
import { formatDate } from "@/lib/utils/format";
import { useAuthStore } from "@/stores/auth.store";
import { useBrandingStore } from "@/stores/branding.store";
import { useUiStore } from "@/stores/ui.store";
import type { InspectionFormDto } from "@/lib/api/types";

const INSPECTION_TYPES = [
  "General inspection",
  "Structural",
  "Electrical",
  "Plumbing",
  "Defects / handover",
  "Pre-handover",
  "Slab stage",
  "Frame stage",
  "Lock-up stage",
  "Fix stage",
] as const;

interface DraftItem {
  /** Stable across saves, so the server can match an item to its photos. */
  clientKey: string;
  room: string;
  description: string;
  actioned: boolean;
  /** Photos picked but not yet uploaded. */
  pending: File[];
}

function newItem(): DraftItem {
  const key =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { clientKey: key, room: "", description: "", actioned: false, pending: [] };
}

function fromForm(form: InspectionFormDto): DraftItem[] {
  const items = form.items.map((item) => ({
    clientKey: item.clientKey,
    room: item.room,
    description: item.description,
    actioned: item.actioned,
    pending: [] as File[],
  }));
  return items.length === 0 ? [newItem()] : items;
}

export function InspectionFormScreen() {
  const toast = useUiStore((s) => s.toast);
  const user = useAuthStore((s) => s.user);
  const labelJob = useJobLabel();

  const { data: jobs } = useJobs();
  const [jobId, setJobId] = useState<number | null>(null);
  const openDraft = useInspectionDraft(jobId);
  const [form, setForm] = useState<InspectionFormDto | null>(null);
  const save = useSaveInspection(form?.id ?? 0);

  const [inspector, setInspector] = useState("");
  const [inspectionType, setInspectionType] = useState<string>(INSPECTION_TYPES[0]);
  const [stage, setStage] = useState("");
  const [observations, setObservations] = useState("");
  const [items, setItems] = useState<DraftItem[]>([newItem()]);
  const [error, setError] = useState<string | undefined>(undefined);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (form === null) return;
    setInspector(form.inspector === "" ? (user?.name ?? "") : form.inspector);
    setInspectionType(form.inspectionType === "" ? INSPECTION_TYPES[0] : form.inspectionType);
    setStage(form.stage);
    setObservations(form.observations);
    setItems(fromForm(form));
  }, [form, user]);

  function chooseJob(value: string) {
    const id = Number.parseInt(value, 10);
    setJobId(id);
    setError(undefined);
    openDraft.mutate(id, {
      onSuccess: (draft) => setForm(draft),
      onError: (cause) =>
        setError(
          cause instanceof ApiError ? cause.message : "The inspection could not be started.",
        ),
    });
  }

  function patch(clientKey: string, changes: Partial<DraftItem>) {
    setItems((prev) =>
      prev.map((item) => (item.clientKey === clientKey ? { ...item, ...changes } : item)),
    );
  }

  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const branding = useBrandingStore((s) => s.branding);
  const emailForm = useEmailForm();

  /**
   * The inspection as a PDF, on the company's letterhead.
   *
   * Sent to the client or the certifier, so it carries only what was found
   * -- the photos live in the diary entry it files itself into, because a
   * PDF with forty site photos in it is not something anyone can email.
   */
  async function exportPdf() {
    if (form === null) return;
    setExporting(true);
    try {
      const job = (jobs ?? []).find((j) => j.id === form.jobId);
      const file = await buildPdf({
        title: `Site inspection — ${formatDate(form.inspectionDate)}`,
        subtitle: "Site inspection",
        branding: {
          companyName: branding.companyName,
          primaryColor: branding.primaryColor,
          sidebarColor: branding.sidebarColor,
          logoUrl: branding.logoUrl,
        },
        meta: [
          {
            label: "Job",
            value:
              job === undefined
                ? `Job #${form.jobId}`
                : labelJob({
                    jobNumber: job.jobNumber,
                    jobName: job.name,
                    jobAddress: job.address,
                  }),
          },
          { label: "Inspector", value: inspector },
          { label: "Type", value: inspectionType },
          ...(stage.trim() === "" ? [] : [{ label: "Stage", value: stage }]),
        ],
        sections: [
          ...(observations.trim() === ""
            ? []
            : [{ heading: "General observations", body: observations }]),
          {
            heading: "Defects and actions",
            columns: ["Room", "What was found", "Actioned"],
            rows: items
              .filter((i) => i.room.trim() !== "" || i.description.trim() !== "")
              .map((i) => [i.room, i.description, i.actioned ? "Yes" : "No"]),
          },
        ],
        filename: `site-inspection-${form.inspectionDate}`,
      });
      await shareOrDownload(file);
    } catch {
      toast({ title: "The PDF could not be produced", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  /**
   * Photos are uploaded after the save, not before.
   *
   * They attach to an item by its `clientKey`, and the server only knows a
   * key once the item has been saved -- so a photo picked against a brand
   * new item has nowhere to go until then.
   */
  async function uploadPending(formId: number) {
    const withPhotos = items.filter((i) => i.pending.length > 0);
    if (withPhotos.length === 0) return;

    setUploading(true);
    try {
      for (const item of withPhotos) {
        await uploadInspectionPhotos(formId, item.clientKey, item.pending);
      }
      setItems((prev) => prev.map((i) => ({ ...i, pending: [] })));
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    if (form === null) return;
    setError(undefined);

    const filled = items.filter((i) => i.room.trim() !== "" || i.description.trim() !== "");

    save.mutate(
      {
        inspector: inspector.trim(),
        inspectionType,
        stage: stage.trim(),
        observations: observations.trim(),
        // The revision we read. A save built on a stale one is refused
        // rather than overwriting whoever saved in between.
        revision: form.revision,
        items: filled.map((item, index) => ({
          clientKey: item.clientKey,
          room: item.room.trim(),
          description: item.description.trim(),
          actioned: item.actioned,
          sortOrder: index,
        })),
      },
      {
        onSuccess: (updated) => {
          setForm(updated);
          void uploadPending(updated.id)
            .then(() => toast({ title: "Inspection saved", variant: "success" }))
            .catch((cause: unknown) =>
              toast({
                title: "Saved, but the photos did not upload",
                description: cause instanceof Error ? cause.message : undefined,
                variant: "destructive",
              }),
            );
        },
        onError: (cause) =>
          setError(
            cause instanceof ApiError
              ? cause.status === 409
                ? "Somebody else saved this inspection while you were writing. Reload to see their version before saving again."
                : cause.message
              : "The inspection could not be saved.",
          ),
      },
    );
  }

  return (
    <>
      <BackLink href="/forms" label="Back to forms" />
      <PageHeader
        title="Site inspection"
        description="Room by room. It files itself into the job's diary when you save."
      />

      <div className="max-w-3xl space-y-4">
        <Card>
          <CardContent className="space-y-4 p-4">
            {error !== undefined && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Field label="Job" required hint="One inspection per job at a time.">
              {(props) => (
                <Select value={jobId === null ? "" : String(jobId)} onValueChange={chooseJob}>
                  <SelectTrigger id={props.id} aria-describedby={props["aria-describedby"]}>
                    <SelectValue placeholder="Select a job…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(jobs ?? []).map((job) => (
                      <SelectItem key={job.id} value={String(job.id)}>
                        {labelJob({
                          jobNumber: job.jobNumber,
                          jobName: job.name,
                          jobAddress: job.address,
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>

            {openDraft.isPending && (
              <p className="text-sm text-muted-foreground">Opening the inspection…</p>
            )}
          </CardContent>
        </Card>

        {openDraft.isPending && <Skeleton className="h-64 rounded-xl" />}

        {form !== null && (
          <>
            <Card>
              <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                <Field label="Inspector">
                  {(props) => (
                    <Input
                      {...props}
                      value={inspector}
                      onChange={(e) => setInspector(e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Type">
                  {(props) => (
                    <Select value={inspectionType} onValueChange={setInspectionType}>
                      <SelectTrigger id={props.id}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INSPECTION_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </Field>

                <Field label="Stage" hint="Where the build is up to.">
                  {(props) => (
                    <Input {...props} value={stage} onChange={(e) => setStage(e.target.value)} />
                  )}
                </Field>

                <Field label="General observations" className="sm:col-span-2">
                  {(props) => (
                    <Textarea
                      {...props}
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      className="min-h-24"
                    />
                  )}
                </Field>
              </CardContent>
            </Card>

            <section aria-labelledby="items-heading" className="space-y-3">
              <h2
                id="items-heading"
                className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Defects and actions
              </h2>

              {items.map((item, index) => {
                const saved = form.items.find((i) => i.clientKey === item.clientKey);

                return (
                  <Card key={item.clientKey}>
                    <CardContent className="space-y-3 p-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]">
                        <Field label={`Room ${index + 1}`}>
                          {(props) => (
                            <Input
                              {...props}
                              value={item.room}
                              onChange={(e) => patch(item.clientKey, { room: e.target.value })}
                              placeholder="e.g. Ensuite"
                            />
                          )}
                        </Field>

                        <Field label={`What was found ${index + 1}`}>
                          {(props) => (
                            <Textarea
                              {...props}
                              value={item.description}
                              onChange={(e) =>
                                patch(item.clientKey, { description: e.target.value })
                              }
                              className="min-h-16"
                              placeholder="e.g. Hairline crack above the shower recess"
                            />
                          )}
                        </Field>
                      </div>

                      {(saved?.photos.length ?? 0) > 0 && (
                        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                          {(saved?.photos ?? []).map((photo) => (
                            <li key={photo.id} className="aspect-square overflow-hidden rounded-md border">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo.url}
                                alt={photo.originalName}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            </li>
                          ))}
                        </ul>
                      )}

                      {item.pending.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {item.pending.length} photo{item.pending.length === 1 ? "" : "s"} will
                          upload when you save.
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={item.actioned}
                            onCheckedChange={(checked) =>
                              patch(item.clientKey, { actioned: checked === true })
                            }
                          />
                          Actioned
                        </label>

                        <div className="flex-1" />

                        <input
                          ref={(el) => {
                            fileInputs.current[item.clientKey] = el;
                          }}
                          type="file"
                          accept="image/*"
                          multiple
                          className="sr-only"
                          aria-label={`Add photos to item ${index + 1}`}
                          onChange={(e) => {
                            const files = Array.from(e.target.files ?? []);
                            e.target.value = "";
                            patch(item.clientKey, { pending: [...item.pending, ...files] });
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputs.current[item.clientKey]?.click()}
                        >
                          <Camera className="h-3.5 w-3.5" aria-hidden="true" /> Photos
                        </Button>

                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Remove item ${index + 1}`}
                            onClick={() =>
                              setItems((prev) =>
                                prev.filter((i) => i.clientKey !== item.clientKey),
                              )
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed"
                onClick={() => setItems((prev) => [...prev, newItem()])}
              >
                <Plus className="h-4 w-4" aria-hidden="true" /> Add another
              </Button>
            </section>

            <div className="flex justify-end gap-2 pb-10">
              <Button variant="outline" onClick={() => setEmailing(true)}>
                <Mail className="h-4 w-4" aria-hidden="true" /> Email
              </Button>
              <Button
                variant="outline"
                onClick={() => void exportPdf()}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                )}
                PDF
              </Button>
              <Button onClick={submit} disabled={save.isPending || uploading}>
                {(save.isPending || uploading) && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {uploading ? "Uploading photos…" : "Save the inspection"}
              </Button>
            </div>
          </>
        )}
      </div>

      {emailing && form !== null && (
        <EmailDialog
          title="Email this inspection"
          defaultSubject={`Site inspection — ${formatDate(form.inspectionDate)}`}
          open
          onOpenChange={setEmailing}
          isSending={emailForm.isPending}
          onSend={async ({ to, subject, message }) => {
            const result = await emailForm.mutateAsync({
              jobId: form.jobId,
              to,
              subject,
              // The form's own contents go in the body the API builds; this
              // is the covering note above it.
              body: message ?? "",
            });
            return result.message;
          }}
        />
      )}
    </>
  );
}
