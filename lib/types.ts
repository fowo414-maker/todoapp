export type TodoStatus = "todo" | "doing" | "done";

export const TODO_STATUSES: readonly TodoStatus[] = ["todo", "doing", "done"];

export const STATUS_LABELS: Record<TodoStatus, string> = {
  todo: "todo",
  doing: "doing",
  done: "done",
};

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
  /** 마감 기한 (선택). 기한 없는 할 일은 null. 항상 'YYYY-MM-DD'. */
  date: string | null;
  order: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
