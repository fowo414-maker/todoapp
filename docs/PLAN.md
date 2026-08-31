# 프로젝트 계획: 목표 연동형 To-Do 앱

**상태:** pending approval
**작성일:** 2026-08-31
**출처:** `docs/PRD.md`

## 결정된 전제 (사용자 확인 완료)

| 항목 | 선택 |
| --- | --- |
| 스택 | Next.js 풀스택 (App Router, TypeScript) |
| 데이터 저장소 | MongoDB (Mongoose) |
| 범위 | P0 + P1 전체 |
| 인증 | 단일 사용자, 로그인 없음 |

---

## 1. 요구사항 요약

일일 할 일을 **주간 계획**과 **1년 목표**에 계층적으로 연결하고, 완료된 할 일 기준으로 **주간 진행률을 자동 계산**하는 단일 사용자용 웹 앱.

핵심 도메인 계층: `할 일(Todo) → 주간 계획(WeeklyPlan) → 1년 목표(YearGoal)`

기능 범위:

- **P0**
  - 할 일 CRUD
  - 할 일 상태 `todo / doing / done` 관리
  - 드래그 앤 드롭으로 상태·순서 변경
  - 기간별 관리: 일일 할 일 / 주간 계획 / 1년 목표
  - 목표 구조 연결 (할 일 ↔ 주간 계획 ↔ 1년 목표)
  - 주간 진행률 자동 계산 = 완료 할 일 수 / 전체 할 일 수
- **P1**
  - 일일 / 주간 / 1년 목표 전용 화면
  - 주간 진행률 시각화 (진행률 바 + 퍼센트)
  - 상태 및 기간별 필터
  - 완료된 할 일 시각적 구분

---

## 2. 아키텍처 개요

### 기술 선택

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| 프레임워크 | Next.js App Router + TypeScript | 사용자 지정. 단일 코드베이스로 UI + API |
| API 레이어 | Route Handlers (`app/api/**/route.ts`) | 쿼리 파라미터 필터·재정렬 엔드포인트를 명시적·테스트 가능하게 구현 (Server Actions는 통합 테스트 용이성 때문에 배제) |
| DB | MongoDB + Mongoose | 사용자 지정. 스키마·인덱스 정의, HMR 대응 커넥션 싱글턴 |
| 클라이언트 데이터 | TanStack Query (React Query) | 캐시 + DnD 낙관적 업데이트/롤백 |
| 드래그 앤 드롭 | `@dnd-kit/core` + `@dnd-kit/sortable` | 유지보수 중, 키보드 접근성 지원 (react-beautiful-dnd는 deprecated) |
| 유효성 검증 | Zod | 클라이언트/서버 공유 스키마 |
| 날짜 처리 | date-fns | `startOfISOWeek` 등으로 주 경계 정규화 |
| 스타일 | Tailwind CSS | 빠른 UI 구성 |
| 테스트 | Vitest + Testing Library, mongodb-memory-server, Playwright | 단위/통합/e2e |

### 디렉터리 구조 (생성 대상)

```
todo/
  app/
    layout.tsx                     # QueryClientProvider, 전역 레이아웃/네비게이션
    page.tsx                       # "/" → "/week" 리다이렉트
    providers.tsx                  # 클라이언트 Provider 래퍼
    day/page.tsx                   # 일일 화면 (P1)
    week/page.tsx                  # 주간 화면 + 보드 + 진행률 (P0/P1)
    year/page.tsx                  # 1년 목표 화면 (P1)
    api/
      year-goals/route.ts          # GET(목록), POST(생성)
      year-goals/[id]/route.ts     # GET, PATCH, DELETE
      weekly-plans/route.ts        # GET(주별 필터 + 진행률), POST
      weekly-plans/[id]/route.ts   # GET, PATCH, DELETE
      todos/route.ts               # GET(date/weeklyPlanId/status 필터), POST
      todos/[id]/route.ts          # GET, PATCH, DELETE
      todos/reorder/route.ts       # POST: 컬럼별 정렬된 id 배열 + 상태 반영
  lib/
    db.ts                          # Mongoose 커넥션 싱글턴 (global 캐시)
    models/Todo.ts
    models/WeeklyPlan.ts
    models/YearGoal.ts
    validation/todo.ts             # Zod: createTodo, updateTodo, reorder
    validation/weeklyPlan.ts
    validation/yearGoal.ts
    progress.ts                    # 순수 함수 computeWeeklyProgress()
    dates.ts                       # 주 시작(월요일) 정규화, YYYY-MM-DD 유틸
    api-client.ts                  # fetch 래퍼
    queries.ts                     # React Query 훅 + 쿼리 키 맵
  components/
    board/Board.tsx                # 3컬럼 DnD 보드
    board/Column.tsx
    board/TodoCard.tsx
    board/TodoDialog.tsx           # 생성/수정 폼
    week/WeekProgressBar.tsx
    week/WeeklyPlanList.tsx
    year/YearGoalList.tsx
    common/Nav.tsx                 # day/week/year 이동
    common/Filters.tsx             # 상태·기간 필터 (P1)
    common/EmptyState.tsx
  scripts/seed.ts                  # 샘플 데이터 시드
  test/
    unit/                          # progress, dates, zod
    integration/                   # API 라우트 (mongodb-memory-server)
    e2e/                           # Playwright
  .env.example                     # MONGODB_URI=
  .env.local                       # (gitignore)
```

