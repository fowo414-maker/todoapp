import { connectToDatabase } from "@/lib/db";
import { YearGoal } from "@/lib/models/YearGoal";
import { WeeklyPlan } from "@/lib/models/WeeklyPlan";
import { updateYearGoalSchema } from "@/lib/validation/yearGoal";
import { serializeYearGoal } from "@/lib/api/serialize";
import { handle, noContent, notFound, ok, readJson } from "@/lib/api/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  return handle(async () => {
    await connectToDatabase();
    const { id } = await ctx.params;
    const doc = await YearGoal.findById(id).exec();
    if (!doc) return notFound();
    return ok(serializeYearGoal(doc));
  });
}

export async function PATCH(req: Request, ctx: Ctx): Promise<Response> {
  return handle(async () => {
    await connectToDatabase();
    const { id } = await ctx.params;
    const input = updateYearGoalSchema.parse(await readJson(req));
    const doc = await YearGoal.findByIdAndUpdate(id, input, {
      returnDocument: "after",
      runValidators: true,
    }).exec();
    if (!doc) return notFound();
    return ok(serializeYearGoal(doc));
  });
}

export async function DELETE(_req: Request, ctx: Ctx): Promise<Response> {
  return handle(async () => {
    await connectToDatabase();
    const { id } = await ctx.params;
    const doc = await YearGoal.findByIdAndDelete(id).exec();
    if (!doc) return notFound();
    // 연결된 주간 계획은 삭제하지 않고 참조만 해제한다 (데이터 손실 방지).
    await WeeklyPlan.updateMany(
      { yearGoalId: id },
      { $set: { yearGoalId: null } },
    ).exec();
    return noContent();
  });
}
