import { describe, it, expect } from "vitest";
import { setupMongo } from "./mongo";
import { body, jsonReq, req } from "./helpers";
import { GET, POST as CREATE } from "@/app/api/todos/route";
import { POST as REORDER } from "@/app/api/todos/reorder/route";
import type { TodoDTO } from "@/lib/types";

setupMongo();

async function createTodo(title: string, status = "todo"): Promise<TodoDTO> {
  return body<TodoDTO>(
    await CREATE(
      jsonReq("/api/todos", "POST", {
        title,
        date: "2026-08-31",
        status,
      }),
    ),
  );
}

async function listByStatus(status: string): Promise<string[]> {
  const list = await body<TodoDTO[]>(
    await GET(req(`/api/todos?status=${status}`)),
  );
  return list.map((t) => t.title);
}

describe("todos/reorder API", () => {
  it("{status, orderedIds:[b,a,c]} → GET ?status= 가 그 순서로 반환", async () => {
    const a = await createTodo("a");
    const b = await createTodo("b");
    const c = await createTodo("c");

    const res = await REORDER(
      jsonReq("/api/todos/reorder", "POST", {
        status: "todo",
        orderedIds: [b.id, a.id, c.id],
      }),
    );
    expect(res.status).toBe(200);
    expect(await listByStatus("todo")).toEqual(["b", "a", "c"]);
  });

  it("컬럼 간 이동: 대상 Todo status 변경 + 양쪽 컬럼 order 재작성", async () => {
    const a = await createTodo("a");
    const b = await createTodo("b");
    const c = await createTodo("c");

    // a 를 done 컬럼으로 이동, todo 컬럼에는 c,b 남김
    const res = await REORDER(
      jsonReq("/api/todos/reorder", "POST", {
        columns: [
          { status: "todo", orderedIds: [c.id, b.id] },
          { status: "done", orderedIds: [a.id] },
        ],
      }),
    );
    expect(res.status).toBe(200);

    expect(await listByStatus("todo")).toEqual(["c", "b"]);
    const done = await body<TodoDTO[]>(
      await GET(req("/api/todos?status=done")),
    );
    expect(done.map((t) => t.title)).toEqual(["a"]);
    expect(done[0].completedAt).not.toBeNull();
  });

  it("done 에서 벗어나면 completedAt 이 null 로 돌아온다", async () => {
    const a = await createTodo("a", "done");
    await REORDER(
      jsonReq("/api/todos/reorder", "POST", {
        status: "todo",
        orderedIds: [a.id],
      }),
    );
    const list = await body<TodoDTO[]>(
      await GET(req("/api/todos?status=todo")),
    );
    expect(list[0].completedAt).toBeNull();
  });

  it("잘못된 페이로드는 400", async () => {
    const res = await REORDER(
      jsonReq("/api/todos/reorder", "POST", { orderedIds: [] }),
    );
    expect(res.status).toBe(400);
  });
});
