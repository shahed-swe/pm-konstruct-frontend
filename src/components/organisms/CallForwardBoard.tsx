"use client";

/**
 * A job's programme: stages, the trades under them, and how each is going.
 *
 * Every row is editable where it sits -- title, trade, the four dates and
 * the status -- because the whole point of this screen is a supervisor
 * updating a date while standing on the site.
 *
 * Rows are dragged to reorder, as they are today -- with `@dnd-kit` rather
 * than the HTML5 drag API the legacy used, because that one does nothing on
 * a touch screen and this programme is edited on site. The move, indent and
 * outdent buttons stay alongside: they work by keyboard, and a precise drag
 * target is not a fair ask on a phone in the rain.
 */
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CornerDownRight,
  CornerLeftUp,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Skeleton } from "@/components/atoms/Skeleton";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { DelayBadge } from "@/components/molecules/DelayBadge";
import { EmptyState } from "@/components/molecules/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/Select";
import {
  buildTree,
  flattenTree,
  useCallForwardItems,
  useCreateCallForwardItem,
  useDeleteCallForwardItem,
  useReorderCallForward,
  useUpdateCallForwardItem,
  type CallForwardNode,
} from "@/lib/api/resources/callForward";
import { cn } from "@/lib/utils/cn";
import { useUiStore } from "@/stores/ui.store";
import type { CallForwardDto, ReorderItem } from "@/lib/api/types";

const STATUSES = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On hold" },
] as const;

const ITEM_TYPES = [
  { value: "HEADER", label: "Stage" },
  { value: "STAGE_CLAIM", label: "Stage claim" },
  { value: "TASK", label: "Task" },
] as const;

/** Only a stage may contain anything, which the API enforces too. */
function canHaveChildren(item: CallForwardDto): boolean {
  return item.itemType === "HEADER";
}

/**
 * One row, draggable by its handle.
 *
 * The handle is the grip rather than the whole row: the row is full of
 * inputs, and a drag that starts on a date field is a date field nobody can
 * focus.
 */
