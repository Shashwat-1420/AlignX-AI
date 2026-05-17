export type GoalStatus = "draft" | "submitted" | "approved" | "rejected";

export interface Goal {
  id: string;
  employee: string;
  title: string;
  description: string;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  weightage: number;
  progress: number;
  shared: boolean;
  status: GoalStatus;
  checkInNotes: string;
  locked: boolean;
}
