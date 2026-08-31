import { describe, it, expect } from "vitest";
import type { Error as MongooseError } from "mongoose";
import { Todo } from "@/lib/models/Todo";
import { WeeklyPlan } from "@/lib/models/WeeklyPlan";
import { YearGoal } from "@/lib/models/YearGoal";

// DB 연결 없이 스키마 검증만 확인한다.
async function validationErrors(
  doc: { validate: () => Promise<void> },
): Promise<MongooseError.ValidationError["errors"] | undefined> {
  try {
    await doc.validate();
    return undefined;
  } catch (err) {
    return (err as MongooseError.ValidationError).errors;
  }
}

describe("Todo 모델 스키마", () => {
  it("title, date 누락 시 검증 오류", async () => {
    const errors = await validationErrors(new Todo({}));
    expect(errors?.title).toBeDefined();
    expect(errors?.date).toBeDefined();
  });

  it("잘못된 status 는 검증 오류", async () => {
    const errors = await validationErrors(
      new Todo({ title: "x", date: "2026-08-31", status: "archived" }),
    );
    expect(errors?.status).toBeDefined();
  });

  it("date 형식이 틀리면 검증 오류", async () => {
    const errors = await validationErrors(
      new Todo({ title: "x", date: "2026/08/31" }),
    );
    expect(errors?.date).toBeDefined();
  });

  it("유효한 입력은 오류 없음, 기본값 적용", async () => {
    const doc = new Todo({ title: "x", date: "2026-08-31" });
    expect(await validationErrors(doc)).toBeUndefined();
    expect(doc.status).toBe("todo");
    expect(doc.order).toBe(0);
    expect(doc.completedAt).toBeNull();
    expect(doc.weeklyPlanId).toBeNull();
  });
});

describe("WeeklyPlan 모델 스키마", () => {
  it("title, weekStart 누락 시 검증 오류", async () => {
    const errors = await validationErrors(new WeeklyPlan({}));
    expect(errors?.title).toBeDefined();
    expect(errors?.weekStart).toBeDefined();
  });

  it("유효한 입력은 오류 없음, yearGoalId 기본 null", async () => {
    const doc = new WeeklyPlan({
      title: "1주차",
      weekStart: new Date("2026-08-31T00:00:00.000Z"),
    });
    expect(await validationErrors(doc)).toBeUndefined();
    expect(doc.yearGoalId).toBeNull();
  });
});

describe("YearGoal 모델 스키마", () => {
  it("title, year 누락 시 검증 오류", async () => {
    const errors = await validationErrors(new YearGoal({}));
    expect(errors?.title).toBeDefined();
    expect(errors?.year).toBeDefined();
  });

  it("유효한 입력은 오류 없음", async () => {
    const doc = new YearGoal({ title: "건강", year: 2026 });
    expect(await validationErrors(doc)).toBeUndefined();
  });
});
