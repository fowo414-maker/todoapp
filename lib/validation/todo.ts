import { z } from "zod";
import { TODO_COLORS } from "@/lib/types";

const objectIdString = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "유효한 ID 형식이 아닙니다");

export const todoStatusSchema = z.enum(["todo", "doing", "done"]);
export const todoColorSchema = z.enum(TODO_COLORS);

export const createTodoSchema = z.object({
  title: z.string().trim().min(1, "제목은 필수입니다"),
  description: z.string().trim().optional(),
  // color 와 마찬가지로 기본값을 스키마에서 강제하지 않는다: `.default()` 는
  // updateTodoSchema(=이 스키마의 .partial())에서도 값이 그대로 남아 있어,
  // status 를 건드리지 않는 부분 업데이트(제목/설명/날짜 등만 수정) 시에도
  // "todo" 로 강제 리셋되어 버린다. 생성 시 기본값은 라우트에서 처리한다.
  status: todoStatusSchema.optional(),
  weeklyPlanId: objectIdString.nullable().optional(),
  // 기한은 선택. 값이 있으면 'YYYY-MM-DD' 형식이어야 한다.
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "'YYYY-MM-DD' 형식이어야 합니다")
    .nullish(),
  order: z.number().int().min(0).optional(),
  // status 와 마찬가지로 `.default()` 를 쓰지 않는다 (위 주석 참고): 부분 업데이트 시
  // 색상을 건드리지 않아도 "none"으로 되돌아가 버리는 것을 막기 위함.
  color: todoColorSchema.optional(),
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
