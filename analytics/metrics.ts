import { Goal } from "@/lib/types";

export function getGoalMetrics(goals: Goal[]) {
  const total = goals.length;
  const approved = goals.filter((goal) => goal.status === "approved").length;
  const shared = goals.filter((goal) => goal.shared).length;
  const avgProgress = total ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / total) : 0;
  const pendingApprovals = goals.filter((goal) => goal.status === "submitted").length;
  const atRisk = goals.filter(
    (goal) => goal.riskLevel === "high" || (goal.progress < 40 && goal.status !== "rejected")
  ).length;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = goals.filter((goal) => goal.dueDate < today && goal.progress < 50).length;

  return { total, approved, shared, avgProgress, pendingApprovals, atRisk, overdue };
}
