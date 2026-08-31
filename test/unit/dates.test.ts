import { describe, it, expect } from "vitest";
import {
  normalizeWeekStart,
  toDateString,
  parseDateString,
  shiftWeek,
} from "@/lib/dates";

describe("normalizeWeekStart", () => {
  it("수요일이면 같은 주 월요일 00:00 UTC 로 정규화", () => {
    // 2026-09-02 는 수요일
    const result = normalizeWeekStart("2026-09-02T15:30:00.000Z");
    expect(result.toISOString()).toBe("2026-08-31T00:00:00.000Z");
  });

  it("월요일은 그대로 (자정으로만 절삭)", () => {
    const result = normalizeWeekStart("2026-08-31T09:00:00.000Z");
    expect(result.toISOString()).toBe("2026-08-31T00:00:00.000Z");
  });

  it("일요일이면 직전 월요일로", () => {
    // 2026-09-06 는 일요일 → 2026-08-31 월요일
    const result = normalizeWeekStart("2026-09-06T23:59:59.000Z");
    expect(result.toISOString()).toBe("2026-08-31T00:00:00.000Z");
  });

  it("연말 경계: 2025-12-31(수) → 2025-12-29(월)", () => {
    const result = normalizeWeekStart("2025-12-31T12:00:00.000Z");
    expect(result.toISOString()).toBe("2025-12-29T00:00:00.000Z");
  });

  it("DST 전환 시각(미국 봄 2026-03-08 07:00Z 부근)에도 UTC 기준으로 안정적", () => {
    const result = normalizeWeekStart("2026-03-08T07:30:00.000Z");
    // 2026-03-08 는 일요일 → 직전 월요일 2026-03-02
    expect(result.toISOString()).toBe("2026-03-02T00:00:00.000Z");
  });

  it("Date 입력도 허용", () => {
    const result = normalizeWeekStart(new Date("2026-09-02T00:00:00.000Z"));
    expect(result.toISOString()).toBe("2026-08-31T00:00:00.000Z");
  });
});

describe("toDateString", () => {
  it("Date → 'YYYY-MM-DD' (UTC)", () => {
    expect(toDateString(new Date("2026-08-31T23:00:00.000Z"))).toBe(
      "2026-08-31",
    );
  });

  it("한 자리 월/일은 0 패딩", () => {
    expect(toDateString(new Date("2026-01-05T00:00:00.000Z"))).toBe(
      "2026-01-05",
    );
  });
});

describe("parseDateString", () => {
  it("'YYYY-MM-DD' → UTC 자정 Date", () => {
    expect(parseDateString("2026-08-31").toISOString()).toBe(
      "2026-08-31T00:00:00.000Z",
    );
  });

  it("형식이 틀리면 throw", () => {
    expect(() => parseDateString("2026-8-31")).toThrow();
    expect(() => parseDateString("08/31/2026")).toThrow();
    expect(() => parseDateString("")).toThrow();
  });

  it("존재하지 않는 날짜면 throw", () => {
    expect(() => parseDateString("2026-02-30")).toThrow();
    expect(() => parseDateString("2026-13-01")).toThrow();
  });

  it("toDateString 과 왕복 일치", () => {
    expect(toDateString(parseDateString("2025-12-29"))).toBe("2025-12-29");
  });
});

describe("shiftWeek", () => {
  it("+1 주", () => {
    expect(shiftWeek("2026-08-31", 1).toISOString()).toBe(
      "2026-09-07T00:00:00.000Z",
    );
  });

  it("-2 주", () => {
    expect(shiftWeek("2026-08-31", -2).toISOString()).toBe(
      "2026-08-17T00:00:00.000Z",
    );
  });

  it("연말을 넘는 이동도 월요일 유지", () => {
    const d = shiftWeek("2025-12-29", 2);
    expect(d.toISOString()).toBe("2026-01-12T00:00:00.000Z");
    expect(d.getUTCDay()).toBe(1);
  });
});
