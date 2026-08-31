"use client";

import { useMemo, useState } from "react";
import { TodoDialog } from "@/components/board/TodoDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/common/Skeleton";
import {
  useTodos,
  useUpdateTodo,
  useWeeklyPlans,
} from "@/lib/queries";
import { toDateString } from "@/lib/dates";
import { TODO_STATUSES, type TodoDTO, type TodoStatus } from "@/lib/types";

const STATUS_LABEL: Record<TodoStatus, string> = {
  todo: "할 일",
  doing: "진행 중",
  done: "완료",
};

export function DayView() {
  const [date, setDate] = useState(() => toDateString(new Date()));
  const todosQuery = useTodos({ date });
  const plansQuery = useWeeklyPlans();
  const update = useUpdateTodo();

  const planTitle = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of plansQuery.data ?? []) map.set(p.id, p.title);
    return map;
  }, [plansQuery.data]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TodoDTO | null>(null);

  const todos = todosQuery.data ?? [];

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">일일</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="rounded-md bg-neutral-900 px-3 py-1 text-sm text-white"
          >
            + 할 일
          </button>
        </div>
      </header>

      {todosQuery.isLoading ? (
        <Skeleton rows={4} />
      ) : todosQuery.isError ? (
        <p role="alert" className="text-sm text-red-600">
          불러오지 못했습니다.
        </p>
      ) : todos.length === 0 ? (
        <EmptyState message="이 날짜의 할 일이 없습니다." />
      ) : (
        <ul className="space-y-2">
          {todos.map((todo) => (
            <li
              key={todo.id}
              data-testid="day-todo"
              data-completed={todo.status === "done" ? "true" : "false"}
              className="flex items-center gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2"
            >
              <select
                aria-label="상태"
                value={todo.status}
                onChange={(e) =>
                  update.mutate({
                    id: todo.id,
                    patch: { status: e.target.value as TodoStatus },
                  })
                }
                className="rounded border border-neutral-300 px-1.5 py-1 text-xs"
              >
                {TODO_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <span
                className={`flex-1 truncate text-sm ${
                  todo.status === "done"
                    ? "text-neutral-400 line-through"
                    : ""
                }`}
              >
                {todo.title}
              </span>
              <span className="shrink-0 text-xs text-neutral-400">
                {todo.weeklyPlanId
                  ? (planTitle.get(todo.weeklyPlanId) ?? "계획")
                  : "미할당"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditing(todo);
                  setDialogOpen(true);
                }}
                className="shrink-0 text-xs text-neutral-500 hover:text-neutral-800"
              >
                편집
              </button>
            </li>
          ))}
        </ul>
      )}

      {dialogOpen ? (
        <TodoDialog
          key={editing?.id ?? "new"}
          onClose={() => setDialogOpen(false)}
          todo={editing}
          defaultDate={date}
          weeklyPlans={plansQuery.data ?? []}
        />
      ) : null}
    </section>
  );
}

export default DayView;
