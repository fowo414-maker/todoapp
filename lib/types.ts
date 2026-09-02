export type TodoStatus = "todo" | "doing" | "done";

export const TODO_STATUSES: readonly TodoStatus[] = ["todo", "doing", "done"];

export const STATUS_LABELS: Record<TodoStatus, string> = {
  todo: "todo",
  doing: "doing",
  done: "done",
};

// 할 일 카드에 붙일 수 있는 파스텔 색상 태그. "none" 은 색상 없음(기본값).
export const TODO_COLORS = [
  "none",
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "purple",
  "pink",
] as const;

export type TodoColor = (typeof TODO_COLORS)[number];

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
  /**
   * 주간 보기에서 주간 계획 없이("미할당") 만든 할 일이 속한 주의 월요일
   * ('YYYY-MM-DD'). 주간 계획에 할당되어 있거나 할 일 목록에서 만든 경우 null.
   * 해당 주의 보드/진행률에 포함시키는 용도로만 쓰이며 화면에 노출되지는 않는다.
   */
  weekStart?: string | null;
  color: TodoColor;
  order: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
