"use client";

import { computeWeeklyProgress, progressPercent } from "@/lib/progress";
import type { ProgressSummary, TodoDTO } from "@/lib/types";

export function WeekProgressBar({
  todos,
  progress,
  label = "주간 진행률",
  // 롤업(계획별 비율의 평균)처럼 done/total 합계와 퍼센트가 일치하지 않는
  // 경우엔 분수를 숨긴다.
  showCount = true,
}: {
  todos?: TodoDTO[];
  progress?: ProgressSummary;
  label?: string;
  showCount?: boolean;
}) {
  const summary: ProgressSummary =
    progress ?? computeWeeklyProgress(todos ?? []);
  const percent = progressPercent(summary);

  return (
    <div data-testid="week-progress" data-percent={percent}>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-neutral-600">{label}</span>
        <span className="font-medium tabular-nums">
          {percent}%
          {showCount ? (
            <span className="text-neutral-400">
              {" "}
              ({summary.done}/{summary.total})
            </span>
          ) : null}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-neutral-200"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default WeekProgressBar;
