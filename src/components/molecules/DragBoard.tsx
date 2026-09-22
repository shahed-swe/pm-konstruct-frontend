"use client";

/**
 * A board whose cards can be dragged between columns.
 *
 * `@dnd-kit` rather than the HTML5 drag API the legacy used, for one
 * reason: the HTML5 one does nothing at all on a touch screen, and this is
 * a board supervisors use on a phone. dnd-kit drives pointer, touch and
 * keyboard from the same code, so the card can also be moved with the arrow
 * keys once it has focus.
 *
 * Dragging is how it looks and feels; the buttons on each card are still
 * there, because a small target on a moving truck is not a fair ask.
 */
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function DragCard({
  id,
  children,
  disabled = false,
}: {
  id: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(isDragging && "opacity-60 shadow-lg")}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}

export function DropColumn({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(className, isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background")}
    >
      {children}
    </div>
  );
}

export function DragBoard({
  children,
  onMove,
}: {
  children: ReactNode;
  /** `(cardId, columnId)` once a card is dropped somewhere new. */
  onMove: (cardId: string, columnId: string) => void;
}) {
  const sensors = useSensors(
    // 6px before a drag starts, so tapping a card to open it still works.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragEnd(event: DragEndEvent) {
    const column = event.over?.id;
    if (column === undefined) return;
    onMove(String(event.active.id), String(column));
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {children}
    </DndContext>
  );
}