### 데이터 모델

**YearGoal**
```
_id, title: string(required), description?: string,
year: number(required),  createdAt, updatedAt
```

**WeeklyPlan**
```
_id, title: string(required),
yearGoalId: ObjectId | null (ref YearGoal),
weekStart: Date (required, 해당 주 월요일 00:00 UTC로 정규화),
createdAt, updatedAt
인덱스: { weekStart: 1 }, { yearGoalId: 1 }
진행률은 저장하지 않고 GET 시 연결된 Todo로 계산
```

**Todo**
```
_id, title: string(required), description?: string,
status: 'todo' | 'doing' | 'done' (default 'todo'),
weeklyPlanId: ObjectId | null (ref WeeklyPlan),
date: string 'YYYY-MM-DD' (required, 일일 화면 필터용),
order: number (컬럼 내 정렬 위치, 0-based),
completedAt: Date | null,
createdAt, updatedAt
인덱스: { date: 1 }, { weeklyPlanId: 1 }, { status: 1, order: 1 }
```

### 삭제 시 동작 (데이터 손실 방지 기본값)

- **WeeklyPlan 삭제:** 연결된 Todo는 삭제하지 않고 `weeklyPlanId = null` 처리 → "미할당" 필터로 복구 가능. UI에서 확인 다이얼로그 표시.
- **YearGoal 삭제:** 연결된 WeeklyPlan은 `yearGoalId = null` 처리. UI 확인 다이얼로그.

### 진행률 계산

```
computeWeeklyProgress(todos): { done, total, ratio }
  total = todos.length
  done  = todos.filter(t => t.status === 'done').length
  ratio = total === 0 ? 0 : done / total
표시 퍼센트 = Math.round(ratio * 100)
```

---

## 3. 구현 단계

### Phase 0 — 스캐폴딩

1. `create-next-app` (TS, Tailwind, ESLint, App Router, src 미사용) 초기화
2. 의존성 추가: `mongoose`, `@tanstack/react-query`, `@dnd-kit/core`, `@dnd-kit/sortable`, `zod`, `date-fns`; dev: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `mongodb-memory-server`, `@playwright/test`
3. `.env.example`, `.env.local` 생성 (`MONGODB_URI`), `.gitignore` 확인
4. `lib/db.ts` — `global._mongoose` 캐시 패턴으로 커넥션 싱글턴
5. `app/providers.tsx` — `QueryClientProvider`, `layout.tsx`에 주입
6. `package.json` 스크립트: `dev`, `build`, `lint`, `test`, `test:e2e`, `seed`

### Phase 1 — 모델 + 검증 + 순수 로직

7. `lib/models/YearGoal.ts`, `WeeklyPlan.ts`, `Todo.ts` (위 스키마 + 인덱스)
8. `lib/validation/*.ts` — Zod create/update/reorder 스키마, 공유 타입 export
9. `lib/dates.ts` — `normalizeWeekStart(date)` (월요일 00:00 UTC), `toDateString(date)`, `parseDateString`
10. `lib/progress.ts` — `computeWeeklyProgress`
11. 단위 테스트: `progress` (빈 배열·혼합·전체 완료), `dates` (DST 경계·연말 주차·타임존), Zod (필수 누락·잘못된 enum)

**완료 결과물**
- YearGoal, WeeklyPlan, Todo 데이터 모델 및 입력 검증 로직 완성
- 주간 진행률과 날짜 처리 함수 완성

### Phase 2 — API Route Handlers + 통합 테스트

