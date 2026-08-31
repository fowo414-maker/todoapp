"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { TODO_STATUSES, type TodoDTO, type TodoStatus } from "@/lib/types";
import { useReorderTodos } from "@/lib/queries";
import { Column } from "./Column";

function isStatus(value: string): value is TodoStatus {
  return (TODO_STATUSES as readonly string[]).includes(value);
}

function groupByStatus(todos: TodoDTO[]): Record<TodoStatus, TodoDTO[]> {
  const groups: Record<TodoStatus, TodoDTO[]> = {
    todo: [],
    doing: [],
    done: [],
  };
  for (const t of [...todos].sort((a, b) => a.order - b.order)) {
    groups[t.status].push(t);
  }
  return groups;
}

export function Board({
  todos,
  onEdit,
}: {
  todos: TodoDTO[];
  onEdit?: (todo: TodoDTO) => void;
}) {
  const reorder = useReorderTodos();
  const [activeId, setActiveId] = useState<string | null>(null);

  const groups = useMemo(() => groupByStatus(todos), [todos]);
  const byId = useMemo(
    () => new Map(todos.map((t) => [t.id, t])),
    [todos],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeTodo = byId.get(String(active.id));
    if (!activeTodo) return;

    const overId = String(over.id);
    const targetStatus: TodoStatus = isStatus(overId)
      ? overId
      : (byId.get(overId)?.status ?? activeTodo.status);
    const sourceStatus = activeTodo.status;

    const sourceIds = groups[sourceStatus].map((t) => t.id);
    const targetIds = groups[targetStatus].map((t) => t.id);

    if (sourceStatus === targetStatus) {
      const oldIndex = sourceIds.indexOf(activeTodo.id);
      const newIndex = isStatus(overId)
        ? sourceIds.length - 1
        : targetIds.indexOf(overId);
      if (oldIndex === newIndex || newIndex < 0) return;
      const ordered = arrayMove(sourceIds, oldIndex, newIndex);
      reorder.mutate({ status: sourceStatus, orderedIds: ordered });
      return;
    }

    // 컬럼 간 이동
    const nextSource = sourceIds.filter((id) => id !== activeTodo.id);
    const insertAt = isStatus(overId)
      ? targetIds.length
      : Math.max(0, targetIds.indexOf(overId));
    const nextTarget = [
      ...targetIds.slice(0, insertAt),
      activeTodo.id,
      ...targetIds.slice(insertAt),
    ];

    reorder.mutate({
      status: targetStatus,
      orderedIds: nextTarget,
      move: { id: activeTodo.id, toStatus: targetStatus },
      columns: [
        { status: sourceStatus, orderedIds: nextSource },
        { status: targetStatus, orderedIds: nextTarget },
      ],
    });
  }

  const activeTodo = activeId ? byId.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid gap-3 sm:grid-cols-3" data-testid="board">
        {TODO_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            todos={groups[status]}
            onEdit={onEdit}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTodo ? (
          <div className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-lg">
            {activeTodo.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default Board;
