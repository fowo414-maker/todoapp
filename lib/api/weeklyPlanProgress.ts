import type { Types } from "mongoose";
import { Todo } from "@/lib/models/Todo";
import { computeWeeklyProgress } from "@/lib/progress";
import type { ProgressSummary, TodoStatus } from "@/lib/types";

/**
 * 주어진 주간 계획 id 들에 대해 연결된 Todo 로부터 진행률을 계산한다.
 * 계획당 한 번씩 쿼리하지 않고 $in 으로 한 번에 조회한 뒤 메모리에서 그룹핑한다.
 */
export async function progressByPlanId(
  planIds: Types.ObjectId[],
): Promise<Map<string, ProgressSummary>> {
  const result = new Map<string, ProgressSummary>();
  if (planIds.length === 0) return result;

  const todos = await Todo.find(
    { weeklyPlanId: { $in: planIds } },
    "weeklyPlanId status",
  ).lean<{ weeklyPlanId: Types.ObjectId; status: TodoStatus }[]>();

  const grouped = new Map<string, { status: TodoStatus }[]>();
  for (const todo of todos) {
    const key = String(todo.weeklyPlanId);
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push({ status: todo.status });
    } else {
      grouped.set(key, [{ status: todo.status }]);
    }
  }

  for (const id of planIds) {
    const key = id.toString();
    result.set(key, computeWeeklyProgress(grouped.get(key) ?? []));
  }
  return result;
}
