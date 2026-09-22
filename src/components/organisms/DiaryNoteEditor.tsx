"use client";

/**
 * One section of the new-entry form: a heading, some notes, and a button to
 * add another.
 *
 * Each note carries its own action status and its own photos, because that
 * is how the diary is read afterwards -- "the crane breakdown" is one note
 * with two photos and a red flag, not a paragraph inside a wall of text.
 */
import { Camera, Plus, Trash2, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/atoms/Button";
import { Textarea } from "@/components/atoms/Textarea";
import { Card, CardContent } from "@/components/molecules/Card";
import { ActionStatusButtons, type ActionStatus } from "@/components/molecules/ActionStatusButtons";
import { cn } from "@/lib/utils/cn";

export interface DraftNote {
  localId: string;
  content: string;
  actionStatus: ActionStatus;
  files: File[];
}

export function makeDraftNote(): DraftNote {
  // `randomUUID` needs a secure context, which a phone on a plain-HTTP
  // preview is not. The fallback is only ever a key for a list.
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `note-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { localId: id, content: "", actionStatus: null, files: [] };
}

export function DiaryNoteEditor({
  heading,
  placeholder,
  notes,
  currentUserId,
  isManager,
  onChange,
  onRename,
}: {
  heading: string;
  placeholder: string;
  notes: DraftNote[];
  currentUserId: number;
  isManager: boolean;
  onChange: (notes: DraftNote[]) => void;
  onRename?: ((next: string) => void) | undefined;
}) {
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  function patch(localId: string, changes: Partial<DraftNote>) {
    onChange(notes.map((n) => (n.localId === localId ? { ...n, ...changes } : n)));
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          {onRename === undefined ? (
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {heading}
            </h2>
          ) : (
            // Editable in place, as the current app does -- companies use
            // their own words for these and renaming is a two-second job.
            <input
              value={heading}
              onChange={(e) => onRename(e.target.value)}
              aria-label={`Rename the ${heading} section`}
              className="w-full max-w-xs rounded-sm bg-transparent text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
            />
          )}
        </div>

        {notes.map((note, index) => (
          <div key={note.localId} className="space-y-2 rounded-md border p-3">
            <Textarea
              value={note.content}
              onChange={(e) => patch(note.localId, { content: e.target.value })}
              placeholder={placeholder}
              aria-label={`${heading} note ${index + 1}`}
              className="min-h-[80px] resize-y border-0 p-0 shadow-none focus-visible:ring-0"
            />

            <div className="flex flex-wrap items-center gap-2">
              <ActionStatusButtons
                status={note.actionStatus}
                raisedBy={null}
                authorId={currentUserId}
                currentUserId={currentUserId}
                isManager={isManager}
                onChange={(next) => patch(note.localId, { actionStatus: next })}
              />

              <div className="flex-1" />

              <input
                ref={(el) => {
                  fileInputs.current[note.localId] = el;
                }}
                type="file"
                accept="image/*"
                // `capture` is deliberately absent: a supervisor often picks
                // a photo taken earlier in the day rather than taking one now,
                // and `capture` removes the gallery option entirely.
                multiple
                className="sr-only"
                aria-label={`Add photos to ${heading} note ${index + 1}`}
                onChange={(e) => {
                  patch(note.localId, {
                    files: [...note.files, ...Array.from(e.target.files ?? [])],
                  });
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputs.current[note.localId]?.click()}
              >
                <Camera className="h-3.5 w-3.5" aria-hidden="true" /> Photos
              </Button>

              {notes.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Remove ${heading} note ${index + 1}`}
                  onClick={() => onChange(notes.filter((n) => n.localId !== note.localId))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {note.files.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {note.files.map((file, fileIndex) => (
                  <li
                    key={`${file.name}-${fileIndex}`}
                    className={cn(
                      "flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-xs",
                    )}
                  >
                    <span className="max-w-40 truncate">{file.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() =>
                        patch(note.localId, {
                          files: note.files.filter((_, i) => i !== fileIndex),
                        })
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={() => onChange([...notes, makeDraftNote()])}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add another note
        </Button>
      </CardContent>
    </Card>
  );
}
