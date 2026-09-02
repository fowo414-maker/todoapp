"use client";

import { useMemo, useState } from "react";
import { TodoDialog } from "@/components/board/TodoDialog";
import { Skeleton } from "@/components/common/Skeleton";
import { useTodos, useWeeklyPlans } from "@/lib/queries";
import { normalizeWeekStart, toDateString } from "@/lib/dates";
import { TODO_COLOR_HEX, TODO_COLOR_BG_HEX } from "@/lib/todoColors";
import type { TodoDTO } from "@/lib/types";

// 주는 월요일 시작 (lib/dates 와 동일). 일요일만 빨간색으로 강조한다.
const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
/** 한 칸에 노출할 할 일 최대 개수. 넘치면 "+N" 으로 접는다. */
const MAX_CHIPS_PER_DAY = 4;

function addUtcDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

/**
 * 기한(date)이 설정된 할 일을 월 단위 달력으로 보여준다.
 * 칩을 누르면 수정 다이얼로그, 빈 칸을 누르면 그 날짜로 추가 다이얼로그가 열린다.
 */
export function CalendarView() {
  const todosQuery = useTodos({});
  const plansQuery = useWeeklyPlans();

  const [monthOffset, setMonthOffset] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TodoDTO | null>(null);
  const [addDate, setAddDate] = useState(() => toDateString(new Date()));

  // 보고 있는 달의 1일 (UTC).
  const viewMonth = useMemo(() => {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1),
    );
  }, [monthOffset]);

  // 1일이 속한 주의 월요일부터, 말일이 속한 주의 일요일까지 (항상 완전한 주 단위).
  const gridDays = useMemo(() => {
    const gridStart = normalizeWeekStart(viewMonth);
    const lastOfMonth = new Date(
      Date.UTC(viewMonth.getUTCFullYear(), viewMonth.getUTCMonth() + 1, 0),
    );
    const gridEnd = addUtcDays(normalizeWeekStart(lastOfMonth), 6);
    const days: Date[] = [];
    for (
      let d = gridStart;
      d.getTime() <= gridEnd.getTime();
      d = addUtcDays(d, 1)
    ) {
      days.push(d);
    }
    return days;
  }, [viewMonth]);

  const todos = useMemo(() => todosQuery.data ?? [], [todosQuery.data]);

  const todosByDate = useMemo(() => {
    const map = new Map<string, TodoDTO[]>();
    for (const t of todos) {
      if (!t.date) continue;
      const bucket = map.get(t.date);
      if (bucket) bucket.push(t);
      else map.set(t.date, [t]);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => {
        const ad = a.status === "done";
        const bd = b.status === "done";
        if (ad !== bd) return ad ? 1 : -1; // 완료는 아래로
        return a.order - b.order;
      });
    }
    return map;
  }, [todos]);

  const monthIndex = viewMonth.getUTCMonth();
  const todayStr = toDateString(new Date());
  const monthLabel = `${viewMonth.getUTCFullYear()}년 ${monthIndex + 1}월`;

  const monthCount = useMemo(
    () =>
      gridDays.reduce((sum, d) => {
        if (d.getUTCMonth() !== monthIndex) return sum;
        return sum + (todosByDate.get(toDateString(d))?.length ?? 0);
      }, 0),
    [gridDays, todosByDate, monthIndex],
  );

  function openAdd(dateStr: string) {
    setEditing(null);
    setAddDate(dateStr);
    setDialogOpen(true);
  }
  function openEdit(todo: TodoDTO) {
    setEditing(todo);
    setDialogOpen(true);
  }

  const navBtn =
    "rounded-md border border-line-strong px-3 py-1.5 text-sm text-ink-soft hover:bg-raised hover:text-ink";

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-ink">캘린더</h1>
          <span className="text-sm text-ink-soft">{monthLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonthOffset((o) => o - 1)}
            className={navBtn}
          >
            <span aria-hidden className="mr-1.5 text-[0.7em]">
              ◀
            </span>
            이전 달
          </button>
          <button
            type="button"
            onClick={() => setMonthOffset(0)}
            className={navBtn}
          >
            이번 달
          </button>
          <button
            type="button"
            onClick={() => setMonthOffset((o) => o + 1)}
            className={navBtn}
          >
            다음 달
            <span aria-hidden className="ml-1.5 text-[0.7em]">
              ▶
            </span>
          </button>
        </div>
      </header>

      <p className="text-xs text-ink-faint">
        기한이 설정된 할 일만 표시합니다 · 이번 달 {monthCount}개
      </p>

      {todosQuery.isLoading ? (
        <Skeleton rows={6} />
      ) : todosQuery.isError ? (
        <p role="alert" className="text-sm text-red-600">
          할 일을 불러오지 못했습니다. 새로고침 해주세요.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-t-lg border border-line bg-line text-center">
              {WEEKDAYS.map((w, i) => (
                <div
                  key={w}
                  className={`bg-surface py-2 text-xs font-medium ${
                    i === 6 ? "text-red-500" : "text-ink-soft"
                  }`}
                >
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-b-lg border border-t-0 border-line bg-line">
              {gridDays.map((day) => {
                const key = toDateString(day);
                const inMonth = day.getUTCMonth() === monthIndex;
                const isToday = key === todayStr;
                const dayTodos = todosByDate.get(key) ?? [];
                const shown = dayTodos.slice(0, MAX_CHIPS_PER_DAY);
                const extra = dayTodos.length - shown.length;
                return (
                  <div
                    key={key}
                    onClick={() => openAdd(key)}
                    className={`flex min-h-[108px] cursor-pointer flex-col gap-1 p-1.5 text-left transition-colors hover:bg-raised ${
                      inMonth ? "bg-surface" : "bg-canvas"
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 min-w-6 items-center justify-center self-start rounded-full px-1 text-xs tabular-nums ${
                        isToday
                          ? "bg-accent font-semibold text-white"
                          : inMonth
                            ? "text-ink"
                            : "text-ink-faint"
                      }`}
                    >
                      {day.getUTCDate()}
                    </span>
                    <ul className="space-y-0.5">
                      {shown.map((t) => {
                        const hasColor = t.color !== "none";
                        const done = t.status === "done";
                        return (
                          <li key={t.id}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(t);
                              }}
                              title={t.title}
                              style={
                                hasColor
                                  ? {
                                      backgroundColor:
                                        TODO_COLOR_BG_HEX[t.color],
                                      borderLeft: `3px solid ${TODO_COLOR_HEX[t.color]}`,
                                    }
                                  : undefined
                              }
                              className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] ${
                                hasColor ? "" : "bg-raised"
                              } ${
                                done
                                  ? "text-ink-faint line-through"
                                  : "text-ink"
                              }`}
                            >
                              {done ? "✓ " : ""}
                              {t.title}
                            </button>
                          </li>
                        );
                      })}
                      {extra > 0 ? (
                        <li className="px-1.5 text-[11px] text-ink-faint">
                          +{extra}
                        </li>
                      ) : null}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {dialogOpen ? (
        <TodoDialog
          key={editing?.id ?? `new-${addDate}`}
          deadlineOptional
          onClose={() => setDialogOpen(false)}
          todo={editing}
          defaultDate={editing?.date ?? addDate}
          weeklyPlans={plansQuery.data ?? []}
        />
      ) : null}
    </section>
  );
}

export default CalendarView;
