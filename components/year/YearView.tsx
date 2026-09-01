"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/common/Skeleton";
import { WeekProgressBar } from "@/components/week/WeekProgressBar";
import {
  useCreateYearGoal,
  useDeleteYearGoal,
  useWeeklyPlans,
  useYearGoals,
} from "@/lib/queries";
import { toDateString } from "@/lib/dates";
import { ContextMenu, useContextMenu } from "@/components/common/ContextMenu";
import type { ProgressSummary, WeeklyPlanDTO } from "@/lib/types";

/**
 * 목표에 연결된 주간 계획들의 "주간 진행률 평균" (계획별 ratio 의 산술 평균).
 * done/total 은 참고용 합계로 함께 제공한다.
 */
export function rollupProgress(plans: WeeklyPlanDTO[]): ProgressSummary {
  if (plans.length === 0) return { done: 0, total: 0, ratio: 0 };
  const done = plans.reduce((s, p) => s + p.progress.done, 0);
  const total = plans.reduce((s, p) => s + p.progress.total, 0);
  const ratio =
    plans.reduce((s, p) => s + p.progress.ratio, 0) / plans.length;
  return { done, total, ratio };
}

export function YearView() {
  const goalsQuery = useYearGoals();
  const plansQuery = useWeeklyPlans();
  const createGoal = useCreateYearGoal();
  const deleteGoal = useDeleteYearGoal();

  const [title, setTitle] = useState("");
  const [year, setYear] = useState(new Date().getUTCFullYear());
  const menu = useContextMenu<string>();

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
    try {
      await createGoal.mutateAsync({ title: title.trim(), year });
      setTitle("");
    } catch {
      // onError 토스트가 처리
    }
  }

  async function handleDelete(id: string) {
    if (
      !window.confirm(
        "이 1년 목표를 삭제할까요? 연결된 주간 계획은 연결만 해제됩니다.",
      )
    )
      return;
    try {
      await deleteGoal.mutateAsync(id);
    } catch {
      // onError 토스트가 처리
    }
  }

  const goals = goalsQuery.data ?? [];

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-ink">1년 목표</h1>

      <form
        onSubmit={handleAdd}
        className="flex flex-wrap gap-2 rounded-lg border border-line bg-surface p-4"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="새 1년 목표"
          className="flex-1 rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-ink"
        />
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-24 rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-ink"
        />
        <button
          type="submit"
          disabled={!title.trim() || createGoal.isPending}
          className="rounded-md bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-hover disabled:opacity-50"
        >
          추가
        </button>
      </form>

      {goalsQuery.isLoading ? (
        <Skeleton rows={3} />
      ) : goalsQuery.isError ? (
        <p role="alert" className="text-sm text-red-600">
          1년 목표를 불러오지 못했습니다.
        </p>
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
                onContextMenu={(e) => menu.open(e, goal.id)}
                className="rounded-lg border border-line bg-surface p-4"
              >
                <div>
                  <p className="font-medium text-ink">
                    {goal.title}{" "}
                    <span className="text-sm text-ink-faint">{goal.year}</span>
                  </p>
                  {goal.description ? (
                    <p className="text-sm text-ink-soft">{goal.description}</p>
                  ) : null}
                </div>

                <div className="mt-3">
                  <WeekProgressBar
                    progress={rollupProgress(plans)}
                    label={`연간 롤업 진행률 (주간 계획 ${plans.length}개 평균)`}
                    showCount={false}
                  />
                </div>

                <ul className="mt-3 space-y-1">
                  {plans.length === 0 ? (
                    <li className="text-xs text-ink-faint">
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
                          <span className="text-ink-soft">
                            {toDateString(p.weekStart)} · {p.title}
                          </span>
                          <span className="text-xs text-ink-faint tabular-nums">
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

      <ContextMenu
        position={menu.state}
        onClose={menu.close}
        actions={
          menu.state
            ? [
                {
                  label: "삭제",
                  danger: true,
                  onSelect: () => handleDelete(menu.state!.target),
                },
              ]
            : []
        }
      />
    </section>
  );
}

export default YearView;
