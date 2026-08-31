import { z } from "zod";

const objectIdString = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "유효한 ID 형식이 아닙니다");

export const createWeeklyPlanSchema = z.object({
  title: z.string().trim().min(1, "제목은 필수입니다"),
  // 'YYYY-MM-DD' 또는 ISO 문자열 허용. 서버에서 월요일 00:00 UTC 로 정규화한다.
  weekStart: z.string().min(1, "주 시작일은 필수입니다"),
  yearGoalId: objectIdString.nullable().optional(),
});

export const updateWeeklyPlanSchema = createWeeklyPlanSchema.partial();

export type CreateWeeklyPlanInput = z.infer<typeof createWeeklyPlanSchema>;
export type UpdateWeeklyPlanInput = z.infer<typeof updateWeeklyPlanSchema>;
