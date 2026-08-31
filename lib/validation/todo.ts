import { z } from "zod";

const objectIdString = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "유효한 ID 형식이 아닙니다");

export const todoStatusSchema = z.enum(["todo", "doing", "done"]);

export const createTodoSchema = z.object({
  title: z.string().trim().min(1, "제목은 필수입니다"),
  description: z.string().trim().optional(),
  status: todoStatusSchema.default("todo"),
  weeklyPlanId: objectIdString.nullable().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "'YYYY-MM-DD' 형식이어야 합니다"),
  order: z.number().int().min(0).optional(),
});

export const updateTodoSchema = createTodoSchema.partial();

const reorderColumnSchema = z.object({
  status: todoStatusSchema,
  orderedIds: z.array(objectIdString),
});

export const reorderSchema = z
  .object({
    // 단일 컬럼 형태
    status: todoStatusSchema.optional(),
    orderedIds: z.array(objectIdString).optional(),
    // 다중 컬럼 형태 (컬럼 간 이동 시 원본 + 대상 컬럼 모두 전달)
    columns: z.array(reorderColumnSchema).min(1).max(3).optional(),
  })
  .refine(
    (v) =>
      (v.columns && v.columns.length > 0) ||
      (v.status !== undefined &&
        v.orderedIds !== undefined &&
        v.orderedIds.length > 0),
    { message: "status+orderedIds 또는 columns 중 하나는 필수입니다" },
  );

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
export type ReorderInput = z.infer<typeof reorderSchema>;
