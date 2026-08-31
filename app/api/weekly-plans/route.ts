import { connectToDatabase } from "@/lib/db";
import { WeeklyPlan } from "@/lib/models/WeeklyPlan";
import { createWeeklyPlanSchema } from "@/lib/validation/weeklyPlan";
import { serializeWeeklyPlan } from "@/lib/api/serialize";
import { progressByPlanId } from "@/lib/api/weeklyPlanProgress";
import { normalizeWeekStart } from "@/lib/dates";
import { created, handle, ok, readJson } from "@/lib/api/http";

export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const filter: { weekStart?: Date; yearGoalId?: string | null } = {};
    const weekStart = searchParams.get("weekStart");
    if (weekStart) {
      filter.weekStart = normalizeWeekStart(weekStart);
    }
    const yearGoalId = searchParams.get("yearGoalId");
    if (yearGoalId === "null") {
      filter.yearGoalId = null;
    } else if (yearGoalId) {
      filter.yearGoalId = yearGoalId;
    }

    const docs = await WeeklyPlan.find(filter)
      .sort({ weekStart: 1, createdAt: 1 })
      .exec();
    const progress = await progressByPlanId(docs.map((d) => d._id));

    return ok(
      docs.map((doc) =>
        serializeWeeklyPlan(
          doc,
          progress.get(doc._id.toString()) ?? {
            done: 0,
            total: 0,
            ratio: 0,
          },
        ),
      ),
    );
  });
}

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    await connectToDatabase();
    const input = createWeeklyPlanSchema.parse(await readJson(req));
    const doc = await WeeklyPlan.create({
      title: input.title,
      yearGoalId: input.yearGoalId ?? null,
      weekStart: normalizeWeekStart(input.weekStart),
    });
    return created(
      serializeWeeklyPlan(doc, { done: 0, total: 0, ratio: 0 }),
    );
  });
}
