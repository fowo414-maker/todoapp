"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  TODO_STATUSES,
  type TodoDTO,
  type TodoStatus,
  type WeeklyPlanDTO,
} from "@/lib/types";
import { useReorderTodos } from "@/lib/queries";
import { Column } from "./Column";
import { TodoCardContent } from "./TodoCard";

function isStatus(value: string): value is TodoStatus {
  return (TODO_STATUSES as readonly string[]).includes(value);
}

// 컬럼 간 이동 중 카드가 실시간으로 밀려나면서 레이아웃이 계속 바뀌므로,
// 드롭 대상 판정이 프리뷰와 어긋나지 않도록 드롭 영역을 계속 다시 측정한다.
const measuring = {
  droppable: { strategy: MeasuringStrategy.Always },
};

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
  fill = false,
  weeklyPlans = [],
}: {
  todos: TodoDTO[];
  onEdit?: (todo: TodoDTO) => void;
  /** true 면 보드가 화면 높이를 채우도록 컬럼을 길게 늘린다 (할 일 화면). */
  fill?: boolean;
  weeklyPlans?: WeeklyPlanDTO[];
}) {
  const reorder = useReorderTodos();
  const [activeId, setActiveId] = useState<string | null>(null);
  // 드래그 중에만 존재: 컬럼을 넘나들 때 실시간으로 카드를 옮겨서
  // 대상 컬럼의 카드들이 자리를 내주며 밀려나는 프리뷰를 보여준다.
  const [dragGroups, setDragGroups] = useState<Record<
    TodoStatus,
    TodoDTO[]
  > | null>(null);

  const groups = useMemo(() => groupByStatus(todos), [todos]);
  const byId = useMemo(
    () => new Map(todos.map((t) => [t.id, t])),
    [todos],
  );
  const displayGroups = dragGroups ?? groups;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function statusOf(
    source: Record<TodoStatus, TodoDTO[]>,
    id: string,
  ): TodoStatus | undefined {
    return TODO_STATUSES.find((s) => source[s].some((t) => t.id === id));
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setDragGroups({
      todo: [...groups.todo],
      doing: [...groups.doing],
      done: [...groups.done],
    });
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    setDragGroups((prev) => {
      if (!prev) return prev;
      const draggedId = String(active.id);
      const overId = String(over.id);

      const activeStatus = statusOf(prev, draggedId);
      if (!activeStatus) return prev;
      const overStatus: TodoStatus = isStatus(overId)
        ? overId
        : (statusOf(prev, overId) ?? activeStatus);

      // 같은 컬럼 내 재정렬 프리뷰는 dnd-kit sortable strategy가 알아서 그려준다.
      if (activeStatus === overStatus) return prev;

      const activeItems = prev[activeStatus];
      const overItems = prev[overStatus];
      const activeIndex = activeItems.findIndex((t) => t.id === draggedId);
      if (activeIndex < 0) return prev;

      let insertAt = overItems.length;
      if (!isStatus(overId)) {
        const overIndex = overItems.findIndex((t) => t.id === overId);
        if (overIndex >= 0) {
          const activeRect =
            active.rect.current.translated ?? active.rect.current.initial;
          const isBelowOverItem =
            activeRect != null &&
            activeRect.top > over.rect.top + over.rect.height / 2;
          insertAt = isBelowOverItem ? overIndex + 1 : overIndex;
        }
      }

      const movedTodo = { ...activeItems[activeIndex], status: overStatus };
      return {
        ...prev,
        [activeStatus]: activeItems.filter((t) => t.id !== draggedId),
        [overStatus]: [
          ...overItems.slice(0, insertAt),
          movedTodo,
          ...overItems.slice(insertAt),
        ],
      };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const finalGroups = dragGroups ?? groups;
    setActiveId(null);

    if (!over) {
      setDragGroups(null);
      return;
    }

    const activeTodo = byId.get(String(active.id));
    if (!activeTodo) {
      setDragGroups(null);
      return;
    }

    const sourceStatus = activeTodo.status;
    const targetStatus = statusOf(finalGroups, activeTodo.id) ?? sourceStatus;

    if (sourceStatus === targetStatus) {
      const overId = String(over.id);
      const sourceIds = groups[sourceStatus].map((t) => t.id);
      const oldIndex = sourceIds.indexOf(activeTodo.id);
      const newIndex = isStatus(overId)
        ? sourceIds.length - 1
        : sourceIds.indexOf(overId);
      if (oldIndex === newIndex || newIndex < 0) {
        setDragGroups(null);
        return;
      }
      const ordered = arrayMove(sourceIds, oldIndex, newIndex);
      // 낙관적 업데이트가 캐시에 반영될 때까지 방금 계산한 최종 순서를 계속
      // 보여준다. 여기서 바로 null 로 지우면 화면이 아직 갱신 전인 todos
      // (원래 순서)로 잠깐 되돌아갔다가 다시 바뀌는 깜빡임이 생긴다.
      setDragGroups({
        ...finalGroups,
        [sourceStatus]: ordered.map((id) => byId.get(id)!),
      });
      reorder.mutate(
        { status: sourceStatus, orderedIds: ordered },
        { onSettled: () => setDragGroups(null) },
      );
      return;
    }

    // 컬럼 간 이동: 드래그 중 실시간으로 밀려난 최종 순서를 그대로 반영
    const sourceIds = groups[sourceStatus]
      .map((t) => t.id)
      .filter((id) => id !== activeTodo.id);
    const targetIds = finalGroups[targetStatus].map((t) => t.id);

    setDragGroups(finalGroups);
    reorder.mutate(
      {
        status: targetStatus,
        orderedIds: targetIds,
        move: { id: activeTodo.id, toStatus: targetStatus },
        columns: [
          { status: sourceStatus, orderedIds: sourceIds },
          { status: targetStatus, orderedIds: targetIds },
        ],
      },
      { onSettled: () => setDragGroups(null) },
    );
  }

  const activeTodo = activeId ? byId.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      measuring={measuring}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setDragGroups(null);
      }}
    >
      <div
        className={`grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-10 ${
          fill ? "sm:min-h-[calc(100vh-12rem)]" : ""
        }`}
        data-testid="board"
      >
        {TODO_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            todos={displayGroups[status]}
            onEdit={onEdit}
            fill={fill}
            weeklyPlans={weeklyPlans}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTodo ? (
          <TodoCardContent todo={activeTodo} dragging weeklyPlans={weeklyPlans} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default Board;
