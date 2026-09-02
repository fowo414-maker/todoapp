import type {
  TodoColor,
  TodoDTO,
  WeeklyPlanDTO,
  YearGoalDTO,
} from "@/lib/types";
import type { ReorderInput } from "@/lib/validation/todo";

export class ApiError extends Error {
  status: number;
  details: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = `요청 실패 (${res.status})`;
    let details: unknown;
    try {
      const parsed = (await res.json()) as { error?: string; details?: unknown };
      if (parsed.error) message = parsed.error;
      details = parsed.details;
    } catch {
      // 본문 없음
    }
    throw new ApiError(res.status, message, details);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function qs(params: object): string {
  const entries = Object.entries(params as Record<string, unknown>)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => [k, String(v)] as [string, string]);
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : "";
}

export interface TodoFilters {
  date?: string;
  weeklyPlanId?: string | "null";
  status?: string;
}

export const api = {
  yearGoals: {
    list: () => request<YearGoalDTO[]>("/api/year-goals"),
    create: (input: { title: string; description?: string; year: number }) =>
      request<YearGoalDTO>("/api/year-goals", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (
      id: string,
      input: Partial<{ title: string; description: string; year: number }>,
    ) =>
      request<YearGoalDTO>(`/api/year-goals/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: string) =>
      request<void>(`/api/year-goals/${id}`, { method: "DELETE" }),
  },
  weeklyPlans: {
    list: (params: { weekStart?: string; yearGoalId?: string } = {}) =>
      request<WeeklyPlanDTO[]>(`/api/weekly-plans${qs(params)}`),
    create: (input: {
      title: string;
      weekStart: string;
      yearGoalId?: string | null;
    }) =>
      request<WeeklyPlanDTO>("/api/weekly-plans", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (
      id: string,
      input: Partial<{
        title: string;
        weekStart: string;
        yearGoalId: string | null;
      }>,
    ) =>
      request<WeeklyPlanDTO>(`/api/weekly-plans/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: string) =>
      request<void>(`/api/weekly-plans/${id}`, { method: "DELETE" }),
  },
  todos: {
    list: (filters: TodoFilters = {}) =>
      request<TodoDTO[]>(`/api/todos${qs(filters)}`),
    create: (input: {
      title: string;
      description?: string;
      status?: string;
      weeklyPlanId?: string | null;
      date?: string | null;
      color?: TodoColor;
    }) =>
      request<TodoDTO>("/api/todos", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (
      id: string,
      input: Partial<{
        title: string;
        description: string;
        status: string;
        weeklyPlanId: string | null;
        date: string | null;
        order: number;
        color: TodoColor;
      }>,
    ) =>
      request<TodoDTO>(`/api/todos/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: string) =>
      request<void>(`/api/todos/${id}`, { method: "DELETE" }),
    reorder: (input: ReorderInput) =>
      request<TodoDTO[]>("/api/todos/reorder", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },
};
