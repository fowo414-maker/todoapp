import type { AnyBulkWriteOperation } from "mongoose";
import { Todo } from "@/lib/models/Todo";
import type { TodoStatus } from "@/lib/types";
import type { ReorderInput } from "@/lib/validation/todo";

export interface ReorderColumn {
  status: TodoStatus;
  orderedIds: string[];
}

/** {status, orderedIds} 단일 컬럼 또는 {columns:[...]} 다중 컬럼을 공통 형태로 정규화. */
export function normalizeReorder(input: ReorderInput): ReorderColumn[] {
  if (input.columns && input.columns.length > 0) {
    return input.columns.map((c) => ({
      status: c.status,
      orderedIds: c.orderedIds,
    }));
  }
  if (input.status === undefined) {
    throw new Error("reorder 입력에 status 가 없습니다");
  }
  return [{ status: input.status, orderedIds: input.orderedIds ?? [] }];
}

/**
 * 각 컬럼의 orderedIds 순서대로 order 를 0..n 으로 재작성하고 status 를 반영한다.
 * status 가 'done' 으로 바뀌면 completedAt 을 설정하고, 'done' 에서 벗어나면 null 로 되돌린다.
 * 하나의 bulkWrite 로 원자적으로 적용한다.
 */
export async function applyReorder(columns: ReorderColumn[]): Promise<number> {
  const allIds = columns.flatMap((c) => c.orderedIds);
  if (allIds.length === 0) return 0;

  const current = await Todo.find(
    { _id: { $in: allIds } },
    "status",
  ).lean<{ _id: unknown; status: TodoStatus }[]>();
  const currentStatus = new Map(
    current.map((t) => [String(t._id), t.status]),
  );

  const ops: AnyBulkWriteOperation[] = [];
  for (const column of columns) {
    column.orderedIds.forEach((id, index) => {
      const was = currentStatus.get(id);
      const set: Record<string, unknown> = {
        order: index,
        status: column.status,
      };
      if (column.status === "done" && was !== "done") {
        set.completedAt = new Date();
      } else if (column.status !== "done" && was === "done") {
        set.completedAt = null;
      }
      ops.push({ updateOne: { filter: { _id: id }, update: { $set: set } } });
    });
  }

  const res = await Todo.bulkWrite(ops);
  return res.modifiedCount ?? 0;
}
