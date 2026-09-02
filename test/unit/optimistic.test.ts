import { describe, it, expect } from "vitest";
import {
  moveTodoStatus,
  patchTodo,
  removeTodo,
  reorderWithin,
} from "@/lib/optimistic";
import type { TodoDTO } from "@/lib/types";

function todo(partial: Partial<TodoDTO> & { id: string }): TodoDTO {
  return {
    id: partial.id,
    title: partial.title ?? partial.id,
    status: partial.status ?? "todo",
    weeklyPlanId: partial.weeklyPlanId ?? null,
    date: partial.date ?? "2026-08-31",
    order: partial.order ?? 0,
    color: partial.color ?? "none",
    completedAt: partial.completedAt ?? null,
    createdAt: "2026-08-31T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z",
  };
}

describe("optimistic helpers", () => {
  it("removeTodo 는 해당 id 제거", () => {
    expect(
      removeTodo([todo({ id: "a" }), todo({ id: "b" })], "a").map((t) => t.id),
    ).toEqual(["b"]);
  });

  it("patchTodo 는 해당 id 만 병합", () => {
    const out = patchTodo([todo({ id: "a" }), todo({ id: "b" })], "a", {
      status: "done",
    });
    expect(out[0].status).toBe("done");
    expect(out[1].status).toBe("todo");
  });

  it("reorderWithin 은 같은 status 안에서 order 를 재부여", () => {
    const list = [
      todo({ id: "a", order: 0 }),
      todo({ id: "b", order: 1 }),
      todo({ id: "c", order: 2 }),
    ];
    const out = reorderWithin(list, "todo", ["c", "a", "b"]);
    expect(out.find((t) => t.id === "c")!.order).toBe(0);
    expect(out.find((t) => t.id === "a")!.order).toBe(1);
    expect(out.find((t) => t.id === "b")!.order).toBe(2);
  });

  it("moveTodoStatus 는 status 변경 + done 이면 completedAt 설정", () => {
    const list = [
      todo({ id: "a", status: "todo" }),
      todo({ id: "x", status: "done", order: 0 }),
    ];
    const out = moveTodoStatus(list, "a", "done", ["x", "a"]);
    const moved = out.find((t) => t.id === "a")!;
    expect(moved.status).toBe("done");
    expect(moved.order).toBe(1);
    expect(moved.completedAt).not.toBeNull();
  });

  it("moveTodoStatus 는 done 에서 벗어나면 completedAt 을 null 로", () => {
    const list = [todo({ id: "a", status: "done", completedAt: "2026-08-31T00:00:00.000Z" })];
    const out = moveTodoStatus(list, "a", "todo", ["a"]);
    expect(out[0].completedAt).toBeNull();
  });
});
