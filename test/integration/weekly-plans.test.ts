import { describe, it, expect } from "vitest";
import { setupMongo } from "./mongo";
import { body, ctx, jsonReq, req } from "./helpers";
import { GET, POST } from "@/app/api/weekly-plans/route";
import { DELETE, GET as GET_ONE } from "@/app/api/weekly-plans/[id]/route";
import { POST as CREATE_TODO } from "@/app/api/todos/route";
import { GET as LIST_TODOS } from "@/app/api/todos/route";
import type { TodoDTO, WeeklyPlanDTO } from "@/lib/types";

setupMongo();

async function createPlan(
  data: Record<string, unknown> = {
    title: "1주차",
    weekStart: "2026-09-02",
  },
): Promise<WeeklyPlanDTO> {
  const res = await POST(jsonReq("/api/weekly-plans", "POST", data));
  expect(res.status).toBe(201);
  return body<WeeklyPlanDTO>(res);
}

describe("weekly-plans API", () => {
  it("POST 시 weekStart 가 월요일 00:00 UTC 로 정규화된다", async () => {
    // 2026-09-02 는 수요일 → 2026-08-31(월)
    const plan = await createPlan();
    expect(plan.weekStart).toBe("2026-08-31T00:00:00.000Z");
  });

  it("GET ?weekStart= 는 해당 주만 반환하고 progress 를 포함한다", async () => {
    await createPlan({ title: "이번주", weekStart: "2026-08-31" });
    await createPlan({ title: "다음주", weekStart: "2026-09-07" });

    const list = await body<WeeklyPlanDTO[]>(
      await GET(req("/api/weekly-plans?weekStart=2026-09-02")),
    );
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("이번주");
    expect(list[0].progress).toEqual({ done: 0, total: 0, ratio: 0 });
  });

  it("연결 Todo 0개면 progress.ratio 는 0", async () => {
    const plan = await createPlan();
    const fetched = await body<WeeklyPlanDTO>(
      await GET_ONE(req(`/api/weekly-plans/${plan.id}`), ctx(plan.id)),
    );
    expect(fetched.progress.ratio).toBe(0);
  });

  it("progress 는 연결 Todo 의 완료 비율을 반영한다", async () => {
    const plan = await createPlan();
    for (const status of ["done", "done", "todo", "doing"]) {
      await CREATE_TODO(
        jsonReq("/api/todos", "POST", {
          title: `t-${status}-${Math.random()}`,
          date: "2026-08-31",
          weeklyPlanId: plan.id,
          status,
        }),
      );
    }
    const fetched = await body<WeeklyPlanDTO>(
      await GET_ONE(req(`/api/weekly-plans/${plan.id}`), ctx(plan.id)),
    );
    expect(fetched.progress).toEqual({ done: 2, total: 4, ratio: 0.5 });
  });

  it("DELETE 후 자식 Todo 는 유지되며 weeklyPlanId 가 null 이 된다", async () => {
    const plan = await createPlan();
    await CREATE_TODO(
      jsonReq("/api/todos", "POST", {
        title: "고아 예정",
        date: "2026-08-31",
        weeklyPlanId: plan.id,
      }),
    );

    const del = await DELETE(
      req(`/api/weekly-plans/${plan.id}`),
      ctx(plan.id),
    );
    expect(del.status).toBe(204);

    const unassigned = await body<TodoDTO[]>(
      await LIST_TODOS(req("/api/todos?weeklyPlanId=null")),
    );
    expect(unassigned).toHaveLength(1);
    expect(unassigned[0].title).toBe("고아 예정");
    expect(unassigned[0].weeklyPlanId).toBeNull();
  });
});
