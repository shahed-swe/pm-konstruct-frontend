"use client";

/**
 * One diary entry.
 *
 * The entry's own fields are editable in place -- a supervisor correcting
 * yesterday's workforce count should not have to open a form -- and the
 * notes below are the substance: each with its own status, photos and
 * replies.
 *
 * The page refetches on focus and every fifteen seconds, because two people
 * often have the same entry open: the supervisor writing it and the manager
 * marking things done.
 */
import { AlertTriangle, FileDown, Loader2, Mail, Printer, ShieldAlert, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Textarea } from "@/components/atoms/Textarea";
import { BackLink } from "@/components/molecules/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/molecules/Card";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { EmptyState } from "@/components/molecules/EmptyState";
import { ActionStatusButtons, type ActionStatus } from "@/components/molecules/ActionStatusButtons";
import { DiaryNoteCard } from "@/components/organisms/DiaryNoteCard";
import { DiaryWeatherCard } from "@/components/organisms/DiaryWeatherCard";
import { DiaryEmailDialog } from "@/components/organisms/DiaryEmailDialog";
import {
  useDeleteDiaryEntry,
  useDiaryEntry,
  useDiaryNotes,
  useSetEntryActionStatus,
  useUpdateDiaryEntry,
  useWeatherSnapshot,
} from "@/lib/api/resources/diary";
import { useMedia } from "@/lib/api/resources/media";
import { canEdit } from "@/lib/auth/permissions";
import { useJobLabel } from "@/lib/jobs/useJobLabel";
import { formatDate } from "@/lib/utils/format";
import { buildPdf, shareOrDownload } from "@/lib/reports/pdf";
import { useAuthStore } from "@/stores/auth.store";
import { useBrandingStore } from "@/stores/branding.store";
import { useUiStore } from "@/stores/ui.store";
import type { DiaryEntryDto } from "@/lib/api/types";

/**
 * A field of the entry, edited where it sits.
 *
 * Saves on blur rather than on a button, and reverts on Escape. The blur
 * save is what makes it usable one-handed: there is no second tap.
 */
function InlineField({
  label,
  value,
  editable,
  multiline = false,
  type = "text",
  onSave,
}: {
  label: string;
  value: string;
  editable: boolean;
  multiline?: boolean;
  type?: string;
  onSave: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  if (!editable) {
    return (
      <div>
        <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
        <dd className="whitespace-pre-wrap text-sm">{value === "" ? "—" : value}</dd>
      </div>
    );
  }

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  const Control = multiline ? Textarea : Input;

  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
        <Control
          value={draft}
          type={multiline ? undefined : type}
          onChange={(e: { target: { value: string } }) => setDraft(e.target.value)}
          onFocus={() => setEditing(true)}
          onBlur={commit}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Escape") {
              setDraft(value);
              setEditing(false);
              (e.target as HTMLElement).blur();
            }
          }}
          className="mt-0.5 text-sm"
        />
      </label>
    </div>
  );
}

