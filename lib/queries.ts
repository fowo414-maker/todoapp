"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { api, type TodoFilters } from "@/lib/api-client";
import {
  moveTodoStatus,
  patchTodo,
  removeTodo,
  reorderWithin,
} from "@/lib/optimistic";
import type { TodoDTO, TodoStatus } from "@/lib/types";

export const queryKeys = {
  yearGoals: ["year-goals"] as const,
  weeklyPlans: (weekStart?: string) =>
    ["weekly-plans", weekStart ?? "all"] as const,
  weeklyPlansAll: ["weekly-plans"] as const,
  todos: (filters: TodoFilters = {}) => ["todos", filters] as const,
  todosAll: ["todos"] as const,
};

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

/* ------------------- Optimistic helpers (testable) ------------------ */

type TodoListUpdater = (list: TodoDTO[]) => TodoDTO[];

/** 모든 ["todos", ...] 캐시에 updater 를 적용하고, 이전 스냅샷을 반환한다. */
export function mutateTodoCaches(
  queryClient: QueryClient,
  updater: TodoListUpdater,
): Array<[readonly unknown[], TodoDTO[] | undefined]> {
  const snapshots = queryClient.getQueriesData<TodoDTO[]>({
    queryKey: queryKeys.todosAll,
  });
  for (const [key] of snapshots) {
    queryClient.setQueryData<TodoDTO[]>(key, (old) =>
      old ? updater(old) : old,
    );
  }
  return snapshots.map(([key, data]) => [key, data]);
}

export function restoreTodoCaches(
  queryClient: QueryClient,
  snapshots: Array<[readonly unknown[], TodoDTO[] | undefined]>,
): void {
  for (const [key, data] of snapshots) {
    queryClient.setQueryData(key, data);
  }
}

interface OptimisticContext {
  snapshots: Array<[readonly unknown[], TodoDTO[] | undefined]>;
}

/* ----------------------------- Mutations --------------------------- */

export function useCreateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.todos.create,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todosAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlansAll });
    },
  });
}

export function useUpdateTodo() {
  const queryClient = useQueryClient();
  return useMutation<
    TodoDTO,
    Error,
    { id: string; patch: Parameters<typeof api.todos.update>[1] },
    OptimisticContext
  >({
    mutationFn: ({ id, patch }) => api.todos.update(id, patch),
    onMutate: ({ id, patch }) => {
      const snapshots = mutateTodoCaches(queryClient, (list) =>
        patchTodo(list, id, patch as Partial<TodoDTO>),
      );
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      if (context) restoreTodoCaches(queryClient, context.snapshots);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todosAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlansAll });
    },
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string, OptimisticContext>({
    mutationFn: (id) => api.todos.remove(id),
    onMutate: (id) => {
      const snapshots = mutateTodoCaches(queryClient, (list) =>
        removeTodo(list, id),
      );
      return { snapshots };
    },
    onError: (_err, _id, context) => {
      if (context) restoreTodoCaches(queryClient, context.snapshots);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todosAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlansAll });
    },
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
  return useMutation<TodoDTO[], Error, ReorderVars, OptimisticContext>({
    mutationFn: (vars) =>
      api.todos.reorder(
        vars.columns
          ? { columns: vars.columns }
          : { status: vars.status, orderedIds: vars.orderedIds },
      ),
    onMutate: (vars) => {
      const snapshots = mutateTodoCaches(queryClient, (list) => {
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
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      if (context) restoreTodoCaches(queryClient, context.snapshots);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todosAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlansAll });
    },
  });
}

/* ------------------------ Goal / Plan mutations -------------------- */

export function useCreateYearGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.yearGoals.create,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.yearGoals }),
  });
}

export function useUpdateYearGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Parameters<typeof api.yearGoals.update>[1];
    }) => api.yearGoals.update(id, patch),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.yearGoals }),
  });
}

export function useDeleteYearGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.yearGoals.remove(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.yearGoals });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlansAll });
    },
  });
}

export function useCreateWeeklyPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.weeklyPlans.create,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlansAll }),
  });
}

export function useUpdateWeeklyPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Parameters<typeof api.weeklyPlans.update>[1];
    }) => api.weeklyPlans.update(id, patch),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlansAll }),
  });
}

export function useDeleteWeeklyPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.weeklyPlans.remove(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlansAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.todosAll });
    },
  });
}