function SortableRow({
  id,
  children,
  className,
  style,
}: {
  id: number;
  children: (handle: Record<string, unknown>) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <li
      ref={setNodeRef}
      className={cn(className, isDragging && "opacity-60")}
      style={{
        ...style,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {children({ ...attributes, ...listeners })}
    </li>
  );
}

function Cell({
  label,
  value,
  type = "text",
  editable,
  onSave,
  className,
}: {
  label: string;
  value: string;
  type?: string;
  editable: boolean;
  onSave: (next: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);

  if (!editable) {
    return (
      <span className={cn("text-sm", className)}>{value === "" ? "—" : value}</span>
    );
  }

  return (
    <Input
      aria-label={label}
      type={type}
      value={editing ? draft : value}
      className={cn("h-8", className)}
      onFocus={() => {
        setDraft(value);
        setEditing(true);
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (draft !== value) onSave(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setEditing(false);
          (e.target as HTMLElement).blur();
        }
        if (e.key === "Enter") (e.target as HTMLElement).blur();
      }}
    />
  );
}

export function CallForwardBoard({ jobId, editable }: { jobId: number; editable: boolean }) {
  const toast = useUiStore((s) => s.toast);
  const { data: items, isLoading } = useCallForwardItems({ jobId });
  const create = useCreateCallForwardItem();
  const update = useUpdateCallForwardItem();
  const remove = useDeleteCallForwardItem();
  const reorder = useReorderCallForward();

  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState<CallForwardNode | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<string>("TASK");

  const sensors = useSensors(
    // 6px before a drag begins, so a tap on a field in the row still lands.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const tree = useMemo(() => buildTree(items ?? []), [items]);
  const rows = useMemo(() => {
    const hidden = new Set<number>();
    const walk = (nodes: CallForwardNode[], under: boolean) => {
      for (const node of nodes) {
        if (under) hidden.add(node.id);
        walk(node.children, under || collapsed.has(node.id));
      }
    };
    walk(tree, false);
    return flattenTree(tree).filter((n) => !hidden.has(n.id));
  }, [tree, collapsed]);

  /**
   * Reorders within the dragged row's own siblings.
   *
   * Dropping onto a row with a different parent is ignored rather than
   * silently re-parenting: a drag that quietly moves a trade into a
   * different stage is the kind of thing nobody notices until the programme
   * is wrong. Use indent and outdent to change the parent deliberately.
   */
  function handleDragEnd(event: DragEndEvent) {
    const activeId = Number(event.active.id);
    const overId = event.over === null ? null : Number(event.over.id);
    if (overId === null || activeId === overId) return;

    const all = flattenTree(tree);
    const moved = all.find((n) => n.id === activeId);
    const target = all.find((n) => n.id === overId);
    if (moved === undefined || target === undefined) return;

    if (moved.parentId !== target.parentId) {
      toast({
        title: "Dropped outside its stage",
        description: "Use the indent and outdent buttons to move an item between stages.",
      });
      return;
    }

    const siblings = siblingsOf(moved);
    const from = siblings.findIndex((n) => n.id === activeId);
    const to = siblings.findIndex((n) => n.id === overId);
    if (from < 0 || to < 0) return;

    const reordered = [...siblings];
    const [taken] = reordered.splice(from, 1);
    if (taken === undefined) return;
    reordered.splice(to, 0, taken);

    reorder.mutate(
      reordered.map((n, i): ReorderItem => ({ id: n.id, sortOrder: i + 1 })),
      { onError: () => toast({ title: "The order was not saved", variant: "destructive" }) },
    );
  }

  function toggle(id: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Siblings of a node, in their drawn order. */
  function siblingsOf(node: CallForwardNode): CallForwardNode[] {
    const all = flattenTree(tree);
    return all.filter((n) => n.parentId === node.parentId);
  }

  function move(node: CallForwardNode, direction: -1 | 1) {
    const siblings = siblingsOf(node);
    const index = siblings.findIndex((n) => n.id === node.id);
    const target = index + direction;
    if (target < 0 || target >= siblings.length) return;

    const reordered = [...siblings];
    const [moved] = reordered.splice(index, 1);
    if (moved === undefined) return;
    reordered.splice(target, 0, moved);

    // Every sibling is renumbered, not just the two that swapped: the list
    // may have arrived with ties or gaps, and renumbering makes the result
    // unambiguous.
    reorder.mutate(
      reordered.map((n, i): ReorderItem => ({ id: n.id, sortOrder: i + 1 })),
      { onError: () => toast({ title: "The order was not saved", variant: "destructive" }) },
    );
  }

  /** Tucks an item under the stage above it. */
  function indent(node: CallForwardNode) {
    const siblings = siblingsOf(node);
    const index = siblings.findIndex((n) => n.id === node.id);
    const above = siblings[index - 1];
    if (above === undefined) return;
    if (!canHaveChildren(above)) {
      toast({
        title: "Only a stage can contain other items",
        description: `“${above.title}” is a ${above.itemType === "TASK" ? "task" : "stage claim"}.`,
      });
      return;
    }
    reorder.mutate([{ id: node.id, sortOrder: above.children.length + 1, parentId: above.id }]);
  }

  /** Lifts an item out to sit beside its parent. */
  function outdent(node: CallForwardNode) {
    if (node.parentId === null) return;
    const parent = flattenTree(tree).find((n) => n.id === node.parentId);
    if (parent === undefined) return;
    reorder.mutate([
      { id: node.id, sortOrder: parent.sortOrder + 1, parentId: parent.parentId },
    ]);
  }

  function addItem() {
    const title = newTitle.trim();
    if (title === "") return;
    create.mutate(
      { jobId, title, itemType: newType, sortOrder: (items ?? []).length + 1 },
      {
        onSuccess: () => setNewTitle(""),
        onError: () => toast({ title: "The item was not added", variant: "destructive" }),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <EmptyState
          title="No programme on this job yet"
          description={
            editable
              ? "Add the stages and trades below, or apply a template."
              : "Nothing has been scheduled for this site."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <DndContext
            sensors={sensors}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
          <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <ul className="divide-y">
            {rows.map((node) => {
              const isStage = node.itemType === "HEADER";
              const hasChildren = node.children.length > 0;

              return (
                <SortableRow
                  key={node.id}
                  id={node.id}
                  className={cn(
                    "flex flex-wrap items-center gap-2 px-3 py-2",
                    isStage && "bg-secondary/40 font-medium",
                  )}
                  style={{ paddingLeft: `${0.75 + node.depth * 1.5}rem` }}
                >
                  {(handle) => (
                  <>
                  {editable && (
                    <button
                      type="button"
                      aria-label={`Drag ${node.title} to reorder`}
                      className="shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
                      {...handle}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                  )}
                  {hasChildren ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      aria-expanded={!collapsed.has(node.id)}
                      aria-label={
                        collapsed.has(node.id) ? `Expand ${node.title}` : `Collapse ${node.title}`
                      }
                      onClick={() => toggle(node.id)}
                    >
                      {collapsed.has(node.id) ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  ) : (
                    <span className="w-6 shrink-0" />
                  )}

                  <Cell
                    label={`Title of ${node.title}`}
                    value={node.title}
                    editable={editable}
                    className="min-w-40 flex-1"
                    onSave={(v) => update.mutate({ id: node.id, title: v })}
                  />

                  <Cell
                    label={`Trade for ${node.title}`}
                    value={node.supplierTrade ?? ""}
                    editable={editable}
                    className="w-32"
                    onSave={(v) => update.mutate({ id: node.id, supplierTrade: v === "" ? null : v })}
                  />

                  <Cell
                    label={`Estimated start for ${node.title}`}
                    value={node.estStart ?? ""}
                    type="date"
                    editable={editable}
                    className="w-36"
                    onSave={(v) => update.mutate({ id: node.id, estStart: v === "" ? null : v })}
                  />
                  <Cell
                    label={`Estimated finish for ${node.title}`}
                    value={node.estFinish ?? ""}
                    type="date"
                    editable={editable}
                    className="w-36"
                    onSave={(v) => update.mutate({ id: node.id, estFinish: v === "" ? null : v })}
                  />
                  <Cell
                    label={`Actual start for ${node.title}`}
                    value={node.actualStart ?? ""}
                    type="date"
                    editable={editable}
                    className="w-36"
                    onSave={(v) => update.mutate({ id: node.id, actualStart: v === "" ? null : v })}
                  />
                  <Cell
                    label={`Actual finish for ${node.title}`}
                    value={node.actualFinish ?? ""}
                    type="date"
                    editable={editable}
                    className="w-36"
                    onSave={(v) =>
                      update.mutate({ id: node.id, actualFinish: v === "" ? null : v })
                    }
                  />

                  {editable ? (
                    <Select
                      value={node.status}
                      onValueChange={(v) => update.mutate({ id: node.id, status: v })}
                    >
                      <SelectTrigger className="h-8 w-36" aria-label={`Status of ${node.title}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="w-36 text-sm">{node.status}</span>
                  )}

                  <DelayBadge delayStatus={node.delayStatus} delayDays={node.delayDays} />

                  {editable && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={`Move ${node.title} up`}
                        onClick={() => move(node, -1)}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={`Move ${node.title} down`}
                        onClick={() => move(node, 1)}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={`Move ${node.title} under the item above`}
                        onClick={() => indent(node)}
                      >
                        <CornerDownRight className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={node.parentId === null}
                        aria-label={`Move ${node.title} out one level`}
                        onClick={() => outdent(node)}
                      >
                        <CornerLeftUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={`Delete ${node.title}`}
                        onClick={() => setDeleting(node)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  </>
                  )}
                </SortableRow>
              );
            })}
          </ul>
          </SortableContext>
          </DndContext>
        </div>
      )}

      {editable && (
        <form
          className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3"
          onSubmit={(e) => {
            e.preventDefault();
            addItem();
          }}
        >
          <div className="min-w-48 flex-1">
            <label className="text-xs text-muted-foreground" htmlFor="cf-new-title">
              Add an item
            </label>
            <Input
              id="cf-new-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Frame inspection"
              className="mt-1"
            />
          </div>
          <Select value={newType} onValueChange={setNewType}>
            <SelectTrigger className="w-40" aria-label="Type of the new item">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEM_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={create.isPending || newTitle.trim() === ""}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add
          </Button>
        </form>
      )}

      {deleting !== null && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
          title={`Delete “${deleting.title}”?`}
          description={
            deleting.children.length > 0
              ? `Everything under it goes too — ${deleting.children.length} ${
                  deleting.children.length === 1 ? "item" : "items"
                }.`
              : "This item is removed from the job's programme."
          }
          confirmLabel="Delete"
          destructive
          onConfirm={() => {
            remove.mutate(deleting.id, {
              onError: () => toast({ title: "It could not be deleted", variant: "destructive" }),
            });
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
