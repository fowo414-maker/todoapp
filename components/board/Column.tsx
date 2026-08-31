"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { TodoDTO, TodoStatus } from "@/lib/types";
import { TodoCard } from "./TodoCard";

const TITLE: Record<TodoStatus, string> = {
  todo: "할 일",
  doing: "진행 중",
  done: "완료",
};

export function Column({
  status,
  todos,
  onEdit,
}: {
  status: TodoStatus;
  todos: TodoDTO[];
  onEdit?: (todo: TodoDTO) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      data-testid={`column-${status}`}
      data-status={status}
      className={`flex min-h-[8rem] flex-col rounded-lg border p-3 transition-colors ${
        isOver
          ? "border-neutral-400 bg-neutral-100"
          : "border-neutral-200 bg-neutral-50"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{TITLE[status]}</h3>
        <span className="text-xs text-neutral-400">{todos.length}</span>
      </div>
      <SortableContext
        items={todos.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-1 flex-col gap-2">
          {todos.length === 0 ? (
            <li className="rounded-md border border-dashed border-neutral-300 px-3 py-6 text-center text-xs text-neutral-400">
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
  );
}

export default Column;
