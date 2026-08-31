"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { WeekProgressBar } from "@/components/week/WeekProgressBar";
import {
  useCreateYearGoal,
  useDeleteYearGoal,
  useWeeklyPlans,
  useYearGoals,
} from "@/lib/queries";
import { toDateString } from "@/lib/dates";
import type { ProgressSummary, WeeklyPlanDTO } from "@/lib/types";

/** 목표에 연결된 주간 계획들의 진행률 평균(롤업). */
export function rollupProgress(plans: WeeklyPlanDTO[]): ProgressSummary {
  if (plans.length === 0) return { done: 0, total: 0, ratio: 0 };
  const done = plans.reduce((s, p) => s + p.progress.done, 0);
  const total = plans.reduce((s, p) => s + p.progress.total, 0);
  return { done, total, ratio: total === 0 ? 0 : done / total };
}

export function YearView() {
  const goalsQuery = useYearGoals();
  const plansQuery = useWeeklyPlans();
  const createGoal = useCreateYearGoal();
  const deleteGoal = useDeleteYearGoal();

  const [title, setTitle] = useState("");
  const [year, setYear] = useState(new Date().getUTCFullYear());

  const plansByGoal = useMemo(() => {
    const map = new Map<string, WeeklyPlanDTO[]>();
    for (const p of plansQuery.data ?? []) {
      if (!p.yearGoalId) continue;
      const bucket = map.get(p.yearGoalId);
      if (bucket) bucket.push(p);
      else map.set(p.yearGoalId, [p]);
    }
    return map;
  }, [plansQuery.data]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createGoal.mutateAsync({ title: title.trim(), year });
    setTitle("");
  }

  async function handleDelete(id: string) {
    if (
      !window.confirm(
        "이 1년 목표를 삭제할까요? 연결된 주간 계획은 연결만 해제됩니다.",
      )
    )
      return;
    await deleteGoal.mutateAsync(id);
  }

  const goals = goalsQuery.data ?? [];

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">1년 목표</h1>

      <form
        onSubmit={handleAdd}
        className="flex flex-wrap gap-2 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="새 1년 목표"
          className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-24 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={!title.trim() || createGoal.isPending}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          추가
        </button>
      </form>

      {goalsQuery.isLoading ? (
        <p className="text-sm text-neutral-500">불러오는 중…</p>
      ) : goals.length === 0 ? (
        <EmptyState message="아직 1년 목표가 없습니다." />
      ) : (
        <ul className="space-y-3">
          {goals.map((goal) => {
            const plans = plansByGoal.get(goal.id) ?? [];
            return (
              <li
                key={goal.id}
                data-testid="year-goal"
                className="rounded-lg border border-neutral-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {goal.title}{" "}
                      <span className="text-sm text-neutral-400">
                        {goal.year}
                      </span>
                    </p>
                    {goal.description ? (
                      <p className="text-sm text-neutral-500">
                        {goal.description}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(goal.id)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    삭제
                  </button>
                </div>

                <div className="mt-3">
                  <WeekProgressBar
                    progress={rollupProgress(plans)}
                    label="연간 롤업 진행률"
                  />
                </div>

                <ul className="mt-3 space-y-1">
                  {plans.length === 0 ? (
                    <li className="text-xs text-neutral-400">
                      연결된 주간 계획 없음
                    </li>
                  ) : (
                    plans
                      .slice()
                      .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
                      .map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-neutral-600">
                            {toDateString(p.weekStart)} · {p.title}
                          </span>
                          <span className="text-xs text-neutral-400 tabular-nums">
                            {p.progress.done}/{p.progress.total}
                          </span>
                        </li>
                      ))
                  )}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default YearView;
