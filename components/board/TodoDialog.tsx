"use client";

import { useState } from "react";
import {
  useCreateTodo,
  useDeleteTodo,
  useUpdateTodo,
} from "@/lib/queries";
import type { TodoDTO, WeeklyPlanDTO } from "@/lib/types";

interface Props {
  onClose: () => void;
  todo?: TodoDTO | null;
  defaultDate: string;
  defaultWeeklyPlanId?: string | null;
  weeklyPlans: WeeklyPlanDTO[];
}

/**
 * 할 일 생성/수정 다이얼로그.
 * 대상이 바뀔 때는 부모에서 `key` 를 바꿔 remount 시킨다 (초기값은 props 에서 직접).
 */
export function TodoDialog({
  onClose,
  todo,
  defaultDate,
  defaultWeeklyPlanId = null,
  weeklyPlans,
}: Props) {
  const isEdit = Boolean(todo);
  const create = useCreateTodo();
  const update = useUpdateTodo();
  const remove = useDeleteTodo();

  const [title, setTitle] = useState(todo?.title ?? "");
  const [description, setDescription] = useState(todo?.description ?? "");
  const [date, setDate] = useState(todo?.date ?? defaultDate);
  const [weeklyPlanId, setWeeklyPlanId] = useState<string>(
    todo?.weeklyPlanId ?? defaultWeeklyPlanId ?? "",
  );

  const busy = create.isPending || update.isPending || remove.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      date,
      weeklyPlanId: weeklyPlanId || null,
    };
    if (isEdit && todo) {
      await update.mutateAsync({ id: todo.id, patch: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onClose();
  }

  async function handleDelete() {
    if (!todo) return;
    if (!window.confirm("이 할 일을 삭제할까요?")) return;
    await remove.mutateAsync(todo.id);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "할 일 수정" : "할 일 추가"}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-3 rounded-lg bg-white p-5 shadow-xl"
      >
        <h2 className="text-base font-semibold">
          {isEdit ? "할 일 수정" : "할 일 추가"}
        </h2>

        <label className="block text-sm">
          <span className="text-neutral-600">제목</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5"
            required
          />
        </label>

        <label className="block text-sm">
          <span className="text-neutral-600">설명 (선택)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5"
          />
        </label>

        <label className="block text-sm">
          <span className="text-neutral-600">날짜</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5"
            required
          />
        </label>

        <label className="block text-sm">
          <span className="text-neutral-600">주간 계획</span>
          <select
            value={weeklyPlanId}
            onChange={(e) => setWeeklyPlanId(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5"
          >
            <option value="">(미할당)</option>
            {weeklyPlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center justify-between pt-2">
          {isEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              삭제
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={busy || !title.trim()}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {isEdit ? "저장" : "추가"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default TodoDialog;
