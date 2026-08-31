import { describe, it, expect } from "vitest";
import { filterTodos, DEFAULT_FILTER } from "@/components/common/Filters";
import { rollupProgress } from "@/components/year/YearView";
import type { TodoDTO, WeeklyPlanDTO } from "@/lib/types";

function todo(
  partial: Partial<TodoDTO> & { id: string },
): TodoDTO {
  return {
    id: partial.id,
    title: partial.id,
    status: partial.status ?? "todo",
    weeklyPlanId: partial.weeklyPlanId ?? null,
    date: partial.date ?? "2026-08-31",
    order: partial.order ?? 0,
    completedAt: partial.completedAt ?? null,
    createdAt: "2026-08-31T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z",
  };
}

function plan(progress: WeeklyPlanDTO["progress"]): WeeklyPlanDTO {
  return {
    id: Math.random().toString(),
    title: "p",
    yearGoalId: null,
    weekStart: "2026-08-31T00:00:00.000Z",
    createdAt: "2026-08-31T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z",
    progress,
  };
}

describe("filterTodos", () => {
  const list = [
    todo({ id: "a", status: "todo", weeklyPlanId: "P1" }),
    todo({ id: "b", status: "done", weeklyPlanId: "P1" }),
    todo({ id: "c", status: "done", weeklyPlanId: null }),
    todo({ id: "d", status: "doing", weeklyPlanId: "P2" }),
  ];
  const weekPlanIds = new Set(["P1"]);

  it("기본 필터는 전부 통과", () => {
    expect(filterTodos(list, DEFAULT_FILTER, weekPlanIds)).toHaveLength(4);
  });

  it("status=done 은 완료만", () => {
    const out = filterTodos(
      list,
      { status: "done", scope: "all" },
      weekPlanIds,
    );
    expect(out.map((t) => t.id).sort()).toEqual(["b", "c"]);
  });

  it("scope=unassigned 는 미할당만", () => {
    const out = filterTodos(
      list,
      { status: "all", scope: "unassigned" },
      weekPlanIds,
    );
    expect(out.map((t) => t.id)).toEqual(["c"]);
  });

  it("scope=week 는 이번 주 계획에 속한 것만", () => {
    const out = filterTodos(
      list,
      { status: "all", scope: "week" },
      weekPlanIds,
    );
    expect(out.map((t) => t.id).sort()).toEqual(["a", "b"]);
  });

  it("status + scope 조합", () => {
    const out = filterTodos(
      list,
      { status: "done", scope: "week" },
      weekPlanIds,
    );
    expect(out.map((t) => t.id)).toEqual(["b"]);
  });
});

describe("rollupProgress", () => {
  it("계획 없으면 0", () => {
    expect(rollupProgress([])).toEqual({ done: 0, total: 0, ratio: 0 });
  });

  it("계획별 ratio 의 산술 평균 (주간 진행률 평균)", () => {
    const out = rollupProgress([
      plan({ done: 1, total: 2, ratio: 0.5 }),
      plan({ done: 2, total: 2, ratio: 1 }),
      plan({ done: 0, total: 0, ratio: 0 }),
    ]);
    // (0.5 + 1 + 0) / 3 = 0.5
    expect(out).toEqual({ done: 3, total: 4, ratio: 0.5 });
  });
});
