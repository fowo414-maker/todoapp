export type TodoStatus = "todo" | "doing" | "done";

export const TODO_STATUSES: readonly TodoStatus[] = ["todo", "doing", "done"];

export interface ProgressSummary {
  done: number;
  total: number;
  ratio: number;
}

export interface YearGoalDTO {
  id: string;
  title: string;
  description?: string;
  year: number;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyPlanDTO {
  id: string;
  title: string;
  yearGoalId: string | null;
  weekStart: string;
  createdAt: string;
  updatedAt: string;
  progress: ProgressSummary;
}

export interface TodoDTO {
  id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  weeklyPlanId: string | null;
  date: string;
  order: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
