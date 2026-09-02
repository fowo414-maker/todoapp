import { connectToDatabase } from "@/lib/db";
import { Todo } from "@/lib/models/Todo";
import { updateTodoSchema } from "@/lib/validation/todo";
import { serializeTodo } from "@/lib/api/serialize";
import { handle, noContent, notFound, ok, readJson } from "@/lib/api/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  return handle(async () => {
    await connectToDatabase();
    const { id } = await ctx.params;
    const doc = await Todo.findById(id).exec();
    if (!doc) return notFound();
    return ok(serializeTodo(doc));
  });
}

export async function PATCH(req: Request, ctx: Ctx): Promise<Response> {
  return handle(async () => {
    await connectToDatabase();
    const { id } = await ctx.params;
    const input = updateTodoSchema.parse(await readJson(req));

    const doc = await Todo.findById(id).exec();
    if (!doc) return notFound();

    if (input.title !== undefined) doc.title = input.title;
    if (input.description !== undefined) doc.description = input.description;
    if (input.weeklyPlanId !== undefined)
      doc.weeklyPlanId = input.weeklyPlanId
        ? (input.weeklyPlanId as unknown as typeof doc.weeklyPlanId)
        : null;
    if (input.date !== undefined) doc.date = input.date ?? null;
    if (input.order !== undefined) doc.order = input.order;
    if (input.color !== undefined) doc.color = input.color;

    if (input.status !== undefined && input.status !== doc.status) {
      const nowDone = input.status === "done";
      const wasDone = doc.status === "done";
      doc.status = input.status;
      if (nowDone && !wasDone) doc.completedAt = new Date();
      if (!nowDone && wasDone) doc.completedAt = null;
    }

    await doc.save();
    return ok(serializeTodo(doc));
  });
}

export async function DELETE(_req: Request, ctx: Ctx): Promise<Response> {
  return handle(async () => {
    await connectToDatabase();
    const { id } = await ctx.params;
    const doc = await Todo.findByIdAndDelete(id).exec();
    if (!doc) return notFound();
    return noContent();
  });
}
