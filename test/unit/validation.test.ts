import { describe, it, expect } from "vitest";
import {
  createTodoSchema,
  updateTodoSchema,
  reorderSchema,
} from "@/lib/validation/todo";
import { createYearGoalSchema } from "@/lib/validation/yearGoal";
import { createWeeklyPlanSchema } from "@/lib/validation/weeklyPlan";

const OID = "0123456789abcdef01234567";

describe("createTodoSchema", () => {
  it("유효한 입력을 통과시키고 status 는 라우트에서 기본값 처리하도록 undefined 로 남긴다", () => {
    const parsed = createTodoSchema.parse({ title: "책 읽기", date: "2026-08-31" });
    expect(parsed.status).toBeUndefined();
    expect(parsed.title).toBe("책 읽기");
  });

  it("제목 누락은 거부", () => {
    expect(createTodoSchema.safeParse({ date: "2026-08-31" }).success).toBe(
      false,
    );
  });

  it("빈 제목은 거부", () => {
    expect(
      createTodoSchema.safeParse({ title: "   ", date: "2026-08-31" }).success,
    ).toBe(false);
  });

  it("잘못된 status enum 은 거부", () => {
    expect(
      createTodoSchema.safeParse({
        title: "x",
        date: "2026-08-31",
        status: "archived",
      }).success,
    ).toBe(false);
  });

  it("잘못된 date 형식은 거부", () => {
    expect(
      createTodoSchema.safeParse({ title: "x", date: "2026-8-31" }).success,
    ).toBe(false);
  });

  it("weeklyPlanId 는 null 허용", () => {
    const parsed = createTodoSchema.parse({
      title: "x",
      date: "2026-08-31",
      weeklyPlanId: null,
    });
    expect(parsed.weeklyPlanId).toBeNull();
  });

  it("weeklyPlanId 가 ObjectId 형식이 아니면 거부", () => {
    expect(
      createTodoSchema.safeParse({
        title: "x",
        date: "2026-08-31",
        weeklyPlanId: "not-an-id",
      }).success,
    ).toBe(false);
  });
});

describe("updateTodoSchema", () => {
  it("부분 업데이트 허용 (status 만)", () => {
    const parsed = updateTodoSchema.parse({ status: "done" });
    expect(parsed).toEqual({ status: "done" });
  });

  it("status 를 건드리지 않는 부분 업데이트는 status 를 'todo' 로 되돌리지 않는다", () => {
    const parsed = updateTodoSchema.parse({ title: "제목 수정" });
    expect(parsed.status).toBeUndefined();
    expect(parsed).toEqual({ title: "제목 수정" });
  });
});

describe("reorderSchema", () => {
  it("정상 페이로드 통과", () => {
    const parsed = reorderSchema.parse({
      status: "todo",
      orderedIds: [OID, OID],
    });
    expect(parsed.orderedIds).toHaveLength(2);
  });

  it("orderedIds 가 비어 있으면 거부", () => {
    expect(
      reorderSchema.safeParse({ status: "todo", orderedIds: [] }).success,
    ).toBe(false);
  });

  it("status 누락은 거부", () => {
    expect(reorderSchema.safeParse({ orderedIds: [OID] }).success).toBe(false);
  });
});

describe("createYearGoalSchema", () => {
  it("정상 통과", () => {
    expect(
      createYearGoalSchema.safeParse({ title: "건강", year: 2026 }).success,
    ).toBe(true);
  });

  it("year 누락은 거부", () => {
    expect(createYearGoalSchema.safeParse({ title: "건강" }).success).toBe(
      false,
    );
  });

  it("year 가 정수가 아니면 거부", () => {
    expect(
      createYearGoalSchema.safeParse({ title: "건강", year: 2026.5 }).success,
    ).toBe(false);
  });
});

describe("createWeeklyPlanSchema", () => {
  it("정상 통과 (yearGoalId 없이)", () => {
    expect(
      createWeeklyPlanSchema.safeParse({
        title: "1주차",
        weekStart: "2026-08-31",
      }).success,
    ).toBe(true);
  });

  it("제목 누락은 거부", () => {
    expect(
      createWeeklyPlanSchema.safeParse({ weekStart: "2026-08-31" }).success,
    ).toBe(false);
  });

  it("yearGoalId 가 잘못된 형식이면 거부", () => {
    expect(
      createWeeklyPlanSchema.safeParse({
        title: "1주차",
        weekStart: "2026-08-31",
        yearGoalId: "bad",
      }).success,
    ).toBe(false);
  });
});
