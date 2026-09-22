"use client";

/**
 * The action board: every diary note that needs somebody to do something.
 *
 * Three columns -- needs doing, being done, done -- and a note moves between
 * them. This is the screen managers actually live on, so it is the first
 * thing on the dashboard.
 *
 * Cards are dragged between columns, as they are today. The library is
 * `@dnd-kit` rather than the HTML5 drag API the legacy used, because that
 * one does nothing at all on a touch screen -- and this is a board people
 * use on a phone. The three buttons on each card stay, since a small drag
 * target in a moving vehicle is not a fair ask.
 */
import { CheckCircle2, Clock, MessageSquare, Zap } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/atoms/Badge";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Card, CardContent } from "@/components/molecules/Card";
import { DragBoard, DragCard, DropColumn } from "@/components/molecules/DragBoard";
import { EmptyState } from "@/components/molecules/EmptyState";
import { ActionStatusButtons, type ActionStatus } from "@/components/molecules/ActionStatusButtons";
import { useActionItems } from "@/lib/api/resources/dashboard";
import { useMoveActionItem, useSetNoteActionStatus } from "@/lib/api/resources/diary";
import { categoryLabel } from "@/lib/diary/categories";
import { useJobLabel } from "@/lib/jobs/useJobLabel";
import { formatDate } from "@/lib/utils/format";
import { useAuthStore } from "@/stores/auth.store";
import { useUiStore } from "@/stores/ui.store";
import type { ActionItemDto } from "@/lib/api/types";

const COLUMNS = [
  { key: "action", label: "Needs doing", Icon: Zap, tone: "border-red-400/40 bg-red-500/5" },
  { key: "processing", label: "Being done", Icon: Clock, tone: "border-amber-400/40 bg-amber-500/5" },
  {
    key: "completed",
    label: "Done",
    Icon: CheckCircle2,
    tone: "border-emerald-400/40 bg-emerald-500/5",
  },
] as const;

function ActionCard({ item }: { item: ActionItemDto }) {
  const user = useAuthStore((s) => s.user);
  const toast = useUiStore((s) => s.toast);
  const labelJob = useJobLabel();
  const setStatus = useSetNoteActionStatus(item.diaryEntryId);

  return (
    <Card className="mb-2">
      <CardContent className="space-y-2 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {categoryLabel(item.category)}
          </Badge>
          <span className="truncate text-xs font-medium text-primary">
            {labelJob({
              jobNumber: item.jobNumber,
              jobName: item.jobName,
              jobAddress: item.jobAddress,
            }) || `Job #${item.jobId}`}
          </span>
        </div>

        <Link
          href={`/site-diary/${item.diaryEntryId}`}
          className="block text-sm hover:underline"
          onClick={() => {
            // The diary entry scrolls to this note and marks it. Kept in
            // session storage rather than the URL so it does not survive a
            // refresh or get shared in a link.
            try {
              window.sessionStorage.setItem("pmk.diaryHighlightNoteId", String(item.noteId));
            } catch {
              // Storage unavailable; the entry still opens.
            }
          }}
        >
          <span className="line-clamp-3">{item.content}</span>
        </Link>

        {item.latestCommentContent !== null && (
          <p className="flex items-start gap-1.5 rounded-md bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
            <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2">
              <span className="font-medium">{item.latestCommentAuthor ?? "Someone"}:</span>{" "}
              {item.latestCommentContent}
            </span>
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            {item.authorName ?? "Unknown"} · {formatDate(item.entryDate)}
          </span>
        </div>

        <ActionStatusButtons
          status={item.actionStatus as ActionStatus}
          raisedBy={item.actionRaisedBy}
          authorId={item.authorId}
          currentUserId={user?.id ?? 0}
          isManager={user?.role === "MANAGER"}
          pending={setStatus.isPending}
          onChange={(next) =>
            setStatus.mutate(
              { noteId: item.noteId, actionStatus: next },
              {
                onError: () =>
                  toast({ title: "That change was not saved", variant: "destructive" }),
              },
            )
          }
        />
      </CardContent>
    </Card>
  );
}

export function ActionBoard() {
  const { data: items, isLoading } = useActionItems();
  const toast = useUiStore((s) => s.toast);
  const moveNote = useMoveActionItem();

  const byColumn = useMemo(() => {
    const out = new Map<string, ActionItemDto[]>();
    for (const column of COLUMNS) out.set(column.key, []);
    for (const item of items ?? []) {
      out.get(item.actionStatus)?.push(item);
    }
    return out;
  }, [items]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  if ((items ?? []).length === 0) {
    return (
      <EmptyState
        title="Nothing needs doing"
        description="Notes flagged on a diary entry appear here until they are cleared."
      />
    );
  }

  function move(cardId: string, columnId: string) {
    const item = (items ?? []).find((i) => String(i.noteId) === cardId);
    if (item === undefined || item.actionStatus === columnId) return;
    moveNote.mutate(
      { entryId: item.diaryEntryId, noteId: item.noteId, actionStatus: columnId },
      { onError: () => toast({ title: "That move was not saved", variant: "destructive" }) },
    );
  }

  return (
    <DragBoard onMove={move}>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {COLUMNS.map((column) => {
        const list = byColumn.get(column.key) ?? [];
        return (
          <DropColumn
            key={column.key}
            id={column.key}
            className={`rounded-xl border p-3 ${column.tone}`}
          >
          <section aria-labelledby={`column-${column.key}`}>
            <h3
              id={`column-${column.key}`}
              className="mb-3 flex items-center gap-2 text-sm font-semibold"
            >
              <column.Icon className="h-4 w-4" aria-hidden="true" />
              {column.label}
              <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs font-normal">
                {list.length}
              </span>
            </h3>

            {list.length === 0 ? (
              <p className="px-1 py-6 text-center text-xs text-muted-foreground">Nothing here.</p>
            ) : (
              <ul className="max-h-[32rem] overflow-y-auto">
                {list.map((item) => (
                  <li key={item.noteId}>
                    <DragCard id={String(item.noteId)}>
                      <ActionCard item={item} />
                    </DragCard>
                  </li>
                ))}
              </ul>
            )}
          </section>
          </DropColumn>
        );
      })}
    </div>
    </DragBoard>
  );
}
