"use client";

/**
 * Writing a diary entry.
 *
 * Pick the job, fill in whichever sections apply, press save. The entry, its
 * notes and their photos are written in that order, because a note needs an
 * entry and a photo needs a note.
 *
 * **A deliberate change from the current app.** That one created the entry
 * on the server the moment you typed a character and autosaved every note as
 * you went, which meant a form abandoned half way left an empty diary entry
 * behind forever -- and the diary is a legal record of what happened on
 * site. Here the draft is kept in the browser, so nothing is lost if the
 * phone dies, and nothing reaches the diary until the supervisor says so.
 * Recorded in `docs/audit/deliberate-changes.md`.
 */
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { createDiaryNote, useCreateDiaryEntry } from "@/lib/api/resources/diary";
import { uploadMediaFiles } from "@/lib/api/resources/media";
import { useJobs } from "@/lib/api/resources/jobs";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
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
  DiaryNoteEditor,
  makeDraftNote,
  type DraftNote,
} from "@/components/organisms/DiaryNoteEditor";
import { DIARY_SECTIONS, type SectionKey } from "@/lib/diary/categories";
import { useCategoryLabels } from "@/lib/diary/useCategoryLabels";
import { useJobLabel } from "@/lib/jobs/useJobLabel";
import { today } from "@/lib/utils/format";
import { useAuthStore } from "@/stores/auth.store";
import { useUiStore } from "@/stores/ui.store";

type SectionNotes = Record<SectionKey, DraftNote[]>;

function emptySections(): SectionNotes {
  return Object.fromEntries(DIARY_SECTIONS.map((s) => [s.key, [makeDraftNote()]])) as SectionNotes;
}

const DRAFT_KEY = "pmk.diaryDraft";

/** What survives a reload. Files cannot be serialised, so they do not. */
interface StoredDraft {
  jobId: string;
  date: string;
  time: string;
  sections: Record<string, { content: string; actionStatus: DraftNote["actionStatus"] }[]>;
}

export function DiaryNewScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useUiStore((s) => s.toast);
  const user = useAuthStore((s) => s.user);
  const labelJob = useJobLabel();
  const { getLabel, setLabel } = useCategoryLabels();

  const { data: jobs } = useJobs();
  const createEntry = useCreateDiaryEntry();

  const [jobId, setJobId] = useState(params.get("jobId") ?? "");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("");
  const [sections, setSections] = useState<SectionNotes>(emptySections);
  const [error, setError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState<string | null>(null);

  // Restore an unfinished draft. Photos are not part of it -- a `File`
  // cannot be stored -- so the note text comes back and the pictures have to
  // be picked again, which is still far better than losing the words.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw === null) return;
      const draft = JSON.parse(raw) as StoredDraft;
      if (draft.jobId !== "") setJobId(draft.jobId);
      if (draft.date !== "") setDate(draft.date);
      setTime(draft.time);
      setSections((current) => {
        const next = { ...current };
        for (const section of DIARY_SECTIONS) {
          const stored = draft.sections[section.key];
          if (stored !== undefined && stored.length > 0) {
            next[section.key] = stored.map((n) => ({ ...makeDraftNote(), ...n, files: [] }));
          }
        }
        return next;
      });
    } catch {
      // A corrupt or unreadable draft is not worth a broken page.
    }
  }, []);

  useEffect(() => {
    const draft: StoredDraft = {
      jobId,
      date,
      time,
      sections: Object.fromEntries(
        DIARY_SECTIONS.map((s) => [
          s.key,
          sections[s.key].map((n) => ({ content: n.content, actionStatus: n.actionStatus })),
        ]),
      ),
    };
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Private browsing, or a full quota. The form still works.
    }
  }, [jobId, date, time, sections]);

  async function save() {
    if (jobId === "") {
      setError("Choose the job this entry is for.");
      return;
    }

    const filled = DIARY_SECTIONS.flatMap((section) =>
      sections[section.key]
        .filter((n) => n.content.trim() !== "" || n.files.length > 0)
        .map((n) => ({ section: section.key, note: n })),
    );

    if (filled.length === 0) {
      setError("Write at least one note before saving.");
      return;
    }

    setError(undefined);

    try {
      setSaving("Creating the entry…");
      const entry = await createEntry.mutateAsync({
        jobId: Number.parseInt(jobId, 10),
        date,
        time: time === "" ? null : time,
        // The entry's own `workCompleted` stays empty: the detail of the day
        // lives in the notes, which is how the diary has been written since
        // the notes feature replaced the single text box.
        workCompleted: "",
      });

      for (const [index, { section, note }] of filled.entries()) {
        setSaving(`Saving note ${index + 1} of ${filled.length}…`);
        const saved = await createDiaryNote(entry.id, {
          category: section,
          content: note.content.trim(),
          actionStatus: note.actionStatus,
          sortOrder: null,
        });

        if (note.files.length > 0) {
          setSaving(`Uploading photos for note ${index + 1}…`);
          await uploadMediaFiles({ kind: "diary", entryId: entry.id }, note.files, saved.id);
        }
      }

      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // Nothing to do; the draft will be overwritten next time.
      }

      toast({ title: "Diary entry saved", variant: "success" });
      router.push(`/site-diary/${entry.id}`);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "The entry could not be saved. Your draft is kept, so nothing is lost.",
      );
    } finally {
      setSaving(null);
    }
  }

  const jobOptions = jobs ?? [];

  return (
    <>
      <BackLink href="/site-diary" label="Back to the diary" />
      <PageHeader title="New diary entry" description="What happened on site today." />

      <div className="max-w-3xl space-y-4">
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
            <Field label="Job" required className="sm:col-span-3">
              {(props) => (
                <Select value={jobId} onValueChange={setJobId}>
                  <SelectTrigger id={props.id}>
                    <SelectValue placeholder="Select a job…" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobOptions.map((job) => (
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

            <Field label="Date" required>
              {(props) => (
                <Input {...props} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              )}
            </Field>

            <Field label="Time" hint="Optional.">
              {(props) => (
                <Input {...props} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              )}
            </Field>
          </CardContent>
        </Card>

        {DIARY_SECTIONS.map((section) => (
          <DiaryNoteEditor
            key={section.key}
            heading={getLabel(section.key)}
            placeholder={section.placeholder}
            notes={sections[section.key]}
            currentUserId={user?.id ?? 0}
            isManager={user?.role === "MANAGER"}
            onRename={(next) => setLabel(section.key, next)}
            onChange={(notes) => setSections((prev) => ({ ...prev, [section.key]: notes }))}
          />
        ))}

        {error !== undefined && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pb-10">
          {saving !== null && (
            <span role="status" aria-live="polite" className="text-sm text-muted-foreground">
              {saving}
            </span>
          )}
          <Button onClick={() => void save()} disabled={saving !== null}>
            {saving !== null && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Save entry
          </Button>
        </div>
      </div>
    </>
  );
}
