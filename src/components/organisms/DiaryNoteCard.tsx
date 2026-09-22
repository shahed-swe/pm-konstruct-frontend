"use client";

/**
 * One note inside a diary entry.
 *
 * A note is the unit people actually read and act on: a paragraph, a colour
 * for whether it needs doing, its photos, and the conversation about it.
 * Editing is in place -- opening a separate form to change one line was the
 * legacy's main friction on a phone.
 */
import { Archive, ArchiveRestore, Camera, Loader2, MessageSquare, Send } from "lucide-react";
import { useRef, useState } from "react";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { Textarea } from "@/components/atoms/Textarea";
import { Card, CardContent } from "@/components/molecules/Card";
import { MediaThumb } from "@/components/molecules/MediaThumb";
import {
  ActionStatusButtons,
  type ActionStatus,
} from "@/components/molecules/ActionStatusButtons";
import {
  useAddNoteComment,
  useArchiveDiaryNote,
  useNoteComments,
  useSetNoteActionStatus,
  useUpdateDiaryNote,
} from "@/lib/api/resources/diary";
import { useDeleteMedia, useUploadMedia } from "@/lib/api/resources/media";
import { categoryLabel } from "@/lib/diary/categories";
import { formatDateTime } from "@/lib/utils/format";
import { useUiStore } from "@/stores/ui.store";
import type { DiaryNoteDto, MediaDto } from "@/lib/api/types";

export function DiaryNoteCard({
  entryId,
  note,
  media,
  editable,
  currentUserId,
  isManager,
  authorId,
  highlighted = false,
}: {
  entryId: number;
  note: DiaryNoteDto;
  media: MediaDto[];
  editable: boolean;
  currentUserId: number;
  isManager: boolean;
  authorId: number | null;
  highlighted?: boolean | undefined;
}) {
  const toast = useUiStore((s) => s.toast);
  const update = useUpdateDiaryNote(entryId);
  const setStatus = useSetNoteActionStatus(entryId);
  const archive = useArchiveDiaryNote(entryId);
  const upload = useUploadMedia({ kind: "diary", entryId });
  const removeMedia = useDeleteMedia({ kind: "diary", entryId });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  // Only fetched once the thread is opened: a busy entry has twenty notes,
  // and twenty comment requests on load is most of a second on mobile data.
  const { data: comments, isLoading: commentsLoading } = useNoteComments(
    entryId,
    note.id,
    commentsOpen,
  );
  const addComment = useAddNoteComment(entryId, note.id);

  function save() {
    const trimmed = draft.trim();
    if (trimmed === note.content) {
      setEditing(false);
      return;
    }
    update.mutate(
      { noteId: note.id, content: trimmed },
      {
        onSuccess: () => setEditing(false),
        onError: () => toast({ title: "The note could not be saved", variant: "destructive" }),
      },
    );
  }

  return (
    <Card
      id={`note-${note.id}`}
      className={cnHighlight(highlighted, note.archived)}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{categoryLabel(note.category)}</Badge>
          {note.archived && <Badge variant="secondary">Archived</Badge>}
          <span className="ml-auto text-xs text-muted-foreground">
            {formatDateTime(note.createdAt)}
          </span>
        </div>

        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Note text"
              className="min-h-[100px]"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraft(note.content);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={update.isPending}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p
            className="whitespace-pre-wrap text-sm"
            onDoubleClick={editable ? () => setEditing(true) : undefined}
          >
            {note.content}
          </p>
        )}

        {media.length > 0 && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {media.map((m) => (
              <li key={m.id} className="aspect-square">
                <MediaThumb
                  media={m}
                  className="h-full w-full"
                  onOpen={() => window.open(m.url, "_blank", "noopener")}
                  onRemove={
                    editable
                      ? () => removeMedia.mutate({ id: m.id, jobMedia: false })
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <ActionStatusButtons
            status={note.actionStatus as ActionStatus}
            raisedBy={note.actionRaisedBy}
            authorId={authorId}
            currentUserId={currentUserId}
            isManager={isManager}
            pending={setStatus.isPending}
            onChange={(next) => setStatus.mutate({ noteId: note.id, actionStatus: next })}
          />

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCommentsOpen((v) => !v)}
            aria-expanded={commentsOpen}
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            {commentsOpen ? "Hide replies" : "Replies"}
          </Button>

          {editable && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>

              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                aria-label="Add photos to this note"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  if (files.length === 0) return;
                  upload.mutate(
                    { files, noteId: note.id },
                    {
                      onError: () =>
                        toast({ title: "The photos did not upload", variant: "destructive" }),
                    },
                  );
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                disabled={upload.isPending}
                onClick={() => fileInput.current?.click()}
              >
                {upload.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                Photos
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  archive.mutate({ noteId: note.id, archived: !note.archived })
                }
              >
                {note.archived ? (
                  <>
                    <ArchiveRestore className="h-3.5 w-3.5" aria-hidden="true" /> Restore
                  </>
                ) : (
                  <>
                    <Archive className="h-3.5 w-3.5" aria-hidden="true" /> Archive
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {commentsOpen && (
          <div className="space-y-3 border-t pt-3">
            {commentsLoading ? (
              <p className="text-xs text-muted-foreground">Loading replies…</p>
            ) : (comments ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No replies yet.</p>
            ) : (
              <ul className="space-y-2">
                {(comments ?? []).map((c) => (
                  <li key={c.id} className="rounded-md bg-muted/40 px-3 py-2">
                    <p className="text-xs font-medium">
                      {c.authorName ?? "Someone"}
                      <span className="ml-2 font-normal text-muted-foreground">
                        {formatDateTime(c.createdAt)}
                      </span>
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.content}</p>
                  </li>
                ))}
              </ul>
            )}

            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const text = comment.trim();
                if (text === "") return;
                addComment.mutate(
                  { content: text },
                  {
                    onSuccess: () => setComment(""),
                    onError: () =>
                      toast({ title: "The reply was not sent", variant: "destructive" }),
                  },
                );
              }}
            >
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Reply…"
                aria-label="Write a reply"
                className="min-h-10 flex-1 py-2"
                rows={1}
              />
              <Button type="submit" size="icon" disabled={addComment.isPending} aria-label="Send reply">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * The highlight a note gets when arrived at from the dashboard's action list,
 * and the dimming an archived one gets.
 */
function cnHighlight(highlighted: boolean, archived: boolean): string {
  const classes = ["scroll-mt-20"];
  if (highlighted) classes.push("ring-2 ring-primary");
  if (archived) classes.push("opacity-60");
  return classes.join(" ");
}
