"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { api, ApiError, type TodoFilters } from "@/lib/api-client";
import {
  moveTodoStatus,
  patchTodo,
  removeTodo,
  reorderWithin,
} from "@/lib/optimistic";
import { useToast } from "@/components/common/Toast";
import type {
  TodoDTO,
  TodoStatus,
  WeeklyPlanDTO,
  YearGoalDTO,
} from "@/lib/types";

export const queryKeys = {
  yearGoals: ["year-goals"] as const,
  weeklyPlans: (weekStart?: string) =>
    ["weekly-plans", weekStart ?? "all"] as const,
  weeklyPlansAll: ["weekly-plans"] as const,
  todos: (filters: TodoFilters = {}) => ["todos", filters] as const,
  todosAll: ["todos"] as const,
};

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/* ----------------------------- Queries ----------------------------- */

export function useYearGoals() {
  return useQuery({
    queryKey: queryKeys.yearGoals,
    queryFn: () => api.yearGoals.list(),
  });
}

export function useWeeklyPlans(weekStart?: string) {
  return useQuery({
    queryKey: queryKeys.weeklyPlans(weekStart),
    queryFn: () => api.weeklyPlans.list(weekStart ? { weekStart } : {}),
  });
}

export function useTodos(filters: TodoFilters = {}) {
  return useQuery({
    queryKey: queryKeys.todos(filters),
    queryFn: () => api.todos.list(filters),
  });
}

/* ----------------- Generic optimistic cache helpers ---------------- */

type Snapshot = Array<[readonly unknown[], unknown]>;

/** queryKey 프리픽스에 매칭되는 모든 캐시의 현재 값을 스냅샷으로 저장한다. */
export function snapshotCaches(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
): Snapshot {
  return queryClient
    .getQueriesData({ queryKey })
    .map(([key, data]) => [key, data]);
}

export function restoreCaches(
  queryClient: QueryClient,
  snapshot: Snapshot,
): void {
  for (const [key, data] of snapshot) {
    queryClient.setQueryData(key, data);
  }
}

/** 매칭되는 모든 캐시에 updater 를 적용한다 (값이 없으면 건너뜀). */
export function updateCaches<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  updater: (old: T) => T,
): void {
  for (const [key] of queryClient.getQueriesData({ queryKey })) {
    queryClient.setQueryData<T>(key, (old) =>
      old == null ? old : updater(old),
    );
  }
}

// 하위 호환 + 단위 테스트에서 직접 사용하는 todos 전용 래퍼.
export function mutateTodoCaches(
  queryClient: QueryClient,
  updater: (list: TodoDTO[]) => TodoDTO[],
): Snapshot {
  const snapshot = snapshotCaches(queryClient, queryKeys.todosAll);
  updateCaches<TodoDTO[]>(queryClient, queryKeys.todosAll, updater);
  return snapshot;
}

export function restoreTodoCaches(
  queryClient: QueryClient,
  snapshot: Snapshot,
): void {
  restoreCaches(queryClient, snapshot);
}

interface OptimisticContext {
  snapshot: Snapshot;
}

/* ----------------------------- Todo mutations --------------------- */

function invalidateTodoAndPlans(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.todosAll });
  queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlansAll });
}

/**
 * 생성은 낙관적 삽입을 하지 않는다: 서버가 부여하는 _id 없이 임시 항목을 넣으면
 * 그 항목을 부모로 참조하는 하위 생성(예: 그 주간 계획에 할 일 추가)이 유효하지
 * 않은 id 를 서버로 보내게 된다. 대신 onError 토스트 + onSettled 무효화만 한다.
 */
export function useCreateTodo() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: api.todos.create,
    onError: (err) =>
      toast.error(errorMessage(err, "할 일을 추가하지 못했습니다")),
    onSettled: () => invalidateTodoAndPlans(queryClient),
  });
}

export function useUpdateTodo() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation<
    TodoDTO,
    Error,
    { id: string; patch: Parameters<typeof api.todos.update>[1] },
    OptimisticContext
  >({
    mutationFn: ({ id, patch }) => api.todos.update(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.todosAll });
      const snapshot = mutateTodoCaches(queryClient, (list) =>
        patchTodo(list, id, patch as Partial<TodoDTO>),
      );
      return { snapshot };
    },
    onError: (err, _vars, context) => {
      if (context) restoreTodoCaches(queryClient, context.snapshot);
      toast.error(errorMessage(err, "할 일을 수정하지 못했습니다"));
    },
    onSettled: () => invalidateTodoAndPlans(queryClient),
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation<void, Error, string, OptimisticContext>({
    mutationFn: (id) => api.todos.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.todosAll });
      const snapshot = mutateTodoCaches(queryClient, (list) =>
        removeTodo(list, id),
      );
      return { snapshot };
    },
    onError: (err, _id, context) => {
      if (context) restoreTodoCaches(queryClient, context.snapshot);
      toast.error(errorMessage(err, "할 일을 삭제하지 못했습니다"));
    },
    onSettled: () => invalidateTodoAndPlans(queryClient),
  });
}

export interface ReorderVars {
  status: TodoStatus;
  orderedIds: string[];
  move?: { id: string; toStatus: TodoStatus };
  columns?: { status: TodoStatus; orderedIds: string[] }[];
}

