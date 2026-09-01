"use client";

import { useMemo, useState } from "react";
import { Board } from "@/components/board/Board";
import { TodoDialog } from "@/components/board/TodoDialog";
import { WeekProgressBar } from "@/components/week/WeekProgressBar";
import { WeeklyPlanList } from "@/components/week/WeeklyPlanList";
import { Filters, useTodoFilter } from "@/components/common/Filters";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/common/Skeleton";
import { useTodos, useWeeklyPlans, useYearGoals } from "@/lib/queries";
import { currentWeekStart, shiftWeek, toDateString } from "@/lib/dates";
import type { TodoDTO } from "@/lib/types";

export function WeekView() {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStartDate = useMemo(
    () => shiftWeek(currentWeekStart(), weekOffset),
    [weekOffset],
  );
  const weekStart = weekStartDate.toISOString();

  const weekDates = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(weekStartDate);
      d.setUTCDate(d.getUTCDate() + i);
      set.add(toDateString(d));
    }
    return set;
  }, [weekStartDate]);

  const todosQuery = useTodos({});
  const plansQuery = useWeeklyPlans(weekStart);
  const goalsQuery = useYearGoals();

  const weekTodos = useMemo(
    () => (todosQuery.data ?? []).filter((t) => t.date && weekDates.has(t.date)),
    [todosQuery.data, weekDates],
  );

  const planIds = useMemo(
    () => new Set((plansQuery.data ?? []).map((p) => p.id)),
    [plansQuery.data],
  );
  const { filter, setFilter, apply } = useTodoFilter();
  const visibleTodos = useMemo(
    () => apply(weekTodos, planIds),
    [apply, weekTodos, planIds],
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TodoDTO | null>(null);

  const rangeLabel = `${toDateString(weekStartDate)} ~ ${toDateString(
    new Date(weekStartDate.getTime() + 6 * 86_400_000),
  )}`;

  const navBtn =
    "rounded-md border border-line-strong px-2 py-1 text-sm text-ink-soft hover:bg-raised hover:text-ink";

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-ink">주간 계획</h1>
          <span className="text-sm text-ink-soft">{rangeLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekOffset((o) => o - 1)}
            className={navBtn}
          >
            이전 주
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className={navBtn}
          >
            이번 주
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset((o) => o + 1)}
            className={navBtn}
          >
            다음 주
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="rounded-md bg-accent px-3 py-1 text-sm text-white hover:bg-accent-hover"
          >
            + 할 일
          </button>
        </div>
      </header>

      <WeekProgressBar todos={weekTodos} />

      <WeeklyPlanList
        weekStart={weekStart}
        plans={plansQuery.data ?? []}
        yearGoals={goalsQuery.data ?? []}
      />

      <Filters value={filter} onChange={setFilter} />

      {todosQuery.isLoading ? (
        <Skeleton rows={4} />
      ) : todosQuery.isError ? (
        <p role="alert" className="text-sm text-red-600">
          할 일을 불러오지 못했습니다. 새로고침 해주세요.
        </p>
      ) : weekTodos.length === 0 ? (
        <EmptyState message="이번 주 할 일이 없습니다. “+ 할 일”로 추가하세요." />
      ) : (
        <Board
          todos={visibleTodos}
          onEdit={(t) => {
            setEditing(t);
            setDialogOpen(true);
          }}
        />
      )}

      {dialogOpen ? (
        <TodoDialog
          key={editing?.id ?? "new"}
          onClose={() => setDialogOpen(false)}
          todo={editing}
          defaultDate={toDateString(weekStartDate)}
          weeklyPlans={plansQuery.data ?? []}
        />
      ) : null}
    </section>
  );
}

export default WeekView;
