import { connectToDatabase } from "@/lib/db";
import { Todo } from "@/lib/models/Todo";
import { reorderSchema } from "@/lib/validation/todo";
import { applyReorder, normalizeReorder } from "@/lib/api/reorder";
import { serializeTodo } from "@/lib/api/serialize";
import { handle, ok, readJson } from "@/lib/api/http";

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    await connectToDatabase();
    const input = reorderSchema.parse(await readJson(req));
    const columns = normalizeReorder(input);
    await applyReorder(columns);

    const affectedStatuses = [...new Set(columns.map((c) => c.status))];
    const docs = await Todo.find({ status: { $in: affectedStatuses } })
      .sort({ status: 1, order: 1 })
      .exec();
    return ok(docs.map(serializeTodo));
  });
}
