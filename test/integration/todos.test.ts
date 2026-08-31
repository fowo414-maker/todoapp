import { describe, it, expect } from "vitest";
import { setupMongo } from "./mongo";
import { body, ctx, jsonReq, req } from "./helpers";
import { GET, POST } from "@/app/api/todos/route";
import { DELETE, GET as GET_ONE, PATCH } from "@/app/api/todos/[id]/route";
import type { TodoDTO } from "@/lib/types";

setupMongo();

async function createTodo(
  data: Record<string, unknown>,
): Promise<TodoDTO> {
  const res = await POST(jsonReq("/api/todos", "POST", data));
  expect(res.status).toBe(201);
  return body<TodoDTO>(res);
}

describe("todos API", () => {
  it("POST 는 201 과 자동 order 를 부여한다", async () => {
    const a = await createTodo({ title: "a", date: "2026-08-31" });
    const b = await createTodo({ title: "b", date: "2026-08-31" });
    expect(a.order).toBe(0);
    expect(b.order).toBe(1);
    expect(a.status).toBe("todo");
    expect(a.completedAt).toBeNull();
  });

  it("POST status=done 이면 completedAt 이 설정된다", async () => {
    const t = await createTodo({
      title: "done-now",
      date: "2026-08-31",
      status: "done",
    });
    expect(t.completedAt).not.toBeNull();
  });

  it("GET ?date= 필터", async () => {
    await createTodo({ title: "d1", date: "2026-08-31" });
    await createTodo({ title: "d2", date: "2026-09-01" });
    const list = await body<TodoDTO[]>(
      await GET(req("/api/todos?date=2026-08-31")),
    );
    expect(list.map((t) => t.title)).toEqual(["d1"]);
  });

  it("GET ?status= 필터", async () => {
    await createTodo({ title: "s1", date: "2026-08-31", status: "doing" });
    await createTodo({ title: "s2", date: "2026-08-31", status: "todo" });
    const list = await body<TodoDTO[]>(
      await GET(req("/api/todos?status=doing")),
    );
    expect(list.map((t) => t.title)).toEqual(["s1"]);
  });

  it("GET ?weeklyPlanId= 필터 (미할당 포함)", async () => {
    await createTodo({ title: "u1", date: "2026-08-31" });
    const list = await body<TodoDTO[]>(
      await GET(req("/api/todos?weeklyPlanId=null")),
    );
    expect(list.map((t) => t.title)).toEqual(["u1"]);
  });

  it("PATCH status→done 이면 completedAt 설정, 되돌리면 null", async () => {
    const t = await createTodo({ title: "toggle", date: "2026-08-31" });

    const done = await body<TodoDTO>(
      await PATCH(
        jsonReq(`/api/todos/${t.id}`, "PATCH", { status: "done" }),
        ctx(t.id),
      ),
    );
    expect(done.status).toBe("done");
    expect(done.completedAt).not.toBeNull();

    const back = await body<TodoDTO>(
      await PATCH(
        jsonReq(`/api/todos/${t.id}`, "PATCH", { status: "doing" }),
        ctx(t.id),
      ),
    );
    expect(back.completedAt).toBeNull();
  });

  it("GET /:id 없으면 404, DELETE 는 204", async () => {
    const t = await createTodo({ title: "del", date: "2026-08-31" });
    const del = await DELETE(req(`/api/todos/${t.id}`), ctx(t.id));
    expect(del.status).toBe(204);
    const after = await GET_ONE(req(`/api/todos/${t.id}`), ctx(t.id));
    expect(after.status).toBe(404);
  });
});
