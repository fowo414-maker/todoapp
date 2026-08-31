import type { ProgressSummary, TodoStatus } from "./types";

/**
 * 주간 진행률 = 완료된 할 일 수 / 전체 할 일 수.
 * 전체가 0이면 ratio 는 0 (0으로 나누기 방지).
 */
export function computeWeeklyProgress(
  todos: ReadonlyArray<{ status: TodoStatus }>,
): ProgressSummary {
  const total = todos.length;
  const done = todos.filter((t) => t.status === "done").length;
  const ratio = total === 0 ? 0 : done / total;
  return { done, total, ratio };
}

/** 진행률을 0~100 정수 퍼센트로 변환한다. */
export function progressPercent(progress: ProgressSummary): number {
  return Math.round(progress.ratio * 100);
}
