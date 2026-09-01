"use client";

import { useMemo } from "react";
import Link from "next/link";
import { WeekProgressBar } from "@/components/week/WeekProgressBar";
import { Skeleton } from "@/components/common/Skeleton";
import { rollupProgress } from "@/components/year/YearView";
import { useTodos, useWeeklyPlans, useYearGoals } from "@/lib/queries";
import { currentWeekStart, toDateString } from "@/lib/dates";
import {
  STATUS_LABELS,
  TODO_STATUSES,
  type WeeklyPlanDTO,
} from "@/lib/types";

export function Dashboard() {
  const todosQuery = useTodos({});
  const plansQuery = useWeeklyPlans();
  const goalsQuery = useYearGoals();

  const weekStartDate = useMemo(() => currentWeekStart(), []);
  const weekDates = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(weekStartDate);
      d.setUTCDate(d.getUTCDate() + i);
      set.add(toDateString(d));
    }
    return set;
  }, [weekStartDate]);

  const todos = useMemo(() => todosQuery.data ?? [], [todosQuery.data]);
  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const goals = goalsQuery.data ?? [];

  const weekTodos = useMemo(
    () => todos.filter((t) => t.date && weekDates.has(t.date)),
    [todos, weekDates],
  );

  const thisWeekPlans = useMemo(
    () =>
      plans.filter(
        (p) => toDateString(p.weekStart) === toDateString(weekStartDate),
      ),
    [plans, weekStartDate],
  );

  const plansByGoal = useMemo(() => {
    const map = new Map<string, WeeklyPlanDTO[]>();
    for (const p of plans) {
      if (!p.yearGoalId) continue;
      const bucket = map.get(p.yearGoalId);
      if (bucket) bucket.push(p);
      else map.set(p.yearGoalId, [p]);
    }
    return map;
  }, [plans]);

  const statusCounts = useMemo(
    () =>
      TODO_STATUSES.map((status) => ({
        status,
        label: STATUS_LABELS[status],
        count: todos.filter((t) => t.status === status).length,
      })),
    [todos],
  );

  const loading =
    todosQuery.isLoading || plansQuery.isLoading || goalsQuery.isLoading;

  if (loading) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ink">대시보드</h1>
        <Skeleton rows={6} />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">대시보드</h1>

      <div className="rounded-lg border border-line bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">이번 주 진행률</h2>
          <Link
            href="/week"
            className="text-xs text-ink-soft underline hover:text-ink"
          >
            주간 보기
          </Link>
        </div>
        <WeekProgressBar todos={weekTodos} />
        <p className="mt-2 text-xs text-ink-faint">
          이번 주 계획 {thisWeekPlans.length}개 · 기한이 이번 주인 할 일{" "}
          {weekTodos.length}개
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">할 일 현황</h2>
          <Link
            href="/todo"
            className="text-xs text-ink-soft underline hover:text-ink"
          >
            할 일 보기
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statusCounts.map((s) => (
            <div
              key={s.status}
              className="rounded-lg border border-line bg-surface p-4"
            >
              <p className="text-xs text-ink-soft">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold text-ink tabular-nums">
                {s.count}
              </p>
            </div>
          ))}
          <div className="rounded-lg border border-line bg-surface p-4">
            <p className="text-xs text-ink-soft">전체</p>
            <p className="mt-1 text-2xl font-semibold text-ink tabular-nums">
              {todos.length}
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">1년 목표</h2>
          <Link
            href="/year"
            className="text-xs text-ink-soft underline hover:text-ink"
          >
            목표 보기
          </Link>
        </div>
        {goals.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong bg-surface px-4 py-6 text-center text-sm text-ink-soft">
            아직 1년 목표가 없습니다.
          </p>
        ) : (
          <ul className="space-y-3">
            {goals.map((goal) => {
              const goalPlans = plansByGoal.get(goal.id) ?? [];
              return (
                <li
                  key={goal.id}
                  className="rounded-lg border border-line bg-surface p-4"
                >
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <p className="font-medium text-ink">
                      {goal.title}{" "}
                      <span className="text-sm text-ink-faint">
                        {goal.year}
                      </span>
                    </p>
                    <span className="shrink-0 text-xs text-ink-faint">
                      주간 계획 {goalPlans.length}개
                    </span>
                  </div>
                  <WeekProgressBar
                    progress={rollupProgress(goalPlans)}
                    label="연간 롤업 진행률"
                    showCount={false}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

export default Dashboard;
