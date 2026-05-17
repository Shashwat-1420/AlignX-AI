export type GoalStatus = "draft" | "submitted" | "approved" | "rejected";

export type UserRole = "employee" | "manager" | "admin";

export type RiskLevel = "low" | "medium" | "high";

export type AuditEventType =
  | "goal_created"
  | "goal_updated"
  | "approval"
  | "rejection"
  | "unlock"
  | "quarterly_update"
  | "comment_added";

export interface ManagerComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

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
  department: string;
  riskLevel: RiskLevel;
  dueDate: string;
  managerComments: ManagerComment[];
  approvalNote?: string;
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  title: string;
}

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  goalId?: string;
  goalTitle?: string;
  actor: string;
  role: UserRole;
  timestamp: string;
  details: string;
}
