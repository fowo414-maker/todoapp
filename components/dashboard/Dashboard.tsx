"use client";

import { useMemo } from "react";
import Link from "next/link";
import { WeekProgressBar } from "@/components/week/WeekProgressBar";
import { Skeleton } from "@/components/common/Skeleton";
import { rollupProgress } from "@/components/year/YearView";
import { useTodos, useWeeklyPlans, useYearGoals } from "@/lib/queries";
import { currentWeekStart, parseDateString, toDateString } from "@/lib/dates";
import {
  STATUS_LABELS,
  TODO_STATUSES,
  type TodoDTO,
  type WeeklyPlanDTO,
} from "@/lib/types";

/** 기한 임박 판정 기준: 오늘부터 이 일수 이내(지난 기한 포함)면 임박으로 본다. */
const UPCOMING_DEADLINE_DAYS = 3;
const MS_PER_DAY = 86_400_000;

function daysUntil(dateStr: string, today: Date): number {
  return Math.round(
    (parseDateString(dateStr).getTime() - today.getTime()) / MS_PER_DAY,
  );
}

function deadlineLabel(days: number): string {
  if (days < 0) return `${-days}일 지남`;
  if (days === 0) return "오늘 마감";
  if (days === 1) return "내일 마감";
  return `${days}일 남음`;
}

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

  const upcomingDeadlineTodos = useMemo(() => {
    const todayDate = parseDateString(toDateString(new Date()));
    return todos
      .filter(
        (t): t is TodoDTO & { date: string } =>
          t.date !== null && t.status !== "done",
      )
      .map((t) => ({ todo: t, days: daysUntil(t.date, todayDate) }))
      .filter(({ days }) => days <= UPCOMING_DEADLINE_DAYS)
      .sort((a, b) => a.days - b.days);
  }, [todos]);

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

      <div
        className={`rounded-lg border p-4 ${
          upcomingDeadlineTodos.length > 0
            ? "border-red-200 bg-red-50"
            : "border-line bg-surface"
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">
            기한 임박{" "}
            <span className="text-xs font-normal text-ink-faint">
              ({UPCOMING_DEADLINE_DAYS}일 이내)
            </span>
          </h2>
          <Link
            href="/todo"
            className="text-xs text-ink-soft underline hover:text-ink"
          >
            할 일 보기
          </Link>
        </div>
        {upcomingDeadlineTodos.length === 0 ? (
          <p className="text-xs text-ink-faint">
            기한이 임박한 할 일이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcomingDeadlineTodos.map(({ todo: t, days }) => (
              <li
                key={t.id}
                data-testid="upcoming-deadline-todo"
                className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2"
              >
                <span className="truncate text-sm text-ink">{t.title}</span>
                <span
                  className={`shrink-0 text-xs tabular-nums ${
                    days <= 0 ? "font-medium text-red-600" : "text-ink-soft"
                  }`}
                >
                  {t.date} · {deadlineLabel(days)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

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
