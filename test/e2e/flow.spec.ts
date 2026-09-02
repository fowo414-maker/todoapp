import { test, expect, type Page } from "@playwright/test";

/**
 * @dnd-kit(PointerSensor, activationConstraint.distance=4) 을 위한 드래그 헬퍼.
 * 활성화 임계값을 넘기려면 down 직후 여러 step 으로 move 해야 한다.
 */
async function dragCardToColumn(
  page: Page,
  todoId: string,
  targetColumn: "todo" | "doing" | "done",
) {
  // 카드 전체가 드래그 대상이다 (별도 핸들 없음).
  const handle = page.locator(`[data-todo-id="${todoId}"]`);
  const target = page.locator(`[data-testid="column-${targetColumn}"]`);
  const hb = await handle.boundingBox();
  const tb = await target.boundingBox();
  if (!hb || !tb) throw new Error("boundingBox 를 가져오지 못했습니다");

  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + hb.width / 2 + 8, hb.y + hb.height / 2 + 8, {
    steps: 6,
  });
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, {
    steps: 25,
  });
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2 + 6, {
    steps: 6,
  });
  await page.mouse.up();
}

async function addTodo(
  page: Page,
  title: string,
  planLabel?: string,
  { expectVisible = true }: { expectVisible?: boolean } = {},
) {
  await page.getByRole("button", { name: "+ 할 일" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("제목").fill(title);
  if (planLabel) {
    await dialog.getByLabel("주간 계획").selectOption({ label: planLabel });
  }
  await dialog.getByRole("button", { name: "추가" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  if (expectVisible) {
    await expect(
      page.locator('[data-testid="todo-card"]', { hasText: title }),
    ).toBeVisible();
  }
}

async function addPlan(page: Page, title: string) {
  await page.getByPlaceholder("새 주간 계획 제목").fill(title);
  await page
    .locator("form", { has: page.getByPlaceholder("새 주간 계획 제목") })
    .getByRole("button", { name: "추가" })
    .click();
  await expect(
    page.locator('[data-testid="weekly-plan"]', { hasText: title }),
  ).toBeVisible();
}

test.describe("목표 연동 To-Do 전체 흐름", () => {
  test.beforeEach(async ({ request }) => {
    // 각 테스트 전 데이터 초기화
    for (const path of ["/api/todos", "/api/weekly-plans", "/api/year-goals"]) {
      const items = await (await request.get(path)).json();
      for (const item of items) {
        await request.delete(`${path}/${item.id}`);
      }
    }
  });

  test("목표 → 주간 계획 → 할 일 → done 드래그 → 진행률 갱신 → 새로고침 유지", async ({
    page,
  }) => {
    // 1) 1년 목표 생성
    await page.goto("/year");
    await page.getByPlaceholder("새 1년 목표").fill("E2E 목표");
    await page.getByRole("button", { name: "추가" }).click();
    await expect(
      page.locator('[data-testid="year-goal"]', { hasText: "E2E 목표" }),
    ).toBeVisible();

    // 2) 주간 계획 생성 + 목표 연결
    await page.goto("/week");
    await addPlan(page, "E2E 1주차");
    const plan = page.locator('[data-testid="weekly-plan"]', {
      hasText: "E2E 1주차",
    });
    await plan.getByRole("combobox").selectOption({ label: "E2E 목표" });

    // 3) 할 일 생성 + 계획 연결
    await addTodo(page, "E2E 할 일", "E2E 1주차");

    const card = page.locator('[data-testid="todo-card"]', {
      hasText: "E2E 할 일",
    });
    const todoId = await card.getAttribute("data-todo-id");
    expect(todoId).toBeTruthy();

    // 초기 진행률 0%
    await expect(page.locator('[data-testid="week-progress"]')).toHaveAttribute(
      "data-percent",
      "0",
    );

    // 4) done 컬럼으로 드래그
    await dragCardToColumn(page, todoId!, "done");

    await expect(
      page.locator('[data-testid="column-done"] [data-todo-id="' + todoId + '"]'),
    ).toBeVisible();
    await expect(card).toHaveAttribute("data-completed", "true");

    // 5) 진행률 100%
    await expect(page.locator('[data-testid="week-progress"]')).toHaveAttribute(
      "data-percent",
      "100",
    );

    // 6) 새로고침 후에도 상태 유지
    await page.reload();
    await expect(
      page.locator('[data-testid="column-done"] [data-todo-id="' + todoId + '"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="week-progress"]')).toHaveAttribute(
      "data-percent",
      "100",
    );
  });

  test("같은 컬럼 내 재정렬은 새로고침 후에도 유지된다", async ({ page }) => {
    await page.goto("/week");
    await addPlan(page, "R-플랜");
    await addTodo(page, "R-A", "R-플랜");
    await addTodo(page, "R-B", "R-플랜");

    const column = page.locator('[data-testid="column-todo"]');
    await expect(column.locator('[data-testid="todo-card"]')).toHaveText([
      /R-A/,
      /R-B/,
    ]);

    const bId = await column
      .locator('[data-testid="todo-card"]', { hasText: "R-B" })
      .getAttribute("data-todo-id");

    // B 를 A 위로: B 카드를 컬럼 상단으로 드래그
    const handle = page.locator(`[data-todo-id="${bId}"]`);
    const aBox = await column
      .locator('[data-testid="todo-card"]', { hasText: "R-A" })
      .boundingBox();
    const hBox = await handle.boundingBox();
    await page.mouse.move(hBox!.x + 5, hBox!.y + 5);
    await page.mouse.down();
    await page.mouse.move(hBox!.x + 12, hBox!.y + 12, { steps: 6 });
    await page.mouse.move(aBox!.x + 20, aBox!.y - 4, { steps: 20 });
    await page.mouse.up();

    await expect(column.locator('[data-testid="todo-card"]')).toHaveText([
      /R-B/,
      /R-A/,
    ]);

    await page.reload();
    await expect(column.locator('[data-testid="todo-card"]')).toHaveText([
      /R-B/,
      /R-A/,
    ]);
  });

  test("주간 보기 컬럼에는 이번 주 계획에 할당된 할 일만 보인다", async ({
    page,
    request,
  }) => {
    await page.goto("/week");

    // 주간 계획 하나 생성
    await addPlan(page, "P-1주차");

    await addTodo(page, "SCOPE-ASSIGNED", "P-1주차");

    // 어떤 주간 계획에도 할당하지 않은 할 일은 컬럼에 아예 나타나지 않는다
    // (UI 로는 만들 수 없다 — 주간 보기의 할 일 추가는 항상 계획 하나를 요구한다 —
    // 이므로 API 로 직접 생성한다).
    const created = await request.post("/api/todos", {
      data: { title: "SCOPE-UNASSIGNED", date: "2026-08-31" },
    });
    expect(created.ok()).toBe(true);

    await page.reload();
    await expect(
      page.locator('[data-testid="todo-card"]', { hasText: "SCOPE-ASSIGNED" }),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="todo-card"]', {
        hasText: "SCOPE-UNASSIGNED",
      }),
    ).toHaveCount(0);
    await expect(page.locator('[data-testid="todo-card"]')).toHaveCount(1);
  });

  test("주간 보기에서 추가하는 할 일은 기한 없음이 기본이고 주간 계획이 항상 지정된다", async ({
    page,
  }) => {
    await page.goto("/week");
    await addPlan(page, "D-플랜");

    await page.getByRole("button", { name: "+ 할 일" }).click();
    const dialog = page.getByRole("dialog");
    // "기한 설정" 체크박스는 기본 해제 상태다 (할 일 화면과 동일한 기본값).
    await expect(dialog.getByLabel("기한 설정")).not.toBeChecked();
    // "(미할당)" 옵션 없이 방금 만든 계획이 곧바로 선택돼 있다.
    await expect(
      dialog.getByLabel("주간 계획").locator("option:checked"),
    ).toHaveText("D-플랜");
    await expect(
      dialog.getByLabel("주간 계획").locator("option", { hasText: "(미할당)" }),
    ).toHaveCount(0);

    await dialog.getByLabel("제목").fill("D-할 일");
    await dialog.getByRole("button", { name: "추가" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.locator('[data-testid="todo-card"]', { hasText: "D-할 일" }),
    ).toBeVisible();
  });

  test("할 일 / 주간 계획 / 1년 목표 화면 네비게이션", async ({ page }) => {
    await page.goto("/week");
    await page.getByRole("link", { name: "할 일" }).click();
    await expect(page).toHaveURL(/\/todo$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "할 일" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "1년 목표" }).click();
    await expect(page).toHaveURL(/\/year$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "1년 목표" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "주간 계획" }).click();
    await expect(page).toHaveURL(/\/week$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "주간 계획" }),
    ).toBeVisible();
  });
});
