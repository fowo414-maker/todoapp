import { describe, it, expect } from "vitest";
import { computeWeeklyProgress, progressPercent } from "@/lib/progress";

describe("computeWeeklyProgress", () => {
  it("빈 배열이면 {done:0,total:0,ratio:0}", () => {
    expect(computeWeeklyProgress([])).toEqual({ done: 0, total: 0, ratio: 0 });
  });

  it("done 2 / total 5 → ratio 0.4", () => {
    const todos = [
      { status: "done" as const },
      { status: "done" as const },
      { status: "todo" as const },
      { status: "doing" as const },
      { status: "todo" as const },
    ];
    expect(computeWeeklyProgress(todos)).toEqual({
      done: 2,
      total: 5,
      ratio: 0.4,
    });
  });

  it("모두 완료면 ratio 1", () => {
    const todos = [{ status: "done" as const }, { status: "done" as const }];
    expect(computeWeeklyProgress(todos)).toEqual({
      done: 2,
      total: 2,
      ratio: 1,
    });
  });

  it("완료 0개면 ratio 0", () => {
    const todos = [{ status: "todo" as const }, { status: "doing" as const }];
    expect(computeWeeklyProgress(todos).ratio).toBe(0);
  });
});

describe("progressPercent", () => {
  it("ratio 를 0~100 정수로 반올림", () => {
    expect(progressPercent({ done: 0, total: 0, ratio: 0 })).toBe(0);
    expect(progressPercent({ done: 2, total: 5, ratio: 0.4 })).toBe(40);
    expect(progressPercent({ done: 1, total: 3, ratio: 1 / 3 })).toBe(33);
    expect(progressPercent({ done: 2, total: 3, ratio: 2 / 3 })).toBe(67);
  });
});
