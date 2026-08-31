import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

const weeklyPlanSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    yearGoalId: {
      type: Schema.Types.ObjectId,
      ref: "YearGoal",
      default: null,
    },
    // 해당 주 월요일 00:00 UTC 로 정규화되어 저장된다 (lib/dates.normalizeWeekStart).
    weekStart: { type: Date, required: true },
  },
  { timestamps: true },
);

weeklyPlanSchema.index({ weekStart: 1 });
weeklyPlanSchema.index({ yearGoalId: 1 });

export type WeeklyPlanSchemaType = InferSchemaType<typeof weeklyPlanSchema>;

export const WeeklyPlan: Model<WeeklyPlanSchemaType> =
  (models.WeeklyPlan as Model<WeeklyPlanSchemaType>) ??
  model<WeeklyPlanSchemaType>("WeeklyPlan", weeklyPlanSchema);

export default WeeklyPlan;
