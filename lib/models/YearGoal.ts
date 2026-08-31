import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

const yearGoalSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    year: { type: Number, required: true, min: 1970, max: 9999 },
  },
  { timestamps: true },
);

export type YearGoalSchemaType = InferSchemaType<typeof yearGoalSchema>;

export const YearGoal: Model<YearGoalSchemaType> =
  (models.YearGoal as Model<YearGoalSchemaType>) ??
  model<YearGoalSchemaType>("YearGoal", yearGoalSchema);

export default YearGoal;
