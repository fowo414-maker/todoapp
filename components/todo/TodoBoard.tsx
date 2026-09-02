"use client";

import { useState } from "react";
import { Board } from "@/components/board/Board";
import { TodoDialog } from "@/components/board/TodoDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/common/Skeleton";
import { useTodos, useWeeklyPlans } from "@/lib/queries";
import { toDateString } from "@/lib/dates";
import type { TodoDTO } from "@/lib/types";

export function TodoBoard() {
  const todosQuery = useTodos({});
  const plansQuery = useWeeklyPlans();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TodoDTO | null>(null);

  const todos = todosQuery.data ?? [];

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-ink">할 일</h1>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="rounded-md border border-transparent bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-hover"
        >
          + 할 일
        </button>
      </header>

      {todosQuery.isLoading ? (
        <Skeleton rows={5} />
      ) : todosQuery.isError ? (
        <p role="alert" className="text-sm text-red-600">
          불러오지 못했습니다.
        </p>
      ) : todos.length === 0 ? (
        <EmptyState message="할 일이 없습니다. “+ 할 일”로 추가하세요." />
      ) : (
        <Board
          fill
          todos={todos}
          weeklyPlans={plansQuery.data ?? []}
          onEdit={(t) => {
            setEditing(t);
            setDialogOpen(true);
          }}
        />
      )}

      {dialogOpen ? (
        <TodoDialog
          key={editing?.id ?? "new"}
          deadlineOptional
          onClose={() => setDialogOpen(false)}
          todo={editing}
          defaultDate={toDateString(new Date())}
          weeklyPlans={plansQuery.data ?? []}
        />
      ) : null}
    </section>
  );
}

export default TodoBoard;
