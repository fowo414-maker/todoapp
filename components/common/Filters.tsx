"use client";

import { useCallback, useState } from "react";
import {
  STATUS_LABELS,
  TODO_STATUSES,
  type TodoDTO,
  type TodoStatus,
} from "@/lib/types";

export interface TodoFilterValue {
  status: TodoStatus | "all";
  scope: "all" | "unassigned" | "week";
}

export const DEFAULT_FILTER: TodoFilterValue = {
  status: "all",
  scope: "all",
};

/**
 * 필터 상태 + 적용 함수.
 * apply(todos, weekPlanIds): status/scope 조건으로 걸러진 목록.
 */
export function useTodoFilter() {
  const [filter, setFilter] = useState<TodoFilterValue>(DEFAULT_FILTER);

  const apply = useCallback(
    (todos: TodoDTO[], weekPlanIds: Set<string>) =>
      filterTodos(todos, filter, weekPlanIds),
    [filter],
  );

  return { filter, setFilter, apply };
}

export function filterTodos(
  todos: TodoDTO[],
  filter: TodoFilterValue,
  weekPlanIds: Set<string>,
): TodoDTO[] {
  return todos.filter((t) => {
    if (filter.status !== "all" && t.status !== filter.status) return false;
    if (filter.scope === "unassigned" && t.weeklyPlanId !== null) return false;
    if (
      filter.scope === "week" &&
      (t.weeklyPlanId === null || !weekPlanIds.has(t.weeklyPlanId))
    )
      return false;
    return true;
  });
}


export function Filters({
  value,
  onChange,
}: {
  value: TodoFilterValue;
  onChange: (next: TodoFilterValue) => void;
}) {
  return (
    <div
      data-testid="filters"
      className="flex flex-wrap items-center gap-2 text-sm"
    >
      <span className="text-ink-soft">필터</span>
      <select
        aria-label="상태 필터"
        value={value.status}
        onChange={(e) =>
          onChange({
            ...value,
            status: e.target.value as TodoFilterValue["status"],
          })
        }
        className="rounded border border-line-strong bg-surface px-2 py-1 text-ink"
      >
        <option value="all">모든 상태</option>
        {TODO_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <select
        aria-label="기간 필터"
        value={value.scope}
        onChange={(e) =>
          onChange({
            ...value,
            scope: e.target.value as TodoFilterValue["scope"],
          })
        }
        className="rounded border border-line-strong bg-surface px-2 py-1 text-ink"
      >
        <option value="all">전체</option>
        <option value="week">이번 주 계획</option>
        <option value="unassigned">미할당</option>
      </select>
      {(value.status !== "all" || value.scope !== "all") && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FILTER)}
          className="text-ink-soft underline hover:text-ink"
        >
          초기화
        </button>
      )}
    </div>
  );
}

export default Filters;
