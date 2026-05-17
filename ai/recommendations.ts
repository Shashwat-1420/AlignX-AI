const suggestions = [
  "Add at least one cross-functional shared goal to boost collaboration.",
  "Set measurable quarterly milestones to improve approval quality.",
  "Balance operational and innovation goals for stronger analytics outcomes.",
];

export function getGoalRecommendations(goalCount: number, isBalancedWeightage: boolean) {
  if (!goalCount) {
    return "Start by creating your first measurable business goal.";
  }

  if (!isBalancedWeightage) {
    return "Weightages are not balanced to 100% yet. Rebalance before manager submission.";
  }

  return suggestions[goalCount % suggestions.length];
}
