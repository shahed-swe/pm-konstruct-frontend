"use client";

/**
 * The job's notes, saved as you type.
 *
 * Autosave with a debounce, as the current app does -- a supervisor typing
 * on a phone should not have to find a Save button. Two things that look
 * fussy and are not:
 *
 * - A background refetch can return the *last saved* text while the user has
 *   already typed more. Overwriting the draft with it loses their words, so
 *   incoming values are ignored while there are unsaved changes.
 * - Saves can land out of order on a flaky connection. Each carries a
 *   sequence number and a late reply from an older save is discarded, so the
 *   panel never reports a stale version as the saved one.
 */
import { NotebookPen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/atoms/Textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/molecules/Card";
import { useUpdateJob } from "@/lib/api/resources/jobs";

const SAVE_DELAY_MS = 800;

export function JobNotesPanel({
  jobId,
  notes,
  editable,
}: {
  jobId: number;
  notes: string | null;
  editable: boolean;
}) {
  const update = useUpdateJob(jobId);
  const [draft, setDraft] = useState(notes ?? "");
  const [saved, setSaved] = useState(notes ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  const draftRef = useRef(draft);
  const savedRef = useRef(saved);
  const sequence = useRef(0);
  const applied = useRef(0);
  const currentJob = useRef(jobId);

  draftRef.current = draft;
  savedRef.current = saved;

  useEffect(() => {
    const incoming = notes ?? "";
    if (currentJob.current !== jobId) {
      currentJob.current = jobId;
      setDraft(incoming);
      setSaved(incoming);
      return;
    }
    // Never replace a draft the user has moved on from.
    if (draftRef.current !== savedRef.current) return;
    setDraft(incoming);
    setSaved(incoming);
  }, [jobId, notes]);

  useEffect(() => {
    const next = draft.trim();
    if (!editable || next === saved.trim()) return;

    const timer = window.setTimeout(() => {
      const mine = ++sequence.current;
      setStatus("saving");
      update.mutate(
        { description: next === "" ? null : next },
        {
          onSuccess: () => {
            if (mine < applied.current) return;
            applied.current = mine;
            setSaved(next);
            setStatus("saved");
          },
          onError: () => {
            if (mine < applied.current) return;
            setStatus("failed");
          },
        },
      );
    }, SAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
    // `update` is a stable mutation object; including it would restart the
    // timer on every render and the save would never fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, saved, editable]);

  return (
    <Card>
      <CardHeader className="border-b px-4 py-2.5">
        <CardTitle className="flex items-center gap-2 text-sm">
          <NotebookPen className="h-4 w-4 text-primary" aria-hidden="true" /> Job notes
          <span
            role="status"
            aria-live="polite"
            className="ml-auto text-xs font-normal text-muted-foreground"
          >
            {status === "saving" && "Saving…"}
            {status === "saved" && "Saved"}
            {status === "failed" && (
              <span className="text-destructive">Not saved — check your connection</span>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {editable ? (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Job notes"
            placeholder="Anything the team should know about this site…"
            className="min-h-[120px] resize-y"
          />
        ) : draft === "" ? (
          <p className="text-sm italic text-muted-foreground">No notes on this job.</p>
        ) : (
          <p className="whitespace-pre-wrap text-sm">{draft}</p>
        )}
      </CardContent>
    </Card>
  );
}
