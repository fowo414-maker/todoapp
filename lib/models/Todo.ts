import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";
import { TODO_COLORS, TODO_STATUSES } from "../types";

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
    // 마감 기한 (선택). 값이 있으면 항상 'YYYY-MM-DD'. 없으면 null.
    date: {
      type: String,
      default: null,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    // 주간 보기에서 주간 계획 없이("미할당") 만든 할 일이 속한 주의 월요일
    // ('YYYY-MM-DD'). weeklyPlanId 가 있거나 할 일 목록에서 만든 경우 null.
    weekStart: {
      type: String,
      default: null,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    // 같은 status 컬럼 내 정렬 위치 (0-based).
    order: { type: Number, required: true, default: 0 },
    // 카드에 붙이는 파스텔 색상 태그. "none" 이면 색상 없음.
    color: {
      type: String,
      enum: TODO_COLORS,
      default: "none",
      required: true,
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

todoSchema.index({ date: 1 });
todoSchema.index({ weeklyPlanId: 1 });
todoSchema.index({ weekStart: 1 });
todoSchema.index({ status: 1, order: 1 });

export type TodoSchemaType = InferSchemaType<typeof todoSchema>;

export const Todo: Model<TodoSchemaType> =
  (models.Todo as Model<TodoSchemaType>) ??
  model<TodoSchemaType>("Todo", todoSchema);

export default Todo;
