import { connectToDatabase } from "@/lib/db";
import { WeeklyPlan } from "@/lib/models/WeeklyPlan";
import { Todo } from "@/lib/models/Todo";
import { updateWeeklyPlanSchema } from "@/lib/validation/weeklyPlan";
import { serializeWeeklyPlan } from "@/lib/api/serialize";
import { progressByPlanId } from "@/lib/api/weeklyPlanProgress";
import { normalizeWeekStart } from "@/lib/dates";
import { handle, noContent, notFound, ok, readJson } from "@/lib/api/http";

type Ctx = { params: Promise<{ id: string }> };

async function respondWithProgress(id: string): Promise<Response> {
  const doc = await WeeklyPlan.findById(id).exec();
  if (!doc) return notFound();
  const progress = await progressByPlanId([doc._id]);
  return ok(
    serializeWeeklyPlan(
      doc,
      progress.get(doc._id.toString()) ?? { done: 0, total: 0, ratio: 0 },
    ),
  );
}

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  return handle(async () => {
    await connectToDatabase();
    const { id } = await ctx.params;
    return respondWithProgress(id);
  });
}

export async function PATCH(req: Request, ctx: Ctx): Promise<Response> {
  return handle(async () => {
    await connectToDatabase();
    const { id } = await ctx.params;
    const input = updateWeeklyPlanSchema.parse(await readJson(req));

    const update: Record<string, unknown> = {};
    if (input.title !== undefined) update.title = input.title;
    if (input.yearGoalId !== undefined)
      update.yearGoalId = input.yearGoalId ?? null;
    if (input.weekStart !== undefined)
      update.weekStart = normalizeWeekStart(input.weekStart);

    const doc = await WeeklyPlan.findByIdAndUpdate(id, update, {
      returnDocument: "after",
      runValidators: true,
    }).exec();
    if (!doc) return notFound();
    return respondWithProgress(doc._id.toString());
  });
}

export async function DELETE(_req: Request, ctx: Ctx): Promise<Response> {
  return handle(async () => {
    await connectToDatabase();
    const { id } = await ctx.params;
    const doc = await WeeklyPlan.findByIdAndDelete(id).exec();
    if (!doc) return notFound();
    // 연결된 Todo 는 삭제하지 않고 참조만 해제한다 ("미할당" 으로 이동).
    await Todo.updateMany(
      { weeklyPlanId: id },
      { $set: { weeklyPlanId: null } },
    ).exec();
    return noContent();
  });
}
