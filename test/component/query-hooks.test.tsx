// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  queryKeys,
  useCreateTodo,
  useDeleteYearGoal,
  useUpdateTodo,
} from "@/lib/queries";
import type { TodoDTO, YearGoalDTO } from "@/lib/types";

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

const todo = (id: string, over: Partial<TodoDTO> = {}): TodoDTO => ({
  id,
  title: id,
  status: "todo",
  weeklyPlanId: null,
  date: "2026-08-31",
  order: 0,
  color: "none",
  completedAt: null,
  createdAt: "2026-08-31T00:00:00.000Z",
  updatedAt: "2026-08-31T00:00:00.000Z",
  ...over,
});

const goal = (id: string): YearGoalDTO => ({
  id,
  title: id,
  year: 2026,
  createdAt: "2026-08-31T00:00:00.000Z",
  updatedAt: "2026-08-31T00:00:00.000Z",
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("mutation 훅", () => {
  it("useUpdateTodo: onMutate 시점에 낙관적 패치가 적용되고, 실패하면 이전 캐시로 롤백된다", async () => {
    const qc = makeClient();
    qc.setQueryData(queryKeys.todos({}), [todo("a", { status: "todo" })]);
    vi.spyOn(api.todos, "list").mockResolvedValue([
      todo("a", { status: "todo" }),
    ]);
    const seenDuringRequest: string[] = [];
    vi.spyOn(api.todos, "update").mockImplementation(async () => {
      // mutationFn 은 onMutate 이후에 호출되므로 이 시점엔 낙관적 패치가 끝나 있어야 한다.
      seenDuringRequest.push(
        qc.getQueryData<TodoDTO[]>(queryKeys.todos({}))![0].status,
      );
      throw new Error("boom");
    });

    const { result } = renderHook(() => useUpdateTodo(), {
      wrapper: wrapperFor(qc),
    });
    result.current.mutate({ id: "a", patch: { status: "done" } });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(seenDuringRequest).toEqual(["done"]); // 낙관적 적용 확인
    expect(
      qc.getQueryData<TodoDTO[]>(queryKeys.todos({}))![0].status,
    ).toBe("todo"); // 롤백 확인
  });

  it("useDeleteYearGoal: onMutate 시점에 낙관적 삭제가 적용되고, 실패하면 항목이 되살아난다", async () => {
    const qc = makeClient();
    qc.setQueryData(queryKeys.yearGoals, [goal("g1"), goal("g2")]);
    vi.spyOn(api.yearGoals, "list").mockResolvedValue([goal("g1"), goal("g2")]);
    let lengthDuringRequest = -1;
    vi.spyOn(api.yearGoals, "remove").mockImplementation(async () => {
      lengthDuringRequest = qc.getQueryData<YearGoalDTO[]>(
        queryKeys.yearGoals,
      )!.length;
      throw new Error("boom");
    });

    const { result } = renderHook(() => useDeleteYearGoal(), {
      wrapper: wrapperFor(qc),
    });
    result.current.mutate("g1");

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(lengthDuringRequest).toBe(1); // 낙관적 삭제 확인
    expect(
      qc.getQueryData<YearGoalDTO[]>(queryKeys.yearGoals),
    ).toHaveLength(2); // 롤백 확인
  });

  it("useCreateTodo: 낙관적 삽입을 하지 않고(서버 id 필요), 실패해도 캐시를 건드리지 않는다", async () => {
    const qc = makeClient();
    qc.setQueryData(queryKeys.todos({}), [todo("a")]);
    vi.spyOn(api.todos, "list").mockResolvedValue([todo("a")]);
    let lengthDuringRequest = -1;
    vi.spyOn(api.todos, "create").mockImplementation(async () => {
      lengthDuringRequest = qc.getQueryData<TodoDTO[]>(
        queryKeys.todos({}),
      )!.length;
      throw new Error("boom");
    });

    const { result } = renderHook(() => useCreateTodo(), {
      wrapper: wrapperFor(qc),
    });
    result.current.mutate({ title: "새 할 일", date: "2026-08-31" });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(lengthDuringRequest).toBe(1); // 낙관적 삽입 없음
    expect(qc.getQueryData<TodoDTO[]>(queryKeys.todos({}))).toHaveLength(1);
  });
});