export function DiaryDetailScreen({ entryId }: { entryId: number }) {
  const router = useRouter();
  const toast = useUiStore((s) => s.toast);
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const labelJob = useJobLabel();

  const { data: entry, isLoading, isError } = useDiaryEntry(entryId);
  const { data: notes } = useDiaryNotes(entryId, true);
  const { data: media } = useMedia({ kind: "diary", entryId });
  // Only asked for when the entry has no stamp of its own: the snapshot is
  // the older shape and most entries will not have one.
  const { data: snapshot } = useWeatherSnapshot(
    entryId,
    entry !== undefined && entry.weatherCondition === null && entry.locationName === null,
  );

  const update = useUpdateDiaryEntry(entryId);
  const setStatus = useSetEntryActionStatus(entryId);
  const remove = useDeleteDiaryEntry();

  const branding = useBrandingStore((s) => s.branding);
  const [deleting, setDeleting] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [highlightNoteId, setHighlightNoteId] = useState<number | null>(null);

  // The dashboard and the diary list send people here pointed at one note.
  // `sessionStorage` rather than the URL, as the legacy did, so the highlight
  // does not survive a refresh or get shared in a link.
  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem("pmk.diaryHighlightNoteId");
      if (stored !== null) {
        setHighlightNoteId(Number.parseInt(stored, 10));
        window.sessionStorage.removeItem("pmk.diaryHighlightNoteId");
      }
    } catch {
      // Storage unavailable. The note is still on the page, just not marked.
    }
  }, []);

  useEffect(() => {
    if (highlightNoteId === null) return;
    document.getElementById(`note-${highlightNoteId}`)?.scrollIntoView({ block: "center" });
  }, [highlightNoteId, notes]);

  const mediaByNote = useMemo(() => {
    const out = new Map<number | null, typeof media>();
    for (const m of media ?? []) {
      const key = m.noteId;
      out.set(key, [...(out.get(key) ?? []), m]);
    }
    return out;
  }, [media]);

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (isError || entry === undefined) {
    return (
      <>
        <BackLink href="/site-diary" label="Back to the diary" />
        <EmptyState
          title="That entry could not be opened"
          description="It may have been deleted, or you may not be assigned to its job."
        />
      </>
    );
  }

  const mayEdit = canEdit(user, permissions, "site-diary");
  const isManager = user?.role === "MANAGER";
  const isAuthor = user !== null && user.id === entry.authorId;
  const mayDelete = isManager || isAuthor;

  const save = (field: keyof DiaryEntryDto, raw: string) => {
    const value =
      field === "workforce"
        ? raw === ""
          ? null
          : Number.parseInt(raw, 10)
        : raw.trim() === ""
          ? null
          : raw.trim();
    update.mutate({ [field]: value }, {
      onError: () => toast({ title: "That change was not saved", variant: "destructive" }),
    });
  };

  const visibleNotes = (notes ?? []).filter((n) => !n.archived || mayEdit);
  const entryMedia = mediaByNote.get(null) ?? [];

  return (
    <>
      <BackLink href="/site-diary" label="Back to the diary" />

      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-chakra)] text-2xl font-bold tracking-tight">
            {labelJob({
              jobNumber: entry.jobNumber,
              jobName: entry.jobName,
              jobAddress: entry.jobAddress,
            }) || `Job #${entry.jobId}`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(entry.date)}
            {entry.time !== null && ` · ${entry.time}`}
            {entry.authorName !== null && entry.authorName !== undefined &&
              ` · written by ${entry.authorName}`}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={exporting}
            onClick={() => {
              setExporting(true);
              void (async () => {
                try {
                  const jobLabel =
                    labelJob({
                      jobNumber: entry.jobNumber,
                      jobName: entry.jobName,
                      jobAddress: entry.jobAddress,
                    }) || `Job #${entry.jobId}`;

                  const file = await buildPdf({
                    title: `Site diary — ${formatDate(entry.date)}`,
                    subtitle: "Site diary",
                    branding: {
                      companyName: branding.companyName,
                      primaryColor: branding.primaryColor,
                      sidebarColor: branding.sidebarColor,
                      logoUrl: branding.logoUrl,
                    },
                    meta: [
                      { label: "Job", value: jobLabel },
                      { label: "Date", value: formatDate(entry.date) },
                      { label: "Written by", value: entry.authorName ?? "—" },
                      ...(entry.workforce === null
                        ? []
                        : [{ label: "Workforce", value: String(entry.workforce) }]),
                    ],
                    sections: [
                      ...(entry.workCompleted.trim() === ""
                        ? []
                        : [{ heading: "Work completed", body: entry.workCompleted }]),
                      ...(visibleNotes.length === 0
                        ? []
                        : [
                            {
                              heading: "Notes",
                              columns: ["Category", "Note", "Status"],
                              rows: visibleNotes.map((note) => [
                                note.category,
                                note.content,
                                note.actionStatus ?? "—",
                              ]),
                            },
                          ]),
                    ],
                    filename: `site-diary-${entry.date}`,
                  });
                  await shareOrDownload(file);
                } catch {
                  toast({ title: "The PDF could not be produced", variant: "destructive" });
                } finally {
                  setExporting(false);
                }
              })();
            }}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEmailing(true)}>
            <Mail className="h-4 w-4" /> Email
          </Button>
          {mayDelete && (
            <Button variant="outline" size="sm" onClick={() => setDeleting(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Entry status</span>
        <ActionStatusButtons
          status={entry.actionStatus as ActionStatus}
          raisedBy={entry.actionRaisedBy}
          authorId={entry.authorId}
          currentUserId={user?.id ?? 0}
          isManager={isManager}
          variant="full"
          pending={setStatus.isPending}
          onChange={(next) => setStatus.mutate(next)}
        />
        {entry.issues !== null && entry.issues !== "" && (
          <Badge variant="outline" className="gap-1 text-destructive">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Issues
          </Badge>
        )}
        {entry.safetyNotes !== null && entry.safetyNotes !== "" && (
          <Badge variant="outline" className="gap-1 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="h-3 w-3" aria-hidden="true" /> Safety
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        <DiaryWeatherCard entry={entry} snapshot={snapshot} />

        <Card>
          <CardHeader className="border-b px-4 py-2.5">
            <CardTitle className="text-sm">The day</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InlineField
                label="Workforce on site"
                value={entry.workforce === null ? "" : String(entry.workforce)}
                editable={mayEdit}
                type="number"
                onSave={(v) => save("workforce", v)}
              />
              <InlineField
                label="Weather (as written)"
                value={entry.weather ?? ""}
                editable={mayEdit}
                onSave={(v) => save("weather", v)}
              />
              <InlineField
                label="Work completed"
                value={entry.workCompleted}
                editable={mayEdit}
                multiline
                onSave={(v) => save("workCompleted", v)}
              />
              <InlineField
                label="Trades on site"
                value={entry.tradesOnSite ?? ""}
                editable={mayEdit}
                multiline
                onSave={(v) => save("tradesOnSite", v)}
              />
              <InlineField
                label="Materials"
                value={entry.materials ?? ""}
                editable={mayEdit}
                multiline
                onSave={(v) => save("materials", v)}
              />
              <InlineField
                label="Equipment"
                value={entry.equipment ?? ""}
                editable={mayEdit}
                multiline
                onSave={(v) => save("equipment", v)}
              />
              <InlineField
                label="Visitors"
                value={entry.visitors ?? ""}
                editable={mayEdit}
                multiline
                onSave={(v) => save("visitors", v)}
              />
              <InlineField
                label="Safety notes"
                value={entry.safetyNotes ?? ""}
                editable={mayEdit}
                multiline
                onSave={(v) => save("safetyNotes", v)}
              />
              <InlineField
                label="Delays and issues"
                value={entry.issues ?? ""}
                editable={mayEdit}
                multiline
                onSave={(v) => save("issues", v)}
              />
              <InlineField
                label="Client instructions"
                value={entry.clientInstructions ?? ""}
                editable={mayEdit}
                multiline
                onSave={(v) => save("clientInstructions", v)}
              />
            </dl>
          </CardContent>
        </Card>

        {entryMedia.length > 0 && (
          <Card>
            <CardHeader className="border-b px-4 py-2.5">
              <CardTitle className="text-sm">Photos on the entry</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {entryMedia.map((m) => (
                  <li key={m.id} className="aspect-square">
                    <MediaThumbLink url={m.url} name={m.originalName} isImage={m.mimeType.startsWith("image/")} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <section aria-labelledby="notes-heading" className="space-y-3">
          <h2 id="notes-heading" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Notes
          </h2>
          {visibleNotes.length === 0 ? (
            <EmptyState title="No notes on this entry" />
          ) : (
            visibleNotes.map((note) => (
              <DiaryNoteCard
                key={note.id}
                entryId={entryId}
                note={note}
                media={mediaByNote.get(note.id) ?? []}
                editable={mayEdit}
                currentUserId={user?.id ?? 0}
                isManager={isManager}
                authorId={entry.authorId}
                highlighted={highlightNoteId === note.id}
              />
            ))
          )}
        </section>
      </div>

      {deleting && (
        <ConfirmDialog
          open
          onOpenChange={setDeleting}
          title="Delete this diary entry?"
          description="Its notes, photos and replies go with it. The diary is a record of what happened on site, so this cannot be undone."
          confirmLabel="Delete entry"
          destructive
          onConfirm={() => {
            remove.mutate(entryId, {
              onSuccess: () => {
                toast({ title: "Entry deleted", variant: "success" });
                router.push("/site-diary");
              },
              onError: () =>
                toast({ title: "The entry could not be deleted", variant: "destructive" }),
            });
            setDeleting(false);
          }}
        />
      )}

      {emailing && (
        <DiaryEmailDialog entry={entry} open onOpenChange={setEmailing} />
      )}
    </>
  );
}

/** A thumbnail with no delete affordance, for entry-level photos. */
function MediaThumbLink({ url, name, isImage }: { url: string; name: string; isImage: boolean }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block h-full w-full overflow-hidden rounded-md border bg-muted"
    >
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center p-2 text-center text-[10px] text-muted-foreground">
          {name}
        </span>
      )}
    </a>
  );
}