export function useReorderTodos() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation<TodoDTO[], Error, ReorderVars, OptimisticContext>({
    mutationFn: (vars) =>
      api.todos.reorder(
        vars.columns
          ? { columns: vars.columns }
          : { status: vars.status, orderedIds: vars.orderedIds },
      ),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.todosAll });
      const snapshot = mutateTodoCaches(queryClient, (list) => {
        if (vars.move) {
          return moveTodoStatus(
            list,
            vars.move.id,
            vars.move.toStatus,
            vars.orderedIds,
          );
        }
        if (vars.columns) {
          return vars.columns.reduce(
            (acc, c) => reorderWithin(acc, c.status, c.orderedIds),
            list,
          );
        }
        return reorderWithin(list, vars.status, vars.orderedIds);
      });
      return { snapshot };
    },
    onError: (err, _vars, context) => {
      if (context) restoreTodoCaches(queryClient, context.snapshot);
      toast.error(errorMessage(err, "순서를 변경하지 못했습니다"));
    },
    onSettled: () => invalidateTodoAndPlans(queryClient),
  });
}

/* ------------------------ Year goal mutations --------------------- */

/**
 * 목록 캐시(queryKey) 하나에 대해 낙관적 업데이트 + 롤백을 붙인 뮤테이션.
 * `optimistic` 이 null 이면 낙관적 처리를 생략하고 onSettled 무효화 + onError 토스트만 한다
 * (생성처럼 서버 id 가 필요한 작업).
 */
function useListMutation<TVars, TItem>(config: {
  mutationFn: (vars: TVars) => Promise<unknown>;
  queryKey: readonly unknown[];
  optimistic: ((list: TItem[], vars: TVars) => TItem[]) | null;
  fallbackMessage: string;
  invalidateAlso?: readonly unknown[];
}) {
  const queryClient = useQueryClient();
  const toast = useToast();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: config.queryKey });
    if (config.invalidateAlso) {
      queryClient.invalidateQueries({ queryKey: config.invalidateAlso });
    }
  }

  return useMutation<unknown, Error, TVars, OptimisticContext | undefined>({
    mutationFn: config.mutationFn,
    onMutate: config.optimistic
      ? async (vars) => {
          await queryClient.cancelQueries({ queryKey: config.queryKey });
          const snapshot = snapshotCaches(queryClient, config.queryKey);
          updateCaches<TItem[]>(queryClient, config.queryKey, (list) =>
            config.optimistic!(list, vars),
          );
          return { snapshot };
        }
      : undefined,
    onError: (err, _vars, context) => {
      if (context) restoreCaches(queryClient, context.snapshot);
      toast.error(errorMessage(err, config.fallbackMessage));
    },
    onSettled: invalidate,
  });
}

/* ------------------------ Year goal mutations --------------------- */

export function useCreateYearGoal() {
  return useListMutation<
    Parameters<typeof api.yearGoals.create>[0],
    YearGoalDTO
  >({
    mutationFn: api.yearGoals.create,
    queryKey: queryKeys.yearGoals,
    optimistic: null,
    fallbackMessage: "1년 목표를 추가하지 못했습니다",
  });
}

export function useUpdateYearGoal() {
  return useListMutation<
    { id: string; patch: Parameters<typeof api.yearGoals.update>[1] },
    YearGoalDTO
  >({
    mutationFn: ({ id, patch }) => api.yearGoals.update(id, patch),
    queryKey: queryKeys.yearGoals,
    optimistic: (list, { id, patch }) =>
      list.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    fallbackMessage: "1년 목표를 수정하지 못했습니다",
  });
}

export function useDeleteYearGoal() {
  return useListMutation<string, YearGoalDTO>({
    mutationFn: (id) => api.yearGoals.remove(id),
    queryKey: queryKeys.yearGoals,
    optimistic: (list, id) => list.filter((g) => g.id !== id),
    fallbackMessage: "1년 목표를 삭제하지 못했습니다",
    invalidateAlso: queryKeys.weeklyPlansAll,
  });
}

/* ------------------------ Weekly plan mutations ------------------- */

export function useCreateWeeklyPlan() {
  return useListMutation<
    Parameters<typeof api.weeklyPlans.create>[0],
    WeeklyPlanDTO
  >({
    mutationFn: api.weeklyPlans.create,
    queryKey: queryKeys.weeklyPlansAll,
    optimistic: null,
    fallbackMessage: "주간 계획을 추가하지 못했습니다",
  });
}

export function useUpdateWeeklyPlan() {
  return useListMutation<
    { id: string; patch: Parameters<typeof api.weeklyPlans.update>[1] },
    WeeklyPlanDTO
  >({
    mutationFn: ({ id, patch }) => api.weeklyPlans.update(id, patch),
    queryKey: queryKeys.weeklyPlansAll,
    optimistic: (list, { id, patch }) =>
      list.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    fallbackMessage: "주간 계획을 수정하지 못했습니다",
  });
}

export function useDeleteWeeklyPlan() {
  return useListMutation<string, WeeklyPlanDTO>({
    mutationFn: (id) => api.weeklyPlans.remove(id),
    queryKey: queryKeys.weeklyPlansAll,
    optimistic: (list, id) => list.filter((p) => p.id !== id),
    fallbackMessage: "주간 계획을 삭제하지 못했습니다",
    invalidateAlso: queryKeys.todosAll,
  });
}
