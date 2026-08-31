import { connectToDatabase } from "@/lib/db";
import { Todo } from "@/lib/models/Todo";
import { createTodoSchema } from "@/lib/validation/todo";
import { serializeTodo } from "@/lib/api/serialize";
import { created, handle, ok, readJson } from "@/lib/api/http";
import { TODO_STATUSES, type TodoStatus } from "@/lib/types";

const STATUS_ORDER: TodoStatus[] = ["todo", "doing", "done"];

function parseStatus(value: string | null): TodoStatus | undefined {
  return value && (TODO_STATUSES as readonly string[]).includes(value)
    ? (value as TodoStatus)
    : undefined;
}

export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const filter: {
      date?: string;
      weeklyPlanId?: string | null;
      status?: TodoStatus;
    } = {};

    const date = searchParams.get("date");
    if (date) filter.date = date;

    const weeklyPlanId = searchParams.get("weeklyPlanId");
    if (weeklyPlanId === "null" || weeklyPlanId === "unassigned") {
      filter.weeklyPlanId = null;
    } else if (weeklyPlanId) {
      filter.weeklyPlanId = weeklyPlanId;
    }

    const status = parseStatus(searchParams.get("status"));
    if (status) filter.status = status;

    const docs = await Todo.find(filter).exec();
    // status 를 컬럼 순서(todo→doing→done)로, 그 안에서는 order 오름차순으로 정렬.
    docs.sort((a, b) => {
      const s =
        STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      return s !== 0 ? s : a.order - b.order;
    });
    return ok(docs.map(serializeTodo));
  });
}

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    await connectToDatabase();
    const input = createTodoSchema.parse(await readJson(req));
    const status: TodoStatus = input.status ?? "todo";

    const order =
      input.order ?? (await Todo.countDocuments({ status }).exec());

    const doc = await Todo.create({
      title: input.title,
      description: input.description,
      status,
      weeklyPlanId: input.weeklyPlanId ?? null,
      date: input.date,
      order,
      completedAt: status === "done" ? new Date() : null,
    });
    return created(serializeTodo(doc));
  });
}
