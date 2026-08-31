import type { HydratedDocument } from "mongoose";
import type {
  ProgressSummary,
  TodoDTO,
  WeeklyPlanDTO,
  YearGoalDTO,
} from "@/lib/types";
import type { YearGoalSchemaType } from "@/lib/models/YearGoal";
import type { WeeklyPlanSchemaType } from "@/lib/models/WeeklyPlan";
import type { TodoSchemaType } from "@/lib/models/Todo";

function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date().toISOString();
}

export function serializeYearGoal(
  doc: HydratedDocument<YearGoalSchemaType>,
): YearGoalDTO {
  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description ?? undefined,
    year: doc.year,
    createdAt: iso((doc as unknown as { createdAt: Date }).createdAt),
    updatedAt: iso((doc as unknown as { updatedAt: Date }).updatedAt),
  };
}

export function serializeWeeklyPlan(
  doc: HydratedDocument<WeeklyPlanSchemaType>,
  progress: ProgressSummary,
): WeeklyPlanDTO {
  return {
    id: doc._id.toString(),
    title: doc.title,
    yearGoalId: doc.yearGoalId ? doc.yearGoalId.toString() : null,
    weekStart: iso(doc.weekStart),
    createdAt: iso((doc as unknown as { createdAt: Date }).createdAt),
    updatedAt: iso((doc as unknown as { updatedAt: Date }).updatedAt),
    progress,
  };
}

export function serializeTodo(
  doc: HydratedDocument<TodoSchemaType>,
): TodoDTO {
  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description ?? undefined,
    status: doc.status,
    weeklyPlanId: doc.weeklyPlanId ? doc.weeklyPlanId.toString() : null,
    date: doc.date,
    order: doc.order,
    completedAt: doc.completedAt ? doc.completedAt.toISOString() : null,
    createdAt: iso((doc as unknown as { createdAt: Date }).createdAt),
    updatedAt: iso((doc as unknown as { updatedAt: Date }).updatedAt),
  };
}
