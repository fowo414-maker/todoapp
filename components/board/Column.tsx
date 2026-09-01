"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { type TodoDTO, type TodoStatus } from "@/lib/types";
import { TodoCard } from "./TodoCard";

// 세 파트를 회색 진함 차이로 구분한다 (todo → done 로 갈수록 진해짐).
const HEADER_SHADE: Record<TodoStatus, string> = {
  todo: "bg-black/[0.03]",
  doing: "bg-black/[0.06]",
  done: "bg-black/[0.10]",
};

export function Column({
  status,
  todos,
  onEdit,
  fill = false,
}: {
  status: TodoStatus;
  todos: TodoDTO[];
  onEdit?: (todo: TodoDTO) => void;
  fill?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      data-testid={`column-${status}`}
      data-status={status}
      className={`flex flex-col overflow-hidden rounded-lg border transition-colors ${
        fill ? "min-h-[20rem]" : "min-h-[12rem]"
      } ${isOver ? "border-line-strong" : "border-line"}`}
    >
      <div
        className={`flex items-center gap-2 px-3 py-2 ${HEADER_SHADE[status]}`}
      >
        <h3 className="font-mono text-sm font-semibold lowercase text-ink">
          {status}
        </h3>
        <span className="text-xs text-ink-faint tabular-nums">
          {todos.length}
        </span>
      </div>
      <div
        className={`flex flex-1 flex-col p-2.5 ${
          isOver ? "bg-raised/70" : "bg-surface/40"
        }`}
      >
        <SortableContext
          items={todos.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="flex flex-1 flex-col gap-2">
            {todos.length === 0 ? (
              <li className="flex flex-1 items-center justify-center rounded-md border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                여기로 드래그
              </li>
            ) : (
              todos.map((todo) => (
                <TodoCard key={todo.id} todo={todo} onEdit={onEdit} />
              ))
            )}
          </ul>
        </SortableContext>
      </div>
    </div>
  );
}

export default Column;
