import { describe, it, expect } from "vitest";
import { setupMongo } from "./mongo";
import { body, ctx, jsonReq, req } from "./helpers";
import { GET, POST } from "@/app/api/year-goals/route";
import {
  GET as GET_ONE,
  PATCH,
  DELETE,
} from "@/app/api/year-goals/[id]/route";
import { POST as CREATE_PLAN } from "@/app/api/weekly-plans/route";
import { GET as GET_PLAN } from "@/app/api/weekly-plans/[id]/route";
import type { WeeklyPlanDTO, YearGoalDTO } from "@/lib/types";

setupMongo();

async function createGoal(
  data: Record<string, unknown> = { title: "2026 건강", year: 2026 },
): Promise<YearGoalDTO> {
  const res = await POST(jsonReq("/api/year-goals", "POST", data));
  expect(res.status).toBe(201);
  return body<YearGoalDTO>(res);
}

describe("year-goals API", () => {
  it("POST 는 201 과 _id 를 반환한다", async () => {
    const goal = await createGoal();
    expect(goal.id).toMatch(/^[0-9a-f]{24}$/);
    expect(goal.title).toBe("2026 건강");
    expect(goal.year).toBe(2026);
  });

  it("POST 필수값 누락은 400", async () => {
    const res = await POST(jsonReq("/api/year-goals", "POST", { title: "x" }));
    expect(res.status).toBe(400);
  });

  it("GET 은 생성한 목표를 포함한다", async () => {
    await createGoal({ title: "A", year: 2025 });
    await createGoal({ title: "B", year: 2026 });
    const list = await body<YearGoalDTO[]>(await GET());
    expect(list).toHaveLength(2);
    // year 내림차순 정렬
    expect(list[0].year).toBe(2026);
  });

  it("GET /:id 는 단건 반환, 없으면 404", async () => {
    const goal = await createGoal();
    const found = await GET_ONE(req(`/api/year-goals/${goal.id}`), ctx(goal.id));
    expect(found.status).toBe(200);
    const missing = await GET_ONE(
      req(`/api/year-goals/000000000000000000000000`),
      ctx("000000000000000000000000"),
    );
    expect(missing.status).toBe(404);
  });

  it("PATCH 는 변경을 반영한다", async () => {
    const goal = await createGoal();
    const res = await PATCH(
      jsonReq(`/api/year-goals/${goal.id}`, "PATCH", { title: "수정됨" }),
      ctx(goal.id),
    );
    expect(res.status).toBe(200);
    expect((await body<YearGoalDTO>(res)).title).toBe("수정됨");
  });

  it("DELETE 는 204, 자식 WeeklyPlan.yearGoalId 는 null 로 해제된다", async () => {
    const goal = await createGoal();
    const planRes = await CREATE_PLAN(
      jsonReq("/api/weekly-plans", "POST", {
        title: "1주차",
        weekStart: "2026-08-31",
        yearGoalId: goal.id,
      }),
    );
    const plan = await body<WeeklyPlanDTO>(planRes);
    expect(plan.yearGoalId).toBe(goal.id);

    const del = await DELETE(req(`/api/year-goals/${goal.id}`), ctx(goal.id));
    expect(del.status).toBe(204);

    const after = await body<WeeklyPlanDTO>(
      await GET_PLAN(req(`/api/weekly-plans/${plan.id}`), ctx(plan.id)),
    );
    expect(after.yearGoalId).toBeNull();
  });
});
