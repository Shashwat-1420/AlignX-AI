import { Goal } from "@/lib/types";

export const GOAL_RULES = {
  maxGoals: 8,
  minWeightage: 10,
  totalWeightage: 100,
};

export function validateGoal(goal: Pick<Goal, "weightage">, goals: Goal[]) {
  if (goal.weightage < GOAL_RULES.minWeightage) {
    return `Each goal must have at least ${GOAL_RULES.minWeightage}% weightage.`;
  }

  if (goals.length >= GOAL_RULES.maxGoals) {
    return `A maximum of ${GOAL_RULES.maxGoals} goals is allowed.`;
  }

  const nextWeightage = goals.reduce((sum, item) => sum + item.weightage, 0) + goal.weightage;
  if (nextWeightage > GOAL_RULES.totalWeightage) {
    return `Total weightage cannot exceed ${GOAL_RULES.totalWeightage}%.`;
  }

  return null;
}

export function canSubmitForApproval(goals: Goal[]) {
  if (goals.length === 0) {
    return "Add at least one goal before submission.";
  }

  const totalWeightage = goals.reduce((sum, goal) => sum + goal.weightage, 0);
  if (totalWeightage !== GOAL_RULES.totalWeightage) {
    return `Total goal weightage must equal ${GOAL_RULES.totalWeightage}% before manager approval.`;
  }

  return null;
}
