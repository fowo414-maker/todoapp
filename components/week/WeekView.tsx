"use client";

import { useMemo, useState } from "react";
import { Board } from "@/components/board/Board";
import { TodoDialog } from "@/components/board/TodoDialog";
import { WeekProgressBar } from "@/components/week/WeekProgressBar";
import { WeeklyPlanList } from "@/components/week/WeeklyPlanList";
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

  const todosQuery = useTodos({});
  const plansQuery = useWeeklyPlans(weekStart);
  const goalsQuery = useYearGoals();

  const planIds = useMemo(
    () => new Set((plansQuery.data ?? []).map((p) => p.id)),
    [plansQuery.data],
  );

  // 기한(date)이 아니라, 이번 주 계획들 중 하나에 할당된 할 일만 보여준다.
  const weekTodos = useMemo(
    () =>
      (todosQuery.data ?? []).filter(
        (t) => t.weeklyPlanId !== null && planIds.has(t.weeklyPlanId),
      ),
    [todosQuery.data, planIds],
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TodoDTO | null>(null);

  const rangeLabel = `${toDateString(weekStartDate)} ~ ${toDateString(
    new Date(weekStartDate.getTime() + 6 * 86_400_000),
  )}`;

  const navBtn =
    "rounded-md border border-line-strong px-3 py-1.5 text-sm text-ink-soft hover:bg-raised hover:text-ink";

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
            <span aria-hidden className="mr-1.5 text-[0.7em]">
              ◀
            </span>
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
            <span aria-hidden className="ml-1.5 text-[0.7em]">
              ▶
            </span>
          </button>
          <button
            type="button"
            disabled={(plansQuery.data ?? []).length === 0}
            title={
              (plansQuery.data ?? []).length === 0
                ? "먼저 주간 계획을 추가하세요"
                : undefined
            }
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="rounded-md border border-transparent bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
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
          todos={weekTodos}
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
          requireWeeklyPlan
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
