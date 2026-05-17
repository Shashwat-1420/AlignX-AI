import { Goal } from "@/lib/types";

export function groupGoalsByQuarter(goals: Goal[]) {
  return goals.reduce<Record<string, Goal[]>>((acc, goal) => {
    acc[goal.quarter] = [...(acc[goal.quarter] ?? []), goal];
    return acc;
  }, {});
}
