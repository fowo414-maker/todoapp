"use client";

import { useState } from "react";
import { useCreateTodo, useUpdateTodo } from "@/lib/queries";
import { TODO_COLORS, type TodoColor, type TodoDTO, type WeeklyPlanDTO } from "@/lib/types";
import { TODO_COLOR_HEX, TODO_COLOR_LABELS } from "@/lib/todoColors";

interface Props {
  onClose: () => void;
  todo?: TodoDTO | null;
  defaultDate: string;
  defaultWeeklyPlanId?: string | null;
  weeklyPlans: WeeklyPlanDTO[];
  /**
   * true 면 기한을 선택 항목으로 다룬다 ("기한 설정" 체크박스, 기본 해제).
   * false(기본) 면 날짜 입력을 항상 노출하고 필수로 받는다.
   */
  deadlineOptional?: boolean;
  /**
   * true 면 주간 계획 선택이 필수다 ("(미할당)" 옵션을 없애고, 계획 하나를
   * 기본 선택해 둔다). 주간 계획 화면에서 만드는 할 일은 항상 계획에
   * 속해야 하므로 사용한다. false(기본)면 "(미할당)" 옵션을 남겨 둔다.
   */
  requireWeeklyPlan?: boolean;
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
  deadlineOptional = false,
  requireWeeklyPlan = false,
}: Props) {
  const isEdit = Boolean(todo);
  const create = useCreateTodo();
  const update = useUpdateTodo();

  const [title, setTitle] = useState(todo?.title ?? "");
  const [description, setDescription] = useState(todo?.description ?? "");
  const [hasDeadline, setHasDeadline] = useState(
    deadlineOptional ? Boolean(todo?.date) : true,
  );
  const [date, setDate] = useState(todo?.date ?? defaultDate);
  const [weeklyPlanId, setWeeklyPlanId] = useState<string>(
    todo?.weeklyPlanId ??
      defaultWeeklyPlanId ??
      (requireWeeklyPlan ? (weeklyPlans[0]?.id ?? "") : ""),
  );
  const [color, setColor] = useState<TodoColor>(todo?.color ?? "none");

  const busy = create.isPending || update.isPending;
  const useDate = deadlineOptional ? hasDeadline : true;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (useDate && !date) return;
    if (requireWeeklyPlan && !weeklyPlanId) return;
    const payload = {
      title: title.trim(),
      description: description.trim(),
      date: useDate ? date : null,
      weeklyPlanId: weeklyPlanId || null,
      color,
    };
    try {
      if (isEdit && todo) {
        await update.mutateAsync({ id: todo.id, patch: payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch {
      // 실패 메시지는 뮤테이션 onError 의 토스트가 처리한다. 다이얼로그는 열어 둔다.
    }
  }

  const fieldClass =
    "mt-1 w-full rounded-md border border-line-strong bg-surface px-2 py-1.5 text-ink";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "할 일 수정" : "할 일 추가"}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-3 rounded-lg border border-line bg-surface p-5 shadow-xl"
      >
        <h2 className="text-base font-semibold text-ink">
          {isEdit ? "할 일 수정" : "할 일 추가"}
        </h2>

        <label className="block text-sm">
          <span className="text-ink-soft">제목</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={fieldClass}
            required
          />
        </label>

        <label className="block text-sm">
          <span className="text-ink-soft">설명 (선택)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={fieldClass}
          />
        </label>

        {deadlineOptional ? (
          <div className="text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hasDeadline}
                onChange={(e) => setHasDeadline(e.target.checked)}
              />
              <span className="text-ink-soft">기한 설정</span>
            </label>
            {hasDeadline ? (
              <input
                type="date"
                aria-label="기한"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={fieldClass}
              />
            ) : (
              <p className="mt-1 text-xs text-ink-faint">
                기한 없이 추가됩니다.
              </p>
            )}
          </div>
        ) : (
          <label className="block text-sm">
            <span className="text-ink-soft">날짜</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={fieldClass}
              required
            />
          </label>
        )}

        <label className="block text-sm">
          <span className="text-ink-soft">주간 계획</span>
          <select
            value={weeklyPlanId}
            onChange={(e) => setWeeklyPlanId(e.target.value)}
            className={fieldClass}
            required={requireWeeklyPlan}
          >
            {requireWeeklyPlan ? null : <option value="">(미할당)</option>}
            {weeklyPlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>

        <div className="text-sm">
          <span className="text-ink-soft">색상</span>
          <div
            role="radiogroup"
            aria-label="색상 선택"
            className="mt-1 flex flex-wrap gap-1.5"
          >
            {TODO_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={TODO_COLOR_LABELS[c]}
                title={TODO_COLOR_LABELS[c]}
                onClick={() => setColor(c)}
                className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                  color === c
                    ? "ring-2 ring-accent ring-offset-1"
                    : "border-line-strong"
                }`}
                style={
                  c === "none"
                    ? undefined
                    : { backgroundColor: TODO_COLOR_HEX[c] }
                }
              >
                {c === "none" ? (
                  <span
                    aria-hidden
                    className="text-[10px] leading-none text-ink-faint"
                  >
                    ✕
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-ink-soft hover:bg-raised"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={
              busy || !title.trim() || (requireWeeklyPlan && !weeklyPlanId)
            }
            className="rounded-md bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {isEdit ? "저장" : "추가"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TodoDialog;
