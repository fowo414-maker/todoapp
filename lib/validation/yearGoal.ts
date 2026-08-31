import { z } from "zod";

export const createYearGoalSchema = z.object({
  title: z.string().trim().min(1, "제목은 필수입니다"),
  description: z.string().trim().optional(),
  year: z
    .number()
    .int("연도는 정수여야 합니다")
    .gte(1970)
    .lte(9999),
});

export const updateYearGoalSchema = createYearGoalSchema.partial();

export type CreateYearGoalInput = z.infer<typeof createYearGoalSchema>;
export type UpdateYearGoalInput = z.infer<typeof updateYearGoalSchema>;
