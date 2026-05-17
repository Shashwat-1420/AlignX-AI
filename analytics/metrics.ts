import { Goal } from "@/lib/types";

export function getGoalMetrics(goals: Goal[]) {
  const total = goals.length;
  const approved = goals.filter((goal) => goal.status === "approved").length;
  const shared = goals.filter((goal) => goal.shared).length;
  const avgProgress = total ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / total) : 0;

  return { total, approved, shared, avgProgress };
}
