import { connectToDatabase } from "@/lib/db";
import { YearGoal } from "@/lib/models/YearGoal";
import { createYearGoalSchema } from "@/lib/validation/yearGoal";
import { serializeYearGoal } from "@/lib/api/serialize";
import { created, handle, ok, readJson } from "@/lib/api/http";

export async function GET(): Promise<Response> {
  return handle(async () => {
    await connectToDatabase();
    const docs = await YearGoal.find()
      .sort({ year: -1, createdAt: -1 })
      .exec();
    return ok(docs.map(serializeYearGoal));
  });
}

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    await connectToDatabase();
    const input = createYearGoalSchema.parse(await readJson(req));
    const doc = await YearGoal.create(input);
    return created(serializeYearGoal(doc));
  });
}