12. `year-goals` GET/POST, `year-goals/[id]` GET/PATCH/DELETE
13. `weekly-plans` GET (`?weekStart=`, `?yearGoalId=` 필터, 각 항목에 `progress` 포함) / POST; `weekly-plans/[id]` GET/PATCH/DELETE (DELETE 시 자식 Todo `weeklyPlanId=null`)
14. `todos` GET (`?date=`, `?weeklyPlanId=`, `?status=` 조합 필터) / POST; `todos/[id]` GET/PATCH/DELETE. status가 `done`으로 바뀌면 `completedAt` 설정, 그 외로 바뀌면 `null`
15. `todos/reorder` POST — `{ status, orderedIds: string[] }` (또는 컬럼 간 이동 시 `{ movedId, toStatus, orderedIds }`). 서버가 `bulkWrite`로 `order`를 배열 인덱스로 재작성 + status 반영. 서버가 순서의 단일 진실원
16. YearGoal DELETE 시 자식 WeeklyPlan `yearGoalId=null`
17. 통합 테스트 (`mongodb-memory-server`): 각 엔드포인트 CRUD, 필터 조합, `reorder` 순서 영속, cascade-unassign 동작, `progress` 계산 정확성 및 `total=0` 처리

**완료 결과물**
- YearGoal, WeeklyPlan, Todo의 CRUD API 완성
- Todo 재정렬, 상태 변경, 진행률 계산 API 동작 완성

### Phase 3 — 클라이언트 데이터 레이어

18. `lib/api-client.ts` — 타입 지정 fetch 래퍼, 에러 정규화
19. `lib/queries.ts` — 쿼리 키 맵 + 훅: `useYearGoals`, `useWeeklyPlans(weekStart)`, `useTodos(filters)`; 뮤테이션 (`useCreateTodo`, `useUpdateTodo`, `useDeleteTodo`, `useReorderTodos`, 목표/계획 CRUD) — `onMutate` 낙관적 업데이트, `onError` 롤백, `onSettled` `invalidateQueries`

**완료 결과물**
- 프론트엔드에서 API 데이터를 조회·수정할 수 있는 React Query 구조 완성
- Todo 및 목표 관련 mutation의 낙관적 업데이트와 오류 복구 처리 완성

### Phase 4 — DnD 보드 (P0 핵심)

20. `Board.tsx` — `DndContext` + 3개 `Column` (`SortableContext`), 포인터 + 키보드 센서
21. `TodoCard.tsx` — `useSortable`, 제목·상태·완료 표시
22. `onDragEnd`: 같은 컬럼 → 순서 변경 / 다른 컬럼 → status 변경 + 순서. `useReorderTodos` 낙관적 호출
23. `TodoDialog.tsx` — 생성/수정 폼 (제목, 설명, 날짜, 주간 계획 선택), 삭제 버튼 + 확인
24. 보드를 `week/page.tsx`에 통합 (현재 주 기준)

**완료 결과물**
- Todo를 `todo / doing / done` 컬럼 사이에서 드래그해 이동할 수 있는 주간 보드 완성
- 드래그 후 상태와 순서가 DB에 저장됨

### Phase 5 — 화면 (P1)

25. `common/Nav.tsx` — day / week / year 전환
26. `day/page.tsx` — 날짜 선택기, 해당 날짜 Todo 목록, 주간 계획 연결 선택
27. `week/page.tsx` — 현재 주, `WeekProgressBar`(연결 Todo로 자동 계산), `WeeklyPlanList`(1년 목표 연결 선택), 보드
28. `year/page.tsx` — `YearGoalList`, 목표별 주간 계획 목록, 목표별 롤업 진행률(주간 진행률 평균, 선택적 표시)
29. `"/"` → `"/week"` 리다이렉트

**완료 결과물**
- 일일 / 주간 / 1년 목표 화면 및 화면 간 네비게이션 완성
- 각 화면에서 해당 기간의 데이터를 조회하고 관리할 수 있음

### Phase 6 — P1 마감

30. `WeekProgressBar` — 바 + 퍼센트, Todo 상태 변경 시 전체 리로드 없이 갱신
31. `common/Filters.tsx` — 상태 필터(todo/doing/done) + 기간 필터(날짜 범위 / 특정 주 / 미할당). 목록·보드에 적용
32. 완료 할 일 시각 구분 — 취소선 + 흐린 색 + 체크 아이콘, `data-completed` 속성
33. 빈 상태, 로딩 스켈레톤, 에러 토스트

**완료 결과물**
- 주간 진행률 시각화, 필터, 완료 Todo 표시 등 보조 기능 완성
- 로딩·빈 상태·오류 상황에 대한 기본 UI 처리 완료

### Phase 7 — 검증 + 문서

