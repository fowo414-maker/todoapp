import type { TodoDTO, TodoStatus } from "@/lib/types";

/**
 * React Query 캐시(할 일 목록)에 대한 낙관적 업데이트용 순수 함수들.
 * 생성은 서버가 부여하는 _id 가 필요하므로 낙관적 삽입을 하지 않는다 —
 * 여기에는 수정/삭제/재정렬 헬퍼만 둔다.
 */

export function removeTodo(list: TodoDTO[], id: string): TodoDTO[] {
  return list.filter((t) => t.id !== id);
}

export function patchTodo(
  list: TodoDTO[],
  id: string,
  patch: Partial<TodoDTO>,
): TodoDTO[] {
  return list.map((t) => (t.id === id ? { ...t, ...patch } : t));
}

/** 한 컬럼(status) 안에서 orderedIds 순서대로 order 를 다시 매긴다. */
export function reorderWithin(
  list: TodoDTO[],
  status: TodoStatus,
  orderedIds: string[],
): TodoDTO[] {
  const pos = new Map(orderedIds.map((id, i) => [id, i]));
  return list.map((t) =>
    t.status === status && pos.has(t.id)
      ? { ...t, order: pos.get(t.id)! }
      : t,
  );
}

/** id 를 toStatus 컬럼으로 옮기고 대상 컬럼 순서를 orderedIds 로 맞춘다. */
export function moveTodoStatus(
  list: TodoDTO[],
  id: string,
  toStatus: TodoStatus,
  orderedIds: string[],
): TodoDTO[] {
  const pos = new Map(orderedIds.map((v, i) => [v, i]));
  return list.map((t) => {
    if (t.id === id) {
      return {
        ...t,
        status: toStatus,
        order: pos.get(id) ?? t.order,
        completedAt:
          toStatus === "done"
            ? (t.completedAt ?? new Date().toISOString())
            : null,
      };
    }
    if (t.status === toStatus && pos.has(t.id)) {
      return { ...t, order: pos.get(t.id)! };
    }
    return t;
  });
}
