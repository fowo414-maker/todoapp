# 목표 연동 To-Do

일일 할 일을 **주간 계획**과 **1년 목표**에 계층적으로 연결하고, 완료된 할 일 기준으로 **주간 진행률을 자동 계산**하는 단일 사용자용 웹 앱.

- 계층: `할 일(Todo) → 주간 계획(WeeklyPlan) → 1년 목표(YearGoal)`
- 할 일 상태 `todo / doing / done` + 드래그 앤 드롭
- 일일 / 주간 / 1년 목표 화면, 주간 진행률 시각화, 상태·기간 필터

## 기술 스택

| 영역 | 사용 |
| --- | --- |
| 프레임워크 | Next.js 16 (App Router) + TypeScript |
| DB | MongoDB + Mongoose |
| 클라이언트 상태 | TanStack Query (React Query) |
| 드래그 앤 드롭 | @dnd-kit |
| 검증 | Zod |
| 스타일 | Tailwind CSS v4 |
| 테스트 | Vitest + Testing Library, mongodb-memory-server, Playwright |

## 사전 준비

- Node.js 20+ (개발은 24에서 확인)
- MongoDB 접속 정보 (MongoDB Atlas 또는 로컬 `mongod`)

## 설정

1. 의존성 설치

   ```bash
   npm install
   ```

2. 환경 변수 파일 생성 — `.env.example` 을 복사해 `.env.local` 을 만들고 `MONGODB_URI` 를 채운다.

   ```bash
   cp .env.example .env.local
   ```

   ```env
   # MongoDB Atlas 예시
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/todoapp?retryWrites=true&w=majority
   # 로컬 예시
   # MONGODB_URI=mongodb://127.0.0.1:27017/todoapp
   ```

   `MONGODB_URI` 는 서버에서만 사용되며 클라이언트 번들에 포함되지 않는다 (`NEXT_PUBLIC_` 아님).

3. (선택) 샘플 데이터 시드

   ```bash
   npm run seed
   ```

## 개발

```bash
npm run dev        # http://localhost:3000
```

`/` 접속 시 `/week` 로 이동한다.

## 명령어

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 (+ 타입 체크) |
| `npm run start` | 빌드 결과 실행 |
| `npm run lint` | ESLint |
| `npm test` | 단위 + 통합 테스트 (Vitest, 통합은 mongodb-memory-server 사용 — 외부 DB 불필요) |
| `npm run test:e2e` | Playwright E2E — webServer 가 `scripts/e2e-server.mjs` 로 인메모리 MongoDB 를 자동 기동하므로 외부 DB(Atlas) 불필요 |
| `npm run seed` | 샘플 데이터 삽입 (기존 데이터 삭제 후) |

## 구조

```
app/
  page.tsx                 "/" → "/week" 리다이렉트
  day|week|year/page.tsx    화면 (얇은 래퍼 → components/*/*.View)
  api/
    year-goals/            1년 목표 CRUD
    weekly-plans/           주간 계획 CRUD (+ 진행률 계산)
    todos/                  할 일 CRUD, todos/reorder (드래그 결과 반영)
lib/
  db.ts                    Mongoose 커넥션 싱글턴
  models/                  YearGoal, WeeklyPlan, Todo
  validation/              Zod 스키마
  dates.ts                 주 시작(월요일 UTC) 정규화 등
  progress.ts              computeWeeklyProgress
  api-client.ts            fetch 래퍼
  queries.ts               React Query 훅 (낙관적 업데이트 + 롤백)
  optimistic.ts            캐시 업데이트 순수 함수
components/
  board/                   DnD 보드 (Board, Column, TodoCard, TodoDialog)
  day/ week/ year/         화면별 View
  common/                  Nav, Filters, EmptyState
```

## 데이터 모델 요약

- **YearGoal**: `title`, `description?`, `year`
- **WeeklyPlan**: `title`, `yearGoalId | null`, `weekStart` (해당 주 월요일 00:00 UTC)
- **Todo**: `title`, `description?`, `status`, `weeklyPlanId | null`, `date` (`YYYY-MM-DD`), `order`, `completedAt | null`

삭제 정책: 주간 계획/1년 목표를 삭제해도 하위 항목은 삭제되지 않고 참조(`weeklyPlanId` / `yearGoalId`)만 `null` 로 해제된다. 해제된 할 일은 "미할당" 필터로 확인할 수 있다.
