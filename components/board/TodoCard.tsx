"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { STATUS_LABELS, type TodoDTO } from "@/lib/types";
import { useDeleteTodo } from "@/lib/queries";
import {
  ContextMenu,
  useContextMenu,
  type MenuAction,
} from "@/components/common/ContextMenu";

/**
 * 카드의 시각적 본문. 정렬용 `<li>` 안에서도, 드래그 중 `DragOverlay` 안에서도
 * 똑같이 쓰인다 (들어올렸을 때 요약되지 않고 카드 그대로 보이도록).
 */
export function TodoCardContent({
  todo,
  dragging = false,
}: {
  todo: TodoDTO;
  dragging?: boolean;
}) {
  const done = todo.status === "done";

  return (
    <div
      className={`rounded-md border bg-surface px-3 py-2 text-sm ${
        done ? "border-line" : "border-line-strong"
      } ${dragging ? "shadow-lg" : "shadow-sm"}`}
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
      <p className="mt-1 text-[11px] text-ink-faint">
        {todo.date ? `📅 ${todo.date}` : "기한 없음"} ·{" "}
        {STATUS_LABELS[todo.status]}
      </p>
    </div>
  );
}

export function TodoCard({
  todo,
  onEdit,
}: {
  todo: TodoDTO;
  onEdit?: (todo: TodoDTO) => void;
}) {
  // transition: null → 재정렬 시 슬라이드 모션 없이 즉시 위치가 바뀐다.
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id: todo.id, transition: null });

  const remove = useDeleteTodo();
  const menu = useContextMenu();

  const actions: MenuAction[] = [];
  if (onEdit) actions.push({ label: "편집", onSelect: () => onEdit(todo) });
  actions.push({
    label: "삭제",
    danger: true,
    onSelect: () => {
      if (window.confirm("이 할 일을 삭제할까요?")) remove.mutate(todo.id);
    },
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform) }}
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
      <TodoCardContent todo={todo} />
      <ContextMenu
        position={menu.state}
        onClose={menu.close}
        actions={actions}
      />
    </li>
  );
}

export default TodoCard;
