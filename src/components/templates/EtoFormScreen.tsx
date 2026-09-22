"use client";

/**
 * An extra to order.
 *
 * Raising one creates a diary note on the job with a purchase-order number
 * and an "action" flag; a manager clears the flag to approve it. Nothing
 * here approves anything, which is the point -- the person asking for the
 * money is not the person who agrees to it.
 *
 * Once approved, the supervisor shares it from their phone: the legacy built
 * a PDF and handed it to the system share sheet, falling back to a download.
 * Here it is plain text, which every phone can share and every client can
 * read; the PDF is noted in `docs/audit/preserved-quirks.md` as not carried
 * across.
 */
import { CheckCircle2, Clock3, Loader2, Send, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/atoms/Button";
import { Textarea } from "@/components/atoms/Textarea";
import { BackLink } from "@/components/molecules/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/molecules/Card";
import { Field } from "@/components/molecules/Field";
import { PageHeader } from "@/components/molecules/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/Select";
import { useDiaryNotes } from "@/lib/api/resources/diary";
import { useRaiseEto } from "@/lib/api/resources/forms";
import { useJobs } from "@/lib/api/resources/jobs";
import { useJobLabel } from "@/lib/jobs/useJobLabel";
import { useAuthStore } from "@/stores/auth.store";
import { useUiStore } from "@/stores/ui.store";

interface Raised {
  entryId: number;
  noteId: number;
  poNumber: string;
  jobLabel: string;
  raisedBy: string;
  reason: string;
  details: string;
}

export function EtoFormScreen() {
  const toast = useUiStore((s) => s.toast);
  const user = useAuthStore((s) => s.user);
  const labelJob = useJobLabel();

  const { data: jobs } = useJobs();
  const raise = useRaiseEto();

  const [jobId, setJobId] = useState("");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [raised, setRaised] = useState<Raised | null>(null);

  // Once raised, the page watches for the manager's approval. Polled every
  // ten seconds -- a supervisor standing on site wants to know the moment it
  // clears, and the note is the only thing that knows. The interval stops as
  // soon as it is approved.
  const [approved, setApproved] = useState(false);
  const { data: notes } = useDiaryNotes(raised?.entryId ?? 0, false, {
    refetchInterval: raised !== null && !approved ? 10_000 : false,
  });

  useEffect(() => {
    const note = notes?.find((n) => n.id === raised?.noteId);
    if (note?.actionStatus === "completed") setApproved(true);
  }, [notes, raised]);

  function submit() {
    if (jobId === "" || reason.trim() === "" || details.trim() === "") {
      setError("Choose the job, and say what the extra is and why.");
      return;
    }
    setError(undefined);

    const job = (jobs ?? []).find((j) => String(j.id) === jobId);

    raise.mutate(
      { jobId: Number.parseInt(jobId, 10), reason: reason.trim(), details: details.trim() },
      {
        onSuccess: (result) => {
          setRaised({
            entryId: result.entryId,
            noteId: result.noteId,
            poNumber: result.poNumber,
            jobLabel:
              job === undefined
                ? `Job #${jobId}`
                : [job.jobNumber, job.name, job.address].filter((v) => v !== "").join(" — "),
            raisedBy: result.raisedBy === "" ? (user?.name ?? "") : result.raisedBy,
            reason: reason.trim(),
            details: details.trim(),
          });
          toast({ title: `${result.poNumber} sent for approval`, variant: "success" });
        },
        onError: (cause) =>
          setError(cause instanceof ApiError ? cause.message : "The ETO could not be raised."),
      },
    );
  }

  function share() {
    if (raised === null) return;
    const text = [
      "ETO — EXTRA TO ORDER",
      `Purchase order: ${raised.poNumber}`,
      `Job: ${raised.jobLabel}`,
      `Raised by: ${raised.raisedBy}`,
      "",
      `Reason: ${raised.reason}`,
      "",
      raised.details,
    ].join("\n");

    if (typeof navigator.share === "function") {
      void navigator.share({ title: `ETO ${raised.poNumber}`, text }).catch(() => undefined);
      return;
    }
    void navigator.clipboard
      .writeText(text)
      .then(() => toast({ title: "Copied to the clipboard", variant: "success" }))
      .catch(() =>
        toast({ title: "Could not share it", description: "Copy it from the screen." }),
      );
  }

  return (
    <>
      <BackLink href="/forms" label="Back to forms" />
      <PageHeader
        title="Extra to order"
        description="Extra work or materials, sent to a manager for approval."
      />

      <div className="max-w-2xl space-y-4">
        {raised !== null && (
          <Card>
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                {approved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                    {raised.poNumber} approved
                  </>
                ) : (
                  <>
                    <Clock3 className="h-4 w-4 text-amber-600" aria-hidden="true" />
                    {raised.poNumber} waiting on a manager
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 text-sm">
              <p className="text-muted-foreground">
                {approved
                  ? "Approved. You can send it on to the client."
                  : "A manager has to approve it before it can be sent on. This page updates when they do."}
              </p>
              <dl className="space-y-1">
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-muted-foreground">Job</dt>
                  <dd>{raised.jobLabel}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-muted-foreground">Raised by</dt>
                  <dd>{raised.raisedBy}</dd>
                </div>
              </dl>

              {approved && (
                <Button onClick={share}>
                  <Share2 className="h-4 w-4" aria-hidden="true" /> Share it
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-4 p-4">
            {error !== undefined && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Field label="Job" required>
              {(props) => (
                <Select value={jobId} onValueChange={setJobId}>
                  <SelectTrigger id={props.id}>
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

            <Field
              label="Reason"
              required
              hint="Why the extra is needed. Kept internal — it is not in what you share with the client."
            >
              {(props) => (
                <Textarea
                  {...props}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-20"
                  placeholder="e.g. Engineer required deeper footings after the soil test"
                />
              )}
            </Field>

            <Field label="What is being ordered" required>
              {(props) => (
                <Textarea
                  {...props}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="min-h-32"
                  placeholder="The work or materials, and quantities"
                />
              )}
            </Field>

            <div className="flex justify-end">
              <Button onClick={submit} disabled={raise.isPending}>
                {raise.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
                Send for approval
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
