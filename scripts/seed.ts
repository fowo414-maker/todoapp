import { config } from "dotenv";
config({ path: ".env.local" });
config();

import mongoose from "mongoose";
import { connectToDatabase } from "../lib/db";
import { YearGoal } from "../lib/models/YearGoal";
import { WeeklyPlan } from "../lib/models/WeeklyPlan";
import { Todo } from "../lib/models/Todo";
import { normalizeWeekStart, toDateString } from "../lib/dates";

async function main() {
  await connectToDatabase();
  console.log("연결됨:", mongoose.connection.name);

  await Promise.all([
    Todo.deleteMany({}),
    WeeklyPlan.deleteMany({}),
    YearGoal.deleteMany({}),
  ]);

  const year = new Date().getUTCFullYear();
  const [health, learning] = await YearGoal.create([
    { title: `${year} 건강 만들기`, year, description: "주 3회 운동, 체중 관리" },
    { title: `${year} 개발 실력 향상`, year, description: "사이드 프로젝트 1개 출시" },
  ]);

  const thisWeek = normalizeWeekStart(new Date());
  const nextWeek = normalizeWeekStart(
    new Date(thisWeek.getTime() + 7 * 86_400_000),
  );

  const [w1, w2, w3] = await WeeklyPlan.create([
    { title: "이번 주 운동 루틴", weekStart: thisWeek, yearGoalId: health._id },
    { title: "이번 주 프로젝트 셋업", weekStart: thisWeek, yearGoalId: learning._id },
    { title: "다음 주 마무리", weekStart: nextWeek, yearGoalId: learning._id },
  ]);

  const today = toDateString(new Date());
  const samples: Array<{
    title: string;
    status: "todo" | "doing" | "done";
    weeklyPlanId: mongoose.Types.ObjectId | null;
  }> = [
    { title: "달리기 30분", status: "done", weeklyPlanId: w1._id },
    { title: "스트레칭", status: "doing", weeklyPlanId: w1._id },
    { title: "단백질 식단 준비", status: "todo", weeklyPlanId: w1._id },
    { title: "저장소 생성", status: "done", weeklyPlanId: w2._id },
    { title: "CI 파이프라인", status: "doing", weeklyPlanId: w2._id },
    { title: "핵심 도메인 모델링", status: "todo", weeklyPlanId: w2._id },
    { title: "README 작성", status: "todo", weeklyPlanId: w3._id },
    { title: "배포", status: "todo", weeklyPlanId: w3._id },
    { title: "물 2L 마시기", status: "todo", weeklyPlanId: null },
    { title: "회고 쓰기", status: "todo", weeklyPlanId: null },
  ];

  const nextOrder: Record<string, number> = { todo: 0, doing: 0, done: 0 };
  await Todo.create(
    samples.map((s) => ({
      title: s.title,
      status: s.status,
      weeklyPlanId: s.weeklyPlanId,
      date: today,
      order: nextOrder[s.status]++,
      completedAt: s.status === "done" ? new Date() : null,
    })),
  );

  const counts = {
    yearGoals: await YearGoal.countDocuments(),
    weeklyPlans: await WeeklyPlan.countDocuments(),
    todos: await Todo.countDocuments(),
  };
  console.log("시드 완료:", counts);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
