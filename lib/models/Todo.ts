import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";
import { TODO_STATUSES } from "../types";

const todoSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: TODO_STATUSES,
      default: "todo",
      required: true,
    },
    weeklyPlanId: {
      type: Schema.Types.ObjectId,
      ref: "WeeklyPlan",
      default: null,
    },
    // 일일 화면 필터 기준. 항상 'YYYY-MM-DD'.
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    // 같은 status 컬럼 내 정렬 위치 (0-based).
    order: { type: Number, required: true, default: 0 },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

todoSchema.index({ date: 1 });
todoSchema.index({ weeklyPlanId: 1 });
todoSchema.index({ status: 1, order: 1 });

export type TodoSchemaType = InferSchemaType<typeof todoSchema>;

export const Todo: Model<TodoSchemaType> =
  (models.Todo as Model<TodoSchemaType>) ??
  model<TodoSchemaType>("Todo", todoSchema);

export default Todo;
