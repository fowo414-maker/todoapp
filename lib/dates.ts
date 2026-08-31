import { addWeeks } from "date-fns";

/**
 * 날짜 유틸.
 *
 * 모든 계산은 UTC 기준으로 수행해 타임존/DST 로 인한 하루 밀림을 방지한다.
 * - 주(week)는 월요일 시작.
 * - 일일 Todo 의 `date` 는 항상 'YYYY-MM-DD' 문자열로 저장/필터한다.
 */

function toUtcMidnight(input: Date | string): Date {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) {
    throw new Error(`유효하지 않은 날짜: ${String(input)}`);
  }
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

/** 주어진 날짜가 속한 주의 월요일 00:00:00.000 UTC 를 반환한다. */
export function normalizeWeekStart(input: Date | string): Date {
  const base = toUtcMidnight(input);
  const day = base.getUTCDay(); // 0=일 .. 6=토
  const deltaToMonday = day === 0 ? -6 : 1 - day;
  base.setUTCDate(base.getUTCDate() + deltaToMonday);
  return base;
}

/** Date 또는 날짜 문자열을 'YYYY-MM-DD' (UTC) 로 변환한다. */
export function toDateString(input: Date | string): string {
  const d = toUtcMidnight(input);
  const y = String(d.getUTCFullYear()).padStart(4, "0");
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 'YYYY-MM-DD' 문자열을 UTC 자정 Date 로 파싱한다. 형식이 틀리면 throw. */
export function parseDateString(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`'YYYY-MM-DD' 형식이 아닙니다: ${value}`);
  }
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    throw new Error(`존재하지 않는 날짜입니다: ${value}`);
  }
  return date;
}

/** weekStart 를 delta 주만큼 이동한 뒤 다시 월요일로 정규화한다. */
export function shiftWeek(weekStart: Date | string, delta: number): Date {
  return normalizeWeekStart(addWeeks(normalizeWeekStart(weekStart), delta));
}

/** 오늘(UTC) 이 속한 주의 월요일. */
export function currentWeekStart(now: Date = new Date()): Date {
  return normalizeWeekStart(now);
}