34. Playwright e2e: 전체 흐름 (1년 목표 생성 → 주간 계획 생성·목표 연결 → 할 일 생성·계획 연결 → done 컬럼으로 드래그 → 주간 진행률 갱신 확인 → 새로고침 후 유지); 컬럼 내 재정렬 영속; 상태·기간 필터; day/week/year 네비게이션
35. `scripts/seed.ts` — 샘플 데이터
36. `README.md` — 설치, `MONGODB_URI` 설정, 실행/테스트 명령
37. 전체 그린 확인: `npm run lint && npm run build && npm test && npm run test:e2e`

**완료 결과물**
- 핵심 사용자 흐름에 대한 E2E 테스트 및 전체 테스트 완료
- 프로젝트 실행 방법과 환경 설정을 설명하는 README 완성

---

## 4. 수용 기준 (테스트 가능)

**스캐폴딩 / 빌드**
- `npm run dev` 부팅 성공, `/` 접속 시 `/week`로 리다이렉트, 콘솔 에러 0
- `npm run build` 성공, TypeScript 타입 에러 0
- `npm run lint` 경고/에러 0

**API — YearGoal**
- `POST /api/year-goals` `{title:"2026 건강", year:2026}` → 201, `_id` 반환
- `GET /api/year-goals` → 생성된 항목 포함
- `PATCH /api/year-goals/:id` `{title:"수정"}` → 200, 변경 반영
- `DELETE /api/year-goals/:id` → 204, 이후 자식 WeeklyPlan의 `yearGoalId === null` (통합 테스트 단언)

**API — WeeklyPlan**
- `POST /api/weekly-plans` `{title, weekStart, yearGoalId}` → 201, `weekStart`가 월요일 00:00 UTC로 정규화 저장
- `GET /api/weekly-plans?weekStart=<ISO>` → 해당 주 계획만 반환, 각 항목에 `progress:{done,total,ratio}` 포함
- 연결 Todo가 0개면 `progress.ratio === 0` (0으로 나누기 없음)
- `DELETE /api/weekly-plans/:id` → 204, 자식 Todo는 유지되며 `weeklyPlanId === null`

**API — Todo**
- `POST /api/todos` `{title, date:"2026-08-31", weeklyPlanId, status:"todo"}` → 201, `order` 자동 부여
- `GET /api/todos?date=2026-08-31` → 해당 날짜 Todo만
- `GET /api/todos?weeklyPlanId=<id>` → 해당 계획 Todo만
- `GET /api/todos?status=doing` → doing 상태만
- `PATCH /api/todos/:id` `{status:"done"}` → `completedAt` 설정됨; 다시 `{status:"doing"}` → `completedAt === null`

**API — reorder**
- `POST /api/todos/reorder` `{status:"todo", orderedIds:[b,a,c]}` → 200, 이후 `GET ?status=todo`가 `order` 오름차순으로 `b,a,c` 반환
- 컬럼 간 이동 페이로드 → 대상 Todo `status` 변경 + 양쪽 컬럼 `order` 재작성

**DnD (e2e)**
- "todo" 카드를 "done" 컬럼으로 드래그 → 카드가 "done"에 표시, 새로고침 후에도 "done" 유지, `completedAt` 존재
- 한 컬럼에서 카드 2개 순서 교체 → 새로고침 후 순서 유지

**진행률**
- 주간 화면 진행률 바 퍼센트 == `round(done/total*100)`
- Todo 상태를 done으로 바꾸면 1초 이내에 진행률 바가 전체 페이지 리로드 없이 갱신
- 단위 테스트: `computeWeeklyProgress([])` === `{done:0,total:0,ratio:0}`; done 2 / total 5 → `ratio === 0.4`

**화면 / P1**
- Nav로 day/week/year 각 화면 진입 가능, 각 화면이 해당 기간 데이터 렌더
- day 화면에서 날짜 변경 시 해당 날짜 Todo만 표시
- 상태 필터 `done` 적용 → done Todo만 표시; 기간 필터 특정 주 → 해당 주 Todo만; "미할당" 필터 → `weeklyPlanId=null` Todo만
- 완료 Todo는 `data-completed="true"` 속성 + 시각적 구분(취소선/흐림) 적용 (테스트 단언)
- WeeklyPlan 삭제 시 확인 다이얼로그 노출, 확인 시 자식 Todo가 "미할당" 필터에 나타남

**전체**
- `npm test` (단위 + 통합) 전부 통과
- `npm run test:e2e` (Playwright) 전부 통과
- `MONGODB_URI`가 클라이언트 번들에 노출되지 않음 (`NEXT_PUBLIC_` 미사용, 빌드 산출물 grep 확인)

