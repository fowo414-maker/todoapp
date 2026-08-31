"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { STATUS_LABELS, type TodoDTO } from "@/lib/types";

export function TodoCard({
  todo,
  onEdit,
}: {
  todo: TodoDTO;
  onEdit?: (todo: TodoDTO) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const done = todo.status === "done";

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-testid="todo-card"
      data-todo-id={todo.id}
      data-status={todo.status}
      data-completed={done ? "true" : "false"}
      className={`group rounded-md border bg-white px-3 py-2 text-sm shadow-sm ${
        isDragging ? "opacity-50" : ""
      } ${done ? "border-neutral-200" : "border-neutral-300"}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label="드래그 핸들"
          className="mt-0.5 cursor-grab touch-none text-neutral-400 hover:text-neutral-600"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={`truncate font-medium ${
              done ? "text-neutral-400 line-through" : "text-neutral-900"
            }`}
          >
            {done ? "✓ " : ""}
            {todo.title}
          </p>
          {todo.description ? (
            <p className="mt-0.5 truncate text-xs text-neutral-500">
              {todo.description}
            </p>
          ) : null}
          <p className="mt-1 text-[11px] text-neutral-400">
            {todo.date} · {STATUS_LABELS[todo.status]}
          </p>
        </div>
        {onEdit ? (
          <button
            type="button"
            onClick={() => onEdit(todo)}
            className="opacity-0 transition group-hover:opacity-100 text-xs text-neutral-500 hover:text-neutral-800"
          >
            편집
          </button>
        ) : null}
      </div>
    </li>
  );
}

export default TodoCard;
