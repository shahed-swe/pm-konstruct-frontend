"use client";

/**
 * Writing a diary entry.
 *
 * Pick the job, fill in whichever sections apply, press save. The entry, its
 * notes and their photos are written in that order, because a note needs an
 * entry and a photo needs a note.
 *
 * It autosaves, as the current app does: a supervisor typing one-handed in
 * a ute should not have to find a button, and the connection on a site is
 * not something to trust for one big save at the end. The entry itself is
 * created on the server the first time there is something to put in it, and
 * each note follows as it is written.
 *
 * Two guards that look fussy and are not. Saves can land out of order on a
 * bad connection, so each carries a sequence number and a late reply from an
 * older save is ignored. And the entry is created once even if three notes
 * are typed at the same moment, because the second and third wait on the
 * first rather than each creating one.
 */
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { createDiaryNote, updateDiaryNote, useCreateDiaryEntry } from "@/lib/api/resources/diary";
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
import { WeatherAutoStamp, type CapturedWeather } from "@/components/organisms/WeatherAutoStamp";
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

const SAVE_DELAY_MS = 900;

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

  const [savedEntryId, setSavedEntryId] = useState<number | null>(null);
  const [jobId, setJobId] = useState(params.get("jobId") ?? "");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("");
  const [sections, setSections] = useState<SectionNotes>(emptySections);
  const [error, setError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  /** The entry once it exists, and the promise that is creating it. */
  const entryIdRef = useRef<number | null>(null);
  const creatingRef = useRef<Promise<number> | null>(null);
  /** The server id of each note we have already written, by its local id. */
  const savedNoteIds = useRef<Record<string, number>>({});
  /** What each note looked like when we last saved it. */
  const savedContent = useRef<Record<string, string>>({});
  const sequence = useRef(0);
  const applied = useRef(0);
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  /**
   * The reading captured when the page opened.
   *
   * Held in a ref because the entry may be created by an autosave that
   * started before the weather came back, and a stale closure would file the
   * entry with nothing.
   */
  const weatherRef = useRef<CapturedWeather | null>(null);

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

  /**
   * The entry, created once.
   *
   * Three notes typed at the same moment must not create three entries, so
   * the second and third wait on the first's promise.
   */
  async function ensureEntry(job: number): Promise<number> {
    if (entryIdRef.current !== null) return entryIdRef.current;
    if (creatingRef.current !== null) return creatingRef.current;

    creatingRef.current = (async () => {
      const entry = await createEntry.mutateAsync({
        jobId: job,
        date,
        time: time === "" ? null : time,
        // The substance is in the notes, which is how the diary has been
        // written since notes replaced the single text box.
        workCompleted: "",
        // Frozen at creation and never refreshed: it is a record of the
        // conditions that day, not a forecast.
        ...(weatherRef.current ?? {}),
      });
      entryIdRef.current = entry.id;
      setSavedEntryId(entry.id);
      return entry.id;
    })();

    try {
      return await creatingRef.current;
    } finally {
      creatingRef.current = null;
    }
  }

  /** Writes whatever has changed since the last save. */
  async function autosave() {
    if (jobId === "") return;

    const pending = DIARY_SECTIONS.flatMap((section) =>
      sectionsRef.current[section.key]
        .filter((note) => {
          const text = note.content.trim();
          if (text === "") return false;
          return savedContent.current[note.localId] !== text;
        })
        .map((note) => ({ section: section.key, note })),
    );
    if (pending.length === 0) return;

    const mine = ++sequence.current;
    setStatus("saving");

    try {
      const entry = await ensureEntry(Number.parseInt(jobId, 10));

      for (const { section, note } of pending) {
        const text = note.content.trim();
        const existing = savedNoteIds.current[note.localId];

        if (existing === undefined) {
          const created = await createDiaryNote(entry, {
            category: section,
            content: text,
            actionStatus: note.actionStatus,
            sortOrder: null,
          });
          savedNoteIds.current[note.localId] = created.id;
          if (note.files.length > 0) {
            await uploadMediaFiles({ kind: "diary", entryId: entry }, note.files, created.id);
            // Uploaded once; clearing them stops a second pass re-sending.
            setSections((prev) => ({
              ...prev,
              [section]: prev[section].map((n) =>
                n.localId === note.localId ? { ...n, files: [] } : n,
              ),
            }));
          }
        } else {
          await updateDiaryNote(entry, existing, {
            content: text,
            actionStatus: note.actionStatus,
          });
        }

        savedContent.current[note.localId] = text;
      }

      if (mine < applied.current) return;
      applied.current = mine;
      setStatus("saved");
    } catch (cause) {
      if (mine < applied.current) return;
      setStatus("failed");
      setError(
        cause instanceof ApiError
          ? cause.message
          : "That did not save. Your draft is kept, so nothing is lost.",
      );
    }
  }

  // Debounced, so a burst of typing is one save rather than one per letter.
  useEffect(() => {
    if (jobId === "") return;
    const timer = window.setTimeout(() => void autosave(), SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
    // `autosave` reads the latest state through refs; adding it here would
    // restart the timer on every render and the save would never fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, jobId, date, time]);

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
      setSaving("Saving…");
      // Everything not yet written goes now, through the same path the
      // autosave uses -- so a note already saved is updated rather than
      // duplicated.
      await autosave();

      const entry = entryIdRef.current;
      if (entry === null) throw new Error("The entry was not created.");

      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // Nothing to do; the draft will be overwritten next time.
      }

      toast({ title: "Diary entry saved", variant: "success" });
      router.push(`/site-diary/${entry}`);
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

            <div className="sm:col-span-3">
              <WeatherAutoStamp
                onChange={(weather) => {
                  weatherRef.current = weather;
                }}
              />
            </div>
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
          <span role="status" aria-live="polite" className="text-sm text-muted-foreground">
            {saving ?? (status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "")}
            {status === "failed" && (
              <span className="text-destructive">Not saved — check your connection</span>
            )}
          </span>
          <Button onClick={() => void save()} disabled={saving !== null}>
            {saving !== null && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {savedEntryId === null ? "Save entry" : "Done"}
          </Button>
        </div>
      </div>
    </>
  );
}
