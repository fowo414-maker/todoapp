import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  mutateTodoCaches,
  restoreTodoCaches,
  queryKeys,
} from "@/lib/queries";
import { patchTodo, removeTodo } from "@/lib/optimistic";
import type { TodoDTO } from "@/lib/types";

function todo(id: string, status: TodoDTO["status"] = "todo"): TodoDTO {
  return {
    id,
    title: id,
    status,
    weeklyPlanId: null,
    date: "2026-08-31",
    order: 0,
    completedAt: null,
    createdAt: "2026-08-31T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z",
  };
}

describe("낙관적 업데이트 + 롤백", () => {
  it("mutateTodoCaches 는 모든 todos 캐시를 갱신하고, restoreTodoCaches 로 원상복구된다", () => {
    const qc = new QueryClient();
    const keyA = queryKeys.todos({ status: "todo" });
    const keyB = queryKeys.todos({ date: "2026-08-31" });
    qc.setQueryData(keyA, [todo("a"), todo("b")]);
    qc.setQueryData(keyB, [todo("a"), todo("b"), todo("c")]);

    // 낙관적: a 를 done 으로
    const snapshots = mutateTodoCaches(qc, (list) =>
      patchTodo(list, "a", { status: "done" }),
    );

    expect(
      qc.getQueryData<TodoDTO[]>(keyA)!.find((t) => t.id === "a")!.status,
    ).toBe("done");
    expect(
      qc.getQueryData<TodoDTO[]>(keyB)!.find((t) => t.id === "a")!.status,
    ).toBe("done");

    // 요청 실패 → 롤백
    restoreTodoCaches(qc, snapshots);

    expect(
      qc.getQueryData<TodoDTO[]>(keyA)!.find((t) => t.id === "a")!.status,
    ).toBe("todo");
    expect(qc.getQueryData<TodoDTO[]>(keyB)).toHaveLength(3);
  });

  it("삭제 낙관적 업데이트도 롤백되면 항목이 되살아난다", () => {
    const qc = new QueryClient();
    const key = queryKeys.todos();
    qc.setQueryData(key, [todo("a"), todo("b")]);

    const snapshots = mutateTodoCaches(qc, (list) => removeTodo(list, "a"));
    expect(qc.getQueryData<TodoDTO[]>(key)).toHaveLength(1);

    restoreTodoCaches(qc, snapshots);
    expect(qc.getQueryData<TodoDTO[]>(key)!.map((t) => t.id)).toEqual([
      "a",
      "b",
    ]);
  });
});