---

## 5. 리스크와 완화책

| # | 리스크 | 영향 | 완화책 |
| --- | --- | --- | --- |
| R1 | 타임존/주 경계 버그 (일일 필터·주간 집계 오차) | 진행률·필터 오작동 | 모든 날짜를 UTC로 정규화. `weekStart`는 `date-fns` `startOfISOWeek` 기반 월요일 00:00 UTC. Todo는 `YYYY-MM-DD` 문자열로 저장·필터. DST·연말 경계 단위 테스트 |
| R2 | DnD 낙관적 업데이트 경합으로 `order` 손상 | 카드 순서 꼬임 | `reorder` 단일 엔드포인트가 해당 컬럼의 정렬된 id 전체 배열을 받아 `bulkWrite`로 `order`를 인덱스로 재작성. 서버가 단일 진실원, 실패 시 클라이언트 롤백 |
| R3 | Next dev(HMR)에서 Mongoose 커넥션 누수/중복 | dev 중 연결 폭증·경고 | `lib/db.ts`에서 `global` 캐시된 커넥션 프로미스 패턴 |
| R4 | Cascade 삭제로 인한 데이터 손실 | 사용자 할 일 유실 | 하드 삭제 대신 FK를 `null`로 (unassign). UI 확인 다이얼로그. "미할당" 필터로 복구 |
| R5 | 진행률 0으로 나누기 | NaN 표시/크래시 | `computeWeeklyProgress`가 `total===0` → `ratio 0` 가드, 단위 테스트 |
| R6 | `@dnd-kit` 설정 난이도 (센서·접근성) | 일정 지연 | 공식 문서의 `DndContext` + `SortableContext` 표준 패턴 사용, 키보드 센서 포함, e2e로 마우스 드래그 커버 |
| R7 | P1 스코프 크리프 | 일정 초과 | P1 항목(필터·시각화·완료 스타일)은 P0 보드+진행률 그린 이후 착수. 각 항목 독립 단계 |
| R8 | `MONGODB_URI` 노출 | 자격증명 유출 | 서버 전용 env만 사용, `.env.local` gitignore, `.env.example` 커밋, 빌드 산출물 grep 검증 |
| R9 | 뮤테이션 후 React Query 캐시 stale | 화면-데이터 불일치 | 쿼리 키 맵 명시 + 뮤테이션 `onSettled`마다 `invalidateQueries`, 낙관적 업데이트 + `onError` 롤백 |
| R10 | mongodb-memory-server CI 다운로드/속도 | 테스트 불안정 | 바이너리 캐시 디렉터리 고정, CI 캐시. 로컬 통합 테스트 우선, e2e는 실제 로컬 Mongo |

---

## 6. 검증 단계

1. **정적 검사:** `npm run lint && npm run build` → 에러 0
2. **단위 테스트:** `npm test -- test/unit` → `progress.ts`, `dates.ts`, Zod 스키마 커버, 전부 통과
3. **통합 테스트:** `npm test -- test/integration` (mongodb-memory-server) → 모든 API 라우트 CRUD·필터·`reorder`·cascade-unassign·`progress` 정확성 통과
4. **e2e:** `npm run test:e2e` (Playwright) → 전체 흐름 시나리오 + 재정렬 영속 + 필터 + day/week/year 네비게이션 통과
5. **수동 QA:** `npm run seed` 후 브라우저에서 day/week/year 순회, 카드 드래그, 진행률 바 실시간 갱신, 새로고침 후 영속 확인
6. **보안 확인:** 빌드 산출물에서 `MONGODB_URI` / 연결 문자열 grep → 미노출 확인
7. **완료 판정:** 위 1~6 전부 그린 + 수용 기준 전 항목 충족

---

## 7. 오픈 이슈 / 후속 결정 필요

- **주간 화면 기본 주:** "현재 주" 고정으로 시작, 주 이동 네비게이션은 P1 마감에서 추가 (범위 확정 필요)
- **1년 목표 롤업 진행률:** PRD 명시는 "주간" 진행률만. 목표별 롤업(주간 평균)은 P1 year 화면에 선택적 표시로 포함 — 원치 않으면 제거
- **Todo `date` 필수 여부:** 현재 필수(일일 화면 필터 기준). "미할당 날짜" 허용이 필요하면 nullable로 변경
- **시드 데이터 범위:** 데모용 최소 (1년 목표 2개, 주간 계획 3개, 할 일 10개 내외)
