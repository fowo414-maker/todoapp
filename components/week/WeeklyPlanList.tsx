"use client";

import { useState } from "react";
import {
  useCreateWeeklyPlan,
  useDeleteWeeklyPlan,
  useUpdateWeeklyPlan,
} from "@/lib/queries";
import { progressPercent } from "@/lib/progress";
import { ContextMenu, useContextMenu } from "@/components/common/ContextMenu";
import type { WeeklyPlanDTO, YearGoalDTO } from "@/lib/types";

export function WeeklyPlanList({
  weekStart,
  plans,
  yearGoals,
}: {
  weekStart: string;
  plans: WeeklyPlanDTO[];
  yearGoals: YearGoalDTO[];
}) {
  const createPlan = useCreateWeeklyPlan();
  const updatePlan = useUpdateWeeklyPlan();
  const deletePlan = useDeleteWeeklyPlan();
  const [title, setTitle] = useState("");
  const menu = useContextMenu<string>();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createPlan.mutateAsync({ title: title.trim(), weekStart });
      setTitle("");
    } catch {
      // onError 토스트가 처리
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("이 주간 계획을 삭제할까요? 연결된 할 일은 미할당으로 이동합니다."))
      return;
    try {
      await deletePlan.mutateAsync(id);
    } catch {
      // onError 토스트가 처리
    }
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-ink">주간 계획</h2>

      {plans.length === 0 ? (
        <p className="mb-3 text-xs text-ink-faint">이번 주 계획이 없습니다.</p>
      ) : (
        <ul className="mb-3 space-y-2">
          {plans.map((plan) => (
            <li
              key={plan.id}
              data-testid="weekly-plan"
              onContextMenu={(e) => menu.open(e, plan.id)}
              className="rounded-md border border-line px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-ink">
                  {plan.title}
                </span>
                <span className="shrink-0 text-xs text-ink-soft tabular-nums">
                  {progressPercent(plan.progress)}% ({plan.progress.done}/
                  {plan.progress.total})
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs text-ink-soft">1년 목표</label>
                <select
                  value={plan.yearGoalId ?? ""}
                  onChange={(e) =>
                    updatePlan.mutate({
                      id: plan.id,
                      patch: { yearGoalId: e.target.value || null },
                    })
                  }
                  className="flex-1 rounded border border-line-strong bg-surface px-1.5 py-1 text-xs text-ink"
                >
                  <option value="">(연결 안 함)</option>
                  {yearGoals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="새 주간 계획 제목"
          className="flex-1 rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-ink"
        />
        <button
          type="submit"
          disabled={!title.trim() || createPlan.isPending}
          className="rounded-md bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-hover disabled:opacity-50"
        >
          추가
        </button>
      </form>

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
    </div>
  );
}

export default WeeklyPlanList;
