"use client";

import { useState } from "react";
import { useDndContext } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type TodoDTO, type WeeklyPlanDTO } from "@/lib/types";
import { TODO_COLOR_HEX, TODO_COLOR_BG_HEX } from "@/lib/todoColors";
import { useDeleteTodo } from "@/lib/queries";
import {
  ContextMenu,
  useContextMenu,
  type MenuAction,
} from "@/components/common/ContextMenu";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

/**
 * 카드의 시각적 본문. 정렬용 `<li>` 안에서도, 드래그 중 `DragOverlay` 안에서도
 * 똑같이 쓰인다 (들어올렸을 때 요약되지 않고 카드 그대로 보이도록).
 */
export function TodoCardContent({
  todo,
  dragging = false,
  weeklyPlans = [],
}: {
  todo: TodoDTO;
  dragging?: boolean;
  weeklyPlans?: WeeklyPlanDTO[];
}) {
  const done = todo.status === "done";
  const hasColor = todo.color !== "none";
  const weeklyPlanTitle = todo.weeklyPlanId
    ? weeklyPlans.find((p) => p.id === todo.weeklyPlanId)?.title
    : undefined;

  return (
    <div
      className={`rounded-md border px-3 py-2 text-sm ${
        hasColor ? "border-l-4" : "bg-surface"
      } ${done ? "border-line" : "border-line-strong"} ${
        dragging ? "shadow-lg" : "shadow-sm"
      }`}
      style={
        hasColor
          ? {
              borderLeftColor: TODO_COLOR_HEX[todo.color],
              backgroundColor: TODO_COLOR_BG_HEX[todo.color],
            }
          : undefined
      }
    >
      <p
        className={`truncate font-medium ${
          done ? "text-ink-faint line-through" : "text-ink"
        }`}
      >
        {done ? "✓ " : ""}
        {todo.title}
      </p>
      {todo.description ? (
        <p className="mt-0.5 truncate text-xs text-ink-soft">
          {todo.description}
        </p>
      ) : null}
      {todo.date ? (
        <p className="mt-1 text-[11px] text-ink-faint">📅 {todo.date}</p>
      ) : null}
      {weeklyPlanTitle ? (
        <p className="mt-1 truncate text-[11px] text-ink-faint">
          {weeklyPlanTitle}
        </p>
      ) : null}
    </div>
  );
}

export function TodoCard({
  todo,
  onEdit,
  weeklyPlans = [],
}: {
  todo: TodoDTO;
  onEdit?: (todo: TodoDTO) => void;
  weeklyPlans?: WeeklyPlanDTO[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });
  // 다른 카드가 밀려나는 드래그 중 모션만 남기고, 드롭 순간 새 순서로
  // 자리 잡을 때 재생되는 스냅 애니메이션은 끈다.
  const { active } = useDndContext();
  const isAnyDragActive = active != null;

  const remove = useDeleteTodo();
  const menu = useContextMenu();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const actions: MenuAction[] = [];
  if (onEdit) actions.push({ label: "편집", onSelect: () => onEdit(todo) });
  actions.push({
    label: "삭제",
    danger: true,
    onSelect: () => setConfirmDelete(true),
  });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isAnyDragActive ? transition : undefined,
      }}
      data-testid="todo-card"
      data-todo-id={todo.id}
      data-status={todo.status}
      data-completed={todo.status === "done" ? "true" : "false"}
      onContextMenu={(e) => menu.open(e, undefined)}
      className={`cursor-default touch-none rounded-md ${
        isDragging ? "opacity-40" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <TodoCardContent todo={todo} weeklyPlans={weeklyPlans} />
      <ContextMenu
        position={menu.state}
        onClose={menu.close}
        actions={actions}
      />
      {confirmDelete ? (
        <ConfirmDialog
          title="할 일 삭제"
          message={`"${todo.title}" 할 일을 삭제할까요?`}
          confirmLabel="삭제"
          onConfirm={() => remove.mutate(todo.id)}
          onClose={() => setConfirmDelete(false)}
        />
      ) : null}
    </li>
  );
}

export default TodoCard;
